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
    "/index.html" => [Controllers\Symbols::class, "list"],
    "/symbols/update.html" => [Controllers\Symbols::class, "update"],
    "/symbols/show.html" => [Controllers\Symbols::class, "show"],
    "/symbols/get.html" => [Controllers\Symbols::class, "get"],
    "/symbols/set.html" => [Controllers\Symbols::class, "set"],
    "/symbols/snapshot.html" => [Controllers\Symbols::class, "snapshot"],
    "/login.html" => [Controllers\Login::class, "process"],
    "/login/get.html" => [Controllers\Login::class, "get"],
    "/login/set.html" => [Controllers\Login::class, "set"],
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