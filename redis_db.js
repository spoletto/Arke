var uuid = require('node-uuid');
var _ = require('underscore');
var assert = require('assert').ok;
var bcrypt = require('bcrypt');
var redis = require("redis"),
    client = redis.createClient();

// TODO: Add data validation (i.e. make sure the input)
// matches specification for each of the API functions.

client.on("error", function (err) {
    console.log("Error " + err);
});

// Functions to access Redis collections.
function k_input(job_id) {
	return job_id + "_input";
}

// READ-ONLY, except by add_new_job.
// Useful if we need to restart a job for some reason.
function k_original_input(job_id) {
	return job_id + "_originalInput";
}

function k_replication_factor(job_id) {
	return job_id + "_replicationFactor";
}

function k_blurb(job_id) {
	return job_id + "_blurb";
}

function k_work_queue(job_id) {
	return job_id + "_workQueue";
}

function k_in_count(job_id) {
	return job_id + "_inCount";
}

function k_out_count(job_id) {
	return job_id + "_outCount";
}

function k_output(job_id, chunk_id) {
	return job_id + "_intermediateOutput_" + chunk_id;
}

function k_final_output(job_id) {
	return job_id + "_finalOutput";
}

function k_phase(job_id) {
	return job_id + "_phase";
}

function k_map_code(job_id) {
	return job_id + "_mapCode";
}

function k_reduce_code(job_id) {
	return job_id + "_reduceCode";
}

function k_runnable() {
	return "runnableTasks";
}

function k_user_password(email_address) {
	return email_address + "_password";
}

function k_user_jobs(email_address) {
	return email_address + "_jobs";
}

// Callback: function(err).
// err will be set to "EXISTS" if the email_address has already been taken.
function new_user(email_address, password, callback) {
	assert(!!email_address);
	assert(!!password);
	assert(!!callback);
	
	client.exists(k_user_password(email_address), function(err, exists) {
		if (exists) { callback("EXISTS"); return; }
		
		// Hash the password using a salt.
		bcrypt.gen_salt(10, function(err, salt) {
		    bcrypt.encrypt(password, salt, function(err, hash) {
				client.set(k_user_password(email_address), hash, callback);
		    });
		});
	});
}

// Callback: function(err, pw_success).
// err will be set to "NOT_EXISTS" if the email_address doesn't exist in the database.
function user_password_correct(email_address, test_password, callback) {
	assert(!!email_address);
	assert(!!test_password);
	assert(!!callback);
	
	client.exists(k_user_password(email_address), function(err, exists) {
		if (!exists) { callback("NOT_EXISTS", null); return; }
		client.get(k_user_password(email_address), function(err, password) {
			bcrypt.compare(test_password, password, callback);
		});
	});
}

// Callback: function(err, jobs).
// err will be set to "NOT_EXISTS" if the email_address doesn't exist in the database.
function get_user_jobs(email_address, callback) {
	assert(!!email_address);
	assert(!!callback);
	
	client.exists(k_user_password(email_address), function(err, exists) {
		if (!exists) { callback("NOT_EXISTS", null); return; }
		client.smembers(k_user_jobs(email_address), callback);
	});
}

// Input_data: Array [{ "k":k, "v":v }]
// Callback: function(err, job_id)
function new_job(email_address, input_data, replication_factor, map_code, reduce_code, blurb, callback) {
	assert(!!callback);
	assert(!!email_address);
	assert(!!input_data);
	assert(!!replication_factor);
	assert(!!map_code);
	assert(!!reduce_code);
	assert(!!blurb);
	
	// Need to initialize the map_input and work_queue.
	var job_id = uuid.v4();
	input_data.forEach(function(item) {
		var chunk_id = uuid.v4();
		client.hset(k_input(job_id), chunk_id, JSON.stringify(item));
		client.hset(k_original_input(job_id), chunk_id, JSON.stringify(item));
		
		for (var i = 0; i < replication_factor; i++) {
			client.lpush(k_work_queue(job_id), chunk_id);
		}
	});
	client.set(k_in_count(job_id), input_data.length);
	client.set(k_out_count(job_id), 0);
	client.set(k_replication_factor(job_id), replication_factor);
	client.set(k_phase(job_id), "Map");
	client.set(k_map_code(job_id), map_code);
	client.set(k_reduce_code(job_id), reduce_code);
	client.set(k_blurb(job_id), blurb);
	client.sadd(k_runnable(), job_id);
	client.sadd(k_user_jobs(email_address), job_id);
	callback(null, job_id);
}

// Callback: function(err, job_id)
function fetch_job(callback) {
	assert(!!callback);
	client.srandmember(k_runnable(), callback);
}

// Callback should be function (err, job_id, chunk_id, chunk, phase, map/reduce_code).
function dequeue_work(callback) {
	assert(!!callback);
	var getPhaseSpecificCode = function(job_id, chunk_id, chunk) {
		client.get(k_phase(job_id), function(err, phase) {
			if (phase == "Map") {
				client.get(k_map_code(job_id), function(err, map_code) {
					callback(err, job_id, chunk_id, chunk, "Map", map_code);
				});
			} else if (phase == "Reduce") {
				client.get(k_reduce_code(job_id), function(err, reduce_code) {
					callback(err, job_id, chunk_id, chunk, "Reduce", reduce_code);
				});
			} else if (phase == "Finished") {
				callback(null, null, null, null, null);
			} else {
				console.error("Incorrect phase. Phase = " + phase);
				assert(false);
			}
		});
	};
	
	fetch_job(function(err, job_id) {
		if (!job_id) { callback(null, null, null, null, null); return; }
		client.lpop(k_work_queue(job_id), function(err, chunk_id) {
			if (!chunk_id) { callback(null, null, null, null, null); return; }
			client.hget(k_input(job_id), chunk_id, function(err, chunk) {
				assert(!!chunk);
				getPhaseSpecificCode(job_id, chunk_id, JSON.parse(chunk));
			});
		});
	});
}

// Callback: function(err, results).
function results(job_id, callback) {
	client.lrange(k_final_output(job_id), 0, -1, function(err, results) {
		var returnedResults = [];
		results.forEach(function(item) {
			returnedResults.push(JSON.parse(item));
		});
		callback(err, returnedResults);
	});
}

// Callback: function(err, phase).
function phase(job_id, callback) {
	client.get(k_phase(job_id), callback);
}

// Callback: function(err, blurb).
function blurb(job_id, callback) {
	client.get(k_blurb(job_id), callback);
}

// Callback: function(err, in_count, out_count)
function completion_status_for_current_phase(job_id, callback) {
	client.get(k_in_count(job_id), function(err, in_count) {
		client.get(k_out_count(job_id), function(err, out_count) {
			callback(err, in_count, out_count);
		});
	});
}

function enqueue_work(job_id, chunk_id) {
	assert(!!job_id);
	assert(!!chunk_id);
	client.lpush(k_work_queue(job_id), chunk_id);
}

// TODO: Destroy job function.

function enqueue_result(job_id, chunk_id, result) {
	assert(!!job_id);
	assert(!!chunk_id);
	assert(!!result);
	var groupByComplete = function(groupByData) {
		// Reset the 'in' count and 'out' count.
		var newInCount = Object.keys(groupByData).length;
		client.set(k_in_count(job_id), newInCount);
		client.set(k_out_count(job_id), 0);
		
		client.get(k_replication_factor(job_id), function(err, replication_factor) {
			// Set up the k_input, work_queue and phase, to reflect the transition to "Reduce" stage.
 			for (var key in groupByData) {
				console.log("key in groupByData " + key);
				var chunk = {'k': key, 'v': groupByData[key]};
				var f = function(k) {
					client.hset(k_input(job_id), k, JSON.stringify(chunk), function(err) {
						for (var i = 0; i < replication_factor; i++) {
							console.log("Adding to work queue " + k + "for reduce stage.");
							client.lpush(k_work_queue(job_id), k);
						}
					});
				};
				f(key);
			}
			client.set(k_phase(job_id), "Reduce");
		});
	};
	
	var mapComplete = function() {
		client.hkeys(k_input(job_id), function(err, chunk_ids) {
			client.del(k_input(job_id)); // Reset the input.
			
			// Do the group by phase of the shuffle operation in memory.
			var groupByData = {};
			var outputProcessedCount = 0;
			
			chunk_ids.forEach(function(chunk_id) {
				client.lpop(k_output(job_id, chunk_id), function(err, response) {
					client.del(k_output(job_id, chunk_id));
					var keyValueArray = JSON.parse(response);
					
					keyValueArray.forEach(function(keyValuePair) {
						var key = keyValuePair['k'];
						if (!(key in groupByData)) {
							groupByData[key] = [];
						}
						groupByData[key].push(keyValuePair['v']);
					});
					
					if (++outputProcessedCount == chunk_ids.length) {
						groupByComplete(groupByData);
					}
				});
			});
		});
	};
	
	var jobFinished = function() {
		// Cleanup.
		console.log("JOB FINISHED. PERFORMING CLEANUP.")
		client.srem(k_runnable(), job_id);
		client.set(k_phase(job_id), "Finished");
		client.del(k_in_count(job_id));
		client.del(k_out_count(job_id));
		client.del(k_input(job_id));
		client.del(k_work_queue(job_id));
		client.del(k_replication_factor(job_id));
	}
	
	var reduceComplete = function() {
		client.hkeys(k_input(job_id), function(err, chunk_ids) {
			var outputProcessedCount = 0;
			chunk_ids.forEach(function(chunk_id) {
				client.lpop(k_output(job_id, chunk_id), function(err, response) {	
					client.del(k_output(job_id, chunk_id));
					
					var keyValueArray = JSON.parse(response);
					keyValueArray.forEach(function(keyValuePair) {
						client.lpush(k_final_output(job_id), JSON.stringify(keyValuePair));
					});
				});
				
				if (++outputProcessedCount == chunk_ids.length) {
					jobFinished();
				}
			});
		});
	};
	
	var phaseComplete = function() {
		console.log("PHASE COMPLETE");
		
		client.get(k_phase(job_id), function(err, phase) {
			if (phase == "Map") {
				mapComplete();
			} else if (phase == "Reduce") {
				reduceComplete();
			} else {
				console.error("BAD PHASE");
				assert(false);
			}
		});
	};

	var responsesValidated = function() {
		client.incr(k_out_count(job_id), function(err, updated_out_count) {
			client.get(k_in_count(job_id), function(err, in_count) {
				if (updated_out_count == in_count) {
					phaseComplete();
				}
			});
		});
	};
	
	var conflictingResponses = function() {
		console.log("Conflicting responses came back from clients.");
		console.log("Conflicting response for chunk " + chunk_id);
		client.del(k_output(job_id, chunk_id)); // Reset the output.
		
		client.get(k_replication_factor(job_id), function(err, replication_factor) {
			for (var i = 0; i < replication_factor; i++) {
				enqueue_work(job_id, chunk_id); // Re-add the chunks to the work queue.
			}
		});
	};

	var checkResponses = function() {
		client.lrange(k_output(job_id, chunk_id), 0, -1, function(err, responses) {
			assert(responses.length);
			var first_response = JSON.parse(responses[0]);
			for (var i = 1; i < responses.length; i++) {
				if (!_.isEqual(first_response, JSON.parse(responses[i]))) {
					conflictingResponses();
					return;
				}
			}
			responsesValidated();
		});	
	};
	
	client.get(k_replication_factor(job_id), function(err, replication_factor) {
		client.lpush(k_output(job_id, chunk_id), JSON.stringify(result), function(err, len) {
			if (len == replication_factor) {
				// We can now ensure all the responses received for this chunk are identical.
				checkResponses();
			}
		});
	});
}

function jobs_available(callback){
    client.scard(k_runnable(), function(err, card){
        callback(err, card > 0);
    });
}

// Public API export.
exports.new_job = new_job;
exports.dequeue_work = dequeue_work;
exports.enqueue_work = enqueue_work;
exports.client = client;
exports.fetch_job = fetch_job;
exports.enqueue_result = enqueue_result;
exports.new_user = new_user;
exports.user_password_correct = user_password_correct;
exports.get_user_jobs = get_user_jobs;
exports.results = results;
exports.phase = phase;
exports.blurb = blurb;
exports.completion_status_for_current_phase = completion_status_for_current_phase;
exports.jobs_available = jobs_available;
