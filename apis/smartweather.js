"use strict";

const converter = require('../util/converter'),
	moment = require('moment-timezone'),
	dgram = require("dgram"),
	wformula = require('weather-formulas');

class SmartWeatherAPI
{
	constructor (conditionDetail, log)
	{
		this.attribution = 'Powered by Smart Weather';
		this.reportCharacteristics = [
			'AirPressure', // Station Pressure
			'ConditionCategory', // Precipitation Type
			'DewPoint', // Calculated from Humidity & Temperature
			'TemperatureApparent', // Calculdated from Humidity, Temperature & Windspeed
			'Humidity', // Relative Humidity
			'ObservationStation', // Serial Number of Hub
			'ObservationTime', // Time Epoch
			'Rain1h', // Rain Accumulated
			'RainBool', // Is it raining now
			'RainDay', // Local Day Rain Accumulation
			'SolarRadiation', // Solar Radiation
			'Temperature', // Air Temperature
			'TemperatureMin', // Minimum temperature
			'TemperatureWetBulb', // Wet Bulb Temperature
			'UVIndex', // UV
			'WindDirection', // Wind Direction
			'WindSpeed', // Wind Avg
			'WindSpeedMax', // Wind Gust
			'WindSpeedLull', // Wind Lull
			'LightningStrikes', // Count of lightning Strikes over last hour?
			'LightningAvgDistance', // Average distance to the lightning strikes
			'LightLevel', // Illuminance
			'BatteryLevel', // Device Battery level percent
			'BatteryIsCharging' // Device Battery charging state
		];
	
		this.conditionDetail = conditionDetail;
		this.log = log;
		this.rainAccumulation = [];
		// Fill the array with zeros so that when we sum them up, it doesn't get NaN
		for (var i = 0; i < 60; i++) this.rainAccumulation[i] = 0.0;
		this.rainAccumulationMinute = 0;
		
		this.currentReport = {};
	
		// Need to initialize values because a report could be requested before
		// we have received any information from the weather station.
		this.currentReport.AirPressure = 0;
		this.currentReport.Condition = "Unknown";
		this.currentReport.ConditionCategory = 0;
		this.currentReport.Humidity = 1;
		this.currentReport.ObservationStation = "Unknown";
		this.currentReport.ObservationTime = moment().format('HH:mm:ss');
		this.currentReport.Rain1h = 0.0;
		this.currentReport.RainDay = 0.0;
		this.currentReport.SolarRadiation = 0;
		this.currentReport.Temperature = 0;
		this.currentReport.TemperatureApparent = 0;
		this.currentReport.TemperatureMin = 50;
		this.currentReport.DewPoint = 0;
		this.currentReport.UVIndex = 0;
		this.currentReport.WindDirection = converter.getWindDirection(0);
		this.currentReport.WindSpeed = 0;
		this.currentReport.WindSpeedMax = 0;
		
		// Extras
		this.currentReport.BatteryLevel = 100;
		this.currentReport.BatteryIsCharging = false;
		this.currentReport.WindSpeedLull = 0;
		this.currentReport.LightningStrikes = 0;
		this.currentReport.LightningAvgDistance = 0;
		this.currentReport.LightLevel = 0;
		this.currentReport.TemperatureWetBulb = 0;

		// Non-exposed Weather report characteristics
		this.currentReport.SkySensorBatteryLevel = 100;
		this.currentReport.SkySerialNumber = "SK-";
		this.currentReport.SkyFirmware = "1.0";
		this.currentReport.AirSensorBatteryLevel = 100;
		this.currentReport.AirSerialNumber = "AR-";
		this.currentReport.AirFirmware = "1.0";
		this.currentReport.LightLevelSensorFail = 0;
		this.currentReport.HumiditySensorFail = 0;
		this.currentReport.TemperatureSensorFail = 0;

	
		// Create UDP listener and start listening
		this.server = dgram.createSocket({type: 'udp4', reuseAddr: true});
		this.server.on('error', (err) => {
			  this.log(`server error:\n${err.stack}`);
			  this.server.close();
			  });
	
		this.server.on('message', (msg, rinfo) => {
			try {
				var message = JSON.parse(msg);
				this.log.debug(`Server got: ${message.type}`);
				this.parseMessage(message);
				}
			catch(ex) {
				this.log(`JSON Parse Exception: ${msg} ${ex}`);
				}
			});
	
		this.server.on('listening', () => {
			  const address = this.server.address();
			  this.log(`server listening ${address.address}:${address.port}`);
			  });
	
		this.server.bind(50222);
	}
	
	update(forecastDays, callback)
	{
		this.log.debug("Updating weather with smart weather");

		let weather = {};
		weather.forecasts = [];
		let that = this;
		weather.report = that.currentReport;
		callback(null, weather);
	}

	// Calculate Wet Bulb Temperature
	// TODO: May want to move this to converter file
	getWetBulbTemperature(dryBulbTemperature, relativeHumidity)
	{
		let T = dryBulbTemperature;
		let rh = relativeHumidity;

		let c1 = 0.152;
		let c2 = 8.3136;
		let c3 = 0.5;
		let c4 = 1.6763;
		let c5 = 0.00391838;
		let c6 = 1.5;
		let c7 = 0.0231;
		let c8 = 4.686;

		let Tw = T * Math.atan(c1 * Math.pow((rh + c2), c3)) +
			Math.atan(T+rh) - Math.atan(rh-c4) + 
			c5 * Math.pow(rh, c6) * Math.atan(c7 * rh) - c8;

		return Tw;
	}


	// Map Smart Weather precipitation values to Eve Condition Categories
	getConditionCategory(precipitationType, detail = false)
	{
	// Tempest: 0 = none, 1 = rain, 2 = hail, 3 = rain + hail (experimental)
	
	// Eve (simple): 0 = clear; 3 = snow; 2 = rain; 1 = overcast
	// Eve (detailed): 0 = clear; 1 = Few clouds;2 = Broken clouds;3 =  Overcast;
	//   4 = Fog; 5 = Drizzle; 6 = Rain; 7 = Hail; 8 = Snow; 9 = Severe weather

		if (precipitationType == 1) {
			// Rain
			return detail ? 6 : 2;
		} else if (precipitationType == 2) {
			// Hail
			return detail ? 7 : 2;
		} else if (precipitationType == 3){
			// Rain + Hail (return as hail)
			return detail ? 7 : 2;
		} else {
			// 0 = Clear
			return 0;
		}
	}

	// Relying on the update happening every minute
	getHourlyAccumulatedRain(mmOfRainInLastMinute)
	{
		let that = this;
		
		that.rainAccumulation[that.rainAccumulationMinute] = mmOfRainInLastMinute;
	
		// Can't use util/converter function getRainAccumulated(array[values][field], field)
		// as it takes two dimension array, and SmartWeather only needs one dimension, also
		// it may convert the sum to int and this needs to be float.
		var accumulation = 0.0;
		for (var i = 0; i < 60; i++) {
			accumulation += parseFloat(that.rainAccumulation[i]);
		}
	
		that.rainAccumulationMinute++;
		if (that.rainAccumulationMinute > 59) {
			that.rainAccumulationMinute = 0;
		}
		this.log.debug("getHourlyAccumulatedRain last minute: " + mmOfRainInLastMinute + " last hour: " + accumulation);
		return accumulation;
	}

	// Assume that zero battery level is 2.6v
	getBatteryPercent(batteryVoltage)
	{
		return (batteryVoltage * 100 - 260);
	}
	
	// Tempest battery ranges from 2.30 (flat) to 2.65 (full)
	getTempestBatteryPercent(batteryVoltage)
	{
		var percent = (batteryVoltage * 100.0 - 230.0)/0.3;
		return (percent > 100) ? 100 : (percent < 0.0) ? 0 : percent;
	}
	

	// API: https://weatherflow.github.io/SmartWeather/api/udp/v119/
	parseMessage(message)
	{
		let that = this;
		
		if (message.type == 'device_status') {
			that.currentReport.ObservationStation = message.serial_number;
			that.currentReport.ObservationTime = moment.unix(message.timestamp).format('HH:mm:ss');
			that.currentReport.TemperatureSensorFail = (message.sensor_status & 0x00000010) ? 1 : 0;
			that.currentReport.HumiditySensorFail = (message.sensor_status & 0x00000020) ? 1 : 0;
			that.currentReport.LightLevelSensorFail = (message.sensor_status & 0x00000100) ? 1 : 0;
			// TODO: Check if a sensor has failed, and log it!
			this.log.debug("Temperature Sensor Fail: %d, Humidity Sensor Fail: %d, Light Level Sensor Fail: %d", 
				that.currentReport.TemperatureSensorFail, 
				that.currentReport.HumiditySensorFail, 
				that.currentReport.LightLevelSensorFail);
			var previousLevel = that.currentReport.BatteryLevel;
			that.currentReport.BatteryIsCharging = false;
			if (message.serial_number.charAt(1) == 'T') {  // Tempest 
				that.currentReport.BatteryLevel = this.getTempestBatteryPercent(message.voltage);
			} else {
				that.currentReport.BatteryLevel = this.getBatteryPercent(message.voltage);
			}
			if (that.currentReport.BatteryLevel > previousLevel) {
				that.currentReport.BatteryIsCharging = true;
			}
		}
		
		if (message.type == 'evt_precip') {
			that.currentReport.ObservationStation = message.serial_number;
			that.currentReport.ObservationTime = moment.unix(message.evt[0]).format('HH:mm:ss');
			that.currentReport.ConditionCategory = getConditionCategory(1, this.conditionDetail); // It has started to rain
			that.currentReport.RainBool = true;
		}
		
		if (message.type == 'rapid_wind') {
			that.currentReport.ObservationStation = message.serial_number;
			that.currentReport.ObservationTime = moment.unix(message.ob[0]).format('HH:mm:ss');
			that.currentReport.WindSpeed = message.ob[1];
			that.currentReport.WindDirection = converter.getWindDirection(message.ob[2]);
		}
		
		if (message.type == 'obs_air') {
			that.currentReport.AirSerialNumber = message.serial_number;
			that.currentReport.ObservationStation = that.currentReport.AirSerialNumber;
			that.currentReport.AirFirmware = message.firmware_revision;
			that.currentReport.ObservationTime = moment.unix(message.obs[0][0]).format('HH:mm:ss');
			that.currentReport.AirPressure = message.obs[0][1];
			if (that.currentReport.TemperatureSensorFail == 1)
				that.currentReport.Temperature = 0;
			else
				that.currentReport.Temperature = message.obs[0][2];
			if (that.currentReport.HumiditySensorFail == 1) {
				that.currentReport.Humidity = 0;
				that.currentReport.DewPoint = 0;
			}
			else {
				that.currentReport.Humidity = message.obs[0][3];
				that.currentReport.DewPoint = wformula.kelvinToCelcius(wformula.dewPointMagnusFormula(
					wformula.celciusToKelvin(that.currentReport.Temperature), 
					that.currentReport.Humidity));
			}
			that.currentReport.TemperatureApparent = wformula.kelvinToCelcius(wformula.australianAapparentTemperature(
					wformula.celciusToKelvin(that.currentReport.Temperature),
					that.currentReport.Humidity,
					that.currentReport.WindSpeed));
			that.currentReport.TemperatureMin = (that.currentReport.Temperature < that.currentReport.TemperatureMin) ?
					that.currentReport.Temperature : that.currentReport.TemperatureMin;
			that.currentReport.TemperatureWetBulb = 
					this.getWetBulbTemperature(that.currentReport.Temperature, that.currentReport.Humidity);
			that.currentReport.LightningStrikes = message.obs[0][4];
			that.currentReport.LightningAvgDistance = message.obs[0][5];
			that.currentReport.AirSensorBatteryLevel = this.getBatteryPercent(message.obs[0][6]);
		}

		if (message.type == 'obs_sky') {
			that.currentReport.SkySerialNumber = message.serial_number;
			that.currentReport.ObservationStation = that.currentReport.SkySerialNumber;
			that.currentReport.SkyFirmware = message.firmware_revision;
			that.currentReport.ObservationTime = moment.unix(message.obs[0][0]).format('HH:mm:ss');
			if (that.currentReport.LightLevelSensorFail == 1)
				that.currentReportLightLevel = 0;
			else
				that.currentReport.LightLevel = message.obs[0][1];
			that.currentReport.UVIndex = message.obs[0][2];
			that.currentReport.Rain1h = this.getHourlyAccumulatedRain(message.obs[0][3]);
		
			// Use wind values reported by rapid_wind as they are instantanous,
			// whereas obs_sky are averaged values over last minute
			//that.currentReport.WindSpeed = message.obs[0][5];
			//that.currentReport.WindDirection = converter.getWindDirection(message.obs[0][7]);
			
			// Wind values are min/max over last minute
			that.currentReport.WindSpeedLull = message.obs[0][4];
			that.currentReport.WindSpeedMax = message.obs[0][6];
			
			that.currentReport.SkySensorBatteryLevel = this.getBatteryPercent(message.obs[0][8]);
			that.currentReport.SolarRadiation = message.obs[0][10];
			// currentReport.RainDay = message.obs[0][11];
			// Note that Local Day Rain Accumulation (Field 11) is always null as it is calculate at WeatherFlow
			that.currentReport.RainBool = message.obs[0][3] > 0 ? true : false;
			if (that.rainDayDate === moment.unix(message.obs[0][0]).format('DD')) {
				that.currentReport.RainDay += parseFloat(message.obs[0][3]);
			} else {
				that.rainDayDate = moment.unix(message.obs[0][0]).format('DD');
				that.currentReport.RainDay = parseFloat(message.obs[0][3]);
				that.currentReport.TemperatureMin = that.currentReport.Temperature;
			}
			that.currentReport.ConditionCategory = this.getConditionCategory(message.obs[0][12], this.conditionDetail);
		}

       if (message.type == 'obs_st') {
            that.currentReport.SkySerialNumber = message.serial_number;
      	    that.currentReport.ObservationStation = that.currentReport.SkySerialNumber;
            that.currentReport.SkyFirmware = message.firmware_revision;
            that.currentReport.ObservationTime = moment.unix(message.obs[0][0]).format('HH:mm:ss');
            
            // Wind values are min/max over last minute
            that.currentReport.WindSpeedLull = message.obs[0][1];
            that.currentReport.WindSpeedMax = message.obs[0][3];
            // Use wind values reported by rapid_wind as they are instantanous,
            // whereas obs_sky are averaged values over last minute
            //that.currentReport.WindSpeed = message.obs[0][2];
            //that.currentReport.WindDirection = converter.getWindDirection(message.obs[0][4]);
            
            that.currentReport.AirPressure = message.obs[0][6];
	    if (that.currentReport.TemperatureSensorFail == 1)
	            that.currentReport.Temperature = 0;
	    else
	            that.currentReport.Temperature = message.obs[0][7];
            if (that.currentReport.HumiditySensorFail == 1) {
                that.currentReport.Humidity = 0;
                that.currentReport.DewPoint = 0;
            }
            else {
                that.currentReport.Humidity = message.obs[0][8];
                that.currentReport.DewPoint = wformula.kelvinToCelcius(wformula.dewPointMagnusFormula(
					wformula.celciusToKelvin(that.currentReport.Temperature), 
					that.currentReport.Humidity));
            }
	    that.currentReport.TemperatureApparent = wformula.kelvinToCelcius(wformula.australianAapparentTemperature(
					wformula.celciusToKelvin(that.currentReport.Temperature),
					that.currentReport.Humidity,
					message.obs[0][2]));
	    that.currentReport.TemperatureWetBulb = 
					this.getWetBulbTemperature(that.currentReport.Temperature, that.currentReport.Humidity);
	    if (that.currentReport.LightLevelSensorFail == 1)
                that.currentReport.LightLevel = 0;
	    else
                that.currentReport.LightLevel = message.obs[0][9];
            that.currentReport.UVIndex = message.obs[0][10];
            that.currentReport.SolarRadiation = message.obs[0][11];
            that.currentReport.Rain1h = this.getHourlyAccumulatedRain(message.obs[0][12]);
            that.currentReport.RainBool = message.obs[0][12] > 0 ? true : false;
            if (that.rainDayDate === moment.unix(message.obs[0][0]).format('DD')) {
		this.log.debug("Adding rain " + parseFloat(message.obs[0][12]) + " for day " + that.rainDayDate);
                that.currentReport.RainDay += parseFloat(message.obs[0][12]);
                that.currentReport.TemperatureMin = (that.currentReport.Temperature < that.currentReport.TemperatureMin) ?
					that.currentReport.Temperature : that.currentReport.TemperatureMin;
            } else {
		this.log.debug("Creating new count for rain " + parseFloat(message.obs[0][12]) + " for day " + that.rainDayDate);
                that.rainDayDate = moment.unix(message.obs[0][0]).format('DD');
                that.currentReport.RainDay = parseFloat(message.obs[0][12]);
                that.currentReport.TemperatureMin = that.currentReport.Temperature;
            }
            that.currentReport.ConditionCategory = this.getConditionCategory(message.obs[0][13], this.conditionDetail);
            that.currentReport.LightningAvgDistance = message.obs[0][14];
            that.currentReport.LightningStrikes = message.obs[0][15];
            that.currentReport.SkySensorBatteryLevel = this.getTempestBatteryPercent(message.obs[0][16]);
            var previousLevel = that.currentReport.BatteryLevel;
			that.currentReport.BatteryIsCharging = false;
			that.currentReport.BatteryLevel = that.currentReport.SkySensorBatteryLevel;
			if (that.currentReport.BatteryLevel > previousLevel) {
				that.currentReport.BatteryIsCharging = true;
			}
            
        }
	}
	parseForecasts(forecastObjs, timezone)
	{
		/* NO FORECAST DATA FROM API */
		return [];
	}

}

module.exports = {
	SmartWeatherAPI: SmartWeatherAPI
};
