import {format} from '@momsfriendlydevco/formatters';
import nagu from 'nagu';
import nodemailer from 'nodemailer';
import throttle from '#lib/throttle';

export function config({Schema}) {
	return new Schema({
		uri: {type: 'uri', required: true, help: 'SMTP details in the form smtp://USER:PASS@SERVER[:PORT]'},
		from: {type: 'email', required: true},
		to: {type: 'emails', required: true},
		subject: {type: String, default: 'MOM report email'},
		reporter: {type: String, required: true, enum: ['text'], default: 'text', help: 'Reporter to use for main email body - must be enabled'},
		reporterAttach: {type: Object, required: false, default: '', help: 'Other reporter content to attach in the form: `reporter:FILENAME.EXT` omit filename to guess', noValue: null},
		statuses: {type: Set, enum: ['OK', 'WARN', 'CRIT', 'ERROR'], default: 'WARN,CRIT,ERROR', help: 'Which statuses to send emails on'},
		throttle: {type: 'duration', required: false, default: '0ms', help: 'How often to allow emails to be sent'},
	})
}

export function init({options, mom, state}) {
	let transportUrl = new URL(options.uri);
	state.transport = nodemailer.createTransport({
		host: transportUrl.hostname,
		port: transportUrl.port,
		auth: {
			user: unescape(transportUrl.username), // Convert back mangled '@' signs in username
			pass: transportUrl.password,
		},
	});

	mom.on('runAll', async ({mom, reports, maxStatus}) => {
		// Determine if we need to do anything (maxStatus is something we are interested in) {{{
		if (!options.statuses.has(maxStatus)) return;
		// }}}
		// Check throttling {{{
		if (options.throttle) {
			let isThrottled = await throttle.isThrottled('throttle-reporter-email')
			if (isThrottled) {
				mom.debug(`Email sending is throttled until ${isThrottled.toISOString()}`);
			} else {
				await throttle.createThrottle('throttle-reporter-email', options.throttle);
			}
		}
		// }}}

		// Slurp report content {{{
		let content = reports[options.reporter];
		let isHtml = false;
		if (!content) return mom.panic(`Email reporter asked to use the "${options.reporter}" report but it is not provided - maybe this reporter isnt enabled?`);
		if (typeof content != 'string') return mom.panic('Email reporter needs a string output - got given something complex');
		// }}}
		// Sanity check we have all the attachment reports we need {{{

		let missingReportAttach = Object.keys(options.reporterAttach)
			.filter(key => !reports[key]);
		if (missingReportAttach.length > 0) return mom.panic(format(`Email reporter missing report output for attachment: [list and quote]${missingReportAttach}[/list] - check [this|these] are enabled`));
		// }}}

		// Try to guess if content is HTML {{{
		if (options.reporter == 'html' || /<(div|p|span)/.test(content)) isHtml = true;
		// }}}
		// Fixups: REPORTER:text -> HTML {{{
		if (options.reporter == 'text') {
			content = nagu.html(content);
			isHtml = true;
		}
		// }}}

		// Dispatch email {{{
		await state.transport.sendMail({
			from: options.from,
			to: options.to,
			subject: options.subject,
			[isHtml ? 'html' : 'text']: content,
			attachments: Object.entries(options.reporterAttach)
				.map(([reporter, filename]) => ({
					filename: filename || `${reporter}.txt`,
					content: reports[reporter],
				})),
		});
		// }}}
	});
}
