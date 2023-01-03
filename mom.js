#!/usr/bin/node
import {dirName, importAll} from '@momsfriendlydevco/es6';
import {program} from 'commander';
global.__dirname = dirName();

Promise.resolve()
	// Load all commands {{{
	.then(()=> importAll([
		`${__dirname}/commands/*.js`, // Local core commands
		// TODO: External module paths
	], {
		root: '/',
	}))
	// }}}
	// Prepare main Commander instance (+ commands) {{{
	.then(commands => {
		program.name('mom')

		// Add all commands
		commands
			.filter(cmd => {
				if (cmd.command) return true;
				console.warn(`Module "${cmd.$path}" does not export a "command" method - skipping`);
				return false;
			})
			.forEach(cmd => program.addCommand(cmd.command()))

		return program.parseAsync();
	})
	// }}}
