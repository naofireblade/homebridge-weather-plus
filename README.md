# homebridge-weather-station-extended

This is a weather station plugin for Nfarina's [Homebridge project](https://github.com/nfarina/homebridge). Its a fork of [homebridge-weather-station](https://github.com/kcharwood/homebridge-weather-station) that doesn't get updated anymore which is a fork of [homebridge-wunderground](https://www.npmjs.com/package/homebridge-wunderground).

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

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-weather-station-extended
3. Update your configuration file. See the sample below.

All you need now is a developer key for Weather Underground which can be easily created [here](http://www.wunderground.com/weather/api/).

# Configuration

Add the following information to your config file. Make sure to add your API key and provice your city or postal code.

```json
"accessories": [
	    {
	      "accessory": "WUWeatherStation",
	      "name": "Weather Station",
	      "key": "XXXXXXXXXXXXXXX",
	      "location": "78613"
	    }
    ]
```

Location can be any value that wunderground is able to associate with a known location (city, state, zip, etc) 