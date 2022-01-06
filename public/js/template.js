window.onload = init;
const pages = new Pageset(location.href);   // для доступа в posLoad()

function init() {

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

    let menu = document.getElementById("bg-1c");
    menu.addEventListener("click", function (e) {
        e.preventDefault();

        if(e.target.classList.contains("action")) {
            let popups = document.querySelectorAll("#view .popup");
            for (a=0; a<popups.length; a++)
                popups[a].classList.remove("active");

            let selected = e.target.classList.contains("active");

            let li = menu.querySelectorAll("a");
            for (j = 0; j <li.length; j++)
                li[j].classList.remove("active");

            if (selected) return;
            e.target.classList.add("active");

            let popup = document.querySelector("#view .popup."+e.target.target);
            if (!popup) {
                popup = document.createElement("div");
                popup.classList.add("popup", e.target.target);
                let view = document.getElementById("view");
                view.prepend(popup);
            }
            popup.classList.add("active");
            fill(popup, e.target);
        }

    });

    let view = document.getElementById("view");
    view.addEventListener("change", function(e) {

        risk(e.target.closest(".formdata"), 0);

    });

    view.addEventListener("submit", function(e) {

        if (e.target.classList.contains("cmd")) {
            e.preventDefault();

            let body = new FormData();
            let popup = e.target.closest(".popup");
            let formdata = popup.querySelectorAll(".formdata input");
            for(x=0; x<formdata.length; x++)
                body.set(formdata[x].name, formdata[x].value);

            popup.innerHTML = "";
            let ok = false;
            fetch(e.target.action, {
                headers: {
                    'accept': 'application/json',
                },
                "method": "POST",
                "body": body

            }).then(function(response) {
                ok = response.ok;
                return response.text();

            }).then(function(text) {
                if (!ok) throw new Error(text);
                popup.innerHTML = text;
                risk(popup, 0);

            }).catch(function(error) {
                popup.innerHTML = error.message;
            });
        }

    });

    userStream();

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
            let form = document.querySelector(".page.active .formdata");
            let symbol = form.querySelector("input[name='id']");
            let on = form.querySelector("input[name='switch']");
            pin(symbol.value, !on.checked);

            e.target.previousSibling.checked = !e.target.previousSibling.checked;
            let input = form.querySelectorAll("input[name^='_']");
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
        if (!tbody) return;

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

}

function userStream() {

console.log("key requested");
    let userdata = document.getElementById("userdata");

    fetch(userdata.action, {
        method: "GET",
        headers: {'accept': 'application/json'},

    }).then(function (response) {
        return response.json();

    }).then(function (json) {

        let balance = document.getElementById("balance");
        balance.value = json["balance"].join(", ");

        let url = document.getElementById("socket");
        url.value = json["socket"];

console.log("key received");
        if (json["listenKey"]) {
            let socket = new WebSocket(url.value + json["listenKey"]);
console.log("socket initialized");
            socket.onopen = function() { console.log("user data stream open"); }
            socket.onclose = function() { console.log("user data stream close"); }
            socket.onerror = function() { console.log("user data stream error"); }

            socket.addEventListener("message", function (event) {

                let json = JSON.parse(event.data);
                if (json["e"] && json["e"] == "listenKeyExpired") {
                    socket.close();
                    userStream();
                    return;
                }

                updateStrategy(json);
                window.postMessage(event.data, window.location.href);

            });

        }

    });
}

function fill(popup, source) {

    let formdata = popup.querySelector(".formdata");
    if(formdata) return;
    popup.innerText = "Загружается...";

    let ok = false;
    fetch(source.parentNode.action+"?id="+source.target, {
        method: "GET",
        headers: { 'accept': 'application/json' },

    }).then(function(response) {
        ok = response.ok;
        return response.text();

    }).then(function(text) {
        if (!ok) throw new Error(text);
        popup.innerHTML = text;
        risk(popup, 0);

    }).catch(function(error) {
        popup.innerText = error.message;

    });
}

function pin(symbol, sync) {

    const menu = document.getElementById("bg-1c");
    let a = menu.querySelector("a[target='"+symbol+"']");
    if (a && !sync) menu.removeChild(a);
    if (a || !sync) return;
    a = document.createElement("a");
    a.href = menu.action+ "?id="+symbol;
    a.target = symbol;
    a.classList.add("action");
    a.innerText = symbol;
    menu.prepend(a);
}

function risk(form, marketPrice) {

    const pricePrecision = form.querySelector("input[name='pricePrecision']");
    const f = d3.format(",."+pricePrecision.value+"f");

    let p = form.querySelector("input[name='price']");
    if (!p) return;
    p.placeholder = f(marketPrice);
    let price = p.value? p.value: marketPrice;

    let risk = form.querySelector("input[name='_risk']");
    let deposit = form.querySelector("input[name='deposit']");
    let leverage = form.querySelector("input[name='_leverage']");

    let notional = form.querySelector("input[name='notional']");
    let stepsize = form.querySelector("input[name='stepSize']");
    let q = form.querySelector("input[name='quantity']");
    q.placeholder = Math.ceil(notional.value / price / stepsize.value) * stepsize.value;
    deposit.placeholder = q.placeholder * price / leverage.value;

    let sl_sell = form.querySelector("input[name='sl_sell']");
    let sl_buy = form.querySelector("input[name='sl_buy']");

    let span = risk.value / (deposit.value? deposit.value: deposit.placeholder) / leverage.value;
    if (sl_sell.value || sl_buy.value) {
        span = d3.max([sl_sell.value-price, price-sl_buy.value]);
    }
    q.value = Math.round(risk.value / span / price / stepsize.value) * stepsize.value;
    deposit.value = q.value * price / leverage.value;

    let hi = price*(1+span);
    let lo = price*(1-span);
    sl_sell.placeholder = f(hi);
    sl_buy.placeholder = f(lo);

    let symbol = form.querySelector("input[name='id']");
    let tr = d3.select(".quotes." + symbol.value+ " table tbody").selectAll("tr");
    tr.selectAll("td div").attr("class", d=>(d[1]>hi || d[3]<lo? "sl": ""));
    tr.selectAll("td.amount").attr("class", d=>"amount"+ (d[1]>hi || d[3]<lo? " sl": ""));

}

function updateStrategy(event) {
    const handle = document.getElementById("event-handler");

    fetch(handle.action, {
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json'
        },
        method: "POST",
        body: JSON.stringify(event)
    });
}

function posLoad(source, loader) {

    let informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(source, {
        headers: { 'accept': 'application/json' },

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);

        let breadcrumb = document.getElementById("breadcrumb");
        pages.freeze = true;
        for(c=0; c<json.length; c++)
            pages.open(breadcrumb.action+"?id="+json[c]);
        pages.freeze = false;

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.parentNode.removeChild(loader);
    });
}