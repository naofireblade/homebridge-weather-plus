/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const types = ["AirPressure", "CloudCover", "DewPoint", "Humidity", "RainBool", "SnowBool", "TemperatureMin", "UVIndex", "Visibility", "WindDirection", "WindSpeed"];

const createService = function (that, name, Service, CustomCharacteristic)
{
	if (name === "AirPressure")
	{
		that.AirPressureService = new Service.OccupancySensor("Air Pressure", "Air Pressure");
	}
	if (name === "CloudCover")
	{
		that.CloudCoverService = new Service.OccupancySensor("Cloud Cover", "Cloud Cover");
	}
	if (name === "DewPoint")
	{
		that.DewPointService = new Service.TemperatureSensor("Dew Point", "Dew Point");
	}
	if (name === "Humidity")
	{
		that.HumidityService = new Service.HumiditySensor("Humidity");
	}
	if (name === "RainBool")
	{
		that.RainBoolService = new Service.OccupancySensor("Rain", "Rain");
	}
	if (name === "SnowBool")
	{
		that.SnowBoolService = new Service.OccupancySensor("Snow", "Snow");
	}
	if (name === "TemperatureMin")
	{
		that.TemperatureMinService = new Service.TemperatureSensor("Temperature Min", "TemperatureMin");
	}
	if (name === "UVIndex")
	{
		that.UVIndexService = new Service.OccupancySensor("UV Index", "UV Index");
	}
	if (name === "Visibility")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.Visibility);

		that.VisibilityService = new Service.OccupancySensor("Visibility", "Visibility");
		that.VisibilityService.unit = temporaryService.getCharacteristic(CustomCharacteristic.Visibility).props.unit;
	}
	if (name === "WindDirection")
	{
		that.WindDirectionService = new Service.OccupancySensor("Wind Direction", "Wind Dir");
	}
	if (name === "WindSpeed")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.WindSpeed);

		that.WindSpeedService = new Service.OccupancySensor("Wind Speed", "Wind Speed");
		that.WindSpeedService.unit = temporaryService.getCharacteristic(CustomCharacteristic.WindSpeed).props.unit;
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
	createService,
	getServices
};