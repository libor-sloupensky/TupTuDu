<?php

namespace App\Console\Commands;

use App\Models\Bug;
use Illuminate\Console\Command;

/**
 * Hlídač fatálních chyb v laravel.log.
 *
 * Některé chyby zabijí PHP proces dřív, než se exception handler (report()
 * v bootstrap/app.php) dostane k zápisu do bugů: vyčerpaná paměť, vypršelý
 * čas běhu, plný disk. Monolog je do souboru ještě stihne zapsat, do DB už ne.
 * Audit 26. 9. 2026 za 30 dní: v logu 62× paměť, 104× čas, 5× disk — v bugech
 * 2 / 0 / 0. Tenhle příkaz běží denně z cron.php, přečte jen nový kus logu
 * od minulé pozice a zapíše nalezené řádky do bugů (dedup přes soubor:řádek).
 */
class BugyHlidacLogu extends Command
{
    protected $signature = 'bugy:hlidac-logu
        {--od-zacatku : ignorovat uloženou pozici a projít celý log}
        {--limit= : ignorovano (jednotny interface cron/deploy-hook)}';

    protected $description = 'Zapise do bugu fatalni chyby z laravel.log (pamet, cas behu, disk), ktere report() nestihne';

    /** Vzor v řádku → [úroveň bugu, krátký název].
     *  „Maximum execution time" záměrně chybí: v logu je to skoro vždy cron těžby
     *  (webové PHP, 30 s limit, vlastní resume), ne chyba — dělalo to jen šum. */
    private const VZORY = [
        '/Allowed memory size of \d+ bytes exhausted/' => ['error', 'Vyčerpaná paměť'],
        '/No space left on device/' => ['error', 'Plný disk'],
        '/PHP Fatal error|Uncaught (Error|TypeError|ArgumentCountError)/' => ['error', 'Fatální chyba PHP'],
    ];

    public function handle(): int
    {
        $log = storage_path('logs/laravel.log');
        $pozice = storage_path('framework/cache/bugy_hlidac_logu_pozice.txt');
        if (!is_file($log)) {
            $this->line('laravel.log neexistuje — nic ke kontrole.');
            return self::SUCCESS;
        }

        $velikost = filesize($log);
        $od = $this->option('od-zacatku') ? 0 : (is_file($pozice) ? (int) file_get_contents($pozice) : -1);
        if ($od < 0 || $od > $velikost) {
            // První běh nebo log byl rotován/zkrácen → jen posledních 5 MB, ne celá historie.
            $od = max(0, $velikost - 5 * 1024 * 1024);
        }

        $fp = fopen($log, 'rb');
        fseek($fp, $od);
        if ($od > 0) {
            fgets($fp); // zbytek rozpůleného řádku zahodit
        }

        $hranice = now()->subDays(7);
        $nalezeno = [];
        $radku = 0;
        while (($radek = fgets($fp)) !== false) {
            $radku++;
            // Jen hlavičky záznamů "[datum] env.LEVEL: zpráva", ne řádky stack trace.
            if (!preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\] \w+\.(ERROR|CRITICAL|ALERT|EMERGENCY): (.*)$/', $radek, $m)) {
                continue;
            }
            if ($m[1] < $hranice->format('Y-m-d H:i:s')) {
                continue;
            }
            foreach (self::VZORY as $vzor => [$uroven, $nazev]) {
                if (!preg_match($vzor, $m[3])) {
                    continue;
                }
                // Místo pádu: "... at /cesta/soubor.php:129)" v serializované výjimce.
                $misto = preg_match('~ at ([^\s]+\.php):(\d+)\)~', $m[3], $mm)
                    ? basename($mm[1]) . ':' . $mm[2]
                    : 'laravel.log';
                $zprava = preg_replace('/\s*\{"(userId|exception)".*$/s', '', $m[3]);
                $klic = $nazev . '|' . $misto . '|' . preg_replace('/\d+/', 'X', $zprava);
                $nalezeno[$klic] ??= ['uroven' => $uroven, 'nazev' => $nazev, 'misto' => $misto,
                    'zprava' => $zprava, 'pocet' => 0, 'prvni' => $m[1], 'posledni' => $m[1]];
                $nalezeno[$klic]['pocet']++;
                $nalezeno[$klic]['posledni'] = $m[1];
                break;
            }
        }
        $konec = ftell($fp);
        fclose($fp);
        @file_put_contents($pozice, (string) $konec);

        $this->line("Přečteno {$radku} řádků (" . round(($konec - $od) / 1048576, 1) . ' MB), nalezeno ' . count($nalezeno) . ' skupin.');

        foreach ($nalezeno as $n) {
            // Jeden Bug::zachyt = +1 výskyt; doplnit zbytek, ať pocet_vyskytu sedí s logem.
            Bug::zachyt([
                'typ' => 'server',
                'uroven' => $n['uroven'],
                'zprava' => mb_substr("{$n['nazev']} (z laravel.log): {$n['zprava']}", 0, 500),
                'soubor' => $n['misto'],
                'metoda' => 'LOG',
                'kontext' => ['prvni_v_logu' => $n['prvni'], 'posledni_v_logu' => $n['posledni'], 'vyskytu_v_davce' => $n['pocet']],
            ]);
            if ($n['pocet'] > 1) {
                Bug::where('soubor', $n['misto'])->where('opraveno', false)
                    ->where('zprava', 'like', $n['nazev'] . ' (z laravel.log):%')
                    ->increment('pocet_vyskytu', $n['pocet'] - 1);
            }
            $this->warn("  {$n['nazev']} {$n['misto']} ×{$n['pocet']} ({$n['prvni']} … {$n['posledni']})");
        }

        return self::SUCCESS;
    }
}
