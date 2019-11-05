/* jshint esversion: 6,node: true,-W041: false */
"use strict";
const darksky = require("./apis/darksky").DarkSkyAPI,
	weatherunderground = require("./apis/weatherunderground").WundergroundAPI,
	openweathermap = require("./apis/openweathermap").OpenWeatherMapAPI,
	debug = require("debug")("homebridge-weather-plus"),
	compatibility = require("./util/compatibility");

let Service,
	Characteristic,
	CustomService,
	CustomCharacteristic,
	CurrentConditionsWeatherAccessory,
	ForecastWeatherAccessory,
	FakeGatoHistoryService;

module.exports = function (homebridge)
{
	// Homekit services and characteristics
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	// History service
	FakeGatoHistoryService = require("fakegato-history")(homebridge);

	// Start platform
	homebridge.registerPlatform("homebridge-weather-plus", "WeatherPlus", WeatherPlusPlatform);
};

// TODO v3.0.0 features
function WeatherPlusPlatform(_log, _config)
{
	debug("Init WeatherPlus platform");

	this.log = _log;
	this.config = _config;
	this.stations = [];
	this.accessoriesList = [];

	// Parse global config
	this.units = _config.units || "si";
	// TODO interval geht nicht < 4?
	this.interval = "interval" in _config ? parseInt(_config.interval) : 4;
	this.interval = (typeof this.interval !== "number" || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;

	// Custom Services and Characteristics
	CustomService = require("./util/services")(Service, Characteristic);
	CustomCharacteristic = require("./util/characteristics")(Characteristic, this.units);
	CurrentConditionsWeatherAccessory = require("./accessories/currentConditions")(Service, Characteristic, CustomService, CustomCharacteristic, FakeGatoHistoryService);
	ForecastWeatherAccessory = require("./accessories/forecast")(Service, Characteristic, CustomCharacteristic);

	// Create weather stations, create default one if no stations array given
	this.stationConfigs = this.config.stations || [this.config];

	// Parse config for each station
	this.stationConfigs.forEach((station, index) =>
	{
		station.index = index;
		this.parseStationConfig(station);
	});

	// Create accessories
	this.stationConfigs.forEach((config, index) =>
	{
		// Use station depending on selected weather service
		switch (config.service)
		{
			case "darksky":
				this.log("Adding station with weather service Dark Sky named '" + config.nameNow + "'");
				this.stations.push(new darksky(config.key, config.language, config.locationGeo || config.locationId, config.conditionDetail, this.log));
				break;
			case "weatherunderground":
				this.log("Adding station with weather service Weather Underground named '" + config.nameNow + "'");
				this.stations.push(new weatherunderground(config.key, config.locationId, config.conditionDetail, this.log));
				break;
			case "openweathermap":
				this.log("Adding station with weather service OpenWeatherMap named '" + config.nameNow + "'");
				this.stations.push(new openweathermap(config.key, config.language, config.locationId, config.locationGeo, config.locationCity, config.conditionDetail, this.log));
				break;
			default:
				this.log.error("Unsupported weather service: " + config.service);
		}

		// Create accessory for current weather conditions
		this.accessoriesList.push(new CurrentConditionsWeatherAccessory(this, index));

		// Create accessories for each weather forecast day
		config.forecast.forEach((day, i, array) =>
		{
			// Check if day is a number and within range of supported forecast days for the selected weather service
			if (typeof day === "number" && (day % 1) === 0 && day >= 0 && day < this.stations[index].forecastDays)
			{
				this.accessoriesList.push(new ForecastWeatherAccessory(this, index, day));
			}
			else
			{
				debug("Ignoring forecast day: %s", day);
				array.splice(i, 1);
			}
		});
	});

	// Start update interval
	this.updateWeather();
}

WeatherPlusPlatform.prototype = {
	// Get the current condition accessory and all forecast accessories
	accessories: function (callback)
	{
		callback(this.accessoriesList);
	},

	// Parse the station config and make sure older config versions work as well
	parseStationConfig(station)
	{
		let stationConfig = JSON.parse(JSON.stringify(station));

		// Weather service
		station.service = stationConfig.service.toLowerCase().replace(/\s/g, "");

		// Location id. Multiple parameter names are possible for backwards compatiblity
		station.locationId = "";
		station.locationId = stationConfig.location || station.locationId;
		station.locationId = stationConfig.stationId || station.locationId;
		station.locationId = stationConfig.locationId || station.locationId;
		station.locationGeo = stationConfig.locationGeo;
		station.locationCity = stationConfig.locationCity;

		// Station name. Default is now, increment if multiple stations, use name from config if given
		station.nameNow = "Now" + (stationConfig.index > 0 ? (" - " + (stationConfig.index + 1)) : "");
		station.nameNow = stationConfig.displayName || station.nameNow;
		station.nameNow = stationConfig.nameNow || station.nameNow;

		// Station forecast name. Multiple parameter names are possible for backwards compatiblity
		station.nameForecast = "";
		station.nameForecast = stationConfig.displayNameForecast || station.nameForecast;
		station.nameForecast = stationConfig.nameForecast || station.nameForecast;

		// Compatibility with different homekit apps. Multiple parameter names are possible for backwards compatiblity
		station.compatibility = "eve";
		station.compatibility = stationConfig.compatibility || station.compatibility;
		station.compatibility = "currentObservations" in stationConfig && stationConfig.currentObservations === "eve" ? "eve2" : station.compatibility; // old eve is now eve2
		station.compatibility = ["eve", "eve2", "home", "both"].includes(station.compatibility) ? station.compatibility : "eve";

		// Condition detail level
		station.conditionDetail = stationConfig.conditionCategory || "simple";

		// Separate
		station.extraHumidity = stationConfig.extraHumidity || false;
		station.extraHumidity = station.compatibility === "eve" ? station.extraHumidity : false; // Only allow extraHumidity with eve mode

		// Other options
		station.forecast = stationConfig.forecast || [];
		station.language = stationConfig.language || "en";
		station.fakegatoParameters = stationConfig.fakegatoParameters || {storage: "fs"};
		station.hidden = stationConfig.hidden || [];
		// station.hidden.forEach((hidden) => {
		// 	hidden = hidden.toLowerCase();
		// });
		station.serial = station.service + " - " + (station.locationId || '') + (station.locationGeo || '') + (station.locationCity || '');
	},

	// Update the weather for all accessories
	updateWeather: function ()
	{
		// Iterate over all stations
		this.stations.forEach((station, stationIndex) =>
		{
			// Update each stations
			station.update(this.stationConfigs[stationIndex].forecast.length, (error, weather) =>
			{
				if (!error)
				{
					// Find the condtion and forecast accessory of the current station
					this.accessoriesList.forEach((accessory) =>
					{
						// Add current weather conditions
						if (accessory.stationIndex === stationIndex && accessory.CurrentConditionsService !== undefined && weather.report !== undefined)
						{
							try
							{
								let data = weather.report;
								debug("Current Conditions for station '%s': %O", accessory.name, data);

								// Set homekit characteristic value for each reported characteristic of the api
								station.reportCharacteristics.forEach((characteristicName) =>
								{
									this.saveCharacteristic(accessory, characteristicName, data[characteristicName], "current");
								});

								debug("Saving history entry");
								accessory.historyService.addEntry({
									time: new Date().getTime() / 1000,
									temp: accessory.CurrentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).value,
									pressure: accessory.AirPressureService ? accessory.AirPressureService.value : accessory.CurrentConditionsService.getCharacteristic(CustomCharacteristic.AirPressure).value,
									humidity: accessory.HumidityService ? accessory.HumidityService.getCharacteristic(Characteristic.CurrentRelativeHumidity).value : accessory.CurrentConditionsService.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
								});
							} catch (error)
							{
								this.log.error("Exception while parsing weather report: " + error);
								this.log.error("Report: " + weather.report);
							}
						}
						// Add a weather forecast for the given day
						else if (accessory.stationIndex === stationIndex && accessory.ForecastService !== undefined && weather.forecasts[accessory.day] !== undefined)
						{
							try
							{
								let data = weather.forecasts[accessory.day];
								debug("Forecast for station '%s': %O", accessory.name, data);

								// Set homekit characteristic value for each reported characteristic of the api
								station.forecastCharacteristics.forEach((characteristicName) =>
								{
									this.saveCharacteristic(accessory, characteristicName, data[characteristicName], "forecast");
								});
							} catch (error)
							{
								this.log.error("Exception while parsing weather forecast: " + error);
								this.log.error("Forecast: " + weather.forecast);
							}
						}
					});
				}
			});
		});
		// Call the function again after the configured interval in minutes
		setTimeout(this.updateWeather.bind(this), (this.interval) * 60 * 1000);
	},

	// Save changes from update in characteristics
	saveCharacteristic: function (accessory, name, value, type)
	{
		let config = accessory.config;
		let temperatureService = type === "current" ? accessory.CurrentConditionsService : accessory.ForecastService;

		value = name in CustomCharacteristic && CustomCharacteristic[name]._unitvalue ? CustomCharacteristic[name]._unitvalue(value) : value;

		if (config.hidden.indexOf(name) === -1 || name === "Temperature")
		{
			// Temperature is an official homekit characteristic
			if (name === "Temperature")
			{
				temperatureService.setCharacteristic(Characteristic.CurrentTemperature, value);
			}
			// Compatiblity characateristics have an separate service
			else if (config.compatibility === "home" && compatibility.types.includes(name))
			{
				if (name === "AirPressure")
				{
					accessory.AirPressureService.setCharacteristic(Characteristic.Name, "Air Pressure: " + value + "hPa");
					accessory.AirPressureService.value = value; // Save value to use in history
				}
				else if (name === "CloudCover")
				{
					accessory.CloudCoverService.setCharacteristic(Characteristic.OccupancyDetected, value > 10 ? 1 : 0);
					accessory.CloudCoverService.setCharacteristic(Characteristic.Name, "Cloud Cover: " + value);
				}
				else if (name === "DewPoint")
				{
					accessory.DewPointService.setCharacteristic(Characteristic.CurrentTemperature, value);
				}
				else if (name === "Humidity")
				{
					accessory.HumidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
				}
				else if (name === "Ozone")
				{
					accessory.UVIndexService.setCharacteristic(Characteristic.OzoneDensity, value);
				}
				else if (["RainBool", "SnowBool"].includes(name))
				{
					accessory[name + "Service"].setCharacteristic(Characteristic.OccupancyDetected, value ? 1 : 0);
				}
				else if (name === "TemperatureMin")
				{
					accessory.TemperatureMinService.setCharacteristic(Characteristic.CurrentTemperature, value);
				}
				else if (name === "UVIndex")
				{
					let quality;
					switch (value)
					{
						case 0:
							quality = 1; // Excellent
							break;
						case 1:
						case 2:
							quality = 2; // Good
							break;
						case 3:
						case 4:
						case 5:
							quality = 3; // Fair
							break;
						case 6:
						case 7:
							quality = 4; // Inferior
							break;
						default:
							quality = 5; // Poor
					}
					accessory.UVIndexService.setCharacteristic(Characteristic.AirQuality, quality);
					accessory.UVIndexService.setCharacteristic(Characteristic.Name, "UV Index: " + value);
				}
				else if (name === "Visibility")
				{
					accessory.VisibilityService.setCharacteristic(Characteristic.Name, "Visibility: " + value + accessory.VisibilityService.unit);
				}
				else if (name === "WindDirection")
				{
					accessory.WindDirectionService.setCharacteristic(Characteristic.Name, "Wind Dir: " + value);
				}
				else if (name === "WindSpeed")
				{
					accessory.WindSpeedService.setCharacteristic(Characteristic.OccupancyDetected, value > 4 ? 1 : 0);
					accessory.WindSpeedService.setCharacteristic(Characteristic.Name, "Wind Speed: " + value + accessory.WindSpeedService.unit);
				}
				else
				{
					log.error("Unkown compatiblity type " + name);
				}
			}
			// Humidity might have an extra service if configured
			else if (config.compatibility === "eve" && name === "Humidity" && config.extraHumidity)
			{
				accessory.HumidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
			}
			// Otherwise humidity is a homekit characteristic
			else if (name === "Humidity")
			{
				temperatureService.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
			}
			// Set everything else as a custom characteristic in the temperature service
			else
			{
				temperatureService.setCharacteristic(CustomCharacteristic[name], value);
			}
		}
	}
};