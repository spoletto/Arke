/* 
 * add_word_count_job.js
 *
 * Creates a new 'word count' job and adds it
 * to the database. Prints the job_id of the newly
 * created job to the console.
 *
 * Author: Stephen Poletto
 * Date: 12-07-2011
 */

var db = require('../redis_db'),
    fs = require('fs'),
    _ = require('underscore');

var INPUT_JSON_FILENAME = 'word_count_input.json';

try {
	var inputJSON = JSON.parse(fs.readFileSync(__dirname + '/' + INPUT_JSON_FILENAME, 'utf8'));
} catch(e) {
	console.log("ERROR READING INPUT JSON.");
}

var map = "function(key, value, emit){ value.split(' ').forEach(function(word) { emit(word, 1); }); }";
var reduce = "function(key, values, emit){ emit(key, values.length); }";

db.new_user("spoletto@cs.brown.edu", "password", function(err) {
	db.new_job("spoletto@cs.brown.edu", inputJSON, 2, map, reduce, "blurb", function(err, job_id) {
		console.log("Submitted job with ID = " + job_id);
		process.exit();
	});
});
