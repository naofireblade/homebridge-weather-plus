/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const darksky = require("./api/darksky").DarkSkyAPI,
	weatherunderground = require("./api/weatherunderground").WundergroundAPI,
	openweathermap = require("./api/openweathermap").OpenWeatherMapAPI,
	yahoo = require("./api/yahoo").YahooAPI,
	debug = require("debug")("homebridge-weather-plus"),
	version = require("./package.json").version;

let Service,
	Characteristic,
	CustomService,
	CustomCharacteristic,
	FakeGatoHistoryService;

module.exports = function (homebridge)
{
	// Homekit Services and Characteristics
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;

	// History Service
	FakeGatoHistoryService = require("fakegato-history")(homebridge);

	// Start platform
	homebridge.registerPlatform("homebridge-weather-plus", "WeatherPlus", WeatherPlusPlatform);
};

// ============
// = Platform =
// ============
function WeatherPlusPlatform(log, config)
{
	debug("Init WeatherPlus platform");
	
	this.log = log;
	this.config = config;
	this.apis = [];
	this.accessoriesList = [];

	// Parse global config
	this.units = config.units || "si";
	this.interval = "interval" in config ? parseInt(config.interval) : 4;
	this.interval = (typeof this.interval !== "number" || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;

	// Custom Services and Characteristics
	CustomService = require("./util/services")(Service, Characteristic);
	CustomCharacteristic = require("./util/characteristics")(Characteristic, this.units);

	// Create weather stations
	if ("stations" in config)
	{
		this.stations = this.config.stations;
	}
	else
	{
		this.stations = [{}];
	}

	// Parse config for each station
	this.stations.forEach((station, index) =>
	{
		station.index = index;
		this.parseStationConfig(station);
	});

	// Create accessories
	this.stations.forEach(function (station, index)
	{
		if (station.service === "darksky")
		{
			debug("Using service dark sky");
			// TODO adapt unit of characteristics
			if (station.locationId)
			{
				station.locationGeo = station.locationId;
			}
			this.apis.push(new darksky(station.key, station.language, station.locationGeo, this.log, this.debug));
		}
		else if (station.service === "weatherunderground")
		{
			debug("Using service weather underground");
			this.apis.push(new weatherunderground(station.key, station.locationId, log, debug));
		}
		else if (station.service === "openweathermap")
		{
			debug("Using service OpenWeatherMap");
			this.apis.push(new openweathermap(station.key, station.language, station.locationId, station.locationGeo, station.locationCity, this.log, this.debug));
		}
		else if (station.service === "yahoo")
		{
			debug("Using service Yahoo");
			this.apis.push(new yahoo(this.locationId, log, debug));
		}

		this.accessoriesList.push(new CurrentConditionsWeatherAccessory(this, index));

		// Add all configured forecast days
		for (let i = 0; i < station.forecast.length; i++)
		{
			const day = station.forecast[i];
			if (typeof day === "number" && (day % 1) === 0 && day >= 1 && day <= this.apis[index].forecastDays)
			{
				this.accessoriesList.push(new ForecastWeatherAccessory(this, index, day - 1));
			}
			else
			{
				debug("Ignoring forecast day: " + day);
			}
		}
	}.bind(this));

	// Start update timer
	this.updateWeather();
}

WeatherPlusPlatform.prototype = {
	// Get the current condition accessory and all forecast accessories
	accessories: function (callback)
	{
		debug("WeatherStationPlus: accessoriesList readed");
		callback(this.accessoriesList);
	},

	parseStationConfig (station)
	{
		let stationConfig = JSON.parse(JSON.stringify(station));

		// Weather service
		station.service = stationConfig.service.toLowerCase().replace(/\s/g, "");

		// Location id. Multiple parameter names are possible for backwards compatiblity
		station.locationId = "";
		station.locationId = stationConfig.location || station.locationId;
		station.locationId = stationConfig.stationId || station.locationId;
		station.locationId = stationConfig.locationId || station.locationId;

		// Station name. Default is now, increment if multiple stations, use name from config if given
		station.nameNow = "Now" + (stationConfig.index > 0 ? (" - " + (stationConfig.index + 1)) : "");
		station.nameNow = stationConfig.displayName || station.nameNow;
		station.nameNow = stationConfig.nameNow || station.nameNow;

		// Station forecast name. Multiple parameter names are possible for backwards compatiblity
		station.nameForecast = ""; // TODO testen mit mehreren Stations die Forecaste haben
		station.nameForecast = stationConfig.displayNameForecast || station.nameNow;
		station.nameForecast = stationConfig.nameForecast || station.nameNow;

		// Compatibility with different homekit apps. Multiple parameter names are possible for backwards compatiblity
		station.compatibility = "mix";
		station.compatibility = stationConfig.currentObservations || station.compatibility;
		station.compatibility = stationConfig.compatibility || station.compatibility;

		// Other options
		station.forecast = stationConfig.forecast || [];
		station.language = stationConfig.language || "en";
		station.fakegatoParameters = stationConfig.fakegatoParameters || {storage: "fs"};
		station.hidden = stationConfig.hidden || [];
		station.serial = station.service + " - " + (station.locationId || '') + (station.locationGeo || '') + (station.locationCity || '');
	},

	// Update the weather for all accessories
	updateWeather: function ()
	{
		this.apis.forEach(function (station, stationIndex)
		{
			station.update(function (error, weather)
			{
				if (!error)
				{
					for (var i = 0; i < this.accessoriesList.length; i++)
					{
						// Add current weather conditions
						if (this.accessoriesList[i].currentConditionsService !== undefined && weather.report !== undefined && this.accessoriesList[i].stationIndex == stationIndex)
						{
							try
							{
								let service = this.accessoriesList[i].currentConditionsService;
								let data = weather.report;

								for (let i = 0; i < this.apis[stationIndex].reportCharacteristics.length; i++)
								{
									const name = this.apis[stationIndex].reportCharacteristics[i];
									this.saveCharacteristic(service, name, data[name]);
								}
								debug("Saving history entry");
								this.accessoriesList[i].historyService.addEntry({
									time: new Date().getTime() / 1000,
									temp: this.accessoriesList[i].currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).value,
									pressure: this.accessoriesList[i].currentConditionsService.getCharacteristic(CustomCharacteristic.AirPressure).value,
									humidity: this.accessoriesList[i].currentConditionsService.getCharacteristic(Characteristic.CurrentRelativeHumidity).value
								});
							} catch (error)
							{
								this.log.error("Exception while parsing weather report: " + error);
								this.log.error("Report: " + weather.report);
							}
						}
						// Add a weather forecast for the given day
						else if (this.accessoriesList[i].forecastService !== undefined && weather.forecasts[this.accessoriesList[i].day] !== undefined && this.accessoriesList[i].stationIndex == stationIndex)
						{
							try
							{
								let service = this.accessoriesList[i].forecastService;
								let data = weather.forecasts[this.accessoriesList[i].day];

								for (let i = 0; i < this.apis[stationIndex].forecastCharacteristics.length; i++)
								{
									const name = this.apis[stationIndex].forecastCharacteristics[i];
									this.saveCharacteristic(service, name, data[name]);
								}
							} catch (error)
							{
								this.log.error("Exception while parsing weather forecast: " + error);
								this.log.error("Forecast: " + weather.forecast);
							}
						}
					}
				}
			}.bind(this), this.stations[stationIndex].forecast.length);
		}.bind(this));
		setTimeout(this.updateWeather.bind(this), (this.interval) * 60 * 1000);
	},

	// Save changes from update in characteristics 
	saveCharacteristic: function (service, name, value)
	{
		// humidity not a custom but a general apple home kit characteristic
		if (name === "Humidity")
		{
			debug("Characteristic:" + name + ":" + value);
			service.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
		}
		// temperature not a custom but a general apple home kit characteristic
		else if (name === "Temperature")
		{
			debug("Characteristic:" + name + ":" + value);
			service.setCharacteristic(Characteristic.CurrentTemperature, value);
		}
		// all other custom characteristics
		else
		{
			if (CustomCharacteristic[name]._unitvalue) value = CustomCharacteristic[name]._unitvalue(value);

			debug("CustomCharacteristic:" + name + ":" + value);
			service.setCharacteristic(CustomCharacteristic[name], value);
		}
	},
};

// ===============================
// = Current Condition Accessory =
// ===============================
function CurrentConditionsWeatherAccessory(platform, stationIndex)
{
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.stations[stationIndex];
	this.name = this.config.nameNow;
	this.nameNow = this.name;  //needed by fakegato for proper logging and file naming
	this.stationIndex = stationIndex;


	// Create temperature sensor or Eve Weather service that includes temperature characteristic

	if (this.config.compatibility !== "eve")
	{
		this.currentConditionsService = new Service.TemperatureSensor(this.name);
		debug("Using mixed mode for compatibility");
	}
	else
	{
		this.currentConditionsService = new CustomService.EveWeatherService(this.name);
		debug("Using eve mode for compatibility");
	}

	// Fix negative temperatures not supported by homekit
	this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.apis[stationIndex].reportCharacteristics.length; i++)
	{
		const name = this.platform.apis[stationIndex].reportCharacteristics[i];

		debug("Characteristic-name:" + name);

		// humidity not a custom but a general apple home kit characteristic
		if (name === "Humidity")
		{
			this.currentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== "Temperature")
		{
			this.currentConditionsService.addCharacteristic(CustomCharacteristic[name]);
		}
	}

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
	.setCharacteristic(Characteristic.Model, this.platform.apis[stationIndex].attribution)
	.setCharacteristic(Characteristic.SerialNumber, this.config.serial)
	.setCharacteristic(Characteristic.FirmwareRevision, version);

	// Create history service
	this.historyService = new FakeGatoHistoryService("weather", this, this.config.fakegatoParameters);

	// Start the weather update process
}

CurrentConditionsWeatherAccessory.prototype = {
	identify: function (callback)
	{
		callback();
	},

	getServices: function ()
	{
		return [this.informationService, this.currentConditionsService, this.historyService];
	}
};

// ======================
// = Forecast Accessory =
// ======================
function ForecastWeatherAccessory(platform, stationIndex, day)
{
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.stations[stationIndex];
	this.stationIndex = stationIndex;
	this.serial = this.config.serial + " - Day " + day;

	switch (day)
	{
		case 0:
			this.name = "Today";
			break;
		case 1:
			this.name = "In 1 Day";
			break;
		default:
			this.name = "In " + day + " Days";
			break;
	}
	if (this.config.nameForecast)
		this.name = this.config.nameForecast + " " + this.name;
	else if (platform.stations.length > 1)
		this.name = this.name + " - " + (stationIndex + 1);

	this.day = day;

	// Create temperature sensor service that includes temperature characteristic
	this.forecastService = new Service.TemperatureSensor(this.name);


	// Fix negative temperatures not supported by homekit
	this.forecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.apis[stationIndex].forecastCharacteristics.length; i++)
	{
		const name = this.platform.apis[stationIndex].forecastCharacteristics[i];

		// humidity not a custom but a general apple home kit characteristic
		if (name === "Humidity")
		{
			this.forecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== "Temperature")
		{
			this.forecastService.addCharacteristic(CustomCharacteristic[name]);
		}
	}

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
	.setCharacteristic(Characteristic.Model, this.platform.apis[stationIndex].attribution)
	.setCharacteristic(Characteristic.SerialNumber, this.serial)
	.setCharacteristic(Characteristic.FirmwareRevision, version);
}

ForecastWeatherAccessory.prototype = {
	identify: function (callback)
	{
		callback();
	},

	getServices: function ()
	{
		return [this.informationService, this.forecastService];
	}
};
