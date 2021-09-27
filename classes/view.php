<?php

namespace Classes;

class View
{
	public const TEMPLATE_DEFAULT = "template.html";

	public string $title = "";
	public string $template = self::TEMPLATE_DEFAULT;
	public string $content = "";
	
	public function load($source)
	{
		ob_start();
		include Application::$ROOTDIR."/views/$source";
		$this->content = ob_get_clean();

   		if ($this->template !="" && !Application::$INSTANCE->router->request->json_expected()) {
			ob_start();
			include Application::$ROOTDIR."/views/".$this->template;
            $this->content = str_replace("{CONTENT}", $this->content, ob_get_clean());
		}
	}
	
	public function render($params=[])
	{
		$layout = str_replace("{PAGETITLE}", $this->title, $this->content);

        session_start();

        $params = array_merge($params, array(
            "NAME"=> $_SESSION['name'] ?? null,
            "LOGIN"=> $_SESSION['name']? "Выход": "Вход",
            "TASKS"=> null,
            "SYMBOLS"=> "Символы на 16.09.2021",
            "UPDATE"=> "Обновлено: 16.09.2021 15:00:14",
        ));

		foreach($params as $key=>$value) {
			$$key = $value;	//	$param = $value когда $key='param'
			$layout = str_replace("{{$key}}", $value, $layout);
		}
		
		return $layout;
	}


	
}