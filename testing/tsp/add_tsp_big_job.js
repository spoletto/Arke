/* 
 * add_tsp_job.js
 *
 * Creates a new 'TSP' job and adds it
 * to the database. Prints the job_id of the newly
 * created job to the console.
 *
 * Author: Stephen Poletto
 * Date: 12-18-2011
 */

var db = require('../../redis_db'),
    fs = require('fs'),
    _ = require('underscore');

var MAP_FILENAME = 'tsp_map_big.js';
var REDUCE_FILENAME = 'tsp_reduce.js';

var inputJSON = [];
for (var i = 0; i < 1744; i++) {
	var key = "50000000," + i;
	inputJSON.push({ "k":key, "v":"" });
}

var map = fs.readFileSync(__dirname + '/' + MAP_FILENAME, 'utf8');
var reduce = fs.readFileSync(__dirname + '/' + REDUCE_FILENAME, 'utf8');

db.new_user("spoletto@cs.brown.edu", "password", function(err) {
    db.new_job("spoletto@cs.brown.edu", inputJSON, 1, map, reduce, "tsp", function(err, job_id) {
        console.log("Submitted job with ID = " + job_id);
    });
});
