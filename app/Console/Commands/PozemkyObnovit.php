<?php

namespace App\Console\Commands;

use App\Services\Pozemky\Mezipamet;
use App\Services\Pozemky\Pozemky;
use Illuminate\Console\Command;

/**
 * Tichá obnova dat pozemků v mezipaměti serveru (pozemky_cache) z národních služeb.
 * Spouští ji plánovač každých 15 minut (App\Support\PlanovaneUlohy), po malých dávkách.
 * Neúspěšná obnova nechá stará data a zkusí to znovu nejdřív za den.
 */
class PozemkyObnovit extends Command
{
    protected $signature = 'pozemky:obnovit {--limit= : nejvýš tolik záznamů (výchozí config pozemky.mezipamet.na_beh)}';

    protected $description = 'Tiše obnoví zastaralá data pozemků (výšky, okolní parcely, stavby) z národních služeb';

    public function handle(Mezipamet $mezipamet, Pozemky $pozemky): int
    {
        // Pomalé služby (Itálie až 45 s) nesmí shodit běh plánovače
        @set_time_limit(600);
        $limit = (int) ($this->option('limit') ?: config('pozemky.mezipamet.na_beh', 10));
        [$obnoveno, $chyb] = $mezipamet->obnov(fn ($druh, $zeme, $parametry) => $pozemky->spoctiCerstve($druh, $zeme, $parametry), $limit);
        $this->line("Obnoveno {$obnoveno}, nepodařilo se {$chyb}.");

        return self::SUCCESS;
    }
}
