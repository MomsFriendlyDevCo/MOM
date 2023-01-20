MOM (Matt's Obsessive Monitor)
==============================


Quick Start
===========
MOM needs to be cloned + configured + run to work.
Below is the standard setup process to do this on a regular Node-ready server.


1. Install MOM in a local directory:

```shell
cd ~
git clone git@github.com:MomsFriendlyDevCo/MOM.git
cd MOM
```

2. Copy the example `.env` file and edit it for what you need:

```shell
cp .env.example .env
```

Now edit `.env`, enabling any of the monitors you want MOM to report on.

```shell
$EDITOR .env
```


3. Test MOM by running one monitor cycle

```shell
./mom.js run
```


4. Install MOM as a service (PM2)

```shell
# (OPTIONAL) Install PM2 if its not already on your server
sudo npm -g install pm2

# Install MOM as a PM2 process
./mom.js pm2-install

# Save the PM2 state
pm2 save

# Set PM2 to run at startup
pm2 startup
```


Modules / Reporters
===================
**Modules** are the main data snapshotting libraries of MOM.
**Reporters** are data output formatters.

The internals of each are pretty simple JavaScript ES6 modules export:

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


For each the calling context is a [MOMInjector](./lib/MOMInjector.js) which can also be spread into the functions function. For example to make use of the `options` + `state` objects:

```javascript
export function init({options, state}) {
    // options + state is now available locally
}
```

The context / function arguments is composed of:

| Name        | Type                | Description                                                                                                                          |
|-------------|---------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| `mom`       | `MOM`               | The main `MOM` instance                                                                                                              |
| `options`   | `Object`            | The [@MomsFriendlyDevCo/DotEnv](https://github.com/MomsFriendlyDevCo/dotenv) exported options object, based on the `schema` function |
| `state`     | `Object`            | An object which can store instance specific data such as database connection handles etc.                                            |
| `responses` | `MOMResponse` | The last response the module provided                                                                                                |
| `metrics`   | `Array<Object>`     | The last responses metric breakdown                                                                                                  |
| `Schema`    | `DotEnvSchema`      | Convenience export for DotEnv's schema object to be used in `config()` exports                                                       |



Utilities
=========
MOM provides various utilities to make tracking metrics easier.
All of these are opt-in ES6 modules which should be imported. They also export a default object with all functionality as an object.

```javascript
import metricTools from '@momsfriendlydevco/mom/metricTools';
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


@momsfriendlydevco/mom/MOMResponse
----------------------------------
Generic class and static functions for handling responses from Modules.

### MOMResponse.joiValidator
JOI validation object to validate an incomming MOMResponse POJO.

### MOMResponse.validate(response)
Utility function to run the JOI validator on a POJO.

### MOMResponse.fromMetrics(metrics)
Create an outer MOMResponse object from the inner metrics. This function uses the status of each metric to determine the outer status of the MOMResponse.


@momsfriendlydevco/mom/MOMResponseMetric
----------------------------------------
Generic class and static functions for handling individual metrics within a MOMResponse.

### MOMResponseMetric.joiValidator
JOI validation object to validate an incomming MOMResponseMetric POJO.

### MOMResponseMetric.validate(response)
Utility function to run the JOI validator on a POJO.

### MOMResponseMetric.decorate(metric)
Decorate additional utility properties to a Metric-like object.

### MOMResponseMetric.evalExpression(value, expr, max)
Evaluate an expression (such as `MOMResponseMetric{}.warnValue`) against the metric value (+ optional max) and determine if it matches.

### MOMResponseMetric.statuses
Array collection of all statuses supported by MOM.

### MOMResponseMetric.statusTextToIndex
Object lookup of status text (e.g. 'CRIT') to the status entry within `statusUtils.statuses`

### MOMResponseMetric.maxStatus(arr)
Find the most critical status in an array of status strings.

### MOMResponseMetric.metricValueMatches(value, expression)
FIXME: Redundent?

### MOMResponseMetric.statusFromMetric(metric)
Return the status ID (e.g. `"PASS"`) from the metric by examining its criteria.




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
* [ ] General: Other startup installs: Forever
* [ ] General: Other startup installs: SystemD
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
