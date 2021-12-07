
let subscription = [];  // Глобальная переменная, чтобы был доступ извне
let settings = {};

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

            let symbol = document.querySelector(".page.active form input[name='id']");
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

            let address = document.getElementById("socket");
            socket = new WebSocket(address.value + source);

            socket.onopen = function () {
                body["method"] = "SUBSCRIBE";
                socket.send(JSON.stringify(body));
                subscription.push(symbol.value);
                button.innerText = "Выключить";
                interval = setInterval(tradeProgress, 1000);
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

                risk(json['s']);

            };

        }

    });

    nav.addEventListener("change", function(e) {

        let form = e.target.closest(".formdata");
        if (form) {
            let symbol = form.querySelector("input[name='id']");
            risk(symbol.value);
        }
    });

});


function bookLoad(loader) {

    let button = document.querySelector(".page.active .connector button");
    let symbol = document.querySelector(".page.active form input[name='id']");

    if (subscription.indexOf(symbol.value) > -1) {
        button.innerText = "Выключить";
        loader.parentNode.removeChild(loader);
        return;
    }

    initialSettings(symbol.value);

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
        if (json['trades'].length>0) {
            json['trades'].sort((x, y) => y['time'] - x['time']);
            settings[symbol.value]["price"] = json['trades'][0]["price"];
            risk(symbol.value);
        }

    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.parentNode.removeChild(loader);
 //     let ask = document.querySelector(".quotes ."+ symbol.value+ " .ask");
 //     ask.parentNode.parentNode.scrollTop = ask.scrollHeight - ask.parentNode.parentNode.clientHeight/2;
    });

}


function initialSettings(symbol) {

    if (settings[symbol]) return;

    const steps = document.querySelector(".page .trade."+symbol+" .formdata input[name='_depth']");
    const scale = document.querySelector(".page .trade."+symbol+" .formdata input[name='_scale']");
    const minPrice = document.querySelector(".page .trade."+symbol+" .formdata input[name='minPrice']");
    const pricePrecision = document.querySelector(".page .trade."+symbol+" .formdata input[name='pricePrecision']");
    const quantityPrecision = document.querySelector(".page .trade."+symbol+" .formdata input[name='quantityPrecision']");
    const full = document.querySelector(".page .trade."+symbol+" .formdata input[name='_full']");
    const base = document.querySelector(".page .trade."+symbol+" .formdata input[name='_base']");

    settings[symbol] = {
        "steps": steps.value,
        "scale": scale.value,
        "minPrice": minPrice.value,
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


function tradeLoad(loader) {

    const symbol = document.querySelector(".page.active form input[name='id']");

    initialSettings(symbol.value);

    const margin = {top: 10, right: 30, bottom: 30, left: 60},
        width = 460 - margin.left - margin.right,
        height = 400 - margin.top - margin.bottom;

    const svg = d3.select(".trade." + symbol.value + " .chart")
        .datum(symbol.value)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const form = document.querySelector(".trade." + symbol.value + " .formdata");
    const informer = document.querySelector(".page.active .informer");
    informer.classList.remove("warning");

    let ok = false;
    fetch(form.action, {
        headers: { 'accept': 'application/json' },

    }).then(function(response) {
        ok = response.ok;
        return ok? response.json(): response.text();

    }).then(function(json) {
        if (!ok) throw new Error(json);

        if (json.length==0) return;

        settings[symbol.value]["x"]
            .domain([0, 60])
            .range([ 0, width ]);
        svg.append("g")
            .attr("transform", "translate(0," + height + ")")
            .call(d3.axisBottom(settings[symbol.value]["x"]).ticks(4));

        let extent = d3.extent(json, d=>d.p);
        let tail = (extent[1]-extent[0]) / 0.9 * 0.05;

        settings[symbol.value]["y"]
            .domain([d3.min(json, d=>d.p)-tail, d3.max(json, d=>d.p)+tail])
            .range([ height, 0 ]);
        svg.append("g")
            .call(d3.axisLeft(settings[symbol.value]["y"]));

        for(l=0; l<json.length; l++) {
            let level = settings[symbol.value]["y"](json[l]["p"]);
            svg.append("line")
                .attr("x1", 0)
                .attr("y1", level)
                .attr("x2", width)
                .attr("y2", level)
                .attr("stroke", "darkred")
                .attr("stroke-width", "3px");
        }

        svg.append("path")
            .datum([])
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 2)
            .attr("d", "");


    }).catch(function(error) {
        informer.innerText = error.message;
        informer.classList.add("warning");

    }).finally(function() {
        loader.classList.add("inactive");
    });

}

function tradeProgress() {

    d3.selectAll(".page .trade .chart path:last-child").each(function(d, i) {

        const symbol = d3.select(this.closest("svg")).datum();
        if (subscription.indexOf(symbol)<0) return;

        d.push(settings[symbol]["price"]);
        const domain = settings[symbol]["x"].domain();
        if (d.length>domain[domain.length-1]) d.shift();

        d3.select(this).datum(d).attr("d", settings[symbol]["line"]);
    });

}


function risk(symbol) {

    const f = d3.format(settings[symbol]["priceFormat"]);

    let p = document.querySelector(".page .trade."+symbol+" .formdata input[name='price']");
    p.placeholder = f(settings[symbol]["price"]);
    let price = p.value? p.value: settings[symbol]["price"];

    let risk = document.querySelector(".page .trade."+symbol+" .formdata input[name='risk']");
    let deposit = document.querySelector(".page .trade."+symbol+" .formdata input[name='deposit']");
    let leverage = document.querySelector(".page .trade."+symbol+" .formdata input[name='leverage']");

    let sl_sell = document.querySelector(".page .trade."+symbol+" .formdata input[name='sl_sell']");
    let sl_buy = document.querySelector(".page .trade."+symbol+" .formdata input[name='sl_buy']");

    let span = risk.value/deposit.value/leverage.value;
    if (sl_sell.value || sl_buy.value) {
        span = d3.max([sl_sell.value-price, price-sl_buy.value]);
        deposit.value =  risk.value/leverage.value/span;
    }

    let hi = price*(1+span);
    let lo = price*(1-span);
    sl_sell.placeholder = f(hi);
    sl_buy.placeholder = f(lo);

    let tr = d3.select(".quotes." + symbol+ " table tbody").selectAll("tr");
    tr.selectAll("td div").attr("class", d=>(d[1]>hi || d[3]<lo? "sl": ""));
    tr.selectAll("td.amount").attr("class", d=>"amount"+ (d[1]>hi || d[3]<lo? " sl": ""));

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
        let median = d3.median(applicable, d=>d[1]);

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