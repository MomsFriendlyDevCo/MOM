import {run as textReporter} from '#reporters/text';

export function init({options}) {
	let settings = {
		app: null,
		path: '/api/mom',
		middleware: [],
		header: (req, res) => [], // eslint-disable-line no-unused-vars
		footer: (req, res) => [], // eslint-disable-line no-unused-vars
		...options,
	};

	// MOM checks {{{
	['app', 'path'].forEach(k => {
		if (!settings[k]) throw new Error(`Must provide "${k}" key`);
	});
	// }}}

	settings.app.get(
		settings.path,
		...[
			...settings.middleware,
		].filter(Boolean),
		(req, res) => Promise.resolve()
			.then(()=> textReporter.call(this, {
				options: {
					formatStatus: v => v, // Disable fancy output
				},
			}))
			.then(text => res.send(text))
			.catch(e => res.status(400).send('ERROR: CORE: ' + e.toString()))
	)
}
