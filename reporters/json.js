import {inspect} from 'node:util';
import jsonColorizer from 'json-colorizer';

/**
* Output responses as JSON
* @param {Object} [options] Optional behaviour settings
* @param {String|Number} [options.indent=2] Indent setting for standard JSON output
* @param {String} [options.mode='prettyAuto'] How to output. ENUM: 'prettyAuto' (pretty only if STDOUT is a TTY), 'pretty' (force pretty mode), 'raw' (basic JSON output), 'object' JavaScript POJO
*/
export function run (responses, options) {
	let settings = {
		indent: 2,
		mode: 'prettyAuto',
		...options,
	};

	switch (settings.mode) {
		case 'raw':
			return JSON.stringify(responses);
		case 'pretty':
		case 'prettyAuto':
			return jsonColorizer(responses, {
				pretty: settings.mode == 'pretty' || process.stdout.isTTY,
			});
		case 'object':
			return inspect(responses, {colors: true, depth: null});
		default:
			throw new Error(`Unknown JSON output mode: "${settings.mode}"`);
	}
}
