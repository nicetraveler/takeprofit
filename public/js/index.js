
let subscription = [];  // Глобальная переменная, чтобы был доступ из symbols/show.js

window.addEventListener("load", function(event) {

    let socket = null;
    let nav = document.getElementById("pages");
    nav.addEventListener("submit", function(e) {
        e.preventDefault();
        if (e.target.classList.contains("connector")) {

            let symbol = document.querySelector(".page.active form input[name=id]");
            let source = ""+ symbol.value.toLowerCase() + "@depth";

            let button = e.target.querySelector("button");
            let informer = document.querySelector(".page.active .informer");
            informer.classList.remove("warning");
            informer.classList.remove("note");

            if (socket && socket.readyState==1) {

                let body = { "params": [source], "id": 1 };
                let pos = subscription.indexOf(source);
                if (pos<0) {
                    body["method"] = "SUBSCRIBE";
                    socket.send(JSON.stringify(body));
                    subscription.push(source);
                    button.innerText = "Выключить";
                } else {
                    body["method"] = "UNSUBSCRIBE";
                    socket.send(JSON.stringify(body));
                    subscription.splice(pos, 1);
                    button.innerText = "Включить";
                }

                if (subscription.length==0) socket.close();
                return;
            }

            socket = new WebSocket("wss://fstream.binance.com/ws/" + source);
            socket.onopen = function () {
                subscription.push(source);
                button.innerText = "Выключить";
            };
            socket.onclose = function() {
                console.log("quit");
            }
            socket.onerror = function (error) {
                informer.innerText = "WebSocket connection to 'wss://fstream.binance.com/ws/"+ source+ "' failed";
                informer.classList.add("warning");
            };

            socket.onmessage = function (event) {
                let json = JSON.parse(event.data);
                if ("error" in json) {
                    informer.innerText = json.error.msg;
                    informer.classList.add("note");
                    return;
                }

                depth(json['a'], 'ask', json['s']);
                depth(json['b'], 'bid', json['s']);
                let ask = document.querySelector(".quotes ."+ json['s']+ " .ask");
                ask.parentNode.parentNode.scrollTop = ask.scrollHeight - ask.parentNode.parentNode.clientHeight/2;

            };


        }
    });

});

function onimgload(loader) {

    let symbol = document.querySelector(".page.active form input[name=id]");
    let source = "" + symbol.value.toLowerCase() + "@depth";

    if (subscription.indexOf(source) > -1) {
        let button = document.querySelector(".page.active .connector button");
        button.innerText = "Выключить";
        loader.parentNode.removeChild(loader);
        return;
    }

    let form = document.querySelector(".page.active .snapshot");
    let informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(form.action, {
        method: "POST",
        headers: {
            'accept': 'application/json'
        },
        body: new FormData(form)

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);
        depth(json['asks'], 'ask', symbol.value);
        depth(json['bids'], 'bid', symbol.value);

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.parentNode.removeChild(loader);
    });

}

function depth(values, type, symbol) {

    let input = d3.select(".quotes ."+symbol+ " ."+type)
        .selectAll('tr').data(values, d=>d[0]).enter().append("tr");
    input.append("td").attr('class', 'price').text(d=>d[0]);
    let base = 1;
    input.append("td").append("div").style("width", d=> ""+ (d[1]/base*100)+ "%");
    input.append("td").attr('class', 'amount').text(d=>d[1]);

    let output = d3.select(".quotes ."+symbol+ " ."+type).selectAll('tr');
    output.sort((x,y)=> y[0]-x[0]);
    output.filter(d=>+d[1]==0).remove();

}