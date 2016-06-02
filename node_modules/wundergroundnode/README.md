This is a chainable weather underground client for node.js

# Install
    npm install wundergroundnode
    var Wunderground = require('wundergroundnode');
    var myKey = '12312314';
    var wunderground = new Wunderground(myKey);

# How To Use
The syntax follows a simple pattern:
    
    wunderground.[resource calls(s)].request(myQuery, callback);
    
The available resource calls are the following (you must include one in your request):

- conditions
- hourlyForecast
- hourlyTenDayForecast
- forecast
- almanac
- yesterday
- geolookup
- astronomy
- planner
- alerts (thanks to drewlander for this)

The documentation for each resource can be found here: http://www.wunderground.com/weather/api/d/docs?d=index. That also covers how to perform queries against their api.

So to get the current conditions you would use the following code:

```js
wunderground.conditions().request('84111', function(err, response){
    console.log(response);
}
```

Where the real fun comes in, however, is when you want more than one resource in a single call. This functionality is crucial to save on weather underground costs. So extending the example, lets also get the forecast:

```js
wunderground.conditions().forecast().request('84111', function(err, response){
    console.log(response);
}
```

Finally, planner is a little unique in how it is used. It has two parameters, the start and end dates for the range. At the time of this writing wunderground limits this to 30 days max. Notice that the parameters include the "/" character for readability.

```js
// Requests for planning information from January 13th to the 15th.
wunderground.planner('01/13', '01/15').request('84111', function(err, response){ 
    console.log(response);
}
```

# Historical Queries
If you are willing to pay the hefty fee then this library also provides historical querying as well. Historical queries _cannot_ be chained.

```js
wunderground.history('20120322', '84111', function(err, response){
   console.log(response);
}
```

Note that the first field specifies the day in the string format 'YYYYMMDD'. Alternatively you can use a date object for a given day.

#Running Unit Tests
In order to run unit tests you need to include a file called "devkey" in the test directory. This file must contain only your dev key (no spaces or newlines).

Then simply run this command:

    make test
    
If you have instanbul installed globally you can also run the tests with code coverage results:

    make coverage