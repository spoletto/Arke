/* 
 * word_count.js
 *
 * A sample of an uploaded job, performing word count
 * on a collection of documents.
 *
 * Author: Stephen Poletto
 * Date: 12-07-2011
 */

importScripts('/client/worker.js');

map = function(data, emit){
	data.split(" ").forEach(function(word) {
		emit(word, 1);
	});
}

reduce = function(key, values, emit){
    emit(key, values.length);
}