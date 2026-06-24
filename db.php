<?php
declare(strict_types=1);

/**
 * Připojení k databázi (PDO, MariaDB).
 *
 * Přihlašovací údaje se načítají z config.php, který NENÍ ve verzování.
 * Na produkci config.php generuje GitHub Actions z GitHub Secrets,
 * pro lokální vývoj si ho vytvoříš z config.example.php.
 *
 * Použití v jiném souboru:
 *     $pdo = require __DIR__ . '/db.php';
 *     $stmt = $pdo->query('SELECT 1');
 */

$configFile = __DIR__ . '/config.php';

if (!is_file($configFile)) {
    http_response_code(500);
    error_log('db.php: chybí config.php — přihlašovací údaje k databázi nejsou nastavené.');
    exit('Chyba konfigurace databáze.');
}

/** @var array{db_host:string, db_name:string, db_user:string, db_pass:string} $config */
$config = require $configFile;

try {
    $pdo = new PDO(
        sprintf(
            'mysql:host=%s;dbname=%s;charset=utf8mb4',
            $config['db_host'],
            $config['db_name']
        ),
        $config['db_user'],
        $config['db_pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    // Detaily neukazovat návštěvníkovi — jen do logu serveru.
    error_log('db.php: připojení k databázi selhalo: ' . $e->getMessage());
    exit('Připojení k databázi se nezdařilo.');
}

return $pdo;
