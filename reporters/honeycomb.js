import {getNodeAutoInstrumentations} from '@opentelemetry/auto-instrumentations-node';
import {HoneycombSDK} from '@honeycombio/opentelemetry-node';
import {metrics as OTMetrics} from '@opentelemetry/api';


export function config({Schema}) {
	return new Schema({
		apiKey: String,
		serviceName: String,
		installStandard: {type: Boolean, default: false},
		dataSet: {type: String, default: 'example-dataset'},
		meter:  {type: String, default: 'example-meter'},
		attributes: {type: Object, default: {}},
		dryRun: {type: Boolean, default: true},
	});
}


/**
* Write results to Honeycomb.io
* @param {Object} options The options to mutate behaviour
* @param {String} [options.apiKey] Honeycomb APi Key used to establish a connection
* @param {String} [options.serviceName] Honeycomb service name used to establish a connection
* @param {Boolean} [options.installStandard=false] Also install standard background Node instrumentations
* @param {Boolean} [options.dataSet='example-dataset'] The name of the Metrics data set to export to
*/
export function init({options, state}) {
	options.metrics = {}; // Create storage for metric handles (during run)
	state.connection = new HoneycombSDK({
		apiKey: options.apiKey,
		serviceName: options.serviceName,
		debug: false,
		instrumentations: [
			(options.installStandard ? [getNodeAutoInstrumentations()] : []),
		],
		metricsDataset: options.dataSet,
	});

	return state.connection.start()
}


/**
* Push stats to Prometheus
*/
export function run({options, metrics, mom}) {
	let meter = OTMetrics.getMeter(options.meter);

	return Promise.all(metrics
		.filter(metric => metric.value !== undefined) // Only care about metrics with values
		.map(metric => {
			// Initalize metric if its not already loaded somewhere {{{
			if (!options.metrics[metric.id]) {
				// Taken from https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.Meter.html
				switch (metric.type) {
					case 'numeric':
					case 'timeMs':
						mom.debug(`Initalizing OpenTelemetry counter for METRIC:${metric.id}`);
						options.metrics[metric.id] = meter.createCounter(metric.id, {
							description: metric.description,
							unit: metric.unit,
						});
						break;
					default:
						throw new Error(`Unsupported metric type "${metric.type}"`);
				}
			}
			// }}}

			// Record metric {{{
			return Promise.resolve()
				.then(()=> !options.dryRun && options.metrics[metric.id].add(metric.value, options.attributes))
				.then(()=> [
					options.dryRun && '(DRY-RUN)',
					metric.id,
					'=',
					metric.value,
					metric.unit && `(unit:${metric.unit})`,
				]
					.filter(Boolean).join(' ')
				)
			// }}}
		})
	)
		.then(responses => responses
			.filter(Boolean)
			.join('\n')
		)
}


export function shutdown({state}) {
	if (state.connection) return state.connection.shutdown()
}
