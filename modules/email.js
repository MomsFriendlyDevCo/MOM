import nodemailer from 'nodemailer';
import {relativeTime} from '@momsfriendlydevco/formatters';
import {URL} from 'node:url';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'uri', required: true, help: 'SMTP details in the form smtp://USER:PASS@SERVER[:PORT]'},
		from: {type: 'email', required: true},
		to: {type: 'emails', required: true},
		subject: {type: String, default: 'Sanity test email'},
		text: {type: String, default: 'This is a test email sent from the Sanity email checker'},
		warnDispatchTime: {type: 'duration', default: '1m'},
		critDispatchTime: {type: 'duration', default: '5m'},
	})
}

export function init({options, state}) {
	let transportUrl = new URL(options.uri);

	state.transport = nodemailer.createTransport({
		host: transportUrl.hostname,
		port: transportUrl.port,
		auth: {
			user: unescape(transportUrl.username), // Convert back mangled '@' signs in username
			pass: transportUrl.password,
		},
	});
}

export function run({options, state}) {
	let startTime = Date.now();

	return state.transport.sendMail({
		from: options.from,
		to: options.to,
		subject: options.subject,
		text: options.text,
	})
		.then(res => {
			let dispatchTime = Date.now() - startTime;

			console.log('RAW EMAIL RES', res);

			return ({
				status: 'OK',
				message: `Dispatched email in ${relativeTime(startTime)}`,
				description: `Dispatch email to ${options.to}`,
				metric: {
					id: 'dispatchTime',
					unit: 'timeMs',
					value: dispatchTime,
					warnValue: `>=${options.warnDispatchTime}`,
					critValue: `>=${options.critDispatchTime}`,
					description: `Amount of time to dispatch an email to ${options.to}`,
				},
			})
		})
}
