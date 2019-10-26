/*jshint esversion: 6,node: true,-W041: false */
"use strict";

const getConditionCategory = function (name)
{
	switch (name)
	{
		case "snow":
		case "sleet":
		case "flurries":
		case "chancesnow":
		case "chancesleet":
		case "chanceflurries":
		case "hail":
			return 3;
		case "rain":
		case "tstorms":
		case "chancerain":
		case "chancetstorms":
		case "thunderstorm":
		case "tornado":
			return 2;
		case "cloudy":
		case "mostlycloudy":
		case "partlysunny":
		case "fog":
		case "hazy":
		case "wind":
			return 1;
		case "partlycloudy":
		case "mostlysunny":
		case "sunny":
		case "clear":
		case "clear-day":
		case "clear-night":
		case "partly-cloudy-day":
		case "partly-cloudy-night":
			return 0;
		default:
			return 0;
	}
};

const getConditionCategoryOwm = function (code)
{
	// See https://openweathermap.org/weather-conditions
	if (code >= 200 && code < 300)
	{
		// Thunderstorm
		return 2;
	}
	else if (code >= 300 && code < 400)
	{
		// Drizzle
		return 2;
	}
	else if (code >= 500 && code < 600)
	{
		// Rain
		return 2;
	}
	else if (code >= 600 && code < 700)
	{
		// Snow
		return 3;
	}
	else if (code >= 700 && code < 800)
	{
		// Atmosphere
		return 1;
	}
	else if (code >= 801 && code < 900)
	{
		// Clouds
		return 1;
	}
	else
	{
		// 800 = Clear
		return 0;
	}
};

const getConditionCategoryYahoo = function (code)
{
	// See https://developer.yahoo.com/weather/documentation.html#codes
	switch (code)
	{
		case 5:
		case 6:
		case 7:
		case 8:
		case 10:
		case 13:
		case 14:
		case 15:
		case 16:
		case 17:
		case 18:
		case 35:
		case 41:
		case 42:
		case 43:
		case 46:
			return 3; // snow
		case 0:
		case 1:
		case 2:
		case 3:
		case 9:
		case 11:
		case 12:
		case 37:
		case 38:
		case 39:
		case 40:
		case 45:
		case 47:
			return 2; // rain
		case 19:
		case 20:
		case 21:
		case 22:
		case 23:
		case 24:
		case 26:
		case 27:
		case 28:
		case 29:
		case 30:
			return 1; // cloudy
		case 25:
		case 31:
		case 32:
		case 33:
		case 34:
		case 36:
		case 44:
		case 3200:
			return 0;
		default:
			return 0; // clear
	}
};

const getWindDirection = function (degree)
{
	if (typeof degree !== 'number' || isNaN(degree))
	{
		return 'Unkown';
	}
	let cat = Math.round(degree % 360 / 22.5);
	let dir;

	// TODO multilanguage
	switch (cat)
	{
		case 0:
			dir = 'N';
			break;
		case 1:
			dir = 'NNE';
			break;
		case 2:
			dir = 'NE';
			break;
		case 3:
			dir = 'ENE';
			break;
		case 4:
			dir = 'E';
			break;
		case 5:
			dir = 'ESE';
			break;
		case 6:
			dir = 'SE';
			break;
		case 7:
			dir = 'SSE';
			break;
		case 8:
			dir = 'S';
			break;
		case 9:
			dir = 'SSW';
			break;
		case 10:
			dir = 'SW';
			break;
		case 11:
			dir = 'WSW';
			break;
		case 12:
			dir = 'W';
			break;
		case 13:
			dir = 'WNW';
			break;
		case 14:
			dir = 'NW';
			break;
		case 15:
			dir = 'NNW';
			break;
		case 16:
			dir = 'N';
			break;
		default:
			dir = 'Variable';
	}
	return dir;
};

const getRainAccumulated = function (array, parameter)
{
	let sum = 0;
	for (let i = 0; i < array.length; i++)
	{
		sum += array[i][parameter];
	}
	return sum;
};

module.exports = {
	getConditionCategory,
	getConditionCategoryOwm,
	getConditionCategoryYahoo,
	getWindDirection,
	getRainAccumulated
};