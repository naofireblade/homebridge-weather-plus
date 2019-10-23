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
* Changed readme to improve comprehensibility
* Changed naming of some parameters (all backwards compatible, you don't need to change your config)
* Removed serial parameter (automatic assigned now)

* Weather history graphs will be cleared and start from scratch with this update