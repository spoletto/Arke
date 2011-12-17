var mySlide;
window.addEvent('domready', function(){

	$('login').setStyle('height','auto');
	mySlide = new Fx.Slide('login').hide();  //starts the panel in closed state  

    $('toggleLogin').addEvent('click', function(e){
		e = new Event(e);
		mySlide.toggle();
		e.stop();
	});

    $('closeLogin').addEvent('click', function(e){
		e = new Event(e);
		mySlide.slideOut();
		e.stop();
	});

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
	$('#login_form').submit(function() {
		login($(":input").val());	
	});
		
});

jQuery(window).unload( function () { 
	setCookie('solvejs', ""); 
});
 

