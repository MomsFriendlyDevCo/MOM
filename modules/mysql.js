import Knex from 'knex';
import {URL} from 'node:url';

export function isAvailable() {
	throw new Error('Module not yet available');
}

/**
* Check MySQL database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {String} [options.uri] The MySQL URI to use, must specify this or `connection`
* @param {String} [options.connection] The MySQL+KNEX connector to use
*/
export function init({options}) {
	let settings = {
		connection: null,
		uri: null,
		...options,
	};

	if (!settings.uri && !settings.connection) throw new Error('Must specify `connection` option');

	if (!options.connection && options.uri) { // Try to connect
		let parsedUri = new URL(options.uri);
		let config = {
			client: 'mysql',
			connection: {
				host: parsedUri.hostname,
				port: +parsedUri.port,
				user: parsedUri.username,
				password: parsedUri.password,
				database: parsedUri.pathname.replace(/^\//, ''),
			},
		};
		console.log('CONNECT MYSQL', config);

		options.connection = new Knex(config)
	}
}

/**
* Check MySQL database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {String} options.connection The MySQL+KNEX connector to use
* @param {Object} [options.tables] Table spec to check, each key is a collection with the object value specifying options
* @param {Number} [options.tables.minCount=1] Minimum row count to accept
* @returns {SanityModuleResponse}
*/
export function run({options}) {
	let settings = {
		connection: null,
		tables: null,
		...options,
	};

	if (!settings.tables) throw new Error('At least one table should be specified in the `tables` config key');

	return Promise.all(
		Object.entries(settings.tables).map(([table, tableOptions]) => {
			let tableSettings = {
				minCount: 1,
				...tableOptions,
			};

			return settings.connection(table)
				.count()
				.then(docCount => {
					console.log('GOT DOCCOUNT', table, docCount);
				})
		})
	)
}
