import {run as DSRun, isAvailable as DSIsAvailable} from '#modules/diskSpace';
import {tmpdir} from 'node:os';

export function isAvailable({options, injector}) {
	options.path = tmpdir(); // Mutate path to tmpDir
	return DSIsAvailable.call(injector, injector);
}

export let run = DSRun;
