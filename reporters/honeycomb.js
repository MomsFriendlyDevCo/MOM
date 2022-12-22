import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {HoneycombSDK} from '@honeycombio/opentelemetry-node';
import {metrics} from '@opentelemetry/api';


/**
* Write results to Honeycomb.io
* @param {Object} options The options to mutate behaviour
* @param {String} [options.connection] The HoneycombSDK connector to use, must specify this or `uri`
* @param {String} [options.apiKey] Honeycomb APi Key used to establish a connection
* @param {String} [options.serviceName] Honeycomb service name used to establish a connection
* @param {Boolean} [options.installStandard=false] Also install standard background Node instrumentations
* @param {Boolean} [options.dataSet='example-dataset'] The name of the Metrics data set to export to
*/
export function init(options) {
	let settings = {
		connection: null,
		apiKey: null,
		serviceName: null,
		installStandard: true,
		dataSet: 'example-dataset',
		...options,
	};

	if (!settings.connection && !settings.apiKey) {
		throw new Error('Must specify `connection` or `apiKey` key');
	} else if (!settings.connection) { // Use apiKey + serviceName to establish connection
		options.connection = new HoneycombSDK({
			apiKey: settings.apiKey,
			serviceName: settings.serviceName,
			debug: true,
			instrumentations: [
				(settings.installStandard ? [getNodeAutoInstrumentations()] : []),
			],
			metricsDataset: options.dataSet,
		});

		return options.connection.start()
	}
}


/**
* Push stats to Prometheus
*/
export function run(responses, options) {
	let meter = metrics.getMeter('example-exporter-collector');

	const requestCounter = meter.createCounter('requests', {
		description: 'Example of a Counter',
	});

	const upDownCounter = meter.createUpDownCounter('test_up_down_counter', {
		description: 'Example of a UpDownCounter',
	});

	const attributes = { environment: 'staging' };

	let intervalHandle = setInterval(() => {
		console.log('TICK!');
		requestCounter.add(1, attributes);

		let counterVal = Math.random() > 0.5 ? 1 : -1;
		console.log('Give counter val', counterVal);
		upDownCounter.add(counterVal, attributes);

		console.log('DONE TICK');
	}, 1000);

	return new Promise(resolve => {setTimeout(() => {
		console.log('DO QUIT');
		clearInterval(intervalHandle);
		console.log('FLUSHING');
		options.connection.shutdown()
			.then(()=> console.log('DONE FLUSH'))
			.then(()=> resolve())
	}, 120 * 1000) });
}
