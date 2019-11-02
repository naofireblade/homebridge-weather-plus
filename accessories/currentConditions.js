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
	this.displayName = this.config.nameNow;
	this.stationIndex = stationIndex;
	this.compatibilityTypes = this.config.compatibilityTypes;

	// Use homekit temperature service or eve weather service depending on compatibility setting
	debug("Using compatibility mode '%s'", this.config.compatibility);
	if (this.config.compatibility === "eve2")
	{
		this.CurrentConditionsService = new CustomService.EveWeatherService(this.name);
	}
	else if (this.config.compatibility === "home")
	{
		this.CurrentConditionsService = new Service.TemperatureSensor(this.name + " Temperature", "Temperature");

		this.AirPressureService = new Service.OccupancySensor("Air Pressure", "Air Pressure");
		this.CloudCoverService = new Service.OccupancySensor("Cloud Cover", "Cloud Cover");
		this.DewPointService = new Service.TemperatureSensor("Dew Point", "Dew Point");
		this.HumidityService = new Service.HumiditySensor("Humidity");
		this.RainBoolService = new Service.OccupancySensor("Rain", "Rain");
		this.SnowBoolService = new Service.OccupancySensor("Snow", "Snow");
		this.UVIndexService = new Service.AirQualitySensor("UV Index", "UV Index");
		this.VisibilityService = new Service.OccupancySensor("Visibility", "Visibility");
		this.WindDirectionService = new Service.OccupancySensor("Wind Direction", "Wind Dir");
		this.WindSpeedService = new Service.OccupancySensor("Wind Speed", "Wind Speed");
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
			else if (this.config.compatibility === "home" && this.compatibilityTypes.includes(name))
			{
				// Workaround to get configured units
				if (name === "Visibility")
				{
					this.VisibilityService.addCharacteristic(CustomCharacteristic.Visibility);
					let unit = this.VisibilityService.getCharacteristic(CustomCharacteristic.Visibility).props.unit;
					this.VisibilityService.removeCharacteristic(CustomCharacteristic.Visibility);
					this.VisibilityService.unit = unit;
				}
				else if (name === "WindSpeed")
				{
					this.WindSpeedService.addCharacteristic(CustomCharacteristic.WindSpeed);
					let unit = this.WindSpeedService.getCharacteristic(CustomCharacteristic.WindSpeed).props.unit;
					this.WindSpeedService.removeCharacteristic(CustomCharacteristic.WindSpeed);
					this.WindSpeedService.unit = unit;
				}
			}
			// Use separate service for this characteristic if configured
			else if (this.config.compatibility === "eve" && name === "Humidity" && this.config.extraHumidity)
			{
				//
			}
			// Use separate service for this characteristic if configured
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
		let services = [this.informationService, this.CurrentConditionsService, this.historyService];

		// for (let i = 0; i < customServices.length; i++)
		// {
		// 	let service = customServices[i] + "Service";
		// 	if (service in this)
		// 	{
		// 		services.push(this.service);
		// 	}
		// }

		this.compatibilityTypes.forEach((name) =>
		{
			let service = name + "Service";
			if (service in this)
			{
				services.push(this[service]);
			}
		});

		return services;
	}
};