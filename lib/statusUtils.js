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

export let statusTextToIndex = Object.fromEntries(
	statuses.map(s => [s.id, s])
);


/**
* Examine an array of statuses and return the highest (i.e. most critical)
* @param {Array<Map>} statusList Array of statuses to evaluate
* @example
* highestStatus(['PASS', 'WARN', 'PASS', ' PASS']); //= 'WARN'
*/
export function maxStatus(statusList) {
	return statusList.reduce((highestStatus, thisStatus) =>
		highestStatus.value === undefined || statusTextToIndex[thisStatus] > highestStatus.value
			? {id: statusTextToIndex[thisStatus].id, value: thisStatus}
			: highestStatus
	, {id: undefined, value: undefined})
	.id;
}


export default {
	statuses,
	statusTextToIndex,
	maxStatus,
};
