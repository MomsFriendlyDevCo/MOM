import Cache from '@momsfriendlydevco/cache';
import config from '#lib/config';
import mom from '#lib/MOM';

let cache = new Cache({
	init: false, // Handled via init() below
	cleanAuto: true,
	cleanInit: true,
	modules: config.MOM_CACHE_METHOD,
	keyMangle: key => `MOM_${key}`,
});

/**
* Boot the module - intialized on the first get() / set() function automatically
* This returns a valved-promise if already loading OR a stub promise if already loaded
* @returns {Promise} A promise which resolves when the operation has completed
*/
export function init() {
	if (init.hasRun) { // Already run
		return Promise.resolve();
	} else if (init.promise) { // Already running
		return init.promise;
	} else {
		mom.debug('Cache init');
		init.promise = cache.init()
			.then(()=> init.hasRun = true)
			.then(()=> mom.debug('Cache init done'))
		return init.promise;
	}
}


/**
* Wrapper for the cache getter
* @param {String} key The key to get
* @param {*} fallback The value to set
* @returns {Promise<*>} Either the fetched cache value or `fallback`
*/
export function get(key, fallback) {
	return init()
		.then(()=> cache.get(key, fallback))
}


/**
* Wrapper for the cache checker
* @param {String} key The key to check
* @returns {Promise<Boolean>} Whether the cache has the given key store
*/
export function has(key) {
	return init()
		.then(()=> cache.has(key))
}


/**
* Wrapper for the cache setter
* @param {String} key The key to set
* @param {*} value The value to set
* @returns {Promise<*>} The value set
*/
export function set(key, value) {
	return init()
		.then(()=> cache.set(key, value))
}

export default {
	has,
	get,
	init,
	set,
};
