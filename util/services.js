/* jshint asi: true, esversion: 6, laxbreak: true, laxcomma: true, node: true, undef: true, unused: true */

const inherits = require('util').inherits;
const CustomUUID = {
	// Eve UUID
	EveWeather: 'E863F001-079E-48FF-8F27-9C2605A29F52'
};

let CustomService = {};

module.exports = function (Service, Characteristic)
{
	CustomService.EveWeatherService = function (displayName, subtype)
	{
		Service.call(this, displayName, CustomUUID.EveWeather, subtype);
		this.addCharacteristic(Characteristic.CurrentTemperature);
	};
	inherits(CustomService.EveWeatherService, Service);

	return CustomService;
};
