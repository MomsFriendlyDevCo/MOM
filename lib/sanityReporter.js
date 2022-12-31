/**
* An individual Sanity Reporter
* Can be a POJO with the below properties or a module that exports the same
* @name {SanityReporter}
* @type {Object} An object which can export or provide any of the below properties
* @property {Function} [isAvailable] Async function to determine if this module can be loaded, if it throws the module is ignored from initalization
* @property {function} [init] Initialization async function, called as `(SanityInjectors)` with Sanity as context
* @property {function} [run] Individual run async function, called as `(SanityInjectors)` with Sanity as context
* @property {function} [shutdown] Shutdown async function, called as `(SanityInjectors)`
*/
