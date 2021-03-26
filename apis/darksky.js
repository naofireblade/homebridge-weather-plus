/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const DarkSky = require('dark-sky'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');

class DarkSkyAPI
{
	constructor(apiKey, language, locationGeo, conditionDetail, log)
	{
		this.attribution = 'Powered by Dark Sky';
		this.reportCharacteristics =
			[
				'AirPressure',
				'CloudCover',
				'Condition',
				'ConditionCategory',
				'DewPoint',
				'Humidity',
				'ObservationTime',
				'Ozone',
				'Rain1h',
				'RainBool',
				'RainDay',
				'SnowBool',
				'Temperature',
				'TemperatureApparent',
				'UVIndex',
				'Visibility',
				'WindDirection',
				'WindSpeed',
				'WindSpeedMax'
			];
		this.forecastCharacteristics =
			[
				'AirPressure',
				'CloudCover',
				'Condition',
				'ConditionCategory',
				'DewPoint',
				'ForecastDay',
				'Humidity',
				'Ozone',
				'RainBool',
				'RainChance',
				'RainDay',
				'SnowBool',
				'SunriseTime',
				'SunsetTime',
				'TemperatureApparent',
				'TemperatureMax',
				'TemperatureMin',
				'UVIndex',
				'Visibility',
				'WindDirection',
				'WindSpeed',
				'WindSpeedMax'
			];
		this.forecastDays = 8;
		this.cache = {
			report: {},
			forecast: {
				day0: {},
				day1: {},
				day2: {},
				day3: {},
				day4: {},
				day5: {},
				day6: {},
				day7: {}
			}
		};
		this.darksky = new DarkSky(apiKey);
		this.darksky.options({
			latitude: locationGeo[0],
			longitude: locationGeo[1],
			language: language,
			units: 'si',
			exclude: ['minutely', 'hourly', 'alerts', 'flags']
		});
		this.conditionDetail = conditionDetail;
		this.log = log;
		moment.locale(language);

		this.darkskyTimeMachine = new DarkSky(apiKey);
		this.darkskyTimeMachine.options({
			latitude: locationGeo[0],
			longitude: locationGeo[1],
			language: language,
			units: 'si',
			exclude: ['currently', 'minutely', 'daily', 'alerts', 'flags']
		});
	}

	update(forecastDays, callback)
	{
		let weather = {};
		weather.forecasts = [];
		let that = this;

		this.updateCache(this.darkskyTimeMachine, forecastDays, function ()
		{
			debug("Updating weather with dark sky");
			that.darksky.get()
			.then(function (response)
			{
				// Current weather report
				response.currently.rainDay = that.cache.report.rainDay; // Load rainDay from cache
				weather.report = that.parseReport(response.currently, response.timezone);

				// Forecasts for today and next 7 days
				for (let i = 0; i <= 7; i++)
				{
					response.daily.data[i].rainDay = that.cache.forecast['day' + i].rainDay; // Load rainDay from cache
					weather.forecasts.push(that.parseForecast(response.daily.data[i], response.timezone));
				}

				callback(null, weather);
			})
			.catch(function (error)
			{
				that.log.error("Error retrieving weather report and forecast for DarkSky");
				that.log.error("Error Message: " + error);
				callback(error);
			});
		});
	}

	parseReport(values, timezone)
	{
		let report = {};

		report.AirPressure = parseInt(values.pressure);
		report.CloudCover = parseInt(values.cloudCover * 100);
		report.Condition = values.summary;
		report.ConditionCategory = this.getConditionCategory(values.icon, this.conditionDetail);
		report.DewPoint = parseInt(values.dewPoint);
		report.Humidity = parseInt(values.humidity * 100);
		report.ObservationTime = moment.unix(values.time).tz(timezone).format('HH:mm:ss');
		report.Ozone = parseInt(values.ozone);
		report.Rain1h = isNaN(parseFloat(values.precipIntensity)) ? 0 : parseFloat(values.precipIntensity);
		let detailedCondition = this.getConditionCategory(values.icon, true);
		report.RainBool = [5,6].includes(detailedCondition);
		report.RainDay = values.rainDay;
		report.SnowBool = [7,8].includes(detailedCondition);
		report.Temperature = values.temperature;
		report.TemperatureApparent = parseInt(values.apparentTemperature);
		report.UVIndex = isNaN(parseInt(values.uvIndex)) ? 0 : parseInt(values.uvIndex);
		report.Visibility = isNaN(parseInt(values.visibility)) ? 0 : parseInt(values.visibility);
		report.WindDirection = converter.getWindDirection(values.windBearing);
		report.WindSpeed = parseFloat(values.windSpeed);
		report.WindSpeedMax = parseFloat(values.windGust);

		return report;
	}

	parseForecast(values, timezone)
	{
		let forecast = {};

		forecast.AirPressure = parseInt(values.pressure);
		forecast.CloudCover = parseInt(values.cloudCover * 100);
		forecast.Condition = values.summary;
		forecast.ConditionCategory = this.getConditionCategory(values.icon, this.conditionDetail);
		forecast.DewPoint = parseInt(values.dewPoint);
		forecast.ForecastDay = moment.unix(values.time).tz(timezone).format('dddd');
		forecast.Humidity = parseInt(values.humidity * 100);
		forecast.Ozone = parseInt(values.ozone);
		let detailedCondition = this.getConditionCategory(values.icon, true);
		forecast.RainBool = [5,6].includes(detailedCondition);
		forecast.RainChance = parseInt(values.precipProbability * 100);
		forecast.RainDay = values.rainDay;
		forecast.SnowBool = [7,8].includes(detailedCondition);
		forecast.SunriseTime = moment.unix(values.sunriseTime).tz(timezone).format('HH:mm:ss');
		forecast.SunsetTime = moment.unix(values.sunsetTime).tz(timezone).format('HH:mm:ss');
		forecast.TemperatureApparent = parseInt(values.apparentTemperatureHigh);
		forecast.TemperatureMax = parseInt(values.temperatureHigh);
		forecast.TemperatureMin = parseInt(values.temperatureLow);
		forecast.UVIndex = isNaN(parseInt(values.uvIndex)) ? 0 : parseInt(values.uvIndex);
		forecast.Visibility = isNaN(parseInt(values.visibility)) ? 0 : parseInt(values.visibility);
		forecast.WindDirection = converter.getWindDirection(values.windBearing);
		forecast.WindSpeed = parseFloat(values.windSpeed);
		forecast.WindSpeedMax = parseFloat(values.windGust);

		return forecast;
	}

	updateCache(api, forecastDays, callback)
	{
		if (typeof this.cache.lastUpdate === 'undefined' || new Date() - this.cache.lastUpdate > 3600000)
		{
			debug("Called hourly update of rain data");
			this.cache.lastUpdate = new Date();

			let now = moment();
			let callbacks = forecastDays.length + 1;

			this.doTimeMachineRequest(api, now, function (result)
			{
				this.cache.report.rainDay = result;
				callbacks--;
				if (callbacks === 0)
				{
					callback();
				}
			}.bind(this), true);

			for (let i = 0; i < forecastDays.length; i++)
			{
				this.doTimeMachineRequest(api, now.clone().add(forecastDays[i], 'd'), function (result)
				{
					this.cache.forecast['day' + forecastDays[i]].rainDay = result;
					callbacks--;
					if (callbacks === 0)
					{
						callback();
					}
				}.bind(this));
			}
		}
		else
		{
			callback();
		}
	}

	doTimeMachineRequest(api, now, callback, limit = false)
	{
		api.time(now.valueOf())
		.get()
		.then(function (response)
		{

			// Current hour in time zone of weather location
			let hour = 24;
			if (limit)
			{
				hour = now.tz(response.timezone).format('H');
			}

			// Sum all values for the requested day
			let result = converter.getRainAccumulated(response.hourly.data.slice(0, hour), 'precipIntensity');
			debug("Accumulated rain for " + now.tz(response.timezone).format('dddd') + (limit ? (' until ' + hour + ':00') : '') + ": " + Math.round(result * 100) / 100);
			callback(result);
		}.bind(this))
		.catch(function (error)
		{
			this.log.error("Error retrieving rain report");
			this.log.error("Error Message: " + error);
			callback(null);
		}.bind(this));
	}

	getConditionCategory(name, detail = false)
	{
		if (["tornado", "wind"].includes(name))
		{
			// Severe weather
			return detail ? 9 : 2;
		}
		else if (["snow", "sleet", "flurries", "chancesleet", "chancesnow", "chanceflurries"].includes(name))
		{
			// Snow
			return detail ? 8 : 3;
		}
		else if (["hail"].includes(name))
		{
			// Hail
			return detail ? 7 : 3;
		}
		else if (["tstorms", "thunderstorm", "rain"].includes(name))
		{
			// Rain
			return detail ? 6 : 2;
		}
		else if (["chancerain", "chancetstorms"].includes(name))
		{
			// Drizzle
			return detail ? 5 : 2;
		}
		else if (["fog", "hazy"].includes(name))
		{
			// Fog
			return detail ? 4 : 1;
		}
		else if (["cloudy"].includes(name))
		{
			// Overcast
			return detail ? 3 : 1;
		}
		else if (["mostlycloudy", "partlysunny", "partly-cloudy-day", "partly-cloudy-night", "partlycloudy"].includes(name))
		{
			// Broken Clouds
			return detail ? 2 : 1;
		}
		else if (["mostlysunny"].includes(name))
		{
			// Few Clouds
			return detail ? 1 : 0;
		}
		else if (["sunny", "clear", "clear-day", "clear-night"].includes(name))
		{
			// Clear
			return 0;
		}
		else
		{
			this.log.warn("Unknown Dark Sky weather category " + name);
			return 0;
		}
	};
}

module.exports = {
	DarkSkyAPI: DarkSkyAPI
};