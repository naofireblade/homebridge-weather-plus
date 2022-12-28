const version = require("../package.json").version,
	compatibility = require("../util/compatibility");

let Service,
	Characteristic,
	CustomService,
	CustomCharacteristic;

module.exports = function (_Service, _Characteristic, _CustomService, _CustomCharacteristic)
{
	Service = _Service;
	Characteristic = _Characteristic;
	CustomService = _CustomService;
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

	// Use homekit temperature service or eve weather service depending on compatibility setting
	if (this.config.compatibility === "eve2")
	{
		this.ForecastService = new CustomService.EveWeatherService(this.name);
	}
	else if (this.config.compatibility === "home")
	{
		this.ForecastService = new Service.TemperatureSensor("Temperature Max", "Temperature Max");
	}
	else
	{
		this.ForecastService = new Service.TemperatureSensor(this.name, "Temperature Max");
	}

	// Get all forecast characteristics that are supported by the selected api
	this.platform.stations[stationIndex].forecastCharacteristics.forEach((name) =>
	{
		if (this.config.hidden.indexOf(name) === -1)
		{
			// Temperature is an official homekit characteristic
			if (name === "TemperatureMax")
			{
				// Fix for negative temperatures, because they are not supported by homekit
				this.ForecastService.getCharacteristic(Characteristic.CurrentTemperature).props.minValue = -50;
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
					this.ForecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
				}
				else
				{
					this.ForecastService.addCharacteristic(CustomCharacteristic[name]);
				}
			}
			// Add humidity characteristic to temperature service
			else if (name === "Humidity")
			{
				this.ForecastService.addCharacteristic(Characteristic.CurrentRelativeHumidity);
			}
			// Add everything else as a custom characteristic to the temperature service
			else
			{
				this.ForecastService.addCharacteristic(CustomCharacteristic[name]);
			}
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
		return [this.informationService, this.ForecastService].concat(compatibility.getServices(this));
	}
};