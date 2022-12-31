import {formatByUnit} from '@momsfriendlydevco/formatters';

export default class SanityResponseMetric {
	static decorate(metric) {
		let status =
			metric.critValue && SanityResponseMetric.evalExpression(metric.value, metric.critValue, metric.valueMax) ? 'CRIT'
			: metric.warnValue && SanityResponseMetric.evalExpression(metric.value, metric.warnValue, metric.valueMax) ? 'WARN'
			: 'OK';

		Object.assign(metric, {
			status,
			valueFormatted: formatByUnit(metric.value, metric.unit),
			...(metric.valueMax
				? {valueMaxFormatted: formatByUnit(metric.valueMax, metric.unit)}
				: {}
			),
		});

		return metric;
	}

	static evalExpression(value, expr, max) {
		let ex = /^(?<sign><|>|=)(?<eq>=)?\s*(?<value>\d+)(?<percentile>%)?$/.exec(expr)?.groups;
		if (!ex || !ex.sign) throw new Error(`Cannot evaluate expression segment "${expr}"`);

		// Calculate values relative to a max
		if (ex.percentile) {
			if (max === undefined) throw new Error('Cannot calculate percentile with no max value');
			ex.value = max * (ex.value / 100);
		}

		if (ex.sign == '<' && ex.eq) {
			return value <= ex.value;
		} else if (ex.sign == '<') {
			return value < ex.value;
		} else if (ex.sign == '>' && ex.eq) {
			return value >= ex.value;
		} else if (ex.sign == '>') {
			return value > ex.value;
		} else if (ex.sign == '=') {
			return value == ex.value;
		} else {
			throw new Error(`Unknown expression format "${expr}"`);
		}
	}
}