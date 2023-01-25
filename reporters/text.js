import {format} from '@momsfriendlydevco/formatters';
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
		tags: {type: 'boolean', default: true},
		styleModuleTagSurround: {type: 'style', default: 'gray'},
		styleModuleTagKey: {type: 'style', default: 'dim'},
		styleModuleTagSep: {type: 'style', default: 'gray'},
		styleModuleTagVal: {type: 'style', default: 'dim'},
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

	let formatTags = module => {
		if (!options.tags || !module.tags) return ''; // Tags disabled or no tags to output anyway
		return ' ' + Object.entries(module.tags)
			.map(([key, val]) =>
				options.styleModuleTagSurround('[')
				+ options.styleModuleTagKey(key)
				+ options.styleModuleTagSep(':')
				+ options.styleModuleTagVal(val)
				+ options.styleModuleTagSurround(']')
			)
			.sort()
			.join(' ')
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
			+ formatTags(m)
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
			+ formatTags(m)
			+ formatMetrics(m)
			+ '\n'.repeat(options.moduleSpacingAfter)
		),
		success.length > 0 ? '' : false,
		format(
			fails.length == 0 && success.length > 1 ? `All [style cyan]${success.length}[/style] test[s] passing`
				: fails.length > 0 && success.length > 0 ? `[style cyan]${fails.length}[/style] test[s] failing, [style cyan]${success.length}[/style] succeeding out of [style cyan]${responses.length}[/style] ~ [style cyan]${(success.length / responses.length) * 100}[%][/style]`
				: fails.length > 1 ? `All ${fails.length} test[s] failing`
				: '',
		),
		...options.footer,
	]
		.filter(v => v === undefined || v !== false)
		.join('\n')
}
