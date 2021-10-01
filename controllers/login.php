<?php
//логин
namespace Controllers;

use Classes\Application;

class Login
{
    private const OAUTH2_CLIENT_ID = "qocMBQg1P17CBcdVsJizsN";
    private const OAUTH2_CLIENT_SECRET = "qocMBQg1P17CBcdVsJizsNPnlGbTU4fvlGxAszmzB5";
    private const OAUTH2_AUTH_SERVER = "http://188.225.58.61/audit/connect/start.php";
    private const OAUTH2_API_SERVER = "http://188.225.58.61/audit/connect/exec/api.php";
    private const OAUTH2_THIS_PAGE = "https://takeprofit.space/login.html";

    public function process($data)
	{
        unset($_SESSION['name']);
        unset($_SESSION['code']);
        unset($_SESSION['token']);

        Application::$instance->template("");

		if (empty($data))
            return;

		$access = new \Models\Access();		
		$access->set($data);
	
		if ($row = $access->get()) {
			$_SESSION['name'] = $row['name'];
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
            $access = $this->request(self::OAUTH2_AUTH_SERVER, $header, http_build_query($params));
            if (array_key_exists("code", $access))
                $_SESSION['token'] = $access->code;

            header('Location: ' . self::OAUTH2_THIS_PAGE);
        }

        if (isset($_SESSION['token'])) {
            $header = array(
                "Content-Type: application/x-www-form-urlencoded",
                'Authorization: Bearer ' . $_SESSION['token'],
            );
            $user = $this->request(self::OAUTH2_API_SERVER . '?user', $header);
            if (array_key_exists("error", $user))
                return "ОШИБКА " . $user->error . ": " . $user->message;

            $_SESSION['name'] = $user->name . "@188.225.58.61";
        }

    }
}