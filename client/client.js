var NWORKERS = 4;

jQuery(document).ready(function(){
    now.ready(function(){
        if(!window.Worker){
            /* no webworkers! display a msg */
            return;
        }

        for(i in _.range(NWORKERS))
            new MessagingWorker();
    });
});

function MessagingWorker(jobid){
    var that = this;
    var worker = new Worker('/worker.js');
    var currentTaskId;

    function startNewTask(){
        now.getTask(function (taskId, code, data) {
            currentTaskId = taskId;
            worker.postMessage({action: 'code', code: code});
            worker.postMessage({action: 'data', data: data});
        });
    }

    worker.onmessage = function(event){
        if(event.data.action === 'completeTask'){
            now.completeTask(currentTaskId, event.data.data, function() {});
            startNewTask();
        } else if (event.data.action === 'log'){
            console.log('WORKER:', event.data.message);
        } else {
            console.log('Invalid worker message:', event.data.action);
        }
    };

    startNewTask();
}
