/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
	converter = require('../util/converter'),
    moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');

class WundergroundAPI {
    constructor(apiKey, location, l, d) {
        this.attribution = 'Powered by Weather Underground';
        this.reportCharacteristics = [
            'ObservationStation',
            'ObservationTime',
            'WindDirection',
            'Humidity',
            'SolarRadiation',
            'UVIndex',
            'Temperature',
            'DewPoint',
            'AirPressure',
            'WindSpeed',
            'WindSpeedMax',
            'RainDay'
        ];
                
        this.debug = d;
        this.log = l;

        this.location = location;
        this.apiKey = apiKey;
        
		//Characteristic code expect all result in 'si'.
    	this.units = 's';
    }

    update(callback) {
        this.debug("Updating weather with weather underground");
        let weather = {};
        
        const queryUri = "https://api.weather.com/v2/pws/observations/current?apiKey="+this.apiKey+"&stationId="+this.location+"&format=json&units="+this.units;
        request(encodeURI(queryUri), function (err, response, body) {
            if (!err) {
                // Current weather report
                const jsonObj = JSON.parse(body);
				debug( JSON.stringify(jsonObj, null, 2));
                
                weather.report = this.parseReport(jsonObj, callback);
                callback(null, weather);
            } else {
                debug("Error retrieving weather report and forecast");
                debug("Error Message: " + err);
                callback(err);
            }
        }.bind(this));
    }

    parseReport(values) {

        let report = {};
        
        /* EXAMPLE : Weather Underground payload 
        	
		   {
		     "observations": [
		       {
		         "stationID": "KCASANJO898",
		         "obsTimeUtc": "2019-09-03T01:15:59Z",
		         "obsTimeLocal": "2019-09-02 18:15:59",
		         "neighborhood": "West San Jose - Casa de la Niles",
		         "softwareType": "WS-1002 V2.4.6",
		         "country": "US",
		         "solarRadiation": 451.7,
		         "lon": -122.01569366,
		         "realtimeFrequency": null,
		         "epoch": 1567473359,
		         "lat": 37.30566025,
		         "uv": 1,
		         "winddir": 0,
		         "humidity": 67,
		         "qcStatus": 1,
		         "metric_si": { // other variants based on request: imperial(e) | metric(m) | metric_si(s) | uk_hybrid(h)
		           "temp": 23,
		           "heatIndex": 23,
		           "dewpt": 16,
		           "windChill": 23,
		           "windSpeed": 3,
		           "windGust": 3,
		           "pressure": 1010.84,
		           "precipRate": 0,
		           "precipTotal": 0,
		           "elev": 105
		         }
		       }
		     ]
		   }
  
		*/

        try {
        	var observation = values.observations[0]
            var metric;
			debug("Units:" + this.units);
			/*always just get metric_si...but if we ever change that.*/
            if (this.units=='s') {
            	metric = observation.metric_si;
            } else if (this.units=='m') {
            	metric = observation.metric;
            } else if (this.units=='e') {
            	metric = observation.imperial;
            } else { // 'h'
            	metric = observation.uk_hybrid;
            };
        	
			debug("Station:" + observation.stationID + " : " + observation.neighborhood);
            report.ObservationStation = observation.stationID + " : " + observation.neighborhood;
            report.ObservationTime = moment(Date.parse(observation.obsTimeUtc));

			debug("WindDirection:" + observation.winddir);
			debug("Humidity:" + observation.humidity);
        	report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
            report.Humidity 		= isNaN(parseInt(observation.humidity)) ? 0 : parseInt(observation.humidity);
            report.SolarRadiation 	= isNaN(parseInt(observation.solarRadiation)) ? 0 : parseInt(observation.solarRadiation);
            report.UVIndex 			= isNaN(parseInt(observation.uv)) ? 0 : parseInt(observation.uv);
            
 			debug("Temperature:" + metric.temp);
            report.Temperature 		= isNaN(parseInt(metric.temp)) ? 0 : parseInt(metric.temp);
            report.DewPoint 		= isNaN(parseInt(metric.dewpt)) ? 0 : parseInt(metric.dewpt);
            report.AirPressure 		= isNaN(parseInt(metric.pressure)) ? 0 : parseInt(metric.pressure);
 			debug("AirPressure:" + report.AirPressure);
            report.WindSpeed 		= isNaN(parseInt(metric.windSpeed)) ? 0 : parseInt(metric.windSpeed);
 			debug("WindSpeed:" + report.WindSpeed);
            report.WindSpeedMax 	= isNaN(parseInt(metric.windGust)) ? 0 : parseInt(metric.windGust);
 			debug("WindSpeedMax:" + report.WindSpeedMax);
            report.RainDay 	= isNaN(metric.precipTotal) ? 0 : metric.precipTotal;
 			debug("RainDay:" + report.RainDay);

        }
        catch(error) {
            debug("Error retrieving weather report for Weather Underground");
            debug("Error Message: " + error);
        }

        return report;
    }

    parseForecasts(forecastObjs, timezone) {
        /* NO FORCAST DATA FROM API*/
        return [];
    }
}

module.exports = {
    WundergroundAPI: WundergroundAPI
};
