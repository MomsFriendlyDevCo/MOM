export function init(options) {
	let settings = {
		uri: null,
		...options,
	};
	if (!settings.uri) throw new Error('Must specify `uri` key');
}
