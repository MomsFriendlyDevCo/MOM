import {globby} from 'globby';

export function config({Schema}) {
	return new Schema({
		glob: {type: String, required: true},
		warnNumber: {type: Number, default: 1},
		critNumber: {type: Number, default: 1},
	});
}

/**
* Check the various globs for presence on disk
* @param {Object} options The options to mutate behaviour
* @param {String} options.glob The glob to check
* @param {Number} [options.warnNumber=1] Number of matches to trigger a WARN status
* @param {Number} [options.critNumber=1] Number of matches to trigger a CRIT status
* @returns {MOMResponse}
*/
export function run({options}) {
	if (!options.glob || !options.glob.length) throw new Error('Must specify at least one glob in `glob` key');

	return globby(options.glob)
		.then(results => ({
			status:
				results.length < options.critNumber ? 'CRIT'
				: results.length < options.warnNumber ? 'WARN'
				: 'PASS',
			message: `Found ${results.length} matches`,
			description: Array.isArray(options.glob)
				? 'File count with globs ' + options.glob.map(g => `"${g}"`).join(', ')
				: `File count with glob "${options.glob}"`,
			metric: {
				id: 'fileCount',
				value: results.length,
				warnValue: `<${options.warnNumber}`,
				critValue: `<${options.critNumber}`,
			},
		}))
}
