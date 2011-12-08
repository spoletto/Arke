/* 
 * db_provider.js.
 * Provides an API for interacting with the mongo database.
 * The mongod must be running in order for the db_provider
 * to be able to connect.
 *
 * Author: Stephen Poletto
 * Date: 12-01-2011
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var db = mongoose.connect('mongodb://localhost/solvejs');
var check = require('validator').check;
var bcrypt = require('bcrypt');

var User = new Schema({
	email_address : { type: String, unique: true },
	password : String,
	jobs : [ ObjectId ] // Foreign key pointing to Jobs collection.
});

var Job = new Schema({
	replication_factor : Number, 
	job_id : String, // This is a string version of the job's ObjectId.
	phase : String, // ["Map", "Shuffle", "Reduce", "Finished"]
	creator : String, // Email address of the user who created the job.
	map : String, // Filename for the map function.
	reduce : String, // Filename for the reduce function.
	input_data : [ ObjectId ], // List of foreign keys pointing to the WorkUnit collection.
	map_data : [ ObjectId ], // A mutable copy of the input_data, from which we dequeue work units.
	reduce_data : [ ObjectId ],
	output_data : [ String ],
	initial_input_data_count : Number, // The number of WorkUnits in the input_data to begin.
	validated_intermediate_result_count : Number,
	reduce_data_count : Number,
	worker_count : Number, // The number of workers actively mapping/reducing for this job.
	active : Boolean // A job is active whenever it is in the "Map" or "Reduce" phase.
})

var WorkUnit = new Schema({
	data : String // The actual data to ship to a worker node.
});

// Mongoose doesn't support findAndModify natively.
Job.statics.findAndModify = function (query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};

// Register the schemas with Mongoose.
User = mongoose.model('User', User);
Job = mongoose.model('Job', Job);
WorkUnit = mongoose.model('WorkUnit', WorkUnit);

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

/*
 * Returns true if every element in the array provided
 * is equivalent using 'deepEquals'. The elements inside
 * my_array must also be arrays.
 */
function equivalent_arrays_in_array(my_array) {
	if (my_array.length == 1 || my_array.length == 0) {
		return true;
	}
	for (var i = 1; i < my_array.length; i++) {
		if (my_array[i].length != my_array[i-1].length) {
			return false;
		}
		for (var j = 0; j < my_array[i].length; j++) {
			if (!deepEquals(my_array[i][j], my_array[i-1][j])) {
				return false;
			}
		}
  }
  return true;
}

/*
 * Returns true if every element in the array provided
 * is equivalent using 'deepEquals'.
 */
function equivalent_objects_in_array(my_array) {
	if (my_array.length == 1 || my_array.length == 0) {
		return true;
	}
	for (var i = 1; i < my_array.length; i++) {
		if (!deepEquals(my_array[i], my_array[i-1])) {
			return false;
		}
	}
	return true;
}

// Database-layer API functions.

/* 
 * Adds a new user with the provided email address and password to the
 * database. The password will be salted and hashed. Callback
 * provided should be of the form function (err).
 *
 */
function add_new_user(email_address, password, callback) {
	// Sanity check the data.
	check(password).notEmpty();
	check(email_address).notEmpty();
	check(email_address).isEmail();
	
	// Hash the password using a salt.
	bcrypt.gen_salt(10, function(err, salt) {
	    bcrypt.encrypt(password, salt, function(err, hash) {
			var new_user = new User();
			new_user.email_address = email_address;
			new_user.password = hash;
			new_user.jobs = [];
			new_user.save(callback);
	    });
	});
}

/*
 * Create a new job object with the parameters specified. The
 * input_data should be an array of key-value pairs suitable for
 * shipping to worker nodes. Callback should be of the form: function (err, job).
 * The callback provides the newly created job object to the caller.
 */
function add_new_job(creator_email_address, map, reduce, input_data, replication_factor, callback) {
	// Ensure the specified user exists.
	User.findOne({
		email_address:creator_email_address
	}, function(err, user) {
		if (err) { console.warn("Database error!"); return; }
		if (!user) { console.warn("No such user!"); return; }
		add_job_to_user(user);
	});
	
	function add_job_to_user(user) {
		var new_job = new Job();
		new_job.phase = "Map";
		new_job.job_id = new_job._id.toString();
		new_job.creator = creator_email_address;
		new_job.map = map;
		new_job.reduce = reduce;
		new_job.active = true;
		new_job.worker_count = 0;
		new_job.replication_factor = replication_factor;
		new_job.reduce_data = [];

		// Create a new WorkUnit object for each entry in the input_data array.
		map_tasks = []
		initial_data_count = 0;
		input_data.forEach(function(item) {
			var new_work_unit = new WorkUnit();
			new_work_unit.data = item;
			new_work_unit.save();
			initial_data_count++;
			for (var i = 0; i < replication_factor; i++) {
				map_tasks.push(new_work_unit._id);
			}
		})
		new_job.initial_input_data_count = initial_data_count;
		new_job.input_data = map_tasks;
		new_job.map_data = map_tasks;
		new_job.save(function(err) {
			user.jobs.push(new_job._id);
			user.save(function(err) {
				callback(null, new_job);
			});
		});
	}
}

/*
 * Dequeue a unit of work from the job's map_data
 * queue. The job_id specified should be the ObjectId
 * of the job object in the database. Upon success,
 * the callback will be invoked with the unit of work
 * dequeued. Callback should be of the form
 * function (err, work_unit). If the work_unit provided
 * to the callback is null and there is no error, the
 * caller can assume this job has no pending map work units.
 */
function dequeue_map_work(job_id, callback) {
	Job.findAndModify({ 'job_id':job_id.toString() }, [], { $pop: { map_data : -1 } }, { new: false }, function(err, job) {
		if (err) { console.warn(err.message); return; }
		if (!job) { console.warn("No job found."); return; }
		if (!job.map_data.length) { callback(null, null); return; }
		
		var work_unit_id = job.map_data[0];
		WorkUnit.findOne({
			_id:work_unit_id
		}, callback);
	});
}

/*
 * Enqueue a unit of work back into the job's map_data queue.
 * This is useful when a client disconnects, for instance.
 */
function enqueue_map_work(job_id, work_unit_id) {
	Job.update({ 'job_id':job_id.toString() }, { $push: { map_data : work_unit_id } }, {}, function(err) {
		// TODO: Handle error.
	});
}

/*
 * Same as dequeue_map_work, but for the reduce phase of operation.
 */
function dequeue_reduce_work(job_id, callback) {
	Job.findAndModify({ 'job_id':job_id.toString() }, [], { $pop: { intermediate_keys : -1 } }, { new: false }, function(err, job) {
		if (err) { console.warn(err.message); return; }
		if (!job) { console.warn("No job found."); return; }
		if (!job.intermediate_keys.length) { callback(null, null); return; }
	
		var work_key = job.intermediate_keys[0];
		var value = job.validated_intermediate_result[work_key];
		var response = {};
		response['_id'] = work_key;
		response['data'] = {
			'key' : work_key,
			'values' : value
		}
		callback(null, response);
	});
}

/*
 * Enqueue a unit of work back into the job's reduce data queue.
 * This is useful when a client disconnects, for instance.
 */
function enqueue_reduce_work(job_id, work_unit_id) {
	Job.update({ 'job_id':job_id.toString() }, { $push: { reduce_data : work_unit_id } }, {}, function(err) {
		// TODO: Handle error.
	});
}

/*
 * Enqueue a key-value pair as an intermediate result from the map
 * phase of operation. This function will keep track of the response
 * received on a per-work-unit-ID basis. When it has received replication_factor
 * number of responses, it will check to make sure all of the responses received
 * for a single work-unit are equivalent. If they are, it consolidates the
 * responses into a single key-value pair and adds it to validated_intermediate_results.
 * The validated_intermediate_results dictionary groups validated responses by key
 * so that once all the map data chunks have been processed, we can switch into
 * the reduce phase without an expensive in-memory shuffle phase.
 *
 * The callback is invoked when the transition from Map phase to Reduce phase is
 * complete. The callback should be of the form: function().
 */
function enqueue_intermediate_result(job_id, work_unit_id, result, callback) {
	var work_unit_bucket = "map_intermediate_data." + work_unit_id.toString();	
	var update_options = {};
	var push_options = {};
	push_options[work_unit_bucket] = result;
	update_options['$push'] = push_options;
	
	Job.findAndModify({ 'job_id':job_id.toString() }, [], update_options, { new: true }, function(err, job) {
		if (err) { console.warn(err); return; }
		if (job.replication_factor == job.map_intermediate_data[work_unit_id.toString()].length) {
			// We've now received 'replication_factor' number of responses for the same work unit.
			if (equivalent_arrays_in_array(job.map_intermediate_data[work_unit_id.toString()])) {
				var responseArray = job.map_intermediate_data[work_unit_id.toString()][0];
				responseArray.forEach(function(response) {
					for (var key in response) {
						if (response.hasOwnProperty(key)) {
							var response_bucket = "validated_intermediate_result." + key;
							var new_update_options = {};
							var new_push_options = {};
							var duplicated_key_set = [];
							for (var j = 0; j < job.replication_factor; j++) {
								duplicated_key_set.push(key);
							}
							new_push_all_options = {};
							new_push_all_options['intermediate_keys'] = duplicated_key_set;
							new_push_options[response_bucket] = response[key];
							new_update_options['$push'] = new_push_options;
							new_update_options['$inc'] = { validated_intermediate_result_count : 1 };
							new_update_options['$pushAll'] = new_push_all_options;
							Job.findAndModify( { 'job_id':job_id.toString() }, [], new_update_options, { new: true }, function(err, newJob) {
								if (newJob.initial_input_data_count == newJob.validated_intermediate_result_count) {
									// Map phase is finished! We've received responses for every original data chunk.
									Job.update( { 'job_id':job_id.toString() }, { $set : { reduce_data_count:(newJob.intermediate_keys.length/job.replication_factor), phase: "Reduce" } }, {}, function(err) {
										if (err) { console.warn(err); return; }
										callback();
									});
								}
							});
						}
					}
				});
			} else {
				// We received conflicting responses for this work unit.
				// TODO: Handle.
				console.log("Conflicting responses!");
			}
		}
	});
}

/*
 * Same as enqueue_intermediate_result, but for the reduce phase of operation.
 * The callback is invoked when the job is completed. The callback is of the form: function().
 */
function enqueue_final_result(job_id, key, result, callback) {
	var work_unit_bucket = "reduce_intermediate_data." + key;
	var update_options = {};
	var push_options = {};
	push_options[work_unit_bucket] = result;
	update_options['$push'] = push_options;
	
	Job.findAndModify({ 'job_id':job_id.toString() }, [], update_options, { new: true }, function(err, job) {
		if (err) { console.warn(err); return; }
		if (job.replication_factor == job.reduce_intermediate_data[key].length) {
			// We've now received 'replication_factor' number of responses for the same work unit.
			if (equivalent_objects_in_array(job.reduce_intermediate_data[key])) {
				var response = job.reduce_intermediate_data[key][0];
				
				// Add the validated response to the output_data array. Then check to see if we're finished with the job.
				Job.findAndModify( { 'job_id':job_id.toString() }, [], { $push: { output_data : response } }, { new: true }, function(err, updatedJob) {
					if (err) { console.warn(err); return; }
					if (updatedJob.output_data.length == updatedJob.reduce_data_count) {
						Job.update( { 'job_id':job_id.toString() }, { $set : { phase: "Finished", active: false } }, {}, function(err) {
							if (err) { console.warn(err); return; }
							callback();
						});
					}
				});
			} else {
				// We received conflicting responses for this work unit.
				// TODO: Handle.
				console.log("Conflicting responses!");
			}
		}
	});
}	

/*
 * Returns all currently active jobs via the callback.
 * Callback is of the form function(err, jobs) where 'jobs'
 * is an array.
 */
function all_active_jobs(callback) {
	Job.find( { 'active' : true }, callback);
}

/* XXX pass err to callback? */
function is_job_active(jobid, callback){
    Jobs.find( {'job_id' : jobid }, function(err, job){
        if(err) { console.warn(err); return; }
        if(!job) { callback(false); }
        callback(job.active);
    });
}


// Now export the schemas publicly so other modules
// can perform actions such as User.findOne(...)
exports.User = User;
exports.Job = Job;
exports.WorkUnit = WorkUnit;

// And export the public API.
exports.add_new_user = add_new_user;
exports.dequeue_map_work = dequeue_map_work;
exports.all_active_jobs = all_active_jobs;
exports.add_new_job = add_new_job;
exports.dequeue_reduce_work = dequeue_reduce_work;
exports.enqueue_intermediate_result = enqueue_intermediate_result;
exports.enqueue_final_result = enqueue_final_result;
exports.enqueue_map_work = enqueue_map_work;
exports.enqueue_reduce_work = enqueue_reduce_work;

