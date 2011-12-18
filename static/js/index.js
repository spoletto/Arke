var mySlide;
window.addEvent('domready', function(){
	$('login').setStyle('height','auto');
	mySlide = new Fx.Slide('login').hide(); 
});

function setCookie(key, value) {  
   	var expires = new Date();  
    expires.setTime(expires.getTime() + 31536000000); //1 year  
    document.cookie = key + '=' + value + ';expires=' + expires.toUTCString() + 'path=localhost:8080/';  
}  
  
function getCookie(key) {  
  	 var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');  
   	 return keyValue ? keyValue[2] : null;  
 } 

function showerror(err){
	jQuery('#error').show();
	jQuery('#err').html(err);
}
 
function logout(){
	setCookie('solvejs', "");
	//mySlide.show(); 
	jQuery('#login_name').html("");
	WantToLogIn();
}


function login(name){
	jQuery.post('/login', jQuery("#login_form").serialize(), function(data) {
		if (data['status'] == 'login_successful') {
			/*login successful*/
			// hide login stuff
			jQuery('#login_form').fadeOut('slow', function(){
			});
			jQuery('#logintxt').hide();
			jQuery('#toggleLogin').hide();
			//show logout stuff
			jQuery('#toggleLogout').click(function(){
				logout();	
			});
			jQuery('#toggleLogout').show();
			setCookie('solvejs', name);
			jQuery('#login_name').html(getCookie('solvejs'));
			mySlide.slideOut();
			jQuery('#error').hide();
			console.log("success");
		} else if (data['status'] == 'bad_email') {
			console.log("bad email");
			showerror("Error: bad email");
		} else if (data['status'] == 'bad_password') {
			console.log("bad password");
			showerror("Error: bad password");
		} else {
			console.log("unknown response");
			showerror("Error: server error");
		}
	});
	return false;
}
function register(name){
	console.log("trying to register");
	jQuery.post('/register', jQuery("#login_form").serialize(), function(data) {
		if (data['status'] == 'registration_successful') {
			/*login successful*/
			// hide login stuff
			jQuery('#login_form').fadeOut('slow', function(){
			});
			jQuery('#logintxt').hide();
			jQuery('#toggleLogin').hide();
			//show logout stuff
			jQuery('#toggleLogout').click(function(){
				logout();	
			});
			jQuery('#toggleLogout').show();
			setCookie('solvejs', name);
			jQuery('#login_name').html(getCookie('solvejs'));
			mySlide.slideOut();
			jQuery('#error').hide();
			console.log("success");
		} else if (data['status'] == 'email_take') {
			console.log("email_take");
			showerror("Error: email_take");
		} else if (data['status'] == 'error') {
			console.log("server error");
			showerror("Error: server error");
		} else {
			console.log("unknown response");
			showerror("Error: server error");
		}
	});
	return false;
}


function LoggedIn(){
	// hide login stuff
	jQuery('#login_form').fadeOut('slow', function(){ });
	jQuery('#logintxt').hide();
	jQuery('#toggleLogin').hide();
	//show logout stuff
	jQuery('#toggleLogout').show();
	jQuery('#login_name').html(getCookie('solvejs'));
	jQuery('#toggleLogout').click(function(){
				logout();	
	});
}

function WantToRegister(){
	jQuery('#register_div').show();
	jQuery('#register_submit').show();
	jQuery('#registertxt').show();
	jQuery('#logintxt').hide();
	jQuery('#login_submit').hide();
	jQuery('#login_form').unbind();
	jQuery('#login_form').submit(function() {
		register(jQuery(":input").val());	
		return false;
	});
	jQuery('#error').hide();
}
function WantToLogIn(){
	//listener for login form
	jQuery('#login_form').unbind();
	console.log("Registering login handler.");
	jQuery('#login_form').submit(function() {
		console.log("Login handler.");
		login(jQuery(":input").val());
		return false;
	});
	jQuery('#login_form').fadeIn('slow', function(){ });
	jQuery('#logintxt').show();
	jQuery('#registertxt').hide();
	jQuery('#toggleLogin').show();
	jQuery('#toggleLogout').hide();
	jQuery('#register_submit').hide();
	jQuery('#login_submit').show();
	jQuery('#error').hide();
}

jQuery(document).ready(function($) {
	console.log("DOCUMENT RDY");
	//ON LOAD
	//IF LOGGED IN
	if(getCookie('solvejs') != ""){
		LoggedIn();
	}else{
		//listener for login form
		WantToLogIn();
	}
	//listener for upload job button
	jQuery('#upload_job').click(function(){
		if(getCookie('solvejs') != "")
			window.location.href = "/upload";
		else
			alert("Please log in to upload jobs");	
	});
	//listener for register link
	jQuery('#register_link').click(function(){
		WantToRegister();	
	});
	jQuery('#login_link').click(function(){
		WantToLogIn();	
	});
	$.noConflict();
});

jQuery(window).unload( function () { 
	//setCookie('solvejs', ""); 
});
 

