
jQuery(document).ready(function($) {
	// Set up the function to POST login credentials.
	$('#login_form').submit(function() {
 		jQuery.post('/login', $("#login_form").serialize(), function(data) {
	 		alert(status);
  			if (data['status'] == 'login_successful') {
 				console.log("success");
  			} else if (data['status'] == 'bad_email') {
 				console.log("bad email");
  			} else if (data['status'] == 'bad_password') {
 				console.log("bad password");
  			} else {
 				console.log("unknown responce");
   			}
  		});
  		return false;
	});
	$.noConflict();
});


