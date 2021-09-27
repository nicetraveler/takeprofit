<?php

namespace Classes;

class Application
{
	public static Application $INSTANCE;
	public static string $ROOTDIR;
	public Router $router;
	public \PDO $db;

	public function __construct($rootdir)
	{
		self::$INSTANCE = $this;
		self::$ROOTDIR = $rootdir;
		$this->router = new Router();

		$filename = $rootdir. "/.database";
		list($dsn, $user, $password) = file($filename, FILE_IGNORE_NEW_LINES);
		$opt = array(
			\PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
			\PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
			\PDO::ATTR_EMULATE_PREPARES   => false,
		);
		$this->db = new \PDO($dsn, $user, $password, $opt);

	}
	
	public function run()
	{
		try {
            echo $this->router->get();

        } catch (\PDOException $error) {
            $controller = new \Controllers\Error(new View, "error.html");
            echo $controller->process(new \Exception($error->getMessage(), 400));

		} catch (\Exception $error) {
			$controller = new \Controllers\Error(new View, "error.html");
 			echo $controller->process($error);
		}
	}
	
}