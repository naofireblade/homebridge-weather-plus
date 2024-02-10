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
			'SunriseTime',
			'SunsetTime',
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

					// Old api requires an extra call to get the forecast
					if (this.api === "2.5")
					{
						this.getWeatherData(this.apiBaseURL + "/data/2.5/forecast", (error, result) =>
						{
							if (!error) {
									// Pass the entire "city" JSON array as it has both the timezone and sunrise & sunset values
									this.generateForecasts(weather, result["list"], result["city"], callback);
								} else {
								    that.log.error("Error retrieving weather Forecast from API 2.5");
						            that.log.error(result);
						            callback();
								}
						});
					}
					else
					{
						this.generateForecasts(weather, result["daily"], result["timezone"], callback);
					}
				}
				else
				{
					if (result !== undefined && JSON.stringify(result).includes("401"))
					{
						if (this.api === "3.0")
						{
							that.log.info("Could not retreive weather report with API 3.0, trying API 2.5 now ...")
							this.api = "2.5";
							this.removeCharacteristic(this.reportCharacteristics, "UVIndex");
							this.removeCharacteristic(this.reportCharacteristics, "DewPoint");
							this.removeCharacteristic(this.forecastCharacteristics, "UVIndex");
							this.removeCharacteristic(this.forecastCharacteristics, "DewPoint");
							this.forecastDays = 5;
							this.update(forecastDays, callback);
						}
						else
						{
							that.log.error("Could not retreive weather report with neither API 3.0 or API 2.5. You may need to wait up to 30 minutes after creating your api key. If the error persist, check if you copied the api key correctly.");
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
		if (this.api === "2.5")
		{
			this.parseReportLegacy(weather.report, values);
			let timezoneShift = timezone / 60
			weather.report.ObservationTime = moment.unix(values.dt).utcOffset(timezoneShift).format('HH:mm:ss');
		}
		else
		{
			this.parseReportOneCall(weather.report, values["current"], timezone);
			weather.report.ObservationTime = moment.unix(values["current"].dt).tz(timezone).format('HH:mm:ss');
		}

		if (weather.forecasts)
		{
			callback(null, weather);
		}
	}

	generateForecasts(weather, values, timezone, callback)
	{
		let forecasts = [];

		// API 2.5 does not send a summary for the forecast day, instead it sends a report for every 3 hours.
		// We need to combine 8 x 3hrs reports to get the forecast for 1 day.
		// Also for API 2.5, timezone parameter is actually the result "city" JSON array
		let legacyDays = [];
		if (this.api === "2.5")
		{
			for (let i = 0; i < values.length; i++)
			{
				if (i % 8 === 0)
				{
					legacyDays.push([]);
				}
				legacyDays[legacyDays.length - 1].push(values[i]);
			}
			values = legacyDays;
		}

		for (let i = 0; i < values.length; i++)
		{
			if (this.api === "2.5")
			{
				forecasts[forecasts.length] = this.parseForecastLegacy(values[i], timezone);
			}
			else
			{
				forecasts[forecasts.length] = this.parseForecastOneCall(values[i], timezone);
			}
		}

		weather.forecasts = forecasts;
		if (weather.report)
		{
			callback(null, weather);
		}
	}

	parseReportLegacy(report, values, isForecast = false)
	{
		report.AirPressure = parseInt(values.main.pressure);
		report.CloudCover = parseInt(values.clouds.all);
		report.Condition = values.weather[0].description;
		report.ConditionCategory = this.getConditionCategory(values.weather[0].id, this.conditionDetail);
		report.Humidity = parseInt(values.main.humidity);
		let detailedCondition = this.getConditionCategory(values.weather[0].id, true);
		report.RainBool = [5, 6, 9].includes(detailedCondition);
		report.SnowBool = [7, 8].includes(detailedCondition);
		report.SunriseTime = moment.unix(values.sys.sunrise).utcOffset(values.timezone / 60).format('HH:mm:ss');
		report.SunsetTime = moment.unix(values.sys.sunset).utcOffset(values.timezone / 60).format('HH:mm:ss');
		report.TemperatureApparent = typeof values.main.feels_like === 'object' ? parseInt(values.main.feels_like.day) : parseInt(values.main.feels_like);
		report.TemperatureMax = parseInt(values.main.temp_max);
		report.TemperatureMin = parseInt(values.main.temp_min);
		report.WindDirection = converter.getWindDirection(values.wind.deg);
		report.WindSpeed = parseFloat(values.wind.speed);
		if (isForecast)
		{
			report.RainDay = values.rain["24h"];
			report.RainChance = parseFloat(values.pop) * 100;
		}
		else
		{
			report.Temperature = typeof values.main.temp === 'object' ? parseFloat(values.main.temp.day) : parseFloat(values.main.temp);
			let precip1h = values.rain === undefined || isNaN(parseFloat(values.rain['1h'])) ? 0 : parseFloat(values.rain['1h']);
			precip1h += values.snow === undefined || isNaN(parseFloat(values.snow['1h'])) ? 0 : parseFloat(values.snow['1h']);
			report.Rain1h = precip1h;
		}
	}

	/**
	 * Combine the 8 reports for a forecast day into a meaningful summary for the day.
	 * @param values 8 reports, each for 3 hours
	 * @param timezoneShift shift in seconds from utc of location timezone
	 * @returns {{}} forecast day
	 */
	parseForecastLegacy(values, city)
	{
		let forecast = {};
		let combinedHourlyValues = {
			"dt": values[0].dt,
			"main": {
				"temp_max": Math.max(...values.map(v => v.main.temp_max)),
				"temp_min": Math.min(...values.map(v => v.main.temp_min)),
				"feels_like": Math.max(...values.map(v => v.main.feels_like)),
				"pressure": Math.max(...values.map(v => v.main.pressure)),
				"humidity": Math.max(...values.map(v => v.main.humidity))
			},
			"clouds": {
				"all": values.map(v => v.clouds.all).reduce((acc, v, i, a) => (acc + v / a.length), 0)
			},
			"weather": values[4].weather,
			"sys": {
				"sunrise": city["sunrise"],
				"sunset": city["sunset"]
			},
			"wind": {
				"speed": Math.max(...values.map(v => v.wind.speed)),
				"deg": values[4].wind.deg,
				"gust": Math.max(...values.map(v => v.wind.gust))
			},
			"rain": {
				"24h": values.map(v => v.rain === undefined || isNaN(parseFloat(v.rain['3h'])) ? 0 : parseFloat(v.rain['3h'])).reduce((a, b) => a + b)
			},
			"pop": Math.max(...values.map(v => v.pop)),
			"timezone" : city["timezone"]
		}
		this.parseReportLegacy(forecast, combinedHourlyValues, true);
		
		forecast.ForecastDay = moment.unix(combinedHourlyValues.dt).utcOffset(city["timezone"] / 60).format('dddd');

		return forecast;
	}

	parseReportOneCall(report, values, timezone, isForecast = false)
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
		report.SunriseTime = moment.unix(values.sunrise).tz(timezone).format('HH:mm:ss');
		report.SunsetTime = moment.unix(values.sunset).tz(timezone).format('HH:mm:ss');
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
		this.parseReportOneCall(forecast, values, timezone, true);
		
		forecast.ForecastDay = moment.unix(values.dt).tz(timezone).format('dddd');

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
		if (this.api === "2.5")
		{
			return this.apiBaseURL + "/data/2.5/weather";
		}
		else
		{
			return this.apiBaseURL + "/data/3.0/onecall"
		}
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
