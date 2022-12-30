import mongoose from 'mongoose';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'mongouri', required: true},
		model: {type: 'keyval', required: true, min: 1},
	});
}


/**
* Check mongo database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {String} [options.uri] The Mongoose URI to use, must specify this or `connection`
*/
export function init({options, state}) {
	if (!options.uri) throw new Error('Must specify `uri` or `connection` option');

	return mongoose
		.set('strictQuery', false)
		.connect(options.uri, {
			// "depreciated feature" surpression - assume sane Mongoose connection options in all cases
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(connection => state.connection = connection)
}


/**
* Check mongo database connectivity + other functionality
* @param {Object} options The options to mutate behaviour
* @param {Object} [options.models] Model spec to check, each key is a collection with the object value specifying options
* @param {Number} [options.models.minCount=1] Minimum document count to accept
* @returns {SanityModuleResponse}
*/
export function run({options, state}) {
	return Promise.all(
		Object.entries(options.models).map(([collection, colOptions]) => {
			let coloptions = {
				minCount: 1,
				...colOptions,
			};

			return Promise.resolve()
				.then(()=> {
					if (!state.connection.models[collection]) { // Schema not defined - make a blank one
						state.connection.model(collection, {});
					}
				})
				.then(()=> state.connection.models[collection].countDocuments())
				.then(docCount => ({
					id: collection,
					status: docCount < coloptions.minCount ? 'CRIT' : 'OK',
					message: `Found ${docCount} documents`,
					description: `Documents in db.${collection}`,
					metric: {
						id: `${collection}.count`,
						type: 'numeric',
						value: docCount,
						critValue: `>=${colOptions.minCount}`,
						description: `Check db.${collection}.count() >= ${coloptions.minCount}`,
					},
				}))
		})
	)
}
