function setCookie(key, value) {  
   	var expires = new Date();  
    expires.setTime(expires.getTime() + 31536000000); //1 year  
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();  
}  
  
function getCookie(key) {  
  	 var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');  
   	 return keyValue ? keyValue[2] : null;  
 } 

function login(name){
		console.log(name);
 		jQuery.post('http://localhost:80/login', jQuery("#login_form").serialize(), function(data) {
  			if (data['status'] == 'login_successful') {
  				/*login successful*/
  				// hide login stuff
  				jQuery('#login_form').fadeOut('slow', function(){
  				});
  				jQuery('#logintxt').hide();
  				jQuery('#toggleLogin').hide();
  				//show logout stuff
  				jQuery('#toggleLogout').show();
  				setCookie('solvejs', name);
  					jQuery('#login_name').html(getCookie('solvejs'));
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
}


jQuery(document).ready(function($) {
//ON LOAD

	//Hide the register div
	$('#register_div').hide();
	$('#register_submit').hide();
	$('#registertxt').hide();
	$('#toggleLogout').hide();
	
	if(getCookie('solvejs') != ""){
	// hide login stuff
		jQuery('#login_form').fadeOut('slow', function(){
		});
		jQuery('#logintxt').hide();
		jQuery('#toggleLogin').hide();
		//show logout stuff
		jQuery('#toggleLogout').show();
		jQuery('#login_name').html(getCookie('solvejs'));
	}
	//set the login listener
	$('#login_form').submit(function(req, res) {
		login($(":input").val());	
	});
	
	//set the upload listener
	$('#upload_form').submit(function() {
		console.log("In upload callback");
 		$.post('http://localhost:80/upload_job', $("#upload_form").serialize(), function(data) {
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
		if(getCookie('solvejs') != "") {
			/* Pop up the modal */
			console.log("UPLOAD JOB");
			$('#basic-modal-content').modal();
		}else{
			alert("Must be logged in to upload data");
		}
		
	});
	
	$('#toggleLogout').click(function(){
		//hide logout stuff
		$('#toggleLogout').hide();
		setCookie('solvejs',"");
		$('#login_name').html(getCookie('solvejs'));
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
	 		$.post('http://localhost:80/register', $("#login_form").serialize(), function(data) {
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
		
		
		//reset the login listener
		$('#login_form').submit(function(req, res) {
			login($(":input").val());	
		});
	});	
});

jQuery(window).unload( function () { 
	setCookie('solvejs', ""); 
});
 

