<?php
//информация об аккаунте
namespace Controllers;

use Classes\Application;

class Account
{
    private const WSS_ADDRESS = "wss://fstream.binance.com/ws/";
    private const URL_KEY = "https://fapi.binance.com/fapi/v1/listenKey";
    private const URL_BALANCE = "https://fapi.binance.com/fapi/v2/balance";
    private const URL_POSITIONS = "https://fapi.binance.com/fapi/v2/positionRisk";
    private const URL_OPENORDERS = "https://fapi.binance.com/fapi/v1/openOrders";
    private const URL_LEVERAGE = "https://fapi.binance.com/fapi/v1/leverageBracket";
    private const URL_TRADES = "https://fapi.binance.com/fapi/v1/trades?limit=500";
    private const URL_ORDER = "https://fapi.binance.com/fapi/v1/order";
    private const URL_ORDERS = "https://fapi.binance.com/fapi/v1/batchOrders";

    private \Models\Account $orders;

    private function secure($params=[])
    {
        $response = array(
            "header"=> "",
            "signature"=> "",
            "totalParams"=> http_build_query(
                array_merge($params, ["timestamp"=> time()*1000])     // все параметры queryString и requestBody
            ),
        );

        $access = new \Models\Access();
        foreach($access->get(Application::$instance->token) as $row) {
            $response["header"] = "X-MBX-APIKEY: ". $row["_apikey"];
            $response["signature"] = hash_hmac('sha256', $response["totalParams"], $row["_secret"]);
        }

        return $response;
    }

    public function init()
    {
        $response = array("socket"=> self::WSS_ADDRESS, "balance"=> []);

        $security = self::secure();
        if ($security["header"] && $security["signature"]) {
            $key = Application::$instance->curl(self::URL_KEY . "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);
            $response["listenKey"] = $key["listenKey"];

            $balances = Application::$instance->curl(self::URL_BALANCE . "?{$security["totalParams"]}&signature={$security["signature"]}", [$security["header"]]);
            foreach ($balances as $balance)
                if ($balance["balance"] > 0)
                    $response["balance"][] = $balance["balance"] . " " . $balance["asset"];
            }

        Application::$instance->params["RESPONSE"] = json_encode($response);
    }

    public function process($order)
    {
        $orders = new \Models\Account($order["id"], Application::$instance->token);
        $this->fill($orders->settings);

    }

    private function fill($settings)
    {
        Application::$instance->title = $settings['_name']?? $settings['pair'];
        Application::$instance->params["TITLE"]  = $settings['pair'];
        Application::$instance->params["SYMBOL"]  = $settings['symbol'];

        $cols = ["pricePrecision", "quantityPrecision", "minPrice", "tickSize", "minQty", "stepSize", "notional",
            "base", "depth", "scale", "full"];
        Application::$instance->params["USERFIELDS"] = "";
        foreach($cols as $key)
            Application::$instance->params["USERFIELDS"] .= "<input type='hidden' name='{$key}' value='{$settings[$key]}'>\n";
    }

    private function price($symbol)
    {
        $trades = Application::$instance->curl(self::URL_TRADES. "&symbol=". $symbol);
        usort($trades, function($x, $y) { return $y['time'] > $x['time']; });
        return $trades[0]["price"];
    }

    public function position($symbol=[])
    {

        if (!array_key_exists("id", $symbol)) {
            $lines = array();
            $security = self::secure();
            if ($security["header"] && $security["signature"]) {
                $positions = Application::$instance->curl(self::URL_POSITIONS. "?{$security["totalParams"]}&signature={$security["signature"]}", [$security["header"]]);
                foreach($positions as $position)
                    if ($position["entryPrice"]>0)
                        $lines[] = $position["symbol"];
            }
            Application::$instance->params["RESPONSE"]  = json_encode($lines);
            return;
        }

        $lines = array("price"=> 0, "position"=> ["p"=> 0, "q"=> 0], "orders"=> []);

        $lines["price"] = $this->price($symbol["id"]);

        $security = self::secure(["symbol"=>$symbol["id"]]);
        if ($security["header"] && $security["signature"]) {

            $positions = Application::$instance->curl(self::URL_POSITIONS. "?{$security["totalParams"]}&signature={$security["signature"]}", [$security["header"]]);
            foreach($positions as $position) {
                if ($position["symbol"]!=$symbol["id"]) continue;
                $lines["position"] = ["p"=> $position["entryPrice"], "q"=> $position["positionAmt"]];
            }

            $orders = Application::$instance->curl(self::URL_OPENORDERS. "?{$security["totalParams"]}&signature={$security["signature"]}", [$security["header"]]);
            foreach($orders as $order) {
                $price = $order["type"] == "STOP_MARKET" ? $order["stopPrice"] : $order["price"];
                $lines["orders"][] = ["i"=> $order["orderId"], "y"=> $price, "s"=> $order["side"]];
            }

        }

        Application::$instance->params["RESPONSE"] = json_encode($lines);
    }

    public function order($order)
    {
        $orders = new \Models\Account($order["id"], Application::$instance->token);

        if (array_key_exists("side", $order)) {

            $order = array_merge($orders->settings, $order);

            $span = $order["_risk"] / $order["deposit"] / $order["_leverage"];
            $price = $order["price"] > 0 ? $order["price"] : $order["deposit"] * $order["_leverage"] / $order["quantity"];
            $sl = $order["side"] == "BUY" ? $order["sl_buy"] : $order["sl_sell"];
            if ($sl) $span = $price - $sl;
            $order["_ticks"] = $span / $orders->settings["tickSize"];

            $orders->settings($order);

            $open = array(
                "symbol" => $order["id"],
                "side" => $order["side"],
                "type" => $order["price"] ? "LIMIT" : "MARKET",
                "quantity" => round($order["quantity"], $order["quantityPrecision"]),
            );
            if ($order["price"] > 0) {
                $open["price"] = round($order["price"], $order["pricePrecision"]);
                $open["timeInForce"] = "GTC"; // good till cancelled
            };
            $security = self::secure($open);
            Application::$instance->curl(self::URL_ORDER . "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);

        }

        $this->fill($orders->settings);
        if (!$orders->settings['_leverage']) {
            $security = self::secure(["symbol"=> $orders->settings["symbol"]]);
            if ($security["header"] && $security["signature"]) {
                $response = Application::$instance->curl(self::URL_LEVERAGE . "?{$security["totalParams"]}&signature={$security["signature"]}", [$security["header"]]);
                $orders->settings['_leverage'] = $response[0]["brackets"][0]["initialLeverage"];
            }
        }

        Application::$instance->params["RISK"] = $orders->settings['_risk'];
        Application::$instance->params["LEVERAGE"] = $orders->settings['_leverage'];

        Application::$instance->params["PRICE"] = $this->price($order["id"]);

    }

    public function event($event)
    {
        if ($event["e"]=="ORDER_TRADE_UPDATE") {
            $orders = new \Models\Account($event["o"]["s"], Application::$instance->token);
            if (empty($orders->find(["orderId" => $event["o"]["i"]]))) $orders->insert($event["o"]);
            $orders->update($event["o"]);

        } elseif($event["e"]=="ACCOUNT_UPDATE" && $event["a"]["m"]=="ORDER") {
            foreach($event["a"]["P"] as $item) $this->control($item);
        }

        Application::$instance->params["RESPONSE"] = null;
    }

    private function control($position)
    {
        $orders = new \Models\Account($position["s"], Application::$instance->token);

 //      cancel outdated orders
        $filter = array(
            "symbol"=> $position["s"],
            "status"=> "NEW",
        );
        if ($position["pa"]>0) $filter["side"] = "SELL"; // q>0=> LONG open
        if ($position["pa"]<0) $filter["side"] = "BUY";  // q<0=> SHORT open
        $batch = array(
            "symbol"=> $position["s"],
            "orderIdList"=> [],
        );
         foreach($orders->find($filter) as $val)
            $batch["orderIdList"][] = $val["orderId"];
        if (!empty($batch["orderIdList"])) {
            $batch["orderIdList"] = json_encode($batch["orderIdList"]);
            $security = self::secure($batch);
            Application::$instance->curl(self::URL_ORDERS. "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"], "DELETE");
        }

        if ($position["ep"]>0) {
            $span = $orders->settings["_ticks"] * $orders->settings["tickSize"] * ($position["pa"]>0? 1: -1);
            $tickprice = round($position["ep"] / $orders->settings["tickSize"]) * $orders->settings["tickSize"];

            // new order stoploss
            $stop = array(
                "symbol"=> $position["s"],
                "side"=> $position["pa"]>0? "SELL": "BUY",
                "type"=> "STOP_MARKET",
                "stopPrice"=> round( $position["ep"] - $span, $orders->settings["pricePrecision"]),
                "closePosition"=> "true",
            );
            $security = self::secure($stop);
            Application::$instance->curl(self::URL_ORDER. "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);

            // new order takeprofit
            $profit = array(
                "symbol"=> $position["s"],
                "side"=> $position["pa"]>0? "SELL": "BUY",
                "type"=> "LIMIT",
                "quantity"=> round( abs($position["pa"]) / 2, $orders->settings["quantityPrecision"]),
                "price"=> round( $tickprice + $span * 3, $orders->settings["pricePrecision"]),
                "timeInForce" => "GTC",
                "reduceOnly"=> "true",
            );

            $security = self::secure($profit);
            Application::$instance->curl(self::URL_ORDER. "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);
        }

        //          $safe = array(
        //             "symbol"=> $order["id"],
        //             "side"=> $order["side"]=="BUY"? "SELL": "BUY",
        //             "type"=> "STOP",
        //             "price"=> round($price * 0.06 * ($order["side"]=="BUY"? 1: -1), $order["pricePrecision"]),
        //            "stopPrice"=> round($price + ($price-$sl), $order["pricePrecision"]),
        //            "closePosition"=> "true",
        //         );
        //        $security = self::secure($safe);
        //       Application::$instance->curl(self::URL_ORDER. "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);

        //        $trail = array(
        //            "symbol"=> $order["id"],
        //            "side"=> $order["side"]=="BUY"? "SELL": "BUY",
        //           "type"=> "TRAILING_STOP_MARKET",
        //           "activationPrice"=> round($price + ($price-$sl) * 3, $order["pricePrecision"]),
        //           "callbackRate"=> 1,
        //           "closePosition"=> "true",
        //       );
        //       $security = self::secure($trail);
        //      Application::$instance->curl(self::URL_ORDER. "?signature={$security["signature"]}", [$security["header"]], $security["totalParams"]);
    }
}