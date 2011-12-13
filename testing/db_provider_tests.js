/* 
 * db_provider_tests.js.
 * Unit tests for the public API in db_provider.js.
 *
 * Author: Stephen Poletto
 * Date: 12-06-2011
 */

var db = require('./db_provider'),
	assert = require('assert');

function job_finished(job_id) {
	console.log("Job finished!");
}

function reduce_started(job_id) {
	console.log("Job entered reduce phase.");
	for (var i = 0; i < 9; i++) {
		db.dequeue_reduce_work(job_id, function(err, work_unit) {
			console.log("Dequeued work chunk " + work_unit._id.toString());
			var key = "testKey" + work_unit._id.toString();
			var value = "testValue" + work_unit._id.toString();
			var result = '{ "' + key + '":"' + value + '" }';
			db.enqueue_final_result(job_id, work_unit._id, result, function() {
				job_finished(job_id);
			});
		});
	}
}

function run_tests() {
	db.add_new_user("spoletto@cs.brown.edu", "password", function(err) {
		//assert.ok(err == null, "Error adding user.");
		console.log("Added user 'spoletto@cs.brown.edu'");
		db.add_new_job("spoletto@cs.brown.edu", "map.py", "reduce.py", [
			{ "key1":"value1" },
			{ "key2":"value2" },
			{ "key3":"value3" }
		], 3, function(err, job) {
			assert.ok(err == null, "Error adding job.");
			console.log("Added job with id=" + job._id.toString());
			
			for (var i = 0; i < 9; i++) {
				db.dequeue_map_work(job.job_id, function(err, work_unit) {
					console.log("Dequeued work chunk " + work_unit._id.toString());
					var key = "testKey" + work_unit._id.toString();
					var value = "testValue" + work_unit._id.toString();
					var result = '{ "' + key + '":"' + value + '" }';
					db.enqueue_intermediate_result(job._id, work_unit._id, result, function() {
						reduce_started(job._id);
					});
				});
			}
		});
	});
}

run_tests();