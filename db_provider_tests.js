/* 
 * db_provider_tests.js.
 * Unit tests for the public API in db_provider.js.
 *
 * Author: Stephen Poletto
 * Date: 12-06-2011
 */

var db = require('./db_provider'),
	assert = require('assert');

function run_tests() {
	db.add_new_user("spoletto", "password", function(err) {
		//assert.ok(err == null, "Error adding user.");
		console.log("Added user 'spoletto'");
		db.add_new_job("spoletto", "map.py", "reduce.py", [
			{ "key1":"value1" },
			{ "key2":"value2" },
			{ "key3":"value3" }
		], 3, function(err, job) {
			assert.ok(err == null, "Error adding job.");
			console.log("Added job with id=" + job._id.toString());
			
			for (var i = 0; i < job.initial_input_data_count; i++) {
				db.dequeue_map_work(job.job_id, function(err, work_unit) {
					console.log("Dequeued work chunk " + work_unit._id.toString());
					db.enqueue_intermediate_result(job._id, work_unit._id, { "testKey":"testValue" }, function(job_id, final_intermediate_data) {
						console.log("Finished map phase. Final intermediate data: ");
						final_intermediate_data.forEach(function(result) {
							console.log(result.result);
						});
					});
				});
			}
		});
	});
}

run_tests();