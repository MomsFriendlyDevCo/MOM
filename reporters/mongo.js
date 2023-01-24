import {format, listAnd} from '@momsfriendlydevco/formatters';
import mongoose, {Schema} from 'mongoose';
import MOMResponseMetric from '#lib/MOMResponseMetric';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'mongouri', required: true, parse: true},
		responsesCollection: {type: 'string', required: false, default: 'mom_responses'},
		metricsCollection: {type: 'string', required: false, default: 'mom_metrics'},
	});
}

export function init({options, state}) {
	return mongoose
		.set('strictQuery', false)
		.connect(options.uri.toString(), {
			// "depreciated feature" surpression - assume sane Mongoose connection options in all cases
			useNewUrlParser: true,
			useUnifiedTopology: true,
		})
		.then(connection => state.connection = connection)
		.then(()=> {
			// Create responsesCollection if required
			if (options.responsesCollection) {
				state.responsesModel = state.connection.model(options.responsesCollection, new Schema({
					ref: {type: String, required: true},
					status: {type: String, required: true, enum: MOMResponseMetric.statuses.map(s => s.id)},
					date: {type: Date, required: true},
					message: {type: String},
					tags: {type: 'string{}'},
				}));
			}

			// Create metricsCollection if required
			if (options.metricsCollection) {
				state.metricsModel = state.connection.model(options.metricsCollection, new Schema({
					ref: {type: String, required: true},
					response: {type: mongoose.Schema.Types.ObjectId, ref: options.responsesCollection},
					unit: {type: String, required: true, enum: ['number', 'percentage', 'bytes', 'timeMs', 'percentage'], default: 'number'},
					value: {type: Number, required: false},
					warnValue: {type: String, required: false},
					critValue: {type: String, required: false},
					description: {type: String, required: false},
				}));
			}
		})
}


/**
* Function used to convert a MOMReponse to a Mongo compatible POJO
* @param {MOMResponse} response The response to convert
* @returns {Object} The output object to send to Mongo
*/
export function convertResponseToMongoDoc(response) {
	return {
		ref: response.id,
		status: response.status,
		date: response.date,
		message: response.message,
	};
}


/**
* Function used to convert a MOMReponseMetric to a Mongo compatible POJO
* @param {Object} responseDoc The created Mongo object representing the MOMResponse
* @param {MOMResponseMetric} metric The metric to convert
* @returns {Object} The output object to send to Mongo
*/
export function convertMetricToMongoDoc(responseDoc, metric) {
	return {
		ref: metric.id,
		response: responseDoc._id,
		unit: metric.unit,
		value: +metric.value,
		warnValue: metric.warnValue || undefined,
		critValue: metric.critValue || undefined,
		description: metric.description || undefined,
	};
}


export function run({options, responses, state}) {
	return Promise.resolve()
		.then(()=> Object.fromEntries( // Create lookup object of {reponses.id:String => response:Object}
			responses.map(response => [response.id, response])
		))
		.then(responsesById => state.responsesModel.insertMany(
			Object.values(responsesById)
				.map(convertResponseToMongoDoc)
		)
			.then(createdDocs => ({createdDocs, responsesById}))
		)
		.then(({createdDocs, responsesById}) => {
			createdDocs.forEach(createdDoc =>
				responsesById[createdDoc.ref]._id = createdDoc._id // Stash created MongoID against created response
			)
			return responsesById;
		})
		.then(responsesById => state.metricsModel.insertMany(
			Object.values(responsesById)
				.flatMap(response => response.metrics.map(metric =>
					convertMetricToMongoDoc(response._id, metric)
				))
		))
		.then(createdDocs => format([
			'Sent',
			listAnd([
				responses.length > 0 && `[style cyan]${responses.length}[n][/style] response[s]`,
				createdDocs.length > 0 && `[style cyan]${createdDocs.length}[n][/style] metric[s]`,
			]),
			`to [style cyan]${options.uri.hostname}[/style]`,
		]))
}
