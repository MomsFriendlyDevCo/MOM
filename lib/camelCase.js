/**
* Split a sequence of words by punctuation / spaces and uppercase first letter of each word (except the first)
* @param {String} str The input string to transform
* @returns {String} The input string in camelCase format
* @url https://github.com/MomsFriendlyDevCo/Nodash
*/
export default function camelCase(str) {
	return str
		.split(/[\p{P}\p{Z}]+/u) // Split by Punctuation or Spaces
		.map((word, wordIndex) =>
			(wordIndex == 0 ? word[0].toLowerCase() : word[0].toUpperCase())
			+ word.substring(1).toLowerCase()
		)
		.join('');
}
