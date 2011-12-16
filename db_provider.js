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
var _ = require('underscore');
var uuid = require('node-uuid');

var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var schemas = {};

schemas.Datum = new Schema({
    key: {type: String},
    value: {type: String}
});

schemas.Task = new Schema({
    data: [schemas.Datum]
});

schemas.RunningTask = new Schema({
    taskId: {type: String, default:uuid.v4, index: true},
    heartbeat: {type: Date, index:true},
    data: [schemas.Datum]
});

var jobStatuses = ["Map", "Reduce", "Done"];

var Job;
schemas.Job = new Schema({
    jobId: {type: String, default:uuid.v4, index:true},
    status: {type: String, enum:jobStatuses, index:true, default:"Map"},
    jobsAvailable: {type: Boolean, index:true},
    mapper: {type: String},
    mapInput: [schemas.Task],
    mapRunning: [schemas.RunningTask],
    mapOutput: [schemas.Task],

    reducer: {type: String},
    reduceInput: [schemas.Task],
    reduceRunning: [schemas.RunningTask],
    reduceOutput: [schemas.Task]
});

var User;
schemas.User = new Schema({
	email_address : { type: String, unique: true },
	password : String,
	jobs : [ ObjectId ] // Foreign key pointing to Jobs collection.
});

schemas.Job.pre('save', function(next){
    this.jobsAvailable = !!(this.mapInput.length || this.reduceInput.length);
    next();
});

schemas.Job.methods.progress = function(){
    if(this.status == "Done"){
        return 1.0;
    } else if(this.status == "Reduce"){
        return 0.5 + (this.reduceOutput.length / (this.reduceOutput.length + this.reduceInput.length + this.reduceRunning.length)) * 0.5;
    } else {
        return 0.5 * (this.mapOutput.length / (this.mapOutput.length + this.mapInput.length + this.mapRunning.length));
    }
};

schemas.Job.methods.checkMapCompletion = function(){
    if(!(this.mapInput.length || this.mapRunning.length)){
        var output = [];
        _.each(this.mapOutput, function(task){
            _.each(task.data, function(datum){
                output.push({key:datum.key, value:datum.value});
            });
        });
        var data = _.map(_.groupBy(output, 'key'), 
            function(pairs, key){
                return {key: key, value: JSON.stringify(_.map(pairs,function(pair){return JSON.parse(pair.value)}))};
            }
        );
        this.reduceInput = [];
        var blockSize = parseInt(Math.sqrt(data.length)) + 1;
        var index = 0
        while(index < data.length){
            var chunk = data.slice(index, index+blockSize);
            index += blockSize;
            this.reduceInput.push({data: chunk});
        }
        this.mapOutput = [];
        this.status = "Reduce";
    }
};

schemas.Job.methods.checkReduceCompletion = function(){
    if(!(this.reduceInput.length || this.reduceRunning.length)){
        this.status = "Done";
    }
};

schemas.Job.statics.commitResults = function(taskId, data, ret){
    Job.findOne().or([{'mapRunning.taskId': taskId},
                    {'reduceRunning.taskId': taskId}]).run(function(err, job){
        if(err){
            console.error(err);
        } else if(job){
            var hasTaskid = function(task){
                return task.taskId == taskId;
            };
            var result;
            var save = function(){
                job.save(function(err){
                    if(err){
                        console.error(err);
                    } else {
                        ret(job.jobId, job.status, job.progress());
                        //console.log("Saved work result");
                    }
                });
            };
            if(result = _.find(job.mapRunning, hasTaskid)){
                job.mapRunning = _.without(job.mapRunning, result);
                job.mapOutput.push({data: data});
                job.checkMapCompletion();
                save();
            } else if(result = _.find(job.reduceRunning, hasTaskid)){
                job.reduceRunning = _.without(job.reduceRunning, result);
                job.reduceOutput.push({data: data});
                job.checkReduceCompletion();
                save();
            } else {
                console.error("WTF!");
            }
        } else {
            console.error("No task found for id #", taskId, " WTF?");
        }
    });
};

schemas.Job.methods.fetchTask = function(ret){
    var job = this;
    var code;
    var setRunning = function(data, pushTo){
        var newTask = {
            taskId: uuid.v4(),
            heartbeat: new Date(),
            data: data
        };
        pushTo.push(newTask);
        return newTask;
    };
    var save = function(newTask){
        job.save(function(err){
            if(err){
                console.error(err);
            } else {
                ret(newTask, code);
            }
        }); 
    }
    if(this.mapInput.length){
        code = this.mapper;
        var data = this.mapInput[0].data;
        this.mapInput = this.mapInput.slice(1);
        save(setRunning(data, this.mapRunning))
    } else if(this.reduceInput.length){
        code = this.reducer;
        var data = this.reduceInput[0].data;
        this.reduceInput = this.reduceInput.slice(1);
        save(setRunning(data, this.reduceRunning))
    } else {
        console.warn("Can't get any jobs from this guy.");
    }
};

schemas.Job.methods.enqueueTask = function(task) {	
	var hasTaskId = function(testTask){
		return testTask.taskId == task.taskId;
	};
	
	var pushback = function(runningList, inputList) {
		var expired = _.filter(runningList, hasTaskId);
		var remaining = _.reject(runningList, hasTaskId);
		_.each(expired, function(task){
			inputList.push({data: task.data});
		});
		return remaining;
	}
	
	this.mapRunning = pushback(this.mapRunning, this.mapInput);
	this.reduceRunning = pushback(this.reduceRunning, this.reduceInput);
	this.save(function(err){
		if(err){
			console.error(err);
		}
	});
}

schemas.Job.statics.fetchTask = function(ret){
    this.findOne({'jobsAvailable': true}, function(err, job){
        if(err){
            console.error(err);
        } else if(!job){
            //console.log("Couldn't find anything");
            ret(null);
        } else {
            //console.log("Found something");
            job.fetchTask(ret);
        }
    });
};

Job = exports.Job = mongoose.model('Job', schemas.Job);
User = exports.User = mongoose.model('User', schemas.User);

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

function associate_job_with_user(job, email_address) {
	User.findOne({
		email_address:email_address
	}, function(err, user) {
		if (err) { console.warn("Database error!"); return; }
		if (!user) { console.warn("No such user!"); return; }
		user.jobs.append(job._id);
		user.save(function(err){
            if(err){
                console.error(err);
			}
		});
	});
}

// Public API
exports.add_new_user = add_new_user;
exports.associate_job_with_user = associate_job_with_user;
