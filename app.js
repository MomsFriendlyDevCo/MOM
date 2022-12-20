#!/usr/bin/node

import {Sanity} from '#lib/sanity';
import {program} from 'commander';

let opts = program
	.name('sanity')
	.option('-m, --module <mod=opt1:val1,opt2:val2>', 'Enable a module and set options (can specify multiple times)', (v, t) => {
		let {module, args} = /^(?<module>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
		if (!module) throw new Error('Unknown module');
		args = args
			.split(/\s*,\s*/)
			.map(arg => arg.split(/\s*[=:]\s*/, 2))

		t.push(Object.fromEntries(args));
		return t;
	}, [])
	.option('-r, --reporter <rep=opt1:val1,opt2:val2>', 'Enable a reporter and set options (can specify multiple times)', (v, t) => {
		let {reporter, args} = /^(?<reporter>.+?)(?:=(?<args>.+))?$/.exec(v).groups || {};
		if (!reporter) throw new Error('Unknown reporter');
		args = args
			.split(/\s*,\s*/)
			.map(arg => arg.split(/\s*[=:]\s*/, 2))

		t.push(Object.fromEntries(args));
		return t;
	}, [])
	.parse(process.argv)
	.opts()

let sanity = new Sanity();

// Load all modules
if (!opts.module.length) opts.module = [ // Defaults if nothing else is given
	// Can only use modules that dont require options
	{module: 'diskSpaceTemp'},
	{module: 'ping'},
];
opts.module.forEach(({module, args}) =>
	sanity.use(module, args)
);

// Load all reporters
if (!opts.reporter.length) opts.reporter = [{reporter: 'text'}]; // Default to 'text' if nothing else is given
opts.reporter.forEach(({reporter, args}) =>
	sanity.reporter(reporter, args)
);

sanity.runAll();
