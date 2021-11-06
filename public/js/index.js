
let subscription = [];  // Глобальная переменная, чтобы был доступ из symbols/show.js
let settings = {};

window.addEventListener("load", function(event) {

    let socket = null;
    let nav = document.getElementById("pages");
    nav.addEventListener("submit", function(e) {
        e.preventDefault();
        if (e.target.classList.contains("connector")) {

            let symbol = document.querySelector(".page.active form input[name='id']");
            let source = ""+ symbol.value.toLowerCase() + "@depth";
            let body = { "params": [""+ symbol.value.toLowerCase() + "@aggTrade"], "id": 1 };

            let button = e.target.querySelector("button");
            let informer = document.querySelector(".page.active .informer");
            informer.classList.remove("warning");
            informer.classList.remove("note");

            if (socket && socket.readyState==1) {

                let pos = subscription.indexOf(source);
                body["params"].push(source);
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

                if (subscription.length==0) {
                    socket.onerror = null;  // Chrome показывает ошибку во время закрытия, в Firefox все ок
                                            // (https://stackoverflow.com/questions/19304157/getting-the-reason-why-websockets-closed-with-close-code-1006/53340067#53340067)
                    socket.close();
                }
                return;
            }

            socket = new WebSocket("wss://fstream.binance.com/ws/" + source);
            socket.onopen = function () {
                body["method"] = "SUBSCRIBE";
                socket.send(JSON.stringify(body));
                subscription.push(source);
                button.innerText = "Выключить";
            };
            socket.onclose = function(e) {
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

                if (!json["e"]) return;

                if (json["e"]=="depthUpdate")
                    depth(json['a'], json['b'], json['s']);
                if (json["e"]=="aggTrade")
                    market(json['p'], json['q'], json['s']);
                let ask = document.querySelector(".quotes ."+ json['s']+ " .ask");
                ask.parentNode.parentNode.scrollTop = ask.scrollHeight - ask.parentNode.parentNode.clientHeight/2;

            };


        }
    });

});

function onimgload(loader) {

    let symbol = document.querySelector(".page.active form input[name='id']");
    let source = "" + symbol.value.toLowerCase() + "@depth";

    if (subscription.indexOf(source) > -1) {
        let button = document.querySelector(".page.active .connector button");
        button.innerText = "Выключить";
        loader.parentNode.removeChild(loader);
        return;
    }

    updateSettings(symbol.value);

    let form = document.querySelector(".page.active .connector");
    let informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(""+form.action+"?id="+symbol.value, {
        headers: {
            'accept': 'application/json'
        },

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);
        depth(json['asks'], json['bids'], symbol.value);

        let aggTrade = {"price": "-", "qty": 0};
        if (json['trades'].length>0) {
            json['trades'].sort((x, y) => y['time'] - x['time']);
            for (key in aggTrade)
                aggTrade[key] = json['trades'][0][key];
        }
        market(aggTrade["price"], aggTrade["qty"], symbol.value);

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.parentNode.removeChild(loader);
    });

}

function updateSettings(symbol) {

    const steps = document.querySelector(".page .formdata."+symbol+" input[name='_depth']");
    const scale = document.querySelector(".page .formdata."+symbol+" input[name='_scale']");
    const minPrice = document.querySelector(".page .formdata."+symbol+" input[name='minPrice']");
    const pricePrecision = document.querySelector(".page .formdata."+symbol+" input[name='pricePrecision']");
    const quantityPrecision = document.querySelector(".page .formdata."+symbol+" input[name='quantityPrecision']");
    const base = document.querySelector(".page .formdata."+symbol+" input[name='_base']");

    settings[symbol] = {
        "steps": steps.value,
        "scale": scale.value,
        "minPrice": minPrice.value,
        "priceFormat": ",."+pricePrecision.value+"f",
        "quantityFormat": ",."+quantityPrecision.value+"f",
        "base": base.value
    };

    const rus = {
        "decimal": ".",
        "thousands": "\u00a0",
        "grouping": [3],
        "currency": ["", "\u00a0руб."],
    };
    d3.formatDefaultLocale(rus);

}

function market(price, qty, symbol) {

    let tr = d3.select(".quotes ." + symbol + " .market").selectAll('tr').data([[price, qty]], d=>d[0]);

    let enter = tr.enter().append("tr");
    enter.append("td").attr('class', 'price').text(d=>d3.format(settings[symbol]["priceFormat"])(d[0]));
    enter.append("td").append("div").style("width", d => "" + (d[1] / settings[symbol]["base"] * 100) + "%");
    enter.append("td").attr('class', 'amount').text(d=>d3.format(settings[symbol]["quantityFormat"])(d[1]));

    tr.exit().remove();

}

function depth(asks, bids, symbol) {

    if (asks.length==0 && bids.length==0)
        throw new Error("Empty data");

    const diff = settings[symbol]["minPrice"] * settings[symbol]["scale"];
    const minStep = diff / settings[symbol]["steps"];

    let extentAsk = d3.extent(asks.filter(d=>d[1]>0), d=>+d[0]);
    let extentBid = d3.extent(bids.filter(d=>d[1]>0), d=>+d[0]);
    if (asks.length==0) extentAsk = [extentBid[1]+minStep, extentBid[1]+minStep];
    if (bids.length==0) extentBid = [extentAsk[0]-minStep, extentAsk[0]-minStep];
    let values = {"ask": extentAsk[0], "bid": extentBid[1]-diff};

    for(type in values) {

        let extent = [values[type], values[type]];
        values[type] = [];
        let quotes = asks.concat(bids);
        for (i=0; i<settings[symbol]["steps"]; i++) {
            extent = [extent[1], extent[1]+minStep];
            let thisQty = 0;
            for(j=0; j<quotes.length; j++) {
                if (quotes[j][0]>=extent[0] && quotes[j][0]<extent[1])
                    thisQty += +quotes[j][1];
            }
            values[type].push([d3.mean(extent), thisQty]);
        }

        values[type].sort((x, y) => y[0] - x[0]);

        let tr = d3.select(".quotes ." + symbol + " ." + type).selectAll('tr').data(values[type], d => d[0]);

        let enter = tr.enter().append("tr");
        enter.append("td").attr('class', 'price').text(d => d3.format(settings[symbol]["priceFormat"])(d[0]));
        enter.append("td").append("div").style("width", d => "" + (d[1] / settings[symbol]["base"] * 100) + "%");
        enter.append("td").attr('class', 'amount').text(d => d3.format(settings[symbol]["quantityFormat"])(d[1]));

        tr.exit().remove();

    }

}