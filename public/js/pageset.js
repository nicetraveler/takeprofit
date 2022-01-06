//	Набор страниц
function Pageset(initialpage) {
    this.pages = [];
    this.pages.push(initialpage);
    this.freeze = false;
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

    if (this.freeze) return;

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