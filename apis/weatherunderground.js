/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
	converter = require('../util/converter'),
	moment = require('moment-timezone');

class WundergroundAPI
{
	constructor(apiKey, location, log)
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
			'RainDay',
			'RainBool'
		];

		this.log = log;

		this.location = location;
		this.apiKey = apiKey;
	}

	update(forecastDays, callback)
	{
		this.log.debug("Updating weather with weather underground");
		let weather = {};
		let that = this;

		const queryUri = "https://api.weather.com/v2/pws/observations/current?apiKey=" + this.apiKey + "&stationId=" + this.location + "&format=json&units=s" + '&numericPrecision=decimal';
		request(encodeURI(queryUri), function (err, response, body)
		{
			if (!err && body.length > 0)
			{
				// Current weather report
				try
				{
					const jsonObj = JSON.parse(body);
					if (jsonObj.errors === undefined || jsonObj.errors.length === 0)
					{
						this.log.debug(JSON.stringify(jsonObj, null, 2));
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
					that.log.error("Response Object: " + body);
					that.log.error("Error Message: " + e);
					callback(e);
				}
			}
			else
			{
				that.log.error("Weather Underground Request failed");
				that.log.error("Error Message: " + err);
				if (typeof response !== 'undefined') {
					that.log.error("Response statusCode: " + response.statusCode + " statusMessage: " + response.statusMessage);
					if (response.statusCode == 204) {
						that.log.error("Check to make sure your PWS is not offline. https://www.wunderground.com/member/devices")
					}
				}
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
			let values = observation.metric_si;

			report.ObservationStation = observation.stationID + " : " + observation.neighborhood;
			report.ObservationTime = moment(Date.parse(observation.obsTimeUtc)).format('HH:mm:ss');
			report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
			report.Humidity = isNaN(observation.humidity) ? 0 : observation.humidity;
			report.SolarRadiation = isNaN(observation.solarRadiation) ? 0 : observation.solarRadiation;
			report.UVIndex = isNaN(observation.uv) ? 0 : observation.uv;
			report.Temperature = isNaN(values.temp) ? 0 : values.temp;
			report.DewPoint = isNaN(values.dewpt) ? 0 : values.dewpt;
			report.AirPressure = isNaN(values.pressure) ? 0 : values.pressure;
			report.WindSpeed = isNaN(values.windSpeed) ? 0 : values.windSpeed;
			report.WindSpeedMax = isNaN(values.windGust) ? 0 : values.windGust;
			report.RainDay = isNaN(values.precipTotal) ? 0 : values.precipTotal;
			report.RainBool = isNaN(values.precipRate) ? false : (values.precipRate > 0 ? true : false);

		} catch (error)
		{
			that.log.error("Error parsing weather report for Weather Underground");
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
	WundergroundAPI: WundergroundAPI
};
