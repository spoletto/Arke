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
    fs = require('fs');

var JOB_UPLOAD_DIRECTORY = '../jobs/';
var INPUT_JSON_FILENAME = 'word_count_input.json';
var CLIENT_JS_FILENAME = 'word_count.js';

try {
	var inputJSON = JSON.parse(fs.readFileSync(__dirname + '/' + INPUT_JSON_FILENAME, 'utf8'));
} catch(e) {
	console.log("ERROR READING INPUT JSON.");
}

function copyFileSync(srcFile, destFile) {
	var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
	BUF_LENGTH = 64 * 1024;
	buff = new Buffer(BUF_LENGTH);
	fdr = fs.openSync(srcFile, 'r');
	fdw = fs.openSync(destFile, 'w');
	bytesRead = 1;
	pos = 0;
	while (bytesRead > 0) {
	bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
	fs.writeSync(fdw, buff, 0, bytesRead);
	pos += bytesRead;
	}
	fs.closeSync(fdr);
	fs.closeSync(fdw);
	return;
};

db.add_new_user("spoletto@cs.brown.edu", "password", function(err) {
	db.add_new_job("spoletto@cs.brown.edu", "A job blurb.", inputJSON, 1, function(err, job) {
		console.log("Job ID = " + job.job_id);
		copyFileSync(__dirname + '/' + CLIENT_JS_FILENAME, __dirname + '/' + JOB_UPLOAD_DIRECTORY + job.job_id + '.js');
		process.exit();
	});
});
