function setCookie(key, value) {  
   	var expires = new Date();  
    expires.setTime(expires.getTime() + 31536000000); //1 year  
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString() + 'path=localhost:8080/';  
}  
  
function getCookie(key) {  
  	 var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');  
   	 return keyValue ? keyValue[2] : null;  
 }
 
 jQuery(document).ready(function($) {
	$('#upload_map_reduce').click(function() {
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
		//setCookie('solvejs', "");
		//console.log(getCookie('solvejs'))
		//jQuery('#login_name').html(getCookie('solvejs'));
		window.location.href = "/";	
	});
	console.log(getCookie('solvejs'))
	jQuery('#login_name').html(getCookie('solvejs'));
});


