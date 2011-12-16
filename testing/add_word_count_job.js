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

var db = require('../db_provider'),
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

db.add_new_user("spoletto@cs.brown.edu", "password", function(err) {
	var job = new db.Job();
	job.reducer = reduce;
	job.mapper = map;
	job.mapInput = _.map(inputJSON, function(pair){
		return {data:[{key: JSON.stringify(pair.k), value:JSON.stringify(pair.v)}]}
	});

	job.save(function(err){
    	if(err){
			console.error(err);
		} else {
			console.log("Submitted job with ID = " + job._id);
			db.associate_job_with_user(job, "spoletto@cs.brown.edu", function(err) {
				if(err){
					console.error(err);
				}
				process.exit();
			});
		}
    });
});
