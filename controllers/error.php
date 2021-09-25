<?php

namespace Controllers;

class Error extends \Classes\Controller
{
	public const ERROR_401 = 401;
	public const ERROR_404 = 404;
	public const ERROR_UNKNOWN = null;
	
	public function process($id)
	{
		if (!is_null($id)) {
			http_response_code($id);
		}
		
		$params = array(
			'CODE'=> $id,
			'DESCRIPTION'=> $this->describeError($id),
		);
		return $this->output($params);
	}

	public function describeError($id)
	{
		$errors = array(
			self::ERROR_401 => "Доступ запрещен",
			self::ERROR_404 => "Страница не найдена",
			self::ERROR_UNKNOWN => "Неизвестная ошибка",
		);
		
		return $errors[$id] ?? '';
	}

}