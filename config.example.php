<?php

/**
 * Šablona konfigurace databáze.
 *
 * Pro lokální vývoj zkopíruj tento soubor na config.php a doplň údaje.
 * Na produkci config.php generuje GitHub Actions z GitHub Secrets
 * (DB_HOST, DB_NAME, DB_USER, DB_PASS) — viz .github/workflows/deploy.yml.
 *
 * config.php je v .gitignore a NIKDY se necommituje.
 */

return [
    'db_host' => 'localhost',
    'db_name' => 'tuptuducom',
    'db_user' => 'tuptuducom001',
    'db_pass' => '',
];
