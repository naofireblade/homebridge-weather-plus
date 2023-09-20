/*jshint esversion: 6,node: true,-W041: false */
"use strict";

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

const getRainAccumulated = function (array)
{
	let sum = 0.0;
	for (let i = 0; i < array.length; i++)
	{
		sum += parseFloat(array[i];
	}
	return sum;
};

	// Calculate Wet Bulb Temperature
	// @see https://www.omnicalculator.com/physics/wet-bulb
	getWetBulbTemperature(dryBulbTemperature, relativeHumidity)
	{
		let T = dryBulbTemperature;
		let rh = relativeHumidity;

		let c1 = 0.152;
		let c2 = 8.3136;
		let c3 = 0.5;
		let c4 = 1.6763;
		let c5 = 0.00391838;
		let c6 = 1.5;
		let c7 = 0.0231;
		let c8 = 4.686;

		let Tw = T * Math.atan(c1 * Math.pow((rh + c2), c3)) +
			Math.atan(T+rh) - Math.atan(rh-c4) + 
			c5 * Math.pow(rh, c6) * Math.atan(c7 * rh) - c8;

		return Tw;
	}

module.exports = {
	getWindDirection,
	getRainAccumulated,
	getWetBulbTemperature
};
