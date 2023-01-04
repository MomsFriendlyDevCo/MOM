/**
* An object instance passed to MOMReporter / MOMModules
* The intention is that each module destructures this into the components they need
* @type {Object} A POJO of simple key/vals
*/

import {Schema as DotEnvSchema} from '@momsfriendlydevco/dotenv/Schema';

export default class MOMInjector {
	/**
	* Parent MOM instance
	* @type {MOM}
	*/
	mom;


	/**
	* Options relevent to the initalization of the MOMModule / MOMReporter
	* @type {Object}
	*/
	options;


	/**
	* Optional storage for a module / reporter
	* @type {Object}
	*/
	state;


	/**
	* The current runs MOMModuleResponse collection
	* Available During a Run for MOMReporter instances only
	* @type {Array<MOMModuleResponse>}
	*/
	responses;


	/**
	* The current runs MOMModuleResponse collections metrics extracted into a collection
	* Available During a Run for MOMReporter instances only
	* @type {Array<Object>} All metrics extracted from the current runs responses
	*/
	metrics;


	/**
	* Conveneince class initalizer for config() functions that need to return a schema
	* @type {DotEnvSchema}
	*/
	Schema = DotEnvSchema;


	/**
	* Initalize the instance setting all keys to any provided
	* @param {Object} obj A POJO specifying any of the above properties
	*/
	constructor(obj) {
		Object.assign(this, obj);
	}
}
