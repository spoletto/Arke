var mySlide;
window.addEvent('domready', function(){
	$('login').setStyle('height','auto');
	mySlide = new Fx.Slide('login').hide(); 
});

function setCookie(key, value) {  
   	var expires = new Date();  
    expires.setTime(expires.getTime() + 31536000000); //1 year  
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();  
}  
  
function getCookie(key) {  
  	 var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');  
   	 return keyValue ? keyValue[2] : null;  
 } 

function showerror(err){
	jQuery('#error').show();
	jQuery('#err').html(err);
}

function login(name){
	jQuery.post('/login', jQuery("#login_form").serialize(), function(data) {
		alert(status);
		if (data['status'] == 'login_successful') {
			alert(status);
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
			mySlide.slideOut();
			jQuery('#error').hide();
			console.log("success");
		} else if (data['status'] == 'bad_email') {
			console.log("bad email");
			showerror("bad email");
		} else if (data['status'] == 'bad_password') {
			console.log("bad password");
			showerror("bad password");
		} else {
			console.log("unknown response");
			showerror("server error");
		}
	});
	return false;
}
function LoggedIn(){
		// hide login stuff
		jQuery('#login_form').fadeOut('slow', function(){
		});
		jQuery('#logintxt').hide();
		jQuery('#toggleLogin').hide();
		//show logout stuff
		jQuery('#toggleLogout').show();
		jQuery('#login_name').html(getCookie('solvejs'));
}
function NotLoggedIn(){
	//Hide the register div
	$('#register_div').hide();
	$('#register_submit').hide();
	$('#registertxt').hide();
	$('#toggleLogout').hide();
}

jQuery(document).ready(function($) {
	//ON LOAD
	NotLoggedIn();
	//IF LOGGED IN
	if(getCookie('solvejs') != ""){
		LoggedIn();
	}
	//listener for login form
	$('#login_form').submit(function() {
		login($(":input").val());	
	});
	//listener for upload job button
	$('#upload_job').click(function(){
		if(getCookie('solvejs') != "")
			window.location.href = "/upload";
		else
			alert("Please log in to upload jobs");	
	});
		
});

jQuery(window).unload( function () { 
	setCookie('solvejs', ""); 
});
 

