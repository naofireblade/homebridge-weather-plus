const debug = require('debug')('homebridge-weather-plus'),
	version = require("../package.json").version;

let Service,
	Characteristic,
	CustomCharacteristic;

module.exports = function (_Service, _Characteristic, _CustomCharacteristic)
{
	Service = _Service;
	Characteristic = _Characteristic;
	CustomCharacteristic = _CustomCharacteristic;

	return ForecastWeatherAccessory;
};

function ForecastWeatherAccessory(platform, stationIndex, day)
{
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.stationConfigs[stationIndex];
	this.stationIndex = stationIndex;
	this.day = day;
	this.serial = this.config.serial + " - Day " + day;

	// TODO Multilang
	// Get a nice name for the forecast day
	switch (day)
	{
		case 0:
			this.name = "Today";
			break;
		case 1:
			this.name = "In 1 Day";
			break;
		default:
			this.name = "In " + day + " Days";
			break;
	}

	// Add prefix (if configured) or suffix (if multiple stations) to forecast day
	if (this.config.nameForecast)
	{
		this.name = this.config.nameForecast + " " + this.name;
	}
	else if (platform.stationConfigs.length > 1)
	{
		this.name = this.name + (stationIndex > 0 ? (" - " + (stationIndex + 1)) : "");
	}

	// Create temperature sensor service
	this.forecastService = new Service.TemperatureSensor(this.name);

	// Fix for negative temperatures, because they are not supported by homekit
	this.forecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Get all forecast characteristics that are supported by the selected api
	this.platform.stations[stationIndex].forecastCharacteristics.forEach((characteristicName) =>
	{
		// Temperature is an official homekit characteristic
		if (characteristicName === "Temperature")
		{
			// Do nothing, this characteristic is in the temperature service by default
		}
		// Humidity is an official homekit characteristic
		else if (characteristicName === "Humidity")
		{
			// Add humidity to the temperature service
			this.forecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// Everything else is a custom characteristic
		else
		{
			// Add custom charactersitic to the temperature service
			this.forecastService.addCharacteristic(CustomCharacteristic[characteristicName]);
		}
	});

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
	.setCharacteristic(Characteristic.Model, this.platform.stations[stationIndex].attribution)
	.setCharacteristic(Characteristic.SerialNumber, this.serial)
	.setCharacteristic(Characteristic.FirmwareRevision, version);
}

ForecastWeatherAccessory.prototype = {
	identify: function (callback)
	{
		callback();
	},

	getServices: function ()
	{
		return [this.informationService, this.forecastService];
	}
};