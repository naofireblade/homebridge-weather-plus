# homebridge-weather-plus
[![npm](https://img.shields.io/npm/v/homebridge-weather-plus.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-plus)
[![npm](https://img.shields.io/npm/dt/homebridge-weather-plus.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-plus)
[![GitHub last commit](https://img.shields.io/github/last-commit/naofireblade/homebridge-weather-plus.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-plus)
[![Weather](https://img.shields.io/badge/weather-sunny-edd100.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-plus)

This is a weather plugin for [homebridge](https://github.com/nfarina/homebridge) that features current observations, daily forecasts and history graphs. You can download it via [npm](https://www.npmjs.com/package/homebridge-weather-plus).

If you **update from a version before 2.0.0** you have to adapt your config. See the samples below. You might consider switching your weather service to the newly supported dark sky service.

Feel free to leave any feedback [here](https://github.com/naofireblade/homebridge-weather-plus/issues).

## Current Observations

The following **16 current observation values** can be displayed and used in HomeKit rules. Use a 3rd party app like Elgato Eve to see all values, translations and some nice [icons](#screenshots).

- Air Pressure
- Cloud Cover
- Condition
- Condition Category (Sun = 0, Clouds = 1, Rain = 2, Snow = 3)
- Dew Point
- Humidity
- Ozone
- Rain Last Hour
- Rain All Day
- Solar Radiation
- Temperature
- UV-Index
- Visibility
- Wind Direction
- Wind Speed
- Wind Speed Maximum
- *Observation Time*
- *Observation Station*

## Forecast

The plugin also features forecasts for up to **7 days**. The following **16 forecast values** can be displayed.

- Air Pressure
- Cloud Cover
- Condition
- Condition Category (Sun = 0, Clouds = 1, Rain = 2, Snow = 3)
- Dew Point
- Humidity
- Ozone
- Rain Chance
- Rain All Day
- Temperature Min
- Temperature Max
- UV-Index
- Visibility
- Wind Direction
- Wind Speed
- Wind Speed Maximum

## History

With the eve app you can view the history for

- Air Pressure
- Humidity
- Temperature

## Choose your weather service

This plugin supports multiple weather services. Each has it's own advantages. The following table shows a comparison to help you choosing one.

|                            |            Dark Sky (recommended)            |                   Weather Underground (legacy)                   |
|----------------------------|:--------------------------------------------:|:----------------------------------------------------------------:|
| Current observation values |                      15                      |                                13                                |
| Forecast values            |                      16                      |                                10                                |
| Forecast days              |                       7                      |                                 4                                |
| Location                   |                geo-coordinates               |                         city name or zip                         |
| Personal weather stations  |                      :x:                     |                        :heavy_check_mark:                        |
| Free                       | :heavy_check_mark:                           | :x: (only legacy accounts)                                       |
| Register                   | [here](https://darksky.net/dev/register) | [here](https://www.wunderground.com/weather/api/) |

*You can add more services by forking the project and submitting a pull request.*

## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-weather-plus`
3. Gather an API key for a weather service from the register link in the table above
4. Update your configuration file. See the samples below.

## Configuration

Add one of the following samples to your config file.

### Dark Sky

The **key** parameter is the API key that you get by registering for a weather service in the table above.

The **location** parameter must be a list with the latitude longitude for your location (dont forget the square brackets). You can use this page to find your coordinates: http://www.mapcoordinates.net.

The **language** parameter is *optional* and sets the translation for the description of the day and the weather report. Available languages can be found [here](https://github.com/darkskyapp/translations/tree/master/lib/lang). Default is en.

The **forecast** parameter is *optional* and defines a list of forecast days with 1 for today, 2 for tomorrow etc. Default are none.

```json
"platforms": [
	{
		"platform": "WeatherPlus",
		"name": "WeatherPlus",
		"service": "darksky",
		"key": "XXXXXXXXXXXXXXX",
		"location": [52.5200066, 13.404954],
		"language": "en",
		"forecast": [1,2,3,4,5,6,7]
	}
]
```

### Weather Underground

The **key** parameter is the API key that you get by registering for a weather service in the table above.

The **location** parameter can be a city name or a zip. You can also use a station from the **[Personal Weather Station Network](https://www.wunderground.com/weatherstation/overview.asp)** to receive weather information. Just enter pws:YOURID.

The **forecast** parameter is *optional* and defines a list of forecast days with 1 for today, 2 for tomorrow etc. Default are none.


```json
"platforms": [
	{
		"platform": "WeatherPlus",
		"name": "WeatherPlus",
		"service": "weatherunderground",
		"key": "XXXXXXXXXXXXXXX",
		"location": "New York",
		"forecast": [1,2,3,4]
	}
]
```

### Advanced

You can add the parameter **interval** to set the update interval in minutes. The default value is 4 minutes because the rate for free API keys is limited.

## Example use cases

- Switch on a blue light in the morning when the chance for rain is above 20% today (or white when the forecast condition is snow / yellow when it's sunny).
- Start your automatic garden irrigation in the evening, depending on the amount of rain today and the forecast for tomorrow.

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

## Attribution
- [Powered by Dark Sky](https://darksky.net/poweredby/)
- [Powered Weather Underground](https://www.wunderground.com/)
