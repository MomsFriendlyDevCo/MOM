import cache from '#lib/cache';


/**
* Return if a named throttle already exists based on its timing
* This is really a shallow warpper around the caching module
* @param {String} key The key to check the throttle for
* @returns {Promise<Date>} If the throttle exists this returns the expiry, if not returns boolean false
*/
export function isThrottled(key) {
	return cache.get(key, false)
		.then(val => val
			? new Date(val.expires)
			: false
		)
}


/**
* Create a throttle record based on a key and timing
* @param {String} key The key to create the throttle against
* @param {Number} timing The duration for expiry on the throttle
* @returns {Promise} A promise which resolves when the operation has completed
*/
export function createThrottle(key, timing = 0) {
	let now = new Date();
	let expiry = new Date(Date.now() + timing);

	return cache.set(key, {
		momPid: process.pid,
		key,
		created: now.toISOString(),
		timing,
		expires: expiry.toISOString(),
	}, expiry);
}

export default {
	isThrottled,
	createThrottle,
}
