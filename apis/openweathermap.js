/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const converter = require('../util/converter'),
	moment = require('moment-timezone'),
	geoTz = require('geo-tz'),
	request = require('request'),
	debug = require('debug')('homebridge-weather-plus');

class OpenWeatherMapAPI
{
	constructor(apiKey, language, locationId, locationGeo, locationCity, conditionDetail, log)
	{
		this.log = log;
		this.apiKey = apiKey;

		this.locationId = locationId;
		this.locationCity = locationCity;
		this.locationGeo = locationGeo;

		this.attribution = 'Powered by OpenWeatherMap';
		this.reportCharacteristics = [
			'AirPressure',
			'CloudCover',
			'Condition',
			'ConditionCategory',
			'DewPoint',
			'Humidity',
			'ObservationTime',
			'Rain1h',
			'RainBool',
			'SnowBool',
			'Temperature',
			'TemperatureWindChill',
			'UVIndex',
			'WindDirection',
			'WindSpeed'
		];
		this.forecastCharacteristics = [
			'AirPressure',
			'CloudCover',
			'Condition',
			'ConditionCategory',
			'DewPoint',
			'ForecastDay',
			'Humidity',
			'RainBool',
			'RainDay',
			'SnowBool',
			'TemperatureMax',
			'TemperatureMin',
			'TemperatureWindChill',
			'UVIndex',
			'WindDirection',
			'WindSpeed'
		];
		this.forecastDays = 8;
		this.conditionDetail = conditionDetail;
	}

	update(forecastDays, callback)
	{
		debug("Updating weather with OpenWeatherMap");
		let that = this;

		if (!this.locationGeo)
		{
			this.getLocationGeo((error, coordinates) =>
			{
				if (!error)
				{
					that.locationGeo = [coordinates.lat, coordinates.lon];
					debug("Found locationGeo: %s", that.locationGeo);
					that.update(forecastDays, callback);
				}
				else
				{
					that.log.error("Error getting locationGeo from %s", this.locationId ? this.locationId : this.locationCity);
					that.log.error(error);
				}
			});
		}
		else
		{
			debug("Update weather");
			let weather = {};

			this.getWeatherData((error, result) =>
			{
				if (!error)
				{
					this.parseReport(weather, result["current"], result["timezone"], callback);
					this.parseForecasts(weather, result["daily"], result["timezone"], callback);
				}
				else
				{
					that.log.error("Error retrieving weather report");
					that.log.error(error);
					callback();
				}
			});
		}
	}

	parseReport(weather, values, timezone, callback)
	{
		weather.report = {};
		this.parseWeather(weather.report, values);
		weather.report.ObservationTime = moment.unix(values.dt).tz(timezone).format('HH:mm:ss');
		weather.report.Rain1h = isNaN(parseInt(values.rain)) ? 0 : parseInt(values.rain);

		if (weather.forecasts)
		{
			callback(null, weather);
		}
	}

	parseForecasts(weather, values, timezone, callback)
	{
		let forecasts = [];
		for (let i = 0; i < values.length; i++)
		{
			forecasts[forecasts.length] = this.parseForecast(values[i], timezone);
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
		this.parseWeather(forecast, values);
		forecast.ForecastDay = moment.unix(values.dt).tz(timezone).format('dddd');
		forecast.RainDay = isNaN(parseInt(values.rain)) ? 0 : parseInt(values.rain);
		forecast.TemperatureMax = values.temp.max;
		forecast.TemperatureMin = values.temp.min;

		return forecast;
	}

	parseWeather(report, values)
	{
		report.AirPressure = parseInt(values.pressure);
		report.CloudCover = parseInt(values.clouds);
		report.Condition = values.weather[0].description;
		report.ConditionCategory = this.getConditionCategory(values.weather[0].id, this.conditionDetail);
		report.DewPoint = parseInt(values.dew_point);
		report.Humidity = parseInt(values.humidity);
		let detailedCondition = this.getConditionCategory(values.weather[0].id, true);
		report.RainBool = [5,6].includes(detailedCondition);
		report.SnowBool = [7,8].includes(detailedCondition);
		debug(values.temp);
		debug(typeof values.temp === 'object');
		report.Temperature = typeof values.temp === 'object' ? parseInt(values.temp.day) : parseInt(values.temp);
		report.TemperatureWindChill = typeof values.feels_like === 'object' ? parseInt(values.feels_like.day) : parseInt(values.feels_like);
		report.UVIndex = parseInt(values.uvi);
		report.WindDirection = converter.getWindDirection(values.wind_deg);
		report.WindSpeed = values.wind_speed;
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

	getWeatherData(callback)
	{
		debug("Getting weather data for location %s", this.locationGeo);

		const queryUri = "https://api.openweathermap.org/data/2.5/onecall?units=metric&lat=" + this.locationGeo[0] + "&lon=" + this.locationGeo[1] + "&appid=" + this.apiKey;
		request(encodeURI(queryUri),  (requestError, response, body) =>
		{
			if (!requestError)
			{
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
			}
			else
			{
				callback(requestError);
			}
		});
	}

	getLocationGeo(callback)
	{
		debug("Getting locationGeo from %s", this.locationId ? this.locationId : this.locationCity);

		let locationQuery = this.locationId
			? "id=" + this.locationId
			: "q=" + this.locationCity.toLowerCase();

		const queryUri = "https://api.openweathermap.org/data/2.5/weather?" + locationQuery + "&appid=" + this.apiKey;
		request(encodeURI(queryUri),  (requestError, response, body) =>
		{
			if (!requestError)
			{
				// Get locationGeo from weather report
				let coordinates;
				let parseError;
				try
				{
					coordinates = JSON.parse(body)["coord"];
					if (coordinates === undefined)
					{
						parseError = body;
					}
				} catch (e)
				{
					parseError = e;
				}
				callback(parseError, coordinates);
			}
			else
			{
				callback(requestError);
			}
		});
	};
}

module.exports = {
	OpenWeatherMapAPI: OpenWeatherMapAPI
};