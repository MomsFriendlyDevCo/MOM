import joi from 'joi';
import MOMResponseMetric from '#libs/MOMResponseMetric';

/**
* The response from a MOM module `run()` function
* @name {MOMResponse}
* @type {Object}
*
* @property {String} status The status response as an ENUM: 'PASS', 'WARN', 'CRIT', 'ERROR' (for internal errors)
* @property {Date} [date] Optional date for when the response as taken, defaults to now
* @property {String} [id] Optional sub-ID if the module returns multiple entries
* @property {String} [message] Human readable, longer version of the status / metric breakdown
* @property {MOMResponseMetric|Array<MOMResponseMetric>} [metrics] Collection of optional metric information about a response (or an array of the same), converted into an array if a single metric is given
*/
export default class MOMResponse {

	/**
	* Joi schema to validate a MOMResponse instance
	* This is used by `validate` to validate a raw POJO
	* @type {JoiSchema}
	*/
	static joiValidator = joi.object({
		id: joi.string(),
		date: joi.date().default(()=> new Date()).required(),
		status: joi.string().valid('PASS', 'WARN', 'CRIT', 'ERROR').required(),
		metric: joi.array().items(MOMResponseMetric.joiValidator),
	})


	/**
	* Validate a MOMResponse instance
	* @param {Object} response Raw MOMResponse POJO to validate
	* @throws JOIValidatorError
	*/
	static validate(response) {
		return MOMResponse.joiValidator.validate(response);
	}

}
