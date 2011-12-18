importScripts('underscore.js');
var code;

self.onmessage = function (event){
    if(event.data.action === 'code'){
        eval('code = ' + event.data.code);
    } else if (event.data.action === 'data'){
        //self.postMessage({action: 'log', message: 'Processing task... '});
        var output = [];
        code(event.data.data.k, event.data.data.v, function(k, v){
            output.push({'k': k, 'v': v});
        });

        self.postMessage({action: 'completeTask', data: output}); 
    } else {
        self.postMessage({action: 'log', message: 'Unrecognized action: ' + event.data.action});
    }
}
