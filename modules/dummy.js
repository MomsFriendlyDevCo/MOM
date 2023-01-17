export function config({Schema}) {
	return new Schema({
		status: {type: String, default: 'PASS', enum: ['PASS', 'WARN', 'CRIT', 'ERROR']},
		message: {type: String, default: 'Test message'},
		times: {type: Number, default: 1},
	});
}


/**
* Dummy test which returns the status / response requested
* @param {Object} options The options to mutate behaviour
* @param {String} [options.status='PASS'] Status to return
* @param {String} [options.message='Test message'] Message to return
* @param {Number} [options.times=1] How many responses to return to simulate a combined MOM response
* @returns {MOMModuleResponse}
*/
export function run({options}) {
	let settings = {
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
