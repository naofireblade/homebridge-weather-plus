/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const mqtt = require('mqtt'),
	converter = require('../util/converter'),
	geoTz = require('geo-tz'),
	moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');


class MQTTAPI
{
	constructor(apiKey, log)
	{
		this.attribution = 'Powered by MQTT';
		this.reportCharacteristics = [
			'ObservationStation',
			'ObservationTime',
			'Condition',
			'ConditionCategory',
			'Humidity',
			'LightningBool',
			'Ozone',
			'RainBool',
			'SolarRadiation',
			'UVIndex',
			'WindDirection',
			'AirPressure',
			'DewPoint',
			'StormDist';
			'Rain1h',
			'RainDay'
			'TemperatureApparent',
			'Temperature',
			'WindSpeed',
			'WindSpeedMax',
		];

		this.log = log;

		//this.location = location;
		this.apiKey = apiKey;

		// Get observation values only in si 's' for now.
		this.units = 's';
	}

	update(forecastDays, callback)
	{
		debug("Updating weather with MQTT");
		let weather = {};
		let that = this;
		//format url as http://site:1833/ (using apikey for URL)
		const queryUri = this.apiKey;
		var client = mqtt.connect(encodeURI(queryUri))
		
		client.on('connect', function ()
		{
			client.subscribe('WeatherReport', function (err)
			{
				if (!err)
				{
					client.on('message', function (topic, message) 
					{
						// Current weather report
						try
						{
							const jsonObj = JSON.parse(message);
								if (jsonObj.errors === undefined || jsonObj.errors.length === 0)
								{
									debug(JSON.stringify(jsonObj, null, 2));
									weather.report = that.parseReport(jsonObj);
									callback(null, weather);
								}
								else
								{
									throw new Error(JSON.stringify(jsonObj.errors, null, 2));
								}
						} catch (e)
						{
							that.log.error("Error retrieving weather report and forecast");
							that.log.error("Error Message: " + e);
							callback(e);
						}
					})
				}
				else
				{
					that.log.error("Error retrieving weather report and forecast");
					that.log.error("Error Message: " + err);
					callback(err);
				}
					
			})
		client.end()
		})

	}	

	parseReport(json)
	{
		let that = this;
		let report = {};

		try
		{
			let observation = json.observations[0];
			let values;
			debug("Units: " + this.units);

			// Get values depending on chosen unit in request
			if (this.units === 's')
			{
				values = observation.metric_si;
			}
			else if (this.units === 'm')
			{
				values = observation.metric;
			}
			else if (this.units === 'e')
			{
				values = observation.imperial;
			}
			else
			{ // 'h'
				values = observation.uk_hybrid;
			}
			const timezone = String(geoTz(parseFloat(observation.lat), parseFloat(observation.lon)));
			report.ObservationStation = observation.stationID;
			report.ObservationTime = moment.unix(observation.epoch).tz(timezone).format('HH:mm:ss');      
			report.Condition = observation.condition;
			report.ConditionCategory = isNaN(observation.conditioncategory) ? 0 : observation.conditioncategory;
			report.Humidity = isNaN(observation.humidity) ? 0 : observation.humidity;
			report.LightningBool = observation.lightningbool;
			report.Ozone = isNaN(observation.ozone) ? 0 : observation.ozone;
			report.RainBool = observation.rainbool;
			report.SolarRadiation = isNaN(observation.solarRadiation) ? 0 : observation.solarRadiation;
			report.UVIndex = isNaN(observation.uv) ? 0 : observation.uv;
			report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
			report.AirPressure = isNaN(values.pressure) ? 0 : values.pressure;
			report.DewPoint = isNaN(values.dewpt) ? 0 : values.dewpt;
			report.StormDist = isNaN(values.stormdist) ? 0 : values.stormdist;
			report.Rain1h = isNaN(values.rain1h) ? 0 : values.rain1h;
			report.RainDay = isNaN(values.rainday) ? 0 : values.rainday;
			report.Temperature = isNaN(values.temp) ? 0 : values.temp;
			report.TemperatureApparent = isNaN(values.apptemp) ? 0 : values.apptemp;
			report.WindSpeed = isNaN(values.windSpeed) ? 0 : values.windSpeed;
			report.WindSpeedMax = isNaN(values.windGust) ? 0 : values.windGust;

		} catch (error)
		{
			that.log.error("Error parsing weather report for MQTT");
			that.log.error("Error Message: " + error);
		}
		return report;
	}

	parseForecasts(forecastObjs, timezone)
	{
		/* NO FORECAST DATA FROM API */
		return [];
	}
}

module.exports = {
	MQTTAPI: MQTTAPI
};
