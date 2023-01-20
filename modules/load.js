import fs from 'node:fs/promises';
import MOMResponse from '#lib/MOMResponse';
import {platform as osPlatform} from 'node:os';

let platform = osPlatform();

export function config({Schema}) {
	return new Schema({
		proc1Warn: {type: Number, required: false},
		proc1Crit: {type: Number, required: false},
		proc5Warn: {type: Number, required: false},
		proc5Crit: {type: Number, required: false},
		proc15Warn: {type: Number, required: false},
		proc15Crit: {type: Number, required: false},
	});
}

export function isAvailable() {
	if (!['darwin', 'freebsd', 'linux', 'openbsd', 'sunos'].includes(platform))
		throw new Error('Cannot check diskspace on non Unix compatible systems');
}

export function run({options}) {
	return fs.readFile('/proc/loadavg', 'utf-8')
		.then(content => {
			let {proc1, proc5, proc15, threadsRunning, threadsTotal} =
				/^(?<proc1>[\d\.]+)\s+(?<proc5>[\d\.]+)\s+(?<proc15>[\d\.]+)\s+(?<threadsRunning>\d+)\/(?<threadsTotal>\d+)/.exec(content)?.groups || {}; // eslint-disable-line

			return [
				{
					id: 'proc1',
					value: proc1,
					warnValue: options.proc1Warn && `>=${options.proc1Warn}`,
					critValue: options.proc1Crit && `>=${options.proc1Crit}`,
				},
				{
					id: 'proc5',
					value: proc5,
					warnValue: options.proc5Warn && `>=${options.proc5Warn}`,
					critValue: options.proc5Crit && `>=${options.proc5Crit}`,
				},
				{
					id: 'proc15',
					value: proc15,
					warnValue: options.proc15Warn && `>=${options.proc15Warn}`,
					critValue: options.proc15Crit && `>=${options.proc15Crit}`,
				},
				{
					id: 'threadsRunning',
					value: threadsRunning,
				},
				{
					id: 'threadsTotal',
					value: threadsTotal,
				},
			];
		})
		.then(metrics => MOMResponse.fromMetrics(metrics, {
			all: {
				message: `System load: ${metrics[0].value} ${metrics[1].value} ${metrics[2].value} ${metrics[3].value}/${metrics[4].value}`,
			},
		}))
}
