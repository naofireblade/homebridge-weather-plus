/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const request = require('request'),
	converter = require('../util/converter'),
	geoTz = require('geo-tz'),
	moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');


class WeewxAPI
{
	constructor(apiKey, location, log)
	{
		this.attribution = 'Powered by Weewx';
		this.reportCharacteristics = [
			'ObservationStation',
			'SolarRadiation',
			'RainBool',
			'ObservationTime',
			'UVIndex',
      		'WindDirection',
			'Humidity',
    		'Ozone',
    		'Temperature',
    		'TemperatureApparent',
			'DewPoint',
			'WindSpeed',
			'WindSpeedMax',
			'AirPressure',
			'Rain1h',
			'RainDay'
		];

		this.log = log;

		this.location = location;
		this.apiKey = apiKey;

		// Get observation values only in si 's' for now.
		this.units = 's';
	}

	update(forecastDays, callback)
	{
		debug("Updating weather with weewx");
		let weather = {};
		let that = this;
//formatting url as http://site/file.json (using apikey for sitename) location for file name
		//const queryUri = "http://" + this.apiKey + "/" + this.location + '.json';
		const queryUri = "http://weewx/homekit.json";
		request(encodeURI(queryUri), function (err, response, body)
		{
			if (!err)
			{
				// Current weather report
				try
				{
					const jsonObj = JSON.parse(body);
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
			}
			else
			{
				that.log.error("Error retrieving weather report and forecast");
				that.log.error("Error Message: " + err);
				callback(err);
			}
		}.bind(this));
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
			report.RainBool = observation.rainbool;
			report.ObservationTime = moment.unix(observation.epoch).tz(timezone).format('HH:mm:ss');      
			report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
			report.Humidity = isNaN(observation.humidity) ? 0 : observation.humidity;
			report.SolarRadiation = isNaN(observation.solarRadiation) ? 0 : observation.solarRadiation;
			report.UVIndex = isNaN(observation.uv) ? 0 : observation.uv;
			report.Ozone = isNaN(observation.ozone) ? 0 : observation.ozone;
			report.Temperature = isNaN(values.temp) ? 0 : values.temp;
			report.DewPoint = isNaN(values.dewpt) ? 0 : values.dewpt;
			report.AirPressure = isNaN(values.pressure) ? 0 : values.pressure;
			report.TemperatureApparent = isNaN(values.apptemp) ? 0 : values.apptemp;
      		report.WindSpeed = isNaN(values.windSpeed) ? 0 : values.windSpeed;
			report.WindSpeedMax = isNaN(values.windGust) ? 0 : values.windGust;
			report.Rain1h = isNaN(values.rain1h) ? 0 : values.rain1h;
			report.RainDay = isNaN(values.rainday) ? 0 : values.rainday;

		} catch (error)
		{
			that.log.error("Error parsing weather report for Weewx");
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
	WeewxAPI: WeewxAPI
};
