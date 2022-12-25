import TimeAgo from 'javascript-time-ago';
import en from 'javascript-time-ago/locale/en'

TimeAgo.addDefaultLocale(en)

let timeAgo = new TimeAgo('en-US')

export default function relativeTime(time) {
	return timeAgo.format(time, 'mini');
}
