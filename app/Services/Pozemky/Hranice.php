<?php

namespace App\Services\Pozemky;

/**
 * Do které země (nebo spolkové země) padne bod. Zjednodušené hranice z Natural Earth 1:10m
 * (volné dílo), přesnost asi 200–500 m, u hranice se proto zkouší i sousední.
 *   resources/data/hranice-statu.json            evropské státy (ISO 3166-1)
 *   resources/data/hranice-spolkovych-zemi.json  německé spolkové země (ISO 3166-2 bez DE-)
 * Tvar: {"CZ": [[[lat, lon], ...], ...], ...}
 */
class Hranice
{
    public const STATY = 'hranice-statu';
    public const SPOLKOVE_ZEME = 'hranice-spolkovych-zemi';

    private static array $data = [];
    private static array $obalky = [];

    private static function data(string $sada): array
    {
        if (!isset(self::$data[$sada])) {
            self::$data[$sada] = json_decode(file_get_contents(resource_path("data/{$sada}.json")), true) ?: [];
            foreach (self::$data[$sada] as $kod => $prstence) {
                foreach ($prstence as $i => $p) {
                    self::$obalky[$sada][$kod][$i] = Geo::obalka($p);
                }
            }
        }

        return self::$data[$sada];
    }

    /** Země, ve které bod leží, nebo null (moře, mimo Evropu). */
    public static function zeme(float $lat, float $lon, string $sada = self::STATY): ?string
    {
        foreach (self::data($sada) as $kod => $prstence) {
            foreach ($prstence as $i => $p) {
                $o = self::$obalky[$sada][$kod][$i];
                if ($lat < $o['min_lat'] || $lat > $o['max_lat'] || $lon < $o['min_lon'] || $lon > $o['max_lon']) {
                    continue;
                }
                if (Geo::bodVPolygonu($lat, $lon, $p)) {
                    return $kod;
                }
            }
        }

        return null;
    }

    /**
     * Země, jejichž hranice je od bodu blíž než $metru (nebo bod leží uvnitř).
     * Zjednodušená hranice se od skutečné liší o stovky metrů, u hranice se proto zkouší obě země.
     */
    public static function blizke(float $lat, float $lon, float $metru = 1500, string $sada = self::STATY): array
    {
        $rezerva = $metru / 111320 * 1.6;
        $cos = cos(deg2rad($lat));
        $vystup = [];
        foreach (self::data($sada) as $kod => $prstence) {
            foreach ($prstence as $i => $p) {
                $o = self::$obalky[$sada][$kod][$i];
                if ($lat < $o['min_lat'] - $rezerva || $lat > $o['max_lat'] + $rezerva
                    || $lon < $o['min_lon'] - $rezerva || $lon > $o['max_lon'] + $rezerva) {
                    continue;
                }
                if (Geo::bodVPolygonu($lat, $lon, $p) || self::vzdalenostOdPrstence($lat, $lon, $p, $cos) <= $metru) {
                    $vystup[] = $kod;
                    break;
                }
            }
        }

        return $vystup;
    }

    private static function vzdalenostOdPrstence(float $lat, float $lon, array $p, float $cos): float
    {
        $nej = INF;
        $n = count($p);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $ax = ($p[$j][1] - $lon) * $cos;
            $ay = $p[$j][0] - $lat;
            $bx = ($p[$i][1] - $lon) * $cos;
            $by = $p[$i][0] - $lat;
            $dx = $bx - $ax;
            $dy = $by - $ay;
            $t = max(0, min(1, -($ax * $dx + $ay * $dy) / (($dx * $dx + $dy * $dy) ?: 1e-18)));
            $nej = min($nej, hypot($ax + $t * $dx, $ay + $t * $dy));
        }

        return $nej * 111320;
    }
}
