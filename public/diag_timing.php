<?php
// Read timing log written by upload requests
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

// Find the log file
$logPaths = [
    '/home/html/tuptudu.cz/laravel-office/storage/logs/upload_timing.log',
    __DIR__ . '/../laravel-office/storage/logs/upload_timing.log',
    __DIR__ . '/../../laravel-office/storage/logs/upload_timing.log',
    __DIR__ . '/../storage/logs/upload_timing.log',
];

$found = false;
foreach ($logPaths as $p) {
    if (file_exists($p)) {
        echo "=== Upload Timing Log ===\n";
        echo "File: $p\n";
        echo "Size: " . filesize($p) . " bytes\n";
        echo "Modified: " . date('Y-m-d H:i:s', filemtime($p)) . "\n\n";
        // Show last 5000 chars
        $content = file_get_contents($p);
        if (strlen($content) > 5000) {
            echo "... (showing last 5000 chars) ...\n\n";
            echo substr($content, -5000);
        } else {
            echo $content;
        }
        $found = true;
        break;
    }
}

if (!$found) {
    echo "No upload timing log found.\n";
    echo "Checked:\n";
    foreach ($logPaths as $p) echo "  - $p\n";
}

// Also check PHP-FPM status
echo "\n\n=== Server Info ===\n";
echo "PHP: " . PHP_VERSION . "\n";
echo "SAPI: " . php_sapi_name() . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "\n";
echo "max_input_time: " . ini_get('max_input_time') . "\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";

// Check if there are any stuck processes by timing a simple request
echo "\n=== Quick Response Test ===\n";
echo "Current time: " . date('Y-m-d H:i:s') . "\n";
$start = microtime(true);
// Just a simple operation to see if PHP responds immediately
$x = array_sum(range(1, 10000));
echo "Compute test: " . round((microtime(true) - $start) * 1000, 1) . "ms\n";
echo "Result: $x\n";
