MOM (Matt's Obsessive Monitor)
==============================


Modules / Reporters
===================
Modules are the main data snapshotting libraries of MOM.
Reporters are data output formatters.

The internals of each are pretty simple JavaScript ES6 modules:

```javascript
export function config({Schema}) {
    // Return a DotEnv schema - see https://github.com/MomsFriendlyDevCo/dotenv
	return new Schema({
        title: {type: String, required: true},
        someNumber: {type: Number, required: false, default: 666},
	});
}

export function init() {
    // Setup here
}


export function shutdown() {
    // Teardown here
}

export function run() {
    // Run your tests + return some output
}
```


The following exportables are supported:

| Exportable   | Type       | Description                                                                    |
|--------------|------------|--------------------------------------------------------------------------------|
| `config()`   | `Function` | Config setup function which defines the options the module can accept          |
| `init()`     | `Function` | Setup function which is run once on initalization                              |
| `shutdown()` | `Function` | Teardown function which is run on shutdown to clean up any remaining resources |
| `run()`      | `Function` | Main worker function which is executed each snapshot step                      |



Utilities
=========
MOM provides various utilities to make tracking metrics easier.
All of these are opt-in ES6 modules which should be imported. They also export a default object with all functionality as an object.

```javascript
import metricTools from '@momsfriendlydevco/mom';
metricTools.snapshotSinceLast(...); // Access via exported object
```

```javascript
import {snapshotSinceLast} from '@momsfriendlydevco/mom/metricTools';
snapshotSinceLast(...); // "Picked" export from library
```

@momsfriendlydevco/mom/cache
----------------------------
Short term caching utilities.

### cache.get(id, fallback)
Promised return of a cached value (if present, otherwise fallback).

### cache.has(id)
Promised return if the cached value exists (eventual return of boolean).

### cache.set(id, value)
Promise set set a cached value (returning the value set).


@momsfriendlydevco/mom/config
-----------------------------
Global MOM config object.


@momsfriendlydevco/mom/outputUtils
----------------------------------
Various output utility functions - usually using the global config object for configuration.

### outputUtils.logJSON(obj)
Pretty print a JSON object with global config


@momsfriendlydevco/mom/metricTools
----------------------------------
Various tools to make handling metrics a little easier.


### metricTools.snapshotSinceLast(id, value)
Return the difference since the last time a metric was sampled to now.
This is useful if only recieving snapshot totals and not a diff.


@momsfriendlydevco/mom/promiseUtils
-----------------------------------
Various promise handling utilities.

### promiseUtils.deepResolve(obj)
Traverse an array / object and resolve all promises into a flat object / array.


@momsfriendlydevco/mom/statusUtils
-----------------------------------
Various status handling utilities.

### statusUtils.statuses
Array collection of all statuses supported by MOM.

### statusUtils.statusTextToIndex
Object lookup of status text (e.g. 'CRIT') to the status entry within `statusUtils.statuses`

### statusUtils.maxStatus(arr)
Find the most critical status in an array of status strings.


@momsfriendlydevco/mom/throttle
-------------------------------
Various functions for handing throttled data.

### throttle.isThrottled(id)
Promise to return if an ID'd throttle already exists based on its timing

### throttle.createThrottle(id, timing)
Promise to create a throttle based on an ID + timing.
 

Developing Custom Modules
=========================
The easiest method to test a module is simply to run the MOM CLI tool specifying the name of your module with however many reporters you want to test:

```
mom run -m MYMODULE -r json
```


TODO
====

* [ ] General: Naming + NPM namespace
* [ ] General: "Module" terminology
* [x] General: "OK", "WARN", "CRIT", "ERROR" progression
* [ ] General: Unify Module + Reporter NPMness
* [ ] General: Support for externally installed NPMs
* [x] Module: Bandwidth
* [x] Module: Disk Space
* [x] Module: Disk Space (OS Temporary dir)
* [ ] Module: Docker
* [x] Module: Email
* [x] Module: Fetch
* [x] Module: Glob
* [x] Module: Load
* [x] Module: Memory
* [x] Module: Mongo
* [ ] Module: MySQL
* [x] Module: Ping
* [x] Module: PM2 process monitoring
* [x] Module: Ports
* [ ] Module: Script runner
* [x] Reporter: Email
* [ ] Reporter: Express
* [x] Reporter: Honeycomb
* [x] Reporter: JSON
* [x] Reporter: Metrics
* [ ] Reporter: Prometheus
* [ ] Reporter: Raw
* [x] Reporter: StatsD
* [x] Reporter: Text
