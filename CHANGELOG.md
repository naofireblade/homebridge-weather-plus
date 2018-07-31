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
* Changed configuration to set exact forecast days
