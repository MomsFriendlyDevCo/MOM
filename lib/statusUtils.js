/**
* Collection of suported status returns
* @type {Array<Object>}
* @property {String} id The unique identifier, capitalized
* @property {String} text The human readable version of `id`
*/
export let statuses = [
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
export let statusTextToIndex = Object.fromEntries(
	statuses.map(s => [s.id, s])
);


/**
* Examine an array of statuses and return the highest (i.e. most critical)
* @param {Array<Map>} statusList Array of statuses to evaluate
* @example
* highestStatus(['OK', 'WARN', 'OK', ' OK']); //= 'WARN'
*/
export function maxStatus(statusList) {
	return statusList.reduce((highestStatus, thisStatus) =>
		highestStatus.value === undefined || statusTextToIndex[thisStatus] > highestStatus.value
			? {id: statusTextToIndex[thisStatus].id, value: thisStatus}
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
export function metricValueMatches(value, expression) {
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
export function getStatusFromMetric(metric) {
	if (
		metric.value !== undefined
		&& metric.critValue !== undefined
		&& metricValueMatches(metric.value, metric.critValue)
	) {
		return 'CRIT';
	} else if (
		metric.value !== undefined
		&& metric.warnValue !== undefined
		&& metricValueMatches(metric.value, metric.warnValue)
	) {
		return 'WARN';
	} else {
		return 'PASS'
	}
}


export default {
	getStatusFromMetric,
	maxStatus,
	metricValueMatches,
	statuses,
	statusTextToIndex,
};
