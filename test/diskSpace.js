import {dirName} from '@momsfriendlydevco/es6';
import {expect} from 'chai';
import {Sanity} from '#lib/sanity';

describe('Module: DiskSpace', ()=> {

	it('should return a SanityModuleResponse', ()=>
		new Sanity()
			.use('diskSpace', {path: dirName()})
			.runAll()
			.then(res => {
				expect(res).to.be.an('array');
				expect(res).to.have.length(1);

				expect(res[0]).to.have.property('id', 'diskSpace');

				expect(res[0]).to.have.property('date');
				expect(res[0].date).to.be.an.instanceOf(Date);

				expect(res[0]).to.have.property('status');
				expect(res[0].status).to.be.oneOf(['OK', 'WARN', 'CRIT', 'ERROR']);

				expect(res[0]).to.have.property('message');
				expect(res[0].message).to.be.a('string');
			})
	);

});
