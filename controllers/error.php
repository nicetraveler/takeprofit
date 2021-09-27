<?php

namespace Controllers;

class Error extends \Classes\Controller
{
    public const ERROR_400 = 400;
	public const ERROR_401 = 401;
	public const ERROR_404 = 404;
	public const ERROR_UNKNOWN = null;

	public function process($error)
	{
		$params = array(
			'CODE'=> $error->getCode(),
			'DESCRIPTION'=> $this->describeError($error),
		);

       if (!is_null($params['CODE']))
            http_response_code($params['CODE']);
		return $this->output($params);
	}

	public function describeError($error)
	{
		$description = array(
			self::ERROR_401 => "Доступ запрещен",
			self::ERROR_404 => "Страница не найдена",
			self::ERROR_UNKNOWN => "Неизвестная ошибка",
		);
		
		return $description[$error->getCode()] ?? $error->getMessage();
	}

}