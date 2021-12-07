<?php
//модель доступа
namespace Models;

class Access extends \Classes\Model
{

	public function set($data)
	{
		$name = $data['PHP_AUTH_USER'] ?? $data['usr'];
		$secret = $data['PHP_AUTH_PW'] ?? $data['pwd'];
		$message = bin2hex(random_bytes(32));
		$hash = hash_hmac('sha256', $message, $secret, true);
        $token = base64_encode($hash);
		self::sql(
			"UPDATE users SET token=:token WHERE name=:name AND (secret=:secret OR remote)",
			array('name'=> $name, 'secret'=> $secret, 'token'=> $token)
		);
        return $token;
	}
	
	public function get($token="")
	{
		return self::sql(
			"SELECT u.id, u.token, u.name, null AS secret, u.remote, _a.account AS _account, _a.apikey AS _apikey, _a.secret AS _secret
                FROM users AS u LEFT JOIN user_accounts AS _a ON u.id=_a.user
                WHERE u.token=:token", array('token'=> $token)
		);
	}

    public static function update($user, $token="")
    {
        self::sql("UPDATE users SET name=:name, secret=:secret WHERE NOT remote AND token<>'' AND token=:token",
            array("name"=> $user["name"], "secret"=> $user["secret"], "token"=> $token));

        $userdata = array();
        foreach($user as $key=>$value) {
            if (!preg_match("/^_/", $key)) continue;
            $userdata[preg_replace("/^_/", "", $key)] = $value;
        }
        $keys = array_keys($userdata);
        self::sql("DELETE FROM user_accounts WHERE user=(SELECT id FROM users WHERE token<>'' AND token=:token)",
            array("token"=> $token));
        if (!isset($user['switch'])) return;
        self::sql("INSERT INTO user_accounts (user, ".implode(",", $keys).") 
            SELECT id, :".implode(", :", $keys)." FROM users WHERE token<>'' AND token='{$token}'", $userdata);

    }

}