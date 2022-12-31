import SanityResponseMetric from '#lib/sanityResponseMetric';

export function config({Schema}) {
	return new Schema({
		human: {type: Boolean, default: true, help: 'Humanize all readings (simplify byte and times)'},
		header: {type: String, default: ''},
		footer: {type: String, default: ''},
		prefix: {type: String, default: ''},
		stylePrefix: {type: 'style', default: 'bold fgWhite bgBlue'},
		styleModule: {type: 'style', default: 'bold fgBlue'},
		styleMetric: {type: 'style', default: 'fgBlue'},
		styleValueCrit: {type: 'style', default: 'fgRed'},
		styleValueWarn: {type: 'style', default: 'fgYellow'},
		styleValueOk: {type: 'style', default: 'fgWhite'},
		styleValueMax: {type: 'style', default: 'underline fgWhite'},
		styleMeasures: {type: 'style', default: 'fgGray'},
	});
}

export function run({options, metrics}) {
	return metrics
		.map(metric => {
			SanityResponseMetric.decorate(metric);

			return [
				options.prefix && options.stylePrefix(options.prefix),
				options.styleModule(metric.idPath.join('.')),
				'=',
				options[
					metric.status == 'CRIT' ? 'styleValueCrit'
					: metric.status == 'WARN' ? 'styleValueWarn'
					: 'styleValueOk'
				](
					options.human ? metric.valueFormatted : metric.value,
				),
				metric.valueMax !== undefined &&
					'/ ' + options.styleValueMax(options.human ? metric.valueMaxFormatted : metric.valueMax),
				...(metric.warnValue || metric.critValue
					? [
						options.styleMeasures('('),
						[
							metric.warnValue && `warn${metric.warnValue}`,
							metric.critValue && `crit${metric.critValue}`,
							metric.unit && `unit:${metric.unit}`,
						].map(v => options.styleMeasures(v)).join(options.styleMeasures(', ')),
						options.styleMeasures(')'),
					].filter(Boolean) : []
				),
			].filter(Boolean).join(' ')
		})
		.join('\n')
}
