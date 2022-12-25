import chalk from 'chalk';

export function run({options, responses}) {
	let settings = {
		header: ()=> [],
		footer: ()=> [],
		formatStatus: status =>
			status == 'OK' ? chalk.green(status)
			: status.includes(['FAIL', 'WARN']) ? chalk.yellow.bold(status)
			: chalk.bold.bold.red(status),
		formatModule: mod => chalk.white.bgWhite.black(mod),
		...options,
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
			? chalk.bgRed.bold.white('SANITY:FAIL')
			: chalk.bgGreen.bold.black('SANITY:OK'),
		...settings.header(),
		'',
		...fails.map(m => `${settings.formatStatus(m.status)}: ${settings.formatModule(m.id)}: ${m.message}`),
		...(fails.length > 0 && success.length > 0 // Do we have BOTH fails + successes? If so apply a padding bar
			? [
				'',
				'-----',
				'',
			] : []
		),
		...success.map(m => `${settings.formatStatus(m.status)}: ${settings.formatModule(m.id)}: ${m.message}`),
		success.length > 0 ? '' : false,
		fails.length == 0 && success.length > 1 ? `All ${success.length} tests passing`
			: fails.length > 0 && success.length > 0 ? `${fails.length} tests failing, ${success.length} succeeding out of ${responses.length} ~ ${Math.round((success.length / responses.length) * 100)}%`
			: fails.length > 1 ? `All ${fails.length} tests failing`
			: false,
		...settings.footer(),
	]
		.filter(v => v !== false)
		.join('\n')
}
