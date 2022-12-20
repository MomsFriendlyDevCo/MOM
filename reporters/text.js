import chalk from 'chalk';

export function run(options) {
	let settings = {
		header: ()=> [],
		footer: ()=> [],
		formatStatus: status =>
			status == 'OK' ? chalk.green(status)
			: status.includes(['FAIL', 'WARN']) ? chalk.yellow.bold(status)
			: chalk.bold.red(status),
		...options,
	};

	return Promise.resolve()
		.then(()=> this.runAll())
		.then(responses => {
			let {fails, success} = responses.reduce((t, v) => {
				if (['CRIT', 'ERROR'].includes(v.status)) {
					t.fails.push(v);
				} else {
					t.success.push(v);
				}
				return t;
			}, {fails: [], success: []});

			return [
				`SANITY:${settings.formatStatus(fails.length > 0 ? 'FAIL' : 'OK')}`,
				...settings.header(),
				'',
				...fails.map(m => `${settings.formatStatus(m.status)}: ${m.message}`),
				fails.length > 0 ? '' : false,
				fails.length > 0 ? '-----' : false,
				fails.length > 0 ? '' : false,
				...success.map(m => `${m.status}: ${m.message}`),
				...settings.footer(),

			]
				.filter(v => v !== false)
				.join('\n')
		})
}
