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
		that.AirPressureService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Air Pressure");
	}
	if (name === "CloudCover")
	{
		that.CloudCoverService = new Service.OccupancySensor("Cloud Cover", "Cloud Cover");
		that.CloudCoverService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Cloud Cover");
	}
	if (name === "DewPoint")
	{
		that.DewPointService = new Service.TemperatureSensor("Dew Point", "Dew Point");
		that.DewPointService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
		that.DewPointService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Dew Point");
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
		that.RainBoolService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Rain");
	}
	if (name === "SnowBool")
	{
		that.SnowBoolService = new Service.OccupancySensor("Snow", "Snow");
		that.SnowBoolService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Snow");
	}
	if (name === "TemperatureMin")
	{
		that.TemperatureMinService = new Service.TemperatureSensor("Minimum Temperature", "TemperatureMin");
		that.TemperatureMinService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
		that.TemperatureMinService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Minimum Temperature");
	}
	if (name === "TemperatureApparent")
	{
		that.TemperatureApparentService = new Service.TemperatureSensor("Apparent Temperature", "TemperatureApparent");
		that.TemperatureApparentService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
		that.TemperatureApparentService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Apparent Temperature");
	}
	if (name === "UVIndex")
	{
		that.UVIndexService = new Service.OccupancySensor("UV Index", "UV Index");
		that.UVIndexService.getCharacteristic(Characteristic.ConfiguredName).updateValue("UV Index");
	}
	if (name === "Visibility")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.Visibility);

		that.VisibilityService = new Service.OccupancySensor("Visibility", "Visibility");
		that.VisibilityService.unit = temporaryService.getCharacteristic(CustomCharacteristic.Visibility).props.unit;
		that.VisibilityService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Visibility");
	}
	if (name === "WindDirection")
	{
		that.WindDirectionService = new Service.OccupancySensor("Wind Direction", "Wind Dir");
		that.WindDirectionService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Wind Direction");
	}
	if (name === "WindSpeed")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.WindSpeed);

		that.WindSpeedService = new Service.OccupancySensor("Wind Speed", "Wind Speed");
		that.WindSpeedService.unit = temporaryService.getCharacteristic(CustomCharacteristic.WindSpeed).props.unit;
		that.WindSpeedService.getCharacteristic(Characteristic.ConfiguredName).updateValue("Wind Speed");
	}
	if (name === "RainDay")
	{
		// Get unit
		let temporaryService = new Service.OccupancySensor("Temporary");
		temporaryService.addCharacteristic(CustomCharacteristic.RainDay);

		that.RainDayService = new Service.OccupancySensor("RainDay", "RainDay");
		that.RainDayService.unit = temporaryService.getCharacteristic(CustomCharacteristic.RainDay).props.unit;
		that.RainDayService.getCharacteristic(Characteristic.ConfiguredName).updateValue("RainDay");
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
