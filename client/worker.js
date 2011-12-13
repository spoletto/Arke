var __handlers = {};

function __emitMessage(action, data){
    postMessage({action: action, data: data});
}

onmessage = function(event){
    if ("data" in event &&
        "action" in event.data && 
        "data" in event.data && 
        event.data.action in __handlers){
        __handlers[event.data.action](event.data.data);
    }
}

var map = function(key, value){};
var reduce = function(key, values){};

function log(message){
    __emitMessage('log', message);
}

__handlers['task'] = function(data){
    var func = data.phase == 'Map' ? map : reduce;
    var results = [];
    var emit = function(key, value){
        var d = {};
        d[key] = value;
        results.push(d);
    };

    if(data.phase == 'Map'){
        map(data.data, emit);
    } else if(data.phase == 'Reduce'){
        if(!("key" in data.data && "values" in data.data)){
            log("reduce data must be of form {'key': ..., 'values': ...}");
            return;
        }
        reduce(data.data.key, data.data.values, emit);
    } else {
        log('invalid phase!');
        return;
    }

    /* XXX i may totally misunderstand callbacks, in which case this should be 
     * the contents of a 'done' callback passed to map/reduce*/
    __emitMessage('done', {phase:   data.phase,
                           jobid:   data.jobid,
                           chunkid: data.chunkid,
                           results: results});
};
