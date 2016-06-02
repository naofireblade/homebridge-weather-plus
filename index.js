"use strict";
var Wunderground = require('wundergroundnode');
var inherits = require('util').inherits;
var Service, Characteristic;

var weatherStationService;

var WeatherConditionValue
var WeatherCondition
var WeatherStation

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory("homebridge-wunderground", "WUWeatherStation", WUWeatherStation);
	
    WeatherConditionValue = function() {
      Characteristic.call(this, 'Weather Condition Value', 'cd65a9ab-85ad-494a-b2bd-2f380084134c');
      this.setProps({
        format: Characteristic.Formats.UINT8,
        maxValue: 2,
        minValue: 0,
        minStep: 1,
        perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
      });
      this.value = this.getDefaultValue();
    };
    inherits(WeatherConditionValue, Characteristic);
	
    WeatherCondition = function() {
      Characteristic.call(this, 'Weather Condition', 'cd65a9ab-85ad-494a-b2bd-2f380084134d');
      this.setProps({
        format: Characteristic.Formats.STRING,
        perms: [Characteristic.Perms.READ]
      });
      this.value = this.getDefaultValue();
    };
    inherits(WeatherCondition, Characteristic);
	
    WeatherStation = function(displayName, subtype) {
  	  Service.call(this, displayName, 'debf1b79-312e-47f7-bf82-993d9950f3a2', subtype);

  	  // Required Characteristics
  	  this.addCharacteristic(WeatherCondition);
  	  this.addCharacteristic(WeatherConditionValue);
	  this.addCharacteristic(Characteristic.CurrentRelativeHumidity);
	  this.addCharacteristic(Characteristic.CurrentTemperature);

  	  // Optional Characteristics
  	  this.addOptionalCharacteristic(Characteristic.StatusActive);
  	  this.addOptionalCharacteristic(Characteristic.Name);
  	};
  	inherits(WeatherStation, Service);
}

function WUWeatherStation(log, config) {
    this.log = log;
    this.wunderground = new Wunderground(config['key']);
    this.name = config['name'];
    this.postalCode = config['postalCode'];
    this.timestampOfLastUpdate = 0;
	
    this.informationService = new Service.AccessoryInformation();

    this.informationService
            .setCharacteristic(Characteristic.Manufacturer, "HomeBridge")
            .setCharacteristic(Characteristic.Model, "Weather Underground")
            .setCharacteristic(Characteristic.SerialNumber, this.postalCode);

	this.weatherStationService = new WeatherStation(this.name)	
	
	this.updateWeatherConditions();
}

WUWeatherStation.prototype = {

    identify: function (callback) {
        this.log("Identify requested!");
        callback(); // success
    },

    getServices: function () {
        return [this.informationService, this.weatherStationService];
    },
	
	updateWeatherConditions: function() {
		var that = this
		
	    that.wunderground.conditions().request(that.postalCode, function(err, response){
			that.timestampOfLastUpdate = Date.now() / 1000 | 0;
    		that.temperature = response['current_observation']['temp_c'];
			let conditionIcon = response['current_observation']['icon']
			that.condition = response['current_observation']['weather']
			switch (conditionIcon) {									
			case "rain":
			case "tstorm":
			case "tstorms":
				that.conditionValue = 1
				break;
			case "snow":
			case "sleet":
			case "flurries":
				that.conditionValue = 2
				break;
			default:
				that.conditionValue = 0
				break;
			}
   			that.humidity = parseInt(response['current_observation']['relative_humidity'].substr(0, response['current_observation']['relative_humidity'].length-1));
			
			let humidityString = response['current_observation']['relative_humidity']
			let temperatureString = response['current_observation']['temperature_string']
			let uv = response['current_observation']['UV']
			that.log("Current Weather Conditions: " + that.condition + ", " + temperatureString + ", " + humidityString + " humidity, UV: " + uv)
			
			that.weatherStationService.setCharacteristic(WeatherConditionValue,that.conditionValue);
			that.weatherStationService.setCharacteristic(WeatherCondition,that.condition);
			that.weatherStationService.setCharacteristic(Characteristic.CurrentTemperature, that.temperature);
			that.weatherStationService.setCharacteristic(Characteristic.CurrentRelativeHumidity, that.humidity);
	    });
		
		// wunderground limits to 500 api calls a day. Making a call every 4 minutes == 360 calls
		setTimeout(this.updateWeatherConditions.bind(this), 4 * 60 * 1000);
	}
};