/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const darksky = require('./api/darksky').DarkSkyAPI,
	weatherunderground = require('./api/weatherunderground').WundergroundAPI,
	openweathermap = require('./api/openweathermap').OpenWeatherMapAPI,
	yahoo = require('./api/yahoo').YahooAPI,
	debug = require('debug')('homebridge-weather-plus'),
	version = require('./package.json').version;

var Service,
	Characteristic,
	CustomCharacteristic,
	CustomService,
	FakeGatoHistoryService;

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;

	// Homekit Characteristics
	Characteristic = homebridge.hap.Characteristic;
	// History Service
	FakeGatoHistoryService = require('fakegato-history')(homebridge);

	homebridge.registerPlatform("homebridge-weather-plus", "WeatherPlus", WeatherStationPlatform);
};

// ============
// = Platform =
// ============
function WeatherStationPlatform(log, config, api) {
	debug("Init WeatherStationPlus platform");
	this.log = log;
	this.debug = debug;
	this.units = config.units || 'si';
	this.config = config;
	this.interval = ('interval' in config ? parseInt(config.interval) : 4);
	this.interval = (typeof this.interval !== 'number' || (this.interval % 1) !== 0 || this.interval < 0) ? 4 : this.interval;
	this.apis = [];
	this.accessoriesList = [];

	// Custom Characteristics
	CustomCharacteristic = require('./util/characteristics')(api, this.units);
	
	// Custom Services
	CustomService = require('./util/services')(api);

	//set default settings and provides backward compatibility with old config file
	if (!('stations' in config))
	{
		this.config.stations = [{}];
		this.config.stations[0].displayName = config.displayName || "Now";
		this.config.stations[0].displayNameForecast = config.displayNameForecast;
		this.config.stations[0].service = config.service;
		this.config.stations[0].key = config.key;
		this.config.stations[0].units = this.units;
		this.config.stations[0].location = config.location;
		this.config.stations[0].locationGeo = config.locationGeo;
		this.config.stations[0].locationCity = config.locationCity;
		this.config.stations[0].forecast = ('forecast' in config ? config.forecast : []);
		this.config.stations[0].language = ('language' in config ? config.language : 'en');
		this.config.stations[0].currentObservationsMode = ('currentObservations' in config ? config.currentObservations : 'normal');
		this.config.stations[0].fakegatoParameters = ('fakegatoParameters' in config ? config.fakegatoParameters : {storage:'fs'});
		this.config.stations[0].serial = config.serial || config.location || 999;
		this.stationsNumber = 1;
	}
	else
	{
		this.stationsNumber = this.config.stations.length;
		this.config.stations.forEach(function(station, stationIndex){
			if (this.stationsNumber > 1)
			{
				station.displayName = station.displayName || ("Now" + " - " + (stationIndex+1));
				station.serial = station.serial || station.location || ("999 - " + (stationIndex+1));
			}
			else
			{
				station.displayName = station.displayName || ("Now");
				station.serial = station.serial || station.location || ("999");
			}
			
			station.units = this.units;
			station.forecast = ('forecast' in station ? station.forecast : []);
			station.language = ('language' in station ? station.language : 'en');
			station.currentObservationsMode = ('currentObservations' in station ? station.currentObservations : 'normal');
			station.fakegatoParameters = ('fakegatoParameters' in station ? station.fakegatoParameters : {storage:'fs'});
		}.bind(this));
		
	}

	//create accessories
	this.config.stations.forEach(function(station, index){
		let service = station.service.toLowerCase().replace(/\s/g, '');
		if (service === 'darksky') {
			debug("Using service dark sky");
			// TODO adapt unit of characteristics
			if (station.location) {
				station.locationGeo = station.location;
			}
			this.apis.push(new darksky(station.key, station.language, station.locationGeo, this.log, this.debug));
		}
		else if (service === 'weatherunderground') {
			debug("Using service weather underground");
			this.apis.push(new weatherunderground(station.key, station.location, log, debug));
		}
		else if (service === 'openweathermap') {
			debug("Using service OpenWeatherMap");
			this.apis.push(new openweathermap(station.key, station.language, station.location, station.locationGeo, station.locationCity, this.log, this.debug));
		}
		else if (service === 'yahoo') {
			debug("Using service Yahoo");
			this.apis.push(new yahoo(this.location, log, debug));
		}

		this.accessoriesList.push(new CurrentConditionsWeatherAccessory(this,index));

		// Add all configured forecast days
		for (let i = 0; i < station.forecast.length; i++) {
			const day = station.forecast[i];
			if (typeof day === 'number' && (day % 1) === 0 && day >= 1 && day <= this.apis[index].forecastDays) {
				this.accessoriesList.push(new ForecastWeatherAccessory(this, index, day - 1));
			}
			else {
				debug("Ignoring forecast day: " + day);
			}
		}
	}.bind(this));
	
	//start updating
	this.updateWeather();
}

WeatherStationPlatform.prototype = {
	// Get the current condition accessory and all forecast accessories
	accessories: function (callback) {
		this.debug("WeatherStationPlus: accessoriesList readed");
		callback(this.accessoriesList);
	},

	// Update the weather for all accessories
	updateWeather: function () {
		this.apis.forEach(function(station,stationIndex){
			station.update(function (error, weather) {
				if (!error) {
					for (var i = 0; i < this.accessoriesList.length; i++) {
						// Add current weather conditions
						if (this.accessoriesList[i].currentConditionsService !== undefined && weather.report !== undefined && this.accessoriesList[i].stationIndex == stationIndex) {
							try {
								let service = this.accessoriesList[i].currentConditionsService;
								let data = weather.report;

								for (let i = 0; i < this.apis[stationIndex].reportCharacteristics.length; i++) {
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
							}
							catch (error) {
								this.log.error("Exception while parsing weather report: " + error);
								this.log.error("Report: " + weather.report);
							}
						}
						// Add a weather forecast for the given day
						else if (this.accessoriesList[i].forecastService !== undefined && weather.forecasts[this.accessoriesList[i].day] !== undefined && this.accessoriesList[i].stationIndex == stationIndex) {
							try {
								let service = this.accessoriesList[i].forecastService;
								let data = weather.forecasts[this.accessoriesList[i].day];

								for (let i = 0; i < this.apis[stationIndex].forecastCharacteristics.length; i++) {
									const name = this.apis[stationIndex].forecastCharacteristics[i];
									this.saveCharacteristic(service, name, data[name]);
								}
							}
							catch (error) {
								this.log.error("Exception while parsing weather forecast: " + error);
								this.log.error("Forecast: " + weather.forecast);
							}
						}
					}
				}
			}.bind(this), this.config.stations[stationIndex].forecast.length);
		}.bind(this));
		setTimeout(this.updateWeather.bind(this), (this.interval) * 60 * 1000);
	},

	// Save changes from update in characteristics
	saveCharacteristic: function (service, name, value) {
		// humidity not a custom but a general apple home kit characteristic
		if (name === 'Humidity') {
			service.setCharacteristic(Characteristic.CurrentRelativeHumidity, value);
		}
		// temperature not a custom but a general apple home kit characteristic
		else if (name === 'Temperature') {
			service.setCharacteristic(Characteristic.CurrentTemperature, value);
		}
		// all other custom characteristics
		else {
			if (CustomCharacteristic[name]._unitvalue) value = CustomCharacteristic[name]._unitvalue(value);
			service.setCharacteristic(CustomCharacteristic[name], value);
		}
	},
};

// ===============================
// = Current Condition Accessory =
// ===============================
function CurrentConditionsWeatherAccessory(platform, stationIndex) {
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.config.stations[stationIndex];
	this.name = this.config.displayName;
	this.displayName = this.name;  //needed by fakegato for proper logging and file naming
	this.stationIndex = stationIndex;
	

	// Create temperature sensor or Eve Weather service that includes temperature characteristic
	
	if (this.config.currentObservationsMode !== 'eve')
		this.currentConditionsService = new Service.TemperatureSensor(this.name);
	else
		this.currentConditionsService = new CustomService.EveWeatherService(this.name);

	// Fix negative temperatures not supported by homekit
	this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.apis[stationIndex].reportCharacteristics.length; i++) {
		const name = this.platform.apis[stationIndex].reportCharacteristics[i];

		// humidity not a custom but a general apple home kit characteristic
		if (name === 'Humidity') {
			this.currentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== 'Temperature') {
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
	identify: function (callback) {
		callback();
	},

	getServices: function () {
		return [this.informationService, this.currentConditionsService, this.historyService];
	}
};

// ======================
// = Forecast Accessory =
// ======================
function ForecastWeatherAccessory(platform, stationIndex, day) {
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.config.stations[stationIndex];
	this.stationIndex = stationIndex;
	this.serial = this.config.serial + " - Day " + day;

	switch (day) {
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
	if (this.config.displayNameForecast)
		this.name = this.config.displayNameForecast + ' ' + this.name;
	else
		if (platform.stationsNumber > 1)
			this.name = this.name + " - " + (stationIndex + 1); 

	this.day = day;

	// Create temperature sensor service that includes temperature characteristic
	this.forecastService = new Service.TemperatureSensor(this.name);
	

	// Fix negative temperatures not supported by homekit
	this.forecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.apis[stationIndex].forecastCharacteristics.length; i++) {
		const name = this.platform.apis[stationIndex].forecastCharacteristics[i];

		// humidity not a custom but a general apple home kit characteristic
		if (name === 'Humidity') {
			this.forecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== 'Temperature') {
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
	identify: function (callback) {
		callback();
	},

	getServices: function () {
		return [this.informationService, this.forecastService];
	}
};
