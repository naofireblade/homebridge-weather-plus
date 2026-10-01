/* jshint asi: true, esversion: 6, laxbreak: true, laxcomma: true, node: true, undef: true, unused: true */

const CustomUUID = {
	// Eve UUID
	EveWeather: 'E863F001-079E-48FF-8F27-9C2605A29F52'
};

let CustomService = {};

module.exports = function (Service, Characteristic)
{
	class EveWeatherService extends Service {
		constructor(displayName, subtype)
		{
			super(displayName, CustomUUID.EveWeather, subtype);
			this.addCharacteristic(Characteristic.CurrentTemperature);
		}
	}
	CustomService.EveWeatherService = EveWeatherService;

	return CustomService;
};
