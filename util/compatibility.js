/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const types = ["AirPressure", "CloudCover", "DewPoint", "Humidity", "Ozone", "RainBool", "SnowBool", "TemperatureMin", "UVIndex", "Visibility", "WindDirection", "WindSpeed"];

const createServices = function (that, Service)
{
	that.AirPressureService = new Service.OccupancySensor("Air Pressure", "Air Pressure");
	that.CloudCoverService = new Service.OccupancySensor("Cloud Cover", "Cloud Cover");
	that.DewPointService = new Service.TemperatureSensor("Dew Point", "Dew Point");
	that.HumidityService = new Service.HumiditySensor("Humidity");
	that.RainBoolService = new Service.OccupancySensor("Rain", "Rain");
	that.SnowBoolService = new Service.OccupancySensor("Snow", "Snow");
	that.TemperatureMinService = new Service.TemperatureSensor("Temperature Min", "TemperatureMin");
	that.UVIndexService = new Service.AirQualitySensor("UV Index", "UV Index");
	that.VisibilityService = new Service.OccupancySensor("Visibility", "Visibility");
	that.WindDirectionService = new Service.OccupancySensor("Wind Direction", "Wind Dir");
	that.WindSpeedService = new Service.OccupancySensor("Wind Speed", "Wind Speed");
};

const customizeServices = function (that, CustomCharacteristic, name)
{
	// Workaround to get configured units
	if (name === "Visibility")
	{
		that.VisibilityService.addCharacteristic(CustomCharacteristic.Visibility);
		let unit = that.VisibilityService.getCharacteristic(CustomCharacteristic.Visibility).props.unit;
		that.VisibilityService.removeCharacteristic(CustomCharacteristic.Visibility);
		that.VisibilityService.unit = unit;
	}
	else if (name === "WindSpeed")
	{
		that.WindSpeedService.addCharacteristic(CustomCharacteristic.WindSpeed);
		let unit = that.WindSpeedService.getCharacteristic(CustomCharacteristic.WindSpeed).props.unit;
		that.WindSpeedService.removeCharacteristic(CustomCharacteristic.WindSpeed);
		that.WindSpeedService.unit = unit;
	}
};

const getServices = function (that)
{
	let services = [];
	types.forEach((name) =>
	{
		let service = name + "Service";
		if (service in that)
		{
			services.push(that[service]);
		}
	});
	return services;
};

module.exports = {
	types,
	createServices,
	customizeServices,
	getServices
};