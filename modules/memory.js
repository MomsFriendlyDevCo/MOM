import {bytes} from '@momsfriendlydevco/formatters';
import fs from 'node:fs/promises';
import {platform as osPlatform} from 'node:os';

let platform = osPlatform();

export function config({Schema}) {
	return new Schema({
		memory: {type: Boolean, default: true},
		memoryWarnPercent: {type: 'percent', min: 0, max: 100, required: false, default: 0},
		memoryCritPercent: {type: 'percent', min: 0, max: 100, required: false, default: 0},

		swap: {type: Boolean, default: true},
		swapWarnPercent: {type: 'percent', min: 0, max: 100, required: false, default: 80},
		swapCritPercent: {type: 'percent', min: 0, max: 100, required: false, default: 90},
	});
}

export function isAvailable() {
	if (!['darwin', 'freebsd', 'linux', 'openbsd', 'sunos'].includes(platform))
		throw new Error('Cannot check diskspace on non Unix compatible systems');
}

export function run({options}) {
	return fs.readFile('/proc/meminfo', 'utf-8')
		.then(content => content.split('\n')
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
					let valueMax = keyVals[field.keyTotal];

					if (!valueMax) throw new Error(`Cannot find maximum ("${field.keyTotal}") to match key "${field.keyFree}"`);
					value = valueMax - value; // Switch MemoryFree -> MemoryUsed

					let percentFree = (value / valueMax) * 100;
					let status =
						options[`${field.prefix}CritPercent`] && percentFree >= options[`${field.prefix}CritPercent`] ? 'CRIT'
						: options[`${field.prefix}WarnPercent`] && percentFree >= options[`${field.prefix}WarnPercent`] ? 'WARN'
						: 'PASS';

					return {
						status,
						field,
						percent: Math.round((value / valueMax) * 100),
						metric: {
							id: field.prefix,
							unit: 'bytes',
							value,
							valueMax,
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
				: 'PASS',
			message: stats.map(m =>
				`${m.field.title}: ${bytes(m.metric.value)} / ${bytes(m.metric.valueMax)} ~ ${m.percent}%`,
			).join(', '),
			metrics: stats.map(m => m.metric),
		}))
}
