<?php
echo "<pre>\n";
echo "__DIR__: " . __DIR__ . "\n";
echo "realpath(..): " . realpath(__DIR__ . '/..') . "\n";
echo "realpath(../laravel-office): " . (realpath(__DIR__ . '/../laravel-office') ?: 'NOT FOUND') . "\n";
echo "realpath(../../laravel-office): " . (realpath(__DIR__ . '/../../laravel-office') ?: 'NOT FOUND') . "\n\n";

echo "file_exists(../laravel-office/vendor/autoload.php): " . (file_exists(__DIR__ . '/../laravel-office/vendor/autoload.php') ? 'YES' : 'NO') . "\n";
echo "file_exists(../../laravel-office/vendor/autoload.php): " . (file_exists(__DIR__ . '/../../laravel-office/vendor/autoload.php') ? 'YES' : 'NO') . "\n";
echo "file_exists(../vendor/autoload.php): " . (file_exists(__DIR__ . '/../vendor/autoload.php') ? 'YES' : 'NO') . "\n\n";

echo "Parent dir listing:\n";
foreach (scandir(__DIR__ . '/..') as $f) {
    if ($f !== '.' && $f !== '..') echo "  $f\n";
}
echo "</pre>\n";
