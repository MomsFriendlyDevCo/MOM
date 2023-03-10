import {expect} from 'chai';
import {MOM} from '#lib/MOM';

describe('Module: DiskSpaceTemp', ()=> {

	it('should return a MOMResponse', ()=>
		new MOM()
			.use('diskSpaceTemp')
			.reporter('raw')
			.runAll()
			.then(res => {
				expect(res).to.be.an('object');
				expect(res).to.have.property('raw');
				expect(res.raw).to.be.an('array');
				res = res.raw[0];

				expect(res).to.have.property('id', 'diskSpaceTemp');

				expect(res).to.have.property('date');
				expect(res.date).to.be.an.instanceOf(Date);

				expect(res).to.have.property('status');
				expect(res.status).to.be.oneOf(['PASS', 'WARN', 'CRIT', 'ERROR']);

				expect(res).to.have.property('message');
				expect(res.message).to.be.a('string');
			})
	);

});
