<?php
// One-time password reset for testing - DELETE AFTER USE
$SECRET = 'tuptudu-diag-2026-xK9m';
if (($_GET['token'] ?? '') !== $SECRET) { http_response_code(403); die('Forbidden'); }

if (file_exists(__DIR__.'/../laravel-office/vendor/autoload.php')) {
    $basePath = __DIR__.'/../laravel-office';
} elseif (file_exists(__DIR__.'/../../laravel-office/vendor/autoload.php')) {
    $basePath = __DIR__.'/../../laravel-office';
} else {
    $basePath = __DIR__.'/..';
}
require $basePath.'/vendor/autoload.php';
$app = require_once $basePath.'/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$user = \App\Models\User::first();
$user->password = bcrypt('DiagTest2026!');
$user->save();

header('Content-Type: text/plain');
echo "Password reset for {$user->email} to: DiagTest2026!\n";
echo "DELETE THIS FILE AFTER USE!\n";
