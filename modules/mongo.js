import mongoose from 'mongoose';

/**
* Check mongo database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {String} [options.uri] The Mongoose URI to use, must specify this or `connection`
* @param {String} [options.connection] The Mongoose connector to use, must specify this or `uri`
*/
export function init(options) {
	let settings = {
		connection: null,
		uri: null,
		...options,
	};

	if (!settings.uri && !settings.connection) throw new Error('Must specify `uri` or `connection` option');

	if (!options.connection && options.uri) { // Try to connect
		return mongoose
			.set('strictQuery', false)
			.connect(settings.uri, {
				// "depreciated feature" surpression - assume sane Mongoose connection options in all cases
				useNewUrlParser: true,
				useUnifiedTopology: true,
			})
			.then(connection => options.connection = connection)
	}
}


/**
* Check mongo database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {Object} [options.models] Model spec to check, each key is a collection with the object value specifying options
* @param {Number} [options.models.minCount=1] Minimum document count to accept
* @returns {SanityModuleResponse}
*/
export function run(options) {
	let settings = {
		connection: null,
		models: {},
		...options,
	};

	return Promise.all(
		Object.entries(settings.models).map(([collection, colOptions]) => {
			let colSettings = {
				minCount: 1,
				...colOptions,
			};

			return Promise.resolve()
				.then(()=> {
					if (!settings.connection.models[collection]) { // Schema not defined - make a blank one
						settings.connection.model(collection, {});
					}
				})
				.then(()=> settings.connection.models[collection].countDocuments())
				.then(docCount => ({
					id: collection,
					status: docCount < colSettings.minCount ? 'CRIT' : 'OK',
					message: `Found ${docCount} documents`,
				}))
		})
	)
}
