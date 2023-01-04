export function init({options}) {
	let settings = {
		app: null,
		path: '/api/mom',
		middleware: [],
		mom: null,
		header: (req, res) => [], // eslint-disable-line no-unused-vars
		footer: (req, res) => [], // eslint-disable-line no-unused-vars
		...options,
	};

	if (!settings.mom) throw new Error('Must specify MOM instance');

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
			.then(()=> settings.mom
				.runAll()
				.then(momRes => {
					console.log('TAP MOMRES:', momRes);
					return momRes;
				})
				.then(momResponse => res.send(momResponse))
			)
			.then(text => res.send(text))
			.catch(e => res.status(400).send('ERROR: CORE: ' + e.toString()))
	)
}
