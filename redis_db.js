var uuid = require('node-uuid');
var _ = require('underscore');
var assert = require('assert').ok;
var redis = require("redis"),
    client = redis.createClient();

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

// TODO: Cache job original input.

// Input_data: Array [{ "k":k, "v":v }]
// Callback: function(err, job_id)
function new_job(input_data, replication_factor, map_code, reduce_code, callback) {	
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
	client.sadd(k_runnable(), job_id);
	callback(null, job_id);
}

// Callback: function(err, job_id)
function fetch_job(callback) {
	client.srandmember(k_runnable(), callback);
}

// Callback should be function (err, job_id, chunk_id, chunk, map/reduce_code).
function dequeue_work(callback) {
	
	var getPhaseSpecificCode = function(job_id, chunk_id, chunk) {
		client.get(k_phase(job_id), function(err, phase) {
			if (phase == "Map") {
				client.get(k_map_code(job_id), function(err, map_code) {
					callback(err, job_id, chunk_id, chunk, map_code);
				});
			} else if (phase == "Reduce") {
				client.get(k_reduce_code(job_id), function(err, reduce_code) {
					callback(err, job_id, chunk_id, chunk, reduce_code);
				});
			} else {
				console.err("Incorrect phase.");
				assert(false);
			}
		});
	};
	
	fetch_job(function(err, job_id) {
		client.lpop(k_work_queue(job_id), function(err, chunk_id) {
			client.hget(k_input(job_id), chunk_id, function(err, chunk) {
				getPhaseSpecificCode(job_id, chunk_id, JSON.parse(chunk));
			});
		});
	});
}

function enqueue_work(job_id, chunk_id) {
	client.lpush(k_work_queue(job_id), chunk_id);
}

// TODO: Destroy job function.

function enqueue_result(job_id, chunk_id, result, callback) {
	
	var groupByComplete = function(groupByData) {
		// Reset the 'in' count and 'out' count.
		var newInCount = Object.keys(groupByData).length;
		client.set(k_in_count(job_id), newInCount);
		client.set(k_out_count(job_id), 0);
		
		// Set up the k_input, work_queue and phase, to reflect the transition to "Reduce" stage.
 		for (var key in groupByData) {
			console.log("key in groupByData " + key);
			var chunk = {'k': key, 'v': groupByData[key]};
			client.hset(k_input(job_id), key, JSON.stringify(chunk), function(err) {
				client.get(k_replication_factor(job_id), function(err, replication_factor) {
					for (var i = 0; i < replication_factor; i++) {
						client.lpush(k_work_queue(job_id), key);
					}
				});
			});

			client.set(k_phase(job_id), "Reduce");
		}
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
					client.lpush(k_final_output(job_id), response);
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
				console.err("BAD PHASE");
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

	var checkResponses = function() {
		client.lrange(k_output(job_id, chunk_id), 0, -1, function(err, responses) {
			assert(responses.length);
			var first_response = JSON.parse(responses[0]);
			for (var i = 1; i < responses.length; i++) {
				if (!_.isEqual(first_response, JSON.parse(responses[i]))) {
					console.log("Conflicting responses came back from clients.");
					assert(false); // TODO: Handle.
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

// Public API export.
exports.new_job = new_job;
exports.dequeue_work = dequeue_work;
exports.client = client;
exports.fetch_job = fetch_job;
exports.enqueue_result = enqueue_result;
