window.onload = init;

function init() {

    let address = document.getElementById("socket");
    let listenKey = document.getElementById("listenKey");
    if (listenKey.value) {
        let socket = new WebSocket(address.value + listenKey.value);

        socket.addEventListener("message", function (event) {
            let json = JSON.parse(event.data);
            if (!json["e"]) return;

            console.log(json);

        });

    }

    let pages = new Pageset(location.href);

    let user = document.querySelector(".top.bar .user");
    user.addEventListener("click", function(e) {
        e.preventDefault();
        pages.open(this.href);
    });

    let breadcrumb = document.getElementById("breadcrumb");
    breadcrumb.addEventListener("click", function(e) {
        e.preventDefault();
        if (e.target.parentNode.classList.contains("breadcrumb-item") && e.target.tagName !="A") {
            let a = e.target.parentNode.querySelector("a");
            pages.open(a? a.href : location.href);
        }
        if (e.target.tagName == "A") {
            pages.close(e.target.href);
        }
    });

    let nav = document.getElementById("pages");
    nav.addEventListener("submit", function(e) {

        e.preventDefault();
        let form = document.querySelector(".page.active .formdata");

        if(!e.target.classList.contains("ctl"))
            return;

        if (e.target.classList.contains("editor")) {
            pages.edit(e.target.action);
            return;
        }

        if (e.target.classList.contains("saver")) {
            pages.save(e.target.action, form);
            return;
        }

    });

    nav.addEventListener("click", function(e) {

        if (e.target.classList.contains("close")) {
            e.preventDefault();
            pages.close(e.target.href);
        }

                                            // toggle на разных страницах
        if (e.target.tagName=="LABEL") {    // label без for не самокликается, а c for нельзя сделать несколько элементов из-за уникальности id
            e.preventDefault();
            e.target.previousSibling.checked = !e.target.previousSibling.checked;
            let input = document.querySelectorAll(".page.active form input[name^='_']");
            for (i=0; i<input.length; i++)
                input[i].disabled = !e.target.previousSibling.checked;
        }

    });

    nav.addEventListener("keyup", function (e) {

        if (e.code != "ArrowLeft" && e.code != "ArrowRight" && e.code != "ArrowDown" && e.code != "ArrowUp" &&
            e.code != "Enter" && e.code != "Delete" && e.code != "Escape") return false;

        switch (e.code) {
            case "Escape":
                let close = document.querySelector(".page.active .close");
                if (close) pages.close(close.href);
                return;
            case "Enter":
                let nav = document.querySelector(".page.active .editor.default");
                if (nav) pages.edit(nav.action);
                return;
            case "Delete":
//              this.remove(e.shiftKey);
                return;
        }

        let tbody = document.querySelector(".page.active table.td");

        let active_td = 0;
        let td = tbody.querySelectorAll("tr.active td");
        for (j = 0; j < td.length; j++)
            if (td[j].classList.contains("active")) {
                active_td = j + 1;
                td[j].classList.remove("active");
            }

        let active_tr = 0;
        let tr = tbody.querySelectorAll("tr");
        for (j = 0; j < tr.length; j++)
            if (tr[j].classList.contains("active")) {
                active_tr = j + 1;
                tr[j].classList.remove("active");
            }

        if (active_tr < 1) return false;

        switch (e.code) {
            case "ArrowLeft":
                active_td--;
                break;
            case "ArrowRight":
                active_td++;
                break;
            case "ArrowUp":
                active_tr--;
                break;
            case "ArrowDown":
                active_tr++;
                break;
        }

        let increment = e.code == "ArrowUp" ? -1 : 1;
        let row = tbody.querySelector("tr:not(.filtered):nth-child(" + active_tr + ")");
        while (!row) {
            if (active_tr < 1 || active_tr > tr.length) increment *= -1;
            active_tr += increment;
            row = tbody.querySelector("tr:not(.filtered):nth-child(" + active_tr + ")");
        }
        row.classList.add("active");

        let cell = row.querySelector("td:not(.id):nth-child(" + active_td + ")");
        while (!cell) {
            active_td = e.code == "ArrowLeft" ? active_td - 1 : active_td + 1;
            if (active_td < 1) active_td = td.length;
            if (active_td > td.length) active_td = 1;
            cell = row.querySelector("td:not(.id):nth-child(" + active_td + ")");
        }
        cell.classList.add("active");

    });

    let tables = document.querySelectorAll(".page table.td");
    for (i=0; i< tables.length; i++) {
        tables[i].addEventListener("click", function (e) {
            if (!e.target || e.target.tagName != 'TD') return;

            let table = document.querySelector(".page.active");
            let tr = table.querySelector("tr.active");
            if (tr) tr.classList.remove("active");
            let td = table.querySelector("td.active");
            if (td) td.classList.remove("active");

            e.target.classList.add('active');
            e.target.parentNode.classList.add("active");
        });

        tables[i].addEventListener("dblclick", function (e) {
            let nav = document.querySelector(".page.active .editor.default");
            if (nav) pages.edit(nav.action);
        });
    }

    let menu = document.querySelectorAll(".nav-item a");
    for (i = 0; i < menu.length; i++)
        menu[i].addEventListener("click", function (e) {
            e.preventDefault();

            this.classList.toggle("active");

            /*
                      let popups = document.querySelectorAll(".popup");
                        for (j = 0; j < popups.length; j++) {
                            if (popups[j].querySelector("a[href='"+this.getAttribute("href")+"']")) {
                                popups[j].classList.toggle("active");
                                continue;
                            }
                            popups[j].classList.remove("active");
                        }
            */
        });

}