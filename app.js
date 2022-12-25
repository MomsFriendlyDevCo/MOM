#!/usr/bin/node

import chalk from 'chalk';
import {DotEnv} from '@momsfriendlydevco/dotenv';
import {program} from 'commander';
import {Sanity} from '#lib/sanity';
import timestring from 'timestring';

let opts = program
	.name('sanity')
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
	.option('--no-env', 'Disable trying to read in config from .env files')
	.option('--no-headers', 'Disable header seperators if multiple reporters return content')
	.parse(process.argv)
	.opts()

let sanity = new Sanity();
let loadedFromEnv = false;

// Read .env files {{{
if (opts.env) {
	let config = new DotEnv()
		.parse([
			'.env.example',
			'.env',
		])
		.schemaGlob(/\.ENABLED$/, Boolean) // Type cast all *_ENABLE values
		.filterAndTrim(/^SANITY_MODULE_/)
		.toTree(/\./)
		.deep()
		.camelCase()
		.value();

	if (opts.verbose) console.warn('Load module config', config);
	if (Object.keys(config)) loadedFromEnv = true;

	Object.entries(config)
		.filter(([module, config]) => module && config.enabled)
		.forEach(([module, config]) => {
			if (!opts.verbose) console.warn('Load module', module, config);
			sanity.use(module, config)
		})
}
// }}}

// Load all modules {{{
if (!loadedFromEnv && !opts.module.length) opts.module = [ // Defaults if nothing else is given
	// Can only use modules that dont require options
	{module: 'diskSpaceTemp'},
	{module: 'ping'},
];
opts.module.forEach(({module, args}) =>
	sanity.use(module, args)
);
// }}}

// Load all reporters {{{
if (opts.json) opts.reporter = [{reporter: 'json'}];
if (!opts.reporter.length) opts.reporter = [{reporter: 'text'}]; // Default to 'text' if nothing else is given
opts.reporter.forEach(({reporter, args}) =>
	sanity.reporter(reporter, args)
);
// }}}

let runCount = 0;
let loopPause = opts.loopPause == 0 ? 0 : timestring(opts.loopPause, 'ms');
let runner = ()=> Promise.resolve()
	.then(()=> opts.loop != 1 && console.log(chalk.bold.bgMagenta(
		`Run #${runCount+1}`
		+ (opts.loop > 0 ? `/${opts.loop}` : '')
		+ ` (${new Date().toISOString()})`
	)))
	.then(()=> sanity.runAll())
	.then((responses) => {
		runCount++;
		if (Object.keys(responses).length == 0) {
			throw new Error('No response output from any selected reporter');
		} else if (Object.keys(responses).length == 1) {
			console.log(responses[Object.keys(responses).at(0)])
		} else {
			Object.entries(responses).forEach(([key, text]) => {
				if (opts.headers) console.log(chalk.bold.bgBlue.black(` --- ${key} --- `));
				console.log(text);
				if (!text.endsWith('\n')) console.log(''); // Add newline if one isn't already present
			})
		}
	})
	.finally(()=> {
		if (opts.loop == 0 || runCount < opts.loop) setTimeout(runner, loopPause); // Queue up next run if we can loop more
	})

runner(); // Kick off initial run loop
