<?php
declare(strict_types=1);

/**
 * DOČASNÝ diagnostický test připojení k databázi.
 * Po vyřešení tento soubor SMAZAT (ať není veřejně dostupný).
 */

header('Content-Type: text/plain; charset=utf-8');

$config = require __DIR__ . '/config.php';

// Ověření, že secrets dorazily do config.php (heslo jen jako délka, ne hodnota).
printf(
    "config: host=%s | db=%s | user=%s | pass_len=%d\n\n",
    $config['db_host'],
    $config['db_name'],
    $config['db_user'],
    strlen($config['db_pass'])
);

try {
    $pdo = new PDO(
        sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']),
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $row = $pdo->query('SELECT VERSION() AS v, DATABASE() AS d, NOW() AS t')->fetch(PDO::FETCH_ASSOC);
    echo "Připojení OK\n";
    echo 'Server:   ' . $row['v'] . "\n";
    echo 'Databáze: ' . $row['d'] . "\n";
    echo 'Čas DB:   ' . $row['t'] . "\n";
} catch (PDOException $e) {
    echo 'CHYBA PDO: ' . $e->getMessage() . "\n";
}
