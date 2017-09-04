"use strict";
var inherits = require('util').inherits, 
debug = require('debug')('homebridge-weather-station-extended'),
wunderground = require('wundergroundnode'),

Service,
Characteristic,

CustomUUID = {
	// Eve UUID
	AirPressure: 'E863F10F-079E-48FF-8F27-9C2605A29F52',
	// Other UUID
	WindSpeed: '49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41',
	// Weather Station UUIDs
	Condition: 'cd65a9ab-85ad-494a-b2bd-2f380084134d',
	ConditionCategory: 'cd65a9ab-85ad-494a-b2bd-2f380084134c',
	// Weather Station Extended UUIDs
	Rain1h: '10c88f40-7ec4-478c-8d5a-bd0c3cce14b7',
	RainDay: 'ccc04890-565b-4376-b39a-3113341d9e0f',
	WindDirection: '46f1284c-1912-421b-82f5-eb75008b167e',
	WindSpeedMax: '6b8861e5-d6f3-425c-83b6-069945ffd1f1',
	Visibility: 'd24ecc1e-6fad-4fb5-8137-5af88bd5e857',
	UVIndex: '05ba0fe0-b848-4226-906d-5b64272e05ce',
	ObservationStation: 'd1b2787d-1fc4-4345-a20e-7b5a74d693ed',
	ObservationTime: '234fd9f1-1d33-4128-b622-d052f0c402af',
	ChanceRain: 'fc01b24f-cf7e-4a74-90db-1b427af1ffa3',
	ForecastDay: '57f1d4b2-0e7e-4307-95b5-808750e2c1c7'
},
CustomCharacteristic = {};

module.exports = function (homebridge) {
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerPlatform("homebridge-wunderground-extended", "WeatherStation", WeatherStationPlatform);

	CustomCharacteristic.Condition = function() {
		Characteristic.call(this, 'Weather Condition', CustomUUID.Condition);
		this.setProps({
			format: Characteristic.Formats.STRING,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.Condition, Characteristic);

	CustomCharacteristic.ConditionCategory = function() {
		Characteristic.call(this, 'Weather Condition Category', CustomUUID.ConditionCategory);
		this.setProps({
			format: Characteristic.Formats.UINT8,
			maxValue: 3,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.ConditionCategory, Characteristic);

	CustomCharacteristic.Rain1h = function() {
		Characteristic.call(this, 'Rain Last Hour', CustomUUID.Rain1h);
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: "mm",
			maxValue: 50,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.Rain1h, Characteristic);

	CustomCharacteristic.RainDay = function() {
		Characteristic.call(this, 'Rain All Day', CustomUUID.RainDay);
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: "mm",
			maxValue: 100,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.RainDay, Characteristic);

	CustomCharacteristic.WindDirection = function() {
		Characteristic.call(this, 'Wind Direction', CustomUUID.WindDirection);
		this.setProps({
			format: Characteristic.Formats.STRING,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.WindDirection, Characteristic);

	CustomCharacteristic.WindSpeed = function() {
		Characteristic.call(this, 'Wind Speed', CustomUUID.WindSpeed);
		this.setProps({
			format: Characteristic.Formats.FLOAT,
			unit: "km/h",
			maxValue: 100,
			minValue: 0,
			minStep: 0.1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.WindSpeed, Characteristic);

	CustomCharacteristic.WindSpeedMax = function() {
		Characteristic.call(this, 'Wind Speed Max', CustomUUID.WindSpeedMax);
		this.setProps({
			format: Characteristic.Formats.FLOAT,
			unit: "km/h",
			maxValue: 100,
			minValue: 0,
			minStep: 0.1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.WindSpeedMax, Characteristic);

	CustomCharacteristic.AirPressure = function() {
		Characteristic.call(this, 'Air Pressure', CustomUUID.AirPressure);
		this.setProps({
			format: Characteristic.Formats.UINT16,
			unit: "hPa",
			maxValue: 1100,
			minValue: 700,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.AirPressure, Characteristic);

	CustomCharacteristic.Visibility = function() {
		Characteristic.call(this, 'Visibility', CustomUUID.Visibility);
		this.setProps({
			format: Characteristic.Formats.UINT8,
			unit: "km",
			maxValue: 100,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.Visibility, Characteristic);

	CustomCharacteristic.UVIndex = function() {
		Characteristic.call(this, 'UV Index', CustomUUID.UVIndex);
		this.setProps({
			format: Characteristic.Formats.UINT8,
			maxValue: 10,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.UVIndex, Characteristic);

	CustomCharacteristic.ChanceRain = function() {
		Characteristic.call(this, 'Chance Rain', CustomUUID.ChanceRain);
		this.setProps({
			format: Characteristic.Formats.UINT8,
			unit: Characteristic.Units.PERCENTAGE,
			maxValue: 100,
			minValue: 0,
			minStep: 1,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.ChanceRain, Characteristic);

	CustomCharacteristic.ObservationStation = function() {
		Characteristic.call(this, 'Station', CustomUUID.ObservationStation);
		this.setProps({
			format: Characteristic.Formats.STRING,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.ObservationStation, Characteristic);

	CustomCharacteristic.ObservationTime = function() {
		Characteristic.call(this, 'Observation Time', CustomUUID.ObservationTime);
		this.setProps({
			format: Characteristic.Formats.STRING,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.ObservationTime, Characteristic);

	CustomCharacteristic.ForecastDay = function() {
		Characteristic.call(this, 'Day', CustomUUID.ForecastDay);
		this.setProps({
			format: Characteristic.Formats.STRING,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
		});
		this.value = this.getDefaultValue();
	};
	inherits(CustomCharacteristic.ForecastDay, Characteristic);
}

function WeatherStationPlatform(log, config) {
	this.log = log;
	this.config = config;
	this.location = config['location'];
	this.forecastDays = ('forecast' in config ? config['forecast'] : '');
	this.station = new wunderground(config['key']);
	this.interval = ('interval' in config ? parseInt(config['interval']) : 4);
	this.interval = (typeof this.interval !=='number' || (this.interval%1)!==0 || this.interval < 0) ? 4 : this.interval;

	this.updateWeather();
}

WeatherStationPlatform.prototype = {
	accessories: function(callback) {
		this.accessories = [];

		let currentConditions = new CurrentConditionsWeatherAccessory(this);
		let forecast0Day = new ForecastWeatherAccessory(this, 0);
		let forecast1Day = new ForecastWeatherAccessory(this, 1);
		let forecast2Day = new ForecastWeatherAccessory(this, 2);
		let forecast3Day = new ForecastWeatherAccessory(this, 3);

		this.accessories.push(currentConditions);

		if (this.forecastDays.indexOf('none') !== -1) {
			// skip
		}
		else if (this.forecastDays.indexOf('today') !== -1)
		{
			this.accessories.push(forecast0Day);
		}
		else
		{
			this.accessories.push(forecast0Day);
			this.accessories.push(forecast1Day);
			this.accessories.push(forecast2Day);
			this.accessories.push(forecast3Day);
		}

		callback(this.accessories);
	},

	updateWeather: function() {
		let that = this;

		debug("Update weather online");
		this.station.conditions().forecast().request(this.location, function(err, response) {
			if (!err) {
				for (var i = 0; i < that.accessories.length; i++) {
					if (that.accessories[i].currentConditionsService !== undefined && response['current_observation'] )
					{
						debug("Update values for " + that.accessories[i].currentConditionsService.displayName);
						let conditions = response['current_observation'];
						let service = that.accessories[i].currentConditionsService;

						service.setCharacteristic(Characteristic.CurrentTemperature, conditions['temp_c']);
						service.setCharacteristic(Characteristic.CurrentRelativeHumidity, parseInt(conditions['relative_humidity'].substr(0, conditions['relative_humidity'].length-1)));
						service.setCharacteristic(CustomCharacteristic.Condition,conditions['weather']);
						let rain1h = parseInt(conditions['precip_1hr_metric']);
						service.setCharacteristic(CustomCharacteristic.Rain1h,isNaN(rain1h) ? 0 : rain1h);
						let rainDay = parseInt(conditions['precip_today_metric']);
						service.setCharacteristic(CustomCharacteristic.RainDay,isNaN(rainDay) ? 0 : rainDay);
						service.setCharacteristic(CustomCharacteristic.WindDirection,conditions['wind_dir']);
						service.setCharacteristic(CustomCharacteristic.WindSpeed,parseFloat(conditions['wind_kph']));
						service.setCharacteristic(CustomCharacteristic.WindSpeedMax,parseFloat(conditions['wind_gust_kph']));
						service.setCharacteristic(CustomCharacteristic.AirPressure,parseInt(conditions['pressure_mb']));
						let visibility = parseInt(conditions['visibility_km']);
						service.setCharacteristic(CustomCharacteristic.Visibility,isNaN(visibility) ? 0 : visibility);
						let uvIndex = parseInt(conditions['UV']);
						service.setCharacteristic(CustomCharacteristic.UVIndex,isNaN(uvIndex) ? 0 : uvIndex);
						service.setCharacteristic(CustomCharacteristic.ObservationStation, conditions['observation_location']['full']);
						service.setCharacteristic(CustomCharacteristic.ObservationTime, conditions['observation_time_rfc822'].split(' ')[4]);
						service.setCharacteristic(CustomCharacteristic.ConditionCategory, getConditionCategory(conditions['icon']));
					}
					else if (that.accessories[i].forecastService !== undefined && response['forecast'])
					{
						debug("Update values for " + that.accessories[i].forecastService.displayName);
						let forecast = response['forecast']['simpleforecast']['forecastday'];
						let service = that.accessories[i].forecastService;
						let day = that.accessories[i].day;

						service.setCharacteristic(CustomCharacteristic.ForecastDay, forecast[day]['date']['weekday']);
						service.setCharacteristic(Characteristic.CurrentTemperature, forecast[day]['high']['celsius']);
						service.setCharacteristic(Characteristic.CurrentRelativeHumidity, parseInt(forecast[day]['avehumidity']));
						service.setCharacteristic(CustomCharacteristic.Condition, forecast[day]['conditions']);
						service.setCharacteristic(CustomCharacteristic.ChanceRain, forecast[day]['pop']);
						let rainDay = parseInt(forecast[day]['qpf_allday']['mm']);
						service.setCharacteristic(CustomCharacteristic.RainDay,isNaN(rainDay) ? 0 : rainDay);
						service.setCharacteristic(CustomCharacteristic.WindDirection,forecast[day]['avewind']['dir']);
						service.setCharacteristic(CustomCharacteristic.WindSpeed,parseFloat(forecast[day]['avewind']['kph']));
						service.setCharacteristic(CustomCharacteristic.WindSpeedMax,parseFloat(forecast[day]['maxwind']['kph']));
						service.setCharacteristic(CustomCharacteristic.ConditionCategory, getConditionCategory(forecast[day]['icon']));
					}
				}

				if (!response['current_observation'])
				{
					that.log("Found no current observations");
					that.log(response);
				}
				if (!response['forecast'])
				{
					that.log("Found no forecast");
					that.log(response);
				}
			}
			else {
				that.log("Error retrieving weather");
				that.log(response);
			}
		});
		setTimeout(this.updateWeather.bind(this), (this.interval) * 60 * 1000);
	}
}

function CurrentConditionsWeatherAccessory(platform) {
	this.platform = platform;
	this.log = platform.log;
	this.name = "Current Observations";

	this.currentConditionsService = new Service.TemperatureSensor(this.name);
	this.currentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.Condition);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.ConditionCategory);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.Rain1h);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.RainDay);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.WindDirection);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.WindSpeed);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.WindSpeedMax);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.AirPressure);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.Visibility);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.UVIndex);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.ObservationStation);
	this.currentConditionsService.addCharacteristic(CustomCharacteristic.ObservationTime);

	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Name, this.name)
	.setCharacteristic(Characteristic.Manufacturer, "Homebridge")
	.setCharacteristic(Characteristic.Model, "Weather Underground")
	.setCharacteristic(Characteristic.SerialNumber, this.location);
}

CurrentConditionsWeatherAccessory.prototype = {
	identify: function (callback) {
		this.log("Identify requested!");
		callback();
	},

	getServices: function () {
		return [this.informationService, this.currentConditionsService];
	},
}

function ForecastWeatherAccessory(platform, day) {
	this.platform = platform;
	this.log = platform.log;
	switch(day) {
		case 0:
			this.name = "Forecast  Today";
			break;
		case 1:
			this.name = "Forecast in 1 Day";
			break;
		case 2:
			this.name = "Forecast in 2 Days";
			break;
		case 3:
			this.name = "Forecast in 3 Days";
			break;
	}
	this.day = day;

	this.forecastService = new Service.TemperatureSensor(this.name);
	this.forecastService.addCharacteristic(CustomCharacteristic.ForecastDay);
	this.forecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
	this.forecastService.addCharacteristic(CustomCharacteristic.Condition);
	this.forecastService.addCharacteristic(CustomCharacteristic.ConditionCategory);
	this.forecastService.addCharacteristic(CustomCharacteristic.ChanceRain);
	this.forecastService.addCharacteristic(CustomCharacteristic.RainDay);
	this.forecastService.addCharacteristic(CustomCharacteristic.WindDirection);
	this.forecastService.addCharacteristic(CustomCharacteristic.WindSpeed);	
	this.forecastService.addCharacteristic(CustomCharacteristic.WindSpeedMax);	


	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Name, "Weather Forecast")
	.setCharacteristic(Characteristic.Manufacturer, "Homebridge")
	.setCharacteristic(Characteristic.Model, "Weather Underground")
	.setCharacteristic(Characteristic.SerialNumber, this.location);
}

ForecastWeatherAccessory.prototype = {
	identify: function (callback) {
		this.log("Identify requested!");
		callback();
	},

	getServices: function () {
		return [this.informationService, this.forecastService];
	},
}

function getConditionCategory(icon) {
	switch (icon) {
		case "snow":
		case "sleet":
		case "flurries":
		case "chancesnow":
		case "chancesleet":
		case "chanceflurries":
			return 3;
		case "rain":
		case "tstorms":
		case "chancerain":
		case "chancetstorms":
			return 2;
		case "cloudy":
		case "mostlycloudy":
		case "partlysunny":
		case "fog":
		case "hazy":
			return 1;
		case "partlycloudy":
		case "mostlysunny":
		case "sunny":
		case "clear":
		default:
			return 0;
	}
}