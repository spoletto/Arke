var connect = require('connect'),
    express = require('express');

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
app.post('/results/:taskid', function(req, res){
    console.log('received result for task ' + req.params.taskid);
    console.dir(req.body.data);
    res.json("success!");
});
app.get('/tasks/:taskid', function(req, res){
    console.log('redirecting to fibs.js');
    res.redirect('/taskScripts/fibs.js');
});

app.get('/data/:taskid', function(req, res){
    res.send(JSON.stringify(10));
});

var io = require('socket.io').listen(app);

io.sockets.on('connection', function (socket) {
    socket.on('disconnect', function(){
        console.log('client disconnected');
    });
    socket.emit('task', 'fibs');
});

app.listen(8000);
