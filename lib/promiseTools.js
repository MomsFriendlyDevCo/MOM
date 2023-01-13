/**
* Examine an array / object tree and don't return until all promises are resolved
* @param {Array|Object} obj The target to examine
* @returns {Promise<*>} A promise which will, eventually, return the resolved input object
*/
export function deepResolve(obj) {
	let promises = [];
	let objWalker = node => {
		if (Array.isArray(node)) { // Arrays
			node.forEach((arrayItem, arrayIndex) => {
				if (arrayItem instanceof Promise) {
					promises.push(arrayItem);
					arrayItem.then(result => node[arrayIndex] = result);
				} else {
					objWalker(arrayItem);
				}
			});
		} else if (typeof node == 'object') { // Misc object
			Object.entries(node)
				.forEach(([objectKey, objectItem]) => {
					if (objectItem instanceof Promise) {
						promises.push(objectItem);
						objectItem.then(result => node[objectKey] = result);
					} else {
						objWalker(objectItem)
					}
				})
		} // Implied else - Scalars - ignore
	};

	objWalker(obj); // Kick off initial traversal

	return Promise.all(promises)
		.then(()=> obj);
}

export default {
	deepResolve,
};
