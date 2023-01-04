import {dirName} from '@momsfriendlydevco/es6';
import {expect} from 'chai';
import {MOM} from '#lib/MOM';

describe('Module: Glob', ()=> {

	it('should return a MOMModuleResponse', ()=>
		new MOM()
			.use('glob', {glob: `${dirName()}/*.js`})
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.have.property('id', 'glob');

				expect(res[0]).to.have.property('date');
				expect(res[0].date).to.be.an.instanceOf(Date);

				expect(res[0]).to.have.property('status');
				expect(res[0].status).to.be.equal('OK');

				expect(res[0]).to.have.property('message');
				expect(res[0].message).to.be.a('string');
			})
	);

});
