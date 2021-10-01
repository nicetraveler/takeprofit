<?php

namespace Models;

class Symbols extends \Classes\Model
{
    private array $symbols = [];

    public function __construct($data)
    {
        foreach($data as $row)
            $this->symbols = array_merge($this->symbols, array(
                $row['symbol'], $row['pair'], $row['contractType'], $row['status']
            ));

    }

    public function sync($revision)
    {
        $this->sql("DELETE FROM symbols");
        $qmarks = "(?, ?, ?, ?)". str_repeat(", (?, ?, ?, ?)", count($this->symbols)/4-1);
        $this->sql("INSERT INTO symbols (symbol, pair, contractType, status) VALUES $qmarks", $this->symbols);
        $this->sql("UPDATE symbols SET revision=:revision", array('revision'=> $revision));

    }
}