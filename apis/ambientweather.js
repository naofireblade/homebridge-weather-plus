/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const request = require('request'),
    converter = require('../util/converter'),
    moment = require('moment-timezone');

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
      "date": "2019-02-07T06:09:00.000Z",
      "tz": 'America/Chicago',

      // outside readings
      "tempf": 39.4,
      "humidity": 68,
      "winddir": 68,
      "windspeedmph": 0,
      "windgustmph": 0,
      "maxdailygust": 17.45,
      "hourlyrainin": 0,
      "eventrainin": 0,
      "dailyrainin": 0,
      "weeklyrainin": 2.17,
      "monthlyrainin": 5.31,
      "yearlyrainin": 12.46,
      "totalrainin": 12.46,
      "lastRain": "2019-02-05T20:12:00.000Z",
      "uv": 0,
      "solarradiation": 0,
      "battout": "1",

      // inside readings
      "tempinf": 73.9,
      "humidityin": 65,
      "feelsLikein": 74,
      "dewPointin": 61.4,
      "baromrelin": 29.59,
      "baromabsin": 29.12,
      "battin": 1,

      // remote sensor 1
      "temp1f": 75.2,
      "humidity1": 68,
      "feelsLike1": 75.6,
      "dewPoint1": 63.9,
      "batt1": 1
    },
    "info": {
      "name": "Name",
      "location": "Location"
      "coords": {
        "coords": { "lat": 0.0, "lon": 0.0 },
        "address": "Anytown, ST 99999, USA",
        "location": "Anytown",
        "elevation": 999.0,
        "geo": {
          "type": "Point",
          "coordinates": [ 0.0, 0.0 ]
        }
      }
    }
  }
]

*/

class AmbientWeatherAPI
{
    constructor(apiKey, appKey, locationId, detail, log, cacheDirectory)
    {
        // log.info("constructor", apiKey, appKey, locationId, detail, cacheDirectory);

        this.apiKey = apiKey;
        this.appKey = appKey;
        this.locationId = locationId;
        this.log = log;

        this.attribution = 'Powered by Ambient Weather',
        this.reportCharacteristics = [
            'ObservationStation',
            'ObservationTime',
            'AirPressure',
            'DewPoint',
            'Humidity',
            'Rain1h',
            'RainDay',
            'SolarRadiation',
            'Temperature',
            'UVIndex',
            'WindDirection',
            'WindSpeed',
            'WindSpeedMax'
        ],
        this.units = 's';       // Will report in SI units.
    }

    update(forecastDays, callback)
    {
        this.log.debug("Updating weather with AmbientWeather");

        const that = this;

        const queryUri =
              'https://api.ambientweather.net/v1/devices?applicationKey=' +
              encodeURIComponent(this.appKey) +
              '&apiKey=' +
              encodeURIComponent(this.apiKey);

        const tz = this.timezone;
        request(queryUri, (err, response, body) => {
            if (!err && body.length > 0) {
                if (body.startsWith("error code:")) {
                    err = body;
                } else {
                    try {
                        const jsonObj = JSON.parse(body);
                        if (jsonObj.error) {
                            err = jsonObj.error;
                        } else {
                            const weather = this.parseReport(jsonObj[0]);
                            callback(null, weather);
                        }
                    } catch (e) {
                        that.log.error("Error retrieving weather report");
                        that.log.error("Response Object: " + body);
                        that.log.error("Error Message: " + e);
                        err = e;
                    }
                }
            }
            if (err) {
                that.log.error("Error retrieving weather report");
                that.log.error("Error Message: " + err);
                callback(err);
            }
        });
    }

    parseReport(json) {
        const data = json.lastData;

        // HomeKit expects SI units.

        const report = {
            ObservationStation: json.macAddress,
            ObservationTime: moment.unix(parseInt(data.dateutc / 1000))
                // .tz(data.tz)
                .format('HH:mm:ss'),
            AirPressure: inchHgToHpa(data.baromrelin),
            DewPoint: fahrenheitToCelsius(data.dewPoint),
            Humidity: data.humidity,
            Rain1h: inchToMm(data.hourlyrainin),
            RainDay: inchToMm(data.dailyrainin),
            SolarRadiation: data.solarradiationf,
            Temperature: fahrenheitToCelsius(data.tempf),
            UVIndex: data.uv,
            WindDirection: converter.getWindDirection(data.winddir),
            WindSpeed: mphToMps(data.windspeedmph),
            WindSpeedMax:mphToMps(data.windgustmph),
        };

        // this.log.info(JSON.stringify({json, report}, null, 2));

        return {
            report,
            forecast: [],
        };
    }
};

const inchHgToHpa = (inch_hg) => inch_hg * 33.863886666667;
const fahrenheitToCelsius = (f) => (f - 32) * 5 / 9;
const inchToMm = (inch) => inch * 25.4;
const mphToMps = (mph) => mph * 0.4470389;

module.exports = {
    AmbientWeatherAPI,
};
