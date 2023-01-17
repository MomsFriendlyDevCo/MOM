import {Schema} from '@momsfriendlydevco/dotenv/Schema';
import MOMResponseMetric from '#lib/MOMResponseMetric';

export function config() {
	return new Schema({
		human: {type: Boolean, default: true, help: 'Humanize all readings (simplify byte and times)'},
		prefix: {type: String, default: ''},
		stylePrefix: {type: 'style', default: 'bold fgWhite bgBlue'},
		styleModule: {type: 'style', default: 'bold fgBlue'},
		styleMetric: {type: 'style', default: 'fgBlue'},
		styleValuePass: {type: 'style', default: 'fgWhite'},
		styleValueWarn: {type: 'style', default: 'fgYellow'},
		styleValueCrit: {type: 'style', default: 'fgRed'},
		styleValueMax: {type: 'style', default: 'underline fgWhite'},
		styleMeasures: {type: 'style', default: 'fgGray'},
	});
}

export function run({options, metrics}) {
	return metrics
		.map(metric => styleMetric(metric, options))
		.join('\n')
}


/**
* Return a single metric styled using the metrics options
* This is used by the main `run()` function and can be used by other reporters if needed
* @param {Object} metric Metric to render
* @param {Object} [options] Options structure to use to customize appearance
* @returns {String} The metric output styleized
*/
export function styleMetric(metric, options) {
	let settings = config().apply(''); // FIXME: When DotEnv.Schema#apply() accepts options as an object

	MOMResponseMetric.decorate(metric);

	return [
		settings.prefix && settings.stylePrefix(settings.prefix),
		settings.styleModule(metric.idPath.join('.')),
		'=',
		settings[
			metric.status == 'CRIT' ? 'styleValueCrit'
			: metric.status == 'WARN' ? 'styleValueWarn'
			: 'styleValuePass'
		](
			settings.human ? metric.valueFormatted : metric.value,
		),
		metric.valueMax !== undefined &&
			'/ ' + settings.styleValueMax(settings.human ? metric.valueMaxFormatted : metric.valueMax),
		...(metric.warnValue || metric.critValue
			? [
				settings.styleMeasures('('),
				[
					metric.warnValue && `warn${metric.warnValue}`,
					metric.critValue && `crit${metric.critValue}`,
					metric.unit && `unit:${metric.unit}`,
				].map(v => settings.styleMeasures(v)).join(settings.styleMeasures(', ')),
				settings.styleMeasures(')'),
			].filter(Boolean) : []
		),
	].filter(Boolean).join(' ')
}
