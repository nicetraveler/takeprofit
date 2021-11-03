<?php

namespace Classes;

class Application
{
    public static array $config;
    public static array $namespaces;
    public static array $routes;

    public static Application $instance;
    public static \PDO $db;

    public string $title = "no title";
    public string $token = "";
    public array $params = [];

    private string $content = "no content";

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
        $this->token = $_SESSION['token']?? "";
        $this->params = array(
            "NAME"=> $_SESSION['name'] ?? null,
            "LOGIN"=> $_SESSION['name']? "Выход": "Вход",
            "STATUS"=> "",
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

        if ($request->fetched())
            $this->template("");

        $callback = self::$routes[$path] ?? false;

        if ($callback===false) {
            throw new \Exception ("Not found", 404);

        } elseif (is_array($callback)) {
            $callback[0] = new $callback[0]();	// Создает инстанс класса, чтобы использовать для него $this
        }

        call_user_func($callback, $request->data());
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

        $css = "css". str_replace(".html", ".css", $filename);
        $script = "js". str_replace(".html", ".js", $filename);

        $template = self::$namespaces["Views"]. "/". self::$config["template"];
        if (is_file($template)) {
            ob_start();
            include $template;
            $this->content = str_replace("{CONTENT}", $this->content, ob_get_clean());

            $this->params["CONTENT-CSS"] = is_file(self::$namespaces["Public"]. "/$css")? "<link rel=\"stylesheet\" href=\"$css\">" : "";
            $this->params["CONTENT-SCRIPT"] = is_file(self::$namespaces["Public"]. "/$script")? "<script type=\"text/javascript\" src=\"$script\"></script>" : "";
            $this->params["TITLE"] = $this->title;

        }

        header("ETag: ".rawurlencode($this->title));  // Заголовки принимают только одну кодировку ISO-8859-1

        if (is_file(self::$namespaces["Public"]. "/$script"))
            header("Content-Location: /$script");  // JS подключается отдельно, если используется fetch
    }


    public function show()
    {

        foreach($this->params as $key=>$value) {
            $$key = $value;	//	$param = $value когда $key='param'
            $this->content = str_replace("{{$key}}", $value, $this->content);
        }

        echo $this->content;

    }


    public function curl($url, $header=[], $body=[])
    {
        $header = array_merge(array('accept: application/json'), $header);

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);			// для возврата результата в виде строки, вместо прямого вывода в браузер
        curl_setopt($ch, CURLOPT_HTTPHEADER, $header);
        if (!empty($body)) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        $response = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close ($ch);

        if ($code==200) return json_decode($response, true);

        throw new \Exception("curl error: ". strip_tags($response), $code);
    }

}