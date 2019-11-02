const debug = require('debug')('homebridge-weather-plus'),
	version = require("../package.json").version,
	compatibility = require("../util/compatibility");

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
	this.displayName = this.config.nameNow;
	this.stationIndex = stationIndex;

	// Use homekit temperature service or eve weather service depending on compatibility setting
	debug("Using compatibility mode '%s'", this.config.compatibility);
	if (this.config.compatibility === "eve2")
	{
		this.CurrentConditionsService = new CustomService.EveWeatherService(this.name);
	}
	else if (this.config.compatibility === "home")
	{
		this.CurrentConditionsService = new Service.TemperatureSensor(this.name + " Temperature", "Temperature");
		compatibility.createServices(this, Service);
	}
	else
	{
		this.CurrentConditionsService = new Service.TemperatureSensor(this.name);

		// Separate humidity into a single service if configurated
		if (this.config.extraHumidity)
		{
			debug("Separating humidity into an extra service");
			this.HumidityService = new Service.HumiditySensor("Humidity")
		}
	}


	// Add all current condition characteristics that are supported by the selected api
	this.platform.stations[stationIndex].reportCharacteristics.forEach((name) =>
	{
		if (this.config.hidden.indexOf(name) === -1)
		{
			// Temperature is an official homekit characteristic
			if (name === "Temperature")
			{
				// Fix for negative temperatures, because they are not supported by homekit
				this.CurrentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
			}
			// Use separate services for these characteristics if compatiblity is "home"
			else if (this.config.compatibility === "home" && compatibility.types.includes(name))
			{
				compatibility.customizeServices(this, CustomCharacteristic, name);
			}
			// Use separate service for humidity if configured
			else if (this.config.compatibility === "eve" && name === "Humidity" && this.config.extraHumidity)
			{
				//
			}
			// Add humidity characteristic to temperature service if configured
			else if (name === "Humidity")
			{
				this.CurrentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
			}
			// Add everything else as a custom characteristic to the temperature service
			else
			{
				this.CurrentConditionsService.addCharacteristic(CustomCharacteristic[name]);
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
		return [this.informationService, this.CurrentConditionsService, this.historyService].concat(compatibility.getServices(this));
	}
};