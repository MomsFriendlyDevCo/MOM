import chalk from 'chalk';
import {Command} from 'commander';
import {DotEnv} from '@momsfriendlydevco/dotenv';
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
		.option('--env <path>', 'Specify alternate .env file to use for config, set `--env=none` to disable completely')
		.option('--no-headers', 'Disable header seperators if multiple reporters return content')
		.action(commandRun)
}

export function commandRun(opts) {
	let mom = new MOM();

	if (opts.env) mom.debug('Using .env override path', opts.env);

	// Load Modules {{{
	if (opts.env !== 'none' && opts.module.length == 0) {
		// Load modules from .env* files {{{
		mom.debug('Loading modules from .env');
		let config = new DotEnv()
			.parse(opts.env || [
				'.env.example',
				'.env',
			])
			.template()
			.schemaGlob(/\.ENABLED$/, Boolean) // Type cast all *_ENABLE values
			.filterAndTrim(/^MOM_MODULE_/)
			.toTree(/\./)
			.deep()
			.camelCase()
			.value();

		if (opts.verbose) console.warn('Load module config', config);

		Object.entries(config)
			.filter(([module, config]) => module && config.enabled)
			.forEach(([module, config]) => {
				if (opts.verbose) console.warn(`Load MODULE:${module} config:`, config);
				mom.use(module, config)
			})
		// }}}
	} else if (opts.module.length > 0) {
		// Load modules from CLI {{{
		mom.debug('Loading modules from CLI only');
		opts.module.forEach(({module, args}) =>
			mom.use(module, args)
		);
		// }}}
	} else {
		throw new Error('Specify modules to load with `--module MOD` or create a .env file');
	}
	// }}}

	// Load Reporters {{{
	if (opts.env !== 'none' && opts.reporter.length == 0) {
		// Load reporters from .env* files {{{
		mom.debug('Loading reporters from .env');
		let config = new DotEnv()
			.parse(opts.env || [
				'.env.example',
				'.env',
			])
			.template()
			.schemaGlob(/\.ENABLED$/, Boolean) // Type cast all *_ENABLE values
			.filterAndTrim(/^MOM_REPORTER_/)
			.toTree(/\./)
			.deep()
			.camelCase()
			.value();

		if (opts.verbose) console.warn('Load reporter config', config);

		Object.entries(config)
			.filter(([reporter, config]) => reporter && config.enabled)
			.forEach(([reporter, config]) => {
				if (opts.verbose) console.warn(`Load REPORTER:${reporter} config:`, config);
				mom.reporter(reporter, config)
			})
		// }}}
	} else if (opts.reporter.length > 0) {
		// Load reporters from CLI {{{
		mom.debug('Loading reporters from CLI only');
		opts.reporter.forEach(({reporter, args}) =>
			mom.reporter(reporter, args)
		);
		// }}}
	} else {
		throw new Error('Specify reporters to load with `--reporter REPORTER` or create an .env file');
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
