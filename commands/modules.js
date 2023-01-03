import chalk from 'chalk';
import {Command} from 'commander';
import {Schema as DotEnvSchema} from '@momsfriendlydevco/dotenv/Schema';
import fsPath from 'node:path';
import {globby} from 'globby';
import {Sanity} from '#lib/sanity';

export function command() {
	return new Command()
		.name('modules')
		.description('List available modules')
		.option('-a, --all', 'Show ALL modules, even thats that are not available')
		.action(commandRun)
}

export function commandRun() {
	let sanity = new Sanity();

	return Promise.resolve()
		.then(()=> globby(`${__dirname}/modules/*.js`))
		.then(files => Promise.all(files.map(path =>
			import(path)
				.then(mod => Promise.all([
					sanity.callPlugin(mod, 'config'),
					sanity.callPlugin(mod, 'isAvailable')
						.then(()=> true)
						.catch(e => e.toString()),
				]))
				.then(([config, isAvailable]) => ({
					id: fsPath.basename(path, '.js'),
					config,
					isAvailable,
					path,
					type: 'module',
				}))
		)))
		.then(modules => modules.forEach(module => {
			console.log(chalk.bold(module.type.toUpperCase() + ':') + chalk.bgWhite.black(module.id));
			if (
				module.config // Exposes a config function output
				&& module.config instanceof DotEnvSchema // AND exposes a schema we can read
				&& Object.keys(module.config.fields).length > 0 // AND isn't blank
			) {
				Object.entries(module.config.fields)
					.forEach(([key, rawConfig]) => {
						let fieldSchema = module.config.getFieldSchema(rawConfig);
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
				module.config
				&& module.config instanceof DotEnvSchema // AND exposes a schema we can read
				&& Object.keys(module.config.fields).length == 0 // Has no config and is explicitally saying so
			) {
				console.log('  🔧', chalk.gray('(no config'));
			} else { // No idea what the config should be
				console.log('  🔧', chalk.gray('(see documentation)'));
			}
		}))
}
