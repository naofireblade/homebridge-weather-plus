require('should');
var Wunderground = require('./../lib/wundergroundnode');
var fs          = require('fs');

// Callback on connect
var cachedDevKey = null;
var getDevKey = function(callback){
    "use strict";

    if (cachedDevKey){
        callback(cachedDevKey);
        return;
    }

    fs.readFile(__dirname+'/devkey', 'utf8', function (err,data) {
        if (err) {
            return console.error(err);
        }

        cachedDevKey = data;
        callback(cachedDevKey);
    });
};



describe('Testing Weather Underground Node Client:', function(){
    "use strict";

    this.timeout(4000);

    it('Simple single call for conditions.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.conditions().request('84111', function(err, response){
                response.should.have.property('current_observation');
                done();
            });
        });

    });

    it('Request for geolookup.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.geolookup().request('84111', function(err, response){
                response.should.have.property('location');
                done();
            });
        });

    });

    it('Request for alerts.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.alerts().request('84111', function(err, response){
                response.should.have.property('alerts');
                done();
            });
        });

    });

    it('Request for astronomy.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.astronomy().request('84111', function(err, response){
                response.should.have.property('moon_phase');
                done();
            });
        });

    });

    it('Request for 10 day forecast.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.forecastTenDay().request('84111', function(err, response){
                response.should.have.property('forecast');
                done();
            });
        });

    });

    it('Request for planner data.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.planner('01/14', '01/15').request('84111', function(err, response){
                response.should.have.property('trip');
                done();
            });
        });

    });

    it('Chain most of the rest resources.', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.hourlyForecast().hourlyTenDayForecast().forecast().almanac().yesterday().request('84111', function(err, response){
                response.should.have.property('almanac');
                response.should.have.property('hourly_forecast');
                response.should.have.property('forecast');
                response.should.have.property('history');
                done();
            });
        });

    });

    it('Call without a resource', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.request('84111', function(err){
                err.should.equal(true);
                done();
            });
        });

    });

    it('Call without a query', function(done){

        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.conditions().request(false, function(err){
                err.should.equal(true);
                done();
            });
        });

    });

    it('Test a historical call with string date', function(done){
        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            wunderground.history('19800322', '84111', function(err, response){
                err.should.equal(false);
                response.should.have.property('history');
                done();
            });
        });
    });

    it('Test a historical call with date object', function(done){
        getDevKey(function(key){
            var wunderground = new Wunderground(key);
            var day = new Date(1980, 3, 22);
            wunderground.history(day, '84111', function(err, response){
                err.should.equal(false);
                response.should.have.property('history');
                done();
            });
        });
    });
});
