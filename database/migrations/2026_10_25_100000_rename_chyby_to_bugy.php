<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Přejmenování tabulky `chyby` na `bugy` — sjednocení s běžnou dev terminologií.
 * RENAME zachová všechna data + auto_increment.
 *
 * Starý hlásič zapisoval chyby z artisan příkazů jako typ `cron`; nový je
 * vede jako `server` (rozliší je metoda CLI) — jinak by v přehledu nebyly vidět.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::rename('chyby', 'bugy');

        DB::table('bugy')->where('typ', 'cron')->update(['typ' => 'server']);
    }

    public function down(): void
    {
        Schema::rename('bugy', 'chyby');
    }
};
