<?php
//обновление символов
namespace Controllers;

use Classes\Application;

class Symbols
{
    private const EXCHANGE_INFO = "https://testnet.binancefuture.com/fapi/v1/exchangeInfo";
    private const SERVER_TIME = "https://testnet.binancefuture.com/fapi/v1/time";

    public function process()
    {
        Application::$instance->params["SYMBOLS"] = "Символы на 16.09.2021";
        Application::$instance->params["UPDATE"] = "Обновлено: 16.09.2021 15:00:14";
    }

    public function update($data)
    {
 //       $response = $this->request(self::EXCHANGE_INFO);
 //       $symbols = new \Models\Symbols($response["symbols"]);

 //       $response = $this->request(self::SERVER_TIME);
 //       $symbols->sync(round($response["serverTime"]/1000));

    }
}