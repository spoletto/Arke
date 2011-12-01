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

var io = require('socket.io').listen(app);

/* Maybe have two priority queues - one for tasks, one for connected clients
 * Need to automatically determine when to start sending a client another task
 * so as not to waste their cycles while the next chunk is sent
 * Perhaps keep measure time between emits to get an ETA on the task, also measure time to send task
 * somehow. Then we;d have enough info to do that correctly.
 */
io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function(){
        console.log('client disconnected');
    });
    /*Sending out a task looks like:
    socket.emit('task', {taskid: 'fibs',
                         type: 'map',
                         data: {key: 0, value: 1}});
     */

     /* Handle completed tasks */
    socket.on('emit', function(data){});
    socket.on('emitIntermediate', function(data){});
});

app.listen(8000);
