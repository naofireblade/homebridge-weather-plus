/* jshint esversion: 6,node: true,-W041: false */
"use strict";
const darksky = require("./apis/darksky").DarkSkyAPI,
	weatherunderground = require("./apis/weatherunderground").WundergroundAPI,
	openweathermap = require("./apis/openweathermap").OpenWeatherMapAPI,
	debug = require("debug")("homebridge-weather-plus");

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
	this.interval = "interval" in _config ? parseInt(_config.interval) : 4;
	this.interval = (typeof this.interval !== "number" || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;

	// Custom Services and Characteristics
	CustomService = require("./util/services")(Service, Characteristic);
	CustomCharacteristic = require("./util/characteristics")(Characteristic, this.units);
	CurrentConditionsWeatherAccessory = require("./accessories/currentConditions")(Service, Characteristic, CustomService, CustomCharacteristic, FakeGatoHistoryService);
	ForecastWeatherAccessory = require("./accessories/forecast")(Service, Characteristic, CustomCharacteristic);

	// Create weather stations, create default one if no stations array given
	this.stationConfigs = this.config.stations || [{}];

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
				this.stations.push(new darksky(config.key, config.language, config.locationGeo || config.locationId, this.log));
				break;
			case "weatherunderground":
				this.log("Adding station with weather service Weather Underground named '" + config.nameNow + "'");
				this.stations.push(new weatherunderground(config.key, config.locationId, this.log));
				break;
			case "openweathermap":
				this.log("Adding station with weather service OpenWeatherMap named '" + config.nameNow + "'");
				this.stations.push(new openweathermap(config.key, config.language, config.locationId, config.locationGeo, config.locationCity, this.log));
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
			if (typeof day === "number" && (day % 1) === 0 && day >= 0 && day <= this.stations[index].forecastDays)
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
		station.compatibility = "mix";
		station.compatibility = stationConfig.currentObservations || station.compatibility;
		station.compatibility = stationConfig.compatibility || station.compatibility;

		// Other options
		station.forecast = stationConfig.forecast || [];
		station.language = stationConfig.language || "en";
		station.fakegatoParameters = stationConfig.fakegatoParameters || {storage: "fs"};
		station.hidden = stationConfig.hidden || [];
		// station.hidden.forEach((hidden) => {
		// 	hidden = hidden.toLowerCase();
		// });
		debug(station.hidden);
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
						if (accessory.stationIndex === stationIndex && accessory.currentConditionsService !== undefined && weather.report !== undefined)
						{
							try
							{
								let service = accessory.currentConditionsService;
								let data = weather.report;
								debug("Current Conditions for station '%s': %O", accessory.name, data);

								// Set homekit characteristic value for each reported characteristic of the api
								station.reportCharacteristics.forEach((characteristicName) =>
								{
									this.saveCharacteristic(accessory.config, service, characteristicName, data[characteristicName]);
								});

								debug("Saving history entry");
								accessory.historyService.addEntry({
									time: new Date().getTime() / 1000,
									temp: accessory.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).value,
									pressure: accessory.currentConditionsService.getCharacteristic(CustomCharacteristic.AirPressure).value,
									humidity: accessory.currentConditionsService.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
								});
							} catch (error)
							{
								this.log.error("Exception while parsing weather report: " + error);
								this.log.error("Report: " + weather.report);
							}
						}
						// Add a weather forecast for the given day
						else if (accessory.stationIndex === stationIndex && accessory.forecastService !== undefined && weather.forecasts[accessory.day] !== undefined)
						{
							try
							{
								let service = accessory.forecastService;
								let data = weather.forecasts[accessory.day];
								debug("Forecast for station '%s': %O", accessory.name, data);

								// Set homekit characteristic value for each reported characteristic of the api
								station.forecastCharacteristics.forEach((characteristicName) =>
								{
									this.saveCharacteristic(accessory.config, service, characteristicName, data[characteristicName]);
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
	saveCharacteristic: function (config, service, name, value)
	{
		if (config.hidden.indexOf(name) === -1 || name === "Temperature")
		{
			// Temperature is an official homekit characteristic
			if (name === "Temperature")
			{
				service.setCharacteristic(Characteristic.CurrentTemperature, value);
			}
			// Humidity is an official homekit characteristic
			else if (name === "Humidity")
			{
				service.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
			}
			// Everything else is a custom characteristic
			else
			{
				value = CustomCharacteristic[name]._unitvalue ? CustomCharacteristic[name]._unitvalue(value) : value;
				service.setCharacteristic(CustomCharacteristic[name], value);
			}
		}
	}
};