/* Determine when to kill a worker */
var workers = {};
var socket = io.connect(window.location.hostname, {port: 8000});

socket.on('connect', function(){ 
    console.log('socket connected');
});

socket.on('disconnect', function(){ 
	console.log('socket disconnected');
});

/* XXX how to prune dead workers? multiple workers for one jobid? */
socket.on('task', function(data){
    var jobid = data.jobid;
    if(!(jobid in workers)){
        workers[jobid] = new MessagingWorker(jobid);
    }
    workers[jobid].emit('task', data);
});

function MessagingWorker(jobid){
    this.jobid = jobid;
    this.worker = new Worker('jobs/' + jobid);
    this.handlers = {};
    this.on = function(action, handler){
        this.handlers[action] = handler;
    };

    var that = this;
    this.worker.onmessage = function(event){
        if ("data" in event &&
            "action" in event.data && 
            "data" in event.data && 
            event.data.action in that.handlers){
            that.handlers[event.data.action](event.data.data);
        }
    };

    this.emit = function(action, data){
        this.worker.postMessage({action: action, data: data});
    };
    this.on('log', function(message){
        console.log(that.jobid + ':', message);
    });
    this.on('emit', function(data){
        socket.emit('emit', data);
    });
    this.on('done', function(data){
        socket.emit('done', data);
    });
}
