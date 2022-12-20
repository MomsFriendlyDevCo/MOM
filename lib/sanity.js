import Debug from 'debug';
import {dirName} from '@momsfriendlydevco/es6';
import fsPath from 'node:path';

let debug = new Debug('sanity');

export class Sanity {
	/**
	* Individual sanity module unit
	* Can be a POJO with the below properties or a module that exports the same
	* @name {SanityModule}
	* @type {Object} An object which can export or provide any of the below properties
	* @property {function} [init] Initialization funciton, called as `(options)` with this module as the context
	* @property {function} [run] Individual run call funciton, called as `(options)` with this module as the context
	* @property {SanityModuleResponse} [lastResponse] Last sanity response, if any
	*/


	/**
	* The response from a Sanity module `run()` function
	* @name {SanityModuleResponse}
	* @type {Object}
	*/


	/**
	* Installed modules as a collection
	* @type {Array<Object>} Sanity module instance
	* @property {String} id The ID of the module, must be unique
	* @property {boolean} [isReady=false] Indicates if the module has finished loading
	* @property {SanityModule} module The raw module object, post loader
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
	* @type {Array<Object>} Sanity reporter instance
	* @property {boolean} [isReady=false] Indicates if the reporter has finished loading
	* @property {SanityReporter} reporter The raw reporter object, post loader
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
	* Install a sanity module with given options
	* Can be supplied with the module object or a string to import the file from
	* If the module contains dots or slashes a path is assumed, if none the module is loaded from this NPM/modules directory
	* @param {String|Object} module The module to install as either an Object, path to file or alias (exists within ../modules)
	* @param {Object} [options] Options to intialize the module
	* @param {String} [options.id] The ID of the module, determined from the basename / string alias if possible
	* @returns {Sanity} This chainable instance
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

			if (this.#modulesById[settings.id]) throw new Error(`Module ID "${settings.id}" already in use, specify a unique ID via Sanity.use(module: String|Object, options?: {id: String})`);

			debug('Installing module', settings.id, `(${module})`, 'with', settings);
			let newModule = {
				id: settings.id,
				options: settings,
				isReady: false,
				module: {},
				readyPromise: import(module) // NOTE: Loading in background, only ready when `isReady: true`
					.then(res => newModule.module = res)
					// Sanity checks {{{
					.then(()=> {
						if (!newModule.module.run) throw new Error(`Module ${newModule.id} does not have a run() function`);
					})
					// }}}
					.then(()=> typeof newModule.module.init == 'function' && newModule.module.init.call(this, newModule.options)) // Wait on module.init() if its present
					.then(()=> debug('Module', settings.id, 'ready'))
					.then(()=> newModule.isReady = true),
			};

			this.#modules.push(newModule);
			this.#modulesById[settings.id] = newModule;
		} else {
			throw new Error('Unknown module include type - specify an object or path');
		}

		return this;
	}


	/**
	* Install a reporter into this instance
	* The syntax is intentionally similar to `.use()`
	* @param {String|Object} reporter The module to install as either an Object, path to file or alias (exists within ../modules)
	* @param {Object} [options] Options to intialize the reporter
	* @returns {Sanity} This chainable instance
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

			debug('Installing reporter', settings.id, `(${reporter})`, 'with', settings);
			let newReporter = {
				id: settings.id,
				options,
				isReady: false,
				reporter: {},
				readyPromise: import(reporter) // NOTE: Loading in background, only ready when `isReady: true`
					.then(res => newReporter.reporter = res)
					// Sanity checks {{{
					.then(()=> {
						if (!newReporter.reporter.init && !newReporter.reporter.run) throw new Error(`Reporter ${newReporter.id} does not have either an init() or run() function`);
					})
					// }}}
					.then(()=> typeof newReporter.reporter.init == 'function' && newReporter.reporter.init.call(this, newReporter.options)) // Wait on reporter.init() if its present
					.then(()=> debug('Reporter', settings.id, 'ready'))
					.then(()=> newReporter.isReady = true),
			};

			this.#reporters.push(newReporter);
			this.#reportersById[settings.id] = newReporter;
		} else {
			throw new Error('Unknown reporter include type - specify an object or path');
		}
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
			.then(()=> debug('All modules + reporters loaded'))
	}


	/**
	* Format the raw response from a module.run() function
	* This adds various fluff and formats various fields into the {SanityModuleResponse} format
	* @param {*} rawResponse The raw response of the module
	* @returns {SanityModuleReponse} The formatted module response
	*/
	formatResponse(rawResponse) {
		let response = {
			id: null,
			date: new Date(),
			status: 'ERROR',
			message: '',
		};

		if (typeof rawResponse == 'string') { // Accept '(OK|WARN|ERROR): (message)' style responses
			let {status, message} = /^(?<status>OK|WARN|CRIT|ERROR):\s*(?<message>.*)$/?.groups || {};
			if (!status) throw new Error('Unprocessable Sanity module string response');
			return Object.assign(response, {status, message});
		} else if (typeof rawResponse == 'object') {
			if (!rawResponse.status) throw new Error('Sanity module response does not contain a status field');
			return Object.assign(response, {
				status: rawResponse.status.toUpperCase(),
				message: rawResponse.message,
			});
		} else {
			throw new Error('Unknown Sanity module response');
		}
	}


	/**
	* Run a specific module by ID
	* @param {string} id The module ID to run
	* @returns {SanityModuleResponse} The formatted module response
	*/
	run(id) {
		if (!this.#modulesById[id]) throw new Error(`Unknown Sanity module "${id}"`);
		debug('Run module', id);
		return this.#modulesById[id].module.run.call(this, this.#modulesById[id].options)
			.then(res => this.formatResponse(res))
			.then(SMRes => {
				SMRes.id = id;
				this.#modulesById[id].lastResponse = SMRes;

				debug('Finished running module', id, 'Response:', SMRes);
				return SMRes;
			})
	}


	/**
	* Run all installed modules
	* This function calls `.promise()` first to ensure all modules are ready
	*/
	runAll() {
		debug('RunAll');
		return this.promise()
			.then(()=> Promise.all(
				this.#modules.map(m =>
					this.run(m.id)
				)
			))
			.then(responses => {
				debug('Finished RunAll');
				return responses;
			})
	}
}

let sanity = new Sanity()
export default sanity;
