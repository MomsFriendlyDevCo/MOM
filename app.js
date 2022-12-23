#!/usr/bin/node

import chalk from 'chalk';
import camelCase from '#lib/camelCase';
import {DotEnv} from '@momsfriendlydevco/dotenv';
import {program} from 'commander';
import {Sanity} from '#lib/sanity';

let opts = program
	.name('sanity')
	.option('-m, --module <mod=opt1:val1,opt2:val2>', 'Enable a module and set options (can specify multiple times)', (v, t) => {
		let {module, args} = /^(?<module>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
		if (!module) throw new Error('Unknown module');
		args = args?.length > 0
			? args
				.split(/\s*,\s*/)
				.map(arg => arg.split(/\s*[=:]\s*/, 2))
			: [];

		t.push({module, args: Object.fromEntries(args)});
		return t;
	}, [])
	.option('-r, --reporter <rep=opt1:val1,opt2:val2>', 'Enable a reporter and set options (can specify multiple times)', (v, t) => {
		let {reporter, args} = /^(?<reporter>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
		if (!reporter) throw new Error('Unknown reporter');
		args = args?.length > 0
			? args
				.split(/\s*,\s*/)
				.map(arg => arg.split(/\s*[=:]\s*/, 2))
			: [];

		t.push({reporter, args: Object.fromEntries(args)});
		return t;
	}, [])
	.option('-v, --verbose', 'Be more verbose')
	.option('--no-env', 'Disable trying to read in config from .env files')
	.option('--no-headers', 'Disable header seperators if multiple reporters return content')
	.parse(process.argv)
	.opts()

let sanity = new Sanity();
let loadedFromEnv = 0;

// Read .env files {{{
if (opts.env) {
	let configKeys = new DotEnv()
		.parse([
			'.env.example',
			'.env',
		])
		.value();

	Object.entries(configKeys)
		.filter(([rawKey, rawVal]) =>
			/^SANITY_MODULE_([A-Z_]+)$/.test(rawKey)
			&& /^(true|1|y)/.test(rawVal)
		)
		.forEach(([rawKey]) => {
			let keyUc = rawKey.replace(/^SANITY_MODULE_/, '');
			let module = camelCase(keyUc);

			let modPrefix = new RegExp(`^SANITY_MODULE_${keyUc}\.`); // eslint-disable-line no-useless-escape
			let modArgs = Object.fromEntries(
				Object.entries(configKeys)
					.filter(([optKey]) => modPrefix.test(optKey))
					.map(([optKey, optVal]) => [
						optKey.replace(modPrefix, '').toLowerCase(),
						/^{.+}$/.test(optVal) ? JSON.parse(optVal) : optVal, // Try to eval JSON like structures
					])
			);

			loadedFromEnv++;
			if (opts.verbose) console.warn('Loading module', module, 'from .env with options', modArgs);
			sanity.use(module, modArgs);
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
if (!opts.reporter.length) opts.reporter = [{reporter: 'text'}]; // Default to 'text' if nothing else is given
opts.reporter.forEach(({reporter, args}) =>
	sanity.reporter(reporter, args)
);
// }}}

sanity.runAll()
	.then((responses) => {
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
