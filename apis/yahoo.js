/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const request = require('request'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	geoTz = require('geo-tz'),
    debug = require('debug')('homebridge-weather-plus');


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
		debug("Updating weather with Yahoo");

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
		const timezone = geoTz(parseFloat(values.item.lat), parseFloat(values.item.long));
		debug("Using Timezone: " + timezone);

		report.AirPressure = parseInt(values.atmosphere.pressure);
		report.Condition = values.item.condition.text;
		report.ConditionCategory = converter.getConditionCategoryYahoo(parseInt(values.item.condition.code));
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
			forecast.ConditionCategory = converter.getConditionCategoryOwm(parseInt(values.code));
			forecast.ForecastDay = moment(values.date, "DD MMM YYYY").tz(timezone).format("dddd");
			forecast.Temperature = values.high;
			forecast.TemperatureMin = values.low;
			forecasts[forecasts.length] = forecast;
		}
		return forecasts;
	}
}

module.exports = {
	YahooAPI: YahooAPI
};