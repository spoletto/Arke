/* 
 * server.js
 *
 * Date: 12-01-2011
 */

var connect = require('connect'),
    express = require('express'),
	db = require('./db_provider'),
	config = require('./config'),
	bcrypt = require('bcrypt');

var DUPLICATE_KEY_ERROR_CODE = 11000;

var app = express.createServer();
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
    res.render('home.jade');
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
	return req.session.email_address != null;
}

/*
 * Call this to ensure the request is part of a valid
 * session (i.e. the user is logged in). If the user is
 * not logged in, they will be redirected to '/'. If the
 * user is logged in, the callback will be invoked.
 */
function auth_required(req, res, callback) {
	if (!is_logged_in(req)) { 
		res.redirect('/');
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
		res.json({status : 'registration_successful'});
		return;
	});
});

app.listen(8000);

var io = require('socket.io').listen(app);

var MAX_TASKS_PER_WORKER = 4;
/* how the fuck do i determine a decent value for this */
var MAX_CHUNKS_PER_TASK = 1;

io.sockets.on('connection', function (socket) {
    var tasks = {};

    socket.on('disconnect', function(){
        for(jobid in tasks){
            var enqueue;
            if(tasks.phase == "Map"){
                enqueue = enqueue_map_work;
            } else {
                enqueue = enqueue_reduce_work;
            }
            for(chunkid in tasks[jobid]){
                enqueue(jobid, chunkid);
            }
        }
    });

    socket.on('getTasks', getTasks);

    socket.on('emit', function(data){
        /* this entry's existence should be asserted to some extent */
        tasks[data.jobid].chunks[data.chunkid].append(
            {key: data.key, value: data.value}
        );
    });

    socket.on('done', function(data){
        /* todo: data validity and this entry's existence should be asserted to some extent */
        /* assert task is in that phase */
        if(data.phase == "Map"){
            enqueue_intermediate_result(data.jobid, data.chunkid, tasks[data.jobid].chunks[data.chunkid]);
        } else if(data.phase == "Reduce"){ 
            commit_final_result(data.jobid, data.chunkid, tasks[data.jobid].chunks[data.chunkid]);
        }

        /* error check commits then do this, probably */
        delete tasks[data.jobid].chunks[data.chunkid];
        getChunksForTask(data.jobid);
    });

    function getChunksForTask(jobid){
        if(nkeys(tasks[jobid]) < MAX_CHUNKS_PER_TASK){
            db.is_job_active(jobid, function(active, phase){
                if(active){

                    var dequeue;
                    if(job.phase == "Map"){
                        dequeue = dequeue_map_work;
                    } else if(job.phase == "Reduce"){
                        dequeue = dequeue_map_reduce;
                    }

                    dequeue(job._id, function(err, work_unit){
                        if(!err && work_unit == null)
                            getChunksForTask(jobid);

                        var task = {phase: job.phase,
                                    jobid: job._id,
                                    chunkid: work_unit._id,
                                    data: work_unit.data};

                        /* if phase is changing, assert that nchunks is  0 */
                        tasks[jobid].chunks[task.chunkid] = {};
                        tasks[jobid].phase = phase;
                        socket.emit('task', task);
                        getChunksForTask(jobid);
                    });

                } else if(nkeys(tasks[jobid].chunks) == 0){
                    delete tasks[jobid];
                    socket.emit('kill', jobid);
                    getTasks();
                }
            });
        }
    }

    function getTasks(){
        if(nkeys(tasks) < MAX_TASKS_PER_WORKER){
            db.all_active_jobs(function(err, jobs){
                if(err) { console.warn(err); return; }

                if(jobs.length <= nkeys(tasks)){
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
