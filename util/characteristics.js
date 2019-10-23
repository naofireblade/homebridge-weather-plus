/* jshint asi: true, esversion: 6, laxbreak: true, laxcomma: true, node: true, undef: true, unused: true */

var underscore = require('underscore');

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
        RainDay: 'ccc04890-565b-4376-b39a-3113341d9e0f',
        RainChance: 'fc01b24f-cf7e-4a74-90db-1b427af1ffa3',
        SolarRadiation: '1819a23e-ecab-4d39-b29a-7364d299310b',
        TemperatureMin: '707b78ca-51ab-4dc9-8630-80a58f07e419',
        UVIndex: '05ba0fe0-b848-4226-906d-5b64272e05ce',
        Visibility: 'd24ecc1e-6fad-4fb5-8137-5af88bd5e857',
        WindDirection: '46f1284c-1912-421b-82f5-eb75008b167e',
        WindSpeed: '49C8AE5A-A3A5-41AB-BF1F-12D5654F9F41',
        WindSpeedMax: '6b8861e5-d6f3-425c-83b6-069945ffd1f1'
    };

var CustomCharacteristic = {};

module.exports = function (Characteristic, units) {

    units =                    // rainfail    temperature    visibility    windspeed
      { ca       : 'ca'        //    mm       celsius        kilometers    km/hour
      , imperial : 'imperial'  //  inches     fahrenheit       miles       miles/hour
      , si       : 'si'        //    mm       celsius        kilometers    m/second
      , uk       : 'uk'        //    mm       celsius          miles       miles/hour

      , metric   : 'si'
      , us       : 'imperial'
      }[units.toLowerCase()];
    if (!units) units = 'si';

    var rainfallProps = (max) => {
        var range = (units !== 'imperial') ? { unit: 'mm', maxValue: max,                    minValue: 0, minStep: 0.1 }
                                           : { unit: 'in', maxValue: Math.round(max / 25.4), minValue: 0, minStep: 0.01 };

        return underscore.extend(
          { format  : Characteristic.Formats.FLOAT
          , perms   : [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
          }, range);
    };
    var rainfallValue = (val) => {
      return (units !== 'imperial') ? val : (val / 25.4);
    };

    var c2f = (celsius) => { return (celsius * 1.8) + 32; };
    var temperatureProps = (max, min) => {
        var range = (units !== 'imperial') ? { unit: Characteristic.Units.CELSIUS, maxValue: max,      minValue: min }
                                           : { unit: 'fahrenheit',                 maxValue: c2f(max), minValue: c2f(min) };

        return underscore.extend(
          { format  : Characteristic.Formats.FLOAT
          , minStep : 0.1
          , perms   : [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
          }, range);
    };

    var km2mi = (km) => { return Math.round(km / 1.60934); };
    var visibilityProps = (max) => {
        var range = ((units === 'si') || (units == 'ca')) ? { unit: 'km', maxValue: max,        minValue: 0 }
                                                          : { unit: 'mi', maxValue: km2mi(max), minValue: 0 };

        return underscore.extend(
          { format  : Characteristic.Formats.UINT8
          , minStep : 1
          , perms   : [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
          }, range);
    };
    var visibilityValue = (val) => {
      return ((units === 'si') || (units === 'ca')) ? val : km2mi(val);
    };

    var mtos2kmh = (m) => { return ((m * 3600) / 1000); };
    var mtos2mih = (m) => { return ((m * 3600) / 1609.34); };
    var windspeedProps = (max) => {
        var range = (units === 'si') ? { unit: 'm/s',  maxValue: max,           minValue: 0 }
                  : (units === 'ca') ? { unit: 'km/h', maxValue: mtos2kmh(max), minValue: 0 }
                                     : { unit: 'mph',  maxValue: mtos2mih(max), minValue: 0 };

        return underscore.extend(
          { format  : Characteristic.Formats.UINT8
          , minStep : 0.1
          , perms   : [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
          }, range);
    };
    var windspeedValue = (val) => {
      return (units === 'si') ? val 
           : (units === 'ca') ? mtos2kmh (val)
                              : mtos2mih(val);
    };

    CustomCharacteristic.AirPressure = function () {
        Characteristic.call(this, 'Air Pressure', CustomUUID.AirPressure);
        this.setProps({
            format: Characteristic.Formats.UINT16,
            unit: "hPa",
            maxValue: 1100,
            minValue: 700,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.AirPressure, Characteristic);

    CustomCharacteristic.CloudCover = function () {
        Characteristic.call(this, 'Cloud Cover', CustomUUID.CloudCover);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: Characteristic.Units.PERCENTAGE,
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.CloudCover, Characteristic);

    CustomCharacteristic.Condition = function () {
        Characteristic.call(this, 'Weather Condition', CustomUUID.Condition);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.Condition, Characteristic);

    CustomCharacteristic.ConditionCategory = function () {
        Characteristic.call(this, 'Weather Condition Category', CustomUUID.ConditionCategory);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            maxValue: 3,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.ConditionCategory, Characteristic);

    CustomCharacteristic.DewPoint = function () {
        Characteristic.call(this, 'Dew Point', CustomUUID.DewPoint);
        this.setProps(temperatureProps(50, -50));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.DewPoint, Characteristic);
/* Eve sees the 'fahrenheit' and does the calculation itself!

    CustomCharacteristic.DewPoint._unitvalue = temperatureValue;
 */

    CustomCharacteristic.ForecastDay = function () {
        Characteristic.call(this, 'Day', CustomUUID.ForecastDay);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.ForecastDay, Characteristic);

    CustomCharacteristic.ObservationStation = function () {
        Characteristic.call(this, 'Station', CustomUUID.ObservationStation);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.ObservationStation, Characteristic);

    CustomCharacteristic.ObservationTime = function () {
        Characteristic.call(this, 'Observation Time', CustomUUID.ObservationTime);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.ObservationTime, Characteristic);

    CustomCharacteristic.Ozone = function () {
        Characteristic.call(this, 'Ozone', CustomUUID.Ozone);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: 'DU',
            maxValue: 500,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.Ozone, Characteristic);

    CustomCharacteristic.Rain1h = function () {
        Characteristic.call(this, 'Rain Last Hour', CustomUUID.Rain1h);
        this.setProps(rainfallProps(50));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.Rain1h, Characteristic);
    CustomCharacteristic.Rain1h._unitvalue = rainfallValue;

    CustomCharacteristic.RainChance = function () {
        Characteristic.call(this, 'Rain Chance', CustomUUID.RainChance);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: Characteristic.Units.PERCENTAGE,
            maxValue: 100,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.RainChance, Characteristic);

    CustomCharacteristic.RainDay = function () {
        Characteristic.call(this, 'Rain All Day', CustomUUID.RainDay);
        this.setProps(rainfallProps(500));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.RainDay, Characteristic);
    CustomCharacteristic.RainDay._unitvalue = rainfallValue;

    CustomCharacteristic.SolarRadiation = function () {
        Characteristic.call(this, 'Solar Radiation', CustomUUID.SolarRadiation);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            unit: "W/m²",
            maxValue: 2000,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.SolarRadiation, Characteristic);

    CustomCharacteristic.TemperatureMin = function () {
        Characteristic.call(this, 'Temperature Min', CustomUUID.TemperatureMin);
        this.setProps(temperatureProps(50, -50));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.TemperatureMin, Characteristic);
/* Eve sees the 'fahrenheit' and does the calculation itself!

    CustomCharacteristic.TemperatureMin._unitvalue = temperatureValue;
 */

    CustomCharacteristic.UVIndex = function () {
        Characteristic.call(this, 'UV Index', CustomUUID.UVIndex);
        this.setProps({
            format: Characteristic.Formats.UINT8,
            maxValue: 10,
            minValue: 0,
            minStep: 1,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.UVIndex, Characteristic);

    CustomCharacteristic.Visibility = function () {
        Characteristic.call(this, 'Visibility', CustomUUID.Visibility);
        this.setProps(visibilityProps(100));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.Visibility, Characteristic);
    CustomCharacteristic.Visibility._unitvalue = visibilityValue;

    CustomCharacteristic.WindDirection = function () {
        Characteristic.call(this, 'Wind Direction', CustomUUID.WindDirection);
        this.setProps({
            format: Characteristic.Formats.STRING,
            perms: [Characteristic.Perms.READ, Characteristic.Perms.NOTIFY]
        });
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.WindDirection, Characteristic);

    CustomCharacteristic.WindSpeed = function () {
        Characteristic.call(this, 'Wind Speed', CustomUUID.WindSpeed);
        this.setProps(windspeedProps(100));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.WindSpeed, Characteristic);
    CustomCharacteristic.WindSpeed._unitvalue = windspeedValue;

    CustomCharacteristic.WindSpeedMax = function () {
        Characteristic.call(this, 'Wind Speed Max', CustomUUID.WindSpeedMax);
        this.setProps(windspeedProps(100));
        this.value = this.getDefaultValue();
    };
    inherits(CustomCharacteristic.WindSpeedMax, Characteristic);
    CustomCharacteristic.WindSpeedMax._unitvalue = windspeedValue;

    return CustomCharacteristic;
};
