<?php
/**
 * Diagnostický skript - testuje upload pipeline krok po kroku.
 * DOČASNÝ - smazat po diagnostice!
 */
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json; charset=utf-8');

// Detect base path (same logic as index.php)
if (file_exists(__DIR__.'/../laravel-office/vendor/autoload.php')) {
    $basePath = __DIR__.'/../laravel-office';
} elseif (file_exists(__DIR__.'/../../laravel-office/vendor/autoload.php')) {
    $basePath = __DIR__.'/../../laravel-office';
} else {
    $basePath = __DIR__.'/..';
}

require $basePath.'/vendor/autoload.php';
$app = require_once $basePath.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle($request = Illuminate\Http\Request::capture());

$results = [];
$totalStart = microtime(true);

// 1. Test S3 connection
$step = 'S3_upload';
$start = microtime(true);
try {
    $testContent = 'diagnostic test ' . date('Y-m-d H:i:s');
    \Illuminate\Support\Facades\Storage::disk('s3')->put('_diag/test.txt', $testContent);
    $results[$step] = [
        'status' => 'ok',
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
} catch (\Throwable $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 2. Test Claude API with minimal content (just text, no image)
$step = 'Claude_API_text';
$start = microtime(true);
try {
    $apiKey = config('services.anthropic.key');
    if (empty($apiKey)) throw new \Exception('No API key');

    $response = \Illuminate\Support\Facades\Http::timeout(30)->withHeaders([
        'x-api-key' => $apiKey,
        'anthropic-version' => '2023-06-01',
        'content-type' => 'application/json',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 50,
        'messages' => [
            ['role' => 'user', 'content' => 'Reply with just "ok"']
        ],
    ]);

    $results[$step] = [
        'status' => $response->successful() ? 'ok' : 'error',
        'http_code' => $response->status(),
        'time_ms' => round((microtime(true) - $start) * 1000),
        'body_preview' => substr($response->body(), 0, 200),
    ];
} catch (\Throwable $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 3. Test Claude API with a small generated PNG image
$step = 'Claude_API_vision';
$start = microtime(true);
$imgBytes = null;
try {
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

    $base64 = base64_encode($imgBytes);

    $response = \Illuminate\Support\Facades\Http::timeout(60)->withHeaders([
        'x-api-key' => $apiKey,
        'anthropic-version' => '2023-06-01',
        'content-type' => 'application/json',
    ])->post('https://api.anthropic.com/v1/messages', [
        'model' => 'claude-haiku-4-5-20251001',
        'max_tokens' => 500,
        'messages' => [
            [
                'role' => 'user',
                'content' => [
                    ['type' => 'image', 'source' => ['type' => 'base64', 'media_type' => 'image/png', 'data' => $base64]],
                    ['type' => 'text', 'text' => 'What text do you see? Reply briefly.'],
                ],
            ],
        ],
    ]);

    $body = $response->json();
    $results[$step] = [
        'status' => $response->successful() ? 'ok' : 'error',
        'http_code' => $response->status(),
        'time_ms' => round((microtime(true) - $start) * 1000),
        'response_text' => $body['content'][0]['text'] ?? substr($response->body(), 0, 300),
        'tokens' => $body['usage'] ?? null,
    ];
} catch (\Throwable $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 4. Test full DokladProcessor with the generated test image
$step = 'Full_DokladProcessor';
$start = microtime(true);
try {
    $firma = \App\Models\Firma::first();
    if (!$firma) throw new \Exception('No firma in DB');

    if (!$imgBytes) throw new \Exception('No test image generated in step 3');

    $tmpFile = tempnam(sys_get_temp_dir(), 'diag_') . '.png';
    file_put_contents($tmpFile, $imgBytes);
    $hash = hash('sha256', $imgBytes . '_diag_' . time());

    $processor = new \App\Services\DokladProcessor();
    $doklady = $processor->process($tmpFile, 'diag_test.png', $firma, $hash, 'upload');

    $results[$step] = [
        'status' => 'ok',
        'time_ms' => round((microtime(true) - $start) * 1000),
        'doklady_count' => count($doklady),
        'first_doklad' => count($doklady) > 0 ? [
            'stav' => $doklady[0]->stav,
            'typ' => $doklady[0]->typ_dokladu,
            'dodavatel' => $doklady[0]->dodavatel_nazev,
            'castka' => $doklady[0]->castka_celkem,
        ] : null,
    ];

    // Clean up test doklady
    foreach ($doklady as $d) {
        if ($d->cesta_souboru) {
            try { \Illuminate\Support\Facades\Storage::disk('s3')->delete($d->cesta_souboru); } catch (\Throwable $e) {}
        }
        $d->delete();
    }
    @unlink($tmpFile);
} catch (\Throwable $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// Summary
$results['_summary'] = [
    'total_time_ms' => round((microtime(true) - $totalStart) * 1000),
    'php_version' => PHP_VERSION,
    'max_execution_time' => ini_get('max_execution_time'),
    'memory_limit' => ini_get('memory_limit'),
    'date' => date('Y-m-d H:i:s'),
    'base_path' => realpath($basePath),
];

// Clean up S3 diag file
try {
    \Illuminate\Support\Facades\Storage::disk('s3')->delete('_diag/test.txt');
} catch (\Throwable $e) {}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
