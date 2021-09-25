<?php
//логин
namespace Controllers;

class Login extends \Classes\Controller
{
	public function process($data)
	{
		if (empty($data)) {
			return $this->output();
		}
		
		$access = new \Models\Access();		
		$access->set($data);
	
		if ($row = $access->get()) {
			session_start();
			array_merge($_SESSION, $row);
			header('Location: /index.php');
			return;
		}
		throw new \Exception(401);
	
	}
}