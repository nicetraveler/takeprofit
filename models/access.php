<?php

namespace Models;

class Access extends \Classes\Model
{
	public ?string $name = '';	// nullable type
	public ?string $secret = '';	// nullable type
	
	public function set($data)
	{
		$this->name = $data['PHP_AUTH_USER'] ?? $data['usr'];
		$this->secret = $data['PHP_AUTH_PW'] ?? $data['pwd'];
		$message = bin2hex(random_bytes(32));
		$hash = hash_hmac('sha256', $message, $secret, true);
		$this->sql(
			"UPDATE users SET code=:code WHERE name=:name AND secret=:secret",
			array('name'=> $this->name, 'secret'=> $this->secret, 'code'=> base64_encode($hash))
		);
	}
	
	public function get()
	{
		return $this->sql(
			"SELECT name, code FROM users WHERE name=:name AND secret=:secret",
			array('name'=> $this->name, 'secret'=> $this->secret)
		);
	}

	
}