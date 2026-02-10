<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Detect base path - production uses /laravel-office/, local uses parent dir
$basePath = file_exists(__DIR__.'/../../laravel-office/vendor/autoload.php')
    ? __DIR__.'/../../laravel-office'
    : __DIR__.'/..';

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = $basePath.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
require $basePath.'/vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once $basePath.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
