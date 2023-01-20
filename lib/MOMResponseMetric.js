import joi from 'joi';
import {formatByUnit} from '@momsfriendlydevco/formatters';

/**
* A sinlge metric which forms part of a MOMResponse
* @name {MOMResponseMetric}
* @type {Object}
*
* @property {String} [id] Unique ID for this metric, composed of the parent MOMResponse + subkeys
* @property {String} [type='numeric'] The type of the metric
* @property {String} [unit='number'] The unit of measure. ENUM: 'number', 'percentage', 'bytes', 'timeMs', 'percentage'
* @property {Number} [value] The current value of the metric
* @property {String} [warnValue] The warning value of the metric, should resemble an eval expression e.g. `<=10`, '>255'
* @property {String} [critValue] The critical value of the metric, should resemble an eval expression e.g. `<=10`, '>255'
* @property {String} [description] Short description of this specific metric - e.g. `Memory usage <=90%`,
*/
export default class MOMResponseMetric {

	/**
	* Joi schema to validate a MOMResponse instance
	* This is used by `validate` to validate a raw POJO
	* @type {JoiSchema}
	*/
	static joiValidator = joi.object({
		id: joi.string(),
		type: joi.string().default('numeric').valid('numeric'),
		unit: joi.string().default('number').valid('number', 'bytes', 'timeMs', 'percentage'),
		value: joi.number().required(),
		valueMax: joi.number(),
		warnValue: joi.string(),
		critValue: joi.string(),
		description: joi.string(),
	});


	/**
	* Decorate additional utility properties to a Metric-like object
	* @returns {MOMResponseMetric} The incomming metric object with additional properties
	* @property {Array<String>} idPath The path of the metric split into segments
	* @property {String} status The metric status, derrived from the `warnValue` / `critValue` fields (if specified)
	* @property {String} valueFormatted The original `value` property formatted into a human readable string (e.g. 1024 -> `1,024`)
	*/
	static decorate(metric) {
		let status =
			metric.critValue && MOMResponseMetric.evalExpression(metric.value, metric.critValue, metric.valueMax) ? 'CRIT'
			: metric.warnValue && MOMResponseMetric.evalExpression(metric.value, metric.warnValue, metric.valueMax) ? 'WARN'
			: 'PASS';

		Object.assign(metric, {
			idPath: metric.id.split(/[\.\/]+/), // eslint-disable-line
			status,
			valueFormatted: formatByUnit(metric.value, metric.unit ?? 'number'),
			...(metric.valueMax
				? {valueMaxFormatted: formatByUnit(metric.valueMax, metric.unit)}
				: {}
			),
		});

		return metric;
	}

	static evalExpression(value, expr, max) {
		let ex = /^(?<sign><|>|=)(?<eq>=)?\s*(?<value>\d+)(?<percentile>%)?$/.exec(expr)?.groups;
		if (!ex || !ex.sign) throw new Error(`Cannot evaluate expression segment "${expr}"`);

		// Calculate values relative to a max
		if (ex.percentile) {
			if (max === undefined) throw new Error('Cannot calculate percentile with no max value');
			ex.value = max * (ex.value / 100);
		}

		if (ex.sign == '<' && ex.eq) {
			return value <= ex.value;
		} else if (ex.sign == '<') {
			return value < ex.value;
		} else if (ex.sign == '>' && ex.eq) {
			return value >= ex.value;
		} else if (ex.sign == '>') {
			return value > ex.value;
		} else if (ex.sign == '=') {
			return value == ex.value;
		} else {
			throw new Error(`Unknown expression format "${expr}"`);
		}
	}

	/**
	* Collection of suported status returns
	* @type {Array<Object>}
	* @property {String} id The unique identifier, capitalized
	* @property {String} text The human readable version of `id`
	*/
	static statuses = [
		{
			id: 'PASS',
			text: 'Passed',
		},
		{
			id: 'ERROR',
			text: 'Error',
		},
		{
			id: 'WARN',
			text: 'Warning',
		},
		{
			id: 'CRIT',
			text: 'Critical',
		},
	];


	/**
	* Object lookup of status.id to the status object
	* @see statuses
	* @type {Object}
	*/
	static statusTextToIndex = Object.fromEntries(
		MOMResponseMetric.statuses.map(s => [s.id, s])
	);


	/**
	* Examine an array of statuses and return the highest (i.e. most critical)
	* @param {Array<Map>} statusList Array of statuses to evaluate
	* @example
	* highestStatus(['OK', 'WARN', 'OK', ' OK']); //= 'WARN'
	*/
	static maxStatus(statusList) {
		if (!statusList || statusList.length == 0) return 'PASS';

		return statusList.reduce((highestStatus, thisStatus) =>
			highestStatus.value === undefined || MOMResponseMetric.statusTextToIndex[thisStatus] > highestStatus.value
				? {id: MOMResponseMetric.statusTextToIndex[thisStatus].id, value: thisStatus}
				: highestStatus
		, {id: undefined, value: undefined})
		.id;
	}


	/**
	* Evaluates a metric value against an expression (e.g. '>=10') and returns the boolean result
	* @param {Number} value The value of the metric
	* @param {String} expression The expression to evaluate
	* @returns {Boolean} The boolean result
	*/
	static metricValueMatches(value, expression) {
		let {cond, numeric} = /^(?<cond><=|>=|<|>|==|=)\s*(?<numeric>\d+)$/.exec(value)?.groups || {};
		if (!cond || numeric === undefined) throw new Error(`Unable to parse expression "${expression}"`);

		switch (cond) {
			case '=':
			case '==': return value == numeric;

			case '<': return value < numeric;
			case '<=': return value <= numeric;

			case '>': return value > numeric;
			case '>=': return value >= numeric;

			default: throw new Error(`Unsupported numeric conditional "${cond}" in expression "${expression}"`);
		}
	}


	/**
	* Get the status of a metric using its value + warnValue / critValue
	* @param {Object} metric The metric to examine
	* @returns {String} The status of the metric (e.g. 'WARN')
	*/
	static statusFromMetric(metric) {
		try {
			if (
				metric.value !== undefined
				&& metric.critValue
				&& MOMResponseMetric.metricValueMatches(metric.value, metric.critValue)
			) {
				return 'CRIT';
			} else if (
				metric.value !== undefined
				&& metric.warnValue
				&& MOMResponseMetric.metricValueMatches(metric.value, metric.warnValue)
			) {
				return 'WARN';
			} else {
				return 'PASS'
			}
		} catch (e) {
			throw new Error(`Error while processing metric "${metric.id}": ${e.toString().replace(/^Error: /,'')}`);
		}
	}
}
