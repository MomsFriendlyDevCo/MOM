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

	/**
	* Create a MOMResponse object by examining a colletion of metrics and infering statuses
	* @param {Array<Object>} metrics Metrics to examine
	* @param {Object} [options] Generic options to map defaults under various overall statues
	* @param {Object} [options.all] Apply all values as defaults for any overall status
	* @param {Object} [options.pass] Apply all values as defaults for PASS overall status
	* @param {Object} [options.warn] Apply all values as defaults for WARN overall status
	* @param {Object} [options.crit] Apply all values as defaults for CRIT overall status
	* @returns {MOMModuleResponse} The full module response
	*/
	static fromMetrics(metrics, options) {
		let maxStatus = maxStatus(
			...metrics.map(m =>
				getStatusFromMetric(m)
			)
		);

		return {
			status: maxStatus,
			message:
				maxStatus == 'PASS' ? 'Tests passing'
				: maxStatus == 'ERROR' ? 'Module errored out'
				: listAnd(
					metrics
						.filter(m => m.status == maxStatus)
						.map(m => {
							let {cond, numeric} = /^(?<cond><=|>=|<|>|==|=)\s*(?<numeric>\d+)$/.exec(maxStatus == 'CRIT' ? 'critValue' : 'warnValue')?.groups || {};

							let condition = maxStatus == 'CRIT' ? 'critical' : 'warning';
							return format([
								`${m.id}`,
								cond == '=' || cond == '==' ? `is at ${condition} value ${numeric}[n]`
								: cond == '<' ? `is below ${condition} value ${numeric}[n]`
								: cond == '<=' ? `is at or below ${condition} value ${numeric}[n]`
								: cond == '>' ? `is above ${condition} value ${numeric}[n]`
								: cond == '>=' ? `is at or above ${condition} value ${numeric}[n]`
								: 'Has an unknown value'
						])
					})
			),
		...options.all,
		...options[maxStatus],
		}
	}

}