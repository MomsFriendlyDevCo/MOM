/**
* Dummy test which returns the status / response requested
* @param {Object} options The options to mutate behaviour
* @param {String} [options.status='OK'] Status to return
* @param {String} [options.message='Test message'] Message to return
* @param {Number} [options.times=1] How many responses to return to simulate a combined Sanity response
* @returns {SanityModuleResponse}
*/
export function run(options) {
	let settings = {
		status: options.status || 'OK',
		message: options.message || 'Test message',
		times: 1,
		...options,
	};

	let makeItem = ()=> ({
		status: settings.status,
		message: settings.message,
	});

	// Single items
	if (settings.times == 1) {
		return makeItem();
	} else {
		return Array.from(new Array(settings.times))
			.map(()=> makeItem());
	}
}
