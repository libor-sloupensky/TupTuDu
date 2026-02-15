<?php
/**
 * Diagnostický skript - testuje upload pipeline krok po kroku.
 * DOČASNÝ - smazat po diagnostice!
 */

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->handle($request = Illuminate\Http\Request::capture());

header('Content-Type: application/json');

$results = [];
$totalStart = microtime(true);

// 1. Test S3 connection
$step = 'S3 upload';
$start = microtime(true);
try {
    $testContent = 'diagnostic test ' . date('Y-m-d H:i:s');
    \Illuminate\Support\Facades\Storage::disk('s3')->put('_diag/test.txt', $testContent);
    $results[$step] = [
        'status' => 'ok',
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
} catch (\Exception $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 2. Test Claude API with minimal content (just text, no image)
$step = 'Claude API (text only)';
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
} catch (\Exception $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 3. Test Claude API with a small PDF (the actual bottleneck)
$step = 'Claude API (PDF vision)';
$start = microtime(true);
try {
    // Use the smallest test PDF or generate a minimal one
    // Create a tiny 1x1 white PNG for testing
    $img = imagecreatetruecolor(100, 50);
    $white = imagecolorallocate($img, 255, 255, 255);
    $black = imagecolorallocate($img, 0, 0, 0);
    imagefill($img, 0, 0, $white);
    imagestring($img, 5, 5, 15, 'Test faktura 123', $black);
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
                    ['type' => 'text', 'text' => 'What text do you see? Reply in 1 sentence.'],
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
} catch (\Exception $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'time_ms' => round((microtime(true) - $start) * 1000),
    ];
}

// 4. Test full DokladProcessor with the generated test image
$step = 'Full DokladProcessor';
$start = microtime(true);
try {
    $firma = \App\Models\Firma::first();
    if (!$firma) throw new \Exception('No firma in DB');

    // Save the test image to temp file
    $tmpFile = tempnam(sys_get_temp_dir(), 'diag_') . '.png';
    file_put_contents($tmpFile, $imgBytes);
    $hash = hash('sha256', $imgBytes . '_diag_' . time()); // unique hash to avoid duplicate skip

    $processor = new \App\Services\DokladProcessor();
    $doklady = $processor->process($tmpFile, 'diag_test.png', $firma, $hash, 'upload');

    $results[$step] = [
        'status' => 'ok',
        'time_ms' => round((microtime(true) - $start) * 1000),
        'doklady_count' => count($doklady),
        'first_doklad' => $doklady[0] ? [
            'stav' => $doklady[0]->stav,
            'typ' => $doklady[0]->typ_dokladu,
            'dodavatel' => $doklady[0]->dodavatel_nazev,
            'castka' => $doklady[0]->castka_celkem,
        ] : null,
    ];

    // Clean up: delete the test doklad(s)
    foreach ($doklady as $d) {
        if ($d->cesta_souboru) {
            try { \Illuminate\Support\Facades\Storage::disk('s3')->delete($d->cesta_souboru); } catch (\Exception $e) {}
        }
        $d->delete();
    }
    @unlink($tmpFile);
} catch (\Exception $e) {
    $results[$step] = [
        'status' => 'error',
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
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
];

// Clean up S3 diag file
try {
    \Illuminate\Support\Facades\Storage::disk('s3')->delete('_diag/test.txt');
} catch (\Exception $e) {}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
