import {execa} from 'execa';
import pm2 from 'pm2';

export function config({Schema}) {
	return new Schema ({
		warnRestarts: {type: 'number', min: 0, required: false, default: 0},
		critRestarts: {type: 'number', min: 0, required: false, default: 0},
	});
}

export function isAvailable() {
	return execa('pm2', ['list'])
		.catch(()=> { throw new Error('PM2 is not avaiable') })
}

export function init({mom}) {
	return Promise.resolve()
		.then(()=> new Promise((resolve, reject) =>
			pm2.connect((err, res) => err
				? reject(err)
				: resolve(res)
			)
		))
		.then(()=> mom.debug('PM2 connecteed'))
}

export function run({options}) {
	return Promise.resolve()
		.then(()=> new Promise((resolve, reject) =>
			pm2.list((e, r) => e ? reject(e) : resolve(r))
		))
		.then(procs => procs.map(proc => [
			{
				id: `${proc.name}.cpu`,
				value: proc.monit.cpu,
				unit: 'percentage',
				description: `CPU usage of "${proc.name}"`,
			},
			{
				id: `${proc.name}.memory`,
				unit: 'bytes',
				value: proc.monit.memory,
				description: `Memory usage of "${proc.name}"`,
			},
			{
				id: `${proc.name}.restarts`,
				unit: 'number',
				value: proc.monit.restart_time,
				description: `Process restarts of "${proc.name}"`,
			},
		]))
		.then(metrics => metrics.flat())
		.then(metrics => {
			let maxRestarts = Math.max(
				...metrics
					.filter(m => m.id.endsWith('.restarts'))
					.map(m => m.value)
			);

			return {
				status:
					options.critRestarts && maxRestarts >= options.critRestarts ? 'CRIT'
					: options.warnRestarts && maxRestarts >= options.warnRestarts ? 'WARN'
					: 'OK',
				message:
					options.critRestarts && maxRestarts >= options.critRestarts ? 'PM2 restarts above critical threshold'
					: options.warnRestarts && maxRestarts >= options.warnRestarts ? 'PM2 restarts above warning threshold'
					: 'OK',
				metrics,
			};
		})
}
