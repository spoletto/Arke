var uuid = require('node-uuid');
var fs = require('fs');
var task_log = {};
var job_log = {};
var written = false;
/* Timestamp keys, in order of collection:
 * phase: duh
 * client_fetch: client requests a task
 * start_fetch: server receives requests, begins db fetch for task
 * end_fetch: server fetched task, sends to client
 * client_start: client receives task
 * client_end: client finishes task, sends to server
 * start_store: server receives result, begins db store
 * end_store: server finishes store. if key is present, this is a valid log entry.
 * */

exports.fetchingTask = function(){
    var id = uuid.v4();
    task_log[id] = {start_fetch: new Date().getTime()};
    return id;
};
exports.fetchedTask = function(id, phase){
    task_log[id].end_fetch = new Date().getTime();
    task_log[id].phase = phase;
};
exports.storingTask = function(id, client_log){
    for(var k in client_log)
        task_log[id][k] = client_log[k];

    task_log[id].start_store = new Date().getTime();
};
exports.storedTask = function(id){
    task_log[id].end_store = new Date().getTime();
};

exports.writeTaskLog = function(){
    if(!written){
        fs.writeFileSync('TASK_LOG', JSON.stringify(task_log));
        written = true;
    }
};

exports.mapComplete = function(){
    job_log.map_complete = new Date().getTime();
};

exports.reduceStart = function(){
    job_log.reduce_start = new Date().getTime();
};

exports.reduceComplete = function(){
    job_log.reduce_complete = new Date().getTime();
};

exports.jobComplete = function(){
    job_log.job_complete = new Date().getTime();
    fs.writeFileSync('JOB_LOG', JSON.stringify(job_log));
};
