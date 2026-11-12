<?php

namespace App\Console\Commands;

use App\Support\KonkurenceImport as Import;
use Illuminate\Console\Command;

/**
 * Načte analýzu konkurence z JSON do DB (modules/konkurence.md). Data leží mimo repozitář
 * (storage/app/konkurence), repozitář je veřejný a parametry v režimu „tiše“ se nezveřejňují.
 */
class KonkurenceImport extends Command
{
    protected $signature = 'konkurence:import {soubor=storage/app/konkurence/import.json : cesta k JSON}
        {--prepsat-rezim : přepsat režim i u existujících parametrů a konkurentů}';

    protected $description = 'Analýzu konkurence (parametry, konkurenti, měření, události) z JSON do DB';

    public function handle(): int
    {
        $cesta = $this->argument('soubor');
        if (! is_file($cesta)) {
            $cesta = base_path($cesta);
        }
        if (! is_file($cesta)) {
            $this->error("Soubor {$this->argument('soubor')} neexistuje.");

            return self::FAILURE;
        }
        $data = json_decode(file_get_contents($cesta), true);
        if (! is_array($data)) {
            $this->error('Soubor není platný JSON: ' . json_last_error_msg());

            return self::FAILURE;
        }

        $s = Import::importuj($data, (bool) $this->option('prepsat-rezim'));
        $this->info("Parametry {$s['parametry']}, konkurenti {$s['konkurenti']}, měření {$s['mereni']}, "
            . "hodnoty {$s['hodnoty']} (+{$s['prevzato']} převzatých), události {$s['udalosti']}.");
        foreach (array_slice($s['chyby'], 0, 20) as $chyba) {
            $this->warn($chyba);
        }

        return $s['chyby'] ? self::FAILURE : self::SUCCESS;
    }
}
