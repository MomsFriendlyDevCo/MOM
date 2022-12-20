import {run as DSRun, init as DSInit} from '#modules/diskSpace';
import {tmpdir} from 'node:os';

export function init(options) {
	options.path = tmpdir(); // Mutate path to tmpDir
	return DSInit(options);
}

export let run = DSRun;
