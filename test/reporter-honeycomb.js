
import {DotEnv} from '@momsfriendlydevco/dotenv';
import {expect} from 'chai';
import {Sanity} from '#lib/sanity';

describe('Reporter: Honeycomb', ()=> {

	let config;
	before('parse config', ()=> {
		config = new DotEnv()
			.parse(['.env.example', '.env'])
			.filterAndTrim(/^SANITY_REPORTER_HONEYCOMB\./)
			.camelCase()
			.schema({enabled: Boolean})
			.value()
	});

	it('should report to Honeycomb', function() {
		if (!config.enabled) return this.skip('Honeycomb disabled in config');

		this.timeout(30 * 1000);

		return new Sanity()
			.use('ping')
			.reporter('honeycomb', config)
			.runAll()
			.then(()=> console.log('Finished run all'))
	});

});
