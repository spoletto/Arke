
jQuery(document).ready(function($) {
	// Set up the function to POST login credentials.
	$('#login_form').submit(function() {
		console.log("In submit callback");
 		$.post('http://localhost:8000/login', $("#login_form").serialize(), function(data) {
  			alert(data['status']);
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