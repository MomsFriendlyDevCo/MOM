import {format} from '@momsfriendlydevco/formatters';
import {Socket} from 'node:net';

/**
* Protocol validation data
* @type {Object} An object of protocol shortname to data
* @property {Array<Number>} [ports] Regular ports this service listens on in case the user only passed the protocol
* @property {String|Function} [write] Optional string or function (called as `(socket)`) to write to prod the remote connection into action, expected to return string / buffer to write to the connection
* @property {Function} validate Function called as `(data, socket)` to validate or throw if the response isn't valid
*/
export let protocols = {
	any: { // Always pass as long as the socket was accepted
		validate: ()=> true,
	},
	http: {
		ports: [80, 8080],
		write: 'GET /\n\n',
		validate: data => /^HTTP\/1.1/.test(data),
	},
	ssh: {
		ports: [22],
		write: '',
		validate: data => /^SSH-2\.\d+-/.test(data),
	},
};


export function config({Schema}) {
	return new Schema({
		ports: {type: 'keyvals', required: true, default: '22:ssh', min: 1, noValue: 'any', help: 'CSV of `port: service` to scan, omitting the service assumes "any"'},
		host: {type: 'string', default: 'localhost'},
		timeout: {type: 'duration', required: true, default: '3s'},
		failStatus: {type: String, required: true, default: 'CRIT', help: 'How to treat failed ports'},
		timeoutStatus: {type: String, required: true, default: 'WARN', help: 'How to treat timed-out ports'},
		timeoutWrite: {type: 'duration', required: true, default: '10s', help: 'Maximum wait time after writing to the open socket to wait for a response'},
	});
}

export function run({options, mom}) {
	options.ports = {22: 'ssh', 80: 'http', 666: 'any', 777: 'any'}; // FIXME: Why won't this populate from .env?

	let invalidProtocols = Object.values(options.ports).filter(protocol => !protocols[protocol]);
	if (invalidProtocols.length > 0) throw new Error(format(`Invalid protocol[s]: [list]${invalidProtocols}[/list]`));

	return Promise.all(Object.entries(options.ports)
		.map(([port, protocol]) => {
			let socket;
			let startWriteDate = Date.now();
			return Promise.resolve()
				.then(()=> socket = new Socket())
				.then(()=> new Promise((resolve, reject) => {
					mom.debug(`Port probe ${options.host}:${port} (protocol=${protocol}, timeout=${options.timeout})`);
					socket
						.setTimeout(options.timeout)
						.on('timeout', ()=> reject('TIMEOUT'))
						.connect({
							host: options.host,
							port,
						})
						.on('connect', resolve)
						.on('error', reject)
				}))
				.then(()=> new Promise((resolve, reject) => {
					mom.debug(`Port probe connected to ${options.host}:${port}`);

					let writeTimeout = setTimeout(()=> reject('TIMEOUT'), options.timeoutWrite);

					socket
						.on('data', buf => {
							clearTimeout(writeTimeout);
							let data = buf.toString();
							mom.debug(`Data received from ${options.host}:${port} - ${data.length}b`);
							resolve(data);
						})

					if (protocols[protocol].write) // Do we need to prod the socket for data?
						socket.write(
							typeof protocols[protocol].write == 'function'
								? protocols[protocol].write(socket)
								: protocols[protocol].write
						);
				}))
				.then(socketResponse => Promise.resolve()
					.then(()=> {
						let isValid = protocols[protocol].validate(socketResponse, socket)
						if (isValid === false) throw new Error({_group: 'ivld'})
					})
					.catch(e => {
						mom.debug(`Probe for ${options.host}:${port} failed validation`, e);
						throw new Error({_group: 'ivld'})
					})
				)
				.then(()=> ({
					_group: 'pass',
					_port: port,
					_protocol: protocol,
					id: port,
					unit: 'timeMs',
					value: Date.now() - startWriteDate,
					description: `Response time of port ${port}:${protocol}`,
				}))
				.catch(e => ({
					_group: 'fail',
					_port: port,
					_protocol: protocol,
					_err: e,
					id: port,
					...(
						typeof e == 'object' && e._group ? e // Merge in error data if its valid
						: e === 'TIMEOUT' ? {_group: 'tout'}
						: {}
					),
				}))
				.finally(socket => socket && socket.destroy())
		})
	)
	.then(portReports => {
		let groups = portReports.reduce((bins, pr) => {
			bins[pr._group].push(`${pr._port}:${pr._protocol}`)
			return bins;
		}, {pass: [], fail: [], tout: [], ivld: []});

		return {
			status: groups.fail.length > 0 ? options.failStatus
				: groups.tout.length > 0 ? options.timeoutStatus
				: groups.ivld.length > 0 ? options.invalidStatus
				: 'OK',
			message:
				groups.fail.length > 0 || groups.tout.length > 0
					? format([ // At least one port failed / timed out
						groups.fail.length > 0 && `[list]${groups.fail}[/list] port[s] failed`,
						groups.tout.length > 0 && `[list]${groups.tout}[/list] port[s] timed out`,
						groups.ivld.length > 0 && `[list]${groups.ivld}[/list] port[s] failed protocol validation`,
						groups.pass.length > 0 && `[list]${groups.pass}[/list] port[s] responded normally`,
					], {join: ', '})
					: `Port checks succeeded for [list cutoff=5]${groups.pass}[/list]`,
			metrics: portReports,
		};
	})
}
