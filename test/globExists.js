import {dirName} from '@momsfriendlydevco/es6';
import {expect} from 'chai';
import {Sanity} from '#lib/sanity';

describe('globExists', ()=> {

	it('should return a SanityModuleResponse', ()=>
		new Sanity()
			.use('globExists', {glob: `${dirName()}/*.js`})
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.have.property('id', 'globExists');

				expect(res[0]).to.have.property('date');
				expect(res[0].date).to.be.an.instanceOf(Date);

				expect(res[0]).to.have.property('status');
				expect(res[0].status).to.be.equal('OK');

				expect(res[0]).to.have.property('message');
				expect(res[0].message).to.be.a('string');
			})
	);

});
