import HotShots from 'hot-shots';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'uri', default: 'udp://localhost:8125', parse: true},
		prefix: {type: String, default: ''},
		tags: {type: Array, default: ''},
		dryRun: {type: Boolean, default: false},
	});
}


export function init({options, state, mom}) {
	let hsConfig = {
		host: options.uri.hostname,
		port: options.uri.port ?? 8125,
		protocol: (options.uri.protocol ?? 'udp').replace(/:$/, ''),
		prefix: options.prefix,
		globalTags: options.tags,
	}
	mom.debug('Connect to StatsD', hsConfig);
	state.statsD = new HotShots(hsConfig);
}


export function run({options, metrics, state}) {
	return Promise.all(metrics
		.filter(metric => metric.value !== undefined) // Only care about metrics with values
		.map(metric => Promise.resolve()
			.then(()=> !options.dryRun && state.statsD.gauge(metric.id, metric.value))
			.then(()=> (options.dryRun ? '(DRY-RUN) ' : '') + `${options.prefix}${metric.id}:${metric.value}|g`)
		)
	)
		.then(sent => sent.join('\n'))
}


export function shutdown({state}) {
	if (state.statsD) return state.statsD.close()
}
