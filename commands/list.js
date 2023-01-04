import chalk from 'chalk';
import {Command} from 'commander';
import {Schema as DotEnvSchema} from '@momsfriendlydevco/dotenv/Schema';
import fsPath from 'node:path';
import {globby} from 'globby';
import {MOM} from '#lib/MOM';

export function command() {
	return new Command()
		.name('list')
		.description('List available modules and/or reporters')
		.option('-m, --modules', 'List only modules')
		.option('-r, --reporters', 'List only reporters')
		.option('--no-unavailable', 'Dont show unavailable modules')
		.option('--no-config', 'Dont show config - list items only')
		.action(commandRun)
}

export function commandRun(opts) {
	let mom = new MOM();

	return Promise.resolve()
		.then(()=> {
			if (!opts.modules && !opts.reporters) [opts.modules, opts.reporters] = [true, true]; // Enable both if not picking
		})
		.then(()=> globby([
			opts.modules && `${__dirname}/modules/*.js`,
			opts.reporters && `${__dirname}/reporters/*.js`,
		].filter(Boolean)))
		.then(files => Promise.all(files.map(path =>
			import(path)
				.then(mod => Promise.all([
					mom.callPlugin(mod, 'config'),
					mom.callPlugin(mod, 'isAvailable')
						.then(()=> true)
						.catch(e => e.toString()),
				]))
				.then(([config, isAvailable]) => ({
					id: fsPath.basename(path, '.js'),
					config,
					isAvailable,
					path,
					type: fsPath.basename(fsPath.dirname(path)) == 'reporters' ? 'reporter' : 'module', // FIXME: Pretty crappy way to determine type
				}))
				.catch(e => {
					console.warn(`Trying to import "${path}" threw`, e);
				})
		)))
		.then(item => item
			.filter(item => {
				if (!item) return false; // Filter out dud modules
				return Promise.resolve()
					.then(()=> typeof item.isAvailable == 'function' && item.isAvailable())
					.then(()=> item.isAvailable = true)
					.catch(e => item.isAvailable = e)
			})
			.filter(item => item.isAvailable === true || opts.unavailable) // Filter out unavailable
			.forEach(item => {
				console.log(chalk.bold(item.type.toUpperCase() + ':'), chalk.bgWhite.black(item.id));

				if (item.isAvailable !== true)
					console.log('  ⚠', item.isAvailable.replace(/^Error: /, ''));

				if (!opts.config) return; // Don't show config
				if (
					item.config // Exposes a config function output
					&& item.config instanceof DotEnvSchema // AND exposes a schema we can read
					&& Object.keys(item.config.fields).length > 0 // AND isn't blank
				) {
					Object.entries(item.config.fields)
						.forEach(([key, rawConfig]) => {
							let fieldSchema = item.config.getFieldSchema(rawConfig);
							console.log(
								'  🔧',
								chalk.blue(key),
								'=',
								(
									typeof fieldSchema.default == 'function' ? chalk.gray('(Calculated)')
									: fieldSchema.default ? chalk.cyan(fieldSchema.default)
									: chalk.gray('none')
								),
								...(()=> {
										let attrs = [
											fieldSchema.required && 'Required',
											typeof fieldSchema.describe == 'function' ? fieldSchema.describe(fieldSchema)
												: fieldSchema.describe ? fieldSchema.describe
												: false,
										].filter(Boolean)

									return attrs.length > 0
										? ['(' + attrs.join(' ') + ')']
										: []
								})(),
							);
						})
				} else if (
					item.config
					&& item.config instanceof DotEnvSchema // AND exposes a schema we can read
					&& Object.keys(item.config.fields).length == 0 // Has no config and is explicitally saying so
				) {
					console.log('  🔧', chalk.gray('(no config)'));
				} else { // No idea what the config should be
					console.log('  🔧', chalk.gray('(see documentation)'));
				}
			})
		)
}
