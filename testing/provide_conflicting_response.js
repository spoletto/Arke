/* 
 * provide_conflicting_response.js
 *
 * Simulate a malicious client sending back
 * an erroneous response.
 *
 * Author: Stephen Poletto
 * Date: 12-17-2011
 */

var db = require('../redis_db');

db.dequeue_work(function(err, job_id, chunk_id, chunk, code) {
	console.log("Dequeued job " + job_id);
	console.log("Dequeued chunk " + chunk_id);
	console.dir("Dequeued chunk " + chunk);

	// Enqueue a bogus response.
	var result = [{'k':'resultReduceKey', 'v':'resultReduceKey'}];
	db.enqueue_result(job_id, chunk_id, result);
});


