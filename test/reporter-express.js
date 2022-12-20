import axios from 'axios';
import {expect} from 'chai';
import express from 'express';
import expressLogger from 'express-log-url';
import {Sanity} from '#lib/sanity';

describe('Reporter: Express', ()=> {

	// Setup Sanity instance {{{
	let sanity;
	before('setup Sanity instance', ()=> {
		sanity = new Sanity()
			// .use('diskSpace')
			.use('diskSpaceTemp')
			.use('ping')
	});
	// }}}

	// Server setup {{{
	const port = 8181;
	const url = `http://localhost:${port}`;

	let server;
	before('setup a server', function(finish) {
		let app = express();
		app.use(expressLogger);
		app.set('log.indent', '      ');

		sanity.reporter('express', {app});

		server = app.listen(port, null, finish);
	});
	after(()=> server && server.close());
	// }}}

	before('wait for sanity to load', ()=> sanity.promise());

	it('should return text output', function() {
		this.timeout(30 * 1000);

		return axios.get(`${url}/api/sanity`)
			.then(({data}) => {
				console.log('---START---\n', data, '\n---EOF---');

				expect(data).to.be.a('string');
			})
	});

});
