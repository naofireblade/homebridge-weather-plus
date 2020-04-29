/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const Openweathermap = require('openweather-apis'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	geoTz = require('geo-tz'),
	debug = require('debug')('homebridge-weather-plus');

class OpenWeatherMapAPI
{
	constructor(apiKey, language, location, locationGeo, locationCity, conditionDetail, log)
	{
		Openweathermap.setLang(language);
		if (location)
		{
			Openweathermap.setCityId(location);
		}
		if (locationGeo)
		{
			Openweathermap.setCoordinate(locationGeo[0], locationGeo[1]);
		}
		if (locationCity)
		{
			Openweathermap.setCity(locationCity);
		}
		// HomeKit expects Celsius
		Openweathermap.setUnits('metric');
		Openweathermap.setAPPID(apiKey);
		this.attribution = 'Powered by OpenWeatherMap';
		this.reportCharacteristics = [
			'AirPressure',
			'Condition',
			'ConditionCategory',
			'Humidity',
			'ObservationTime',
			'RainBool',
			'SnowBool',
			'Temperature',
			'WindDirection',
			'WindSpeed'
		];
		this.forecastCharacteristics = [
			'AirPressure',
			'CloudCover',
			'Condition',
			'ConditionCategory',
			'ForecastDay',
			'Humidity',
			'RainBool',
			'SnowBool',
			'TemperatureMax',
			'TemperatureMin',
			'WindDirection',
			'WindSpeed'
		];
		this.forecastDays = 5;
		this.conditionDetail = conditionDetail;
		this.log = log;
	}

	update(forecastDays, callback)
	{
		debug("Updating weather with OpenWeatherMap");

		let weather = {};
		Openweathermap.getAllWeather(function (err, jsonObj)
		{
			if (!err && jsonObj.coord)
			{
				// Current weather report
				this.parseReport(weather, jsonObj, callback);
			}
			else
			{
				this.log.error("Error retrieving weather report");
				this.log.error("Error Message: " + (err ? err : JSON.stringify(jsonObj)));
				callback(err ? err : true);
			}
		}.bind(this));

		Openweathermap.getWeatherForecast(function (err, jsonObj)
		{
			if (!err && jsonObj.city)
			{
				this.parseForecasts(weather, jsonObj, callback);
			}
			else
			{
				this.log.error("Error retrieving weather forecast for OpenWeatherMap");
				this.log.error("Error Message: " + (err ? err : JSON.stringify(jsonObj)));
				callback(err ? err : true);
			}
		}.bind(this));
	}

	parseReport(weather, values, callback)
	{
		let report = weather.report || {};
		const timezone = String(geoTz(values.coord.lat, values.coord.lon));

		report.AirPressure = parseInt(values.main.pressure);
		report.CloudCover = parseInt(values.clouds.all);
		report.Condition = values.weather[0].description;
		report.ConditionCategory = this.getConditionCategory(values.weather[0].id, this.conditionDetail);
		report.Humidity = parseInt(values.main.humidity);
		report.ObservationTime = moment.unix(values.dt).tz(timezone).format('HH:mm:ss');
		let detailedCondition = this.getConditionCategory(values.weather[0].id, true);
		report.RainBool = [5,6].includes(detailedCondition);
		report.SnowBool = [7,8].includes(detailedCondition);
		report.Temperature = values.main.temp;
		report.WindDirection = converter.getWindDirection(values.wind.deg);
		report.WindSpeed = values.wind.speed;

		weather.report = report;
		if (weather.forecasts)
		{
			callback(null, weather);
		}
	}

	parseForecasts(weather, values, callback)
	{
		const timezone = String(geoTz(values.city.coord.lat, values.city.coord.lon));

		let forecasts = [];
		// We get a forecast for 5 days with values each 3 hours.
		const itemsFiltered = this.prepareForecasts(values.list, timezone);
		for (let i = 0; i < itemsFiltered.length; i++)
		{
			forecasts[forecasts.length] = this.parseForecast(itemsFiltered[i], timezone);
		}

		weather.forecasts = forecasts;
		if (weather.report)
		{
			callback(null, weather);
		}
	}

	parseForecast(values, timezone)
	{
		let forecast = {};

		// TODO implement rainbool and snowbool
		forecast.AirPressure = parseInt(values.main.pressure);
		forecast.CloudCover = parseInt(values.clouds.all);
		forecast.Condition = values.weather[0].description;
		forecast.ConditionCategory = this.getConditionCategory(values.weather[0].id, this.conditionDetail);
		forecast.ForecastDay = moment.unix(values.dt).tz(timezone).format('dddd');
		forecast.Humidity = parseInt(values.main.humidity);
		let detailedCondition = this.getConditionCategory(values.weather[0].id, true);
		forecast.RainBool = [5,6].includes(detailedCondition);
		forecast.SnowBool = [7,8].includes(detailedCondition);
		forecast.TemperatureMax = values.main.temp_max;
		forecast.TemperatureMin = values.main.temp_min;
		forecast.WindDirection = converter.getWindDirection(values.wind.deg);
		forecast.WindSpeed = values.wind.speed;

		return forecast;
	}

	/**
	 * OpenWeatherMap gives free users a 5-day forecast BUT with one value each 3 hours....
	 * This method searches the value at around noon so only one value for one day is returned.
	 * The first value in the returned array is the forecase for today.
	 * Actually this method should somehow e.g. average humidity, find mix/max, ... for all values for
	 * one day to give an accurate result.
	 *
	 * @param forecasts
	 * @param timezone
	 * @return {Array}
	 */
	prepareForecasts(forecasts, timezone)
	{
		let forecastsFiltered = [];
		const endOfToday = moment.tz(timezone).endOf("day").unix();
		// Find one for today
		for (let i = 0; i < forecasts.length; i++)
		{
			const listItem = forecasts[i];
			if (listItem.dt <= endOfToday)
			{
				const hourOfDay = moment.unix(listItem.dt).tz(timezone).format("H");
				if (parseInt(hourOfDay) >= 10 && parseInt(hourOfDay) <= 13)
				{
					forecastsFiltered[forecastsFiltered.length] = forecasts[i];
				}
			}
		}
		// The request was made after noon, take first for today
		if (forecastsFiltered.length === 0)
		{
			forecastsFiltered[forecastsFiltered.length] = forecasts[0];
		}

		// For all following days find exactly one value (best: noon)
		for (let i = 0; i < forecasts.length; i++)
		{
			const listItem = forecasts[i];
			if (listItem.dt > endOfToday)
			{
				const hourOfDay = moment.unix(listItem.dt).tz(timezone).format("H");
				if (parseInt(hourOfDay) >= 10 && parseInt(hourOfDay) <= 13)
				{
					forecastsFiltered[forecastsFiltered.length] = forecasts[i];
				}
			}
		}
		return forecastsFiltered;
	}

	getConditionCategory(code, detail = false)
	{
		// See https://openweathermap.org/weather-conditions
		if ([212, 221, 232, 504, 531, 711, 762, 771, 781].includes(code))
		{
			// Severe weather
			return detail ? 9 : 2;
		}
		else if (code >= 600 && code < 700)
		{
			// Snow
			return detail ? 8 : 3;
		}
		else if (code === 511)
		{
			// Hail
			return detail ? 7 : 3;
		}
		else if (code >= 500 && code < 600)
		{
			// Rain
			return detail ? 6 : 2;
		}
		else if (code >= 300 && code < 400)
		{
			// Drizzle
			return detail ? 5 : 2;
		}
		else if (code >= 700 && code < 800)
		{
			// Fog
			return detail ? 4 : 1;
		}
		else if (code === 804)
		{
			// Overcast
			return detail ? 3 : 1;
		}
		else if ([803, 802].includes(code))
		{
			// Broken Clouds
			return detail ? 2 : 1;
		}
		else if (code === 801)
		{
			// Few Clouds
			return detail ? 1 : 0;
		}
		else if (code === 800)
		{
			// Clear
			return 0;
		}
		else
		{
			this.log.warn("Unknown OpenWeatherMap category " + code);
			return 0;
		}
	};
}

module.exports = {
	OpenWeatherMapAPI: OpenWeatherMapAPI
};