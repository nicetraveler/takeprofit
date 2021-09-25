<?php

//autoload.php работает, но не используется, т.к. отдельный класс для автозагрузки классов разных неймспейсов избыточен для одной операции
//require_once 'autoload.php';

//$autoloader = new Autoloader();
//$autoloader->addNamespace('Classes', '../classes');
//$autoloader->addNamespace('Controllers', '../controllers');
//$autoloader->addNamespace('Models', '../models');
//$autoloader->register();

spl_autoload_register("autoload");

function autoload($class)
{
	$namespaces = array(
		'Classes'=> '../classes',
		'Controllers'=> '../controllers',
		'Models'=> '../models',
	);
	$pathParts = explode('\\', $class);

	if (is_array($pathParts)) {
		$namespace = array_shift($pathParts);
	
		if (!empty($namespaces[$namespace])) {
			$filePath = strtolower($namespaces[$namespace]. '/'. implode('/', $pathParts). '.php');
			require_once $filePath;
		}
	}
	
}

$app = new Classes\Application(dirname(__DIR__));

$app->router->set('/index.php', "index.html");
$app->router->set('/login.php', [Controllers\Login::class, "login.html"]);
$app->router->set('/connect.php', [Controllers\Connect::class, "connect.html"]);
$app->router->set('/test.php', function() { return "Hello world";});

$app->run();