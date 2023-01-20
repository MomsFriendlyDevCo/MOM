import metricTools from '#lib/metricTools';
import MOMResponse from '#lib/MOMResponse';
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
				value: metricTools.snapshotSinceLast(`${iF.iface}.readSec`, iF.rx_bytes),
			},
			{
				id: `${iF.iface}.writeSec`,
				unit: 'bytes',
				value: metricTools.snapshotSinceLast(`${iF.iface}.writeSec`, iF.tx_bytes),
			},
		]))
		.then(metrics => promiseTools.deepResolve(metrics))
		.then(metrics => metrics.filter(m => m.value !== null)) // Remove metrics we dont have enough data for
		.then(metrics => MOMResponse.fromMetrics(metrics))
}
