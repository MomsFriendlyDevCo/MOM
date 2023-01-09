export let statuses = [
	{
		id: 'OK',
		text: 'Ok',
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

export let statusTextToIndex = Object.entries(
	statuses.map(s => [s.id, s])
);


/**
* Examine an array of statuses and return the highest (i.e. most critical)
* @param {Array<Map>} statusList Array of statuses to evaluate
* @example
* highestStatus(['OK', 'WARN', 'OK', ' OK']); //= 'WARN'
*/
export function maxStatus(statusList) {
	return statuses[
			statusList.reduce((highestStatus, thisStatus) =>
			highestStatus === undefined || statusTextToIndex[thisStatus] > highestStatus
				? statusTextToIndex[thisStatus]
				: highestStatus
		, undefined)
	];
}


export default {
	statuses,
	statusTextToIndex,
	maxStatus,
};
