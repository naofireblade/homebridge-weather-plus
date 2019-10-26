const debug = require('debug')('homebridge-weather-plus'),
	version = require("../package.json").version;

let Service,
	Characteristic,
	CustomService,
	CustomCharacteristic,
	FakeGatoHistoryService;

// TODO Refactoren (lambda foreach, kommentare, bind(this) entfernen, etc

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
	this.nameNow = this.name;  //needed by fakegato for proper logging and file naming
	this.stationIndex = stationIndex;

	// History service FakeGato

	// Create temperature sensor or Eve Weather service that includes temperature characteristic

	if (this.config.compatibility !== "eve")
	{
		this.currentConditionsService = new Service.TemperatureSensor(this.name);
		debug("Using mixed mode for compatibility");
	}
	else
	{
		this.currentConditionsService = new CustomService.EveWeatherService(this.name);
		debug("Using eve mode for compatibility");
	}

	// Fix negative temperatures not supported by homekit
	this.currentConditionsService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;

	// Add additional characteristics to temperature sensor that are supported by the selected api
	for (let i = 0; i < this.platform.stations[stationIndex].reportCharacteristics.length; i++)
	{
		const name = this.platform.stations[stationIndex].reportCharacteristics[i];

		debug("Characteristic-name:" + name);

		// humidity not a custom but a general apple home kit characteristic
		if (name === "Humidity")
		{
			this.currentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
		}
		// temperature is already in the service
		else if (name !== "Temperature")
		{
			this.currentConditionsService.addCharacteristic(CustomCharacteristic[name]);
		}
	}

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