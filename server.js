/* 
 * server.js
 *
 * Date: 12-01-2011
 */
var REPLICATION_FACTOR = 1;
var connect = require('connect'),
    express = require('express'),
    http = require('http'),
    util = require('util'),
    formidable = require('formidable'),
	db = require('./redis_db'),
	config = require('./config'),
	form = require('connect-form'),
	fs = require('fs'),
	bcrypt = require('bcrypt'),
    assert = require('assert').ok,
    logging = require('./logging');

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

app.get('/upload', function(req, res) {
	auth_required(req, res, function() {
		fs.readFile(__dirname + '/upload.html', function(error, content) {
			if (error) {
            	res.writeHead(500);
            	res.end();
        	} else {
            	res.writeHead(200, { 'Content-Type': 'text/html' });
            	res.end(content, 'utf-8');
        	}
    	});
	});
});

app.get('/', function(req, res) {
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
	
	db.user_password_correct(email_address, password, function(err, pw_success) {
		if (err == "NOT_EXISTS") {
			res.json({ status: 'bad_email' });
			return;
		} else if (err) {
			res.json({ status: 'error' }, 500);
			return;
		} else if (pw_success) {
			req.session.email_address = email_address;
			res.json({ status: 'login_successful' });
			return;
		} else {
			res.json({ status: 'bad_password' });
			return;
		}
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
	
	db.new_user(email_address, password, function(err) {
		if (err == "EXISTS") {
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
var form = new formidable.IncomingForm();
        var files = {};
        var fields = {};
        var path;

    form.uploadDir = "";

    form
		  .on('field', function(field, value) {
		    	console.log(field, value);
		    	fields[field] = value;
		  })
		  .on('file', function(field, file) {
		    	console.log(field, file);
		    	files[field] = file;
		    	path = file.path;
		  })
		  .on('end', function() {
		    	console.log('-> upload done');
			    if(!fields.mapper){
			    	console.log("No mapper");
			    	res.json({ status: 'missing_mapper' });
			    	res.redirect('/upload');
					return;
			    }else if(!fields.reducer){
			    	console.log("No reducer");
			    	res.json({ status: 'missing_reducer' });
			    	res.redirect('/upload');
					return;
			    }else if(!fields.blurb){
			    	console.log("no blurb");
			    	res.json({ status: 'missing_blurb' });
			    	res.redirect('/upload');
					return;
			    }else{
			        var mapper = ("function(key,value,emit){" + fields.mapper + "}");
			    	var reducer = ("function(key,values,emit){" + fields.reducer + "}");
			       
					fs.readFile(path, 'utf8', function(err, data){
						console.log(data);
				    	if(err) { 
				    		console.log("ERROR: reading file" + path);
				    		res.json({ status: 'invalid_file' });
				    		console.log(data);
				    		throw err;
				    		res.redirect('/upload');
				    		return;
				    	}
				    	try {
				    		var inputJSON = JSON.parse(data);
				    	} catch(e) {
					    	res.json({ status: 'invalid_file' });
							console.log("ERROR READING INPUT JSON:: " + e);
							res.redirect('/upload');
							return;
						}
						console.log(inputJSON.length);
			    		db.new_job(req.session.email_address, inputJSON, REPLICATION_FACTOR, mapper, reducer, fields.blurb, function(err, job_id) {
							console.log("Submitted job with ID = " + job_id);
						});
						res.redirect('/');
			    	});
				}
		  });
    form.parse(req);
    });
/*
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
*/
/* Job status endpoint. Useful for checking the completion progress of a task.
 * RESPONSE: {
 *    phase: ["Finished", "Map", "Reduce"]
 *    blurb: "Job description"
 *    total_task_count: "5089"     // Only present if phase is not "Finished"
 *    completed_task_count: "1009" // Only present if phase is not "Finished"
 * }
 */
app.get('/status/:id', function(req, res) {	
	var job_id = req.params.id;
	
	db.blurb(job_id, function(err, blurb) {
		db.phase(job_id, function(err, phase) {
			if (phase == "Finished") {
				res.json({
					'phase' : 'Finished',
					'blurb' : blurb
				});
				return;
			}
			db.completion_status_for_current_phase(job_id, function(err, in_count, out_count) {
				res.json({
					'blurb' : blurb,
					'phase' : phase,
					'total_task_count' : in_count,
					'completed_task_count' : out_count
				});
			});
		});
	});
});

/* Job results endpoint.
 *
 * If the job is still currently processing:
 * RESPONSE: {
 *    status: "not_finished"
 * }
 * 
 * If the job is indeed finished:
 * RESPONSE: JSON output data.
 */
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

app.listen(8080);

// Websocket goodness...

var nowjs = require("now");
var everyone = nowjs.initialize(app);

everyone.now.logStuff = function(msg){
    console.log(msg);
}

var uuid = require('node-uuid');
var _ = require('underscore');

var TASK_WAIT_TIME = 500;
var LOG = true;
var t_task_total = [];
var t_task_fetch = [];
var t_task_store = [];
everyone.now.getTask = function(retVal){
    var user = this.user;
    var now = this.now;
    var log_id = logging.fetchingTask();
        
    db.dequeue_work(function(err, job_id, chunk_id, chunk, phase, code){
        if(err){
            console.err("Error fetching task!", err);
            return;
        }
        if(!(job_id && chunk_id)){
            db.jobs_available(function(err, available){
                assert(!err);
                if(available){
                    console.log("No task, waiting");
                    setTimeout(function(){
                        /* XXX there's a non-critical error if client has disconnect
                         * when we try to call this */
                        now.getTask(retVal);
                    }, TASK_WAIT_TIME);
                } else {
                    logging.writeTaskLog();
                }
            });
            return;
        }
        logging.fetchedTask(log_id, phase);
		var task = {'job_id': job_id, 'chunk_id': chunk_id, 'phase': phase, 'log_id': log_id};
		
		if (!user.connected) {
			console.log("User disconnected!");
			console.log('Restoring chunk', task.chunk_id, 'of job', task.job_id);
	        db.enqueue_work(task.job_id, task.chunk_id);
		} else {
			user.task = task;
	        retVal(task, code, chunk);
		}
    });
};

everyone.now.completeTask = function(task, data, retVal){
    assert(!!task.job_id && !!task.chunk_id);
    assert(this.user.task.job_id == task.job_id && this.user.task.chunk_id == task.chunk_id);
    logging.storingTask(task.log_id, task.client_log);
    this.user.task = null;
	db.enqueue_result(task.job_id, task.chunk_id, data, function(){
        logging.storedTask(task.log_id);
    });
    retVal("OK");
};

everyone.on('join', function(){
    this.user.task = null;
	this.user.connected = true;
	this.user.uid = uuid.v4();
});

everyone.on('leave', function(){
    console.log('Client disconnected');
	this.user.connected = false;
    if(this.user.task){
        console.log('Restoring chunk', this.user.task.chunk_id, 'of job', this.user.task.job_id);
        db.enqueue_work(this.user.task.job_id, this.user.task.chunk_id);
    }
});
