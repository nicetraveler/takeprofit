window.onload = init;

function init() {

    let pages = new Pageset();

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
        if(e.target.classList.contains("ctl"))
            return;

        e.preventDefault();

        if (e.target.classList.contains("editor")) {
            pages.edit(e.target.action);
            return;
        }

        let form = document.querySelector(".page.active .formdata");
        pages.save(e.target.action, form);

    });

    nav.addEventListener("click", function(e) {
        if (e.target.classList.contains("close")) {
            e.preventDefault();
            pages.close(e.target.href);
        }
        if (e.target.tagName=="LABEL") {    // label без for не самокликается, а c for нельзя сделать несколько элементов из-за уникальности id
            e.preventDefault();
            e.target.previousSibling.checked = !e.target.previousSibling.checked;
            let input = document.querySelectorAll(".page.active form input[name^='_']");
            for (i=0; i<input.length; i++)
                input[i].disabled = !e.target.previousSibling.checked;
        }
    });

    nav.addEventListener("input", function(e) {
        if (e.target.name=="find") {
            let tbody = document.querySelector(".page.active table.td tbody");
            let regex = new RegExp("<span class=['\"]match['\"]>([^<>]*)</span>", "gi");
            tbody.innerHTML = tbody.innerHTML.replace(regex, "$1");
            regex = new RegExp("(?<=<td>[^<]*)(" + e.target.value + ")(?=[^>]*</td>)", "gi");
            tbody.innerHTML = tbody.innerHTML.replace(regex, "<span class='match'>$1</span>");

            let rows = tbody.querySelectorAll("tr");
            for (j = 0; j < rows.length; j++) {
                rows[j].classList.remove("filtered");
                if (!rows[j].querySelector("span.match") && e.target.value)
                    rows[j].classList.add("filtered");
            }
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

//	Набор страниц
function Pageset() {
    this.pages = [];
    this.pages.push(location.href);
}

//	Открытие заданной страницы
Pageset.prototype.open = function(href) {

    let active = this.pages.indexOf(href)+1;

    let crumb = document.querySelector("#breadcrumb .breadcrumb-item:nth-child("+ active +")");
    let container = document.querySelector("#pages .page:nth-child("+ active+ ")");//

    if (active<1) {
        this.pages.push(href);

        crumb = document.createElement("div");
        crumb.classList.add("breadcrumb-item");
        document.querySelector("#breadcrumb").appendChild(crumb);
        crumb.innerHTML = "<span>Загружается...</span>";
        crumb.innerHTML += "<a href=\""+href+"\">×</a>";

        container = document.createElement("div");
        container.classList.add("page");
        document.querySelector("#pages").appendChild(container);
        container.innerHTML = "<div class=\"informer\"></div>\n";
        container.innerHTML += "<a href=\""+href+"\" class=\"close\">×</a>";

        let informer = container.querySelector(".informer");
        let ok = false;
        let js = null;
        fetch(href, {
            headers: { 'accept': 'text/html' }

        }).then(function(response) {
            ok = response.ok;
            js  = response.headers.get('content-location');
            crumb.querySelector("span").innerText = decodeURIComponent(response.headers.get('etag'));
            return response.text();

        }).then(function(text) {
            if (!ok) throw new Error(text);
            text += "<a href=\""+href+"\" class=\"close\">×</a>";
            container.innerHTML = text;
            if (js) {
                let script = document.createElement("script");
                script.src = js;
                document.head.appendChild(script);
            }

        }).catch(function(error) {
            informer.innerText = error.message;
            informer.classList.add("warning");
        });

    }

    let oldcrumb = document.querySelector(".breadcrumb-item.active");
    if (oldcrumb) oldcrumb.classList.remove("active");
    crumb.classList.add("active");

    let oldcontainer = document.querySelector(".page.active");
    if (oldcontainer) oldcontainer.classList.remove("active");
    container.classList.add("active");

}

//  Открытие страницы деталей по идентификатору в таблице
Pageset.prototype.edit = function(action) {
    let id = document.querySelector(".page.active .formdata .active input[name=id]");
    if (action && id) this.open(action+"?id="+ id.value);
}

//  Запись данных активной страницы
Pageset.prototype.save = function(url, body) {
    let parameters = {
        headers: {
            'accept': 'application/json'
        }
    };
    if (body.tagName=="FORM") {
        parameters["method"] = "POST";
        parameters["body"] = new FormData(body);
    }

    let html = body.innerHTML;
    body.innerHTML = "";
    let informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(url, parameters
    ).then(function(response) {
        ok = response.ok;
        return response.text();

    }).then(function(text) {
        if (!ok) throw new Error(text);
        body.innerHTML = text;

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");
        body.innerHTML = html;
    });
}

//	Закрытие страницы
Pageset.prototype.close = function(href) {

    let index = this.pages.indexOf(href);
    this.pages.splice(index, 1);

    let crumbs = document.querySelectorAll("#breadcrumb .breadcrumb-item");
    if (crumbs[index].classList.contains("active"))
        crumbs[index - 1].classList.add("active");
    crumbs[index].remove();

    var containers = document.querySelectorAll("#pages .page");
    if (containers[index].classList.contains("active"))
        containers[index - 1].classList.add("active");
    containers[index].remove();

}