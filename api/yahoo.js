"use strict";

const request = require('request'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),
    geoTz = require('geo-tz'),

    attribution = 'Powered by Yahoo',
    reportCharacteristics = [
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
    ],
    forecastCharacteristics = [
        'Condition',
        'ConditionCategory',
        'ForecastDay',
        'Temperature',
        'TemperatureMin'
    ],
    forecastDays = 10;

var debug, log;

var init = function (location, l, d) {
    this.location = location;
    log = l;
    debug = d;
};

var update = function (callback) {
    debug("Updating weather with Yahoo");

    const queryUri = `https://query.yahooapis.com/v1/public/yql?q=select * from weather.forecast where u='c' AND woeid in (select woeid from geo.places(1) where text="${this.location}")&format=json`;
    request(encodeURI(queryUri), function (err, response, body) {
        if (!err) {
            // Current weather report
            const jsonObj = JSON.parse(body);
            parseReport(jsonObj['query']['results']['channel'], callback);
        } else {
            log.error("Error retrieving weather report and forecast");
            log.error("Error Message: " + err);
            callback(err);
        }
    });
};

var parseReport = function (values, callback) {
    let report = {};
    const timezone = geoTz(parseFloat(values['item']['lat']), parseFloat(values['item']['long']));
    debug("Using Timezone: " + timezone);

    report.AirPressure = parseInt(values['atmosphere']['pressure']);
    report.Condition = values['item']['condition']['text'];
    report.ConditionCategory = converter.getConditionCategoryYahoo(parseInt(values['item']['condition']['code']));
    report.ForecastDay = moment(values['item']['forecast'][0]['date'], "DD MMM YYYY").tz(timezone).format("dddd");
    report.Humidity = parseInt(values['atmosphere']['humidity']);
    const pubDate = values['item']['pubDate'];
    report.ObservationTime = moment(pubDate.substr(5, 11), "DD MMM YYYY").tz(timezone).format('HH:mm:ss');
    report.Temperature = parseInt(values['item']['condition']['temp']);
    report.TemperatureMin = parseInt(values['item']['forecast'][0]['low']);
    report.Visibility = parseFloat(values['atmosphere']['visibility']);
    report.WindDirection = converter.getWindDirection(parseInt(values['wind']['direction']));
    report.WindSpeed = parseFloat(values['wind']['speed']);

    const weather = {};
    weather.report = report;
    weather.forecasts = parseForecasts(values['item']['forecast'], timezone);
    callback(null, weather)
};

var parseForecasts = function (forecastObjs, timezone) {
    let forecasts = [];
    for (let i = 0; i < forecastObjs.length; i++) {
        const values = forecastObjs[i];
        const forecast = {};
        forecast.Condition = values['text'];
        forecast.ConditionCategory = converter.getConditionCategoryOwm(parseInt(values['code']));
        forecast.ForecastDay = moment(values['date'], "DD MMM YYYY").tz(timezone).format("dddd");
        forecast.Temperature = values['high'];
        forecast.TemperatureMin = values['low'];
        forecasts[forecasts.length] = forecast;
    }
    return forecasts;
};

module.exports = {
    init,
    update,
    reportCharacteristics,
    forecastCharacteristics,
    forecastDays,
    attribution
};