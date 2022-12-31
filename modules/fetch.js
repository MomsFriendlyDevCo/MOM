import axios from 'axios';
import {relativeTime} from '@momsfriendlydevco/formatters';
import sslChecker from 'ssl-date-checker';


export function config({Schema}) {
	return new Schema({
		url: {type: 'uri', required: true},
		method: {type: String, default: 'GET', enum: ['GET', 'POST', 'DELETE', 'PATCH']},
		request: {type: Object, default: {}},
		warnMaxTime: {type: 'duration', default: '30s'},
		critMaxTime: {type: 'duration', default: '1m'},
		checkSSL: {type: Boolean, default: true},
		warnSSLRemaming: {type: 'duration', default: '14d'},
		critSSLRemaming: {type: 'duration', default: '3d'},
		keyword: {type: RegExp, required: false},
		keywordNegative: {type: RegExp, required: false},
	});
}


/**
* Fetch a URL checking for optional response time, keywords and SSL data
*/
export function run({options}) {
	let startTime = Date.now();
	return Promise.resolve()
		.then(()=> new URL(options.url))
		.then(url => Promise.all([
			// Fetch main page data
			axios({
				method: options.method,
				url: options.url,
				...options.request,
			}),

			// Check SSL cert
			options.checkSSL
				? sslChecker(url.host)
				: null,
		]))
		.then(([response, sslCertDetails]) => {
			let now = Date.now();
			let responseTime = now - startTime;
			let sslRemaining, sslRemainingHuman;
			if (options.checkSSL) {
				let sslExpiry = new Date(sslCertDetails.valid_to);
				sslRemaining = sslExpiry - new Date();
				sslRemainingHuman = relativeTime(sslExpiry);
			}

			return {
				status:
					responseTime >= options.critMaxTime ? 'CRIT'
					: responseTime >= options.warnMaxTime ? 'WARN'
					: options.checkSSL && sslRemaining < options.critSSLRemaming ? 'CRIT'
					: options.checkSSL && sslRemaining < options.warnSSLRemaming ? 'WARN'
					: options.keyword && !options.keyword.test(response.data) ? 'CRIT'
					: options.keywordNegative && !options.keywordNegative.test(response.data) ? 'CRIT'
					: 'OK',
				message: [
					`Fetched in ${relativeTime(now)}`,
					options.keyword && options.keyword.test(response.data) ?  'Keyword found!' : false,
					options.keywordNegative && options.keywordNegative.test(response.data) ?  'Negative Keyword found!' : false,
					options.checkSSL && `${sslRemainingHuman} time remaining until SSL expiry`,
				].filter(Boolean).join(', '),
				description: `Fetch URL ${options.url}`,
				metrics: [
					{
						id: 'responseTime',
						type: 'timeMs',
						value: responseTime,
						warnValue: `>=${options.critMaxTime}`,
						critValue: `>=${options.critMaxTime}`,
						description: 'Response time for web fetch',
					},
					...(options.checkSSL
						? [{
							id: 'sslExpireTime',
							type: 'timeMs',
							value: sslRemaining,
							warnValue: `>=${options.warnSSLRemaming}`,
							critValue: `>=${options.critSSLRemaming}`,
							description: 'Amount of time the SSL has to expiry',
						}]
						: []
					)
				],
			};
		})
		.catch(e => {
			return {
				status: 'CRIT',
				message: e.toString(),
				description: `Fetch URL ${options.url}`,
			};
		})
}
