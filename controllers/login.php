<?php
//логин
namespace Controllers;

use Classes\Application;

class Login
{
    private const OAUTH2_CLIENT_ID = "qocMBQg1P17CBcdVsJizsN";
    private const OAUTH2_CLIENT_SECRET = "qocMBQg1P17CBcdVsJizsNPnlGbTU4fvlGxAszmzB5";
    private const OAUTH2_AUTH_SERVER = "http://188.225.58.61/audit/connect/index.php";
    private const OAUTH2_API_SERVER = "http://188.225.58.61/audit/connect/exec/api.php";
    private const OAUTH2_THIS_PAGE = "https://takeprofit.space/login/remote.html";

    public function process($data)
	{
        unset($_SESSION['name']);
        unset($_SESSION['code']);
        unset($_SESSION['token']);

        Application::$instance->template("");

		if (empty($data))
            return;

		$access = new \Models\Access();
        $token = $access->set($data);
        foreach($access->get($token) as $row) {
            $_SESSION['token'] = $row['token'];
            $_SESSION['name'] = $row['name'];
            if (!isset($data['PHP_AUTH_USER']))
			    header('Location: /index.html');
			return;
		}
		throw new \Exception("Unauthorized", 401);
	
	}

    public function remote($data)
    {

        if (!isset($_SESSION['token']) && !isset($data['code'])) {
            $_SESSION['state'] = hash('sha256', microtime(TRUE) . rand());

            $params = array(
                'response_type' => 'code',
                'client_id' => self::OAUTH2_CLIENT_ID,
                'redirect_uri' => self::OAUTH2_THIS_PAGE,
                'scope' => 'user',
                'state' => $_SESSION['state']
            );

            header('Location: ' . self::OAUTH2_AUTH_SERVER . '?' . http_build_query($params));
            return;
        }

        if (isset($data['code'])) {
            if ($_SESSION['state'] != $data['state']) {
                header('Location: ' . self::OAUTH2_THIS_PAGE);
                return;
            }

            $params = array(
                'client_id' => self::OAUTH2_CLIENT_ID,
                'client_secret' => self::OAUTH2_CLIENT_SECRET,
                'redirect_uri' => self::OAUTH2_THIS_PAGE,
                'state' => $data['state'],
                'code' => $data['code']
            );

            $header = array(
                "Content-Type: application/x-www-form-urlencoded",
            );
            $access = Application::$instance->curl(self::OAUTH2_AUTH_SERVER, $header, http_build_query($params));
            if (array_key_exists("code", $access))
                $_SESSION['token'] = $access["code"];

            header('Location: ' . self::OAUTH2_THIS_PAGE);
        }

        if (isset($_SESSION['token'])) {
            $header = array(
                "Content-Type: application/x-www-form-urlencoded",
                'Authorization: Bearer ' . $_SESSION['token'],
            );
            $user = Application::$instance->curl(self::OAUTH2_API_SERVER . '?user', $header);
            if (array_key_exists("error", $user))
                return "ОШИБКА " . $user["error"] . ": " . $user["message"];

            $data['PHP_AUTH_USER'] = $user["name"] . "@188.225.58.61";
            $this->process($data);

        }

    }

    public function get()
    {

        $cols = array(
            "name"=> "Наименование", "secret"=> "Пароль", "_account"=> "Аккаунт", "_apikey"=> "Ключ API", "_secret"=> "Секретный ключ"
        );

        $user = new \Models\Access();
        foreach($user->get(Application::$instance->token) as $row) {
            Application::$instance->title = $row["name"];
            $_SESSION['name'] = $row['name'];

            $checked = !is_null($row['_account']);
            Application::$instance->params["FIELDS"] = "";
            Application::$instance->params["USERFIELDS"] = "<div class='switch'><input type='checkbox' name='switch'";
            Application::$instance->params["USERFIELDS"] .= ($checked? " checked": ""). "><label></label><span>Настройки binance</span></div>\n";

            foreach ($cols as $col => $val) {
                $userdata = preg_match("/^_/", $col);
                Application::$instance->params[$userdata ? "USERFIELDS" : "FIELDS"] .= "<dt><label>{$val}:</label><input type='";
                Application::$instance->params[$userdata? "USERFIELDS" : "FIELDS"] .= ($col=="secret"? "password": "text"). "' name='$col' value='{$row[$col]}'";
                Application::$instance->params[$userdata? "USERFIELDS" : "FIELDS"] .= ((!$userdata && !$row['remote']) || ($userdata && $checked)? "": "disabled"). "></dt>\n";
            }

        }

    }

    public function set($user)
    {
        if (array_key_exists("secret", $user) && !$user["secret"])
            throw new \Exception("Bad Request: Пароль не задан", 400);

        \Models\Access::update($user, Application::$instance->token);
        $this->get();
    }
}