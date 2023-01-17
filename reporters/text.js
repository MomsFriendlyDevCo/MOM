import {styleMetric} from '#reporters/metrics';

export function config({Schema}) {
	return new Schema({
		header: {type: 'string', default: ''},
		footer: {type: 'string', default: ''},
		moduleSpacingBefore: {type: 'number', default: 0, help: 'Number of blank lines before each module listing'},
		moduleSpacingAfter: {type: 'number', default: 1, help: 'Number of blank lines after each module'},
		styleSummaryPass: {type: 'style', default: 'bold fgBlack bgGreen'},
		styleSummaryFail: {type: 'style', default: 'bold fgWhite bgRed'},
		styleModule: {type: 'style', default: 'fgBlack bgWhite'},
		styleStatusPass: {type: 'style', default: 'fgBlack bgGreen'},
		styleStatusWarn: {type: 'style', default: 'bold fgBlack bgYellow'},
		styleStatusCrit: {type: 'style', default: 'bold fgWhite bgRed'},
		styleStatusError: {type: 'style', default: 'bold fgWhite bgMagenta'},
		styleMetricBranch: {type: 'style', default: 'fgBlue'},
		metrics: {type: 'boolean', default: true},
	});
}

export function run({options, responses}) {
	let formatStatus = status =>
		status == 'PASS' ? options.styleStatusPass(status)
		: status == 'WARN' ? options.styleStatusWarn(status)
		: status == 'CRIT' ? options.styleStatusCrit(status)
		: options.styleStatusError(status);

	let formatMetrics = module => {
		if (!options.metrics) return ''; // Metric display is disabled
		return module.metrics
			.map((metric, metricIndex, metrics) =>
				(metricIndex == 0 ? '\n' : '')
				+ ' '
				+ options.styleMetricBranch(metricIndex == metrics.length - 1 ? '└' : '├')
				+ ' '
				+ styleMetric(metric, options)
			)
			.join('\n')
	};

	let {fails, success} = responses.reduce((t, v) => {
		if (['CRIT', 'ERROR'].includes(v.status)) {
			t.fails.push(v);
		} else {
			t.success.push(v);
		}
		return t;
	}, {fails: [], success: []});

	return [
		fails.length > 0
			? options.styleSummaryFail('MOM:FAIL')
			: options.styleSummaryPass('MOM:PASS'),
		...options.header,
		'',
		...fails.map(m =>
			'\n'.repeat(options.moduleSpacingBefore)
			+ `${formatStatus(m.status)}: ${options.styleModule(m.id)}: ${m.message}`
			+ formatMetrics(m)
			+ '\n'.repeat(options.moduleSpacingAfter)
		),
		...(fails.length > 0 && success.length > 0 // Do we have BOTH fails + successes? If so apply a padding bar
			? [
				'',
				'-----',
				'',
			] : []
		),
		...success.map(m =>
			'\n'.repeat(options.moduleSpacingBefore)
			+ `${formatStatus(m.status)}: ${options.styleModule(m.id)}: ${m.message}`
			+ formatMetrics(m)
			+ '\n'.repeat(options.moduleSpacingAfter)
		),
		success.length > 0 ? '' : false,
		fails.length == 0 && success.length > 1 ? `All ${success.length} tests passing`
			: fails.length > 0 && success.length > 0 ? `${fails.length} tests failing, ${success.length} succeeding out of ${responses.length} ~ ${Math.round((success.length / responses.length) * 100)}%`
			: fails.length > 1 ? `All ${fails.length} tests failing`
			: false,
		...options.footer,
	]
		.filter(v => v === undefined || v !== false)
		.join('\n')
}
