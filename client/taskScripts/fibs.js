handlers = {};
function emit(action, data){
    postMessage({action: action, data: data});
}
function on(action, handler){
    handlers[action] = handler;
}
onmessage = function(event){
    emit('log', 'received event');
    if ("data" in event &&
        "action" in event.data && 
        "data" in event.data && 
        event.data.action in self.handlers){
        handlers[event.data.action](event.data.data);
    }
}

on('data', function(n){
    emit('log', 'received data, emitting result'); 
    var f = fib(n);
    emit('log', f);
    emit('result', f);
});

function fib(n){
    if(n == 0){
        return 0;
    } else if(n == 1){
        return 1;
    } else {
        return fib(n-1) + fib(n-2);
    }
}
