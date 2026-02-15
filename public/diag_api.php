<?php
// Minimal Claude API test - NO dependencies, NO Laravel
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain; charset=utf-8');

echo "=== Claude API Diagnostic ===\n";
echo "Time: " . date('Y-m-d H:i:s') . "\n";
echo "PHP: " . PHP_VERSION . "\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "\n\n";

// Find .env
$envPaths = [__DIR__.'/../laravel-office/.env', __DIR__.'/../../laravel-office/.env', __DIR__.'/../.env'];
$apiKey = '';
foreach ($envPaths as $p) {
    if (file_exists($p)) {
        echo "Found .env: $p\n";
        foreach (file($p, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            if (str_starts_with($line, 'ANTHROPIC_API_KEY=')) {
                $apiKey = trim(substr($line, 18));
            }
        }
        break;
    }
}
echo "API key: " . ($apiKey ? substr($apiKey, 0, 12) . '...' : 'NOT FOUND') . "\n\n";

if (!$apiKey) { echo "ERROR: No API key found\n"; exit; }

// Test 1: Simple text API call
echo "--- Test 1: Claude Text API ---\n";
$start = microtime(true);
$payload = json_encode([
    'model' => 'claude-haiku-4-5-20251001',
    'max_tokens' => 20,
    'messages' => [['role' => 'user', 'content' => 'Say ok']],
]);

$ch = curl_init('https://api.anthropic.com/v1/messages');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['x-api-key: '.$apiKey, 'anthropic-version: 2023-06-01', 'content-type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
]);
$resp = curl_exec($ch);
$info = curl_getinfo($ch);
$err = curl_error($ch);
curl_close($ch);

echo "HTTP: " . $info['http_code'] . "\n";
echo "DNS: " . round($info['namelookup_time']*1000) . "ms\n";
echo "Connect: " . round($info['connect_time']*1000) . "ms\n";
echo "Total: " . round((microtime(true)-$start)*1000) . "ms\n";
if ($err) echo "cURL error: $err\n";
echo "Body: " . substr($resp, 0, 150) . "\n\n";

// Test 2: Vision API with tiny PNG
echo "--- Test 2: Claude Vision API (tiny PNG) ---\n";
$start = microtime(true);
if (extension_loaded('gd')) {
    $img = imagecreatetruecolor(100, 40);
    imagefill($img, 0, 0, imagecolorallocate($img, 255, 255, 255));
    imagestring($img, 3, 5, 10, 'Faktura 123', imagecolorallocate($img, 0, 0, 0));
    ob_start(); imagepng($img); $png = ob_get_clean(); imagedestroy($img);
    echo "Image: " . strlen($png) . " bytes\n";

    $payload = json_encode([
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 100,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => 'image/png', 'data' => base64_encode($png)]],
                ['type' => 'text', 'text' => 'What text? 1 word.'],
            ],
        ]],
    ]);
    echo "Payload: " . strlen($payload) . " bytes\n";

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true, CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => ['x-api-key: '.$apiKey, 'anthropic-version: 2023-06-01', 'content-type: application/json'],
        CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60,
    ]);
    $resp = curl_exec($ch);
    $info = curl_getinfo($ch);
    $err = curl_error($ch);
    curl_close($ch);

    echo "HTTP: " . $info['http_code'] . "\n";
    echo "Total: " . round((microtime(true)-$start)*1000) . "ms\n";
    if ($err) echo "cURL error: $err\n";
    echo "Body: " . substr($resp, 0, 200) . "\n\n";
} else {
    echo "GD not available\n\n";
}

// Test 3: S3 test (just connectivity, using curl to AWS)
echo "--- Test 3: AWS S3 connectivity ---\n";
$start = microtime(true);
$ch = curl_init('https://tuptudu-doklady.s3.eu-west-1.amazonaws.com/');
curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_NOBODY => true]);
curl_exec($ch);
$info = curl_getinfo($ch);
curl_close($ch);
echo "S3 endpoint HTTP: " . $info['http_code'] . "\n";
echo "DNS: " . round($info['namelookup_time']*1000) . "ms\n";
echo "Connect: " . round($info['connect_time']*1000) . "ms\n";
echo "Total: " . round((microtime(true)-$start)*1000) . "ms\n\n";

echo "=== Done ===\n";
