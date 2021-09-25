<?php

namespace Classes;

class Model
{
	public const RULE_REQUIRED = 'required';
	public const RULE_EMAIL = 'email';
	public const RULE_MIN = 'min';

	public array $errors = array();

	public function load($data)
	{
		foreach($data as $key=>$value) {
			if (property_exists($this, $key)) {
				$this->{$key} = $value;
			}
		}
	}

	public function rules()
	{
		return array();
	}
	
	public function validate()
	{
		foreach($this->rules() as $attribute=>$rules) {
			$value = $this->{$attribute};
			foreach($rules as $rule) {
				if (!is_array($rule)) $rule = [$rule];
				
				if ($rule[0]==self::RULE_REQUIRED && !$value) {
					$this->errors[$attribute][] = $this->describeError(self::RULE_REQUIRED);
				}
				if ($rule[0]==self::RULE_EMAIL && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
					$this->errors[$attribute][] = $this->describeError(self::RULE_EMAIL);
				}
				if ($rule[0]==self::RULE_MIN && strlen($value)<$rule['min']) {
					$this->errors[$attribute][] = $this->describeError(self::RULE_MIN, $rule);
				}
			}
		}
		return empty($this->errors);

	}
	
	public function describeError($id, $params=[])
	{
		$errors = array(
			self::RULE_REQUIRED => "Это поле обязательно",
			self::RULE_EMAIL => "Должен быть указан действительный электронный адрес",
			self::RULE_MIN => "Поле не должно быть короче {min} символов",
		);
		$description = $errors[$id] ?? 'Неизвестная ошибка: '.$id;
		
		foreach($params as $key=>$value) {
			$description = str_replace("{{$key}}", $value, $description);
		}
		return $description;
	}
	
	public function sql($sql, $params=[])
	{
		$statement = Application::$INSTANCE->db->prepare($sql);
		$statement->execute($params);
		return $statement->fetch(\PDO::FETCH_ASSOC);
	}
}