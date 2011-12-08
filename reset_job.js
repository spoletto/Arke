/* 
 * reset_job.js
 *
 * Resets a job to its initial state.
 * Useful for testing.
 *
 * Author: Stephen Poletto
 * Date: 12-07-2011
 */

JOB_ID = '4ee03991d156574daa000003';

var db = require('./db_provider');
db.reset_job(JOB_ID);
