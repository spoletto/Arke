jQuery(document).ready(function($) {
//ON LOAD

	//Hide the register div
	$('#register_div').hide();
	$('#register_submit').hide();
	$('#registertxt').hide();
	$('#toggleLogout').hide();
	
			
	//set the login listener
	$('#login_form').submit(function() {
		console.log("In login callback");
 		$.post('/login', $("#login_form").serialize(), function(data) {
  			if (data['status'] == 'login_successful') {
  				/*login successful*/
  				// hide login stuff
  				$('#login_form').fadeOut('slow', function(){
  				});
  				$('#logintxt').hide();
  				$('#toggleLogin').hide();
  				//show logout stuff
  				$('#toggleLogout').show();
  				$('#login_name').html("TESTESTETTS");
 				console.log("success");
  			} else if (data['status'] == 'bad_email') {
 				console.log("bad email");
  			} else if (data['status'] == 'bad_password') {
 				console.log("bad password");
  			} else {
 				console.log("unknown response");
   			}
  		});
  		return false;
	});
	
	//set the upload listener
	$('#upload_form').submit(function() {
		console.log("In upload callback");
 		$.post('/upload_job', $("#upload_form").serialize(), function(data) {
  			alert(data['status']);
  			if (data['status'] == 'upload_succesful') {
 				console.log("success");
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
	
//ON ACTION EVENTS	
	$('#upload_job').click(function(){
		/* Pop up the modal */
		console.log("UPLOAD JOB");
		$('#basic-modal-content').modal();

	});
	
	$('#toggleLogout').click(function(){
		//hide logout stuff
		$('#toggleLogout').hide();
		
		// show login stuff
		$('#login_form').fadeIn('slow', function(){
		});
		$('#logintxt').show();
		$('#toggleLogin').show();
		
	});
	
	
	
	//Hide the register div
	$('#register_link').click(function(){
		$('#logintxt').fadeOut('slow', function(){
			//fadeout done
			$('#registertxt').fadeIn('slow', function(){
			//fadein done
			});
		});
		$('#login_submit').fadeOut('slow', function(){
			//fadeout done
			$('#register_submit').fadeIn('slow', function(){
			//fadein done
			});
		});
		
		//remove the login listener
		$('#login_form').unbind('submit');
		
		//add the register listener
		$('#login_form').submit(function() {
			console.log("In register callback");
	 		$.post('/register', $("#login_form").serialize(), function(data) {
	  			alert(data['status']);
	  			if (data['status'] == 'registration_successful') {
	 				console.log("success");
	  			} else if (data['status'] == 'email_taken') {
	 				console.log("email already taken");
	  			} else if (data['status'] == 'error') {
	 				console.log("error");
	  			} else {
	 				console.log("unknown response");
	   			}
	  		});
	  		return false;
		});
	});
	
	//Hide the register div
	$('#login_link').click(function(){
		$('#registertxt').fadeOut('slow', function(){
			//fadeout done
			$('#logintxt').fadeIn('slow', function(){
			//fadein done
			});
		});
		$('#register_submit').fadeOut('slow', function(){
			//fadeout done
			$('#login_submit').fadeIn('slow', function(){
			//fadein done
			});
		});

		//remove the register listener
		$('#login_form').unbind('submit');
		
		
		//reset the listener
		$('#login_form').submit(function() {
			console.log("In login callback");
	 		$.post('/login', $("#login_form").serialize(), function(data) {
	  			alert(data['status']);
	  			if (data['status'] == 'login_successful') {
	 				console.log("success");
	  			} else if (data['status'] == 'bad_email') {
	 				console.log("bad email");
	  			} else if (data['status'] == 'bad_password') {
	 				console.log("bad password");
	  			} else {
	 				console.log("unknown response");
	   			}
	  		});
	  		return false;
		});
	});	
});

jQuery(function ($) {
	// Load dialog on page load
	//$('#basic-modal-content').modal();

	// Load dialog on click
	$('#basic-modal .basic').click(function (e) {
		$('#basic-modal-content').modal();
		return false;
	});
});

