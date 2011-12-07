/* 
 * server.js
 *
 * Date: 12-01-2011
 */

var connect = require('connect'),
    express = require('express'),
	db = require('./db_provider');
	config = require('./config')

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
	return req.session.login != null;
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

app.post('/register', function(req, res) {
	var login = req.body.login;
	var password = req.body.password;
	
	db.add_new_user(login, password, function(err) {
		if (err && err.code == DUPLICATE_KEY_ERROR_CODE) {
			// Provided login has already been taken.
			// TODO: Handle the error.
			return;
		} else if (err) {
			// Another error has occured.
			// TODO: Handle the error.
			return;
		}
		
		// New user was successfully saved to the database.
		// Record the username in the session object.
		req.session.login = login;
	});
});

app.listen(8000);

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
    var tasks = {};

    socket.on('disconnect', function(){
        console.log(socket.id + ' disconnected');
        restoreTasks(tasks);
    });

    socket.on('emit', function(data){
        /* TODO this entry's existence should be asserted to some extent */
        tasks[data.jobid][data.phase][data.chunkid].append(
            {key: data.key, value: data.value}
        );
    });

    socket.on('done', function(data){
        /* TODO data validity and this entry's existence should be asserted to some extent */
        if(data.phase == "Map"){
            enqueue_intermediate_result(data.jobid, data.chunkid,
                                        tasks[data.jobid][data.phase][data.chunkid], handleShuffle);
        } else if(data.phase == "Reduce"){ 
            commit_final_result(data.jobid, data.chunkid, tasks[data.jobid][data.phase][data.chunkid]);
        }
        sendTasks();
    });

    function sendTasks(){
        if(tasks.length < MAX_TASKS_PER_WORKER){
            getTask(function(err, task){
                if(err){
                    return;
                }

                /* TODO assert task validity */

                if(!(data.jobid in tasks))
                    tasks[data.jobid] = {};

                if(!(data.phase in tasks[data.jobid]))
                    tasks[data.jobid][data.phase] = {}

                /* TODO assert chunkid not already there */
                tasks[data.jobid][data.phase][data.chunkid] = {};
                socket.emit('task', task);
                sendTasks();
            })
        };
    }

    sendTasks();
});

function getTask(callback){
    db.all_active_jobs(function(err, jobs){
        /* main TODO: how do deal with no active jobs, i.e. how do workers idle */
        if(err || jobs.length == 0) return false;    

        var job = jobs[Math.floor(Math.random()*jobs.length)];

        var dequeue;
        if(job.phase == "Map"){
            dequeue = dequeue_map_work;
        } else if(job.phase == "Reduce"){
            dequeue = dequeue_map_reduce;
        } else {
            /* TODO non-active job! err or try again */
            return;
        }

        dequeue(job._id, function(err, work_unit){
            if(!err && work_unit == null)
                return getTask(callback);

            var task = {phase: job.phase,
                        jobid: job._id,
                        chunkid: work_unit._id,
                        data: work_unit.data};
            callback(0, task);
        });
    });
}

/* put each task back in its corresponding job queue */
function restoreTasks(tasks){
    /* TODO */
}

/* verify replicates, group by key, initialize reduce */
function handleShuffle(jobid, intermediate_data){
    /* TODO */
}

