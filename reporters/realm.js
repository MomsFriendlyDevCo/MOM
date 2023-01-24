import {convertMetricToMongoDoc, convertResponseToMongoDoc} from '#reporters/mongo';
import {format} from '@momsfriendlydevco/formatters';
import Realm from 'realm';

export function config({Schema}) {
	return new Schema({
		appId: {type: 'string', required: true},
		apiKey: {type: 'string', required: true},
		path: {type: 'string', default: '/tmp/realm', help: 'Local Realm state storage path'},
		responsesCollection: {type: 'string', required: false, default: 'mom_responses'},
		metricsCollection: {type: 'string', required: false, default: 'mom_metrics'},
	});
}

export function init({options, state}) {
	return Promise.resolve()
		.then(()=> new Realm.App({id: options.appId}))
		.then(app => app.logIn(Realm.Credentials.anonymous()))
		.then(()=> Realm.open({
			path: options.path, // Local swap for Realm
			schema: [
				{
					name: options.responsesCollection,
					primaryKey: '_id',
					properties: {
						_id: {type: 'objectId', default: () => new Realm.BSON.ObjectId()},
						ref: 'string',
						status: 'string',
						date: 'date',
						message: 'string?',
						tags: 'dictionary?',
					},
				},
				{
					name: options.metricsCollection,
					primaryKey: '_id',
					properties: {
						_id: {type: 'objectId', default: ()=> new Realm.BSON.ObjectId()},
						ref: 'string',
						response: {type: 'objectId', mapTo: options.responsesCollection},
						unit: {type: 'string', default: ()=> 'number'},
						value: 'float?',
						warnValue: 'string?',
						critValue: 'string?',
						description: 'string?',
					},
				},
			],
		}))
		.then(realm => state.realm = realm)
}

export function run({options, responses, state}) {
	return Promise.resolve()
		.then(()=> state.realm.write(()=> {
			let wroteCount = 0;

			// Write responses - first response then metric sub-items
			responses.forEach(response => {
				let newResponse = state.realm.create(options.responsesCollection, convertResponseToMongoDoc(response))
				response.metrics.forEach(metric =>
					state.realm.create(options.metricsCollection, convertMetricToMongoDoc(newResponse, metric))
				)
				wroteCount += 1 + response.metrics.length;
			})
			return wroteCount;
		}))
		.then(wroteCount => format(`Createad [style cyan]${wroteCount}[n][/style] item[s] in Realm`))
}
