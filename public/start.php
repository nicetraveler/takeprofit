<?php

require_once '../classes/application.php';
$app = new Classes\Application();

$app::$namespaces = array(
    'Classes'=> '../classes',
    'Controllers'=> '../controllers',
    'Models'=> '../models',
    'Views'=> '../views',
    'Public'=> '../public',
);
$app->register();

$app::$config = array(
    "database" =>  "../.database",
    "template" => "template.html",
    "error" => "error.html",
);
$app->init();

$app::$routes = array(
    "/login.html" => [Controllers\Login::class, "process"],
    "/login/get.html" => [Controllers\Login::class, "get"],
    "/login/set.html" => [Controllers\Login::class, "set"],
    "/login/remote.html" => [Controllers\Login::class, "remote"],
    "/index.html" => [Controllers\Symbols::class, "process"],
    "/symbols/update.html" => [Controllers\Symbols::class, "update"],
    "/symbols/get.html" => [Controllers\Symbols::class, "get"],
    "/symbols/set.html" => [Controllers\Symbols::class, "set"],
    "/symbols/depth.html" => [Controllers\Symbols::class, "depth"],
    "/account.html" => [Controllers\Account::class, "process"],
    "/account/init.html" => [Controllers\Account::class, "init"],
    "/account/position.html" => [Controllers\Account::class, "position"],
    "/account/order.html" => [Controllers\Account::class, "order"],
    "/account/event.html" => [Controllers\Account::class, "event"],
);

try {
    $app->resolve();

} catch (\PDOException $error) {
    $app->error(new \Exception($error->getMessage(), 400));

} catch (\Exception $error) {
    $app->error($error);
}

$app->show();