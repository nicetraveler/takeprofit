<?php
//обновление символов
namespace Controllers;

class Symbols extends \Classes\Controller
{
    private const EXCHANGE_INFO = "https://testnet.binancefuture.com/fapi/v1/exchangeInfo";
    private const SERVER_TIME = "https://testnet.binancefuture.com/fapi/v1/time";

    public function process($data)
    {
        $response = $this->request(self::EXCHANGE_INFO);
        $symbols = new \Models\Symbols($response["symbols"]);

        $response = $this->request(self::SERVER_TIME);
        $symbols->sync(round($response["serverTime"]/1000));

        return $this->output();

    }
}