<?php

namespace Classes;

class request
{
	public function path()
	{
		$path = preg_replace("/^http?\:\/\/|\/$/i", "/index.php", $_SERVER['REQUEST_URI']) ?? '/index.php';
		$pos = strpos($path, '?');
		if ($pos===false) {
			return $path;
		}
		return substr($path, 0, $pos);
	}

	public function method()
	{
		return strtolower($_SERVER['REQUEST_METHOD']);
	}
	
	public function data()
	{
		$body = array_filter($_SERVER, function($key) {
			return preg_match("/^PHP_AUTH_/", $key);
		}, ARRAY_FILTER_USE_KEY);
	         	
		if ($this->method()=="get") {
			foreach($_GET as $key=>$value) {
				$body[$key] = filter_input(INPUT_GET, $key, FILTER_SANITIZE_SPECIAL_CHARS);
			}
		
		}
		if($this->method()=="post") {
			foreach($_POST as $key=>$value) {
				$body[$key] = filter_input(INPUT_POST, $key, FILTER_SANITIZE_SPECIAL_CHARS);
			}
		
		}

		return $body;
	}
}