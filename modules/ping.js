import ping from 'ping';

/**
* Ping remote servers and check for response times
* @param {Object} options The options to mutate behaviour
* @param {String} [options.host='8.8.8.8'] Host to ping
* @param {String} [options.hostAlias] Alternative name for the server during output
* @param {Number} [options.repeat=3] Number of pings to send
* @param {Number} [options.warnTimeout=100] Timeout in milliseconds after which WARN will occur
* @param {Number} [options.critTimeout=500] Timeout in milliseconds after which CRIT will occur
* @returns {SanityModuleResponse}
*/
export function run({options}) {
	let settings = {
		host: '8.8.8.8',
		hostAlias: null,
		repeat: 3,
		critTimeout: 500,
		warnTimeout: 100,
		...options,
	}
	if (!settings.host) throw new Error('No `host` key specified');

	return ping.promise.probe(settings.host, {
		min_reply: settings.repeat,
		deadline: settings.critTimeout,
	})
		.then(res => {
			let status =
				!res.alive ? 'CRIT'
				: res.avg > settings.critTimeout ? 'CRIT'
				: res.avg > settings.warnTimeout ? 'WARN'
				: 'OK';

			return {
				status,
				message: res.alive
					? `Ping average to ${settings.hostAlias || settings.host} AVG=${res.avg} (MIN=${res.min} / MAX=${res.max})`
					: `Server ${settings.hostAlias} is down or non-responsive`,
				description: 'Measure average Ping from the server',
				metric: {
					id: 'avgResponseTime',
					type: 'numeric',
					unit: 'timeMs',
					value: res.avg,
					critValue: `>${settings.critTimeout}`,
					warnValue: `>${settings.warnTimeout}`,
					description: `Average ping time to ${settings.host}`,
				},
			};
		});
}
