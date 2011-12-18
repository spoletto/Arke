var NWORKERS = 1;

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
        var client_fetch_t = new Date().getTime();
        now.getTask(function (task, code, data) {
            currentTask = task;
            currentTask.client_log = {
                client_fetch: client_fetch_t,
                client_start: new Date().getTime(),
            };
            worker.postMessage({action: 'code', code: code});
            worker.postMessage({action: 'data', data: data});
        });
    }

    worker.onmessage = function(event){
        if(event.data.action === 'completeTask'){
            currentTask.client_log.client_end = new Date().getTime();
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
