/* 
 * generate_word_count_output.js
 *
 * Reads in the 'word_count_input.json' input
 * data and generates the expected output of a
 * word count MR job, writing to 'word_count_output.json'.
 *
 * Author: Stephen Poletto
 * Date: 12-13-2011
 */

var fs = require('fs');

var inputJSON = JSON.parse(fs.readFileSync('word_count_input.json', 'utf8'));
var wordToWordCount = {};
inputJSON.forEach(function(wordArray) {
	wordArray.split(" ").forEach(function(word) {
		word = word.replace(/\./g, ""); // Simulate the hack we have on the DB side for keys ending in periods.
		if (!(word in wordToWordCount)) {
			wordToWordCount[word] = 0;
		}
		wordToWordCount[word]++;
	});
});
fs.writeFileSync('word_count_output.json', JSON.stringify(wordToWordCount));