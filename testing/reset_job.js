/* 
 * reset_job.js
 *
 * Resets a job to its initial state.
 * Useful for testing.
 *
 * Author: Stephen Poletto
 * Date: 12-07-2011
 */

JOB_IDS = ['4ee71b2caaa4f850af000003', '4ee71b2caaa4f850af000009', '4ee71b2caaa4f850af00000f', '4ee71b2caaa4f850af000015'];

var db = require('../db_provider');
for(var i in JOB_IDS){
    db.reset_job(JOB_IDS[i], function(){});
}
