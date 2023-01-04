import {dirName} from '@momsfriendlydevco/es6';
import {expect} from 'chai';
import {MOM} from '#lib/MOM';

describe('Module: Glob', ()=> {

	it('should return a MOMModuleResponse', ()=>
		new MOM()
			.use('glob', {glob: `${dirName()}/*.js`})
			.reporter('raw')
			.runAll()
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('raw');
				expect(res.raw).to.be.an('array');
				res = res.raw[0];

				expect(res).to.have.property('id', 'glob');

				expect(res).to.have.property('date');
				expect(res.date).to.be.an.instanceOf(Date);

				expect(res).to.have.property('status');
				expect(res.status).to.be.equal('OK');

				expect(res).to.have.property('message');
				expect(res.message).to.be.a('string');
			})
	);

});
