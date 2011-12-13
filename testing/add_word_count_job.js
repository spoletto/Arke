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

var db = require('./db_provider');

var INPUT_JSON_FILENAME = 'word_count_input.json';

try {
	var inputJSON = JSON.parse(fs.readFileSync(__dirname + '/' + INPUT_JSON_FILENAME, 'utf8'));
} catch(e) {
	console.log("ERROR READING EXPECTED OUTPUT JSON.");
}

db.add_new_user("spoletto@cs.brown.edu", "password", function(err) {
	db.add_new_job("spoletto@cs.brown.edu", inputJSON, 1, function(err, job) {
		console.log("Job ID = " + job.job_id);
	});
});
