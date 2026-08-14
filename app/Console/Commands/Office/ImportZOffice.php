<?php

namespace App\Console\Commands\Office;

use App\Models\Uzivatel;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Naimportuje data modulu Doklady z projektu office.
 *
 * Zdrojem je JSON vyexportovaný z původní databáze (database/import/office-data.json).
 * Příkaz je idempotentní — dá se pustit opakovaně a jen doplní, co přibylo,
 * takže se před ostrým spuštěním můžou dotáhnout doklady, které mezitím
 * v office přistály.
 *
 * Co se NEpřenáší:
 *  - Google refresh token a hesla k mailům. Jsou zašifrované klíčem původního
 *    projektu a jiným APP_KEY je nelze dešifrovat → Drive a vlastní schránku
 *    je nutné připojit znovu.
 *  - Přístupy uživatelů, kteří v tomhle projektu ještě nemají účet. Vypíšou se
 *    na konci; dořeší je buď registrace, nebo pozvánka.
 */
class ImportZOffice extends Command
{
    protected $signature = 'doklady:import-z-office
                            {--soubor= : Cesta k JSON exportu (výchozí database/import/office-data.json)}
                            {--sucho : Jen vypíše, co by se stalo, nic nezapíše}';

    protected $description = 'Naimportuje doklady, firmy a dodavatele z původního projektu office';

    public function handle(): int
    {
        $soubor = $this->option('soubor') ?: database_path('import/office-data.json');
        $nasucho = (bool) $this->option('sucho');

        if (! is_file($soubor)) {
            $this->error("Soubor s exportem nenalezen: {$soubor}");

            return self::FAILURE;
        }

        $data = json_decode(file_get_contents($soubor), true);
        if (! is_array($data)) {
            $this->error('Export se nepodařilo přečíst — poškozený JSON.');

            return self::FAILURE;
        }

        $this->info('Export z ' . ($data['vytvoreno'] ?? '?') . ' (' . ($data['zdroj'] ?? '?') . ')');
        if ($nasucho) {
            $this->warn('SUCHÝ BĚH — nic se nezapisuje.');
        }

        // Pořadí kvůli vazbám: firmy → dodavatelé → doklady → položky
        $this->uloz('office_firmy', $data['firmy'] ?? [], 'ico', $nasucho);
        $this->uloz('office_dodavatele', $data['dodavatele'] ?? [], 'ico', $nasucho);
        $this->uloz('office_kategorie', $data['kategorie'] ?? [], 'id', $nasucho);
        $this->uloz('office_ucetni_vazby', $data['ucetni_vazby'] ?? [], 'id', $nasucho);
        $this->uloz('office_pozvani', $data['pozvani'] ?? [], 'id', $nasucho);
        $this->uloz('office_doklady', $data['doklady'] ?? [], 'id', $nasucho);
        $this->uloz('office_polozky', $data['polozky'] ?? [], 'id', $nasucho);

        $this->importujPristupy($data['pristupy'] ?? [], $nasucho);

        $this->newLine();
        $this->info('Hotovo.');
        $this->line('Nezapomeň znovu připojit Google Drive a případnou vlastní schránku —');
        $this->line('tokeny a hesla se přenést nedaly (jiný šifrovací klíč).');

        return self::SUCCESS;
    }

    /**
     * Zapíše řádky do tabulky. Existující (podle klíče) přepíše, nové vloží —
     * proto lze příkaz pouštět opakovaně.
     */
    private function uloz(string $tabulka, array $radky, string $klic, bool $nasucho): void
    {
        if (! $radky) {
            $this->line(sprintf('  %-22s nic k importu', $tabulka));

            return;
        }

        $novych = 0;
        $aktualizovanych = 0;

        foreach (array_chunk($radky, 100) as $davka) {
            foreach ($davka as $radek) {
                $existuje = DB::table($tabulka)->where($klic, $radek[$klic])->exists();

                if (! $nasucho) {
                    DB::table($tabulka)->updateOrInsert([$klic => $radek[$klic]], $radek);
                }

                $existuje ? $aktualizovanych++ : $novych++;
            }
        }

        $this->line(sprintf('  %-22s %4d nových, %4d aktualizovaných', $tabulka, $novych, $aktualizovanych));
    }

    /**
     * Přístupy k firmám se párují podle e-mailu — uživatelé mají v tomhle
     * projektu jiná id než v office.
     */
    private function importujPristupy(array $pristupy, bool $nasucho): void
    {
        $pridano = 0;
        $chybejici = [];

        foreach ($pristupy as $p) {
            $uzivatel = Uzivatel::where('email', $p['email'])->first();

            if (! $uzivatel) {
                $chybejici[] = $p['email'] . ' → ' . $p['firma_ico'];
                continue;
            }

            $uz = DB::table('office_user_firma')
                ->where('user_id', $uzivatel->id)
                ->where('firma_ico', $p['firma_ico'])
                ->exists();

            if ($uz) {
                continue;
            }

            if (! $nasucho) {
                DB::table('office_user_firma')->insert([
                    'user_id' => $uzivatel->id,
                    'firma_ico' => $p['firma_ico'],
                    'role' => $p['role'],
                    'interni_role' => $p['interni_role'],
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $pridano++;
        }

        $this->line(sprintf('  %-22s %4d přiřazení', 'office_user_firma', $pridano));

        if ($chybejici) {
            $this->newLine();
            $this->warn('Uživatelé, kteří tu ještě nemají účet (přístup se nepřiřadil):');
            foreach ($chybejici as $c) {
                $this->line('    ' . $c);
            }
            $this->line('  Přiřadí se sami, až se zaregistrují — nebo přes pozvánku.');
        }
    }
}
