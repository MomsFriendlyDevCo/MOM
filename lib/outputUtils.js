import config from '#lib/config';
import jsome from 'jsome';

// Assign JSOME config from config.settings.json
Object.assign(jsome.colors, config.settings.json);

/**
* Output JSON to console, pretty printing if we can
* @param {*} obj The output to log
* returns {void}
*/
export function logJSON(obj) {
	if (process.stdout.isTTY) {
		jsome(obj, config.settings.json);
	} else {
		console.log(JSON.stringify(obj, null, 2));
	}
}
