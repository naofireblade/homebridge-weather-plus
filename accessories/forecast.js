const debug = require('debug')('homebridge-weather-plus'),
	version = require("../package.json").version;

let Service,
	Characteristic,
	CustomCharacteristic;

// TODO Refactoren (lambda foreach, kommentare, bind(this) entfernen, etc

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
	this.serial = this.config.serial + " - Day " + day;

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
	if (this.config.nameForecast)
		this.name = this.config.nameForecast + " " + this.name;
	else if (platform.stationConfigs.length > 1)
		this.name = this.name + (stationIndex > 0 ? (" - " + (stationIndex + 1)) : "");


	this.day = day;

	// Create temperature sensor service that includes temperature characteristic
	this.forecastService = new Service.TemperatureSensor(this.name);


	// Fix negative temperatures not supported by homekit
	this.forecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.stations[stationIndex].forecastCharacteristics.length; i++)
	{
		const name = this.platform.stations[stationIndex].forecastCharacteristics[i];

		// humidity not a custom but a general apple home kit characteristic
		if (name === "Humidity")
		{
			this.forecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== "Temperature")
		{
			this.forecastService.addCharacteristic(CustomCharacteristic[name]);
		}
	}

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