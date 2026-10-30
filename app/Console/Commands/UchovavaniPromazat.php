<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Maže údaje po uplynutí lhůty z config/uchovavani.php — tytéž lhůty uvádějí
 * zásady ochrany osobních údajů. Běží denně z App\Support\PlanovaneUlohy.
 *
 * Účty a projekty se tu nemažou — žijí, dokud účet existuje.
 */
class UchovavaniPromazat extends Command
{
    protected $signature = 'uchovavani:promazat {--dry-run : Jen vypíše, co by smazal}';

    protected $description = 'Smaže údaje starší než lhůty uchovávání (kontaktní zprávy, bugy, 404, počty úprav, laravel.log, tokeny hesel)';

    public function handle(): int
    {
        $suchy = (bool) $this->option('dry-run');
        $technicke = now()->subMonths((int) config('uchovavani.technicke_zaznamy_mesicu'));

        $tabulky = [
            'kontaktni_zpravy' => ['created_at', now()->subMonths((int) config('uchovavani.kontaktni_zpravy_mesicu'))],
            'bugy' => ['naposledy_v', $technicke],
            'seo_404' => ['naposledy_v', $technicke],
            'denni_upravy' => ['den', now()->subMonths((int) config('uchovavani.denni_upravy_mesicu'))->startOfDay()],
            // Odkaz pro obnovu hesla po vypršení k ničemu není
            'reset_hesel' => ['created_at', now()->subMinutes((int) config('auth.passwords.users.expire', 60))],
        ];

        foreach ($tabulky as $tabulka => [$sloupec, $hranice]) {
            $dotaz = DB::table($tabulka)->where($sloupec, '<', $hranice);
            $pocet = $suchy ? $dotaz->count() : $dotaz->delete();
            $this->line(($suchy ? '[dry-run] ' : '') . "{$tabulka}: {$pocet} starších než " . $hranice->format('d.m.Y H:i'));
        }

        $this->line(($suchy ? '[dry-run] ' : '') . 'laravel.log: ' . $this->zkratLog($technicke, $suchy));

        return self::SUCCESS;
    }

    /**
     * Zahodí z laravel.log záznamy starší než hranice. Záznam začíná „[YYYY-MM-DD HH:MM:SS]",
     * víceřádkový stack trace patří k předchozímu záznamu. Hlídač logu (bugy:hlidac-logu)
     * zkrácení pozná a čte dál od konce.
     */
    private function zkratLog(\DateTimeInterface $hranice, bool $suchy): string
    {
        $log = storage_path('logs/laravel.log');
        if (! is_file($log)) {
            return 'neexistuje';
        }

        $fp = fopen($log, 'rb');
        $hraniceText = $hranice->format('Y-m-d H:i:s');
        $odriznout = null;
        while (($radek = fgets($fp)) !== false) {
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]/', $radek, $m)) {
                if ($m[1] >= $hraniceText) {
                    $odriznout = ftell($fp) - strlen($radek);
                    break;
                }
            }
        }
        $velikost = ftell($fp);
        // Celý log je starší než hranice → zahodit vše
        $odriznout ??= $velikost;

        if ($odriznout === 0) {
            fclose($fp);
            return 'nic starého';
        }
        if ($suchy) {
            fclose($fp);
            return 'odřízl bych ' . round($odriznout / 1024) . ' kB';
        }

        fseek($fp, $odriznout);
        $docasny = $log . '.zkracovani';
        $zbytek = fopen($docasny, 'wb');
        stream_copy_to_stream($fp, $zbytek);
        fclose($zbytek);
        fclose($fp);

        if (! @rename($docasny, $log)) {
            @unlink($docasny);
            // Ne Log::error — zapsal by do souboru, který právě nejde přepsat; stačí výstup cronu
            Log::warning('uchovavani:promazat — laravel.log nešlo přepsat');
            return 'přepsání selhalo';
        }

        return 'odříznuto ' . round($odriznout / 1024) . ' kB';
    }
}
