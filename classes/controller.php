<?php

//Контроллер

namespace Classes;

class Controller
{
	public View $view;
	
	public function __construct(View $view, $source)
	{
		$this->view = $view;
		$this->view->load($source);
	}
	
	public function process($data)
	{
		$params = array();
		$this->output($params);
	}
	
	public function output($params=[])
	{
		return $this->view->render($params);
	}
	
	public function request($url, $post=false)
	{
		$header[] = 'Accept: application/json';
		$header[] = "Content-Type: application/x-www-form-urlencoded";
		if (isset($_SESSION['token']))
			$header[] = 'Authorization: Bearer ' . $_SESSION['token'];
				
		if (extension_loaded("curl")) {
			$ch = curl_init();
			curl_setopt($ch, CURLOPT_URL, $url);
			curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);			// для возврата результата в виде строки, вместо прямого вывода в браузер
			curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
			if ($post)
				curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post));
			$response = curl_exec($ch);
			curl_close ($ch);

		} else {
			error_reporting(E_ALL);
			ini_set('display_errors', 1);
			$opts['http']['header'] = $header;
			if ($post) {
				$opts['http']['method'] = 'POST';
				$opts['http']['content'] = http_build_query($post);
			}
			$context  = stream_context_create($opts);
			$response = file_get_contents($url, false, $context);

		}

		return json_decode($response);
	}
}