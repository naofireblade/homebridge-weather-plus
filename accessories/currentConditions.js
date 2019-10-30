const debug = require('debug')('homebridge-weather-plus'),
	version = require("../package.json").version;

let Service,
	Characteristic,
	CustomService,
	CustomCharacteristic,
	FakeGatoHistoryService;

module.exports = function (_Service, _Characteristic, _CustomService, _CustomCharacteristic, _FakeGatoHistoryService)
{
	Service = _Service;
	Characteristic = _Characteristic;
	CustomService = _CustomService;
	CustomCharacteristic = _CustomCharacteristic;
	FakeGatoHistoryService = _FakeGatoHistoryService;

	return CurrentConditionsWeatherAccessory;
};

function CurrentConditionsWeatherAccessory(platform, stationIndex)
{
	this.platform = platform;
	this.log = platform.log;
	this.config = platform.stationConfigs[stationIndex];
	this.name = this.config.nameNow;
	this.displayName  = this.config.nameNow;
	this.stationIndex = stationIndex;

	// Use homekit temperature service or eve weather service depending on compatibility setting
	debug("Using compatibility mode '%s'", this.config.compatibility);
	if (this.config.compatibility === "eve")
	{
		this.currentConditionsService = new CustomService.EveWeatherService(this.name);
	}
	else
	{
		this.currentConditionsService = new Service.TemperatureSensor(this.name);
	}

	// Fix for negative temperatures, because they are not supported by homekit
	this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Get all current condition characteristics that are supported by the selected api
	this.platform.stations[stationIndex].reportCharacteristics.forEach((characteristicName) =>
	{
		if (this.config.hidden.indexOf(characteristicName) === -1)
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
				this.currentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
			}
			// Everything else is a custom characteristic
			else
			{
				// Add custom charactersitic to the temperature service
				this.currentConditionsService.addCharacteristic(CustomCharacteristic[characteristicName]);

				// Increase upper limit if condition category is set to detailed
				if (characteristicName === "ConditionCategory" && this.config.conditionDetail === "detailed")
				{
					this.currentConditionsService.getCharacteristic(CustomCharacteristic[characteristicName]).props.maxValue = 9;
				}
			}
		}
	});

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
	.setCharacteristic(Characteristic.Model, this.platform.stations[stationIndex].attribution)
	.setCharacteristic(Characteristic.SerialNumber, this.config.serial)
	.setCharacteristic(Characteristic.FirmwareRevision, version);

	// Create history service
	this.historyService = new FakeGatoHistoryService("weather", this, this.config.fakegatoParameters);
}

CurrentConditionsWeatherAccessory.prototype = {
	identify: function (callback)
	{
		callback();
	},

	getServices: function ()
	{
		return [this.informationService, this.currentConditionsService, this.historyService];
	}
};