# homebridge-weather-station-extended

This is a weather station plugin for [homebridge](https://github.com/nfarina/homebridge). You can download it via [npm](https://www.npmjs.com/package/homebridge-weather-station-extended).

Feel free to leave any feedback [here](https://github.com/naofireblade/homebridge-weather-station-extended/issues).

This plugin is a fork of [homebridge-weather-station](https://github.com/kcharwood/homebridge-weather-station) that doesn't get code updates anymore which is a fork of [homebridge-wunderground](https://www.npmjs.com/package/homebridge-wunderground).

# Measured Values

The following values can be displayed and used in HomeKit rules.

- Temperature
- Air pressure
- Relative humidity
- Rain last hour (precip)
- Rain today (precip)
- UV-Index
- Visibility
- Weather Condition
- Weather Condition Category (Sunny = 0, Cloudy = 1, Rain = 2, Snow = 3)
- Wind direction
- Wind speed
- Station

The Apple Home app just knows temperature and relative humidity at the moment. So use e.g. Elgato Eve app to see and use all values.

# Example use cases

- Switch on a blue light in the morning when it rains and you will need an umbrella today (or white when it snows / yellow when it's sunny).
- Start your automatic garden irrigation in the evening depending on the current weather condition and the amount of precip today.

**Hint:** To trigger rules based on time and weather condition you will need a pluing like [homebridge-delay-switch](https://www.npmjs.com/package/homebridge-delay-switch). Create a dummy switch that resets after some seconds. Set this switch to on with a timed rule. Then create a condition rule that triggers when the switch goes on depending on weather conditions of your choice.

# Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-weather-station-extended`
3. Gather a free developer key for Weather Underground [here](http://www.wunderground.com/weather/api/).
4. Update your configuration file. See the sample below.

### Configuration

Add the following information to your config file. Make sure to add your API key and provice your city or postal code.

```json
"accessories": [
	{
		"accessory": "WUWeatherStationExtended",
		"name": "Weather Station",
		"key": "XXXXXXXXXXXXXXX",
		"location": "78613"
	}
]
```