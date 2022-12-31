import mongoose from 'mongoose';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'mongouri', required: true},
		collections: {type: 'keyvals', required: true, min: 1},
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


export function run({options, state}) {
	return Promise.all(
		Object.entries(options.collections).map(([collection, colEval]) => Promise.resolve()
			.then(()=> {
				if (!state.connection.models[collection]) { // Schema not defined - make a blank one
					state.connection.model(collection, {});
				}
			})
			.then(()=> state.connection.models[collection].countDocuments())
			.then(count => ({
				count,
				startTime: Date.now(),
				result: eval(colEval, {
					count,
				}),
			}))
			.then(({count, startTime, result}) => [
				{
					result,
					metric: {
						id: `${collection}.count`,
						type: 'numeric',
						value: count,
						description: `Check db.${collection}.count()`,
					},
				},
				{
					metric: {
						id: `${collection}.countTime`,
						type: 'timeMs',
						value: Date.now() - startTime,
						description: `Time to run db.${collection}.count()`,
					},
				},
			])
		)
	)
		.then(stats => stats.flat())
		.then(stats => ({
			status:
				stats.some(s => s.result === false) ? 'CRIT'
				: 'OK',
			message: `Check ${Object.keys(options.collections).length} collections`,
			metrics: stats.flatMap(s => s.metric),
		}))
}
