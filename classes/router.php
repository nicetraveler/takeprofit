<?php

namespace Classes;

class Router
{
	protected array $routes = [];
	public Request $request;
		
	public function __construct()
	{
		$this->request = new Request();
	}

	public function set($path, $callback)
	{
		$this->routes[$path] = $callback;
	}
	
	public function get()
	{
		$path = $this->request->path();
		$callback = $this->routes[$path] ?? false;
	
		$view  = new View();
		if ($callback===false) {
			throw new \Exception (404);
			
		} elseif (is_string($callback)) {
			$view->load($callback);
			return $view->render();
			
		} elseif (is_array($callback)) {
			$callback[0] = new $callback[0]($view, $callback[1]);	// Создает инстанс класса, чтобы использовать для него $this
			$callback[1] = "process";
			$params = $this->request->data();
		}

		return call_user_func($callback, $params?? null);
		
	}
	
}
