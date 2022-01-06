<?php
//обновление символов
namespace Controllers;

use Classes\Application;

class Symbols
{
    private const EXCHANGE_INFO = "https://fapi.binance.com/fapi/v1/exchangeInfo";
    private const SERVER_TIME = "https://fapi.binance.com/fapi/v1/time";
    private const DEPTH_SNAPSHOT = "https://fapi.binance.com/fapi/v1/depth?limit=1000";

    private function list()
    {
        $cols = ["pair" => "Пара", "contractType" => "Тип", "status" => "Статус", "_revision" => "Дата"];

        Application::$instance->params["HEAD"] = "<th class='id'></th>";
        array_walk($cols, function ($value) {
            Application::$instance->params["HEAD"] .= "<th>{$value}</th>";
        });

        $symbols = \Models\Symbols::list();
        foreach ($symbols as $symbol) {
            Application::$instance->params["SYMBOLS"] .= "<tr>\n";
            Application::$instance->params["SYMBOLS"] .= "<td class='id'><input type='hidden' name='id' value='{$symbol["symbol"]}'></td>\n";
            array_walk($cols, function ($value, $key) use ($symbol) {
                Application::$instance->params["SYMBOLS"] .= "<td>{$symbol[$key]}</td>";
            });
            Application::$instance->params["SYMBOLS"] .= "</tr>\n";
        }
    }

    public function process()
    {
        Application::$instance->params["SYMBOLS"] = "";
        $this->list();

        Application::$instance->params["MENU"] = "";
        $symbols = \Models\Symbols::user(Application::$instance->token);
        foreach ($symbols as $row)
            Application::$instance->params["MENU"] .= "<a href='#' class='action' target='{$row["symbol"]}'>{$row["symbol"]}</a>\n";

    }

    public function update()
    {
        $response = Application::$instance->curl(self::EXCHANGE_INFO);
        $symbols = new \Models\Symbols($response["symbols"]);

        $response = Application::$instance->curl(self::SERVER_TIME);
        $symbols->sync(round($response["serverTime"]/1000));

        Application::$instance->params["SYMBOLS"] = "";
        $this->list();
    }


    public function get($symbol)
    {
        $cols = ["pair" => "Пара", "pricePrecision" => "Точность цены", "quantityPrecision" => "Точность количества",
            "minPrice" => "Минимальная цена", "tickSize" => "Прирост цены", "minQty" => "Минимальное количество", "stepSize" => "Прирост количества", "notional" => "Минимальный депозит",
            "_name" => "Наименование", "_base" => "Отображаемое количество", "_depth" => "Глубина", "_scale" => "Масштаб", "_full" => "Нулевые объемы"];
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
        if (!Application::$instance->token)
            throw new \Exception ("Unauthorized", 401);

        \Models\Symbols::update($symbol, Application::$instance->token);
        $this->get($symbol);
    }

    public function depth($symbol)
    {
        $depth = Application::$instance->curl(self::DEPTH_SNAPSHOT. "&symbol=". $symbol["id"]);
        Application::$instance->params["RESPONSE"] = json_encode($depth);
    }

}