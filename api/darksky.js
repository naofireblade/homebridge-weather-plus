/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const DarkSky = require('dark-sky'),
    converter = require('../util/converter'),
    moment = require('moment-timezone');

class DarkSkyAPI {
    constructor(apiKey, language, locationGeo, l, d) {
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
                'RainDay',
                'Temperature',
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
                'RainChance',
                'RainDay',
                'Temperature',
                'TemperatureMin',
                'UVIndex',
                'Visibility',
                'WindDirection',
                'WindSpeed',
                'WindSpeedMax'
            ];
        this.forecastDays = 7;
        this.cache = {
            report: {},
            forecast: {
                day0: {},
                day1: {},
                day2: {},
                day3: {},
                day4: {},
                day5: {},
                day6: {}
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
        this.log = l;
        this.debug = d;
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

    update(callback, requestedForecastDays) {
        let weather = {};
        weather.forecasts = [];
        let that = this;

        this.updateCache(this.darkskyTimeMachine, requestedForecastDays, function () {
            that.debug("Updating weather with dark sky");
            that.darksky.get()
                .then(function (response) {

                    // Current weather report
                    response.currently.rainDay = that.cache.report.rainDay; // Load rainDay from cache
                    weather.report = that.parseReport(response.currently, response.timezone);

                    // Forecasts for today and next 6 days
                    for (let i = 0; i <= 6; i++) {
                        response.daily.data[i].rainDay = that.cache.forecast['day' + i].rainDay; // Load rainDay from cache
                        weather.forecasts.push(that.parseForecast(response.daily.data[i], response.timezone));
                    }

                    callback(null, weather);
                })
                .catch(function (error) {
                    that.log.error("Error retrieving weather report and forecast for DarkSky");
                    that.log.error("Error Message: " + error);
                    callback(error);
                });
        });
    }

    parseReport(values, timezone) {
        let report = {};

        report.AirPressure = parseInt(values.pressure);
        report.CloudCover = parseInt(values.cloudCover * 100);
        report.Condition = values.summary;
        report.ConditionCategory = converter.getConditionCategory(values.icon);
        report.DewPoint = parseInt(values.dewPoint);
        report.Humidity = parseInt(values.humidity * 100);
        report.ObservationTime = moment.unix(values.time).tz(timezone).format('HH:mm:ss');
        report.Ozone = parseInt(values.ozone);
        report.Rain1h = isNaN(parseInt(values.precipIntensity)) ? 0 : parseInt(values.precipIntensity);
        report.RainDay = values.rainDay;
        report.Temperature = values.temperature;
        report.UVIndex = isNaN(parseInt(values.uvIndex)) ? 0 : parseInt(values.uvIndex);
        report.Visibility = isNaN(parseInt(values.visibility)) ? 0 : parseInt(values.visibility);
        report.WindDirection = converter.getWindDirection(values.windBearing);
        report.WindSpeed = parseFloat(values.windSpeed);
        report.WindSpeedMax = parseFloat(values.windGust);

        return report;
    }

    parseForecast(values, timezone, i) {
        let forecast = {};

        forecast.AirPressure = parseInt(values.pressure);
        forecast.CloudCover = parseInt(values.cloudCover * 100);
        forecast.Condition = values.summary;
        forecast.ConditionCategory = converter.getConditionCategory(values.icon);
        forecast.DewPoint = parseInt(values.dewPoint);
        forecast.ForecastDay = moment.unix(values.time).tz(timezone).format('dddd');
        forecast.Humidity = parseInt(values.humidity * 100);
        forecast.Ozone = parseInt(values.ozone);
        forecast.RainChance = parseInt(values.precipProbability * 100);
        forecast.RainDay = values.rainDay;
        forecast.Temperature = values.temperatureHigh;
        forecast.TemperatureMin = values.temperatureLow;
        forecast.UVIndex = isNaN(parseInt(values.uvIndex)) ? 0 : parseInt(values.uvIndex);
        forecast.Visibility = isNaN(parseInt(values.visibility)) ? 0 : parseInt(values.visibility);
        forecast.WindDirection = converter.getWindDirection(values.windBearing);
        forecast.WindSpeed = parseFloat(values.windSpeed);
        forecast.WindSpeedMax = parseFloat(values.windGust);

        return forecast;
    }

    updateCache(api, requestedForecastDays, callback) {
        if (typeof this.cache.lastUpdate === 'undefined' || new Date() - this.cache.lastUpdate > 3600000) {
            this.debug("Called hourly update of rain data");
            this.cache.lastUpdate = new Date();

            let now = moment();
            let callbacks = requestedForecastDays + 1;

            this.doTimeMachineRequest(api, now, function (result) {
                this.cache.report.rainDay = result;
                callbacks--;
                if (callbacks == 0) {
                    callback();
                }
            }.bind(this), true);

            for (let i = 0; i < requestedForecastDays; i++) {
                this.doTimeMachineRequest(api, now.clone().add(i, 'd'), function (result) {
                    this.cache.forecast['day' + i].rainDay = result;
                    callbacks--;
                    if (callbacks == 0) {
                        callback();
                    }
                }.bind(this));
            }
        }
        else {
            callback();
        }
    }

    doTimeMachineRequest(api, now, callback, limit = false) {
        api.time(now.valueOf())
            .get()
            .then(function (response) {

                // Current hour in time zone of weather location
                let hour = 24;
                if (limit) {
                    hour = now.tz(response.timezone).format('H');
                }

                // Sum all values for the requested day
                this.debug("Accumulate rain for " + now.tz(response.timezone).format('dddd') + (limit ? (' until ' + hour + ':00') : ''));
                let result = converter.getRainAccumulated(response.hourly.data.slice(0, hour), 'precipIntensity');
                this.debug("Accumulated rain: " + result);
                callback(result);
            }.bind(this))
            .catch(function (error) {
                this.log.error("Error retrieving rain report");
                this.log.error("Error Message: " + error);
                callback(null);
            }.bind(this));
    }

}

module.exports = {
    DarkSkyAPI: DarkSkyAPI
};