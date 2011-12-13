/* 
 * reset_job.js
 *
 * Resets a job to its initial state.
 * Useful for testing.
 *
 * Author: Stephen Poletto
 * Date: 12-07-2011
 */

JOB_ID = '4ee709772634e86aa8000003';

var db = require('./db_provider');
db.reset_job(JOB_ID, function() { process.exit() });
