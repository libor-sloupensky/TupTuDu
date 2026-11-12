<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Cog;
use App\Services\Pozemky\Geo;
use App\Services\Pozemky\ZdrojVysek;

/**
 * Rakousko: BEV ALS-DGM 1 m (CC BY 4.0, celé Rakousko). Bodová služba ani WCS není, data jsou
 * Cloud Optimized GeoTIFF po 50 × 50 km v ETRS89-LAEA (EPSG:3035), název podle levého dolního rohu.
 * Čte se jen potřebná dlaždice 512 × 512 přes HTTP Range (Cog). Katastr Rakouska zdarma přes službu není.
 */
class RakouskoVysky implements ZdrojVysek
{
    /** Vydání modelu (složka na data.bev.gv.at). Nové vydání vychází v září, 2026 zatím není (12. 11. 2026). */
    private const VYDANI = '20250915';
    private const DLAZDICE_M = 50000;

    public function vysky(array $body): array
    {
        $laea = array_map(fn ($b) => Geo::laea($b[0], $b[1]), $body);
        // Pozemek přes hranici dvou souborů: po skupinách podle souboru
        $skupiny = [];
        foreach ($laea as $i => [$e, $n]) {
            $klic = sprintf('N%dE%d', floor($n / self::DLAZDICE_M) * self::DLAZDICE_M, floor($e / self::DLAZDICE_M) * self::DLAZDICE_M);
            $skupiny[$klic][$i] = [$e, $n];
        }
        $vysky = array_fill(0, count($body), null);
        foreach ($skupiny as $klic => $xy) {
            $url = 'https://data.bev.gv.at/download/ALS/DTM/' . self::VYDANI . "/ALS_DTM_CRS3035RES50000m{$klic}.tif";
            $z = Cog::hodnoty($url, array_values($xy));
            foreach (array_keys($xy) as $j => $i) {
                $vysky[$i] = $z[$j] === null ? null : round($z[$j], 2);
            }
        }

        return $vysky;
    }
}
