<?php

namespace Models;

class Symbols extends \Classes\Model
{
    private array $symbols = [];

    public function __construct($data)
    {
        $filter = ["minPrice"=> null, "tickSize"=> null, "minQty"=> null, "stepSize"=> null, "notional"=> null];
        foreach($data as $row) {
            foreach ($row['filters'] as $value) {
                if ($value['filterType'] == 'PRICE_FILTER') {
                    $filter['minPrice'] = $value['minPrice'];
                    $filter['tickSize'] = $value['tickSize'];
                }
                if ($value['filterType'] == 'LOT_SIZE') {
                    $filter['minQty'] = $value['minQty'];
                    $filter['stepSize'] = $value['stepSize'];
                }
                if ($value['filterType']=='MIN_NOTIONAL')
                    $filter['notional'] = $value['notional'];
            }
            $this->symbols = array_merge($this->symbols, array(
                $row['symbol'], $row['pair'], $row['contractType'], $row['status'], $row['pricePrecision'], $row['quantityPrecision'],
                $filter['minPrice'], $filter['tickSize'], $filter['minQty'], $filter['stepSize'], $filter['notional']
            ));

        }
    }

    public function sync($revision)
    {
        self::sql("DELETE FROM symbols");
        $qmarks = "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)". str_repeat(", (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", count($this->symbols)/11-1);
        self::sql("INSERT INTO symbols (
                     symbol, pair, contractType, status,
                     pricePrecision, quantityPrecision, minPrice, tickSize, minQty, stepSize, notional
        ) VALUES $qmarks", $this->symbols);
        self::sql("UPDATE symbols SET revision=:revision", array('revision'=> $revision));

    }

    public static function update($symbol, $token="")
    {
        $userdata = array();
        foreach($symbol as $key=>$value) {
            if (!preg_match("/^_/", $key)) continue;
            $userdata[preg_replace("/^_/", "", $key)] = $value;
        }
        $keys = array_keys($userdata);
        self::sql("DELETE FROM user_symbols WHERE symbol=:symbol AND user=(SELECT id FROM users WHERE token<>'' AND token=:token)",
            array("symbol"=> $symbol["id"], "token"=> $token));
        if (!isset($symbol['switch'])) return;
        self::sql("INSERT INTO user_symbols (user, symbol, ".implode(",", $keys).") 
            SELECT id, '{$symbol['id']}', :".implode(", :", $keys)." FROM users WHERE token<>'' AND token='{$token}'", $userdata);

    }

    public static function list($filter=[], $token="")
    {
        $where = array();
        foreach($filter as $key=>$value)
            $where[] = "s.$key=:$key";

         return self::sql("SELECT s.*, FROM_UNIXTIME(s.revision, \"%d.%m.%Y %H:%i:%s\") AS _revision,
             _s.symbol AS _symbol, _s.name AS _name, _s.base AS _base, _s.depth AS _depth, _s.scale AS _scale, _s.full AS _full
            FROM symbols AS s
            LEFT JOIN users AS u ON token='{$token}'
            LEFT JOIN user_symbols AS _s ON s.symbol=_s.symbol AND _s.user=u.id
            ". (count($where)>0? "WHERE ": ""). implode(" && ", $where), $filter);

    }

    public static function user($token="")
    {
        return self::sql("SELECT symbol, name FROM user_symbols
            WHERE user=(SELECT id FROM users WHERE token<>'' AND token='{$token}')
            GROUP BY symbol, name"
        );

    }
}