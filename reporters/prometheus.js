import PromClient from 'prom-client';

/**
* Write results to an Prometheus store
* @param {Object} options The options to mutate behaviour
* @param {String} [options.uri] The Prometheus URI to use, must specify this or `connection`
* @param {String} [options.connection] The Prometheus connector to use, must specify this or `uri`
* @param {Object} [options.gatewayOptions] Additional options to pass to the PromClient.PushGateway setup
*/
export function init({options}) {
	let settings = {
		uri: null,
		connection: null,
		gatewayOptions: {
		},
		token: null,
		...options,
	};

	if (!settings.connection && !settings.uri) {
		throw new Error('Must specify `connection` or `uri` key');
	} else if (!settings.connection) { // Use URI to create a connection
		settings.connection = new PromClient.Pushgateway(settings.uri, settings.gatewayOptions);
	}
}


/**
* Push stats to Prometheus
*/
export function run({metrics}) {
}
