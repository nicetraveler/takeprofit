<?php

require_once '../classes/application.php';
$app = new Classes\Application();

$app::$config = array(
    "database" =>  "../.database",
    "template" => "template.html",
    "error" => "error.html",
);
$app->init();

$app::$namespaces = array(
    'Classes'=> '../classes',
    'Controllers'=> '../controllers',
    'Models'=> '../models',
    'Views'=> '../views',
    'Public'=> '../public',
);
$app->register();

$app::$routes = array(
    "/index.html" => [Controllers\Symbols::class, "process"],
        "/symbols/update.html" => [Controllers\Symbols::class, "update"],
    "/login.html" => [Controllers\Login::class, "process"],
    "/login/remote.html" => [Controllers\Login::class, "remote"],
);

try {
    $app->resolve();

} catch (\PDOException $error) {
    $app->error(new \Exception($error->getMessage(), 400));

} catch (\Exception $error) {
    $app->error($error);
}

$app->show();