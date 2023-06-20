/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const types = ["AirPressure", "CloudCover", "DewPoint", "Humidity", "RainBool", "SnowBool", "TemperatureMin", "TemperatureApparent", "UVIndex", "Visibility", "WindDirection", "WindSpeed", "RainDay"];

const createService = function (that, name, Service, Characteristic, CustomCharacteristic)
{
	if (name === "AirPressure")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.AirPressure);

		that.AirPressureService = new Service.OccupancySensor("Air Pressure", "Air Pressure");
		that.AirPressureService.unit = temporaryService.getCharacteristic(CustomCharacteristic.AirPressure).props.unit;
	}
	if (name === "CloudCover")
	{
		that.CloudCoverService = new Service.OccupancySensor("Cloud Cover", "Cloud Cover");
	}
	if (name === "DewPoint")
	{
		that.DewPointService = new Service.TemperatureSensor("Dew Point", "Dew Point");
		that.DewPointService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
	}
	if (name === "Humidity")
	{
		that.HumidityService = new Service.HumiditySensor("Humidity");
	}
	if (name === "LightLevel")
	{
		that.LightLevelService = new Service.LightSensor("Light Level");
		that.LightLevelService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
                                        .setProps({
                                                minValue: 0.0,
                                                maxValue: 200000.0
                                        });
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
		that.TemperatureMinService = new Service.TemperatureSensor("Minimum Temperature", "TemperatureMin");
		that.TemperatureMinService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
	}
	if (name === "TemperatureApparent")
	{
		that.TemperatureApparentService = new Service.TemperatureSensor("Apparent Temperature", "TemperatureApparent");
		that.TemperatureApparentService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
	}
	if (name === "TemperatureWetBulb")
	{
		that.TemperatureWetBulbService = new Service.TemperatureSensor("Wet-Bulb Temperature", "TemperatureWetBulb");
		that.TemperatureWetBulbService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
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
	if (name === "RainDay")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.RainDay);

		that.RainDayService = new Service.OccupancySensor("RainDay", "RainDay");
		that.RainDayService.unit = temporaryService.getCharacteristic(CustomCharacteristic.RainDay).props.unit;
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
