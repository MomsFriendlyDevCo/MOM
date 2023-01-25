import chalk from 'chalk';
import {Command} from 'commander';
import {MOM} from '#lib/MOM';
import timestring from 'timestring';

export function command() {
	return new Command()
		.name('run')
		.description('Run one (or more) cycles of MOM')
		.option('-j, --json', 'Shorthand for `-r json`')
		.option('-m, --module <mod=opt1:val1,opt2:val2>', 'Enable a module and set options (can specify multiple times)', (v, t) => { // {{{
			let {module, args} = /^(?<module>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
			if (!module) throw new Error('Unknown module');
			args = args?.length > 0
				? args
					.split(/\s*,\s*/)
					.map(arg => arg.split(/\s*[=:]\s*/, 2))
				: [];

			t.push({module, args: Object.fromEntries(args)});
			return t;
		}, []) // }}}
		.option('-r, --reporter <rep=opt1:val1,opt2:val2>', 'Enable a reporter and set options (can specify multiple times)', (v, t) => { // {{{
			let {reporter, args} = /^(?<reporter>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
			if (!reporter) throw new Error('Unknown reporter');
			args = args?.length > 0
				? args
					.split(/\s*,\s*/)
					.map(arg => arg.split(/\s*[=:]\s*/, 2))
				: [];

			t.push({reporter, args: Object.fromEntries(args)});
			return t;
		}, []) // }}}
		.option('-l, --loop [times]', 'Repeat output the specifed number of times. Use "0" for forever', 1)
		.option('-p, --loop-pause [timestring]', 'Wait for a timestring-compatible delay between each loop. Use "0" to disable', '10s')
		.option('-v, --verbose', 'Be more verbose')
		.option('--no-headers', 'Disable header seperators if multiple reporters return content')
		.note('Use of `--module` / `--reporter` does not prevent default options from being loaded, use `--config=disable` to prevent any config other than that specified')
		.action(commandRun)
}

export function commandRun(opts) {
	let mom = new MOM();

	// Load Modules from the CLI - or use global config {{{
	if (opts.module.length > 0) {
		mom.debug('Loading modules from CLI');
		opts.module.forEach(({module, args}) =>
			mom.use(module, args)
		);
	} else {
		mom.loadFromConfig({modules: true, reporters: false});
	}
	// }}}

	// Load Reporters from the CLI - or use global config {{{
	if (opts.reporter.length > 0) {
		mom.debug('Loading reporters from CLI only');
		opts.reporter.forEach(({reporter, args}) =>
			mom.reporter(reporter, args)
		);
	} else {
		mom.loadFromConfig({modules: false, reporters: true});
	}
	// }}}

	let runCount = 0;
	let loopPause = opts.loopPause == 0 ? 0 : timestring(opts.loopPause, 'ms');
	let runner = ()=> Promise.resolve()
		.then(()=> opts.loop != 1 && console.log(chalk.bold.bgMagenta(
			`Run #${runCount+1}`
			+ (opts.loop > 0 ? `/${opts.loop}` : '')
			+ ` (${new Date().toISOString()})`
		)))
		.then(()=> mom.runAll())
		.then(responses => {
			runCount++;
			if (Object.keys(responses).length == 0) {
				throw new Error('No response output from any selected reporter');
			} else if (Object.keys(responses).length == 1) {
				console.log(responses[Object.keys(responses).at(0)])
			} else {
				Object.entries(responses).forEach(([key, text]) => {
					if (opts.headers) console.log(chalk.bold.bgBlue.black(` --- ${key} --- `));
					console.log(text);
					if (typeof text == 'string' && !text.endsWith('\n')) console.log(''); // Add newline if one isn't already present
				})
			}
		})
		.finally(()=> {
			if (opts.loop == 0 || runCount < opts.loop) { // Queue up next run if we can loop more
				setTimeout(runner, loopPause);
			} else {
				return mom.shutdown() // Close off all waiting modules / reporters
					.then(()=> process.exit(0))
			}
		})

	return runner(); // Kick off initial run loop
}
