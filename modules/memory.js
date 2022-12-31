import {bytes} from '@momsfriendlydevco/formatters';
import fs from 'node:fs/promises';
import {platform as osPlatform} from 'node:os';

let platform = osPlatform();

export function config({Schema}) {
	return new Schema({
		memory: {type: Boolean, default: true},
		memoryWarnPercent: {type: Number, default: 90},
		memoryCritPercent: {type: Number, default: 100},

		swap: {type: Boolean, default: true},
		swapWarnPercent: {type: Number, default: 80},
		swapCritPercent: {type: Number, default: 90},
	});
}

export function isAvailable() {
	if (!['darwin', 'freebsd', 'linux', 'openbsd', 'sunos'].includes(platform))
		throw new Error('Cannot check diskspace on non Unix compatible systems');
}

export function run({options}) {
	return fs.readFile('/proc/meminfo', 'utf-8')
		.then(content => content.split('\n'))
		.then(lines => lines
			.map(line => {
				let {key, val} =
					/^(?<key>.+):\s*(?<val>\d+) kB$/.exec(line)?.groups || {};
				return key
					? [key, val * 1024]
					: [];
			})
		)
		.then(keyVals => Object.fromEntries(keyVals))
		.then(keyVals =>
			[
				options.memory && {prefix: 'memory', title: 'Memory', keyFree: 'MemFree', keyTotal: 'MemTotal'},
				options.swap && {prefix: 'swap', title: 'Swap', keyFree: 'SwapFree', keyTotal: 'SwapTotal'},
			]
				.filter(Boolean)
				.map(field => {
					let value = keyVals[field.keyFree];
					let maxValue = keyVals[field.keyTotal];

					if (!maxValue) throw new Error(`Cannot find maximum ("${field.keyTotal}") to match key "${field.keyFree}"`);
					value = maxValue - value; // Switch MemoryFree -> MemoryUsed

					let percentFree = (value / maxValue) * 100;
					let status =
						options[`${field.prefix}CritPercent`] && percentFree >= options[`${field.prefix}CritPercent`] ? 'CRIT'
						: options[`${field.prefix}WarnPercent`] && percentFree >= options[`${field.prefix}WarnPercent`] ? 'WARN'
						: 'OK';

					return {
						status,
						field,
						percent: Math.round((value / maxValue) * 100),
						metric: {
							id: field.prefix,
							unit: 'bytes',
							value,
							maxValue,
							warnValue: options[`${field.prefix}WarnPercent`] && `>=${options[`${field.prefix}WarnPercent`]}`,
							critValue: options[`${field.prefix}CritPercent`] && `>=${options[`${field.prefix}CritPercent`]}`,
						},
					};
				})
		)
		.then(stats => ({
			status:
				stats.some(m => m.status == 'CRIT') ? 'CRIT'
				: stats.some(m => m.status == 'WARN') ? 'WARN'
				: 'OK',
			message: stats.map(m =>
				`${m.field.title}: ${bytes(m.metric.value)} / ${bytes(m.metric.maxValue)} ~ ${m.percent}%`,
			).join(', '),
			metric: stats.map(m => m.metric),
		}))
}
