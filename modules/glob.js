import {globby} from 'globby';

/**
* Check the various globs for presence on disk
* @param {Object} options The options to mutate behaviour
* @param {String} options.glob The glob to check
* @param {Number} [options.warnNumber=1] Number of matches to trigger a WARN status
* @param {Number} [options.critNumber=1] Number of matches to trigger a CRIT status
* @returns {SanityModuleResponse}
*/
export function run(options) {
	let settings = {
		glob: null,
		warnNumber: 1,
		critNumber: 1,
		...options,
	};

	if (!settings.glob || !settings.glob.length) throw new Error('Must specify at least one glob in `glob` key');

	return globby(settings.glob)
		.then(results => ({
			status:
				results.length < settings.critNumber ? 'CRIT'
				: results.length < settings.warnNumber ? 'WARN'
				: 'OK',
			message: `Found ${results.length} matches`,
			description: Array.isArray(settings.glob)
				? 'File count with globs ' + settings.glob.map(g => `"${g}"`).join(', ')
				: `File count with glob "${settings.glob}"`,
			metric: {
				id: 'fileCount',
				type: 'numeric',
				value: results.length,
				warnValue: `<${settings.warnNumber}`,
				critValue: `<${settings.critNumber}`,
			},
		}))
}
