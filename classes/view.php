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
		include_once Application::$ROOTDIR."/views/$source";
		$this->content = ob_get_clean();

		if ($this->template != "") {
			ob_start();
			include_once Application::$ROOTDIR."/views/".$this->template;
			$this->content = str_replace("{CONTENT}", $this->content, ob_get_clean());
		}
	}
	
	public function render($params=[])
	{
		$layout = str_replace("{PAGETITLE}", $this->title, $this->content);

		foreach($params as $key=>$value) {
			$$key = $value;	//	$param = $value когда $key='param'
			$layout = str_replace("{{$key}}", $value, $layout);
		}
		
		return $layout;
	}


	
}