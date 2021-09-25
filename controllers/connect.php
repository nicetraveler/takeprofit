<?php
//коннект
namespace Controllers;

class Connect extends \Classes\Controller
{
	private const OAUTH2_CLIENT_ID = "qocMBQg1P17CBcdVsJizsN";
	private const OAUTH2_CLIENT_SECRET = "qocMBQg1P17CBcdVsJizsNPnlGbTU4fvlGxAszmzB5";
	private const OAUTH2_AUTH_SERVER = "http://188.225.58.61/audit/connect/index.php";
	private const OAUTH2_API_SERVER = "http://188.225.58.61/audit/connect/exec/api.php";
	private const OAUTH2_THIS_PAGE = "https://takeprofit.space/connect.php";

	public function process($data)
	{
		session_start();

		if (!isset($_SESSION['token']) && !isset($data['code'])) {
			$_SESSION['state'] = hash('sha256', microtime(TRUE).rand());
		
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

			$access = $this->request(self::OAUTH2_AUTH_SERVER, $params);
			if (array_key_exists("code", $access))
				$_SESSION['token'] = $access->code;

			header('Location: ' . self::OAUTH2_THIS_PAGE);
		}
		
		if (isset($_SESSION['token'])) {

			$user = $this->request(self::OAUTH2_API_SERVER . '?user');
			if (array_key_exists("error", $user))
				return "ОШИБКА ". $user->error. ": ". $user->message;

			$_SESSION['name'] = $user->name. "@188.225.58.61";
		}
		
		return $this->output();
	}
}