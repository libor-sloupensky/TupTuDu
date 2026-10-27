<?php

namespace App\Console\Commands;

use App\Models\Bug;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Načte nové pomalé DB dotazy z `mysql.slow_log` a zapíše je (zkráceně) do
 * tabulky `bugy` jako typ `pomaly_dotaz` → ladicí výpis v /masterteam/bugy.
 *
 * Souvislost: viz project_perf_pomale_requesty — hledáme, který projekt na
 * sdíleném DB serveru (gve08) přetěžuje databázi. `mysql.slow_log` obsahuje
 * dotazy VŠECH projektů; sloupec `db` říká, o který projekt jde.
 *
 * Best-effort: když je slow log vypnutý nebo náš účet nemá `GRANT SELECT ON
 * mysql.slow_log`, příkaz tiše skončí (nic nerozbije). Slow log je nastavený
 * dynamicky (root: `SET GLOBAL slow_query_log=ON; long_query_time=2;
 * log_output=TABLE`) — po restartu MySQL se vypne, dokud se nedá do my.cnf.
 *
 * Dedup přes Bug::zachyt (hash normalizuje čísla) → stejný tvar dotazu ze
 * stejné db = jeden řádek s počtem výskytů. Watermark (cache) brání
 * opakovanému čtení už zpracovaných řádků.
 */
class BugyPomaleDotazy extends Command
{
    protected $signature = 'bugy:pomale-dotazy {--limit=200}';

    protected $description = 'Přenese nové pomalé dotazy z mysql.slow_log do bugů (typ pomaly_dotaz).';

    public function handle(): int
    {
        $watermark = Cache::get('slow_log_watermark');

        try {
            $q = DB::table('mysql.slow_log')
                ->select([
                    'start_time',
                    DB::raw('TIME_TO_SEC(query_time) AS sekundy'),
                    'db',
                    'rows_examined',
                    DB::raw('LEFT(sql_text, 500) AS sql_kratky'),
                ])
                ->orderBy('start_time');

            if ($watermark) {
                $q->where('start_time', '>', $watermark);
            }

            $rows = $q->limit((int) $this->option('limit'))->get();
        } catch (\Throwable $e) {
            // Slow log nedostupný (vypnutý / bez GRANT) — tiše skončit.
            return self::SUCCESS;
        }

        if ($rows->isEmpty()) {
            return self::SUCCESS;
        }

        $maxStart = $watermark;
        $pocet = 0;

        foreach ($rows as $r) {
            $sql = trim(preg_replace('/\s+/', ' ', (string) $r->sql_kratky));
            // Přeskočit administrativu slow logu samotného a prázdné
            if ($sql === '' || stripos($sql, 'slow_log') !== false) {
                if (! $maxStart || $r->start_time > $maxStart) {
                    $maxStart = $r->start_time;
                }
                continue;
            }

            $db = $r->db ?: '?';
            Bug::zachyt([
                'typ' => 'pomaly_dotaz',
                'uroven' => 'warning',
                'zprava' => "Pomalý dotaz [{$db}]: " . mb_substr($sql, 0, 200),
                'soubor' => 'db: ' . $db,
                'kontext' => [
                    'sekundy' => (int) $r->sekundy,
                    'db' => $r->db,
                    'rows_examined' => (int) $r->rows_examined,
                    'sql' => mb_substr($sql, 0, 500),
                ],
            ]);

            if (! $maxStart || $r->start_time > $maxStart) {
                $maxStart = $r->start_time;
            }
            $pocet++;
        }

        if ($maxStart) {
            Cache::forever('slow_log_watermark', $maxStart);
        }

        $this->info("Zpracováno pomalých dotazů: {$pocet}");

        return self::SUCCESS;
    }
}
