/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const request = require('request'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	geoTz = require('geo-tz');


class YahooAPI
{
	constructor(location, l)
	{
		this.attribution = 'Powered by Yahoo';
		this.reportCharacteristics = [
			'AirPressure',
			'Condition',
			'ConditionCategory',
			'ForecastDay',
			'Humidity',
			'Temperature',
			'TemperatureMin',
			'Visibility',
			'WindDirection',
			'WindSpeed'
		];
		this.forecastCharacteristics = [
			'Condition',
			'ConditionCategory',
			'ForecastDay',
			'Temperature',
			'TemperatureMin'
		];
		this.forecastDays = 10;

		this.location = location;
		this.log = l;
	}

	update(forecastDays, callback)
	{
		this.log.debug("Updating weather with Yahoo");

		const queryUri = `https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where u='c' AND woeid in (select woeid from geo.places(1) where text="${this.location}")&format=json`;
		request(encodeURI(queryUri), function (err, response, body)
		{
			if (!err)
			{
				// Current weather report
				const jsonObj = JSON.parse(body);
				this.parseReport(jsonObj.query.results.channel, callback);
			}
			else
			{
				this.log.error("Error retrieving weather report and forecast");
				this.log.error("Error Message: " + err);
				callback(err);
			}
		}.bind(this));
	}

	parseReport(values, callback)
	{
		let report = {};
		const timezone = String(geoTz(parseFloat(values.item.lat), parseFloat(values.item.long)));
		this.log.debug("Using Timezone: " + timezone);

		report.AirPressure = parseInt(values.atmosphere.pressure);
		report.Condition = values.item.condition.text;
		report.ConditionCategory = this.getConditionCategory(parseInt(values.item.condition.code));
		report.ForecastDay = moment(values.item.forecast[0].date, "DD MMM YYYY").tz(timezone).format("dddd");
		report.Humidity = parseInt(values.atmosphere.humidity);
		report.ObservationTime = moment(values.item.pubDate.substr(17), "hh:mm A [CEST]").tz(timezone).format('HH:mm:ss');
		report.Temperature = parseInt(values.item.condition.temp);
		report.TemperatureMin = parseInt(values.item.forecast[0].low);
		report.Visibility = parseFloat(values.atmosphere.visibility);
		report.WindDirection = converter.getWindDirection(parseInt(values.wind.direction));
		report.WindSpeed = parseFloat(values.wind.speed);

		const weather = {};
		weather.report = report;
		weather.forecasts = this.parseForecasts(values.item.forecast, timezone);
		callback(null, weather);
	}

	parseForecasts(forecastObjs, timezone)
	{
		let forecasts = [];
		for (let i = 0; i < forecastObjs.length; i++)
		{
			const values = forecastObjs[i];
			const forecast = {};
			forecast.Condition = values.text;
			forecast.ConditionCategory = this.getConditionCategory(parseInt(values.code));
			forecast.ForecastDay = moment(values.date, "DD MMM YYYY").tz(timezone).format("dddd");
			forecast.Temperature = values.high;
			forecast.TemperatureMin = values.low;
			forecasts[forecasts.length] = forecast;
		}
		return forecasts;
	}

	getConditionCategory(code)
	{
		// See https://developer.yahoo.com/weather/documentation.html#codes
		switch (code)
		{
			case 5:
			case 6:
			case 7:
			case 8:
			case 10:
			case 13:
			case 14:
			case 15:
			case 16:
			case 17:
			case 18:
			case 35:
			case 41:
			case 42:
			case 43:
			case 46:
				return 3; // snow
			case 0:
			case 1:
			case 2:
			case 3:
			case 9:
			case 11:
			case 12:
			case 37:
			case 38:
			case 39:
			case 40:
			case 45:
			case 47:
				return 2; // rain
			case 19:
			case 20:
			case 21:
			case 22:
			case 23:
			case 24:
			case 26:
			case 27:
			case 28:
			case 29:
			case 30:
				return 1; // cloudy
			case 25:
			case 31:
			case 32:
			case 33:
			case 34:
			case 36:
			case 44:
			case 3200:
				return 0;
			default:
				return 0; // clear
		}
	};
}

module.exports = {
	YahooAPI: YahooAPI
};