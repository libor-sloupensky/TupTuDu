<?php
declare(strict_types=1);

/**
 * DOČASNÝ test připojení k databázi.
 * Po ověření na produkci tento soubor SMAZAT (ať není veřejně dostupný).
 */

header('Content-Type: text/plain; charset=utf-8');

$pdo = require __DIR__ . '/db.php';

$row = $pdo->query('SELECT VERSION() AS verze, DATABASE() AS db, NOW() AS cas')->fetch();

echo "Připojení OK\n";
echo 'Server:   ' . $row['verze'] . "\n";
echo 'Databáze: ' . $row['db'] . "\n";
echo 'Čas DB:   ' . $row['cas'] . "\n";
