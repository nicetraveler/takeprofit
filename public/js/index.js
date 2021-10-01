window.addEventListener('load', function() {

    let openers = document.querySelectorAll(".status.bar .action a");
    for (i = 0; i < openers.length; i++)
        openers[i].addEventListener("click", function (e) {
            e.preventDefault();
            let popups = document.querySelectorAll(".popup");
            for (j = 0; j < popups.length; j++) {
                if (popups[j].querySelector("a[href='"+this.getAttribute("href")+"']")) {
                    popups[j].classList.toggle("active");
                    continue;
                }
                popups[j].classList.remove("active");
            }
        });

    let updater = document.querySelector(".popup a[href='symbols/update.html']");
    updater.addEventListener("click", function(e) {
        e.preventDefault();
        let detail = this.parentNode.querySelector(".detail");
        detail.classList.remove("warning");

        fetch(this.href, {
            headers: {
                'accept': 'application/json'
            }

        }).then(function(response) {
            if (!response.ok)
                return response.text().then(function(text) {throw new Error(text)});
            window.location.href = 'index.html';

        }).catch(function(error) {
            detail.innerText = error.message;
            detail.classList.add("warning");
        });
    });

});