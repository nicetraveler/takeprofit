window.onload = func;

function func() {

	var auth = document.getElementById("auth");

	var usr = document.getElementById("usr");
	var pwd = document.getElementById("pwd");

	usr.focus();	

	usr.addEventListener("keydown", function(e) {

		if (e.key!='Enter') return false;
		e.preventDefault();

		auth.className += " higher";
		pwd.focus();

	});

	pwd.addEventListener("keydown", function() {
		this.className = this.className.replace(" invalid", "");
	});

	auth.addEventListener("submit", function(e) {
		e.preventDefault();
		
		fetch('login.html', {
			method:"POST",
			headers: {
				"Authorization": 'Basic '+btoa(usr.value+':'+pwd.value)
			},
			
		}).then(function(response) {
			if (!response.ok)
				throw response.status;
			window.location.href = 'index.html';

		}).catch(function(error) {
			pwd.className += " invalid";
		});
	});

	let a = document.querySelector("a[rel='external']");
	a.addEventListener("click", function(e) {
		e.preventDefault();
		window.open(this.href, 'new_window', 'width=600, height=300');
	});	
	
}