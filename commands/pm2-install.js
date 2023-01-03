import {Command} from 'commander';
import {execa} from 'execa';
import fs from 'node:fs/promises';

export function command() {
	return new Command()
		.name('pm2-install')
		.description('Install MOM within PM2')
		.option('--name <name>', 'PM2 process name', 'MOM')
		.option('--env <path>', 'Specify alternate .env file to use for config, set `--env=none` to disable completely')
		.action(commandRun)
}

export function commandRun(opts) {
	return Promise.resolve()
		.then(()=> Promise.all([
			// Verify .env file exists {{{
			Promise.resolve().then(()=> {
				if (!opts.env) opts.env = `${__dirname}/.env`;
				return fs.access(opts.env, fs.constants.R_OK)
					.catch(()=> { throw new Error('Must have a valid .env file either in the MOM directory to via `--env=path` flag')} );
			}),
			// }}}
			// Verify that the process is not already running {{{
			execa('pm2', ['jlist'])
				.then(({stdout}) => {
					let json = JSON.parse(stdout);
					if (json.some(proc => proc.name == opts.name))
						throw new Error(`PM2 process "${opts.name}" already exists`);
				}),
			// }}}
		]))
		// Add to PM2 via exec {{{
		.then(()=> execa('pm2', [
			'start',
			`--name=${opts.name}`,
			`${__dirname}/mom.js`,
			'--',
			'run',
			'--loop=0',
			`--env=${opts.env}`,
		]))
}
