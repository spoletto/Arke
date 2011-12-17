var NWORKERS = 1;
var eventLog = [];

jQuery(document).ready(function(){
    now.ready(function(){
        if(!window.Worker){
            /* no webworkers! display a msg */
            return;
        }

        for(var i = 0; i < NWORKERS; i++){
            console.log('Creating worker', i);
            new MessagingWorker();
        }
    });
});

/* TODO hold on to jobid and taskid */
function MessagingWorker(jobid){
    var that = this;
    var worker = new Worker('/client/worker.js');
    var currentTask;

    function startNewTask(){
        logEvent("FETCH");
        now.getTask(function (task, code, data) {
            logEvent("START");
            currentTask = task;
            worker.postMessage({action: 'code', code: code});
            worker.postMessage({action: 'data', data: data});
        });
    }

    worker.onmessage = function(event){
        if(event.data.action === 'completeTask'){
            logEvent("COMPLETE");
            now.completeTask(currentTask, event.data.data, function() {});
            startNewTask();
        } else if (event.data.action === 'log'){
            console.log('WORKER:', event.data.message);
        } else {
            console.log('Invalid worker message:', event.data.action);
        }
    };

    startNewTask();
}

now.collectLog = function(callback){
    callback(eventLog);
};

function logEvent(label){
    eventLog.push({type: label, time: new Date().getTime()});
}
