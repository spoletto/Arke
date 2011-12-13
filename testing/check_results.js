/* 
 * check_results.js
 * Iterate over all completed jobs in the database and
 * make sure the output data stored is the same as the
 * expected JSON file specified.
 *
 * Author: Stephen Poletto
 * Date: 12-13-2011
 */

var db = require('./db_provider'),
    fs = require('fs');

var EXPECTED_JSON_FILENAME = 'expected_output.json';

/*
 * Object deep equals.
 * Taken from http://stackoverflow.com/questions/1068834/object-comparison-in-javascript.
 * Used for ensuring replicated responses are equivalent.
 */
function deepEquals(x, y) {
  var p;
  for (p in y) {
	  if (typeof(x[p])=='undefined') { return false; }
  }
  for (p in y) {
	  if (y[p]) {
		  switch (typeof(y[p])) {
			  case 'object':
				  if (!y[p].equals(x[p])) { return false; } break;
			  case 'function':
				  if (typeof(x[p])=='undefined' ||
					  (p != 'equals' && y[p].toString() != x[p].toString()))
					  return false;
				  break;
			  default:
				  if (y[p] != x[p]) { return false; }
		  }
	  } else {
		  if (x[p])
			  return false;
	  }
  }
  for (p in x) {
	  if (typeof(y[p])=='undefined') { return false; }
  }
  return true;
}

function ensure_results_correct(expectedJSONObject, completionCallback) {
	db.Job.find( { 'active' : false }, function(err, completedJobs) {
		completedJobs.forEach(function(job) {
			try {
				var outputData = JSON.parse(job.output_data);
			} catch(e) {
				console.log("ERROR PARSING OUTPUT DATA FOR JOB " + job.job_id);
			}
			if (!deepEquals(outputData, expectedJSONObject)) {
				console.log("JOB " + job.job_id + " HAD OUTPUT DATA THAT DID NOT MATCH THE EXPECTED OUTPUT.");
			}
		});
		completionCallback();
	});
}

function run_tests(completionCallback) {
	try {
		var expectedJSONObject = JSON.parse(fs.readFileSync(__dirname + '/' + EXPECTED_JSON_FILENAME, 'utf8'));
	} catch(e) {
		console.log("ERROR READING EXPECTED OUTPUT JSON.");
	}
	ensure_results_correct(expectedJSONObject, completionCallback);
}

run_tests(function() {
	process.exit();
});
