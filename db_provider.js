/* 
   db_provider.js.
   Provides an API for interacting with the mongo database.
   The mongod must be running in order for the db_provider
   to be able to connect.

   Author: Stephen Poletto
   Date: 12-01-2011
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
var db = mongoose.connect('mongodb://localhost/solvejs');

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
	output_data : [ String ]
})

// Register the schemas with Mongoose.
User = mongoose.model('User', User);
Job = mongoose.model('Job', Job);

// Now export the schemas publicly so other modules
// can perform actions such as User.findOne(...)
exports.User = User;
exports.Job = Job;