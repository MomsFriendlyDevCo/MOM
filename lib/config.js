import {DotEnv} from '@momsfriendlydevco/dotenv';
import {camelCase} from '@momsfriendlydevco/dotenv/strUtils';
import fsPath from 'node:path';
import {program} from 'commander';
import os from 'node:os';

/**
* Raw config object read from .env* files but not yet mangled into trees + camelCase
* @type {Object}
*/
export let configRaw = {};

/**
* Config pre-template resolution
* @type {Object}
*/
export let configPreTemplate = {};


// Read meta options (like the config path overrides) from process.argv
export let metaArgs = { // Need to flatten Commander nonsense into a POJO or we can't mutate it
	...program
		.option('-c, --config <path>', 'Specify the .env files to read instead of the defaults (CSV string), use `--config=none` to disable any config')
		.allowUnknownOption(true)
		.helpOption(false)
		.parse(process.argv)
		.opts()
};

// Resolve config path to absolute - used by some downstream paths like `mom pm2-install`
metaArgs.config = metaArgs.config == 'none'
	? 'none'
	: fsPath.resolve(process.cwd(), metaArgs.config || '.env')


/**
* DotEnv instance of the config before .value() call
* @type {DotEnv}
*/
export let env = new DotEnv()
	.parse(
		metaArgs.config == 'none' ? []
		: metaArgs.config ? metaArgs.config.split(/\s*,\s*/)
		: [ // Process .env imports in a specific order
			'.env.example', // Base config
			`.env.${process.env.NODE_ENV}`, // .env.$NODE_ENV
			`.env.${process.env.USER.toLowerCase()}`, // .env.$USERNAME
			`.env.${os.hostname().toLowerCase()}`, // .env.$HOSTNAME
			'.env', // Just .env
		],
		{
			allowMissing: !metaArgs.config,
		}
	)
	.schema({
		MOM_SERVER_NAME: {type: String, default: process.env.HOSTNAME},
		MOM_SERVER_TITLE: {type: String, default: process.env.HOSTNAME},
		MOM_SERVER_TAGS: {type: 'keyvals', noValue: true, default: `Server:${process.env.HOSTNAME}`},

		// TODO: Expose more caching config
		MOM_CACHE_METHOD: {type: Array, default: 'filesystem'},

		// JSON styling
		MOM_JSON_NUM: {type: Array, split: 'whitespace', required: false, default: 'yellow'},
		MOM_JSON_STR: {type: Array, split: 'whitespace', required: false, default: 'green'},
		MOM_JSON_BOOL: {type: Array, split: 'whitespace', required: false, default: 'yellow'},
		MOM_JSON_REGEX: {type: Array, split: 'whitespace', required: false, default: 'blue'},
		MOM_JSON_UNDEF: {type: Array, split: 'whitespace', required: false, default: 'grey'},
		MOM_JSON_NULL: {type: Array, split: 'whitespace', required: false, default: 'grey'},
		MOM_JSON_ATTR: {type: Array, split: 'whitespace', required: false, default: 'bold whiteBright'},
		MOM_JSON_QUOT: {type: Array, split: 'whitespace', required: false, default: 'grey'},
		MOM_JSON_PUNC: {type: Array, split: 'whitespace', required: false, default: 'grey'},
		MOM_JSON_BRACK: {type: Array, split: 'whitespace', required: false, default: 'grey'},
	}, {reject: false})
	.schemaGlob(/\.ENABLED$/, { // Type-cast all *_ENABLE values
		type: Boolean,
		required: true,
		default: false,
	})
	.schemaGlob(/\.TAGS$/, { // Type-cast all *_TAGS values
		type: 'keyvals',
		noValue: true,
		default: {noTAGS: true},
		required: false,
	})
	.tap(dotenv => configRaw = dotenv.value({clone: true}))
	.toTree({
		branches: /^MOM_MODULE_(.+?)\.(.+)$/,
		nonMatching: 'keep',
		prefix: 'modules.',
	})
	.toTree({
		branches: /^MOM_REPORTER_(.+?)\.(.+)$/,
		nonMatching: 'keep',
		prefix: 'reporters.',
	})
	.toTree({
		branches: /^MOM_JSON_(.+)$/,
		nonMatching: 'keep',
		prefix: 'settings.json.',
	})
	.toTree({
		branches: /^MOM_(.+)$/,
		nonMatching: 'keep',
		prefix: 'settings.',
	})
	.deep()
	.camelCase()
	.thru(dotenv => {
		let configState = dotenv.value({clone: true});

		// Store pre-template phase value
		return configPreTemplate = {
			// Initial config state
			...configState,

			// Populate modules.MODULEID.module (or copy module spec if its custom)
			modules: Object.fromEntries(
				Object.entries(configState.modules)
					.map(([moduleId, moduleConfig]) => {
						return [
							moduleId,
							{
								id: moduleId,
								...moduleConfig,
								module: camelCase(moduleConfig.module || moduleId), // module spec not set - imply from moduleID
							},
						];
					})
			),

			// Populate reporters.REPORTERID.reporter (or copy reporter spec if its custom)
			reporters: Object.fromEntries(
				Object.entries(configState.reporters)
					.map(([reporterId, reporterConfig]) => {
						return [
							reporterId,
							{
								id: camelCase(reporterId),
								...reporterConfig,
								reporter: camelCase(reporterConfig.reporter || reporterId), // reporter spec not set - imply from reporterID
							},
						];
					})
			),
		};
	})
	.thru(dotenv => {
		// Apply template using both the pre template values and the tree structure
		dotenv.template({
			...configRaw, // so we can use `${MOM_SERVER_TITLE}`
			...dotenv.value(), // so we can use `${settings.serverTitle}`
		});
		return dotenv.value();
	});


/**
* Export tree config object by default
* @type {Object}
*/
export default env.value();
