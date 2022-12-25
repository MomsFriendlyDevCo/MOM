import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {HoneycombSDK} from '@honeycombio/opentelemetry-node';
import {metrics as OTMetrics} from '@opentelemetry/api';


/**
* Write results to Honeycomb.io
* @param {Object} options The options to mutate behaviour
* @param {String} [options.connection] The HoneycombSDK connector to use, must specify this or `uri`
* @param {String} [options.apiKey] Honeycomb APi Key used to establish a connection
* @param {String} [options.serviceName] Honeycomb service name used to establish a connection
* @param {Boolean} [options.installStandard=false] Also install standard background Node instrumentations
* @param {Boolean} [options.dataSet='example-dataset'] The name of the Metrics data set to export to
*/
export function init({options}) {
	let settings = {
		connection: null,
		apiKey: null,
		serviceName: null,
		installStandard: true,
		dataSet: 'example-dataset',
		meter: 'example-meter',
		attributes: {},
		...options,
	};

	if (!settings.connection && !settings.apiKey) {
		throw new Error('Must specify `connection` or `apiKey` key');
	} else if (!settings.connection) { // Use apiKey + serviceName to establish connection
		options.metrics = {}; // Create storage for metric handles (during run)
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
export function run({metrics, sanity, options}) {
	let settings = {
		connection: null,
		apiKey: null,
		serviceName: null,
		installStandard: true,
		dataSet: 'example-dataset',
		meter: 'example-meter',
		attributes: {},
		dryRun: true,
		...options,
	};
	let meter = OTMetrics.getMeter(settings.meter);

	return Promise.all(metrics
		.filter(metric => metric.value !== undefined) // Only care about metrics with values
		.map(metric => {
			// Initalize metric if its not already loaded somewhere {{{
			if (!options.metrics[metric.id]) {
				switch (metric.type) {
					case 'numeric':
						sanity.debug(`Initalizing OpenTelemetry counter for METRIC:${metric.id}`);
						options.metrics[metric.id] = meter.createCounter(metric.id, {
							description: metric.description,
						});
						break;
					default:
						throw new Error(`Unsupported metric type "${metric.type}"`);
				}
			}
			// }}}

			// Record metric {{{
			if (settings.dryRun) {
				console.log(`Would record METRIC:${metric.id}`, '=', metric.value);
			} else {
				return options.metrics[metric.id].add(metric.value, settings.attributes);
			}
			// }}}
		})
	);
}


export function shutdown(options) {
	if (options.connection) return options.connection.shutdown()
}
