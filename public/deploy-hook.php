<?php
/**
 * Post-deploy hook: OPcache reset + view/config cache clear + migrace/seed.
 * Volá se z GitHub Actions po nahrání souborů. Chráněno tokenem (MIGRATE_TOKEN z .env).
 * Část běží bez bootu frameworku kvůli spolehlivosti (cache clear).
 */

$token = $_GET['token'] ?? '';
$envFile = dirname(__DIR__) . '/.env';
$migrateToken = '';
if (file_exists($envFile)) {
    foreach (file($envFile) as $line) {
        if (str_starts_with(trim($line), 'MIGRATE_TOKEN=')) {
            $migrateToken = trim(substr(trim($line), 14));
            break;
        }
    }
}
if (!$migrateToken || $token !== $migrateToken) {
    http_response_code(404);
    die('Not found');
}

header('Content-Type: text/plain; charset=utf-8');

// 1. Reset OPcache
if (function_exists('opcache_reset')) {
    opcache_reset();
    echo "OPcache reset OK\n";
} else {
    echo "OPcache not available\n";
}

// 2. Smazat zkompilované views
$viewCache = dirname(__DIR__) . '/storage/framework/views';
$count = 0;
if (is_dir($viewCache)) {
    foreach (glob($viewCache . '/*.php') as $file) {
        unlink($file);
        $count++;
    }
}
echo "Deleted $count compiled views\n";

// 3. Smazat config/route cache
foreach (glob(dirname(__DIR__) . '/bootstrap/cache/route-*.php') as $f) {
    unlink($f);
    echo "Deleted " . basename($f) . "\n";
}
foreach (['config.php', 'routes-v7.php', 'routes-v8.php', 'services.php', 'packages.php'] as $path) {
    $full = dirname(__DIR__) . '/bootstrap/cache/' . $path;
    if (file_exists($full)) {
        unlink($full);
        echo "Deleted bootstrap/cache/$path\n";
    }
}

// Pomocný boot frameworku (jen když je potřeba)
$bootFramework = function () {
    if (!class_exists(\Illuminate\Support\Facades\Artisan::class)) {
        require dirname(__DIR__) . '/vendor/autoload.php';
        $app = require dirname(__DIR__) . '/bootstrap/app.php';
        $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
        $kernel->bootstrap();
    }
};

// 4. Migrace
if (isset($_GET['migrate'])) {
    echo "\n--- Migrace ---\n";
    try {
        $bootFramework();
        \Illuminate\Support\Facades\Artisan::call('migrate', ['--force' => true]);
        echo \Illuminate\Support\Facades\Artisan::output();
    } catch (\Throwable $e) {
        echo "Migration error: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    }
}

// 5. Seed (?seed=Trida1,Trida2 nebo ?seed=1 pro DatabaseSeeder)
if (isset($_GET['seed'])) {
    $seedParam = $_GET['seed'];
    $seedClasses = ($seedParam === '1' || $seedParam === 'true') ? [null] : explode(',', $seedParam);
    try {
        $bootFramework();
        foreach ($seedClasses as $seederClass) {
            $label = $seederClass ?? 'DatabaseSeeder';
            echo "\n--- Seeder: $label ---\n";
            $args = ['--force' => true];
            if ($seederClass !== null) {
                $args['--class'] = trim($seederClass);
            }
            \Illuminate\Support\Facades\Artisan::call('db:seed', $args);
            echo \Illuminate\Support\Facades\Artisan::output();
        }
    } catch (\Throwable $e) {
        echo "Seeder error: " . $e->getMessage() . "\n";
        echo "File: " . $e->getFile() . ":" . $e->getLine() . "\n";
    }
}

// 6. Tail laravel.log pro diagnostiku (?logs=100)
if (isset($_GET['logs'])) {
    $log = dirname(__DIR__) . '/storage/logs/laravel.log';
    if (!file_exists($log)) {
        echo "\n--- laravel.log neexistuje ---\n";
    } else {
        $n = max(1, min((int) ($_GET['logs'] ?: 100), 500));
        $fp = fopen($log, 'r');
        $size = filesize($log);
        $chunk = min($size, 100_000);
        fseek($fp, max(0, $size - $chunk));
        $data = fread($fp, $chunk);
        fclose($fp);
        $lines = explode("\n", $data);
        $tail = array_slice($lines, -$n);
        echo "\n--- laravel.log (last {$n} lines) ---\n";
        echo implode("\n", $tail) . "\n";
    }
}

echo "\nDone.\n";
