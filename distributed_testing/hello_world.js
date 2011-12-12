/* 
   hello_world.js.

   Test Node.js server to see if the EC2 instances
   are actually pinging us.

   Author: Stephen Poletto
 */

var express = require('express');
var app = express.createServer();

app.get('/', function(req, res) {
	console.log("REQUEST RECEIVED");
	res.json({ status: "ok" });
	return;
});

app.listen(80);
console.log("Server started on port 80.");