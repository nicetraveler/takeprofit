<?php

//Удаленные запросы

namespace Classes;

class Curl
{

	public function request($url, $header=[], $body=[])
	{
		$header = array_merge($header, array('accept: application/json'));

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);			// для возврата результата в виде строки, вместо прямого вывода в браузер
        curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
        if (!empty($body)) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close ($ch);

        if ($code==200) return json_decode($response, true);

        throw new \Exception("curl request error", $code);
	}
}