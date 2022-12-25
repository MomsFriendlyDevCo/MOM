import axios from 'axios';
import relativeTime from '#lib/relativeTime';
import sslChecker from 'ssl-date-checker';

/**
* Fetch a URL checking for optional response time, keywords and SSL data
*/
export function run({options}) {
	let settings = {
		url: null,
		method: 'GET',
		request: {},
		warnMaxTime: 30 * 1000,
		critMaxTime: 60 * 1000,
		checkSSL: true,
		warnSSLRemaming: 60 * 60 * 1000 * 24 * 14, //~ 14d
		critSSLRemaming: 60 * 60 * 1000 * 24 * 3, //~ 3d
		keyword: null, // RegExp
		keywordNegative: null, // RegExp
		...options,
	};

	if (!settings.url) throw new Error('Must specify `url` key');

	let startDate = Date.now();
	return Promise.resolve()
		.then(()=> new URL(settings.url))
		.then(url => {
			console.log('TAP URL:', url);
			return url;
		})
		.then(url => Promise.all([
			// Fetch main page data
			axios({
				method: settings.method,
				url: settings.url,
				...settings.request,
			}),

			// Check SSL cert
			settings.checkSSL
				? sslChecker(url.host)
				: null,
		]))
		.then(([response, sslCertDetails]) => {
			let now = Date.now();
			let responseTime = now - startDate;
			let sslRemaining, sslRemainingHuman;
			if (settings.checkSSL) {
				let sslExpiry = new Date(sslCertDetails.valid_to);
				sslRemaining = sslExpiry - new Date();
				sslRemainingHuman = relativeTime(sslExpiry);
			}

			return {
				status:
					responseTime >= settings.critMaxTime ? 'CRIT'
					: responseTime >= settings.warnMaxTime ? 'WARN'
					: settings.checkSSL && sslRemaining < settings.critSSLRemaming ? 'CRIT'
					: settings.checkSSL && sslRemaining < settings.warnSSLRemaming ? 'WARN'
					: settings.keyword && !settings.keyword.test(response.data) ? 'CRIT'
					: settings.keywordNegative && !settings.keywordNegative.test(response.data) ? 'CRIT'
					: 'OK',
				message: [
					`Fetched in ${relativeTime(now)}`,
					settings.keyword && settings.keyword.test(response.data) ?  'Keyword found!' : false,
					settings.keywordNegative && settings.keywordNegative.test(response.data) ?  'Negative Keyword found!' : false,
					settings.checkSSL && `${sslRemainingHuman} time remaining until SSL expiry`,
				].filter(Boolean).join(', '),
				description: `Fetch URL ${settings.url}`,
				metric: [
					{
						id: 'responseTime',
						type: 'timeMs',
						value: responseTime,
						warnValue: `>=${settings.critMaxTime}`,
						critValue: `>=${settings.critMaxTime}`,
						desciprtion: 'Response time for web fetch',
					},
					...(settings.checkSSL
						? [{
							id: 'sslExpireTime',
							type: 'timeMs',
							value: sslRemaining,
							warnValue: `>=${settings.warnSSLRemaming}`,
							critValue: `>=${settings.critSSLRemaming}`,
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
				description: `Fetch URL ${settings.url}`,
			};
		})
}
