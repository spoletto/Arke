var socket = io.connect(window.location.hostname, {port: 8000});

socket.on('connect', function(){ 
    console.log('socket connected');
});

socket.on('disconnect', function(){ 
	console.log('socket disconnected');
});

socket.on('task', function(taskid){
    var worker = new MessagingWorker('/tasks/' + taskid);
    $.get('/data/' + taskid, function(data){
        worker.on('result', function(data){
            var data = {data: data};
            $.post('/results/' + taskid, data, function(){
                console.log('successfully posted results');
            }, 'json');
        });
        worker.on('log', function(data){
            console.log(data);
        });
        worker.emit('data', data);
    }, 'json');
});

function MessagingWorker(scriptSource){
    this.worker = new Worker(scriptSource);
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
        console.log('emitting to worker', action, data);
        this.worker.postMessage({action: action, data: data});
    };
}
