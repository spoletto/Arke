jQuery(document).ready(function($) {
	$('#upload_map_reduce').click(function() {
		console.log("GOT HERE!!!");
	  	var map_text 		= $('textarea#map').val();
	    var reduce_text 	= $('textarea#reduce').val();
	    var file 			= $('input[type=file]').val().split('\\').pop();
	    var description 	= $('textarea#blurb').val();    
	    console.log("FILE ::" + file);
	
	  
	    $.post("/upload_job", {map :map_text, reduce : reduce_text, blurb : description}, function(data) {
  			alert(data['status']);
  			if (data['status'] == 'upload_succesful') {
  			
 				console.log("success");
 				window.location.href = "/";
  			} else if (data['status'] == 'JSON_parse_error') {
 				console.log("JSON_parse_error");
  			} else if (data['status'] == 'error') {
 				console.log("error");
  			} else {
 				console.log("unknown response");
   			}
  		});
  		return false;
  			
	});
	
	$('#toggleLogout').click(function(){
		window.location.href = "/";	
	});
});
		/*

*/

