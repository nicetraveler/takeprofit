
let subscription = [];  // Глобальная переменная, чтобы был доступ извне
let settings = {};

window.addEventListener("message", function(event) {

    let json = event.data;
    try {
        json = JSON.parse(event.data);
    } catch (e) {
        return;     // не наше сообщение
    }

    if (!json["e"]) {
        console.log(json);
        return;
    }

    if (json["e"]=="ORDER_TRADE_UPDATE" && settings[json["o"]["s"]]) {
        let order = json["o"];
        let level = 0;
        let color = "darkblue";
        if (order["x"]=="NEW") {
            level = order["o"] == "STOP_MARKET" ? order["sp"] : order["p"];
            if (settings[order["s"]]["side"]!=order["S"] && order["S"]=="BUY")
                color = level>settings[order["s"]]["price"]? "darkred": "darkgreen";
            if (settings[order["s"]]["side"]!=order["S"] && order["S"]=="SELL")
                color = level<settings[order["s"]]["price"]? "darkred": "darkgreen";
        }
        addLine(order["s"], {"i": order["i"], "y": level, "s": color});
        adjustAxis(order["s"]);
    }

    if (json["e"]=="ACCOUNT_UPDATE") {

        for (i=0; i<json["a"]["P"].length; i++) {
            let position = json["a"]["P"][i];
            if(! settings[position["s"]]) continue;
            let level = 0;
            let color = "darkblue";
            if (position["pa"]!=0) {
                level = position["ep"];
                settings[position["s"]]["side"] = position["pa"]<0? "SELL": "BUY";
            }
            addLine(position["s"], {"i": 0, "y": level, "s": color});
            adjustAxis(position["s"]);
        }

     }


});

window.addEventListener("load", function(event) {

    let socket = null;
    let interval = null;

    let nav = document.getElementById("pages");
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

    nav.addEventListener("submit", function(e) {

        if (e.target.classList.contains("connector")) {

            let button = e.target.querySelector("button");
            let informer = document.querySelector(".page.active .informer");
            informer.classList.remove("warning");

            let symbol = document.querySelector(".page.active .settings input[name='id']");
            let source = "" + symbol.value.toLowerCase() + "@depth";
            let body = { "params": [""+ symbol.value.toLowerCase() + "@aggTrade"], "id": 1 };

            if (socket && socket.readyState==1) {

                let pos = subscription.indexOf(symbol.value);
                body["params"].push(source);
                if (pos<0) {
                    body["method"] = "SUBSCRIBE";
                    socket.send(JSON.stringify(body));
                    subscription.push(symbol.value);
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

            let address = document.querySelector("#userdata input[name='socket']");
            socket = new WebSocket(address.value + source);

            socket.onopen = function () {
                body["method"] = "SUBSCRIBE";
                socket.send(JSON.stringify(body));
                subscription.push(symbol.value);
                button.innerText = "Выключить";
                interval = setInterval(chartProgress, 1000);
            };

            socket.onclose = function(e) {
                clearInterval(interval);
                console.log("quit");
            }

            socket.onmessage = function (event) {
                let json = JSON.parse(event.data);
                if ("error" in json) {
                    informer.innerText = json.error.msg;
                    informer.classList.add("warning");
                    return;
                }

                if (!json["e"]) return;

                if (json["e"]=="depthUpdate")
                    depth(json['a'], json['b'], json['s']);
                if (json["e"]=="aggTrade")
                    settings[json['s']]["price"] = json['p'];

//              risk(json['s']);

            };

        }

    });

});

function bookLoad(source, symbol, loader) {

    let button = document.querySelector(".commandbar."+symbol+" .connector button");

    if (subscription.indexOf(symbol) > -1) {
        button.innerText = "Выключить";
        loader.parentNode.removeChild(loader);
        return;
    }

    initialSettings(symbol);

    let informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(source + "?id=" + symbol, {
        headers: {
            'accept': 'application/json'
        },

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);

        depth(json['asks'], json['bids'], symbol);

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.parentNode.removeChild(loader);
        //     let ask = document.querySelector(".quotes ."+ symbol.value+ " .ask");
        //     ask.parentNode.parentNode.scrollTop = ask.scrollHeight - ask.parentNode.parentNode.clientHeight/2;
    });

}


function chartLoad(source, symbol, loader) {

    initialSettings(symbol);

    const diff = settings[symbol]["tickSize"] * settings[symbol]["scale"];

    const margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select(".chart." + symbol + " .chart")
        .datum(symbol)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    settings[symbol]["x"]
        .domain([0, 60])
        .range([ 0, width ]);

    settings[symbol]["y"]
        .range([ height, 0 ]);

    const informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(source + "?id=" + symbol, {
        headers: { 'accept': 'application/json' },

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);

        settings[symbol]["price"] = json["price"];

        if (json["position"]["p"]>0) {
            addLine(symbol, {"i": 0, "y": json["position"]["p"], "s": "darkblue"});
            settings[symbol]["side"] = json["position"]["q"]<0? "SELL": "BUY";
        }

        for(l=0; l<json["orders"].length; l++) {
            let order = json["orders"][l];
            let color = "darkblue";
            if (settings[symbol]["side"]!=order["s"] && order["s"]=="BUY")
                color = order["y"]>settings[symbol]["price"]? "darkred": "darkgreen";
            if (settings[symbol]["side"]!=order["s"] && order["s"]=="SELL")
                color = order["y"]<settings[symbol]["price"]? "darkred": "darkgreen";
            addLine(symbol, {"i": order["i"], "y": order["y"], "s": color});
        }

        adjustAxis(symbol);

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.classList.add("inactive");

        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(settings[symbol]["x"]).ticks(4));

        svg.append("g")
            .attr("class", "adjustable")
            .call(d3.axisLeft(settings[symbol]["y"]));

        svg.append("path")
            .datum([])
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", "");
    });

}


function initialSettings(symbol) {

    if (settings[symbol]) return;

    const steps = document.querySelector(".page .settings."+symbol+" input[name='depth']");
    const scale = document.querySelector(".page .settings."+symbol+" input[name='scale']");
    const tickSize = document.querySelector(".page .settings."+symbol+" input[name='tickSize']");
    const pricePrecision = document.querySelector(".page .settings."+symbol+" input[name='pricePrecision']");
    const quantityPrecision = document.querySelector(".page .settings."+symbol+" input[name='quantityPrecision']");
    const full = document.querySelector(".page .settings."+symbol+" input[name='full']");
    const base = document.querySelector(".page .settings."+symbol+" input[name='base']");

    settings[symbol] = {
        "steps": steps.value,
        "scale": scale.value,
        "tickSize": tickSize.value,
        "priceFormat": ",."+pricePrecision.value+"f",
        "quantityFormat": ",."+quantityPrecision.value+"f",
        "full": full.value==1,
        "base": base.value
    };

    const rus = {
        "decimal": ".",
        "thousands": "\u00a0",
        "grouping": [3],
        "currency": ["", "\u00a0руб."],
    };
    d3.formatDefaultLocale(rus);

    settings[symbol]["x"] = d3.scaleLinear();
    settings[symbol]["y"] = d3.scaleLinear();
    settings[symbol]["line"] = d3.line()
        .x((d,i) => settings[symbol]["x"](i))
        .y((d,i) => settings[symbol]["y"](d));

}


function addLine(symbol, coords) {

    const svg = d3.select(".chart." + symbol + " .chart>g");
    const range = settings[symbol]["x"].range();
    let levels = svg.selectAll("line.level").data();
    levels = levels.filter(v=> v.i!=coords.i);
    if (coords.y>0) levels.push(coords);

    let lines = svg.selectAll("line.level").data(levels);

    svg.selectAll("line.level").data(levels).enter().append("line")
        .attr("class", "level")
        .attr("x1", 0)
        .attr("x2", range[range.length - 1])
        .attr("stroke", d=>d.s)
        .attr("stroke-dasharray", d=> d.i==0? "": "10 10")
        .attr("stroke-width", 1);

    lines.exit().remove();

}


function adjustAxis(symbol) {

    const svg = d3.select(".chart." + symbol + " .chart>g");
    let domain = settings[symbol]["y"].domain();

    const diff = settings[symbol]["tickSize"] * settings[symbol]["scale"];
    let extension = [settings[symbol]["price"] - diff, +settings[symbol]["price"] + diff];

    let levels = svg.selectAll("line.level").data();
    if (levels.length>0) {
        let spread = d3.extent(levels, d=>+d.y);
        let tail = (spread[1]-spread[0]) / 0.9 * 0.05;
        extension.push(d3.min(levels, d=>d.y-tail));
        extension.push(d3.max(levels, d=>+d.y+tail));
     }

    settings[symbol]["y"].domain(d3.extent(extension));

    svg.selectAll("line.level")
        .attr("y1", d=> settings[symbol]["y"](d.y))
        .attr("y2", d=> settings[symbol]["y"](d.y))

    svg.select("g.adjustable")
        .call(d3.axisLeft(settings[symbol]["y"]));

}


function chartProgress() {

    d3.selectAll(".page .chart .chart>g>path").each(function(d, i) {

        const symbol = d3.select(this.closest("svg")).datum();
        if (subscription.indexOf(symbol)<0) return;

        d.push(settings[symbol]["price"]);
        const domain = settings[symbol]["x"].domain();
        if (d.length>domain[domain.length-1]) d.shift();

        d3.select(this).datum(d).attr("d", settings[symbol]["line"]);

        let levels = document.querySelectorAll(".chart."+ symbol+ " .chart>g>line");
        if (levels.length==0) adjustAxis(symbol);
    });

}


function depth(asks, bids, symbol) {

    if (asks.length==0 && bids.length==0)
        throw new Error("Empty data");

    const diff = settings[symbol]["tickSize"] * settings[symbol]["scale"];
    const minStep = diff / settings[symbol]["steps"];

    let extentAsk = d3.extent(asks.filter(d=>d[1]>0), d=>+d[0]);
    let extentBid = d3.extent(bids.filter(d=>d[1]>0), d=>+d[0]);
    if (asks.length==0) extentAsk = [extentBid[1]+minStep, extentBid[1]+minStep];
    if (bids.length==0) extentBid = [extentAsk[0]-minStep, extentAsk[0]-minStep];

    let values = [];
    let quotes = asks.concat(bids);
    let extent = {"ask": [0, extentAsk[0]], "bid": [extentBid[1], 0]};

    for (i=0; i<settings[symbol]["steps"]; i++) {

        extent["ask"] = [extent["ask"][1], extent["ask"][1] + minStep];
        extent["bid"] = [extent["bid"][0] - minStep, extent["bid"][0]];
        let qty = {"ask": 0, "bid": 0};
        for (type in extent) {
            for (j = 0; j < quotes.length; j++) {
                if (quotes[j][0] >= extent[type][0] && quotes[j][0] < extent[type][1])
                    qty[type] += +quotes[j][1];
            }
        }

        if (!settings[symbol]["full"] && qty["ask"]+qty["bid"]==0) continue;
        values.push([i, d3.mean(extent["ask"]), qty["ask"], d3.mean(extent["bid"]), qty["bid"]]);

        let applicable = quotes.filter(d=> extentAsk[0]+diff>=d[0] && d[0]>=extentBid[1]-diff);
        let median = d3.median(applicable, d=>d[1]);    // среднее количество

    }

    let tr = d3.select(".quotes." + symbol+ " table tbody").selectAll("tr").data(values, d=>d);

    let enter = tr.enter().append("tr");
    enter.append("td").attr('class', d=>"price"+ (d[2]>0? " ask": "")).text(d => d3.format(settings[symbol]["priceFormat"])(d[1]));
    enter.append("td").append("div").style("width", d => "" + (d[2] / settings[symbol]["base"] * 100) + "%");
    enter.append("td").attr('class', "amount").text(d => d[2]>0? d3.format(settings[symbol]["quantityFormat"])(d[2]): "-");
    enter.append("td").attr('class', "amount").text(d => d[4]>0? d3.format(settings[symbol]["quantityFormat"])(d[4]): "-");
    enter.append("td").append("div").style("width", d => "" + (d[4] / settings[symbol]["base"] * 100) + "%");
    enter.append("td").attr('class', d=>"price"+ (d[4]>0? " bid": "")).text(d => d3.format(settings[symbol]["priceFormat"])(d[3]));

    tr.exit().remove();

}