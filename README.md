# homebridge-weather-plus
[![npm](https://img.shields.io/npm/v/homebridge-weather-plus.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-plus)
[![npm](https://img.shields.io/npm/dt/homebridge-weather-plus.svg?style=flat-square)](https://www.npmjs.com/package/homebridge-weather-plus)
[![GitHub last commit](https://img.shields.io/github/last-commit/naofireblade/homebridge-weather-plus.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-plus)
[![Weather](https://img.shields.io/badge/weather-sunny-edd100.svg?style=flat-square)](https://github.com/naofireblade/homebridge-weather-plus)

This is a weather plugin for [homebridge](https://github.com/nfarina/homebridge) that features current observations, daily forecasts and history graphs for multiple locations and services. You can download it via [npm](https://www.npmjs.com/package/homebridge-weather-plus).  

![Screenshots](https://user-images.githubusercontent.com/12081369/69379083-feb05300-0caf-11ea-9a0d-cf8e1879d007.png)
*Screenshots 2 and 3 are taken from the Elgato Eve app.*

If you like this plugin and find it useful, I would be forever grateful for your support:

<a href="https://www.buymeacoffee.com/naofireblade" target="_blank"><img width="140" src="https://bmc-cdn.nyc3.digitaloceanspaces.com/BMC-button-images/custom_images/orange_img.png" alt="Buy Me A Coffee"></a>

Feel free to leave any feedback [here](https://github.com/naofireblade/homebridge-weather-plus/issues).

## Features
- Get [27 observation and forecast](#observations-and-forecasts) values for up to 7 days
- Choose from 4 different weather [services](#choose-your-weather-service)
- Add [multiple](#multiple-stations-configuration) locations/services
- See the weather [history](#screenshots) in the Eve App
- See (almost) all values, translations and [icons](#screenshots) in the Eve App
- See all values in the Home app with compatiblity mode "Home"
- Use all values in HomeKit rules with the Eve App
- Configure everything easily with the homebridge config-ui-x

## Choose your Weather Service

This plugin supports multiple weather services. Each has it's own advantages. The following table shows a comparison to help you choosing one.

|                            |            Dark Sky <sup>[1](#a1)</sup>      |                   OpenWeatherMap (recommended)                   |            Weather Underground <sup>[2](#a2)</sup>               |                MQTT               |
|----------------------------|:--------------------------------------------:|:----------------------------------------------------------------:|:----------------------------------------------------------------:|:---------------------------------:|
| Current observation values |                      19                      |                                15                                |                                 12                               |                 14                |
| Forecast values            |                      22                      |                                18                                |                                 0                                |                 0                 |
| Forecast days              |                  today + 7                   |                             today + 7                            |                                 0                                |                 0                 |
| Location                   |                geo-coordinates               |                city name, city id, geo-coordinates               |                           station id                             |          geo-coordinates          |
| Personal weather stations  |                      :x:                     |                        :heavy_check_mark:                        |                        :heavy_check_mark:                        |         :heavy_check_mark:        |
| Free                       |   :heavy_check_mark: (only existing users)   |                        :heavy_check_mark:                        |           :heavy_check_mark: (only if you own a station)         |         :heavy_check_mark:        |
| Register                   |                     closed                   | [here](https://openweathermap.org/appid)                         | [here](https://www.wunderground.com/member/api-keys)             | public MQTT broker (or your own!) |

*You can add more services easily by forking the project and submitting a pull request for a new api file.*

> <b name="a1">1</b> [It is no longer possible](https://blog.darksky.net/dark-sky-has-a-new-home/) to register as a new user for Dark Sky. Existing users can use the service until 31.12.2021.  
> <b name="a2">2</b> You can use the weather underground service only if you can provide weather data from your own station in exchange.


## Installation

1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-weather-plus` *Note: The installation might take 5 minutes.*
3. Gather an API key for a weather service from the register link in the table above
4. Configure via the plugin `homebridge-config-ui-x` or update your configuration file manually. See the explanations and samples below.

## Observations and Forecasts

The following observation and forecast values can be displayed and used in HomeKit rules.  
I recommend using the Eve app to see (almost) all the values. However, if you don't want to use a 3rd party app, use the [compatibility mode](#compatibility) `home` for displaying most values in the Apple home app.

- Air Pressure
- Cloud Cover
- Condition
- Condition Category <sup>[3](#a3), </sup><sup>[4](#a4)</sup>
- Dew Point
- Humidity
- Ozone
- Lightning Currently <sup>[5](#a5)</sup>
- Rain Currently
- Rain Last Hour
- Rain All Day
- Rain Chance
- Snow Currently
- Solar Radiation
- Storm Distance <sup>[5](#a5)</sup>
- Sunrise Time
- Sunset Time
- Temperature
- Temperature Min
- Temperature Max
- Temperature Apparent
- UV-Index
- Visibility
- Wind Direction
- Wind Speed
- Wind Speed Maximum
- *Observation Time*
- *Observation Station*
- *Day of the forecast*

> <b name="a3">3</b> Simple: clear (0), overcast (1), rain (2), snow (3)  
> <b name="a4">4</b> Detailed: clear (0), few clouds (1), broken clouds (2), overcast (3), fog (4), drizzle (5), rain (6), hail (7), snow (8), severe weather (9)  
> <b name="a5">5</b> "Lightning Currently" and "Storm Distance" (from the MQTT weather service) are not supported by the Eve app.

## Configuration

Below are example configurations for all weather apis.

### Dark Sky

**key**  
The API key that you get by [registering](https://darksky.net/dev/register) for the Dark Sky service.

**locationGeo**  
List with the latitude and longitude for your location (don't forget the square brackets). You can get your coordinates: [here](http://www.mapcoordinates.net/en).

```json
"platforms": [
	{
		"platform": "WeatherPlus",
		"service": "darksky",
		"key": "YOUR_API_KEY",
		"locationGeo": [52.5200066, 13.404954]
	}
]
```

### OpenWeatherMap

**key**  
The API key that you get by [registering](https://openweathermap.org/appid) for the OpenWeather service.

**locationId**<sup>[6](#a6)</sup>  
Numerical city id, can be found [here](https://openweathermap.org/find).

**locationCity**<sup>[6](#a6)</sup>  
City name and optional country code, can be found [here](https://openweathermap.org/find).

**locationGeo**<sup>[6](#a6)</sup>  
List with the latitude and longitude for your location (don't forget the square brackets). You can get your coordinates: [here](http://www.mapcoordinates.net/en).

> <b name="a6">6</b> You need only **one** of these location options.

```json
"platforms": [
	{
		"platform": "WeatherPlus",
		"service": "openweathermap",
		"key": "YOUR_API_KEY",
		"locationId": 2950159,
		"locationCity": "Berlin, DE",
		"locationGeo": [52.5200066, 13.404954]
	}
]
```

### Weather Underground

Since March 2019 you need to register your own weather station with Weather Underground to get weather data in exchange. After you registered your weather device ([here](https://www.wunderground.com/member/devices)), you can use the API.

**key**  
The API key that you get by [registering](https://www.wunderground.com/member/api-keys) for the Weather Underground service.

**stationId**  
Your personal StationID.

```json
"platforms": [
    {
        "platform": "WeatherPlus",
        "service": "weatherunderground",
        "key": "YOUR_API_KEY",
        "stationId": "YOUR_STATION_ID"
    }
]
```
### MQTT

MQTT is a OASIS standard messaging protocol for the Internet of Things (IoT), which uses a publish-and-subscribe model for transporting data over networks. To use this weather service with homebridge-weather-plus, you will need to have a weather station that can publish its data to an MQTT server (called a "broker") in the payload of an MQTT packet as a JSON object formatted as in the example below.  This weather service adds two observation values which are not supported by Eve Weather, namely LightningBool and StormDist (in kms), in order to support the Austrian Microsystems (AMS) AS3935 Lighting Sensor, which can provide notification of lighting strikes up to 40km (~25 mi) away, and an estimate of the distance to the storm. These observations should display as accessories in "home" or "both" mode. The value for ObservationTime is derived from the values "epoch" (for the UNIX epoch, in seconds), and the decimal "lat"(itude) and "lon"(gitude) values for the geographical location of the weather station which published the data (thanks, CHAMLEX). 

JSON structure: All values not having units are listed first.

```json
"observations" : [
    {
        "observationstation": "My MQTT Station",
        "condition": "Clear",
        "conditioncategory": 0,
        "epoch": 1636155789,
        "humidity": 0,
        "lat": 38.889461,
        "lightningbool": false,
        "lon": 77.035272,
        "rainbool": false,
        "solarradiation": 0,
        "winddirection": "N",
        "imperial": {
                        "airpressure": 933.254,
                        "stormdist": 0,
                        "rain1h": 0,
                        "rainday": 0,
                        "temperature": 72,
                        "windspeed": 0,
                        "windspeedmax": 0
        },
        "metric": {
                        "airpressure": 933.254,
                        "stormdist": 0,
                        "rain1h": 0,
                        "rainday": 0,
                        "temperature": 22.2,
                        "windspeed": 0,
                        "windspeedmax": 0
        },
        "metric_si": {
                        "airpressure": 700,
                        "stormdist": 0,
                        "rain1h": 0,
                        "rainday": 0,
                        "temperature": 22.2,
                        "windspeed": 0,
                        "windspeedmax": 0
        },
        "uk_hybrid": {
                        "airpressure": 933.254,
                        "stormdist": 0,
                        "rain1h": 0,
                        "rainday": 0,
                        "temperature": 22.2,
                        "windspeed": 0,
                        "windspeedmax": 0
]
```

**key**  
The MQTT weather service doesn't use a key, but uses the value of "key" to store the location of your MQTT broker's URL.  Enter the MQTT broker's full URL, including the port number (usually 1883).

**locationCity**  
Used to indicate your weather station's name.  homebridge-weather-plus requires a value for this field in order to run, but it can be any text you want.

```json
"platforms": [
    {
        "platform": "WeatherPlus",
        "service": "mqtt",
        "key": "http://mqtt.lan:1833/",
        "locationCity": "My MQTT Station"
    }
]
```
## Advanced Configuration

Below are explanations for a lot of advanced parameters to adjust the plugin to your needs. All parameters are *optional*.

<b name="compatibility">compatibility</b>  
Compatibility for the Apple Home app, the Eve app or both. This is required due to limitations in the Apple Home app recognized weather conditions. The default is `"eve"`.  
`"eve"` **(recommended)** Use this for the Eve app or another 3rd party HomeKit App. All conditions will be displayed. The Apple Home app will show only temperature and humidity.   
`"eve2"` Same as above but the values for temperature, humidity and pressure will be grouped into a single row. The Apple Home app will show nothing.  
`"home"` Use this if you don't want to install a 3rd party HomeKit App but want to see as many values as possible in the Apple Home app<sup>[6](#a4)</sup>. 3rd party apps will show some useless sensors that are required for Home app support.  
`"both"` Combines eve and home. You will need to hide some useless sensors in the Eve app that are required for Home app support. But after that you will get a solution that looks nice in the Home app and in 3rd party apps at the same time.
> <b name="a6">6</b> The following values will be represented as occupancy sensors that trigger on specific limits: CloudCover > 20%, UVIndex > 2, WindSpeed > 4 m/s, Rain, Snow

**conditionCategory**  
Detail level of the condition category. Not available for WeatherUnderground. Default is `"simple"`.  
`"simple"` [4 different categories](#a2)  
`"detailed"` [10 different categories](#a3)

**extraHumidity**  (compatibility `"eve"` or `"both"`)  
Separate humidity from the weather accessory to an own accessory if set to `true`. Default is `false`.

**forecast**  
List of forecast days with 0 for today, 1 for tomorrow, 2 for in 2 days etc. Default are none `[]`. Maximum depends on the choosen [weather service](#choose-your-weather-service).

**hidden**  
List of observation and forecast values that should not be displayed. Possible options are `["AirPressure", "CloudCover", "Condition", "ConditionCategory", "DewPoint", "ForecastDay", "Humidity", "LightingBool", "ObservationStation", "ObservationTime", "Ozone", "Rain1h", "RainBool", "RainChance", "RainDay", "SnowBool", "SolarRadiation", "StormDist", "TemperatureMin", "UVIndex", "Visibility", "WindDirection", "WindSpeed", "WindSpeedMax"]`. Don't forget the square brackets.

**interval**  
Update interval in minutes. The default is `4` minutes because the rate for free API keys is limited.

**language**  
Translation for the current day and the weather report. Available languages can be found [here](https://github.com/darkskyapp/translations/tree/master/lib/lang). The default is `en`.

**nameNow**  
Name for the current condition accessory. The default is `"Now"`. You could set this to your city name or weather service type.

**nameForecast**  
Name for the forecast accessories. Adds a prefix to the forecast days. You could set this to your city name or weather service type as well.

**now**
Option to hide the Now accessory if you only need forecasts. Default is `true` which shows the Now accessory. Set to `false` to hide it.

**units**  
Conversions used for reporting values. The default is `"metric"`. The options are:  
`"si"` or `"metric"`  
`"sitorr"` to report air pressure in mmhg  
`"us"` or `"imperial"`  
`"ca"` to report wind speeds in km/h
`"uk"` to report visibility in miles and wind speeds in miles/h

**thresholdAirPressure** (compatibility `"home"` or `"both"`)  
At what threshold should the air pressure sensor trigger? Provide a number without unit. The range depends on your unit setting (sitorr -> mmhg, otherwise -> hPa).

**thresholdCloudCover** (compatibility `"home"` or `"both"`)  
At what threshold should the cloud cover sensor trigger? Provide a number between 0 (clear) and 100 (overcast).

**thresholdUvIndex** (compatibility `"home"` or `"both"`)  
At what threshold should the UV-Index sensor trigger? Provide a number >= 0. See https://en.wikipedia.org/wiki/Ultraviolet_index

**thresholdWindSpeed** (compatibility `"home"` or `"both"`)  
At what threshold should the wind speed sensor trigger? Provide a number without unit. The range depends on your unit setting (si/metric/sitorr -> m/s, ca -> km/h, uk/us/imperial -> miles/h).

**fakegatoParameters**  
Customization of the history storage system. By default, the history is persisted on the filesystem. You can set your own option using this parameter. In order to change the [location of the persisted file](https://github.com/simont77/fakegato-history#file-system) or to use [GoogleDrive](https://github.com/simont77/fakegato-history#google-drive).
 **Do not** modify the parameter for the fakegato internal timer.

### Example

```json
"platforms": [
    {
        "platform": "WeatherPlus",
        "service": "darksky",
        "key": "XXXXXXXXXXXXXXX",
        "locationGeo": [52.5200066,13.404954],
        "compatibility": "both",
        "conditionCategory": "detailed",
        "forecast": [0,1,2,3,4,5,6],
        "hidden": ["CloudCover", "DewPoint"],
        "interval": 5,
        "language": "en",
        "nameNow": "Berlin",
        "nameForecast": "Berlin Forecast",
        "now": true,
        "units": "metric"
    }
]
```

## Multiple Stations Configuration

You can set up multiple stations for different locations and weather services by putting your configuration in a **stations** array.
The following parameters are global and must be placed outside of the array: `platform`, `interval`, `units`.

Each stations must have a unique displayName. If you don't set one, the plugin will take care of that.

### Example

```json
"platforms": [
    {
        "platform": "WeatherPlus",
        "interval": 5,
        "units": "si",
        "stations": [
            {
                "displayName": "Berlin",
                "displayNameForecast": "Berlin forefacst",
                "service": "darksky",
                "key": "YOUR_API_KEY",
                "forecast": [0,1,2,3,4,5,6],
                "locationGeo": [52.5200066,13.404954]
            },
            {
                "displayName": "Los Angeles",
                "displayNameForecast": "Los Angeles forecast",
                "service": "darksky",
                "key": "YOUR_API_KEY",
                "forecast": [1],
                "locationGeo": [34.0536909,-118.2427666]
            }
        ]
    }
]
```

## Example Use Cases

- Switch on a blue light in the morning when the chance for rain is above 20% today (or white when the forecast condition is snow / yellow when it's sunny).
- Start your automatic garden irrigation in the evening, depending on the amount of rain today and the forecast for tomorrow.

**Hint:** To trigger rules based on time and weather condition you will need a plugin like [homebridge-delay-switch](https://www.npmjs.com/package/homebridge-delay-switch). Create a dummy switch that resets after some seconds. Set this switch to on with a timed rule. Then create a condition rule that triggers when the switch goes on depending on weather conditions of your choice.

## Contributors
Many thanks to the awesome contributors who support the project with pull requests (chronological order):
- [simont77](https://github.com/simont77) for his fakegato-history library, the eve weather emulation, the multiple stations feature and several other great improvements
- [GatoPharaoh](https://github.com/GatoPharaoh) for his interval option pull request
- [David Werth](https://github.com/werthdavid) for integrating the OpenWeatherMap and Yahoo apis
- [Marshall T. Rose](https://github.com/mrose17) for adding support for imperial units and the displayName parameter
- [Bill Waggoner](https://github.com/ctgreybeard) for his fix for the crashing wunderground api
- [Russell Sonnenschein](https://github.com/ctgreybeard) for adding the new 2019 weatherunderground api
- [Jay O'Conor](https://github.com/joconor) for improving the value rounding and fixing the wind sensor for non metric units
- [Angela Herring](https://github.com/angelaherring) for adding compatibilty mode for total precip and improving the WeatherUnderground integration

This plugin is a fork of [homebridge-weather-station](https://github.com/kcharwood/homebridge-weather-station) which is no longer being developed. That one was a fork of [homebridge-wunderground](https://www.npmjs.com/package/homebridge-wunderground).

## Attribution
- [Powered by Dark Sky](https://darksky.net/poweredby/)
- [Powered by Weather Underground](https://www.wunderground.com/)
- [Powered by OpenWeatherMap](https://openweathermap.org/)
- [Powered by MQTT](https://mqtt.org/)
