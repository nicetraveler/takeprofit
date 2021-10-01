<?php

namespace Classes;

class Application
{
    public static array $config;
    public static array $namespaces;
    public static array $routes;

    public static Application $instance;
    public static \PDO $db;

    public array $params = [];
    private string $content = "no content set";

    public function init()
    {
        list($dsn, $user, $password) = file(self::$config["database"], FILE_IGNORE_NEW_LINES);
        $options = array(
            \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
            \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            \PDO::ATTR_EMULATE_PREPARES   => false,
        );
        self::$db = new \PDO($dsn, $user, $password, $options);

        session_start();
        $this->params = array(
            "NAME"=> $_SESSION['name'] ?? null,
            "LOGIN"=> $_SESSION['name']? "Выход": "Вход",
        );


        self::$instance = $this;

    }


    public function register()
    {
        foreach(self::$namespaces as $namespace) {
            if (!is_dir($namespace))
                unset(self::$namespaces[$namespace]);
        }

        spl_autoload_register(array($this, "autoclass"));

    }


    private function autoclass($class)
    {
        $path = explode('\\', $class);

        if (is_array($path)) {
            $namespace = array_shift($path);

            if (!empty(self::$namespaces[$namespace])) {
                $file = strtolower(self::$namespaces[$namespace]. '/'. implode('/', $path). '.php');
                require_once $file;
            }
        }

    }


    public function resolve()
    {
        $request = new Request();
        $path = $request->path();
        $callback = self::$routes[$path] ?? false;

        if ($callback===false) {
            throw new \Exception ("Not found", 404);

        } elseif (is_array($callback)) {
            $callback[0] = new $callback[0]();	// Создает инстанс класса, чтобы использовать для него $this
        }

        call_user_func($callback, $request->data());

        if ($request->json_expected()) {
            $this->template("");
        }
        $this->load($path);

    }


    public function template($filename)
    {
        self::$config["template"] = $filename;
    }


    public function error($error)
    {
        $this->load(self::$config["error"]);

        $this->params['CODE'] = $error->getCode();
        $this->params['DESCRIPTION'] = $error->getMessage();

        if (!is_null($this->params['CODE']))
            http_response_code($this->params['CODE']);

    }


    private function load($filename)
    {
        $source = self::$namespaces["Views"]. "/$filename";
        if(is_file($source)) {
            ob_start();
            include $source;
            $this->content = ob_get_clean();
        }

        $template = self::$namespaces["Views"]. "/". self::$config["template"];
        if (is_file($template)) {
            ob_start();
            include $template;
            $this->content = str_replace("{CONTENT}", $this->content, ob_get_clean());

            $css = "css". str_replace(".html", ".css", $filename);
            $this->params["CONTENT-CSS"] = is_file(self::$namespaces["Public"]. "/$css")? "<link rel=\"stylesheet\" href=\"$css\">" : "";

            $script = "js". str_replace(".html", ".js", $filename);
            $this->params["CONTENT-SCRIPT"] = is_file(self::$namespaces["Public"]. "/$script")? "<script type=\"text/javascript\" src=\"$script\"></script>" : "";

        }

    }


    public function show()
    {
        foreach($this->params as $key=>$value) {
            $$key = $value;	//	$param = $value когда $key='param'
            $this->content = str_replace("{{$key}}", $value, $this->content);
        }

        echo $this->content;

    }

}