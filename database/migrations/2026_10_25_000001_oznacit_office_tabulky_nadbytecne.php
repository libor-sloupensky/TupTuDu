<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Modul Doklady (kopie projektu office) byl z TupTuDu odstraněn — živá verze běží
// v projektu TupTuDu_office na office.tuptudu.cz. Tabulky office_* zůstávají jen jako
// zastaralá kopie dat z 11. 8. 2026; komentář je označí, ať v databázi nematou.
// Na čisté instalaci tabulky neexistují (migrace modulu je smazaná) → nic se nestane.
return new class extends Migration
{
    private const TABULKY = [
        'office_firmy',
        'office_dodavatele',
        'office_user_firma',
        'office_ucetni_vazby',
        'office_pozvani',
        'office_kategorie',
        'office_doklady',
        'office_polozky',
    ];

    private const KOMENTAR = 'NADBYTEČNÉ – zastaralá kopie modulu Doklady (office), kód odstraněn 2026-10-25. Nepoužívat.';

    public function up(): void
    {
        $this->nastavKomentar(self::KOMENTAR);
    }

    public function down(): void
    {
        $this->nastavKomentar('');
    }

    private function nastavKomentar(string $komentar): void
    {
        // Komentář tabulky umí jen MySQL/MariaDB
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        foreach (self::TABULKY as $tabulka) {
            if (Schema::hasTable($tabulka)) {
                DB::statement('ALTER TABLE `' . $tabulka . '` COMMENT = ' . DB::getPdo()->quote($komentar));
            }
        }
    }
};
