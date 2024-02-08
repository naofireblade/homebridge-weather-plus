## 0.1.0

* Added characteristics for precip 1 hour, precip today, wind direction, wind speed, air pressure, visibility, uv-index and station
* Added condition category for sunny weather
* Renamed condition values to condition categories
* Changed condition category values
* Changed service to temperature-sensor so that the device is recognized by apple home app

## 0.1.2

* Added optional parameter "interval"
* Added debug library

## 1.0.0

* Added forecast for today
* Added forecast for next three days
* Added configuration for forecast
* Added observation time
* Added chance for rain
* Added wind speed max
* Changed plugin type to platform

## 1.0.1

* Changed names of accessories

## 1.0.2

* Fixed config example in readme

## 1.0.3

* Added screenshot to description

## 1.0.4

* Added condition solar radiation
* Added log output of API response to identify function

## 1.1.0

* Added forecast temperature minimum

## 1.1.1

* Fixed negative temperatures shown as 0°C

## 1.1.2

* Fixed handling of sometimes flawed weather underground responses

## 1.2.0

* Added history in eve app for temperature, relative humidity and air pressure

## 1.2.1

* Added persistence for history to handle homebridge restarts
* Fixed history has gaps with interval greater than 10 minutes

## 1.2.2

* Fixed mix-up between air pressure and relative humidity

## 1.2.3

* Fixed a crash on startup

## 2.0.0

* Renamed from homebridge-weather-station-extended to homebridge-weather-plus
* Added support for multiple apis
* Added support for dark-sky api
* Added condition ozone (dark-sky only)
* Added condition cloud cover (dark-sky only)
* Added condition dew point (dark-sky only)
* Added forecast for 7 days instead of 4 (dark-sky only)
* Added forecast for air pressure (dark-sky only)
* Added forecast for cloud cover (dark-sky only)
* Added forecast for dew point (dark-sky only)
* Added forecast for ozone (dark-sky only)
* Added forecast for uv-index (dark-sky only)
* Added forecast for visibility (dark-sky only)
* Added language for day and weather description (dark-sky only)
* Changed configuration to support multiple apis
* Changed configuration to set exact forecast days

## 2.0.1

* Changed readme

## 2.0.2

* Changed readme

## 2.1.0

* Added support for the OpenWeatherMap api

## 2.2.0

* Added support for different units

## 2.3.0

* Added displayName parameter

## 2.4.0

* Added support for the Yahoo api

## 2.5.0

* Added option to show Current Conditions as Eve Weather emulation
* Added option to pass parameters to fakegato
* Added option to rename forecastAccessory
* Added plugin version to Accessory Info
* Updated debug dependency

## 2.6.0

* Added option to set serial number
* Changed history timer to make use of advantages in newer fakegato version
* Fixed precipitation calculation in dark sky api

## 2.7.0
* Added support for multiple weather stations

## 2.7.1
* Fixed crash of homebridge when using expired weather underground api

## 2.7.2
* Updated openweathermap dependency to v4.0.0

## 2.8.0
* Removed old weather underground api (pre March 2019)
* Added new weather underground api (post January 2019)

## 2.8.1
* Fixed crash in openweathermap api that occured since v2.8.0

## 2.8.2
* Fixed crash in weatherunderground on malformed/missing server response

## 3.0.0
* Added compatiblity mode for Apple Home app
* Added boolean sensors for currently raining / snowing
* Added boolean sensors for rain / snow in the forecast
* Added option to hide observation and forecast values 
* Added option to have more detailed condition categories
* Added option to show humidity as an extra accessory
* Added option to disable the Now accessory
* Changed readme to improve comprehensibility
* Changed naming of some parameters (all backwards compatible, no need to update your config)
* Fixed unsupported forecast day would throw an error in the darksky api
* Fixed incorrect condition category for mostly cloudy days in the darksky api (was 0, is now 1)
* Removed serial parameter (automatically assigned now)

* Warning: Weather history graphs will be cleared and start from scratch with this update

## 3.0.1
* Updated readme

## 3.0.2
* Updated readme

## 3.0.3
* Added rounding for non metric values in Apple Home app

## 3.0.4
* Improved rounding
* Fixed wind sensor trigger for non metric units

## 3.1.0
* Added support for config-ui-x
* Added custom thresholds for apple home sensors

## 3.1.1
* Added unit sitorr for air pressure in mmhg

## 3.1.2
* Added one more day to Dark Sky forecast
* Improved error logging for Weather Underground
* Updated the readme to point out Dark Sky discontinuation
* Updated dependencies
* Fixed undefined this.log when converting unkown weather categories
* Fixed RainBool threshold too strict in DarkSky service

## 3.1.3
* Changed minimum required node js version to v10

## 3.1.4
* Fixed crash in OpenWeatherMap API

## 3.2.0
* Added cloud cover to OpenWeatherMap
* Added dew point to OpenWeatherMap
* Added rain last hour to OpenWeatherMap
* Added rain all day to OpenWeatherMap
* Added apparent temperature to OpenWeatherMap
* Added uv index to OpenWeatherMap
* Added sunrise and sunset to OpenWeatherMap
* Added 3 more forecast days to OpenWeatherMap (today + 7)
* Added apparent temperature to DarkSky
* Added sunrise and sunset to DarkSky
* Improved integration into config-ui-x
* Changed precision of dew point, min temperature and max temperature from 0.1 degree to 1 degree
* Changed precision of rain last hour from 1 mm to 0.1 mm
* Fixed city name with optional country code will not be found in OpenWeatherMap
* Fixed some missing weather categories for OpenWeatherMap

## 3.2.1
* Improved error handling when the service parameter is missing in config
* Fixed spelling of threshold parameter (old variant is still working)
* Fixed crash in WeatherUnderground API when an error occurs

## 3.2.2
* Added compatibility sensor for total precipitation
* Changed precision of WeatherUnderground API to decimal
* Fixed crash when OpenWeatherMap API returns no data

## 3.2.3
* Fixed apparent temperature and dew point not responding if lower than 0°C

## 3.2.4
* Fixed temperature not responding if lower than 0°C since v3.2.3
* Fixed apparent temperature and dew point not responding in compatibility mode home if lower than 0°C
* Fixed apparent temperature and dew point are not converted to F in compatibility mode eve
* Fixed startup error when using compatibility mode eve2 (eve with grouping) and forecasts

## 3.2.5
* Fixed datatype errors since homebridge 1.3.0
* Fixed observation time issue in weatherunderground since homebridge 1.3.0
* Fixed error in history service since homebridge 1.3.0
* Fixed wrong tempeature in Fahrenheit for dew point and apparent temperature
* Added donation links for homebridge-ui-x
* Added error log if no location is provided

## 3.2.6
* Fixed missing rain value in forecasts from dark sky API when a day is skipped in config

## 3.2.7
* Added WeeWX API
* Added rain chance to OpenWeatherMap API
* Updated OpenWeatherMap API to v3.0
* Fixed uv index range

## 3.2.8
* Added backwards compatibility for old OpenWeatherMap API 2.5
* Fixed getting geo coordinates with API 3.0
* Removed possibility to get location from id. Please use city name or geo coordinates!

## 3.2.9
* Fixed rain last hour and observation time in OpenWeatherMap API 3.0
* Fixed forecast in OpenWeatherMap API 3.0

## 3.2.10
* Fixed logging

## 3.2.11
* Fixed crash when weather report is empty

## 3.3.0
* Add support for WeatherFlow's Tempest weather station, that reports real time weather data over local network.

## 3.3.1
* Fixed JSON parse issue for rain events in Tempest API
* Fixed serial number to allow it to be unique so History events don't get merged with other weather stations

## 3.3.2
* Removed DarkSky API as it's no longer available
* Fixed crash when an error occurs in OpenWeatherMap report
* Fixed undefined rain boolean sensor value
* Fixed several Tempest weather station issues
* Improved usage of converter

## 3.3.3
* Fix Tempest weather station breakage introduced in 3.3.2
* Fix Rain accumulation

## 3.3.4
* Add support to detect failing sensors on Tempest weather station and report failure HomeKit

