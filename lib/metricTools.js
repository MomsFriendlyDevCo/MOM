import cache from '#lib/cache';

/**
* Return the difference since the last time a metric was sampled to now
* This is useful if only recieving snapshot totals and not a diff
* @param {String} id The unique ID of the item to cache
* @param {Number} value The current value
* @returns {Promise<Number|null>} Either the eventual difference between the last measaure OR null if no metrics are found
*/
export function snapshotSinceLast(id, value) {
	let key = `${id}-snapshot`;
	return cache.get(key)
		.then(currentSnapshot => cache.set(key, {
			type: 'data-snapshot',
			date: new Date().toISOString(),
			value,
		})
			.then(()=>
				currentSnapshot ? value - currentSnapshot.value // We have a historical value - find the diff
				: null // No value - assume we don't have enough metrics yet
			)
		)
}

export default {
	snapshotSinceLast,
}
