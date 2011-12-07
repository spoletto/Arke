importScripts('/worker.js');

function fib(n){
    if(n == 0){
        return 0;
    } else if(n == 1){
        return 1;
    } else {
        return fib(n-1) + fib(n-2);
    }
}

map = function(data, emit){
    var n = parseInt(data);
    emit(n, fib(n));
}

reduce = function(key, values, emit){
    emit(key, values[0]);
}
