<?php

namespace Classes;

class request
{
	public function path()
	{
		$path = preg_replace("/^http?\:\/\/|\/$/i", "/index.html", $_SERVER['REQUEST_URI']) ?? '/index.html';
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

    public function fetched()
    {
        return !preg_match("/\*\/\*/", $_SERVER['HTTP_ACCEPT']);
    }

	public function data()
	{
		$body = array_filter($_SERVER, function($key) {
			return preg_match("/^PHP_AUTH_/", $key);
		}, ARRAY_FILTER_USE_KEY);
	         	
        foreach($_GET as $key=>$value) {
            $body[$key] = filter_input(INPUT_GET, $key, FILTER_SANITIZE_SPECIAL_CHARS);
        }

        foreach($_POST as $key=>$value) {
            $body[$key] = filter_input(INPUT_POST, $key, FILTER_SANITIZE_SPECIAL_CHARS);
        }

        if (preg_match("/json/", $_SERVER['CONTENT_TYPE'])) {
            $content = file_get_contents("php://input");
            $body = array_merge($body, json_decode($content, true));
        }

		return $body;
	}
}