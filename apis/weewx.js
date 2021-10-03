//Edited Weather Underground API to use Weewx JSON output.  Format for Json Output is below.

/*
{
    observations:[
    {
        stationID: "$station.location",
        softwareType: "weewx $station.version",
        realtimeFrequency: "$current.interval",
        #if $current.radiation.has_data
        solarRadiation: $current.radiation.raw,
        #end if
        #if $current.rain.raw > 0
        rainbool: "Yes",
        #else
        rainbool: "No",
        #end if
        lon: $station.stn_info.longitude_f,
        epoch: $current.dateTime.raw,
        lat: $station.stn_info.latitude_f,
        #if $current.UV.has_data
        uv: $current.UV,
        #end if
        #if $current.windDir.has_data
        winddir: $current.windDir.raw,
        #end if
        #if $current.outHumidity.has_data
        humidity: $current.outHumidity.raw,
        #end if
        #if $current.o3.has_data
        o3: $current.o3.raw
        #end if
        imperial: {
                        #if $current.outTemp.has_data
                        temp: $current.outTemp.degree_F.raw,
                        #end if
                        #if $day.outTemp.has_data
                        maxtemp: $day.outTemp.max.degree_F.raw,
                        mintemp: $day.outTemp.min.degree_F.raw,
                        #end if
                        #if $current.appTemp.has_data
                        apptemp: $current.appTemp.degree_F.raw,
                        #end if
                        #if $current.dewpoint.has_data
                        dewpt: $current.dewpoint.degree_F.raw,
                        #end if
                        #if $current.windSpeed.has_data
                        windSpeed: $current.windSpeed.mile_per_hour.raw,
                        #end if
                        #if $current.windGust.has_data
                        windGust: $current.windGust.mile_per_hour.raw,
                        #end if
                        #if $current.barometer.has_data
                        pressure: $current.barometer.inHg.raw,
                        #end if
                        #if $hour.rain.has_data
                        precip1h: $hour($hours_ago=1).rain.sum.inch.raw,
                        #end if
                        #if $current.rainRate.has_data
                        precipRate: $current.rainRate.inch_per_hour.raw,
                        #end if
                        #if $day.rain.has_data
                        24hrain: $day.rain.sum.inch.raw,
                        #end if
        }
        metric: {
                        #if $current.outTemp.has_data
                        temp: $current.outTemp.degree_C.raw,
                        #end if
                        #if $day.outTemp.has_data
                        maxtemp: $day.outTemp.max.degree_C.raw,
                        mintemp: $day.outTemp.min.degree_C.raw,
                        #end if
                        #if $current.appTemp.has_data
                        apptemp: $current.appTemp.degree_C.raw,
                        #end if
                        #if $current.dewpoint.has_data
                        dewpt: $current.dewpoint.degree_C.raw,
                        #end if
                        #if $current.windSpeed.has_data
                        windSpeed: $current.windSpeed.km_per_hour.raw,
                        #end if
                        #if $current.windGust.has_data
                        windGust: $current.windGust.km_per_hour.raw,
                        #end if
                        #if $current.barometer.has_data
                        pressure: $current.barometer.mbar.raw,
                        #end if
                        #if $hour.rain.has_data
                        precip1h: $hour($hours_ago=1).rain.sum.mm.raw,
                        #end if
                        #if $current.rainRate.has_data
                        precipRate: $current.rainRate.mm_per_hour.raw,
                        #end if
                        #if $day.rain.has_data
                        24hrain: $day.rain.sum.mm.raw,
                        #end if
        }
        metric_si: {
                        #if $current.outTemp.has_data
                        temp: $current.outTemp.degree_C.raw,
                        #end if
                        #if $day.outTemp.has_data
                        maxtemp: $day.outTemp.max.degree_C.raw,
                        mintemp: $day.outTemp.min.degree_C.raw,
                        #end if
                        #if $current.appTemp.has_data
                        apptemp: $current.appTemp.degree_C.raw,
                        #end if
                        #if $current.dewpoint.has_data
                        dewpt: $current.dewpoint.degree_C.raw,
                        #end if
                        #if $current.windSpeed.has_data
                        windSpeed: $current.windSpeed.meter_per_second.raw,
                        #end if
                        #if $current.windGust.has_data
                        windGust: $current.windGust.meter_per_second.raw,
                        #end if
                        #if $current.barometer.has_data
                        pressure: $current.barometer.mbar.raw,
                        #end if
                        #if $hour.rain.has_data
                        precip1h: $hour($hours_ago=1).rain.sum.mm.raw,
                        #end if
                        #if $current.rainRate.has_data
                        precipRate: $current.rainRate.mm_per_hour.raw,
                        #end if
                        #if $day.rain.has_data
                        24hrain: $day.rain.sum.mm.raw,
                        #end if
        }
        uk_hybrid: {
                        #if $current.outTemp.has_data
                        temp: $current.outTemp.degree_C.raw,
                        #end if
                        #if $day.outTemp.has_data
                        maxtemp: $day.outTemp.max.degree_C.raw,
                        mintemp: $day.outTemp.min.degree_C.raw,
                        #end if
                        #if $current.appTemp.has_data
                        apptemp: $current.appTemp.degree_C.raw,
                        #end if
                        #if $current.dewpoint.has_data
                        dewpt: $current.dewpoint.degree_C.raw,
                        #end if
                        #if $current.windSpeed.has_data
                        windSpeed: $current.windSpeed.mile_per_hour.raw,
                        #end if
                        #if $current.windGust.has_data
                        windGust: $current.windGust.mile_per_hour.raw,
                        #end if
                        #if $current.barometer.has_data
                        pressure: $current.barometer.mbar.raw,
                        #end if
                        #if $hour.rain.has_data
                        precip1h: $hour($hours_ago=1).rain.sum.mm.raw,
                        #end if
                        #if $current.rainRate.has_data
                        precipRate: $current.rainRate.mm_per_hour.raw,
                        #end if
                        #if $day.rain.has_data
                        24hrain: $day.rain.sum.mm.raw,
                        #end if
        }
    }
}   

*/

/*jshint esversion: 6,node: true,-W041: false */
"use strict";
const request = require('request'),
	converter = require('../util/converter'),
	moment = require('moment-timezone'),
	debug = require('debug')('homebridge-weather-plus');

class WundergroundAPI
{
	constructor(apiKey, location, log)
	{
		this.attribution = 'Powered by Weewx';
		this.reportCharacteristics = [
      'ObservationStation',
      'SolarRadiation',
      'RainBool',
      'ObservationTime',
      'UVIndex',
      'WindDirection',
      'Humidity',
      'Ozone',
      'Temperature',
      'TemperatureApparent'
      'DewPoint',
      'WindSpeed',
      'WindSpeedMax',
      'AirPressure',
      'Rain1h',
      'RainDay'
      
		];

		this.log = log;

		this.location = location;
		this.apiKey = apiKey;

		// Get observation values only in si 's' for now.
		this.units = 's';
	}

	update(forecastDays, callback)
	{
		debug("Updating weather with weewx");
		let weather = {};
		let that = this;
//formatting url as http://site/file.json (using apikey for sitename) location for file name
		const queryUri = "http://" + this.apiKey + "/" + this.location + '.json';
		request(encodeURI(queryUri), function (err, response, body)
		{
			if (!err)
			{
				// Current weather report
				try
				{
					const jsonObj = JSON.parse(body);
					if (jsonObj.errors === undefined || jsonObj.errors.length === 0)
					{
						debug(JSON.stringify(jsonObj, null, 2));
						weather.report = that.parseReport(jsonObj);
						callback(null, weather);
					}
					else
					{
						throw new Error(JSON.stringify(jsonObj.errors, null, 2));
					}
				} catch (e)
				{
					that.log.error("Error retrieving weather report and forecast");
					that.log.error("Error Message: " + e);
					callback(e);
				}
			}
			else
			{
				that.log.error("Error retrieving weather report and forecast");
				that.log.error("Error Message: " + err);
				callback(err);
			}
		}.bind(this));
	}

	parseReport(json)
	{
		let that = this;
		let report = {};

		try
		{
			let observation = json.observations[0];
			let values;
			debug("Units: " + this.units);

			// Get values depending on chosen unit in request
			if (this.units === 's')
			{
				values = observation.metric_si;
			}
			else if (this.units === 'm')
			{
				values = observation.metric;
			}
			else if (this.units === 'e')
			{
				values = observation.imperial;
			}
			else
			{ // 'h'
				values = observation.uk_hybrid;
			}

			report.ObservationStation = observation.stationID;
			report.ObservationTime = moment.unix(observation.epoch).tz(timezone).format('HH:mm:ss');      
			report.WindDirection = converter.getWindDirection(isNaN(parseInt(observation.winddir)) ? 0 : parseInt(observation.winddir));
			report.Humidity = isNaN(observation.humidity) ? 0 : observation.humidity;
			report.SolarRadiation = isNaN(observation.solarRadiation) ? 0 : observation.solarRadiation;
			report.UVIndex = isNaN(observation.uv) ? 0 : observation.uv;
			report.Temperature = isNaN(values.temp) ? 0 : values.temp;
			report.DewPoint = isNaN(values.dewpt) ? 0 : values.dewpt;
			report.AirPressure = isNaN(values.pressure) ? 0 : values.pressure;
      
      
      report.WindSpeed = isNaN(values.windSpeed) ? 0 : values.windSpeed;
			report.WindSpeedMax = isNaN(values.windGust) ? 0 : values.windGust;
			report.RainDay = isNaN(values.24hrain) ? 0 : values.precipTotal;
      report. 

		} catch (error)
		{
			that.log.error("Error parsing weather report for Weather Underground");
			that.log.error("Error Message: " + error);
		}
		return report;
	}

	parseForecasts(forecastObjs, timezone)
	{
		/* NO FORECAST DATA FROM API */
		return [];
	}
}

module.exports = {
	WeewxAPI: WeewxAPI
};
