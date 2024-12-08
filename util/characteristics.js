/* jshint asi: true, esversion: 6, laxbreak: true, laxcomma: true, node: true, undef: true, unused: true */

const inherits = require('util').inherits,
	CustomUUID = {
		// Eve UUID
		AirPressure: 'E863F10F-079E-48FF-8F27-9C2605A29F52',

		// Eve recognized UUIDs
		CloudCover: '64392fed-1401-4f7a-9adb-1710dd6e3897',
		Condition: 'cd65a9ab-85ad-494a-b2bd-2f380084134d',
		ConditionCategory: 'cd65a9ab-85ad-494a-b2bd-2f380084134c',
		DewPoint: '095c46e2-278e-4e3c-b9e7-364622a0f501',
		ForecastDay: '57f1d4b2-0e7e-4307-95b5-808750e2c1c7',
		ObservationStation: 'd1b2787d-1fc4-4345-a20e-7b5a74d693ed',
		ObservationTime: '234fd9f1-1d33-4128-b622-d052f0c402af',
		Ozone: 'bbeffddd-1bcd-4d75-b7cd-b57a90a04d13',
		Rain1h: '10c88f40-7ec4-478c-8d5a-bd0c3cce14b7',
		RainBool: 'f14eb1ad-e000-4ef4-a54f-0cf07b2e7be7',
		RainDay: 'ccc04890-565b-4376-b39a-3113341d9e0f',
		RainChance: 'fc01b24f-cf7e-4a74-90db-1b427af1ffa3',
		SnowBool: 'f14eb1ad-e000-4ce6-bd0e-384f9ec4d5dd',
		SolarRadiation: '1819a23e-ecab-4d39-b29a-7364d299310b',
		SunriseTime: '0d96f60e-3688-487e-8cee-d75f05bb3008',
		SunsetTime: '3de24ee0-a288-4e15-a5a8-ead2451b727c',
		TemperatureMin: '707b78ca-51ab-4dc9-8630-80a58f07e419',
		TemperatureApparent: 'c1283352-3d12-4777-acd5-4734760f1ac8',
		UVIndex: '05ba0fe0-b848-4226-906d-5b64272e05ce',
		Visibility: 'd24ecc1e-6fad-4fb5-8137-5af88bd5e857',
		WindDirection: '46f1284c-1912-421b-82f5-eb75008b167e',
		WindSpeed: '49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41',
		WindSpeedMax: '6b8861e5-d6f3-425c-83b6-069945ffd1f1',
		
		// Custom UUIDs
		LightningStrikes: '848c304a-97fe-41df-b284-ec2e2a6f5104',
		LightningAvgDistance: '903043ee-2e82-4272-901e-871d775a4747',
		WindSpeedLull: 'c3b4c4f8-79b7-4b1a-be3c-765ac065c379',
		TemperatureWetBulb: 'dc5c6ca2-ec2c-4d32-8e7a-db4288c2b8d5'
	};

let CustomCharacteristic = {};

// A more accurate way of rounding decimals in Javascript compared to the usual multiply & divide
// See https://www.jacklmoore.com/notes/rounding-in-javascript/ for explanation
function round(value, decimals)
{
	return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

module.exports = function (Characteristic, HomebridgeAPI, units)
{

	units =                    		//	rainfail    temperature    visibility	windspeed    airpressure
		{
			ca: 'ca',        		//	mm       	celsius        kilometers   km/hour		 hPa
			imperial: 'imperial',
			us: 'imperial', 		//	inches   	fahrenheit     miles       	miles/hour   hPa
			si: 'si',
			metric: 'si',			//	mm       	celsius        kilometers   m/second     hPa
			sitorr: 'sitorr',    	//	mm     	 	celsius        kilometers   m/second     mmhg
			uk: 'uk'        		//	mm			celsius        miles       	miles/hour   hPa

		}[units.toLowerCase()];
	if (!units) units = 'si';

	let rainfallProps = (max) =>
	{
		var range = (units !== 'imperial') ? {unit: 'mm', maxValue: max, minValue: 0, minStep: 0.1}
			: {unit: 'in', maxValue: Math.round(max / 25.4), minValue: 0, minStep: 0.01};

		return Object.assign(
			{
				format: HomebridgeAPI.hap.Formats.FLOAT
				, perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			}, range);
	};
	let rainfallValue = (val) =>
	{
		return (units !== 'imperial') ? val : round(val / 25.4, 2);
	};

	let temperatureValue = (celsius) =>
	{
		return units === 'imperial' ? (round(celsius * 1.8, 1)) + 32 : celsius;
	};
	let temperatureProps = (min, max) =>
	{
		var range = {unit: units === 'imperial' ? 'fahrenheit' : HomebridgeAPI.hap.Units.CELSIUS,
						minValue: temperatureValue(min),
						maxValue: temperatureValue(max)};

		return Object.assign(
			{
				format: HomebridgeAPI.hap.Formats.FLOAT
				, minStep: 0.1
				, perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			}, range);
	};

	let km2mi = (km) =>
	{
		return Math.round(km / 1.60934);
	};
	let visibilityProps = (max) =>
	{
		var range = ((units === 'si') || (units === 'sitorr') || (units === 'ca')) ? {unit: 'km', maxValue: max, minValue: 0}
			: {unit: 'mi', maxValue: km2mi(max), minValue: 0};

		return Object.assign(
			{
				format: HomebridgeAPI.hap.Formats.UINT8
				, minStep: 1
				, perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			}, range);
	};
	let visibilityValue = (val) =>
	{
		return ((units === 'si') || (units === 'sitorr') || (units === 'ca')) ? val : km2mi(val);
	};

	let mtos2kmh = (m) =>
	{
		return (round((m * 3600) / 1000, 2));
	};
	let mtos2mih = (m) =>
	{
		return (round((m * 3600) / 1609.34, 2));
	};
	let windspeedProps = (max) =>
	{
		var range = ((units === 'si') || (units === 'sitorr')) ? {unit: 'm/s', maxValue: max, minValue: 0}
			: (units === 'ca') ? {unit: 'km/h', maxValue: mtos2kmh(max), minValue: 0}
				: {unit: 'mph', maxValue: mtos2mih(max), minValue: 0};

		return Object.assign(
			{
				format: HomebridgeAPI.hap.Formats.UINT8
				, minStep: 0.1
				, perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			}, range);
	};
	let windspeedValue = (val) =>
	{
		return ((units === 'si') || (units === 'sitorr')) ? val
			: (units === 'ca') ? mtos2kmh(val)
				: mtos2mih(val);
	};

	let hpa2mmhg = (hpa) =>
	{
		return (round(hpa / 1.3332, 0));
	};
	let airpressureProps = (min, max) =>
	{
		let range = (units === 'sitorr') ? {unit: 'mmhg', maxValue: hpa2mmhg(max), minValue: hpa2mmhg(min)}
			: {unit: 'hPa', maxValue: max, minValue: min};

		return Object.assign(
			{
				format: HomebridgeAPI.hap.Formats.UINT16
				, minStep: 1
				, perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			}, range);
	};
	let airpressureValue = (val) =>
	{
		return (units === 'sitorr') ? hpa2mmhg(val) : val;
	};

	class AirPressureCharacteristic extends Characteristic {
		static _unitvalue = airpressureValue;
	  
		constructor() {
		  super('Air Pressure', CustomUUID.AirPressure);
		  this.setProps(airpressureProps(700, 1100));
		  this.value = this.getDefaultValue();
		}
	}
	CustomCharacteristic.AirPressure = AirPressureCharacteristic;

	class CloudCoverCharacteristic extends Characteristic {
		constructor() {
			super('Cloud Cover', CustomUUID.CloudCover);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT8,
				unit: HomebridgeAPI.hap.Units.PERCENTAGE,
				maxValue: 100,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	}
	CustomCharacteristic.CloudCover = CloudCoverCharacteristic;

	class CustomCharacteristicCondition extends Characteristic {
		constructor() {
			super('Weather Condition', CustomUUID.Condition);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.Condition = CustomCharacteristicCondition;

	class CustomCharacteristicConditionCategory extends Characteristic {
		constructor() {
			super( 'Weather Condition Category', CustomUUID.ConditionCategory);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT8,
				maxValue: 9,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.ConditionCategory = CustomCharacteristicConditionCategory;

	class CustomCharacteristicDewPoint extends Characteristic {
		constructor() {
			super('Dew Point', CustomUUID.DewPoint);
			this.setProps(temperatureProps(-50, 100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.DewPoint = CustomCharacteristicDewPoint;

	class CustomCharacteristicForecastDay extends Characteristic {
		constructor() {
			super('Day', CustomUUID.ForecastDay);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.ForecastDay = CustomCharacteristicForecastDay;

	class CustomCharacteristicObservationStation extends Characteristic {
		constructor() {
			super('Station', CustomUUID.ObservationStation);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.ObservationStation = CustomCharacteristicObservationStation;

	class CustomCharacteristicObservationTime extends Characteristic {
		constructor() {
			super('Observation Time', CustomUUID.ObservationTime);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.ObservationTime = CustomCharacteristicObservationTime;

	class CustomCharacteristicOzone extends Characteristic {
		constructor() {
			super('Ozone', CustomUUID.Ozone);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT16,
				unit: 'DU',
				maxValue: 500,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.Ozone = CustomCharacteristicOzone;

	class CustomCharacteristicRain1h extends Characteristic {
		static _unitvalue = rainfallValue;

		constructor() {
			super('Rain Last Hour', CustomUUID.Rain1h);
			this.setProps(rainfallProps(50));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.Rain1h = CustomCharacteristicRain1h;

	// Sensor if its raining
	// True: It is raining at the moment (current conditions). It will rain on the day (forecast)
	// False: It is not raining at the moment (current conditions). It will not rain on the day (forecast)
	class CustomCharacteristicRainBool extends Characteristic {
		constructor() {
			super('Rain', CustomUUID.RainBool);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.BOOL,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.RainBool = CustomCharacteristicRainBool;

	class CustomCharacteristicRainChance extends Characteristic {
		constructor() {
			super('Rain Chance', CustomUUID.RainChance);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT8,
				unit: HomebridgeAPI.hap.Units.PERCENTAGE,
				maxValue: 100,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.RainChance = CustomCharacteristicRainChance;

	class CustomCharacteristicRainDay extends Characteristic {
		static _unitvalue = rainfallValue;

		constructor() {
			super('Rain All Day', CustomUUID.RainDay);
			this.setProps(rainfallProps(500));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.RainDay = CustomCharacteristicRainDay;


	// Sensor if its snowing
	// True: It is snowing at the moment (current conditions). It will snow on the day (forecast)
	// False: It is not snowing at the moment (current conditions). It will not snow on the day (forecast)
	class CustomCharacteristicSnowBool extends Characteristic {
		constructor() {
			super('Snow', CustomUUID.SnowBool);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.BOOL,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.SnowBool = CustomCharacteristicSnowBool;

	class CustomCharacteristicSolarRadiation extends Characteristic {
		constructor() {
			super('Solar Radiation', CustomUUID.SolarRadiation);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT16,
				unit: "W/m²",
				maxValue: 2000,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.SolarRadiation = CustomCharacteristicSolarRadiation;

	class CustomCharacteristicSunriseTime extends Characteristic {
		constructor() {
			super('Sunrise', CustomUUID.SunriseTime);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.SunriseTime = CustomCharacteristicSunriseTime;

	class CustomCharacteristicSunsetTime extends Characteristic {
		constructor() {
			super('Sunset', CustomUUID.SunsetTime);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.SunsetTime = CustomCharacteristicSunsetTime;

	class CustomCharacteristicTemperatureMin extends Characteristic {
		constructor() {
			super('Temperature Min', CustomUUID.TemperatureMin);
			this.setProps(temperatureProps(-50, 100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.TemperatureMin = CustomCharacteristicTemperatureMin;

	class CustomCharacteristicTemperatureApparent extends Characteristic {
		constructor() {
			super('Apparent temperature', CustomUUID.TemperatureApparent);
			this.setProps(temperatureProps(-50, 100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.TemperatureApparent = CustomCharacteristicTemperatureApparent;

	class CustomCharacteristicUVIndex extends Characteristic {
		constructor() {
			super('UV Index', CustomUUID.UVIndex);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT8,
				maxValue: 15,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.UVIndex = CustomCharacteristicUVIndex;

	class CustomCharacteristicVisibility extends Characteristic {
		static _unitvalue = visibilityValue;

		constructor() {
			super('Visibility', CustomUUID.Visibility);
			this.setProps(visibilityProps(100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.Visibility = CustomCharacteristicVisibility;

	class CustomCharacteristicWindDirection extends Characteristic {
		constructor() {
			super('Wind Direction', CustomUUID.WindDirection);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.STRING,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.WindDirection = CustomCharacteristicWindDirection;

	class CustomCharacteristicWindSpeed extends Characteristic {
		static _unitvalue = windspeedValue;

		constructor() {
			super('Wind Speed', CustomUUID.WindSpeed);
			this.setProps(windspeedProps(100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.WindSpeed = CustomCharacteristicWindSpeed;

	class CustomCharacteristicWindSpeedMax extends Characteristic {
		static _unitvalue = windspeedValue;

		constructor() {
			super('Wind Speed Max', CustomUUID.WindSpeedMax);
			this.setProps(windspeedProps(100));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.WindSpeedMax = CustomCharacteristicWindSpeedMax;

    class CustomCharacteristicWindSpeedLull extends Characteristic {
		static _unitvalue = windspeedValue;

		constructor() {
			super('Wind Speed Lull', CustomUUID.WindSpeedLull);
			this.setProps(windspeedProps(100));
			this.value = this.getDefaultValue();
		}
    };
    CustomCharacteristic.WindSpeedLull = CustomCharacteristicWindSpeedLull;
    
	class CustomCharacteristicLightningStrikes extends Characteristic {
		constructor() {
			super('Lightning Strikes', CustomUUID.LightningStrikes);
			this.setProps({
				format: HomebridgeAPI.hap.Formats.UINT8,
				maxValue: 1000,
				minValue: 0,
				minStep: 1,
				perms: [HomebridgeAPI.hap.Perms.READ, HomebridgeAPI.hap.Perms.NOTIFY]
			});
			this.value = this.getDefaultValue();
		}
    };
    CustomCharacteristic.LightningStrikes = CustomCharacteristicLightningStrikes;

    class CustomCharacteristicLightningAvgDistance extends Characteristic {
		static _unitvalue = visibilityValue;

		constructor() {
			super('Lightning Avg Distance', CustomUUID.LightningAvgDistance);
			this.setProps(visibilityProps(100));
			this.value = this.getDefaultValue();
		}
    };
    CustomCharacteristic.LightningAvgDistance = CustomCharacteristicLightningAvgDistance;

	// @see https://en.wikipedia.org/wiki/Wet-bulb_temperature
	// Max value based on max observed temperature for wet bulb in wikipedia
    class CustomCharacteristicTemperatureWetBulb extends Characteristic {
		constructor() {
			super('Wet-bulb temperature', CustomUUID.TemperatureWetBulb);
			this.setProps(temperatureProps(-50, 40));
			this.value = this.getDefaultValue();
		}
	};
	CustomCharacteristic.TemperatureWetBulb = CustomCharacteristicTemperatureWetBulb;

	return CustomCharacteristic;
};
