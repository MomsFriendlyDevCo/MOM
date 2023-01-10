import ping from 'ping';

export function config({Schema}) {
	return new Schema({
		host: {type: String, required: true, default: '8.8.8.8'},
		hostAlias: {type: String, default: ''},
		repeat: {type: Number, default: 3},
		warnTimeout: {type: 'duration', default: '100ms'},
		critTimeout: {type: 'duration', default: '500ms'},
	});
}


/**
* Ping remote servers and check for response times
* @param {Object} options The options to mutate behaviour
* @param {String} [options.host='8.8.8.8'] Host to ping
* @param {String} [options.hostAlias] Alternative name for the server during output
* @param {Number} [options.repeat=3] Number of pings to send
* @param {Number} [options.warnTimeout=100] Timeout in milliseconds after which WARN will occur
* @param {Number} [options.critTimeout=500] Timeout in milliseconds after which CRIT will occur
* @returns {MOMModuleResponse}
*/
export function run({options}) {
	return ping.promise.probe(options.host, {
		min_reply: options.repeat,
		deadline: options.critTimeout,
	})
		.then(res => {
			let status =
				!res.alive ? 'CRIT'
				: res.avg > options.critTimeout ? 'CRIT'
				: res.avg > options.warnTimeout ? 'WARN'
				: 'OK';

			return {
				status,
				message: res.alive
					? `Ping average to ${options.hostAlias || options.host} AVG=${res.avg} (MIN=${res.min} / MAX=${res.max})`
					: `Server ${options.hostAlias} is down or non-responsive`,
				description: 'Measure average Ping from the server',
				metric: {
					id: 'avgResponseTime',
					unit: 'timeMs',
					value: res.avg,
					critValue: `>${options.critTimeout}`,
					warnValue: `>${options.warnTimeout}`,
					description: `Average ping time to ${options.host}`,
				},
			};
		});
}
