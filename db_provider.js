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
	creator : ObjectId, // Foreign key pointing to User collection.
	map : String, // Filename for the map function.
	reduce : String, // Filename for the reduce function.
	input_data : [ ObjectId ], // List of foreign keys pointing to the WorkUnit collection.
	intermediate_data : [ ObjectId ],
	sorted_intermediate_data : [ ObjectId ],
	output_data : [ ObjectId ],
	worker_count : Number, // The number of workers actively mapping/reducing for this job.
	active : Boolean // A job is active from the time it is created until when it finishes.
})

var WorkUnit = new Schema({
	job_id : ObjectId, // Foreign key pointing to the job this work unit is a part of.
	data : String // The actual data to ship to a worker node.
});

// Mongoose doesn't support findAndModify natively.
Job.statics.findAndModify = function (query, sort, doc, options, callback) {
  return this.collection.findAndModify(query, sort, doc, options, callback);
};

// Register the schemas with Mongoose.
User = mongoose.model('User', User);
Job = mongoose.model('Job', Job);

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
 * Dequeue a unit of work from the job's input_data
 * queue. The job_id specified should be the ObjectId
 * of the job object in the database. Upon success,
 * the callback will be invoked with the unit of work
 * dequeued. Callback should be of the form
 * function (err, work_unit). If the work_unit provided
 * to the callback is null and there is no error, the
 * caller can assume this job has no pending map work units.
 */
function dequeue_map_work(job_id, callback) {
	Job.findAndModify({ 'job_id':job_id }, [], { $pop: { input_data : -1 } }, { new: false }, function(err, job) {
		if (err) { console.warn(err.message); return; }
		if (!job) { console.warn("No job found."); return; }
		
		var work_unit = null;
		if (job.input_data.length) {
			work_unit = job.input_data[0];
		}
		callback(null, work_unit);
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

//function add_new_job(...)
// { $set : { field : value } }
// { $set : { job_id : str(job._id) }}

// Now export the schemas publicly so other modules
// can perform actions such as User.findOne(...)
exports.User = User;
exports.Job = Job;

// And export the public API.
exports.add_new_user = add_new_user;
exports.dequeue_map_work = dequeue_map_work;
exports.all_active_jobs = all_active_jobs;

