"use strict";

const assert = require('assert'),
	EventEmitter = require('events'),
	TempestAPI = require('../apis/weatherflow').TempestAPI,
	registerStationShutdown = require('../index').registerStationShutdown;

const MINUTE = 60 * 1000;

class FakeClock
{
	constructor()
	{
		this.time = 0;
		this.nextId = 1;
		this.timers = [];
	}

	now()
	{
		return this.time;
	}

	setTimeout(callback, delay)
	{
		return this.addTimer(callback, delay, null);
	}

	clearTimeout(id)
	{
		this.removeTimer(id);
	}

	setInterval(callback, delay)
	{
		return this.addTimer(callback, delay, delay);
	}

	clearInterval(id)
	{
		this.removeTimer(id);
	}

	addTimer(callback, delay, interval)
	{
		const timer = {
			id: this.nextId++,
			at: this.time + delay,
			callback: callback,
			interval: interval,
			cancelled: false
		};
		this.timers.push(timer);
		return timer.id;
	}

	removeTimer(id)
	{
		const timer = this.timers.find((candidate) => candidate.id === id);
		if (timer) timer.cancelled = true;
	}

	tick(duration)
	{
		const target = this.time + duration;
		while (true) {
			this.timers = this.timers.filter((timer) => !timer.cancelled);
			const dueTimers = this.timers.filter((timer) => timer.at <= target);
			if (dueTimers.length === 0) break;
			dueTimers.sort((left, right) => left.at - right.at || left.id - right.id);
			const timer = dueTimers[0];
			this.timers = this.timers.filter((candidate) => candidate !== timer);
			this.time = timer.at;
			if (timer.interval !== null && !timer.cancelled) {
				timer.at += timer.interval;
				this.timers.push(timer);
			}
			if (!timer.cancelled) timer.callback();
		}
		this.time = target;
	}
}

class FakeSocket extends EventEmitter
{
	constructor(events, deferClose = false)
	{
		super();
		this.events = events;
		this.deferClose = deferClose;
		this.boundPort = null;
		this.closeCount = 0;
		this.pendingCloseCallback = null;
	}

	bind(port)
	{
		this.boundPort = port;
		this.events.push(`bind:${port}`);
	}

	address()
	{
		return {address: '0.0.0.0', port: this.boundPort};
	}

	listen()
	{
		this.emit('listening');
	}

	close(callback)
	{
		this.closeCount++;
		this.events.push('close');
		if (this.deferClose) {
			this.pendingCloseCallback = callback;
			return;
		}
		this.finishClose(callback);
	}

	finishClose(callback = this.pendingCloseCallback)
	{
		this.pendingCloseCallback = null;
		this.emit('close');
		if (callback) callback();
	}

	message(message)
	{
		this.datagram(Buffer.from(JSON.stringify(message)));
	}

	datagram(payload, rinfo = {address: '192.0.2.10', port: 50222})
	{
		this.emit('message', payload, rinfo);
	}
}

function createLog()
{
	const entries = [];
	const log = (message) => entries.push(['info', message]);
	log.debug = (message) => entries.push(['debug', message]);
	log.warn = (message) => entries.push(['warn', message]);
	log.error = (message) => entries.push(['error', message]);
	log.entries = entries;
	return log;
}

function createHarness(options = {})
{
	const clock = new FakeClock(),
		events = [],
		sockets = [],
		storage = {
			initSync: () => {},
			getItemSync: () => undefined,
			setItemSync: () => {}
		},
		log = createLog(),
		dependencies = {
			storage: storage,
			createSocket: () => {
				const socket = new FakeSocket(events, options.deferClose === true);
				sockets.push(socket);
				return socket;
			},
			now: () => clock.now(),
			setTimeout: (callback, delay) => clock.setTimeout(callback, delay),
			clearTimeout: (id) => clock.clearTimeout(id),
			setInterval: (callback, delay) => clock.setInterval(callback, delay),
			clearInterval: (id) => clock.clearInterval(id)
		};

	const api = new TempestAPI('', '', false, log, '/tmp/weatherflow-test', dependencies);
	return {api: api, clock: clock, events: events, log: log, sockets: sockets};
}

function tempestObservation(reportInterval)
{
	const observation = new Array(18).fill(0);
	observation[0] = 1588948614;
	observation[7] = 20;
	observation[8] = 0;
	observation[16] = 2.5;
	observation[17] = reportInterval;
	return {
		serial_number: 'ST-TEST',
		type: 'obs_st',
		hub_sn: 'HB-TEST',
		obs: [observation],
		firmware_revision: 1
	};
}

function airObservation(reportInterval = 1)
{
	return {
		serial_number: 'AR-TEST',
		type: 'obs_air',
		hub_sn: 'HB-TEST',
		obs: [[1588948614, 1000, 20, 50, 0, 0, 3.5, reportInterval]],
		firmware_revision: 1
	};
}

function skyObservation(reportInterval = 1)
{
	return {
		serial_number: 'SK-TEST',
		type: 'obs_sky',
		hub_sn: 'HB-TEST',
		obs: [[1588948614, 1000, 1, 0, 1, 2, 3, 180, 3.5, reportInterval, 100, null, 0]],
		firmware_revision: 1
	};
}

function test(name, callback)
{
	try {
		callback();
		console.log(`ok - ${name}`);
	} catch (err) {
		console.error(`not ok - ${name}`);
		throw err;
	}
}

test('waits fifteen minutes before replacing a silent listener', () => {
	const harness = createHarness();
	harness.sockets[0].listen();

	harness.clock.tick(14 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
	assert.strictEqual(harness.sockets[0].closeCount, 0);

	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets[0].closeCount, 1);
	assert.strictEqual(harness.sockets.length, 2);
	assert.deepStrictEqual(harness.events.slice(-2), ['close', 'bind:50222']);
});

test('uses the advertised observation interval when it exceeds the minimum', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].message(tempestObservation(10));
	assert.strictEqual(harness.api.observationStaleTimeout, 30 * MINUTE, JSON.stringify(harness.log.entries));

	harness.clock.tick(29 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('a fresh observation resets the watchdog', () => {
	const harness = createHarness();
	harness.sockets[0].listen();

	harness.clock.tick(10 * MINUTE);
	harness.sockets[0].message(tempestObservation(1));
	harness.clock.tick(14 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('a non-observation packet does not reset the watchdog', () => {
	const harness = createHarness();
	harness.sockets[0].listen();

	harness.clock.tick(10 * MINUTE);
	harness.sockets[0].message({type: 'hub_status'});
	harness.clock.tick(5 * MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('socket errors schedule one serialized replacement', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('test failure'));
	harness.sockets[0].emit('error', new Error('duplicate failure'));

	assert.strictEqual(harness.sockets[0].closeCount, 1);
	assert.strictEqual(harness.api.udpFailureCount, 1);
	harness.clock.tick(29 * 1000);
	assert.strictEqual(harness.sockets.length, 1);
	harness.clock.tick(1000);
	assert.strictEqual(harness.sockets.length, 2);

	harness.sockets[1].emit('error', new Error('next genuine failure'));
	harness.clock.tick(119 * 1000);
	assert.strictEqual(harness.sockets.length, 2);
	harness.clock.tick(1000);
	assert.strictEqual(harness.sockets.length, 3);
});

test('unexpected close uses the same recovery path', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('close');

	harness.clock.tick(30 * 1000);
	assert.strictEqual(harness.sockets.length, 2);
});

test('repeated socket failures use capped backoff', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('first failure'));
	harness.clock.tick(30 * 1000);
	assert.strictEqual(harness.sockets.length, 2);

	harness.sockets[1].listen();
	harness.sockets[1].emit('error', new Error('second failure'));
	harness.clock.tick(119 * 1000);
	assert.strictEqual(harness.sockets.length, 2);
	harness.clock.tick(1000);
	assert.strictEqual(harness.sockets.length, 3);

	harness.sockets[2].listen();
	harness.sockets[2].emit('error', new Error('third failure'));
	harness.clock.tick(9 * MINUTE);
	assert.strictEqual(harness.sockets.length, 3);
	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets.length, 4);
});

test('a valid observation resets socket failure backoff', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('first failure'));
	harness.clock.tick(30 * 1000);

	harness.sockets[1].listen();
	harness.sockets[1].emit('error', new Error('second failure'));
	harness.clock.tick(2 * MINUTE);

	harness.sockets[2].listen();
	harness.sockets[2].message(tempestObservation(1));
	harness.sockets[2].emit('error', new Error('failure after recovery'));
	harness.clock.tick(29 * 1000);
	assert.strictEqual(harness.sockets.length, 3);
	harness.clock.tick(1000);
	assert.strictEqual(harness.sockets.length, 4);
});

test('a replacement gets a full grace period before another stale recovery', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.clock.tick(15 * MINUTE);
	assert.strictEqual(harness.sockets.length, 2);

	harness.sockets[1].listen();
	harness.clock.tick(14 * MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets.length, 3);
});

test('dispose closes the listener and cancels the watchdog', () => {
	const harness = createHarness();
	harness.sockets[0].listen();

	harness.api.dispose();
	assert.strictEqual(harness.api.disposed, true);
	assert.strictEqual(harness.api.server, null);
	assert.strictEqual(harness.api.udpWatchdogTimer, null);
	assert.strictEqual(harness.sockets[0].closeCount, 1);

	harness.clock.tick(60 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
});

test('dispose is idempotent', () => {
	const harness = createHarness();
	harness.sockets[0].listen();

	harness.api.dispose();
	harness.api.dispose();
	assert.strictEqual(harness.sockets[0].closeCount, 1);
});

test('dispose cancels a pending error retry', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('test failure'));
	assert.notStrictEqual(harness.api.udpRestartTimer, null);

	harness.api.dispose();
	assert.strictEqual(harness.api.udpRestartTimer, null);
	harness.clock.tick(10 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
});

test('dispose while close is pending prevents a replacement', () => {
	const harness = createHarness({deferClose: true});
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('test failure'));
	assert.strictEqual(harness.sockets[0].closeCount, 1);
	assert.strictEqual(harness.api.udpRestartTimer, null);

	harness.api.dispose();
	harness.sockets[0].finishClose();
	harness.clock.tick(10 * MINUTE);
	assert.strictEqual(harness.sockets[0].closeCount, 1);
	assert.strictEqual(harness.sockets.length, 1);
});

test('Homebridge shutdown disposes every disposable station', () => {
	const homebridge = new EventEmitter();
	let firstDisposeCount = 0;
	let secondDisposeCount = 0;
	registerStationShutdown(homebridge, [
		{dispose: () => firstDisposeCount++},
		{},
		{dispose: () => secondDisposeCount++}
	]);

	homebridge.emit('shutdown');
	assert.strictEqual(firstDisposeCount, 1);
	assert.strictEqual(secondDisposeCount, 1);
});

test('accepts supported observation layouts and ignores trailing fields', () => {
	const harness = createHarness();
	const messages = [airObservation(), skyObservation(), tempestObservation(1)];
	messages.forEach((message) => {
		message.obs[0].push('future-field');
		const result = harness.api.validateUdpMessage(message);
		assert.strictEqual(result.observation, true);
		assert.strictEqual(result.parse, true);
		assert.strictEqual(result.reportIntervalMinutes, 1);
	});
});

test('rejects malformed, oversized, and non-object UDP payloads', () => {
	const harness = createHarness();
	assert.strictEqual(harness.api.decodeUdpDatagram(Buffer.from('{')), null);
	assert.strictEqual(harness.api.decodeUdpDatagram(Buffer.alloc(16 * 1024 + 1)), null);
	assert.strictEqual(harness.api.decodeUdpDatagram(Buffer.from('null')), null);
	assert.strictEqual(harness.api.decodeUdpDatagram(Buffer.from('[]')), null);
	assert.strictEqual(harness.api.decodeUdpDatagram('not-a-buffer'), null);
});

test('a short observation does not reset listener freshness', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.clock.tick(10 * MINUTE);
	harness.sockets[0].message({
		serial_number: 'ST-TEST',
		type: 'obs_st',
		obs: [[1588948614, 1, 2]]
	});

	harness.clock.tick(5 * MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('invalid observation data proves transport health without changing weather values', () => {
	const harness = createHarness();
	const message = tempestObservation(1);
	message.obs[0][7] = 'invalid-temperature';
	harness.sockets[0].listen();
	harness.clock.tick(10 * MINUTE);
	harness.sockets[0].message(message);

	assert.strictEqual(harness.api.currentReport.Temperature, 0);
	harness.clock.tick(14 * MINUTE);
	assert.strictEqual(harness.sockets.length, 1);
	harness.clock.tick(MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('an implausible report interval falls back to the minimum stale timeout', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].message(tempestObservation(1000));
	assert.strictEqual(harness.api.observationStaleTimeout, 15 * MINUTE);

	harness.clock.tick(15 * MINUTE);
	assert.strictEqual(harness.sockets.length, 2);
});

test('a missing trailing report interval falls back without discarding the observation', () => {
	const harness = createHarness();
	const message = tempestObservation(30);
	harness.sockets[0].listen();
	harness.sockets[0].message(message);
	assert.strictEqual(harness.api.observationStaleTimeout, 90 * MINUTE);

	message.obs[0].pop();
	harness.sockets[0].message(message);
	assert.strictEqual(harness.api.observationStaleTimeout, 15 * MINUTE);
	assert.strictEqual(harness.api.currentReport.ObservationStation, 'ST-TEST');
});

test('duplicate observations continue to prove UDP transport freshness', () => {
	const harness = createHarness();
	const message = tempestObservation(1);
	harness.sockets[0].listen();
	harness.sockets[0].message(message);
	harness.clock.tick(10 * MINUTE);
	harness.sockets[0].message(message);
	harness.clock.tick(10 * MINUTE);

	assert.strictEqual(harness.sockets.length, 1);
});

test('finite but unsafe observation values never reach the legacy parser', () => {
	const harness = createHarness();
	const unsafeTimestamp = tempestObservation(1);
	unsafeTimestamp.obs[0][0] = 1e308;
	harness.sockets[0].message(unsafeTimestamp);

	const unsafeTemperature = tempestObservation(1);
	unsafeTemperature.obs[0][7] = 100000;
	harness.sockets[0].message(unsafeTemperature);

	assert.strictEqual(harness.api.currentReport.ObservationStation, 'Unknown');
	assert.strictEqual(harness.api.currentReport.Temperature, 0);
});

test('invalid non-observation messages do not mutate current weather', () => {
	const harness = createHarness();
	harness.sockets[0].message({
		serial_number: 'ST-TEST',
		type: 'rapid_wind',
		ob: [1588948614, 'fast', 180]
	});
	harness.sockets[0].message({
		type: 'device_status',
		serial_number: null,
		timestamp: 1588948614,
		sensor_status: 0
	});
	assert.strictEqual(harness.api.currentReport.WindSpeed, 0);
	assert.strictEqual(harness.api.currentReport.ObservationStation, 'Unknown');
});

test('listener and recovery logs describe generations without per-packet noise', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].message(tempestObservation(1));

	assert(harness.log.entries.some((entry) => entry[0] === 'info' &&
		entry[1].includes('generation 1 listening on 0.0.0.0:50222')));
	assert.strictEqual(harness.log.entries.some((entry) => String(entry[1]).includes('Server got')), false);

	harness.clock.tick(15 * MINUTE);
	const recoveryWarnings = harness.log.entries.filter((entry) => entry[0] === 'warn' &&
		entry[1].includes('WeatherFlow UDP recovery'));
	assert.strictEqual(recoveryWarnings.length, 1);
	assert(recoveryWarnings[0][1].includes('generation=1'));
	assert(recoveryWarnings[0][1].includes('reason=no observations for 15 minutes'));
	assert(recoveryWarnings[0][1].includes('observationAgeMinutes=15'));
	assert(recoveryWarnings[0][1].includes('staleThresholdMinutes=15'));
});

test('duplicate socket errors emit one bounded recovery warning with error details', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	const firstError = new Error('address already in use');
	firstError.code = 'EADDRINUSE';
	firstError.stack = 'RAW-STACK-SENTINEL\n' + 'x'.repeat(1000);
	harness.sockets[0].emit('error', firstError);
	harness.sockets[0].emit('error', new Error('duplicate'));

	const warnings = harness.log.entries.filter((entry) => entry[0] === 'warn' &&
		entry[1].includes('WeatherFlow UDP recovery'));
	assert.strictEqual(warnings.length, 1);
	assert(warnings[0][1].includes('error=Error'));
	assert(warnings[0][1].includes('code=EADDRINUSE'));
	assert(warnings[0][1].includes('message=address already in use'));
	assert.strictEqual(JSON.stringify(harness.log.entries).includes('RAW-STACK-SENTINEL'), false);
});

test('the first observation after replacement logs one successful recovery', () => {
	const harness = createHarness();
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('test failure'));
	harness.clock.tick(30 * 1000);
	harness.sockets[1].listen();

	const message = tempestObservation(1);
	message.serial_number = 'ST-TEST';
	message.hub_sn = 'HB-TEST\u2028, restart=99';
	harness.sockets[1].datagram(Buffer.from(JSON.stringify(message)), {
		address: '192.0.2.10',
		port: 50222
	});
	harness.sockets[1].message(message);

	const recovered = harness.log.entries.filter((entry) => entry[0] === 'info' &&
		entry[1].includes('WeatherFlow UDP listener recovered'));
	assert.strictEqual(recovered.length, 1);
	assert(recovered[0][1].includes('generation=2'));
	assert(recovered[0][1].includes('restart=1'));
	assert(recovered[0][1].includes('serial=ST-TEST'));
	assert(recovered[0][1].includes('hub=HB-TEST?? restart?99'));
	assert(recovered[0][1].includes('source=192.0.2.10:50222'));
	assert(recovered[0][1].includes('reportIntervalMinutes=1'));
	assert(recovered[0][1].includes('staleThresholdMinutes=15'));
	assert.strictEqual(recovered[0][1].includes('\n'), false);
});

test('an observation queued on the closing generation cannot claim recovery', () => {
	const harness = createHarness({deferClose: true});
	harness.sockets[0].listen();
	harness.sockets[0].emit('error', new Error('test failure'));
	harness.sockets[0].message(tempestObservation(1));

	let recovered = harness.log.entries.filter((entry) => entry[0] === 'info' &&
		entry[1].includes('WeatherFlow UDP listener recovered'));
	assert.strictEqual(recovered.length, 0);

	harness.sockets[0].finishClose();
	harness.clock.tick(30 * 1000);
	harness.sockets[1].listen();
	harness.sockets[1].message(tempestObservation(1));
	recovered = harness.log.entries.filter((entry) => entry[0] === 'info' &&
		entry[1].includes('WeatherFlow UDP listener recovered'));
	assert.strictEqual(recovered.length, 1);
	assert(recovered[0][1].includes('generation=2'));
});

test('malformed packet warnings are bounded per category and listener generation', () => {
	const harness = createHarness();
	const secretPayload = Buffer.from('{"access_token":"DO-NOT-LOG"');
	harness.sockets[0].datagram(secretPayload);
	harness.sockets[0].datagram(secretPayload);
	harness.sockets[0].datagram(Buffer.alloc(16 * 1024 + 1));
	harness.sockets[0].datagram(Buffer.alloc(16 * 1024 + 2));

	let ignoredWarnings = harness.log.entries.filter((entry) => entry[0] === 'warn' &&
		entry[1].includes('Ignoring WeatherFlow UDP packet'));
	assert.strictEqual(ignoredWarnings.length, 2);
	assert.strictEqual(JSON.stringify(harness.log.entries).includes('DO-NOT-LOG'), false);

	harness.sockets[0].emit('error', new Error('test failure'));
	harness.clock.tick(30 * 1000);
	harness.sockets[1].datagram(secretPayload);
	ignoredWarnings = harness.log.entries.filter((entry) => entry[0] === 'warn' &&
		entry[1].includes('Ignoring WeatherFlow UDP packet'));
	assert.strictEqual(ignoredWarnings.length, 3);
});

test('unsafe identifiers cannot enter weather state or recurring persistence logs', () => {
	const harness = createHarness();
	const message = tempestObservation(1);
	message.serial_number = 'ST-TEST\nFORGED';
	harness.sockets[0].message(message);
	harness.api.save(harness.api.currentReport);

	assert.strictEqual(harness.api.currentReport.ObservationStation, 'Unknown');
	assert.strictEqual(JSON.stringify(harness.log.entries).includes('FORGED'), false);
});

test('lightning counts above the downstream characteristic maximum are rejected', () => {
	const harness = createHarness();
	const message = tempestObservation(1);
	message.obs[0][15] = 1001;
	harness.sockets[0].message(message);

	assert.strictEqual(harness.api.currentReport.ObservationStation, 'Unknown');
	assert.strictEqual(harness.api.currentReport.LightningStrikes, 0);

	message.obs[0][15] = 1000;
	harness.sockets[0].message(message);
	assert.strictEqual(harness.api.currentReport.LightningStrikes, 1000);
});
