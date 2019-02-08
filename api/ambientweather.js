/*jshint esversion: 6,node: true,-W041: false */
"use strict";

/*

Ambient Weather API docs:
  https://ambientweather.docs.apiary.io/

Parameters returned by the Ambient Weather service:
  https://github.com/ambient-weather/api-docs/wiki/Device-Data-Specs

The Get Devices call is
  https://api.ambientweather.net/v1/devices?applicationKey=APP_KEY&apiKey=API_KEY
and the response is
[
  {
    "macAddress": "xx:xx:xx:xx:xx:xx",
    "lastData": {
      "dateutc": 1549519740000,
      "winddir": 68,
      "windspeedmph": 0,
      "windgustmph": 0,
      "maxdailygust": 17.45,
      "tempf": 39.4,
      "battout": "1",
      "humidity": 68,
      "hourlyrainin": 0,
      "eventrainin": 0,
      "dailyrainin": 0,
      "weeklyrainin": 2.17,
      "monthlyrainin": 5.31,
      "yearlyrainin": 12.46,
      "totalrainin": 12.46,
      "tempinf": 69.1,
      "battin": "1",
      "humidityin": 46,
      "baromrelin": 30.2,
      "baromabsin": 29.72,
      "uv": 0,
      "solarradiation": 0,
      "temp1f": 67.28,
      "humidity1": 47,
      "batt1": "1",
      "feelsLike": 39.4,
      "dewPoint": 29.73,
      "lastRain": "2019-02-05T20:12:00.000Z",
      "date": "2019-02-07T06:09:00.000Z"
    },
    "info": {
      "name": "Name",
      "location": "Location"
    }
  }
]

*/

const request = require('request'),
    converter = require('../util/converter'),
    moment = require('moment-timezone'),

    attribution = 'Powered by Ambient Weather',
    reportCharacteristics = [
        'AirPressure',
        'DewPoint',
        'Humidity',
        'ObservationTime',
        'Rain1h',
        'RainDay',
        'SolarRadiation',
        'Temperature',
        'UVIndex',
        'WindDirection',
        'WindSpeed',
        'WindSpeedMax'
    ],
    forecastCharacteristics = [],
    forecastDays = 0;

var appKey = '4967bf0124604a1c893164ee0758b4e0dcb568924f924b4498df4c3ce0db6f65';
var debug, log;

var init = function (apiKey, timezone, l, d) {
    this.apiKey = apiKey;
    this.timezone = timezone;

    log = l;
    debug = d;
};

var update = function (callback) {
    debug("Updating weather with AmbientWeather");

    const queryUri =
          'https://api.ambientweather.net/v1/devices?applicationKey=' +
          encodeURIComponent(appKey) +
          '&apiKey=' +
          encodeURIComponent(this.apiKey);

    const tz = this.timezone;
    request(queryUri, function (err, response, body) {
        if (! err) {
            const jsonObj = JSON.parse(body);
            if (jsonObj.error) {
                err = jsonObj.error;
            } else {
                parseReport(jsonObj[0].lastData, tz, callback);
            }
        }
        if (err) {
            log.error("Error retrieving weather report");
            log.error("Error Message: " + err);
            callback(err);
        }
    });
};

var parseReport = function (data, timezone, callback) {
    const report = {};

    // HomeKit expects SI units.

    report.AirPressure = inchHgToHpa(data.baromrelin);
    report.DewPoint = fahrenheitToCelsius(data.dewPoint);
    report.Humidity = data.humidity;
    report.ObservationTime = moment.unix(parseInt(data.dateutc / 1000))
        .tz(timezone)
        .format('HH:mm:ss');
    report.Rain1h = inchToMm(data.hourlyrainin);
    report.RainDay = inchToMm(data.dailyrainin);
    report.SolarRadiation = data.solarradiationf;
    report.Temperature = fahrenheitToCelsius(data.tempf);
    report.UVIndex = data.uv;
    report.WindDirection = converter.getWindDirection(data.winddir);
    report.WindSpeed = mphToMps(data.windspeedmph);
    report.WindSpeedMax = mphToMps(data.windgustmph);

    const weather = {};
    weather.report = report;
    callback(null, weather);
};

var inchHgToHpa = function (inch_hg) { return inch_hg * 33.863886666667; };
var fahrenheitToCelsius = function (f) { return (f - 32) * 5 / 9; };
var inchToMm = function(inch) { return inch * 25.4; };
var mphToMps = function(mph) { return mph * 0.4470389; };


module.exports = {
    init,
    update,
    reportCharacteristics,
    forecastCharacteristics,
    forecastDays,
    attribution
};
