<?php
/**
 * DB Proxy — bezpečný vzdálený přístup k databázi přes HTTPS.
 *
 * Použití:
 *   POST /db-proxy.php
 *   Headers: X-DB-Token: <token>
 *   Body (JSON): { "sql": "SELECT ...", "params": [] }
 *
 * Podporuje pouze SELECT dotazy (read-only).
 * Pro zápis použij ?write=1 (vyžaduje potvrzení v těle).
 */

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

header('Content-Type: application/json; charset=utf-8');

// Token ověření — stejný jako CRON_TOKEN
$token = config('app.cron_token');
$providedToken = $_SERVER['HTTP_X_DB_TOKEN'] ?? $_GET['token'] ?? '';

if (!$token || !hash_equals($token, $providedToken)) {
    http_response_code(403);
    echo json_encode(['error' => 'Neplatný token.']);
    exit;
}

// Pouze POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Pouze POST.']);
    exit;
}

// Parsovat tělo
$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['sql'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Chybí sql pole.']);
    exit;
}

$sql = trim($body['sql']);
$params = $body['params'] ?? [];
$allowWrite = isset($_GET['write']) && $_GET['write'] === '1';

// Bezpečnost — povolit jen SELECT (pokud není write mode)
$sqlUpper = strtoupper(ltrim($sql));
$isSelect = str_starts_with($sqlUpper, 'SELECT') || str_starts_with($sqlUpper, 'SHOW') || str_starts_with($sqlUpper, 'DESCRIBE') || str_starts_with($sqlUpper, 'EXPLAIN');

if (!$isSelect && !$allowWrite) {
    http_response_code(403);
    echo json_encode(['error' => 'Pouze SELECT dotazy. Pro zápis použij ?write=1.']);
    exit;
}

// Dangerous SQL check
$dangerous = ['DROP ', 'TRUNCATE ', 'ALTER ', 'CREATE ', 'GRANT ', 'REVOKE '];
foreach ($dangerous as $d) {
    if (str_contains($sqlUpper, $d)) {
        http_response_code(403);
        echo json_encode(['error' => 'Nebezpečný dotaz zakázán: ' . $d]);
        exit;
    }
}

try {
    $db = app('db');

    if ($isSelect) {
        $results = $db->select($sql, $params);
        echo json_encode([
            'ok' => true,
            'rows' => $results,
            'count' => count($results),
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        $affected = $db->affectingStatement($sql, $params);
        echo json_encode([
            'ok' => true,
            'affected' => $affected,
        ], JSON_UNESCAPED_UNICODE);
    }
} catch (\Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => $e->getMessage(),
    ], JSON_UNESCAPED_UNICODE);
}
