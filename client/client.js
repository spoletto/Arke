/* Determine when to kill a worker */
var workers = {};
var socket = io.connect(window.location.hostname, {port: 8000});

socket.on('connect', function(){ 
    console.log('socket connected');
});

socket.on('disconnect', function(){ 
	console.log('socket disconnected');
});

socket.on('task', function(data){
    var taskid = data.taskid;
    if(!(taskid in workers)){
        workers[taskid] = new MessagingWorker(taskid);
    }
    workers[taskid].emit(data.type, data.data);
});

function MessagingWorker(taskid){
    this.taskid = taskid;
    this.worker = new Worker('tasks/' + taskid);
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
        console.log(that.taskid + ':', message);
    });
    this.on('emit', function(data){
        socket.emit('emit', {taskid: that.taskid,
                             key: data.key,
                             value: data.value});
    });
    this.on('emitIntermediate', function(data){
        socket.emit('emitIntermediate', {taskid: that.taskid,
                                         key: data.key,
                                         value: data.value});
    });
}
