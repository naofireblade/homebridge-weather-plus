var request = require('request');
var _       = require('underscore');
var moment  = require('moment');

var Wunderground = function(apikey) {
    "use strict";

    var that = this;

    that.chainedRequests = [];
    var format = ".json";

    that.conditions = function() {
        this.chainedRequests.push("conditions/");
        return this;
    };

    that.alerts = function() {
        this.chainedRequests.push("alerts/");
        return this;
    };

    that.hourlyForecast = function() {
        this.chainedRequests.push("hourly/");
        return this;
    };

    that.hourlyTenDayForecast = function(){
        this.chainedRequests.push('hourly10day/');
        return this;
    };

    that.forecast = function() {
        this.chainedRequests.push("forecast/");
        return this;
    };

    that.forecastTenDay = function() {
        this.chainedRequests.push("forecast10day/");
        return this;
    };

    that.almanac = function() {
        this.chainedRequests.push("almanac/");
        return this;
    };

    that.yesterday = function() {
        this.chainedRequests.push("yesterday/");
        return this;
    };

    that.geolookup = function() {
        this.chainedRequests.push("geolookup/");
        return this;
    };

    that.astronomy = function() {
        this.chainedRequests.push("astronomy/");
        return this;
    };

    that.planner = function(startDay, endDay){
        var startDayFormatted = startDay.replace('/', ''),
            endDayFormatted = endDay.replace('/', '');

        this.chainedRequests.push("planner_"+startDayFormatted+endDayFormatted+"/");
        return this;
    };

    /**
     * Historical request, cannot be chained.
     *
     * @param day String with format 'YYYYMMDD' or date object
     * @param query Location Query (e.g., 84010)
     * @param callback function to return results to
     */
    that.history = function(day, query, callback){
        if (_.isDate(day)){
            var dayMoment = moment(day);
            day = dayMoment.format('YYYYMMDD');
        }
        // A little pre-query validation
        if (!query){
            callback(true, "You must supply a query");
            return;
        }else if (!_.isString(day)){
            callback(true,  "You must supply a valid day");
            return;
        }else if (!_.isFunction(callback)){
            throw "The third argument must be a function";
        }

        // Construct the url
        var url = 'http://api.wunderground.com/api/' + apikey + '/history_' + day + '/q/'+query + format;

        // Request the url
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                error = false;
                callback.call(that, error, JSON.parse(body));
                return;
            } else if (error) {
                callback.call(that, error, false);
                return;
            }

        });
    };

    /**
     * Performs the actual request
     *
     * @param query
     * @param callback
     */
    that.request = function(query, callback){
        // A little pre-query validation
        if (!query){
            callback(true, "You must supply a query");
            return;
        }else if (!that.chainedRequests.length){
            callback(true,  "You must specify a resource to request first (e.g., wu.conditions().req...)");
            return;
        }else if (!_.isFunction(callback)){
            throw "The second argument must be a function";
        }

        // Construct the url
        var url = 'http://api.wunderground.com/api/' + apikey + '/' + that.chainedRequests.join('') + 'q/'+query + format;
        that.chainedRequests = [];

        // Request the url
        request(url, function (error, response, body) {
            if (!error && response.statusCode === 200) {
                error = false;
                callback.call(that, error, JSON.parse(body));
                return;
            } else if (error) {
                callback.call(that, error, false);
                return;
            }

        });
    };
};

module.exports = Wunderground;
