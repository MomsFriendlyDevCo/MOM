import {expect} from 'chai';
import {Sanity} from '#lib/sanity';

describe('ping', ()=> {

	it('should return a SanityModuleResponse', function() {
		this.timeout(30 * 1000);

		return new Sanity()
			.use('ping')
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.have.property('id', 'ping');

				expect(res[0]).to.have.property('date');
				expect(res[0].date).to.be.an.instanceOf(Date);

				expect(res[0]).to.have.property('status');
				expect(res[0].status).to.be.oneOf(['OK', 'WARN', 'CRIT', 'ERROR']);

				expect(res[0]).to.have.property('message');
				expect(res[0].message).to.be.a('string');

				console.log('RAW SMR', res[0]);
			})
	});

});