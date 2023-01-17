import metricTools from '#lib/metricTools';
import promiseTools from '#lib/promiseTools';
import systemInfo from 'systeminformation';

export function config ({Schema}) {
	return new Schema({
		interfaces: {type: 'regexp', acceptPlain: true, default: '.'},
	});
}


export function init({options, state}) {
	return systemInfo.networkInterfaces()
		.then(iFaces => iFaces
			.filter(iF => options.interfaces.test(iF.iface))
			.map(iF => iF.iface)
		)
		.then(iFaceIds => state.interfaces = iFaceIds);
}

export function run({state}) {
	return systemInfo.networkStats(state.iFaces)
		.then(iFaces => iFaces.flatMap(iF => [
			{
				id: `${iF.iface}.readSec`,
				unit: 'bytes',
				value: metricTools.snapshotSinceLast(`${iF.iface}.readSec`, iF.rx_bytes) || 0,
			},
			{
				id: `${iF.iface}.writeSec`,
				unit: 'bytes',
				value: metricTools.snapshotSinceLast(`${iF.iface}.writeSec`, iF.tx_bytes) || 0,
			},
		]))
		.then(metrics => promiseTools.deepResolve(metrics))
		.then(metrics => ({
			status: 'PASS', // FIXME
			message: 'Network interface monitoring' + (metrics.every(m => !m.value) ? ' - need more data for sampling' : ''),
			metrics,
		}))
}
