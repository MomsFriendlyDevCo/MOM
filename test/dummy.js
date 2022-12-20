import {expect} from 'chai';
import {Sanity} from '#lib/sanity';

describe('dummy', ()=> {

	it('should return a SanityModuleResponse', function() {
		this.timeout(30 * 1000);

		return new Sanity()
			.use('dummy', {status: 'OK'})
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.have.property('id', 'dummy');

				expect(res[0]).to.have.property('date');
				expect(res[0].date).to.be.an.instanceOf(Date);

				expect(res[0]).to.have.property('status');
				expect(res[0].status).to.be.equal('OK')

				expect(res[0]).to.have.property('message');
				expect(res[0].message).to.be.a('string');
			})
	});

	it('should return multiple SanityModuleResponses if given multiple identical tests', ()=>
		new Sanity()
			.use('dummy', {status: 'OK', times: 3})
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(3);

				res.forEach(item => {
					expect(item).to.have.property('id');
					expect(item.id).to.match(/^dummy#\d/);

					expect(item).to.have.property('date');
					expect(item.date).to.be.an.instanceOf(Date);

					expect(item).to.have.property('status');
					expect(item.status).to.be.equal('OK');

					expect(item).to.have.property('message');
					expect(item.message).to.be.a('string');
				});
			})
	);
})
