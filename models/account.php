<?php

namespace Models;

class Account extends \Classes\Model
{
    private string $token = "";
    public array $settings = [];

    public function __construct($symbol, $token="")
    {
        $this->token = $token;
        $result = self::sql("SELECT s.*,
            _s.base AS base, _s.depth AS depth, _s.scale AS scale, _s.full AS full,
            _o.leverage AS _leverage, _o.risk AS _risk, _o.ticks AS _ticks
            FROM symbols AS s
            LEFT JOIN users AS u ON token='{$this->token}'
            LEFT JOIN user_symbols AS _s ON s.symbol=_s.symbol AND _s.user=u.id
            LEFT JOIN (SELECT user, symbol, MAX(timestamp) AS timestamp FROM user_orders GROUP BY user, symbol) AS latest_user_order
                ON s.symbol=latest_user_order.symbol AND u.id=latest_user_order.user
            LEFT JOIN user_orders AS _o ON s.symbol=_o.symbol AND u.id=_o.user AND latest_user_order.timestamp=_o.timestamp
            WHERE s.symbol='{$symbol}'");

        foreach ($result as $row)
            $this->settings = $row;

        $this->errors[] = "Empty user settings for symbol {$symbol}";
    }

    public function settings($order)
    {
        $userdata = array();
        foreach($order as $key=>$value) {
            if (!preg_match("/^_/", $key)) continue;
            $userdata[preg_replace("/^_/", "", $key)] = $value;
            $this->settings[$key] = $value;
        }
        $keys = array_keys($userdata);
        self::sql("INSERT INTO user_orders (user, symbol, ".implode(",", $keys).") 
            SELECT id, '{$order['id']}', :".implode(", :", $keys)." FROM users WHERE token<>'' AND token='{$this->token}'", $userdata);
    }

    public function find($filter=[])
    {
        $where = array();
        foreach($filter as $key=>$value)
            $where[] = "$key=:$key";

        return self::sql("SELECT * FROM orders
            WHERE user=(SELECT id FROM users WHERE token<>'' AND token='{$this->token}')
            ". (count($where)>0? "AND ": ""). implode(" AND ", $where), $filter);

    }

    public function insert($order)
    {
        $fields = ["s"=> "symbol", "S"=> "side", "o"=> "type", "i"=> "orderId"];
        foreach($fields as $k=>&$v) $v = $order[$k];

        self::sql("INSERT INTO orders (user, symbol, side, type, orderId, eventTime)
            SELECT id, :s, :S, :o, :i, 0 FROM users WHERE token<>'' AND token='{$this->token}'", $fields);
    }

    public function update($order)
    {
        $source = array("i"=> "orderId", "q"=> "quantity", "p"=> "price", "z"=> "filledQuantity", "ap"=> "averagePrice",
            "sp"=> "stopPrice", "R"=> "reduceOnly", "cp"=> "closePosition", "x"=> "status", "T"=> "eventTime");
        if ($order["o"]=="TRAILING_STOP_MARKET") {
            $source["activationPrice"] = $order["AP"];
            $source["callbackRate"] = $order["cr"];
            unset($source["sp"]);
        }

        $fields = array();
        foreach($source as $k=>&$v) {
            $fields[] = "{$v}=:{$k}";
            $v = $order[$k];
        }
        $source = array_merge($source, ["orderId"=> $order["i"], "eventTime"=> $order["T"]]);

        self::sql("UPDATE orders SET ". implode(", ", $fields). "
            WHERE orderId=:orderId AND eventTime<=:eventTime  
            AND user=(SELECT id FROM users WHERE token<>'' AND token='{$this->token}')", $source);
    }

}