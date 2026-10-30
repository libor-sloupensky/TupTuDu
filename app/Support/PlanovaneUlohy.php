<?php

namespace App\Support;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * Jediný plánovač úloh. Hosting umí volat jen URL a nejkratší perioda je 15 min —
 * volá /cron/{CRON_TOKEN} (staré /cron/bugy/{CRON_TOKEN} dělá totéž) a každá úloha
 * si hlídá vlastní interval přes časovou značku ve storage/framework/cache.
 *
 * Nová úloha = artisan příkaz + řádek do ULOHY. Na hostingu se nic nemění.
 */
final class PlanovaneUlohy
{
    /** Artisan příkaz => nejkratší interval mezi běhy v sekundách (0 = při každém volání). */
    public const ULOHY = [
        // Hlásič bugů (modules/bugy.md)
        'bugy:notifikace' => 600,         // e-mail o nových závažných bugech, souhrnně
        'bugy:hlidac-logu' => 86400,      // fatální chyby z laravel.log, denně
        'bugy:pomale-dotazy' => 0,        // mysql.slow_log, bez práv tiše nic

        // Lokalizace (modules/lokalizace.md) — DB-IP vychází měsíčně, týdenní kontrola ji chytí do týdne
        'poloha:aktualizovat' => 604800,

        // Lhůty uchovávání údajů (config/uchovavani.php, zásady ochrany osobních údajů)
        'uchovavani:promazat' => 86400,
    ];

    /** Po neúspěšném běhu dlouhé úlohy to zkusit znovu nejpozději za hodinu, ne až po celém intervalu. */
    private const OPAKOVANI_PO_CHYBE = 3600;

    public static function spust(): string
    {
        $vystup = '';

        foreach (self::ULOHY as $prikaz => $interval) {
            $zamek = storage_path('framework/cache/' . str_replace([':', '-'], '_', $prikaz) . '_last_run.txt');
            // Výstup posledního běhu — u přeskočené úlohy je jinak vidět jen „přeskočeno"
            // a selhání (třeba odeslání mailu) by se při ručním otevření cronu nedalo zjistit.
            $vysledek = substr($zamek, 0, -strlen('_last_run.txt')) . '_last_output.txt';
            $posledni = file_exists($zamek) ? (int) file_get_contents($zamek) : 0;
            if (time() - $posledni < $interval) {
                $vystup .= "--- {$prikaz}: přeskočeno (běžel před " . (time() - $posledni) . " s)\n";
                if (file_exists($vysledek)) {
                    $vystup .= '    poslední výsledek: ' . trim((string) file_get_contents($vysledek)) . "\n";
                }
                continue;
            }

            // Značka PŘED během — souběžné volání cronu stejnou úlohu nespustí podruhé
            @file_put_contents($zamek, time());
            $vystup .= "--- {$prikaz}\n";
            try {
                $kod = Artisan::call($prikaz);
                $vystupUlohy = Artisan::output();
            } catch (\Throwable $e) {
                $kod = 1;
                $vystupUlohy = 'CHYBA: ' . $e->getMessage() . "\n";
                Log::warning("Cron {$prikaz} selhal: " . $e->getMessage());
            }
            $vystup .= $vystupUlohy;
            @file_put_contents($vysledek, date('d.m.Y H:i:s') . ' — ' . (trim($vystupUlohy) ?: '(bez výstupu)'));

            if ($kod !== 0 && $interval > self::OPAKOVANI_PO_CHYBE) {
                @file_put_contents($zamek, time() - $interval + self::OPAKOVANI_PO_CHYBE);
            }
        }

        return $vystup;
    }
}
