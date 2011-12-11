/* 
 * server.js
 *
 * Date: 12-01-2011
 */

var connect = require('connect'),
    express = require('express'),
	db = require('./db_provider'),
	config = require('./config'),
	form = require('connect-form'),
	fs = require('fs'),
	bcrypt = require('bcrypt'),
    assert = require('assert').ok;

var DUPLICATE_KEY_ERROR_CODE = 11000;
var JOB_UPLOAD_DIRECTORY = "jobs/";
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
});

app.get('/', function(req, res){
	// Render the test_api screen for testing.
	fs.readFile('views/test_api.html', function(error, content) {
	        if (error) {
	            res.writeHead(500);
	            res.end();
	        }
	        else {
	            res.writeHead(200, { 'Content-Type': 'text/html' });
	            res.end(content, 'utf-8');
	        }
	    });
});
app.get('/register', function(req, res) {
	res.render('register.jade');
})
app.get('/monitor', function(req, res){
    res.render('monitor.jade');
});
app.get('/work', function(req, res){
    res.render('work.jade');
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
		if (err) {
			res.json({ status: 'error' }, 500);
			return;
		}
		if (!user) {
			res.json({ status: 'bad_email' });
			return;
		}
		
		// Verify provided password is correct.
		bcrypt.compare(password, user.password, function(err, pw_success) {
			if (pw_success) {
				req.session.email_address = email_address;
				res.json({ status: 'login_successful' });
				return;
			} else {
				res.json({ status: 'bad_password' });
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
app.post('/upload_job', function(req, res) {
	auth_required(req, res, function() {
		req.form.complete(function(err, fields, files) {
			if (err) {
				console.warn(err);
				res.json({ status : 'error' }, 500);
				return;
			} else {
				var jsonData = null;
				try {
					// Is there a better way to validate the JSON?
					jsonData = JSON.parse(fs.readFileSync(files.jsonFile.path, 'utf8'));
				} catch(e) {
					// Error parsing the user provided JSON file.
					res.json({ status:'JSON_parse_error' });
					return; 
				}				
				db.add_new_job(req.session.email_address, jsonData, DEFAULT_REPLICATION_FACTOR, function(err, job) {
					fs.renameSync(files.jobFile.path, JOB_UPLOAD_DIRECTORY + job.job_id + '.js');
					res.json({ status : 'upload_successful', job_id: job.job_id });
				});
			}
		});
	});
});

app.listen(8000);

var io = require('socket.io').listen(app);

var GLOBAL_GENERATION = 0;

var MAX_TASKS_PER_WORKER = 4;
/* how the fuck do i determine a decent value for this */
var MAX_CHUNKS_PER_TASK = 2;

io.sockets.on('connection', function (socket) {
    console.log(socket.id, 'connected');
    var tasks = {};

    socket.on('disconnect', function(){
        console.log(socket.id, 'disconnected');
        for(jobid in tasks){
            var enqueue;
            if(tasks.phase == "Map"){
                enqueue = db.enqueue_map_work;
            } else {
                enqueue = db.enqueue_reduce_work;
            }
            for(chunkid in tasks[jobid]){
                enqueue(jobid, chunkid);
            }
        }
    });

    socket.on('getTasks', getTasks);

    socket.on('emit', function(data){
        console.log(socket.id, 'emitted kv for chunk', data.chunkid, 'of task', data.jobid);
        //console.dir(data);
        /* this entry's existence should be asserted to some extent */
        var d = {};
        d[data.key] = data.value;
        tasks[data.jobid].chunks[data.chunkid].push(d);
    });

    socket.on('done', function(data){
        console.log(socket.id, 'finished chunk', data.chunkid, 'of task', data.jobid);
        /* todo: data validity and this entry's existence should be asserted to some extent */
        /* assert task is in that phase */
        if(data.phase == "Map"){
            db.enqueue_intermediate_result(data.jobid, data.chunkid, tasks[data.jobid].chunks[data.chunkid]);
        } else if(data.phase == "Reduce"){ 
            console.dir(tasks[data.jobid].chunks[data.chunkid]);
            db.enqueue_final_result(data.jobid, data.chunkid, tasks[data.jobid].chunks[data.chunkid]);
        }

        /* error check commits then do this, probably */
        delete tasks[data.jobid].chunks[data.chunkid];
        getChunksForTask(data.jobid);
    });

    function getChunksForTask(jobid){
        console.log(socket.id, 'getting chunks for task', jobid);
        if(nkeys(tasks[jobid].chunks) < MAX_CHUNKS_PER_TASK){
              
            var localGeneration = GLOBAL_GENERATION++;
            db.dequeue_work(jobid, function(err, work_unit, phase){
                if (localGeneration != GLOBAL_GENERATION) { return getChunksForTask(jobid); }
                if(err) {
                    console.warn(err);
                    return;
                }
                if(phase == "Finished"){
                    console.log('killing job');
                    delete tasks[jobid];
                    socket.emit('kill', jobid);
                    return getTasks();
                } 
                if(!work_unit){
                    console.log(phase, work_unit);
                    return getChunksForTask(jobid);
                }

                assert(work_unit);

                console.log('got chunk', work_unit._id, 'for job', jobid, 'in phase', phase);

                var task = {phase: phase,
                            jobid: jobid,
                            chunkid: work_unit._id,
                            data: work_unit.data};

                /* if phase is changing, assert that nchunks is  0 */
                tasks[jobid].chunks[task.chunkid] = [];
                tasks[jobid].phase = phase;
                socket.emit('task', task);
                return getChunksForTask(jobid);
            });
        }
    }

    function getTasks(){
        console.log(socket.id, 'getting tasks');
        if(nkeys(tasks) < MAX_TASKS_PER_WORKER){
            db.all_active_jobs(function(err, jobs){
                console.log("got jobs from db");
                console.dir(tasks);
                if(err) { console.warn(err); return; }

                if(jobs.length <= nkeys(tasks)){
                    console.log('waiting since lesseq jobs',jobs.length,'than current tasks', nkeys(tasks)); 
                    socket.emit('wait');
                    return;
                }

                var available_jobs = jobs.filter(function(j) { return !(j._id in tasks); });
                var job = available_jobs[Math.floor(Math.random() * available_jobs.length)];
                tasks[job._id] = {chunks: {}, phase: job.phase};
                getChunksForTask(job._id);
                getTasks();
            });
        }
    }

    getTasks();
});

function nkeys(o){
    return Object.keys(o).length;
}
