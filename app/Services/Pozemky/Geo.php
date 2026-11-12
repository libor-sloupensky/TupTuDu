<?php

namespace App\Services\Pozemky;

/**
 * Geometrie pro pozemky v Evropě. Polygon je vždy [[lat, lon], ...] ve WGS84,
 * stejně jako v editoru (polygon_wgs84). Plochy a vzdálenosti v metrech přes
 * místní rovinnou projekci kolem středu, na pozemek o stovkách metrů to stačí.
 */
class Geo
{
    private const M_NA_STUPEN = 111320.0;

    /** GRS80 (ETRS89), pro WGS84 rozdíl pod milimetr. */
    private const A = 6378137.0;
    private const F = 1 / 298.257222101;

    public static function bodVPolygonu(float $lat, float $lon, array $polygon): bool
    {
        $uvnitr = false;
        $n = count($polygon);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            [$yi, $xi] = $polygon[$i];
            [$yj, $xj] = $polygon[$j];
            if ((($yi > $lat) !== ($yj > $lat)) && ($lon < ($xj - $xi) * ($lat - $yi) / (($yj - $yi) ?: 1e-12) + $xi)) {
                $uvnitr = !$uvnitr;
            }
        }

        return $uvnitr;
    }

    /** Obálka polygonu ve tvaru, který používá editor i WFS dotazy. */
    public static function obalka(array $polygon): array
    {
        $lats = array_column($polygon, 0);
        $lons = array_column($polygon, 1);

        return [
            'min_lat' => min($lats), 'max_lat' => max($lats),
            'min_lon' => min($lons), 'max_lon' => max($lons),
        ];
    }

    /** Střed obálky (jako centroid u parcel z ČÚZK). */
    public static function stred(array $polygon): array
    {
        $o = self::obalka($polygon);

        return [
            'lat' => round(($o['min_lat'] + $o['max_lat']) / 2, 7),
            'lon' => round(($o['min_lon'] + $o['max_lon']) / 2, 7),
        ];
    }

    /** Polygon v metrech kolem vztažného bodu [lat, lon]: x na východ, y na sever. */
    public static function doMetru(array $polygon, array $ref): array
    {
        $cos = cos(deg2rad($ref[0]));

        return array_map(fn ($b) => [
            ($b[1] - $ref[1]) * self::M_NA_STUPEN * $cos,
            ($b[0] - $ref[0]) * self::M_NA_STUPEN,
        ], $polygon);
    }

    /** Plocha polygonu v m². */
    public static function plocha(array $polygon): float
    {
        if (count($polygon) < 3) {
            return 0.0;
        }
        $s = self::stred($polygon);
        $m = self::doMetru($polygon, [$s['lat'], $s['lon']]);
        $suma = 0.0;
        $n = count($m);
        for ($i = 0, $j = $n - 1; $i < $n; $j = $i++) {
            $suma += $m[$j][0] * $m[$i][1] - $m[$i][0] * $m[$j][1];
        }

        return abs($suma) / 2;
    }

    /** Vzdálenost dvou bodů [lat, lon] v metrech (na krátké vzdálenosti). */
    public static function vzdalenost(array $a, array $b): float
    {
        $cos = cos(deg2rad(($a[0] + $b[0]) / 2));

        return hypot(($b[1] - $a[1]) * self::M_NA_STUPEN * $cos, ($b[0] - $a[0]) * self::M_NA_STUPEN);
    }

    /** Čtverec kolem bodu o poloměru v metrech jako obálka. */
    public static function obalkaKolem(float $lat, float $lon, float $metru): array
    {
        $dLat = $metru / self::M_NA_STUPEN;
        $dLon = $metru / (self::M_NA_STUPEN * cos(deg2rad($lat)));

        return ['min_lat' => $lat - $dLat, 'max_lat' => $lat + $dLat, 'min_lon' => $lon - $dLon, 'max_lon' => $lon + $dLon];
    }

    /**
     * Příčné Mercatorovo zobrazení (Krügerovy řady, přesnost pod milimetr).
     * Vrací [východ, sever] v metrech.
     */
    public static function tm(float $lat, float $lon, float $lon0, float $k0, float $fe, float $fn): array
    {
        $f = self::F;
        $n = $f / (2 - $f);
        $e = sqrt($f * (2 - $f));
        $A = self::A / (1 + $n) * (1 + $n ** 2 / 4 + $n ** 4 / 64);
        $alfa = [
            $n / 2 - 2 * $n ** 2 / 3 + 5 * $n ** 3 / 16 + 41 * $n ** 4 / 180,
            13 * $n ** 2 / 48 - 3 * $n ** 3 / 5 + 557 * $n ** 4 / 1440,
            61 * $n ** 3 / 240 - 103 * $n ** 4 / 140,
            49561 * $n ** 4 / 161280,
        ];

        $fi = deg2rad($lat);
        $dl = deg2rad($lon - $lon0);
        $t = sinh(atanh(sin($fi)) - $e * atanh($e * sin($fi)));
        $xi = atan2($t, cos($dl));
        $eta = atanh(sin($dl) / sqrt(1 + $t * $t));

        $x = $eta;
        $y = $xi;
        foreach ($alfa as $j => $a) {
            $k = 2 * ($j + 1);
            $x += $a * cos($k * $xi) * sinh($k * $eta);
            $y += $a * sin($k * $xi) * cosh($k * $eta);
        }

        return [$fe + $k0 * $A * $x, $fn + $k0 * $A * $y];
    }

    /** UTM pásmo (ETRS89 / UTM, EPSG:258xx), vrací [E, N]. */
    public static function utm(float $lat, float $lon, int $pasmo): array
    {
        return self::tm($lat, $lon, $pasmo * 6 - 183, 0.9996, 500000, 0);
    }

    /** Zpětný převod příčného Mercatora [E, N] → [lat, lon] (Krügerovy řady, Karney 2011). */
    public static function tmZpet(float $e, float $nn, float $lon0, float $k0, float $fe, float $fn): array
    {
        $f = self::F;
        $n = $f / (2 - $f);
        $ex = sqrt($f * (2 - $f));
        $A = self::A / (1 + $n) * (1 + $n ** 2 / 4 + $n ** 4 / 64);
        $beta = [
            $n / 2 - 2 * $n ** 2 / 3 + 37 * $n ** 3 / 96 - $n ** 4 / 360,
            $n ** 2 / 48 + $n ** 3 / 15 - 437 * $n ** 4 / 1440,
            17 * $n ** 3 / 480 - 37 * $n ** 4 / 840,
            4397 * $n ** 4 / 161280,
        ];
        $xi = ($nn - $fn) / ($k0 * $A);
        $eta = ($e - $fe) / ($k0 * $A);
        $xi1 = $xi;
        $eta1 = $eta;
        foreach ($beta as $j => $b) {
            $k = 2 * ($j + 1);
            $xi1 -= $b * sin($k * $xi) * cosh($k * $eta);
            $eta1 -= $b * cos($k * $xi) * sinh($k * $eta);
        }
        $tau1 = sin($xi1) / sqrt(sinh($eta1) ** 2 + cos($xi1) ** 2);
        $lon = $lon0 + rad2deg(atan2(sinh($eta1), cos($xi1)));

        $tau = $tau1;
        for ($i = 0; $i < 10; $i++) {
            $sigma = sinh($ex * atanh($ex * $tau / sqrt(1 + $tau * $tau)));
            $tauI = $tau * sqrt(1 + $sigma * $sigma) - $sigma * sqrt(1 + $tau * $tau);
            $d = ($tau1 - $tauI) / sqrt(1 + $tauI * $tauI)
                * (1 + (1 - $ex * $ex) * $tau * $tau) / ((1 - $ex * $ex) * sqrt(1 + $tau * $tau));
            $tau += $d;
            if (abs($d) < 1e-12) {
                break;
            }
        }

        return [rad2deg(atan($tau)), $lon];
    }

    public static function utmZpet(float $e, float $n, int $pasmo): array
    {
        return self::tmZpet($e, $n, $pasmo * 6 - 183, 0.9996, 500000, 0);
    }

    /**
     * Lambertovo azimutální stejnoploché zobrazení Evropy (ETRS89-LAEA, EPSG:3035), vrací [E, N].
     * Elipsoidický vzorec podle Snydera.
     */
    public static function laea(float $lat, float $lon): array
    {
        $a = self::A;
        $e2 = self::F * (2 - self::F);
        $e = sqrt($e2);
        $q = function (float $fi) use ($e, $e2): float {
            $s = sin($fi);

            return (1 - $e2) * ($s / (1 - $e2 * $s * $s) - 1 / (2 * $e) * log((1 - $e * $s) / (1 + $e * $s)));
        };
        $fi0 = deg2rad(52.0);
        $l0 = deg2rad(10.0);
        $qp = $q(M_PI / 2);
        $beta = asin($q(deg2rad($lat)) / $qp);
        $beta0 = asin($q($fi0) / $qp);
        $Rq = $a * sqrt($qp / 2);
        $D = $a * (cos($fi0) / sqrt(1 - $e2 * sin($fi0) ** 2)) / ($Rq * cos($beta0));
        $dl = deg2rad($lon) - $l0;
        $B = $Rq * sqrt(2 / (1 + sin($beta0) * sin($beta) + cos($beta0) * cos($beta) * cos($dl)));

        $x = $B * $D * cos($beta) * sin($dl);
        $y = ($B / $D) * (cos($beta0) * sin($beta) - sin($beta0) * cos($beta) * cos($dl));

        return [4321000 + $x, 3210000 + $y];
    }

    /**
     * Největší vnější prstenec z WKT (POLYGON / MULTIPOLYGON, pořadí os „x y“ = lon lat).
     * Vrací [[lat, lon], ...] nebo prázdné pole.
     */
    public static function zWkt(string $wkt): array
    {
        $wkt = preg_replace('/^SRID=\d+;/i', '', trim($wkt));
        if (!preg_match_all('/\(\(([^()]+)\)/', $wkt, $m)) {
            return [];
        }
        $nej = [];
        foreach ($m[1] as $prstenec) {
            $body = [];
            foreach (explode(',', $prstenec) as $par) {
                $c = preg_split('/\s+/', trim($par));
                if (count($c) >= 2) {
                    $body[] = [(float) $c[1], (float) $c[0]];
                }
            }
            if (count($body) > count($nej)) {
                $nej = $body;
            }
        }

        return $nej;
    }

    /**
     * Polygony z GeoJSON geometrie (souřadnice lon, lat). Vrací seznam vnějších prstenců
     * [[lat, lon], ...], u MultiPolygonu všechny části.
     */
    public static function zGeoJson(?array $geometrie): array
    {
        if (!$geometrie) {
            return [];
        }
        $casti = match ($geometrie['type'] ?? '') {
            'Polygon' => [$geometrie['coordinates']],
            'MultiPolygon' => $geometrie['coordinates'],
            default => [],
        };
        $vystup = [];
        foreach ($casti as $poly) {
            $vnejsi = $poly[0] ?? [];
            if (count($vnejsi) >= 3) {
                $vystup[] = array_map(fn ($c) => [(float) $c[1], (float) $c[0]], $vnejsi);
            }
        }

        return $vystup;
    }

    /** Z více částí vybere tu, ve které leží bod, jinak největší. */
    public static function castSBodem(array $casti, ?float $lat = null, ?float $lon = null): array
    {
        if ($lat !== null) {
            foreach ($casti as $c) {
                if (self::bodVPolygonu($lat, $lon, $c)) {
                    return $c;
                }
            }
        }
        $nej = [];
        $nejPlocha = -1;
        foreach ($casti as $c) {
            $p = self::plocha($c);
            if ($p > $nejPlocha) {
                $nej = $c;
                $nejPlocha = $p;
            }
        }

        return $nej;
    }

    /**
     * Pravidelná mřížka bodů uvnitř polygonu, krok v metrech. Při velkém pozemku se krok
     * zvětší, aby bodů nebylo víc než $max. Vrací [[lat, lon], ...].
     */
    public static function mrizka(array $polygon, float $krok = 2.0, int $max = 5000): array
    {
        $o = self::obalka($polygon);
        $stredLat = ($o['min_lat'] + $o['max_lat']) / 2;
        $krokLat = $krok / self::M_NA_STUPEN;
        $krokLon = $krok / (self::M_NA_STUPEN * cos(deg2rad($stredLat)));

        $sirka = ($o['max_lon'] - $o['min_lon']) / $krokLon;
        $vyska = ($o['max_lat'] - $o['min_lat']) / $krokLat;
        $odhad = max(1, $sirka * $vyska * 0.7);
        if ($odhad > $max) {
            $nasobek = ceil(sqrt($odhad / $max));
            $krokLat *= $nasobek;
            $krokLon *= $nasobek;
        }

        $body = [];
        for ($lat = $o['min_lat']; $lat <= $o['max_lat']; $lat += $krokLat) {
            for ($lon = $o['min_lon']; $lon <= $o['max_lon']; $lon += $krokLon) {
                if (self::bodVPolygonu($lat, $lon, $polygon)) {
                    $body[] = [round($lat, 7), round($lon, 7)];
                }
            }
        }

        return $body;
    }
}
