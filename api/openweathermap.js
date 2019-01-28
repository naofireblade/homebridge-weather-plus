/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const Openweathermap = require('openweather-apis'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),
    geoTz = require('geo-tz');

class OpenWeatherMapAPI{
    constructor(apiKey, language, location, locationGeo, locationCity, l, d) {
        Openweathermap.setLang(language);
        if (location) {
            Openweathermap.setCityId(location);
        }
        if (locationGeo) {
            Openweathermap.setCoordinate(locationGeo[0], locationGeo[1]);
        }
        if (locationCity) {
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
            'Temperature',
            'TemperatureMin',
            'WindDirection',
            'WindSpeed'
        ];
        this.forecastDays = 5;
        this.log = l;
        this.debug = d;
    }

    update(callback) {
        this.debug("Updating weather with OpenWeatherMap");

        let weather = {};
        Openweathermap.getAllWeather(function (err, jsonObj) {
            if (!err && jsonObj.coord) {
                // Current weather report
                this.parseReport(weather, jsonObj, callback);
            }
            else {
                this.log.error("Error retrieving weather report");
                this.log.error("Error Message: " + (err ? err : JSON.stringify(jsonObj)));
                callback(err ? err : true);
            }
        }.bind(this));

        Openweathermap.getWeatherForecast(function (err, jsonObj) {
            if (!err && jsonObj.city) {
                this.parseForecasts(weather, jsonObj, callback);
            }
            else {
                this.log.error("Error retrieving weather forecast");
                this.log.error("Error Message: " + (err ? err : JSON.stringify(jsonObj)));
                callback(err ? err : true);
            }
        }.bind(this));
    }

    parseReport(weather, values, callback) {
        let report = weather.report || {};
        const timezone = geoTz(values.coord.lat, values.coord.lon);

        report.AirPressure = parseInt(values.main.pressure);
        report.CloudCover = parseInt(values.clouds.all);
        report.Condition = values.weather[0].description;
        report.ConditionCategory = converter.getConditionCategoryOwm(values.weather[0].id);
        report.Humidity = parseInt(values.main.humidity);
        report.ObservationTime = moment.unix(values.dt).tz(timezone).format('HH:mm:ss');
        report.Temperature = values.main.temp;
        report.WindDirection = converter.getWindDirection(values.wind.deg);
        report.WindSpeed = values.wind.speed;

        weather.report = report;
        if (weather.forecasts) {
            callback(null, weather);
        }
    }

    parseForecasts(weather, values, callback) {
        const timezone = geoTz(values.city.coord.lat, values.city.coord.lon);

        let forecasts = [];
        // We get a forecast for 5 days with values each 3 hours.
        const itemsFiltered = this.prepareForecasts(values.list, timezone);
        for (let i = 0; i < itemsFiltered.length; i++) {
            forecasts[forecasts.length] = this.parseForecast(itemsFiltered[i], timezone);
        }

        weather.forecasts = forecasts;
        if (weather.report) {
            callback(null, weather);
        }
    }

    parseForecast(values, timezone) {
        let forecast = {};

        forecast.AirPressure = parseInt(values.main.pressure);
        forecast.CloudCover = parseInt(values.clouds.all);
        forecast.Condition = values.weather[0].description;
        forecast.ConditionCategory = converter.getConditionCategoryOwm(values.weather[0].id);
        forecast.ForecastDay = moment.unix(values.dt).tz(timezone).format('dddd');
        forecast.Humidity = parseInt(values.main.humidity);
        forecast.Temperature = values.main.temp_max;
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
    prepareForecasts (forecasts, timezone) {
        let forecastsFiltered = [];
        const endOfToday = moment.tz(timezone).endOf("day").unix();
        // Find one for today
        for (let i = 0; i < forecasts.length; i++) {
            const listItem = forecasts[i];
            if (listItem.dt <= endOfToday) {
                const hourOfDay = moment.unix(listItem.dt).tz(timezone).format("H");
                if (parseInt(hourOfDay) >= 10 && parseInt(hourOfDay) <= 13) {
                    forecastsFiltered[forecastsFiltered.length] = forecasts[i];
                }
            }
        }
        // The request was made after noon, take first for today
        if (forecastsFiltered.length === 0) {
            forecastsFiltered[forecastsFiltered.length] = forecasts[0];
        }

        // For all following days find exactly one value (best: noon)
        for (let i = 0; i < forecasts.length; i++) {
            const listItem = forecasts[i];
            if (listItem.dt > endOfToday) {
                const hourOfDay = moment.unix(listItem.dt).tz(timezone).format("H");
                if (parseInt(hourOfDay) >= 10 && parseInt(hourOfDay) <= 13) {
                    forecastsFiltered[forecastsFiltered.length] = forecasts[i];
                }
            }
        }
        return forecastsFiltered;
    }
}

module.exports = {
    OpenWeatherMapAPI: OpenWeatherMapAPI
};