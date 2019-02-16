/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const Wunderground = require('wundergroundnode'),
    converter = require('../util/converter'),
    moment = require('moment-timezone');
class WundergroundAPI {
    constructor(apiKey, location, l, d) {
        this.attribution = 'Powered by Weather Underground';
        this.reportCharacteristics = [
            'AirPressure',
            'Condition',
            'ConditionCategory',
            'Humidity',
            'ObservationStation',
            'ObservationTime',
            'Rain1h',
            'RainDay',
            'SolarRadiation',
            'Temperature',
            'UVIndex',
            'Visibility',
            'WindDirection',
            'WindSpeed',
            'WindSpeedMax'
        ];
        this.forecastCharacteristics = [
            'Condition',
            'ConditionCategory',
            'ForecastDay',
            'Humidity',
            'RainChance',
            'RainDay',
            'Temperature',
            'TemperatureMin',
            'WindDirection',
            'WindSpeed',
            'WindSpeedMax'
        ];
        this.forecastDays = 4;
        this.location = location;
        this.log = l;
        this.debug = d;

        this.wunderground = new Wunderground(apiKey);

    }

    update(callback) {
        this.debug("Updating weather with weather underground");

        let weather = {};
        weather.forecasts = [];

        this.wunderground.conditions().forecast().request(this.location, function (error, response) {
            if (!error) {
                // Current weather report
                weather.report = this.parseReport(response.current_observation);

                // Forecasts for today and next 3 days
                weather.forecasts.push(this.parseForecast(response.forecast.simpleforecast.forecastday[0]));
                weather.forecasts.push(this.parseForecast(response.forecast.simpleforecast.forecastday[1]));
                weather.forecasts.push(this.parseForecast(response.forecast.simpleforecast.forecastday[2]));
                weather.forecasts.push(this.parseForecast(response.forecast.simpleforecast.forecastday[3]));
                callback(null, weather);
            }
            else {
                this.log.error("Error retrieving weather report and forecast for Weather Underground");
                this.log.error("Error Message: " + error);
                callback(error);
            }
        }.bind(this));
    }

    parseReport(values) {
        let report = {};

        report.AirPressure = parseInt(values.pressure_mb);
        report.Condition = values.weather;
        report.ConditionCategory = converter.getConditionCategory(values.icon);
        report.Humidity = parseInt(values.relative_humidity.substr(0, values.relative_humidity.length - 1));
        report.ObservationStation = values.observation_location.full;
        report.ObservationTime = values.observation_time_rfc822.split(' ')[4];
        report.Rain1h = isNaN(parseInt(values.precip_1hr_metric)) ? 0 : parseInt(values.precip_1hr_metric);
        report.RainDay = isNaN(parseInt(values.precip_today_metric)) ? 0 : parseInt(values.precip_today_metric);
        report.SolarRadiation = isNaN(parseInt(values.solarradiation)) ? 0 : parseInt(values.solarradiation);
        report.Temperature = values.temp_c;
        report.UVIndex = isNaN(parseInt(values.UV)) ? 0 : parseInt(values.UV);
        report.Visibility = isNaN(parseInt(values.visibility_km)) ? 0 : parseInt(values.visibility_km);
        report.WindDirection = values.wind_dir;
        report.WindSpeed = parseFloat(values.wind_kph);
        report.WindSpeedMax = parseFloat(values.wind_gust_kph);

        return report;
    }

    parseForecast(values) {
        let forecast = {};

        forecast.Condition = values.conditions;
        forecast.ConditionCategory = converter.getConditionCategory(values.icon);
        forecast.ForecastDay = values.date.weekday;
        forecast.Humidity = parseInt(values.avehumidity);
        forecast.RainChance = values.pop;
        forecast.RainDay = isNaN(parseInt(values.qpf_allday.mm)) ? 0 : parseInt(values.qpf_allday.mm);
        forecast.Temperature = values.high.celsius;
        forecast.TemperatureMin = values.low.celsius;
        forecast.WindDirection = values.avewind.dir;
        forecast.WindSpeed = parseFloat(values.avewind.kph);
        forecast.WindSpeedMax = parseFloat(values.maxwind.kph);

        return forecast;
    }
}

module.exports = {
    WundergroundAPI: WundergroundAPI
};