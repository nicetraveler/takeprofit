<?php
//обновление символов
namespace Controllers;

use Classes\Application;

class Symbols
{
    private const EXCHANGE_INFO = "https://testnet.binancefuture.com/fapi/v1/exchangeInfo";
    private const SERVER_TIME = "https://testnet.binancefuture.com/fapi/v1/time";
    private const DEPTH_SNAPSHOT = "https://testnet.binancefuture.com/fapi/v1/depth?limit=1000";

    public function list()
    {
        $cols = ["pair" => "Пара", "contractType" => "Тип", "status" => "Статус", "revision" => "Дата"];

        Application::$instance->params["HEAD"] = "<th class='id'></th>";
        array_walk($cols, function($value) {
            Application::$instance->params["HEAD"] .= "<th>{$value}</th>";
        });

        $symbols = \Models\Symbols::list();
        Application::$instance->params["SYMBOLS"] = "";
        foreach ($symbols as $symbol) {
            Application::$instance->params["SYMBOLS"] .= "<tr>\n";
            Application::$instance->params["SYMBOLS"] .= "<td class='id'><input type='hidden' name='id' value='{$symbol["symbol"]}'></td>\n";
            array_walk($cols, function($value, $key) use ($symbol) {
                Application::$instance->params["SYMBOLS"] .= "<td>{$symbol[$key]}</td>";
            });
           Application::$instance->params["SYMBOLS"] .= "</tr>\n";
        }

        Application::$instance->params["STATUS"] = "Текущий баланс: 1000000";

    }


    public function update()
    {
        $response = Application::$instance->curl(self::EXCHANGE_INFO);
        $symbols = new \Models\Symbols($response["symbols"]);

        $response = Application::$instance->curl(self::SERVER_TIME);
        $symbols->sync(round($response["serverTime"]/1000));

        $this->list();
    }


    public function get($symbol)
    {
        $cols = ["pair" => "Пара", "contractType" => "Тип", "status" => "Статус", "revision" => "Дата",
            "_name" => "Наименование", "_base" => "Отображаемое количество"];
        $symbols = \Models\Symbols::list(["symbol"=> $symbol["id"]], Application::$instance->token);

        foreach ($symbols as $row) {
            $checked = !is_null($row['_symbol']);

            Application::$instance->params["FIELDS"] = "<input type='hidden' name='id' value='{$symbol["id"]}'>\n";
            Application::$instance->params["USERFIELDS"] = "<div class='switch'><input type='checkbox' name='switch'";
            Application::$instance->params["USERFIELDS"] .= ($checked? " checked": ""). "><label></label><span>Настройки пользователя</span></div>\n";

            foreach($cols as $col=>$val) {
                $userdata = preg_match("/^_/", $col);
                Application::$instance->params[$userdata? "USERFIELDS" : "FIELDS"] .= "<dt><label>{$val}:</label>";
                Application::$instance->params[$userdata? "USERFIELDS" : "FIELDS"] .= "<input type='text' name='$col' value='{$row[$col]}'";
                Application::$instance->params[$userdata? "USERFIELDS" : "FIELDS"] .= ($userdata && $checked? "": " disabled"). "></dt>\n";
            }

            Application::$instance->title = $row['pair'];
            Application::$instance->params["SYMBOL"] = $row['pair'];

        }

    }

    public function set($symbol)
    {
        \Models\Symbols::update($symbol, Application::$instance->token);
        $this->get($symbol);
    }

    public function show($symbol)
    {
        $symbols = \Models\Symbols::list(["symbol"=> $symbol["id"]], Application::$instance->token);

        foreach ($symbols as $row) {
            Application::$instance->title = $row['_name']?? $row['pair'];
            Application::$instance->params["CAPTION"] = $row['pair'];
            Application::$instance->params["SYMBOL"] = $row['symbol'];
            Application::$instance->params["BASE"] = $row['_base'];
        }

    }

    public function snapshot($symbol)
    {
        $response = Application::$instance->curl(self::DEPTH_SNAPSHOT. "&symbol=". $symbol["id"]);
        Application::$instance->params["RESPONSE"] = json_encode($response);
    }
}