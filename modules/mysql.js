import Knex from 'knex';
import safeEval from '@momsfriendlydevco/eval';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'uri', required: true, parse: true},
		sslCa: {type: 'file', buffer: true, required: false, help: 'Path to an SSL-CA.pem file to use as the root cert'},
		sslCert: {type: 'file', buffer: true, required: false, help: 'Path to an SSL-CERT.pem file to use as the client cert'},
		sslPassphrase: {type: 'string', required: false, default: ''},
		tables: {type: 'keyvals', required: true, min: 1},
	});
}

/**
* Check MySQL database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {String} [options.uri] The MySQL URI to use, must specify this or `connection`
* @param {String} [options.connection] The MySQL+KNEX connector to use
*/
export function init({options, state, mom}) {
	let config = {
		client: 'mysql',
		connection: {
			host: options.uri.hostname,
			port: +options.uri.port,
			user: options.uri.username,
			password: options.uri.password,
			database: options.uri.pathname.replace(/^\//, ''),
			ssl: {
				ca: options.sslCa,
				cert: options.sslCert,
				passphrase: options.sslPassphrase,
			},
		},
	};
	mom.debug('MySQL Connect with', config);

	state.connection = new Knex(config);
}

export function run({options, state}) {
	return Promise.all(
		Object.entries(options.tables).map(([table, colEval]) => Promise.resolve()
			.then(()=> state.connection(table).count())
			.then(count => ({
				count,
				startTime: Date.now(),
				result: safeEval(colEval, {
					count,
				}),
			}))
			.then(({count, startTime, result}) => [
				{
					result,
					metric: {
						id: `${table}.count`,
						value: count,
						description: `Check ${table} table row count`,
					},
				},
				{
					metric: {
						id: `${table}.countTime`,
						unit: 'timeMs',
						value: Date.now() - startTime,
						description: `Time to run ${table} table row count`,
					},
				},
			])
		)
	)
		.then(stats => stats.flat())
		.then(stats => ({
			status:
				stats.some(s => s.result === false) ? 'CRIT'
				: 'PASS',
			message: `Check ${Object.keys(options.tables).length} tables`,
			metrics: stats.flatMap(s => s.metric),
		}))
}
