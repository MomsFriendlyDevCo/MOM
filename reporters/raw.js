/**
* Passthru internal module designed for simple testing
*/
export function config({Schema}) {
	return new Schema({
		type: {type: String, default: 'responses', enum: ['responses', 'metrics']},
	})
}

export function run({responses, metrics, options}) {
	switch (options.type) {
		case 'responses': return responses;
		case 'metrics': return metrics;
		default: throw new Error(`Unsupported export type "${options.type}"`);
	}
}
