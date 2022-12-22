import {inspect} from 'node:util';
import jsonColorizer from 'json-colorizer';

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
