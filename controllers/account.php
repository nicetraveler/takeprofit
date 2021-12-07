<?php
//информация об аккаунте
namespace Controllers;

use Classes\Application;

class Account
{
    private const SOCKET_ADDRESS = "wss://fstream.binance.com/ws/";
    private const SOCKET_KEY = "https://fapi.binance.com/fapi/v1/listenKey";
    private const ACCOUNT_INFO = "https://fapi.binance.com/fapi/v2/account";

    public static function key($token="")
    {
        Application::$instance->params["SOCKET"] = self::SOCKET_ADDRESS;

        $totalParams = http_build_query(["timestamp"=> time()*1000]);   // все параметры queryString и requestBody
        $header = "";
        $signature = "";
        $access = new \Models\Access();
        foreach($access->get($token) as $row) {
            $header = "X-MBX-APIKEY: ". $row["_apikey"];
            $signature = hash_hmac('sha256', $totalParams, $row["_secret"]);
        }

        if (!$header || !$signature) return;

        $response = Application::$instance->curl(self::SOCKET_KEY. "?signature={$signature}", [$header], $totalParams);
        Application::$instance->params["KEY"] = $response["listenKey"];

        $response = Application::$instance->curl(self::ACCOUNT_INFO. "?{$totalParams}&signature={$signature}", [$header]);
        Application::$instance->params["WALLET"] = $response["totalWalletBalance"];
    }

    public function position($formdata)
    {
        $orders = array();
        $orders[] = ["p"=> 1.4499, "q"=> 0.001];
        $orders[] = ["p"=> 1.4444, "q"=> 0.004];
        Application::$instance->params["RESPONSE"] = json_encode($orders);
    }

    public function order($order)
    {

    }
}