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
	creator : ObjectId, // Foreign key pointing to User collection.
	map : String, // Filename for the map function.
	reduce : String, // Filename for the reduce function.
	input_data : [ String ], // List of small json work units.
	intermediate_data : [String ], // List of small json responses.
	sorted_intermediate_data : [ String ],
	output_data : [ String ],
	worker_count : Number // The number of workers actively mapping/reducing for this job.
})

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
	check(pwd).notEmpty();
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

// Now export the schemas publicly so other modules
// can perform actions such as User.findOne(...)
exports.User = User;
exports.Job = Job;

// And export the public API.
exports.add_new_user = add_new_user;

