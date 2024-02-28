"use strict";

/*
	Support for the WeatherFlow Tempest (and legacy) weather station.
	https://weatherflow.com
	
	Full details of the developer APIs is published here:
	https://weatherflow.github.io/Tempest/
 */

const converter = require('../util/converter'),
	moment = require('moment-timezone'),
	dgram = require("dgram"),
	wformula = require('weather-formulas'),
	request = require('request');

class TempestAPI
{
	constructor (apiKey, locationId, conditionDetail, log, cacheDirectory)
	{
		this.attribution = 'Weatherflow Tempest';
		this.reportCharacteristics = [
			'AirPressure', // Station Pressure
			'ConditionCategory', // Precipitation Type
			'Humidity', // Relative Humidity
			'ObservationStation', // Serial Number of Hub
			'ObservationTime', // Time Epoch
			'Rain1h', // Rain Accumulated
			'RainBool', // Is it raining now
			'RainDay', // Local Day Rain Accumulation
			'SolarRadiation', // Solar Radiation
			'Temperature', // Air Temperature
			'TemperatureMin', // Minimum temperature
			'UVIndex', // UV
			'WindDirection', // Wind Direction
			'WindSpeed', // Wind Avg
			'WindSpeedMax', // Wind Gust
			'WindSpeedLull', // Wind Lull
			'LightningStrikes', // Count of lightning Strikes over last hour?
			'LightningAvgDistance', // Average distance to the lightning strikes
			'LightLevel', // Illuminance
			'BatteryLevel', // Device Battery level percent
			'BatteryIsCharging', // Device Battery charging state
			'StatusFault', // Report if there is a fault
			
			// Derived values
			// @see https://weatherflow.github.io/Tempest/api/derived-metric-formulas.html
			'DewPoint', // Calculated from Humidity & Temperature
			'TemperatureApparent', // Calculated from Humidity, Temperature & Windspeed
			'TemperatureWetBulb' // Calculated from Humidity & Temperature
		];
		
		this.forecastCharacteristics = [
			'ObservationTime', // Forecast update time
			'Condition', //Conditions
			'ConditionCategory',
			'ForecastDay', // day_num, month_num, day_start_local
			'RainBool', // precip_icon contains === 'rain' || 'sleet' || 'storm'
			'SnowBool', // precip_icon contains === 'snow'
			'SunriseTime', //sunrise
			'SunsetTime', // sunset
			'TemperatureMax',  // air_temp_high
			'TemperatureMin', // air_temp_low
			'RainChance' // precip_probability
		];
		this.forecastDays = 10;
		
		// Only define the update variable if we have an apiKey and locationId
		if (apiKey && apiKey.length > 0 && locationId && locationId.length > 0) {
			this.lastForecastUpdate = -1;
			}
	
		this.conditionDetail = conditionDetail;
		this.log = log;
		this.apiKey = apiKey;
		this.locationId = locationId;
		
		this.storage = require('node-persist');
		// The saved data is only valid for up to 24hrs (TTL)
		this.storage.initSync({dir:cacheDirectory, forgiveParseErrors: true, ttl: true});
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
		this.currentReport.RainBool = false;
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
		this.currentReport.StatusFault = 0;

		// Non-exposed Weather report characteristics
		// Sky or Tempest station (unlikely to have both)
		this.currentReport.SkySensorBatteryLevel = 100;
		this.currentReport.SkySerialNumber = "SK-";
		this.currentReport.SkyFirmware = "1.0";
		this.currentReport.SkySensorFailureLog = -1;
		// Air station
		this.currentReport.AirSensorBatteryLevel = 100;
		this.currentReport.AirSerialNumber = "AR-";
		this.currentReport.AirFirmware = "1.0";
		this.currentReport.AirSensorFailureLog = -1;
		this.currentReport.SensorString = "Ok";

		// Attempt to restore previous values
		this.load();
		
		// Keep track of previous message so that
		// we can remove duplicates
		this.prevMsg = "";
	
		// Create UDP listener and start listening
		this.server = dgram.createSocket({type: 'udp4', reuseAddr: true});
		this.server.on('error', (err) => {
			  this.log.error(`server error:\n${err.stack}`);
			  this.server.close();
			  });
	
		this.server.on('message', (msg, rinfo) => {
			try {
				var message = JSON.parse(msg);
				this.log.debug(`Server got: ${message.type}`);
				if (msg.toString() === this.prevMsg) {
				    this.log.debug(`Duplicate msg ${msg}`);
				} else {
				    this.parseMessage(message);
				}
				this.prevMsg = msg.toString();
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

	load() {
		this.log("Restoring last readings");
		this.reportCharacteristics.forEach((name) => {
			this.log.debug(`Loading ${name}`);
			let result = this.storage.getItemSync(name);
			// Only update the default value if loaded something
			if (result) {
					this.currentReport[name] = result;
					this.log.debug(`Loaded ${name} with ${result}`);
			}
		})
		
		// Reload last hour of rainfall
		let lastRainAccumulationMinute = this.storage.getItemSync('rainAccumulationMinute');
		if (typeof lastRainAccumulationMinute !== 'undefined') {
			this.log.debug("Restoring rain readings");
			this.rainAccumulationMinute = lastRainAccumulationMinute;
			for (var i = 0; i < 60; i++)
				this.rainAccumulation[i] = this.storage.getItemSync('rainAccumulation'+i);
		} else {
			this.log.debug("Reset rain readings");
			this.currentReport.Rain1h = 0.0;
		}
	}

	save(currentReport) {
		// Save each value of the current report
		this.reportCharacteristics.forEach((name) => {
			this.log.debug(`Persisting ${name}: ${currentReport[name]}`);
			this.storage.setItemSync(name, currentReport[name]);
		})
		
		// Store last hour rain fall
		let hourTTL = 1000 * 60 * 60; // Rainfall data is only valid for an hour.
		this.storage.setItemSync('rainAccumulationMinute', this.rainAccumulationMinute, {ttl: hourTTL});
		for (var i = 0; i < 60; i++)
			this.storage.setItemSync('rainAccumulation'+i, this.rainAccumulation[i], {ttl: hourTTL});
	}

	update(forecastDays, callback)
	{
		this.log.debug("Updating weather from Weatherflow Tempest");

		let weather = {};
		weather.forecasts = [];
		
		// Limit forecast updates to once every hour. Forecast won't change that quickly
		if (this.lastForecastUpdate && moment().hour() != this.lastForecastUpdate) {
			this.lastForecastUpdate = moment().hour();
			this.getForecastData((error, result) =>
								 {
				if (!error) {
					try {
						weather.forecasts = this.parseForecasts(result["current_conditions"]["time"], result["forecast"]["daily"], result["timezone"]);
					} catch (e) {
						this.log.error("Error parsing weather Forecast");
						this.log.error(result);
						this.log.error(e);
					}
				} else {
					this.log.error("Error retrieving weather Forecast");
					this.log.error(result);
				}
				
				let that = this;
				weather.report = that.currentReport;
				callback(null, weather);
				
				// Save the state after updating plugin state so we don't
				// delay the update
				this.save(that.currentReport);
			});
		}
		else {
			// Don't update the forecast, just update current conditions
			let that = this;
			weather.report = that.currentReport;
			callback(null, weather);
		}
	}

	// Map Tempest precipitation values to Eve Condition Categories
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

	getHourlyAccumulatedRain(observationTime, mmOfRainInLastMinute)
	{
		let that = this;
		
		// Have we moved on to the next minute
		let currentObservationMinute = moment.unix(observationTime).minute();
		if (that.rainAccumulationMinute == currentObservationMinute)
			that.rainAccumulation[currentObservationMinute] += mmOfRainInLastMinute;
		else {
			// Erase the minutes between last recorded minute and current minute
			for (var i = that.rainAccumulationMinute + 1; (i % 60) != currentObservationMinute; i++)
				that.rainAccumulation[i % 60] = 0;
			that.rainAccumulation[currentObservationMinute] = mmOfRainInLastMinute;
		}
		that.rainAccumulationMinute = currentObservationMinute;
	
		var accumulation = converter.getRainAccumulated(that.rainAccumulation)
	
		this.log.debug("getHourlyAccumulatedRain last minute: " + mmOfRainInLastMinute + " rainAccumulation: " + this.rainAccumulation + " last hour: " + accumulation);
		return accumulation;
	}

	// For AIR/SKY sensor units, assume to be the same as
	// the Tempest documentation.
	getBatteryPercent(batteryVoltage)
	{
		return this.getTempestBatteryPercent(batteryVoltage);
	}
	
	// Tempest battery ranges from 2.355 (low) to 2.8 (full)
	// https://help.weatherflow.com/hc/en-us/articles/360048877194-Solar-Power-Rechargeable-Battery
	// Assume "low" to be 5%, so "zero" battery level is approx. 2.11v
	getTempestBatteryPercent(batteryVoltage)
	{
		var percent = (batteryVoltage * 100.0 - 211.0)/0.69;
		return (percent > 100) ? 100 : (percent < 0.0) ? 0 : percent;
	}
	

	// API for UDP data: https://weatherflow.github.io/Tempest/api/udp.html
	parseMessage(message)
	{
		let that = this;
		
		if (message.type == 'device_status') {
			that.currentReport.ObservationStation = message.serial_number;
			that.currentReport.ObservationTime = moment.unix(message.timestamp).format('HH:mm:ss');
			
			// Handle sensor failures
			// Per API v171, only intepret values defined, ignore all others
			message.sensor_status = message.sensor_status & 0x1FFFF;

			// Any value other than zero for sensor_status means we have a failure
			that.currentReport.StatusFault = message.sensor_status == 0 ? false : true;
			if (message.sensor_status == 0) {
				this.currentReport.SensorString = "Ok";
				
				// Reset logging interval for only the unit that is ok
				// Unit prefixes: AR Air, SK Sky, ST Tempest
				if (message.serial_number.charAt(1) == 'R') {
					this.currentReport.AirSensorFailureLog = -1;
				} else {
					this.currentReport.SkySensorFailureLog = -1;
				}
			} else {
				this.currentReport.SensorString = "";
				if (message.sensor_status & 0x00000001) {
					this.currentReport.SensorString += "Lightning failed"
				}
				if (message.sensor_status & 0x00000002) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Lightning noise"
				}
				if (message.sensor_status & 0x00000004) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Lightning disturber"
				}
				if (message.sensor_status & 0x00000008) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Pressure failed"
				}
				if (message.sensor_status & 0x00000010) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Temperature failed"
				}
				if (message.sensor_status & 0x00000020) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Relative Humidity failed"
				}
				if (message.sensor_status & 0x00000040) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Wind failed"
				}
				if (message.sensor_status & 0x00000080) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Precipitation failed"
				}
				if (message.sensor_status & 0x00000100) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Light/UV failed"
				}
				if (message.sensor_status & 0x00008000) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Power booster depleted"
				}
				if (message.sensor_status & 0x00010000) {
					if (this.currentReport.SensorString.length > 0) this.currentReport.SensorString += ", ";
					this.currentReport.SensorString += "Power booster shore power"
				}
				this.log.debug("Sensor on unit %s failed error code: %d", message.serial_number, message.sensor_status);
				
				// Track error logging per failed device
				// Unit prefixes: AR Air, SK Sky, ST Tempest
				if (message.serial_number.charAt(1) == 'R') {
					if (this.currentReport.AirSensorFailureLog != moment.unix(message.timestamp).hour()) {
						this.log.error("Sensor on unit %s failed: ", message.serial_number, this.currentReport.SensorString);
					}
					this.currentReport.AirSensorFailureLog = moment.unix(message.timestamp).hour();
				} else {
					if (this.currentReport.SkySensorFailureLog != moment.unix(message.timestamp).hour()) {
						this.log.error("Sensor on unit %s failed: ", message.serial_number, this.currentReport.SensorString);
					}
					this.currentReport.SkySensorFailureLog = moment.unix(message.timestamp).hour();
				}
			}
		}
		
		if (message.type == 'evt_precip') {
			that.currentReport.ObservationStation = message.serial_number;
			that.currentReport.ObservationTime = moment.unix(message.evt[0]).format('HH:mm:ss');
			that.currentReport.ConditionCategory = this.getConditionCategory(1, this.conditionDetail); // It has started to rain
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
			that.currentReport.Temperature = message.obs[0][2];
			that.currentReport.Humidity = message.obs[0][3];
			
			// Only perform new calculations if temperature and humidity values are within a good range
			// We could get out of range values if the sensors have failed.
			if (that.currentReport.Humidity > 0 && that.currentReport.Humidity <= 100 &&
				that.currentReport.Temperature > -100 && that.currentReport.Temperature < 100) {
				that.currentReport.DewPoint = wformula.kelvinToCelcius(wformula.dewPointMagnusFormula(
					wformula.celciusToKelvin(that.currentReport.Temperature), 
					that.currentReport.Humidity));
				that.currentReport.TemperatureApparent = wformula.kelvinToCelcius(wformula.australianAapparentTemperature(
					wformula.celciusToKelvin(that.currentReport.Temperature),
					that.currentReport.Humidity,
					that.currentReport.WindSpeed));
				that.currentReport.TemperatureWetBulb =
					converter.getWetBulbTemperature(that.currentReport.Temperature, that.currentReport.Humidity);
			}
			that.currentReport.TemperatureMin = (that.currentReport.Temperature < that.currentReport.TemperatureMin) ?
					that.currentReport.Temperature : that.currentReport.TemperatureMin;
			that.currentReport.LightningStrikes = message.obs[0][4];
			that.currentReport.LightningAvgDistance = message.obs[0][5];
			
			// Report battery status.
			var previousLevel = that.currentReport.AirSensorBatteryLevel;
			that.currentReport.AirSensorBatteryLevel = this.getBatteryPercent(message.obs[0][6]);
			// If the AIR sensor has the lowest battery level, then report it as the Station battery level
			if (that.currentReport.AirSensorBatteryLevel < that.currentReport.SkySensorBatteryLevel) {
				that.currentReport.BatteryLevel = that.currentReport.AirSensorBatteryLevel;
				// It could have a solar panel on it, so check to see if it is going up (charging)
				that.currentReport.BatteryIsCharging = false;
				if (that.currentReport.BatteryLevel > previousLevel) {
					that.currentReport.BatteryIsCharging = true;
				}
			}
		}

		if (message.type == 'obs_sky') {
			that.currentReport.SkySerialNumber = message.serial_number;
			that.currentReport.ObservationStation = that.currentReport.SkySerialNumber;
			that.currentReport.SkyFirmware = message.firmware_revision;
			that.currentReport.ObservationTime = moment.unix(message.obs[0][0]).format('HH:mm:ss');
			that.currentReport.LightLevel = message.obs[0][1];
			that.currentReport.UVIndex = message.obs[0][2];
			that.currentReport.Rain1h = this.getHourlyAccumulatedRain(message.obs[0][0], message.obs[0][3]);
		
			// Use wind values reported by rapid_wind as they are instantanous,
			// whereas obs_sky are averaged values over last minute
			//that.currentReport.WindSpeed = message.obs[0][5];
			//that.currentReport.WindDirection = converter.getWindDirection(message.obs[0][7]);
			
			// Wind values are min/max over last minute
			that.currentReport.WindSpeedLull = message.obs[0][4];
			that.currentReport.WindSpeedMax = message.obs[0][6];
			
			// Report battery status.
			var previousLevel = that.currentReport.SkySensorBatteryLevel;
			that.currentReport.SkySensorBatteryLevel = this.getBatteryPercent(message.obs[0][8]);
			// If the SKY sensor has the lowest battery level, then report it as the Station battery level
			if (that.currentReport.SkySensorBatteryLevel < that.currentReport.AirSensorBatteryLevel) {
				that.currentReport.BatteryLevel = that.currentReport.SkySensorBatteryLevel;
				// It could have a solar panel on it, so check to see if it is going up (charging)
				that.currentReport.BatteryIsCharging = false;
				if (that.currentReport.BatteryLevel > previousLevel) {
					that.currentReport.BatteryIsCharging = true;
				}
			}
			
			that.currentReport.SolarRadiation = message.obs[0][10];
			// Note that Local Day Rain Accumulation (Field 11) is currently always null. Hence we have to approximate it with data available to us.
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
            that.currentReport.Temperature = message.obs[0][7];
            that.currentReport.Humidity = message.obs[0][8];
	
            // Only perform new calculations if temperature and humidity values are within a good range
            // We could get out of range values if the sensors have failed.
            if (that.currentReport.Humidity > 0 && that.currentReport.Humidity <= 100 &&
                    that.currentReport.Temperature > -100 && that.currentReport.Temperature < 100) {
                that.currentReport.DewPoint = wformula.kelvinToCelcius(wformula.dewPointMagnusFormula(
					wformula.celciusToKelvin(that.currentReport.Temperature), 
					that.currentReport.Humidity));

                that.currentReport.TemperatureApparent = wformula.kelvinToCelcius(wformula.australianAapparentTemperature(
					wformula.celciusToKelvin(that.currentReport.Temperature),
					that.currentReport.Humidity,
					message.obs[0][2]));
                that.currentReport.TemperatureWetBulb =
					converter.getWetBulbTemperature(that.currentReport.Temperature, that.currentReport.Humidity);
            }
            
            that.currentReport.LightLevel = message.obs[0][9];
            that.currentReport.UVIndex = message.obs[0][10];
            that.currentReport.SolarRadiation = message.obs[0][11];
            that.currentReport.Rain1h = this.getHourlyAccumulatedRain(message.obs[0][0], message.obs[0][12]);
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
	
	getForecastConditionCategory(icon, detail = false)
	{
		// Convert the icon names to condition category
		// See https://weatherflow.github.io/Tempest/api/swagger/#!/forecast/getBetterForecast
		
		if (icon.includes("thunderstorm") || icon.includes("windy"))
		{
			// Severe weather
			return detail ? 9 : 2;
		}
		else if (icon.includes("snow"))
		{
			// Snow
			return detail ? 8 : 3;
		}
		else if (icon.includes("sleet"))
		{
			// Hail
			return detail ? 7 : 3;
		}
		else if (icon.includes("rain"))
		{
			// Rain
			return detail ? 6 : 2;
		}
		else if (icon.includes("fog"))
		{
			// Fog
			return detail ? 4 : 1;
		}
		else if (icon.includes("partly-cloudy"))
		{
			// Few Clouds
			return detail ? 1 : 0;
		}
		else if (icon.includes("cloudy"))
		{
			// Overcast
			return detail ? 3 : 1;
		}
		else if (icon.includes("clear"))
		{
			// Clear
			return 0;
		}
		else
		{
			this.log.warn("Unknown Tempest Forecast icon " + icon);
			return 0;
		}
	};
	
	getForecastData(callback)
	{
		/*
		Weatherflow do provide an API to get forecasts
		https://weatherflow.github.io/Tempest/api/remote-developer-policy.html
		https://weatherflow.github.io/Tempest/api/swagger/#!/forecast/getBetterForecast
		 */
		this.log.debug("Getting weather forecast for station %s", this.locationId);

		// Response defaults to metric
		const queryUri = "https://swd.weatherflow.com/swd/rest/better_forecast?station_id=" + this.locationId + "&token=" + this.apiKey;
		request(encodeURI(queryUri), (requestError, response, body) =>
		{
			if (!requestError)
			{
				if (response.statusCode == 200) {
					let parseError;
					let weather
					try
					{
						weather = JSON.parse(body);
					} catch (e)
					{
						parseError = e;
					}
					callback(parseError, weather);
				} else {
					callback(true, body);
				}
			}
			else
			{
				callback(requestError);
			}
		});
	}
	
	
	parseForecasts(observation_time, values, timezone)
	{
		let forecasts = [];
		 
		for (let i = 0; i < values.length; i++) {
			// this.log(values[i]);
			let forecast = {};
			forecast.Condition = values[i].conditions;
			forecast.ConditionCategory = this.getForecastConditionCategory(values[i].icon, this.conditionDetail)
			forecast.ForecastDay =  moment.unix(values[i].day_start_local).tz(timezone).format('dddd');
			forecast.RainBool = values[i].precip_icon.includes('rain') || values[i].precip_icon.includes('sleet') || values[i].precip_icon.includes('storm');
			forecast.SnowBool = values[i].precip_icon.includes('snow');
			forecast.SunriseTime = moment.unix(values[i].sunrise).tz(timezone).format('HH:mm:ss');
			forecast.SunsetTime = moment.unix(values[i].sunset).tz(timezone).format('HH:mm:ss');
			forecast.TemperatureMax = values[i].air_temp_high;
			forecast.TemperatureMin = values[i].air_temp_low;
			forecast.RainChance = values[i].precip_probability;
			forecast.ObservationTime = moment.unix(observation_time).tz(timezone).format('HH:mm:ss');
			
			forecasts[i] = forecast;
		}
		return forecasts;
	}

}

module.exports = {
	TempestAPI: TempestAPI
};

