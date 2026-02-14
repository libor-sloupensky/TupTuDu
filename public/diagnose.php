<?php
/**
 * Diagnostika uploadu dokladů - dočasný soubor, po otestování smazat!
 */
header('Content-Type: text/plain; charset=utf-8');
echo "=== TupTuDu Diagnostika ===\n\n";

// 1. PHP limity
echo "--- PHP Limity ---\n";
echo "max_execution_time: " . ini_get('max_execution_time') . "s\n";
echo "upload_max_filesize: " . ini_get('upload_max_filesize') . "\n";
echo "post_max_size: " . ini_get('post_max_size') . "\n";
echo "memory_limit: " . ini_get('memory_limit') . "\n";
echo "PHP verze: " . phpversion() . "\n\n";

// Bootstrap Laravel
require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// 2. Test S3
echo "--- Test S3 ---\n";
try {
    $disk = Illuminate\Support\Facades\Storage::disk('s3');
    $testPath = '_diagnostika/test_' . time() . '.txt';
    $disk->put($testPath, 'TupTuDu test ' . date('Y-m-d H:i:s'));
    echo "S3 PUT: OK ($testPath)\n";

    $exists = $disk->exists($testPath);
    echo "S3 EXISTS: " . ($exists ? 'OK' : 'FAIL') . "\n";

    $disk->delete($testPath);
    echo "S3 DELETE: OK\n";
} catch (\Throwable $e) {
    echo "S3 CHYBA: " . $e->getMessage() . "\n";
    echo "Třída: " . get_class($e) . "\n";
}
echo "\n";

// 3. Test Claude API
echo "--- Test Claude API ---\n";
$apiKey = config('services.anthropic.key');
if (empty($apiKey)) {
    echo "CHYBA: Anthropic API klíč není nastaven!\n";
} else {
    echo "API klíč: " . substr($apiKey, 0, 10) . "...\n";
    try {
        $start = microtime(true);
        $response = Illuminate\Support\Facades\Http::timeout(30)->withHeaders([
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'content-type' => 'application/json',
        ])->post('https://api.anthropic.com/v1/messages', [
            'model' => 'claude-haiku-4-5-20251001',
            'max_tokens' => 50,
            'messages' => [
                ['role' => 'user', 'content' => 'Odpověz jedním slovem: funguje?'],
            ],
        ]);
        $elapsed = round(microtime(true) - $start, 2);

        if ($response->successful()) {
            $body = $response->json();
            $text = $body['content'][0]['text'] ?? '(prázdná odpověď)';
            echo "Claude API: OK ({$elapsed}s) - '{$text}'\n";
        } else {
            echo "Claude API CHYBA: HTTP " . $response->status() . "\n";
            echo "Body: " . substr($response->body(), 0, 500) . "\n";
        }
    } catch (\Throwable $e) {
        echo "Claude API VÝJIMKA: " . $e->getMessage() . "\n";
    }
}
echo "\n";

// 4. Test .env hodnoty
echo "--- Konfigurace ---\n";
echo "FILESYSTEM_DISK: " . config('filesystems.default') . "\n";
echo "AWS_BUCKET: " . config('filesystems.disks.s3.bucket') . "\n";
echo "AWS_REGION: " . config('filesystems.disks.s3.region') . "\n";
echo "AWS_KEY: " . (config('filesystems.disks.s3.key') ? substr(config('filesystems.disks.s3.key'), 0, 8) . '...' : 'CHYBÍ') . "\n";
echo "S3 throw: " . (config('filesystems.disks.s3.throw') ? 'true' : 'false') . "\n";
echo "\n";

// 5. Poslední doklady
echo "--- Poslední doklady ---\n";
$posledni = App\Models\Doklad::orderBy('id', 'desc')->take(5)->get(['id', 'nazev_souboru', 'stav', 'chybova_zprava', 'created_at']);
foreach ($posledni as $d) {
    echo "#{$d->id} | {$d->stav} | {$d->nazev_souboru} | {$d->created_at}\n";
    if ($d->chybova_zprava) echo "  Chyba: " . substr($d->chybova_zprava, 0, 200) . "\n";
}
echo "\nCelkem dokladů: " . App\Models\Doklad::count() . "\n";
