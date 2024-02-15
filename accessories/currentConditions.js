const version = require("../package.json").version,
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
	this.services = [];

	// Use homekit temperature service or eve weather service depending on compatibility setting
	this.log.debug("Using compatibility mode '%s'", this.config.compatibility);
	if (this.config.compatibility === "eve2")
	{
		this.CurrentConditionsService = new CustomService.EveWeatherService(this.name);
	}
	else if (this.config.compatibility === "home")
	{
		this.CurrentConditionsService = new Service.TemperatureSensor("Temperature", "Temperature");
	}
	else
	{
		this.CurrentConditionsService = new Service.TemperatureSensor(this.name, "Temperature");

		// Separate humidity into a single service if configurated
		if (this.config.extraHumidity)
		{
			this.log.debug("Separating humidity into an extra service");
			this.HumidityService = new Service.HumiditySensor("Humidity")
		}
		
		// Separate light level into a single service if configurated
		if (this.config.extraLightLevel)
		{
			this.log.debug("Separating light level into an extra service");
			this.LightLevelService = new Service.LightSensor("Light Level");
			this.LightLevelService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
				.setProps({
					minValue: 0,
					maxValue: 200000
				});
		}
	}
	this.services.push(this.CurrentConditionsService);


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
				compatibility.createService(this, name, Service, Characteristic, CustomCharacteristic);
			}
			// Use separate services and the temperature service for these characteristics if compatiblity is "both"
			else if (this.config.compatibility === "both" && compatibility.types.includes(name))
			{
				compatibility.createService(this, name, Service, Characteristic, CustomCharacteristic);
				if (name === "Humidity")
				{
					this.CurrentConditionsService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
				}
				else
				{
					this.CurrentConditionsService.addCharacteristic(CustomCharacteristic[name]);
				}
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
			// Use separate service for light level if configured
			else if (this.config.compatibility === "eve" && name === "LightLevel" && this.config.extraLightLevel)
			{
				//
			}
			// illuminance is a general apple home kit characteristic
			else if (name === "LightLevel")
			{
				this.CurrentConditionsService.addCharacteristic(Characteristic.CurrentAmbientLightLevel);
				// Override the defaults for light level as default is too low for daylight
				this.CurrentConditionsService.getCharacteristic(Characteristic.CurrentAmbientLightLevel)
					.setProps({
						minValue: 0,
						maxValue: 200000,
						minStep: 1
					});
			}
			// Battery level is a general apple home kit characteristic
			else if (name === "BatteryLevel")
			{
				this.CurrentConditionsService.addCharacteristic(Characteristic.BatteryLevel);
			}
						// Battery level is a general apple home kit characteristic
			else if (name === "BatteryIsCharging")
			{
				this.CurrentConditionsService.addCharacteristic(Characteristic.ChargingState);
			}
			else if (name === "StatusFault")
			{
				this.CurrentConditionsService.addCharacteristic(Characteristic.StatusFault);
			}
			// Add everything else as a custom characteristic to the temperature service
			else
			{
				this.CurrentConditionsService.addCharacteristic(CustomCharacteristic[name]);
			}
		}
	});
	this.services.concat(compatibility.getServices(this));

	// Create information service
	this.informationService = new Service.AccessoryInformation();
	this.informationService
	.setCharacteristic(Characteristic.Manufacturer, "github.com naofireblade")
	.setCharacteristic(Characteristic.Model, this.platform.stations[stationIndex].attribution)
	.setCharacteristic(Characteristic.SerialNumber, this.config.serial)
	.setCharacteristic(Characteristic.FirmwareRevision, version);
	this.services.push(this.informationService);

	// Create history service
	this.historyService = new FakeGatoHistoryService("custom", this, this.config.fakegatoParameters);
	this.services.push(this.historyService);
}

CurrentConditionsWeatherAccessory.prototype = {
	identify: function (callback)
	{
		Object.keys(this).forEach((key) =>
		{
			if (key.includes("Service") && !key.includes("History") && !key.includes("information"))
			{
				this.log.debug("Service: %s", key);
				this[key].characteristics.forEach((characteristic) =>
				{
					this.log.debug(" - Characteristic: %s", characteristic.displayName);
					this.log.debug("   - UUID: %s", characteristic.UUID);
					this.log.debug("   - Value: %s", characteristic.value);
					this.log.debug("   - Props: %s", characteristic.props);
				});
			}
		});
		callback();
	},

	getServices: function ()
	{
		return this.services;
	}
};
