/* 
 * server.js
 *
 * Date: 12-01-2011
 */

var connect = require('connect'),
    express = require('express'),
	db = require('./redis_db'),
	config = require('./config'),
	form = require('connect-form'),
	fs = require('fs'),
	bcrypt = require('bcrypt'),
    assert = require('assert').ok;

var DUPLICATE_KEY_ERROR_CODE = 11000;
var JOB_UPLOAD_DIRECTORY = __dirname + "/jobs/";
var DEFAULT_REPLICATION_FACTOR = 3;

var app = express.createServer(
	form({ keepExtensions: true })
);
app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
	app.set('view options', {layout: false});
    app.use(express.bodyParser());
    app.use(express.methodOverride());
	app.use(express.cookieParser());
	app.use(express.session({secret : SESSION_COOKIE_SECRET})); 
    app.use(app.router);
    app.use('/client', express.static(__dirname + '/client'));
	app.use('/jobs', express.static(__dirname + '/jobs'));
	app.use('/static', express.static(__dirname + '/static'));
});

app.get('/', function(req, res){
	// Render the test_api screen for testing.
	fs.readFile(__dirname + '/index.html', function(error, content) {
		if (error) {
            res.writeHead(500);
            res.end();
        } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content, 'utf-8');
        }
    });
});

// Session Management
function is_logged_in(req) {
	return req.session != null && req.session.email_address != null;
}

/*
 * Call this to ensure the request is part of a valid
 * session (i.e. the user is logged in). If the user is
 * not logged in, an error JSON message will be sent back. 
 * If the user is logged in, the callback will be invoked.
 */
function auth_required(req, res, callback) {
	if (!is_logged_in(req)) { 
		res.json({ status: 'login_required' });
		return;
	}
	callback();
}

/* User login endpoint.
 * POST DATA: {
 *    email_address: User-specified email address.
 *    password: User-specified password.
 * }
 * RESPONSE: {
 *    status: ["bad_email", "bad_password", "login_successful", "error"]
 * }
 */
app.post('/login', function(req, res) {
	var email_address = req.body.email_address;
	var password = req.body.password;
	
	db.User.findOne({
		email_address:email_address
	}, function(err, user) {
		console.log("GOT HERE");
		if (err) {
			res.json({ status: 'error' }, 500);
			console.log("error");
			return;
		}
		if (!user) {
			res.json({ status: 'bad_email' });
			console.log("bad email");
			return;
		}
		
		// Verify provided password is correct.
		bcrypt.compare(password, user.password, function(err, pw_success) {
			if (pw_success) {
				req.session.email_address = email_address;
				res.json({ status: 'login_successful' });
				console.log("success");
				return;
			} else {
				res.json({ status: 'bad_password' });
				console.log("bad pass");
				return;
			}
		});
	});
});

/* User registration endpoint.
 * POST DATA: {
 *    email_address: User-specified email address.
 *    password: User-specified password.
 * }
 * RESPONSE: {
 *    status: ["email_taken", "registration_successful", "error"]
 * }
 */
app.post('/register', function(req, res) {
	var email_address = req.body.email_address;
	var password = req.body.password;
	
	db.add_new_user(email_address, password, function(err) {
		if (err && err.code == DUPLICATE_KEY_ERROR_CODE) {
			res.json({ status: 'email_taken' });
			return;
		} else if (err) {
			res.json({ status: 'error' }, 500);
			return;
		}
		
		// New user was successfully saved to the database.
		// Record the email address in the session object.
		req.session.email_address = email_address;
		res.json({ status : 'registration_successful' });
		return;
	});
});

/* Job submission endpoint.
 * POST DATA: {
 *    jobFile: The javascript file containing the user's map/reduce implementation.
 *    jsonFile: The user-provided dataset.
 * }
 * RESPONSE: {
 *    status: ["error", "JSON_parse_error", "upload_succesful"]
 *    job_id: The job_id of the newly created job if the upload was successful.
 * }
 */
app.post('/upload_job', function(req, res, next) {
    auth_required(req, res, function() {
       req.form.complete(function(err, fields, files){
         if (err) {
           next(err);
         } else {
           console.log("File Uploaded Successfully");
           console.log(files);
           console.log(fields);
           fs.readFile(files.upload.path, 'ascii', function (err, filetext) {
             if (err){
                 console.error(err);
             }
             var job = new db.Job();
             job.reducer = ("function(key,values,emit){" + fields.reduce + "}");
             job.mapper = ("function(key,value,emit){" + fields.map + "}");
             var json = JSON.parse(filetext);
             job.mapInput = _.map(json, function(pair){
                 return {data:[{key: JSON.stringify(pair.k), value:JSON.stringify(pair.v)}]}
             });
             job.save(function(err){
                 if(err){
                     console.error(err);
                 } else {
                     console.log("Submitted JOB!");
                     db.associate_job_with_user(job, req.session.email_address, function(err){
            		 	if(err){
		                	console.error(err);
						} else {
							res.json({ status : 'upload_successful', job_id: job.job_id });
						}
					});
                 }
             });
           });
         }
         res.redirect('/');
       });
    });
});

app.get('/info/:jobid', function(req, res) {
    /* TODO return some info to a worker about a job*/
});

app.get('/status/:jobid', function(req, res) {
    /* TODO return lots of info to a job owner about a job*/
});

app.get('/results/:id', function(req,res){
	var job_id = req.params.id;
	db.phase(job_id, function(err, phase) {
		if (phase != "Finished") {
			res.json({ status : 'not_finished' });
		}
		db.results(job_id, function(err, results) {
			res.json(results);
		});
	});
});

app.listen(80);

// Websocket goodness...

var nowjs = require("now");
var everyone = nowjs.initialize(app);

everyone.now.logStuff = function(msg){
    console.log(msg);
}

var uuid = require('node-uuid');
var _ = require('underscore');

var TASK_WAIT_TIME = 10000;
/* TODO XXX reenqueue task if client disconnected while we fetched task */
everyone.now.getTask = function(retVal){
	console.log("Getting task.");
    var user = this.user;
    db.dequeue_work(function(err, job_id, chunk_id, chunk, code){
        if(err){
            console.err("Error fetching task!", err);
            return;
        }
        if(!(job_id && chunk_id)){
            /* probably fetch again, maybe after a wait */
            console.log("No task, waiting");
            setTimeout(function(){ everyone.now.getTask(retVal); }, TASK_WAIT_TIME);
            return;
        }
		console.log("Task fetched.");
        var task = {'job_id': job_id, 'chunk_id': chunk_id};
        user.tasks.push(task);
        retVal(task, code, chunk);
    });
};

everyone.now.completeTask = function(task, data, retVal){
	console.log("Completed task.");
    assert(!!task.job_id && !!task.chunk_id);
	console.log("User tasks before reject");
	console.dir(this.user.tasks);
    this.user.tasks = _.reject(this.user.tasks, function(t) {
		return t.job_id == task.job_id && t.chunk_id == task.chunk_id;
	});
	console.log("User tasks after reject");
	console.dir(this.user.tasks);    
	db.enqueue_result(task.job_id, task.chunk_id, data);
    retVal("OK");
};

everyone.on('join', function(){
    this.user.tasks = [];
});

everyone.on('leave', function(){
    console.log('Client disconnected');
    _.each(this.user.tasks, function(task){
        console.log('Restoring chunk', task.chunk_id, 'of job', task.job_id);
        db.enqueue_work(task.job_id, task.chunk_id);
    });
});
