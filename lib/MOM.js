import config from '#lib/config';
import Debug from 'debug';
import {dirName} from '@momsfriendlydevco/es6';
import fsPath from 'node:path';
import Eventer from '@momsfriendlydevco/eventer';
import MOMInjector from '#lib/MOMInjector';
import MOMModuleResponse from '#lib/MOMModuleResponse';
import {Schema as DotEnvSchema} from '@momsfriendlydevco/dotenv/Schema';
import statusUtils from '#lib/statusUtils';

/**
* Main MOM instance class
* @name {MOM}
* @fires preRunAll Fires before any work occurs within a `runAll()` loop. Called as `({mom})`
* @fires runAll Fires after runAll() has completed. Called as `({mom, responses: Array, metrics: Array, reports: Object, maxStatus})`
* @fires preShutdown Fires before we start a `shutdown()` sequence. Called as `({mom})`
* @fires shutdown Fires after the shutdown sequence has completed. Called as `({mom})`
*/
export class MOM { // NOTE: We use Eventer.extend() instead of direct inheritence as we only need some functions
	/**
	* Settings for this instance
	* @type {Object}
	* @property {String} serverId Unique name for this server
	* @property {String} serverTitle Human readable title for this server
	*/
	settings = {
		serverId: process.env.HOSTNAME,
		serverTitle: process.env.HOSTNAME,
		json: {}, // Options for Jsome output. See #lib/config for default values
	};


	/**
	* Installed modules as a collection
	* @type {Array<Object>} MOM module instance
	* @property {String} id The ID of the module, must be unique
	* @property {Object} options The options passed when initalizing the module
	* @property {Object} state Optional state storage for the module
	* @property {boolean} [isReady=false] Indicates if the module has finished loading
	* @property {MOMModule} module The raw module object, post loader
	* @property {Promise} readyPromise The promise which completes when `init()` has completed
	*/
	#modules = [];


	/**
	* Pointer to modules by ID
	* Also used to verify that module IDs are unique
	* @type {Object} An object with each key as the module id and the key as the module
	*/
	#modulesById = {};


	/**
	* Installed reporters as a collection
	* @type {Array<Object>} MOM reporter instance
	* @property {String} id The ID of the reporter, must be unique
	* @property {Object} options The options passed when initalizing the reporter
	* @property {boolean} [isReady=false] Indicates if the reporter has finished loading
	* @property {MOMReporter} reporter The raw reporter object, post loader
	* @property {MOMModuleResponse} [lastResponse] Last module response, if any
	* @property {Promise} readyPromise The promise which completes when `init()` has completed
	*/
	#reporters = [];

	/**
	* Pointer to reporters by ID
	* Also used to verify that reporter IDs are unique
	* @type {Object} An object with each key as the reporter id and the key as the reporter
	*/
	#reportersById = {};


	/**
	* Load all modules + reporters based on each item within an object
	* @param {Object} [options] Options to mutate behaviour
	* @param {Object} [options.config] Config to load from, if omitted will use the global config
	* @param {Boolean} [options.modules=true] Load modules
	* @param {Boolean} [options.reporters=true] Load reporters
	* @returns {MOM} This chainable instance
	*
	* @example Load the ping module + text reporter with default options
	* MOM.loadFromConfig({
	*   modules: {ping: {}},
	*   reporters: {text: {}},
	* })
	*/
	loadFromConfig(options) {
		let settings = {
			config,
			modules: true,
			reporters: true,
			...options,
		};

		if (!settings.config.modules) throw new Error('No `module` key found in config to load');
		if (!settings.config.reporters) throw new Error('No `reporter` key found in config to load');

		if (settings.modules)
			Object.values(settings.config.modules)
				.filter(moduleConfig => moduleConfig.enabled)
				.forEach(moduleConfig => this.use(moduleConfig.module, moduleConfig))

		if (settings.reporters)
			Object.values(settings.config.reporters)
				.filter(reporterConfig => reporterConfig.enabled)
				.forEach(reporterConfig => this.reporter(reporterConfig.reporter, reporterConfig))

		return this;
	}


	/**
	* Install a MOM module with given options
	* Can be supplied with the module object or a string to import the file from
	* If the module contains dots or slashes a path is assumed, if none the module is loaded from this NPM/modules directory
	* @param {String|Object} module The module to install as either an Object, path to file or alias (exists within ../modules)
	* @param {Object} [options] Options to intialize the module
	* @param {String} [options.id] The ID of the module, determined from the basename / string alias if possible
	* @returns {MOM} This chainable instance
	*/
	use(module, options) {
		let settings = {
			id: null,
			...options,
		};

		if (typeof module == 'object') {
			throw new Error('Direct module importing not yet supported');
		} else if (typeof module == 'string') { // Assume file path
			// eslint-disable-next-line no-useless-escape
			if (!/[\.\/]/.test(module)) { // No dots or slashes, assume alias to this node_module/.../modules
				if (!settings.id) settings.id = module; // Assume ID is the same as the module name
				module = `${dirName()}/../modules/${module}.js`;
			} else { // Assume file path
				if (!settings.id) settings.id = fsPath.basename(module, '.js'); // If not given an ID assume one from the basename
			}

			if (this.#modulesById[settings.id]) throw new Error(`Module ID "${settings.id}" already in use, specify a unique ID via MOM.use(module: String|Object, options?: {id: String})`);

			this.debug(`Installing MODULE:${settings.id} (${module})`, 'with', settings);
			let newModule = {
				id: settings.id,
				options: settings,
				isReady: false,
				state: {},
				module: {}, // Replaced by the module import when readyPromise completes
			};

			// Kick off the initalization {{{
			newModule.readyPromise = import(module) // NOTE: Loading in background, only ready when `isReady: true`
				.then(res => newModule.module = res)
				// MOM checks {{{
				.then(()=> {
					if (!newModule.module.run) throw new Error(`Module ${newModule.id} does not have a run() function`);
				})
				// }}}
				// Call .config - Validation + population of options {{{
				.then(()=> this.callPlugin(newModule.module, 'config', {
					id: newModule.id,
					options: newModule.options,
					state: newModule.state,
				}))
				.then(configRes => {
					if (configRes instanceof DotEnvSchema) { // Got back a DotEnvSchema
						try {
							newModule.options = configRes.apply(newModule.options);
						} catch (e) {
							throw new Error(`Loading MODULE:${newModule.id}.config() - ${e.toString()}`, {cause: e});
						}
					} else {
						throw new Error(`Unknown response from MODULE:${newModule}.config()`);
					}
				})
				// }}}
				// Call .isAvailable() {{{
				.then(()=> this.callPlugin(newModule.module, 'isAvailable', {
					id: newModule.id,
					options: newModule.options,
					state: newModule.state,
				})
					.catch(e => {
						this.debug(`Error thrown during isAvailable check for MODULE:${newModule.id} - removing`, e);
						return this.removeModule(newModule.id);
					})
				)
				// }}}
				// Call .init() {{{
				.then(()=> this.callPlugin(newModule.module, 'init', {
					id: newModule.id,
					options: newModule.options,
					state: newModule.state,
				}))
				// }}}
				// Mark module as ready {{{
				.then(()=> this.debug(`MODULE:${settings.id} ready`))
				.then(()=> newModule.isReady = true);
				// }}}
			// }}}

			this.#modules.push(newModule);
			this.#modulesById[settings.id] = newModule;
		} else {
			throw new Error('Unknown module include type - specify an object or path');
		}

		return this;
	}


	/**
	* Remove a module by its ID
	* @returns {MOM} This chainable instance
	*/
	removeModule(moduleId) {
		this.debug(`Remove MODULE:${moduleId}`);
		delete this.#modulesById[moduleId];
		this.#modules = this.#modules.filter(mod => mod.id != moduleId);
		return this;
	}


	/**
	* Install a MOMReporter into this instance
	* The syntax is intentionally similar to `.use()`
	* @param {String|Object} reporter The module to install as either an Object, path to file or alias (exists within ../modules)
	* @param {Object} [options] Options to intialize the reporter
	* @returns {MOM} This chainable instance
	*/
	reporter(reporter, options) {
		let settings = {
			id: null,
			...options,
		};

		if (typeof reporter == 'object') {
			throw new Error('Direct reporter importing not yet supported');
		} else if (typeof reporter == 'string') { // Assume file path
			// eslint-disable-next-line no-useless-escape
			if (!/[\.\/]/.test(reporter)) { // No dots or slashes, assume alias to this node_reporter/.../reporters
				if (!settings.id) settings.id = reporter; // Assume ID is the same as the module name
				reporter = `${dirName()}/../reporters/${reporter}.js`;
			} else { // Assume file path
				if (!settings.id) settings.id = fsPath.basename(reporter, '.js'); // If not given an ID assume one from the basename
			}

			this.debug(`Installing REPORTER:${settings.id} (${reporter})`, 'with', settings);
			let newReporter = {
				id: settings.id,
				options: options ?? {},
				state: {},
				isReady: false,
				reporter: {},
			};

			// Kick off the initalization {{{
			newReporter.readyPromise = import(reporter) // NOTE: Loading in background, only ready when `isReady: true`
				.then(res => newReporter.reporter = res)
				// MOM checks {{{
				.then(()=> {
					if (!newReporter.reporter.init && !newReporter.reporter.run)
						throw new Error(`Reporter ${newReporter.id} does not have either an init() or run() function`);
				})
				// }}}
				// Call .config - Validation + population of options {{{
				.then(()=> this.callPlugin(newReporter.reporter, 'config', {
					id: newReporter.id,
					options: newReporter.options,
					state: newReporter.state,
				}))
				.then(configRes => {
					if (configRes instanceof DotEnvSchema) { // Got back a DotEnvSchema
						try {
							newReporter.options = configRes.apply(newReporter.options);
						} catch (e) {
							throw new Error(`Loading REPORTER:${newReporter.id}.config() - ${e.toString()}`, {cause: e});
						}
					} else {
						throw new Error(`Unknown response from ${newReporter}.config()`);
					}
				})
				// }}}
				// Call .isAvailable() {{{
				.then(()=> this.callPlugin(newReporter.reporter, 'isAvailable', {
					id: newReporter.id,
					options: newReporter.options,
					state: newReporter.state,
				})
					.catch(e => {
						this.debug(`Error thrown during isAvailable check for REPORTER:${newReporter.id} - removing`, e);
						return this.removeReporter(newReporter.id);
					})
				)
				// }}}
				// Call .init() {{{
				.then(()=> this.callPlugin(newReporter.reporter, 'init', {
					id: newReporter.id,
					options: newReporter.options,
					state: newReporter.state,
				}))
				// }}}
				// Mark reporter as ready {{{
				.then(()=> this.debug(`REPORTER:${settings.id} ready`))
				.then(()=> newReporter.isReady = true);
				// }}}
			// }}}

			this.#reporters.push(newReporter);
			this.#reportersById[settings.id] = newReporter;
		} else {
			throw new Error('Unknown reporter include type - specify an object or path');
		}

		return this;
	}


	/**
	* Remove a reporter by its ID
	* @returns {MOM} This chainable instance
	*/
	removeReporter(reporterId) {
		this.debug(`Remove REPORTER:${reporterId}`);
		delete this.#reportersById[reporterId];
		this.#reporters = this.#reporters.filter(mod => mod.id != reporterId);
		return this;
	}


	/**
	* Returns a promise which resolves only when all modules are ready and loaded
	* @returns {Promise} A promise which resolves when the operation has completed
	*/
	promise() {
		return Promise.all([
			...this.#modules.map(mod => mod.isReady || mod.readyPromise),
			...this.#reporters.map(rep => rep.isReady || rep.readyPromise),
		])
			.then(()=> this.debug('All modules + reporters loaded'))
	}


	/**
	* Call a given function name on an instance object, if it exists
	* The function is called with this MOM instance as context and with an initalized MOMInjector as its only argument
	* @param {Object} instance An initalized MOMModule / MOMReporter
	* @param {Function} func The function name to call
	* @param {Object} [args] Optional arguments to intialize the MOMInjector with
	* @returns {Promise} A promise containing the response from the module
	*/
	callPlugin(instance, func, args) {
		if (typeof instance[func] != 'function') return Promise.resolve(); // Instance doesn't have the function anyway
		let injector = new MOMInjector({
			mom: this,
			...args,
		});

		return Promise.resolve() // Have to do this first so that any throw gets caught in a promise chain rather than throwing here
			.then(()=> instance[func].call(injector, injector));
	}


	/**
	* Format the raw response from a module.run() function
	* This function also performs validation
	* This adds various fluff and formats various fields into the {MOMModuleResponse} format
	* If given a string an attempt will be made to parse the string out into an SMR
	* If given a single object this assumes it should be parsed as an SMR
	* If given an array multiple SMRs are processed, each must provide a unique ID - items can be any of the above
	* @param {String} id Unique ID for this response
	* @param {*} rawResponse The raw response of the module
	* @returns {MOMModuleReponse} The formatted module response
	*/
	formatResponse(id, rawResponse) {
		let response = {
			id,
			date: new Date(),
			status: null,
			message: '',
			metrics: [],
		};

		if (!rawResponse) {
			throw new Error(`Recieved no response for "${id}"`);
		} else if (typeof rawResponse == 'string') { // Accept '(OK|WARN|ERROR): (message)' style responses
			let {status, message} = /^(?<status>OK|WARN|CRIT|ERROR):\s*(?<message>.*)$/?.groups || {};
			if (!status) throw new Error('Unprocessable MOM module string response');
			Object.assign(response, {status, message});
		} else if (Array.isArray(rawResponse)) {
			throw new Error('A module can only return one MOMModuleResponse - use multiple metrics to respond to different payloads');
		} else if (typeof rawResponse == 'object') {
			if (!rawResponse.status) throw new Error('MOM module response does not contain a status field');
			Object.assign(response, {
				id: response.id || rawResponse.id,
				status: rawResponse.status.toUpperCase(),
				message: rawResponse.message,
				metrics: (
					Array.isArray(rawResponse.metrics) ? rawResponse.metrics
					: Array.isArray(rawResponse.metric) ? rawResponse.metric
					: rawResponse.metric ? [rawResponse.metric]
					: rawResponse.metrics ? [rawResponse.metrics]
					: []
				)
					.filter(Boolean)
					.map((metric, metricOffset) => ({
						type: 'numeric',
						unit: 'number',
						...metric,
						resId: response.id,
						id: metric.id
							? `${response.id}.${metric.id}`
							: `${response.id}.${metricOffset}`
					}))
			});
		} else {
			throw new Error('Unknown MOM module response');
		}

		// Validate response
		MOMModuleResponse.validate(response);

		return response;
	}


	/**
	* Run a specific module by ID
	* @param {string} id The module ID to run
	* @returns {MOMModuleResponse} The formatted module response
	*/
	run(id) {
		if (!this.#modulesById[id]) throw new Error(`Unknown MOM module "${id}"`);
		this.debug('Run module', id);
		return Promise.resolve()
			.then(()=> this.callPlugin(this.#modulesById[id].module, 'run', {
				id,
				options: this.#modulesById[id].options,
				state: this.#modulesById[id].state,
			}))
			.then(res => this.formatResponse(id, res))
			.then(SMRes => {
				this.#modulesById[id].lastResponse = SMRes;
				if (Array.isArray(SMRes)) { // Given back multiple responses - split into multiple by ID
					this.debug('Finished running module', id, `Got ${SMRes.length} sub-items`, 'Responses:', SMRes);
					return SMRes.map((res, offset) => ({
						...res,
						id: res.id ? `${id}.${res.id}` : `${id}#${offset+1}`, // Prepend ID + '.' if given one, otherwise use offset
					}))
				} else { // Given back single response - use as is
					this.debug('Finished running module', id, 'Response:', SMRes);
					SMRes.id = id;
				}

				return SMRes;
			})
	}


	/**
	* Run all installed modules
	* This function calls `.promise()` first to ensure all modules are ready
	* The return is an object where each key corresponds to a reporter IF that reporter provides back a non-falsy value
	* @returns {Object} Object of return values from reporters for non-falsy values
	*/
	runAll() {
		this.debug('RunAll');
		return this.promise()
			.then(()=> this.emit('preRunAll', {mom: this}))
			.then(()=> Promise.all(this.#modules.map(mod =>
				this.callPlugin(mod.module, 'run', {
					id: mod.id,
					options: mod.options,
					state: mod.state,
				})
					.then(res => this.formatResponse(mod.id, res))
			)))
			.then(responses => responses
				.flat()
				.filter(Boolean),
			)
			.then(responses => ({
				responses,
				metrics: responses
					.map(r => r.metrics)
					.flat()
					.filter(Boolean),
				maxStatus: statusUtils.maxStatus(responses.map(r => r.status)),
			}))
			.then(({responses, metrics, maxStatus}) => {
				let output = {};
				return Promise.all(this.#reporters.map(reporter =>
					Promise.resolve()
						.then(()=> this.callPlugin(reporter.reporter, 'run', {
							id: reporter.id,
							options: reporter.options,
							state: reporter.state,
							responses,
							metrics,
						}))
						.then(moduleResponse => { // Stash output if it returns something non-falsy
							this.debug('Finished running reporter', reporter.id);
							if (moduleResponse) output[reporter.id] = moduleResponse;
						})
				))
					.then(()=> this.emit('runAll', {mom: this, responses, metrics, reports: output, maxStatus})
						.then(()=> output)
					)
			})
			.then(reports => {
				this.debug('Finished RunAll with', Object.keys(reports).length, 'non-falsy responses');
				return reports;
			})
	}


	/**
	* Call shutdown on all reporters returning a promise when it is safe to do so
	* @returns {Promise} A promise which resolves when the operation has completed
	*/
	shutdown() {
		this.debug('shutdown');
		return Promise.resolve()
			.then(()=> this.emit('preShutdown', {mom: this}))
			.then(()=> Promise.all([
				...this.#modules.map(module =>
					this.callPlugin(module.module, 'shutdown', {
						id: module.id,
						options: module.options,
						state: module.state,
					})),

				...this.#reporters.map(reporter =>
					this.callPlugin(reporter.reporter, 'shutdown', {
						id: reporter.id,
						options: reporter.options,
						state: reporter.state,
					})),
			]))
			.then(()=> this.emit('shutdown', {mom: this}))
			.then(()=> this.debug('shutdown complete'))
	}


	/**
	* Send an emergency message somehow
	* This can be manually invoked on a prograrm crash or other error
	* This module will output to console by default
	* @param {*} message... The message data to transmit
	* @returns {void}
	*/
	panic(...args) {
		console.warn(...args);
	}


	/**
	* Wrapper around debug() for this module
	*/
	debug = new Debug('mom')


	/**
	* Main constructor function
	*/
	constructor() {
		Eventer.extend(this);
	}
}

let mom = new MOM()
export default mom;
