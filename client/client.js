/* Determine when to kill a worker */
var workers = {};
var socket = io.connect(window.location.hostname, {port: 80});

socket.on('connect', function(){ 
    console.log('socket connected');
});

socket.on('disconnect', function(){ 
	console.log('socket disconnected');
});

/* XXX how to prune dead workers? multiple workers for one jobid? */
socket.on('task', function(data){
    console.log('received task', data);
    /* TODO lock the worker while its being created */
    var jobid = data.jobid;
    if(!(jobid in workers)){
        workers[jobid] = new MessagingWorker(jobid);
    }
    workers[jobid].emit('task', data);
});

socket.on('kill', function(jobid){
    /* should probably keep track of active tasks in worker and assert
     * that they are finished before terminating the worker. */
    console.log('killing', jobid);
    if(jobid in workers){
        workers[jobid].worker.terminate();
    }
});

function MessagingWorker(jobid){
    this.jobid = jobid;
    this.worker = new Worker('jobs/' + jobid + '.js');
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
    this.on('done', function(data){
        socket.emit('done', data);
    });
}
