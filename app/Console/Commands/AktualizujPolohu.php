<?php

namespace App\Console\Commands;

use App\Support\PolohaIp;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use MaxMind\Db\Reader;

/**
 * Stáhne aktuální databázi země podle IP (DB-IP IP to Country Lite, vychází měsíčně).
 * Spouští ji cron /cron/poloha/{token}; databáze ze začátku měsíce ještě nemusí
 * být venku, proto se zkusí i předchozí měsíc.
 */
class AktualizujPolohu extends Command
{
    protected $signature = 'poloha:aktualizovat';

    protected $description = 'Stáhne aktuální databázi země podle IP (DB-IP Lite)';

    public function handle(): int
    {
        $cil = PolohaIp::soubor();
        @mkdir(dirname($cil), 0775, true);

        foreach ([now(), now()->subMonthNoOverflow()] as $mesic) {
            $url = 'https://download.db-ip.com/free/dbip-country-lite-' . $mesic->format('Y-m') . '.mmdb.gz';
            $odpoved = Http::timeout(120)->get($url);
            if (! $odpoved->successful()) {
                $this->line("{$url}: HTTP {$odpoved->status()}");
                continue;
            }

            $data = @gzdecode($odpoved->body());
            $docasny = $cil . '.novy';
            if ($data === false || file_put_contents($docasny, $data) === false || ! $this->jePlatna($docasny)) {
                @unlink($docasny);
                Log::error("Databáze polohy z {$url} je poškozená, ponechávám stávající.");

                return self::FAILURE;
            }

            // I tenhle request ji mohl otevřít (určení jazyka v middlewaru)
            PolohaIp::zavri();
            if (! @rename($docasny, $cil)) {
                @unlink($docasny);
                $this->error('Databázi polohy nejde přepsat (soubor drží jiný proces), zkusí se příště.');

                return self::FAILURE;
            }
            $this->info('Databáze polohy aktualizována: ' . $mesic->format('Y-m') . ' (' . round(strlen($data) / 1048576, 1) . ' MB)');

            return self::SUCCESS;
        }

        Log::error('Databázi polohy podle IP se nepodařilo stáhnout (DB-IP).');

        return self::FAILURE;
    }

    /** Zkušební dotaz na známou IP — ať nepřepíšeme funkční databázi rozbitou. */
    private function jePlatna(string $soubor): bool
    {
        try {
            $ctecka = new Reader($soubor);
            $kod = $ctecka->get('8.8.8.8')['country']['iso_code'] ?? null;
            $ctecka->close();

            return is_string($kod) && strlen($kod) === 2;
        } catch (\Throwable) {
            return false;
        }
    }
}
