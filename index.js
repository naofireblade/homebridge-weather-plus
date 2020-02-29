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
		if (config.now)
		{
			debug("Added current conditions");
			this.accessoriesList.push(new CurrentConditionsWeatherAccessory(this, index));
		}

		// Create accessories for each weather forecast day
		config.forecast.forEach((day, i, array) =>
		{
			// Check if day is a number and within range of supported forecast days for the selected weather service
			if (typeof day === "number" && (day % 1) === 0 && day >= 0 && day < this.stations[index].forecastDays)
			{
				debug("Added forecast for day: %s", day);
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

		// Separate humidity accessory
		station.extraHumidity = stationConfig.extraHumidity || false;
		station.extraHumidity = station.compatibility === "eve" ? station.extraHumidity : false; // Only allow extraHumidity with eve mode

		// Other options
		station.now = "now" in stationConfig ? stationConfig.now : true;
		station.forecast = stationConfig.forecast || [];
		station.forecast.forEach(function (day, i, array)
		{
			if ("Today" === day)
			{
				array[i] = 0;
			}
			if ("Tomorrow" === day)
			{
				array[i] = 1;
			}
			if ("In 2 days" === day)
			{
				array[i] = 2;
			}
			if ("In 3 days" === day)
			{
				array[i] = 3;
			}
			if ("In 4 days" === day)
			{
				array[i] = 4;
			}
			if ("In 5 days" === day)
			{
				array[i] = 5;
			}
			if ("In 6 days" === day)
			{
				array[i] = 6;
			}
			if ("In 7 days" === day)
			{
				array[i] = 7;
			}
		});
		station.language = stationConfig.language || "en";
		station.fakegatoParameters = stationConfig.fakegatoParameters || {storage: "fs"};
		station.hidden = stationConfig.hidden || [];
		station.hidden.forEach((hide, i, hidden) =>
		{
			if (["Temperature", "TemperatureMax"].includes(hide))
			{
				hidden.splice(i, 1);
			}
		});
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

		// Depending on the Characteristic, it may be necessary to convert units.
		// If a conversion is necessary, perform the conversion and save that here as 'convertedValue'
		// The passed in 'value' may be used later for comparison to trigger value(s) in the unconverted units
		const convertedValue = name in CustomCharacteristic && CustomCharacteristic[name]._unitvalue ? CustomCharacteristic[name]._unitvalue(value) : value;

		if (config.hidden.indexOf(name) === -1 || name === "Temperature" || name === "TemperatureMax")
		{
			debug("Setting %s to %s", name, convertedValue);
			// Temperature is an official homekit characteristic
			if (name === "Temperature" || name === "TemperatureMax")
			{
				temperatureService.setCharacteristic(Characteristic.CurrentTemperature, convertedValue);
			}
			// Compatiblity characateristics have an separate service
			else if (["home", "both"].includes(config.compatibility) && compatibility.types.includes(name))
			{
				if (config.compatibility === "both")
				{
					if (name === "Humidity")
					{
						temperatureService.setCharacteristic(Characteristic.CurrentRelativeHumidity, convertedValue);
					}
					else
					{
						temperatureService.setCharacteristic(CustomCharacteristic[name], convertedValue);
					}
				}

				if (name === "AirPressure")
				{
					accessory.AirPressureService.setCharacteristic(Characteristic.Name, "Air Pressure: " + convertedValue + "hPa");
					accessory.AirPressureService.value = convertedValue; // Save value to use in history
				}
				else if (name === "CloudCover")
				{
					accessory.CloudCoverService.setCharacteristic(Characteristic.OccupancyDetected, convertedValue > 20 ? 1 : 0);
					accessory.CloudCoverService.setCharacteristic(Characteristic.Name, "Cloud Cover: " + convertedValue);
				}
				else if (name === "DewPoint")
				{
					accessory.DewPointService.setCharacteristic(Characteristic.CurrentTemperature, convertedValue);
				}
				else if (name === "Humidity")
				{
					accessory.HumidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, convertedValue);
				}
				else if (["RainBool", "SnowBool"].includes(name))
				{
					accessory[name + "Service"].setCharacteristic(Characteristic.OccupancyDetected, convertedValue ? 1 : 0);
				}
				else if (name === "TemperatureMin")
				{
					accessory.TemperatureMinService.setCharacteristic(Characteristic.CurrentTemperature, convertedValue);
				}
				else if (name === "UVIndex")
				{
					accessory.UVIndexService.setCharacteristic(Characteristic.OccupancyDetected, value > 2 ? 1 : 0);
					accessory.UVIndexService.setCharacteristic(Characteristic.Name, "UV Index: " + convertedValue);
				}
				else if (name === "Visibility")
				{
					accessory.VisibilityService.setCharacteristic(Characteristic.Name, "Visibility: " + convertedValue + accessory.VisibilityService.unit);
				}
				else if (name === "WindDirection")
				{
					accessory.WindDirectionService.setCharacteristic(Characteristic.Name, "Wind Dir: " + convertedValue);
				}
				else if (name === "WindSpeed")
				{
					accessory.WindSpeedService.setCharacteristic(Characteristic.OccupancyDetected, value > 4 ? 1 : 0);
					accessory.WindSpeedService.setCharacteristic(Characteristic.Name, "Wind Speed: " + convertedValue + accessory.WindSpeedService.unit);
				}
				else
				{
					log.error("Unkown compatiblity type " + name);
				}
			}
			// Humidity might have an extra service if configured (only for current conditions)
			else if (config.compatibility === "eve" && name === "Humidity" && config.extraHumidity && type === "current")
			{
				accessory.HumidityService.setCharacteristic(Characteristic.CurrentRelativeHumidity, convertedValue);
			}
			// Otherwise humidity is a homekit characteristic
			else if (name === "Humidity")
			{
				temperatureService.setCharacteristic(Characteristic.CurrentRelativeHumidity, convertedValue);
			}
			// Set everything else as a custom characteristic in the temperature service
			else
			{
				temperatureService.setCharacteristic(CustomCharacteristic[name], convertedValue);
			}
		}
	}
};
