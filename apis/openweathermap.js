/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const converter = require('../util/converter'),
	moment = require('moment-timezone'),
	request = require('request');

class OpenWeatherMapAPI
{
	constructor(apiKey, language, locationId, locationGeo, locationCity, conditionDetail, log)
	{
		this.log = log;
		this.api = "3.0";
		this.apiBaseURL = "https://api.openweathermap.org";

		this.apiKey = apiKey;
		this.language = language;

		if (locationId)
		{
			this.log.error("Using a locationId is no longer supported by OpenWeatherMap. Please provide city name e.g. 'Berlin, DE' (locationCity) or geo cooridnates (locationGeo)");
		}

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
			'TemperatureApparent',
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
			'SunriseTime',
			'SunsetTime',
			'TemperatureApparent',
			'TemperatureMax',
			'TemperatureMin',
			'UVIndex',
			'WindDirection',
			'WindSpeed',
			'RainChance'
		];
		this.forecastDays = 8;
		this.conditionDetail = conditionDetail;
	}

	update(forecastDays, callback)
	{
		this.log.debug("Updating weather with OpenWeatherMap");
		let that = this;

		if (!this.locationGeo)
		{
			this.getLocationGeo((error, coordinates) =>
			{
				if (!error)
				{
					that.locationGeo = [coordinates.lat, coordinates.lon];
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
			this.log.debug("Update weather");
			let weather = {};

			this.getWeatherData(this.getWeatherUrl(), (error, result) =>
			{
				this.log.debug(result);
				if (!error && result["timezone"] !== undefined)
				{
					this.generateReport(weather, result, result["timezone"], callback);
					this.generateForecasts(weather, result["daily"], result["timezone"], callback);
				}
				else
				{
					if (result !== undefined && JSON.stringify(result).includes("401"))
					{
						if (this.api === "3.0")
						{
							that.log.info("Could not retrieve weather report with API 3.0, trying API 2.5 now ...")
							this.api = "2.5";
							this.forecastDays = 7; // 2.5 has one day less and than 3.0
							this.update(forecastDays, callback);
						}
						else
						{
							that.log.error("Could not retrieve weather report with neither API 3.0 or API 2.5. You may need to wait up to 30 minutes after creating your api key. If the error persist, check if you copied the api key correctly.");
							that.log.error(result);
							callback();
						}
					}
					else
					{
						that.log.error("Error retrieving weather report");
						that.log.error(result);
						callback();
					}
				}
			});
		}
	}

	generateReport(weather, values, timezone, callback)
	{
		weather.report = {};
		this.parseReportOneCall(weather.report, values["current"]);
		weather.report.ObservationTime = moment.unix(values["current"].dt).tz(timezone).format('HH:mm:ss');

		if (weather.forecasts)
		{
			callback(null, weather);
		}
	}

	generateForecasts(weather, values, timezone, callback)
	{
		let forecasts = [];

		for (let i = 0; i < values.length; i++)
		{
			forecasts[forecasts.length] = this.parseForecastOneCall(values[i], timezone);
		}

		weather.forecasts = forecasts;
		if (weather.report)
		{
			callback(null, weather);
		}
	}

	parseReportOneCall(report, values, isForecast = false)
	{
		report.AirPressure = parseInt(values.pressure);
		report.CloudCover = parseInt(values.clouds);
		report.Condition = values.weather[0].description;
		report.ConditionCategory = this.getConditionCategory(values.weather[0].id, this.conditionDetail);
		report.DewPoint = parseInt(values.dew_point);
		report.Humidity = parseInt(values.humidity);
		let detailedCondition = this.getConditionCategory(values.weather[0].id, true);
		report.RainBool = [5, 6, 9].includes(detailedCondition);
		report.SnowBool = [7, 8].includes(detailedCondition);
		report.TemperatureApparent = typeof values.feels_like === 'object' ? parseInt(values.feels_like.day) : parseInt(values.feels_like);
		report.UVIndex = parseInt(values.uvi);
		report.WindDirection = converter.getWindDirection(values.wind_deg);
		report.WindSpeed = parseFloat(values.wind_speed);
		if (isForecast)
		{
			let precipDay = isNaN(parseFloat(values.rain)) ? 0 : parseFloat(values.rain);
			precipDay += isNaN(parseFloat(values.snow)) ? 0 : parseFloat(values.snow);
			report.RainDay = precipDay;
			report.TemperatureMax = parseInt(values.temp.max);
			report.TemperatureMin = parseInt(values.temp.min);
			report.RainChance = parseFloat(values.pop) * 100;
		}
		else
		{
			let precip1h = values.rain === undefined || isNaN(parseFloat(values.rain['1h'])) ? 0 : parseFloat(values.rain['1h']);
			precip1h += values.snow === undefined || isNaN(parseFloat(values.snow['1h'])) ? 0 : parseFloat(values.snow['1h']);
			report.Rain1h = precip1h;
			report.Temperature = typeof values.temp === 'object' ? parseFloat(values.temp.day) : parseFloat(values.temp);
		}
	}

	parseForecastOneCall(values, timezone)
	{
		let forecast = {};
		this.parseReportOneCall(forecast, values, true);

		forecast.ForecastDay = moment.unix(values.dt).tz(timezone).format('dddd');
		forecast.SunriseTime = moment.unix(values.sunrise).tz(timezone).format('HH:mm:ss');
		forecast.SunsetTime = moment.unix(values.sunset).tz(timezone).format('HH:mm:ss');

		return forecast;
	}

	getConditionCategory(code, detail = false)
	{
		// See https://openweathermap.org/weather-conditions
		if ([202, 212, 221, 232, 504, 531, 711, 762, 771, 781].includes(code))
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
		else if ([200, 201].includes(code) || code >= 311 && code < 600)
		{
			// Rain
			return detail ? 6 : 2;
		}
		else if ([230, 231].includes(code) || code >= 300 && code < 311)
		{
			// Drizzle
			return detail ? 5 : 2;
		}
		else if (code >= 700 && code < 800)
		{
			// Fog
			return detail ? 4 : 1;
		}
		else if ([210, 211].includes(code) || code === 804)
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

	getWeatherData(url, callback)
	{
		this.log.debug("Getting weather data for location %s", this.locationGeo);

		const queryUri = url + "?units=metric&lang=" + this.language + "&lat=" + this.locationGeo[0] + "&lon=" + this.locationGeo[1] + "&appid=" + this.apiKey;
		request(encodeURI(queryUri), (requestError, response, body) =>
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
		this.log.debug("Getting coordinates for %s", this.locationCity);
		const queryUri = this.apiBaseURL + "/geo/1.0/direct?q=" + this.locationCity.toLowerCase() + "&limit=1&appid=" + this.apiKey;
		request(encodeURI(queryUri), (requestError, response, body) =>
		{
			if (!requestError)
			{
				// Get locationGeo from weather report
				let coordinates;
				let parseError;
				try
				{
					let json = JSON.parse(body);
					if (json.length >= 1)
					{
						coordinates = {"lat": json[0].lat, "lon": json[0].lon};
						this.log.info("Found coordinates for %s: %s", this.locationCity, coordinates);
					}
					else
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

	getWeatherUrl()
	{
		this.log.debug("Using API %s", this.api);
		return this.apiBaseURL + "/data/" + this.api + "/onecall";
	}

	removeCharacteristic(characteristics, item)
	{
		let index = characteristics.indexOf(item);
		if (index !== -1)
		{
			characteristics.splice(index, 1);
		}
	}
}

module.exports = {
	OpenWeatherMapAPI: OpenWeatherMapAPI
};
