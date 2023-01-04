import joi from 'joi';

/**
* The response from a MOM module `run()` function
* @name {MOMModuleResponse}
* @type {Object}
* @property {String} status The status response as an ENUM: 'OK', 'WARN', 'CRIT', 'ERROR' (for internal errors)
* @property {Date} [date] Optional date for when the response as taken, defaults to now
* @property {String} [id] Optional sub-ID if the module returns multiple entries
* @property {String} [message] Human readable, longer version of the status / metric breakdown
* @property {Object|Array<Object>} [metrics] Collection of optional metric information about a response (or an array of the same)
* @property {String} [metrics.id] Unique ID for this metric, composed of the parent MOMModuleResponse + subkeys
* @property {String} [metrics.type='numeric'] The type of the metric
* @property {String} [metrics.unit='number'] The unit of measure. ENUM: 'number', 'bytes', 'timeMs'
* @property {Number} [metrics.value] The current value of the metric
* @property {String} [metrics.warnValue] The warning value of the metric, should resemble an eval expression e.g. `<=10`, '>255'
* @property {String} [metrics.critValue] The critical value of the metric, should resemble an eval expression e.g. `<=10`, '>255'
* @property {String} [metrics.description] Short description of this specific metric - e.g. `Memory usage <=90%`,
*/
export default class MOMModuleResponse {

	/**
	* Joi schema to validate a MOMModuleResponse instance
	* This is used by `validate` to validate a raw POJO
	* @type {JoiSchema}
	*/
	static joiValidator = joi.object({
		id: joi.string(),
		date: joi.date().default(()=> new Date()).required(),
		status: joi.string().valid('OK', 'WARN', 'CRIT', 'ERROR').required(),
		metric: joi.array().items(joi.object({
			id: joi.string(),
			type: joi.string().default('numeric').valid('numeric'),
			unit: joi.string().default('number').valid('number', 'bytes', 'timeMs'),
			value: joi.number().required(),
			valueMax: joi.number(),
			warnValue: joi.string(),
			critValue: joi.string(),
			description: joi.string(),
		})),
	})

	/**
	* Validate a MOMMOduleResponse instance
	* @param {Object} response Raw MOMModuleResponse POJO to validate
	* @throws JOIValidatorError
	*/
	static validate(response) {
		return MOMModuleResponse.joiValidator.validate(response);
	}
}
