var connect = require('connect'),
    express = require('express');
	db = require('./db_provider');

require('jade');

var app = express.createServer();
app.set('view options', {layout: false});

app.use(express.static(__dirname + '/client'));
app.use(express.bodyParser());

app.get('/', function(req, res){
    res.render('home.jade');
});
app.get('/monitor', function(req, res){
    res.render('monitor.jade');
});
app.get('/work', function(req, res){
    res.render('work.jade');
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
