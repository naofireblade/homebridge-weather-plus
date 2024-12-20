/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const axios = require('axios'),
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

		const queryUri = "https://api.weather.com/v2/pws/observations/current?apiKey=" + this.apiKey + "&stationId=" + this.location + "&format=json&units=s" + '&numericPrecision=decimal';

		axios.get(encodeURI(queryUri))
		  .then(response => {
			if (response.data) {
				try 
				{
					const jsonObj = response.data;
					if (jsonObj.errors === undefined || jsonObj.errors.length === 0)
					{
						this.log.debug(JSON.stringify(jsonObj, null, 2));
						weather.report = this.parseReport(jsonObj);
						callback(null, weather);
					}
					else
					{
						throw new Error(JSON.stringify(jsonObj.errors, null, 2));
					}
				} catch (e)
				{
					this.log.error("Error retrieving weather report and forecast");
					this.log.error("Response Object: " + response.data);
					this.log.error("Error Message: " + e);
					callback(e);
				}
			}
			else
			{
				const error = new Error("Empty response body");
				this.log.error(error.message);
			  	callback(error);
			}
		  })
		  .catch(err => {
				this.log.error("Weather Underground Request failed");
				this.log.error("Error Message: " + err.message);
				if (err.response) {
					this.log.error(`Response status: ${err.response.status} statusText: ${err.response.statusText}`);
					if (err.response.status === 204) {
						this.log.error("Check to make sure your PWS is not offline. https://www.wunderground.com/member/devices");
			  		}
				}
			callback(err);
		  });
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
			report.Humidity = isNaN(parseInt(observation.humidity)) ? 0 : observation.humidity;
			report.SolarRadiation = isNaN(parseInt(observation.solarRadiation)) ? 0 : observation.solarRadiation;
			report.UVIndex = isNaN(parseInt(observation.uv)) ? 0 : observation.uv;
			report.Temperature = isNaN(parseInt(values.temp)) ? 0 : values.temp;
			report.DewPoint = isNaN(parseInt(values.dewpt)) ? 0 : values.dewpt;
			report.AirPressure = isNaN(parseInt(values.pressure)) ? 0 : values.pressure;
			report.WindSpeed = isNaN(parseInt(values.windSpeed)) ? 0 : values.windSpeed;
			report.WindSpeedMax = isNaN(parseInt(values.windGust)) ? 0 : values.windGust;
			report.RainDay = isNaN(parseInt(values.precipTotal)) ? 0 : values.precipTotal;
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
