export function config({Schema}) {
	return new Schema({
		header: {type: 'string', default: ''},
		footer: {type: 'string', default: ''},
		styleSummaryOk: {type: 'style', default: 'bold fgBlack bgGreen'},
		styleSummaryFail: {type: 'style', default: 'bold fgWhite bgRed'},
		styleModule: {type: 'style', default: 'fgBlack bgWhite'},
		styleStatusOk: {type: 'style', default: 'fgBlack bgGreen'},
		styleStatusWarn: {type: 'style', default: 'fgBlack bgYellow'},
		styleStatusRed: {type: 'style', default: 'bold fgWhite bgRed'},
		styleStatusError: {type: 'style', default: 'bold fgWhite bgRed'},
	});
}

export function run({options, responses}) {
	let formatStatus = status =>
		status == 'OK' ? options.styleStatusOk(status)
		: status == 'WARN' ? options.styleStatusWarn(status)
		: status == 'FAIL' ? options.styleStatusFail(status)
		: options.styleStatusError(status)

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
			? options.styleSummaryFail('SANITY:FAIL')
			: options.styleSummaryOk('SANITY:OK'),
		...options.header,
		'',
		...fails.map(m => `${formatStatus(m.status)}: ${options.styleModule(m.id)}: ${m.message}`),
		...(fails.length > 0 && success.length > 0 // Do we have BOTH fails + successes? If so apply a padding bar
			? [
				'',
				'-----',
				'',
			] : []
		),
		...success.map(m => `${formatStatus(m.status)}: ${options.styleModule(m.id)}: ${m.message}`),
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
