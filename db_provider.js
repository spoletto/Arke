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
	login : { type: String, unique: true },
	password : String,
	jobs : [ ObjectId ] // Foreign key pointing to Jobs collection.
});

var Job = new Schema({
	job_id : String, // This is a string version of the job's ObjectId.
	phase : String, // ["Map", "Shuffle", "Reduce", "Finished"]
	creator : String, // Login of the user who created the job.
	map : String, // Filename for the map function.
	reduce : String, // Filename for the reduce function.
	input_data : [ ObjectId ], // List of foreign keys pointing to the WorkUnit collection.
	map_data : [ ObjectId ], // A mutable copy of the input_data, from which we dequeue work units.
	initial_input_data_count : Number, // The number of WorkUnits in the input_data to begin.
	intermediate_data : [ {
		work_unit_id : String,
		result : String
	} ],
	intermediate_data_count : Number, // The number of responses added into the intermediate_data array.
	sorted_intermediate_data : [ ObjectId ],
	reduce_data_count : Number,
	output_data : [ {
		work_unit_id : String,
		result : String
	} ],
	output_data_count : Number,
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

// Database-layer API functions.

/* 
 * Adds a new user with the provided login and password to the
 * database. The password will be salted and hashed. Callback
 * provided should be of the form function (err).
 *
 */
function add_new_user(login, password, callback) {
	// Sanity check the data.
	check(password).notEmpty();
	check(login).notEmpty();
	
	// Hash the password using a salt.
	bcrypt.gen_salt(10, function(err, salt) {
	    bcrypt.encrypt(password, salt, function(err, hash) {
			var new_user = new User();
			new_user.login = login;
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
function add_new_job(creator_login, map, reduce, input_data, replication_factor, callback) {
	// Ensure the specified user exists.
	User.findOne({
		login:creator_login
	}, function(err, user) {
		if (err) { console.warn("Database error!"); return; }
		if (!user) { console.warn("No such user!"); return; }
		add_job_to_user(user);
	});
	
	function add_job_to_user(user) {
		var new_job = new Job();
		new_job.phase = "Map";
		new_job.job_id = new_job._id.toString();
		new_job.creator = creator_login;
		new_job.map = map;
		new_job.reduce = reduce;
		new_job.active = true;
		new_job.intermediate_data = [];
		new_job.intermediate_data_count = 0;
		new_job.sorted_intermediate_data = [];
		new_job.output_data = [];
		new_job.worker_count = 0;

		// Create a new WorkUnit object for each entry in the input_data array.
		map_tasks = []
		input_data.forEach(function(item) {
			var new_work_unit = new WorkUnit();
			new_work_unit.data = item;
			new_work_unit.save();
			for (var i = 0; i < replication_factor; i++) {
				map_tasks.push(new_work_unit._id);
			}
		})
		new_job.initial_input_data_count = map_tasks.length;
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
 * Same as dequeue_map_work, but for the reduce phase of operation.
 */
function dequeue_reduce_work(job_id, callback) {
	Job.findAndModify({ 'job_id':job_id.toString() }, [], { $pop: { sorted_intermediate_data : -1 } }, { new: false }, function(err, job) {
		if (err) { console.warn(err.message); return; }
		if (!job) { console.warn("No job found."); return; }
		if (!job.sorted_intermediate_data.length) { callback(null, null); return; }
		
		var work_unit_id = job.sorted_intermediate_data[0];
		WorkUnit.findOne({
			_id:work_unit_id
		}, callback);
	});
}

/*
 * Enqueue a key-value pair as an intermediate result from the map
 * phase of operation. Callback should be of the form function (job_id, intermediate_data_array).
 * The job's phase will be set to "Shuffle" and its active flag set to false before the
 * callback is invoked.
 */
function enqueue_intermediate_result(job_id, work_unit_id, result, callback) {
	var intermediate_result = {
		"work_unit_id" : work_unit_id.toString(),
		"result" : result
	};
	Job.findAndModify({ 'job_id':job_id.toString() }, [], { $push: { intermediate_data: intermediate_result }, $inc : { intermediate_data_count: 1 } }, { new: true }, function(err, job) {
		if (job.initial_input_data_count == job.intermediate_data_count) {
			// Actually grab the live job object rather than a static snapshot.
			Job.findOne({ 'job_id':job_id.toString() }, function(err, realJob) {
				realJob.phase = "Shuffle";
				realJob.active = false;
				realJob.save(function(err) {
					callback(job_id, job.intermediate_data);
				});
			});
		}
	});
}

/*
 * Same as enqueue_intermediate_result, but for the reduce phase of operation.
 * Callback should be of the form function (job_id, final_output_data_array).
 * The job's phase will be set to "Finished" and its active flag set to false before the
 * callback is invoked.
 */
function enqueue_final_result(job_id, work_unit_id, result, callback) {
	var final_result = {
		"work_unit_id" : work_unit_id.toString(),
		"result" : result
	};
	Job.findAndModify({ 'job_id':job_id.toString() }, [], { $push: { output_data: final_result }, $inc : { output_data_count: 1 } }, { new: true }, function(err, job) {
		if (job.reduce_data_count == job.output_data_count) {
			// Actually grab the live job object rather than a static snapshot.
			Job.findOne({ 'job_id':job_id.toString() }, function(err, realJob) {
				realJob.phase = "Finished";
				realJob.active = false;
				realJob.save(function(err) {
					callback(job_id, job.output_data);
				});
			});
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

