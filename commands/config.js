import config, {configRaw, configPreTemplate} from '#lib/config';
import {Command} from 'commander';
import {logJSON} from '#lib/outputUtils';

export function command() {
	return new Command()
		.name('config')
		.description('Show global, module or reporter specific config')
		.option('--raw', 'Output raw config before tidyup')
		.option('--resolved', 'Show the config with all templates (inline JS) resolved (cannot work with --raw)')
		.action(commandRun)
}


export function commandRun(opts) {
	if (opts.raw && opts.resolved) throw new Error('Cannot use both --raw AND --resolved');
	let output =
		opts.raw ? configRaw
		: opts.resolved ? config
		: configPreTemplate;

	logJSON(output);
}
