<?php
/**
 * Diagnostický skript - testuje upload pipeline BEZ Laravel.
 * Přímo volá API a měří časy.
 * DOČASNÝ - smazat po diagnostice!
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);
set_time_limit(120);

header('Content-Type: application/json; charset=utf-8');

// Load .env manually
$envPath = null;
foreach ([__DIR__.'/../laravel-office/.env', __DIR__.'/../../laravel-office/.env', __DIR__.'/../.env'] as $p) {
    if (file_exists($p)) { $envPath = $p; break; }
}

$env = [];
if ($envPath) {
    foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        if (str_starts_with(trim($line), '#')) continue;
        if (strpos($line, '=') !== false) {
            [$key, $val] = explode('=', $line, 2);
            $env[trim($key)] = trim($val);
        }
    }
}

$results = [];
$totalStart = microtime(true);
$apiKey = $env['ANTHROPIC_API_KEY'] ?? '';

// 0. Environment info
$results['env'] = [
    'env_found' => $envPath ? basename(dirname($envPath)) . '/.env' : 'NOT FOUND',
    'api_key_set' => !empty($apiKey) ? 'yes (' . substr($apiKey, 0, 10) . '...)' : 'NO',
    'php_version' => PHP_VERSION,
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit'),
    'curl_version' => function_exists('curl_version') ? curl_version()['version'] : 'N/A',
    'gd_available' => extension_loaded('gd') ? 'yes' : 'no',
];

// 1. Test connectivity to Claude API (simple text request)
$step = 'Claude_text';
$start = microtime(true);
if ($apiKey) {
    $payload = json_encode([
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 50,
        'messages' => [['role' => 'user', 'content' => 'Reply "ok"']],
    ]);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
            'content-type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlInfo = curl_getinfo($ch);
    curl_close($ch);

    $results[$step] = [
        'status' => $httpCode === 200 ? 'ok' : 'error',
        'http_code' => $httpCode,
        'time_ms' => round((microtime(true) - $start) * 1000),
        'connect_time_ms' => round($curlInfo['connect_time'] * 1000),
        'dns_time_ms' => round($curlInfo['namelookup_time'] * 1000),
        'curl_error' => $curlError ?: null,
        'body_preview' => substr($resp, 0, 200),
    ];
} else {
    $results[$step] = ['status' => 'skip', 'error' => 'No API key'];
}

// 2. Test Claude API with image (vision) - this is the critical test
$step = 'Claude_vision_image';
$start = microtime(true);
if ($apiKey && extension_loaded('gd')) {
    // Create a small test image
    $img = imagecreatetruecolor(200, 80);
    $white = imagecolorallocate($img, 255, 255, 255);
    $black = imagecolorallocate($img, 0, 0, 0);
    imagefill($img, 0, 0, $white);
    imagestring($img, 5, 10, 10, 'Faktura 2024-001', $black);
    imagestring($img, 5, 10, 30, 'Castka: 1234 CZK', $black);
    imagestring($img, 5, 10, 50, 'Dodavatel: Test s.r.o.', $black);
    ob_start();
    imagepng($img);
    $imgBytes = ob_get_clean();
    imagedestroy($img);
    $imgSizeKb = round(strlen($imgBytes) / 1024, 1);

    $base64 = base64_encode($imgBytes);

    $payload = json_encode([
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 500,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => 'image/png', 'data' => $base64]],
                ['type' => 'text', 'text' => 'What text do you see? Reply in 1 sentence.'],
            ],
        ]],
    ]);

    $payloadSizeKb = round(strlen($payload) / 1024, 1);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
            'content-type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlInfo = curl_getinfo($ch);
    curl_close($ch);

    $body = json_decode($resp, true);
    $results[$step] = [
        'status' => $httpCode === 200 ? 'ok' : 'error',
        'http_code' => $httpCode,
        'time_ms' => round((microtime(true) - $start) * 1000),
        'image_size_kb' => $imgSizeKb,
        'payload_size_kb' => $payloadSizeKb,
        'connect_time_ms' => round($curlInfo['connect_time'] * 1000),
        'curl_error' => $curlError ?: null,
        'response_text' => $body['content'][0]['text'] ?? substr($resp, 0, 300),
        'tokens' => $body['usage'] ?? null,
    ];
} else {
    $results[$step] = ['status' => 'skip', 'error' => $apiKey ? 'No GD' : 'No API key'];
}

// 3. Test Claude API with PDF document - the REAL test for invoices
$step = 'Claude_vision_pdf';
$start = microtime(true);
if ($apiKey) {
    // Create a minimal PDF with text
    $pdfContent = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 12 Tf 100 700 Td (Test Faktura) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000266 00000 n \n0000000360 00000 n \ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n429\n%%EOF";

    $base64 = base64_encode($pdfContent);
    $pdfSizeKb = round(strlen($pdfContent) / 1024, 1);

    $payload = json_encode([
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 1000,
        'messages' => [[
            'role' => 'user',
            'content' => [
                ['type' => 'document', 'source' => ['type' => 'base64', 'media_type' => 'application/pdf', 'data' => $base64]],
                ['type' => 'text', 'text' => 'What text is in this PDF? Reply briefly.'],
            ],
        ]],
    ]);

    $payloadSizeKb = round(strlen($payload) / 1024, 1);

    $ch = curl_init('https://api.anthropic.com/v1/messages');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            'x-api-key: ' . $apiKey,
            'anthropic-version: 2023-06-01',
            'content-type: application/json',
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_CONNECTTIMEOUT => 10,
    ]);
    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    $curlInfo = curl_getinfo($ch);
    curl_close($ch);

    $body = json_decode($resp, true);
    $results[$step] = [
        'status' => $httpCode === 200 ? 'ok' : 'error',
        'http_code' => $httpCode,
        'time_ms' => round((microtime(true) - $start) * 1000),
        'pdf_size_kb' => $pdfSizeKb,
        'payload_size_kb' => $payloadSizeKb,
        'connect_time_ms' => round($curlInfo['connect_time'] * 1000),
        'curl_error' => $curlError ?: null,
        'response_text' => $body['content'][0]['text'] ?? substr($resp, 0, 300),
        'tokens' => $body['usage'] ?? null,
    ];
} else {
    $results[$step] = ['status' => 'skip', 'error' => 'No API key'];
}

// 4. Test S3 upload via AWS SDK (need to load autoloader for this)
$step = 'S3_test';
$start = microtime(true);
$awsKey = $env['AWS_ACCESS_KEY_ID'] ?? '';
$awsSecret = $env['AWS_SECRET_ACCESS_KEY'] ?? '';
$awsBucket = $env['AWS_BUCKET'] ?? 'tuptudu-doklady';
$awsRegion = $env['AWS_DEFAULT_REGION'] ?? 'eu-west-1';

if ($awsKey && $awsSecret) {
    // Try loading AWS SDK
    $autoloadPaths = [
        __DIR__.'/../laravel-office/vendor/autoload.php',
        __DIR__.'/../../laravel-office/vendor/autoload.php',
        __DIR__.'/../vendor/autoload.php',
    ];
    $autoloaded = false;
    foreach ($autoloadPaths as $ap) {
        if (file_exists($ap)) {
            require_once $ap;
            $autoloaded = true;
            break;
        }
    }

    if ($autoloaded && class_exists('Aws\S3\S3Client')) {
        try {
            $s3 = new Aws\S3\S3Client([
                'version' => 'latest',
                'region' => $awsRegion,
                'credentials' => [
                    'key' => $awsKey,
                    'secret' => $awsSecret,
                ],
            ]);
            $s3->putObject([
                'Bucket' => $awsBucket,
                'Key' => '_diag/test.txt',
                'Body' => 'diag ' . date('Y-m-d H:i:s'),
            ]);
            $results[$step] = [
                'status' => 'ok',
                'time_ms' => round((microtime(true) - $start) * 1000),
                'bucket' => $awsBucket,
                'region' => $awsRegion,
            ];
            // cleanup
            try { $s3->deleteObject(['Bucket' => $awsBucket, 'Key' => '_diag/test.txt']); } catch (\Exception $e) {}
        } catch (\Exception $e) {
            $results[$step] = [
                'status' => 'error',
                'error' => $e->getMessage(),
                'time_ms' => round((microtime(true) - $start) * 1000),
            ];
        }
    } else {
        $results[$step] = ['status' => 'skip', 'error' => 'AWS SDK not available'];
    }
} else {
    $results[$step] = ['status' => 'skip', 'error' => 'No AWS credentials'];
}

// Summary
$results['_summary'] = [
    'total_time_ms' => round((microtime(true) - $totalStart) * 1000),
    'date' => date('Y-m-d H:i:s T'),
];

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
