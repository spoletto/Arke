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

function emitIntermediate(key, value){
    __emitMessage('emitIntermediate', {key: key, value: value});
}

function emit(key, value){
    __emitMessage('emit', {key: key, value: value});
}

__handlers['map'] = function(data){
    map(data.key, data.value);
};
__handlers['reduce'] = function(data){
    reduce(data.key, data.values);
}
