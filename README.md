# homebridge-wunderground
Weather Underground plugin for homebridge: https://github.com/nfarina/homebridge

This is a very basic plugin for Nfarina's wonderfull [Homebridge project](https://github.com/nfarina/homebridge). It will fetch current weather conditions from [Weather Underground](http://wunderground.com) and provide temperature and humidity information for HomeKit.

You can use these values as conditions for triggers or just look at them via HomeKit enabled Apps on your iOS device or even ask Siri for them.

It will get new data only once per minute.

# Installation

1. Install homebridge using: npm install -g homebridge
2. Install this plugin using: npm install -g homebridge-wunderground
3. Update your configuration file. See the sample below.

All you need now is a developer key for Weather Underground which can be easily created [here](http://www.wunderground.com/weather/api/).

# Configuration

Configuration sample:

 ```
Add the following information to your config file.
Make sure to add your API key and provice your city or postal code.

"accessories": [
    {
      "accessory": "WUNDERGROUND",
      "name": "Weather Underground",
      "device": "WURecklinghausen",
      "key": "xxxxxxxxxxxx",
      "city": "Germany/Recklinghausen"
      }
    ]
```
