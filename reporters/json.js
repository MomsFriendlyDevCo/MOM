import {inspect} from 'node:util';
import jsonColorizer from 'json-colorizer';
import MOMResponseMetric from '#lib/MOMResponseMetric';

/**
* Output responses as JSON
* @param {Object} [options] Optional behaviour settings
* @param {String|Number} [options.indent=2] Indent setting for standard JSON output
* @param {String} [options.mode='prettyAuto'] How to output. ENUM: 'prettyAuto' (pretty only if STDOUT is a TTY), 'pretty' (force pretty mode), 'raw' (basic JSON output), 'object' JavaScript POJO
*/
export function config({Schema}) {
	return new Schema({
		human: {type: Boolean, default: true, help: 'Include human readable metrics where the unit supports this'},
		indent: {type: Number, default: 2},
		mode: {type: String, default: 'prettyAuto', enum: ['prettyAuto', 'pretty', 'raw', 'object']},
	});
}


export function run({responses, options}) {
	if (options.human) {
		responses.forEach(response =>
			response.metrics = response.metrics.map(MOMResponseMetric.decorate)
		);
	}

	switch (options.mode) {
		case 'raw':
			return JSON.stringify(responses);
		case 'pretty':
		case 'prettyAuto':
			return jsonColorizer(responses, {
				pretty: options.mode == 'pretty' || process.stdout.isTTY,
			});
		case 'object':
			return inspect(responses, {colors: true, depth: null});
		default:
			throw new Error(`Unknown JSON output mode: "${options.mode}"`);
	}
}
