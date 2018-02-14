# homebridge-weather-station-extended
[![npm](https://img.shields.io/npm/v/homebridge-weather-station-extended.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-station-extended)
[![npm](https://img.shields.io/npm/dt/homebridge-weather-station-extended.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-station-extended)
[![GitHub last commit](https://img.shields.io/github/last-commit/naofireblade/homebridge-weather-station-extended.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-station-extended)
[![Weather](https://img.shields.io/badge/weather-sunny-edd100.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-station-extended)

This is a weather station plugin for [homebridge](https://github.com/nfarina/homebridge) that features current observations, daily forecasts and history graphs. You can download it via [npm](https://www.npmjs.com/package/homebridge-weather-station-extended).

If you **update from a version before 1.2.0** and want to see the history graphs, you have to remove and reinstall the eve app. Your devices and rules will remain unchanged.

Feel free to leave any feedback [here](https://github.com/naofireblade/homebridge-weather-station-extended/issues).

## Current Observations

The following current observation values can be displayed and used in HomeKit rules. Use a 3rd party app like Elgato Eve to see all values, translations and some nice [icons](#screenshot).

- Temperature
- Air Pressure
- Relative Humidity
- Rain Last Hour
- Rain All Day
- UV-Index
- Solar Radiation
- Visibility
- Weather Condition
- Weather Condition Category (Sun = 0, Clouds = 1, Rain = 2, Snow = 3)
- Wind Direction
- Wind Speed
- Wind Speed Maximum
- Observation Station
- Observation Time

## Forecast

The plugin also features a daily forecast for today and the next 3 days. The following forecast values can be displayed.

- Temperature
- Temperature Minimum
- Relative Humidity
- Chance Rain
- Rain All Day
- Weather Condition
- Weather Condition Category
- Wind Direction
- Wind Speed
- Wind Speed Maximum

## History

With the eve app you can view the history for

- Temperature
- Air Pressure
- Relative Humidity

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-weather-station-extended`
3. Gather a free developer key for Weather Underground [here](http://www.wunderground.com/weather/api/).
4. Update your configuration file. See the samples below.

## Configuration

Add the following information to your config file. Make sure to add your API **key** and provide your city or postal code in the **location** field.

### Simple

```json
"platforms": [
	{
		"platform": "WeatherStation",
		"name": "Weather Station",
		"key": "XXXXXXXXXXXXXXX",
		"location": "78613"
	}
]
```

### Advanced

The following config contains advanced optional settings that must not be specified.

The parameter **interval** sets the interval (minutes) in which the weather will be updated from Weather Underground. The default value is 4 minutes, which fits in the maximum of 400 updates per day for free accounts.

The parameter **forecast** sets which forecasts you want to see. You can set one of these three values: none, today, 3days. The default value is 3days.

You can also use a station from the **[Personal Weather Station Network](https://www.wunderground.com/weatherstation/overview.asp)** to receive weather information. Just enter pws:YOURID in the **location** parameter.

```json
"platforms": [
	{
		"platform": "WeatherStation",
		"name": "Weather Station",
		"interval": "4",
		"key": "XXXXXXXXXXXXXXX",
		"location": "pws:ICALIFOR123",
		"forecast": "3days"
	}
]
```

## Example use cases

- Switch on a blue light in the morning when the chance for rain is above 20% today (or white when the forecast condition is snow / yellow when it's sunny).
- Start your automatic garden irrigation in the evening depending on the amount of rain today and the forecast for tomorrow.

**Hint:** To trigger rules based on time and weather condition you will need a plugin like [homebridge-delay-switch](https://www.npmjs.com/package/homebridge-delay-switch). Create a dummy switch that resets after some seconds. Set this switch to on with a timed rule. Then create a condition rule that triggers when the switch goes on depending on weather conditions of your choice.

## Screenshots
![Current Conditions in Elgato Eve app](https://i.imgur.com/ql9t8w0l.png)
![History graph in Elgato Eve app](https://i.imgur.com/8opO7hel.png)
>(c) Screenshots are taken from the Elgato Eve app

## Contributors
Many thanks go to
- [Kevin Harwood](https://github.com/kcharwood) for his original homebridge-weather-station
- [Clark Endrizzi](https://github.com/cendrizzi) for his wundergroundnode library
- [simont77](https://github.com/simont77) for his fakegato-history library
- [GatoPharaoh](https://github.com/GatoPharaoh) for his interval option pull request

This plugin is a fork of [homebridge-weather-station](https://github.com/kcharwood/homebridge-weather-station) which is no longer being developed. That one is a fork of [homebridge-wunderground](https://www.npmjs.com/package/homebridge-wunderground).
