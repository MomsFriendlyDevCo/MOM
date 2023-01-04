import axios from 'axios';
import {expect} from 'chai';
import express from 'express';
import expressLogger from 'express-log-url';
import {MOM} from '#lib/MOM';

describe('Reporter: Express', ()=> {

	// Setup MOM instance {{{
	let mom;
	before('setup MOM instance', ()=> {
		mom = new MOM()
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

		mom.reporter('express', {app, mom});

		server = app.listen(port, null, finish);
	});
	after(()=> server && server.close());
	// }}}

	before('wait for MOM to load', ()=> mom.promise());

	it('should return text output', function() {
		this.timeout(30 * 1000);

		return axios.get(`${url}/api/mom`)
			.then(({data}) => {
				console.log('---START---\n', data, '\n---EOF---');

				expect(data).to.be.a('string');
			})
	});

});
