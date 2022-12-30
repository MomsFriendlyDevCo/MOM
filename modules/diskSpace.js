import readable from '@momsfriendlydevco/readable';
import {execa} from 'execa';
import {platform as osPlatform} from 'node:os';

let platform = osPlatform();

export function config({Schema}) {
	return new Schema({
		path: {type: String, required: true},
		mountAlias: {type: String, default: ''},
		warnPercent: {type: Number, default: 20},
		critPercent: {type: Number, default: 10},
	});
}


export function isAvailable() {
	if (!['darwin', 'freebsd', 'linux', 'openbsd', 'sunos'].includes(platform))
		throw new Error('Cannot check diskspace on non Unix compatible systems');
}


/**
* Check the diskspace at a given path
* @param {Object} options The options to mutate behaviour
* @param {String} options.path The path to check the diskspace for
* @param {String} [options.mountAlias] Override string when displaying the mount path
* @param {Number} [options.warnPercent=20] Percentage under which the status should WARN
* @param {Number} [options.critPercent=10] Percentage under which the status should CRIT
* @returns {SanityModuleResponse}
*/
export function run({options}) {
	if (!options.mountAlias) options.mountAlias = options.path;

	return Promise.resolve()
		.then(()=> execa('df', [options.path]))
		.then(({stdout}) => stdout.split('\n').slice(1).at(0)) // Remove first line (headers)
		.then(line => line.split(/\s+/)) // Split first line by whitespace
		.then(line => {
			let [device, size, used, avail, usePercent, mount] = line;
			return {device, size, used, avail, usePercent, mount};
		})
		.then(data => {
			data.size *= 1024;
			data.used *= 1024;
			data.avail *= 1024;
			data.usePercent = parseFloat(data.usePercent);
			data.freePercent = 100 - data.usePercent;
			return data;
		})
		.then(data => {
			let status = data.freePercent < options.critPercent ? 'CRIT'
				: data.freePercent < options.warnPercent ? 'WARN'
				: 'OK';

			return {
				status,
				message:
					status == 'OK'
					? `${readable.fileSize(data.used) || '0b'} / ${readable.fileSize(data.size)} @ ${data.freePercent}% free for ${options.mountAlias || data.mount} mount point`
					: `Only ${readable.fileSize(data.avail) || '0b'} ~ ${data.freePercent}% disk remaining - ${readable.fileSize(data.used)} / ${readable.fileSize(data.size)} @ ${data.usePercent}% used for ${options.mountAlias || data.mount} mount point`,
				description: `Disk usage at ${options.mountAlias || data.mount}`,
				metric: {
					id: 'spaceAvailable',
					type: 'numeric',
					unit: 'bytes',
					value: data.used,
					warnValue: '>=' + (options.warnPercent / 100) * data.size,
					critValue: '>=' + (options.critPercent / 100) * data.size,
				},
			};
		});
}
