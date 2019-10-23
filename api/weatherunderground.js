/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');

class WundergroundAPI
{
	constructor(apiKey, location, l)
	{
		this.attribution = 'Powered by Weather Underground';
		this.reportCharacteristics = [
			'ObservationStation',
			'ObservationTime',
			'WindDirection',
			'Humidity',
			'SolarRadiation',
			'UVIndex',
			'Temperature',
			'DewPoint',
			'AirPressure',
			'WindSpeed',
			'WindSpeedMax',
			'RainDay'
		];

		this.log = l;

		this.location = location;
		this.apiKey = apiKey;

		// Get observation values only in si 's' for now.
		this.units = 's';
	}

	update(callback)
	{
		debug("Updating weather with weather underground");
		let weather = {};
		let that = this;

		const queryUri = "https://api.weather.com/v2/pws/observations/current?apiKey=" + this.apiKey + "&stationId=" + this.location + "&format=json&units=" + this.units;
		request(encodeURI(queryUri), function (err, response, body)
		{
			if (!err)
			{
				// Current weather report
				try
				{
					const jsonObj = JSON.parse(body);
					debug(JSON.stringify(jsonObj, null, 2));

					weather.report = that.parseReport(jsonObj);
					callback(null, weather);
				} catch (e)
				{
					debug("Error retrieving weather report and forecast");
					debug("Error Message: " + e);
					callback(e);
				}
			}
			else
			{
				debug("Error retrieving weather report and forecast");
				debug("Error Message: " + err);
				callback(err);
			}
		}.bind(this));
	}

	parseReport(json)
	{

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

			debug("Station:" + observation.stationID + " : " + observation.neighborhood);
			report.ObservationStation = observation.stationID + " : " + observation.neighborhood;
			report.ObservationTime = moment(Date.parse(observation.obsTimeUtc));

			debug("WindDirection:" + observation.winddir);
			debug("Humidity:" + observation.humidity);
			report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
			report.Humidity = isNaN(parseInt(observation.humidity)) ? 0 : parseInt(observation.humidity);
			report.SolarRadiation = isNaN(parseInt(observation.solarRadiation)) ? 0 : parseInt(observation.solarRadiation);
			report.UVIndex = isNaN(parseInt(observation.uv)) ? 0 : parseInt(observation.uv);

			debug("Temperature:" + values.temp);
			report.Temperature = isNaN(parseInt(values.temp)) ? 0 : parseInt(values.temp);
			report.DewPoint = isNaN(parseInt(values.dewpt)) ? 0 : parseInt(values.dewpt);
			report.AirPressure = isNaN(parseInt(values.pressure)) ? 0 : parseInt(values.pressure);
			debug("AirPressure:" + report.AirPressure);
			report.WindSpeed = isNaN(parseInt(values.windSpeed)) ? 0 : parseInt(values.windSpeed);
			debug("WindSpeed:" + report.WindSpeed);
			report.WindSpeedMax = isNaN(parseInt(values.windGust)) ? 0 : parseInt(values.windGust);
			debug("WindSpeedMax:" + report.WindSpeedMax);
			report.RainDay = isNaN(values.precipTotal) ? 0 : values.precipTotal;
			debug("RainDay:" + report.RainDay);

		} catch (error)
		{
			debug("Error retrieving weather report for Weather Underground");
			debug("Error Message: " + error);
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
	WundergroundAPI: WundergroundAPI
};
