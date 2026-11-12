<?php

namespace App\Services\Pozemky;

use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cloud Optimized GeoTIFF po částech přes HTTP Range: hlavička z prvních bajtů, pak jen dlaždice,
 * do kterých padnou body. Soubory mají desítky GB (Rakousko 50 × 50 km po 1 m), stahuje se ~0,5 MB na dlaždici.
 */
class Cog
{
    private const HLAVICKA_B = 262144;

    /**
     * Výšky v bodech [[x, y], ...] (souřadnice v CRS souboru), null mimo data.
     */
    public static function hodnoty(string $url, array $xy): array
    {
        $hlavicka = self::rozsah($url, 0, self::HLAVICKA_B - 1);
        $tif = GeoTiff::hlavicka($hlavicka);
        $ifd = $tif->ifd;
        if (!isset($ifd[322], $ifd[324], $ifd[325])) {
            throw new RuntimeException('COG bez dlaždic');
        }
        // Tabulky dlaždic za načtenou hlavičkou: dočíst
        foreach ([324, 325] as $tag) {
            if (isset($ifd[$tag]['odkaz'])) {
                $o = $ifd[$tag];
                $vel = $o['typ'] === 16 ? 8 : 4;
                $raw = self::rozsah($url, $o['odkaz'], $o['odkaz'] + $o['pocet'] * $vel - 1);
                $kod = $o['typ'] === 16 ? ($tif->poradi === '<' ? 'P*' : 'J*') : ($tif->poradi === '<' ? 'V*' : 'N*');
                $ifd[$tag] = array_values(unpack($kod, $raw));
            }
        }
        $tw = (int) $ifd[322][0];
        $th = (int) $ifd[323][0];
        $naRadek = (int) ceil($tif->sirka / $tw);

        // Pixely (středy) bodů a potřebné dlaždice
        $px = array_map(fn ($b) => $tif->naPixel($b[0], $b[1]), $xy);
        $dlazdice = [];
        foreach ($px as [$s, $r]) {
            foreach ([[floor($s), floor($r)], [floor($s) + 1, floor($r) + 1]] as [$ss, $rr]) {
                if ($ss < 0 || $rr < 0 || $ss >= $tif->sirka || $rr >= $tif->vyska) {
                    continue;
                }
                $dlazdice[(int) floor($rr / $th) * $naRadek + (int) floor($ss / $tw)] = true;
            }
        }
        if (count($dlazdice) > 16) {
            throw new RuntimeException(__('ed_nastroje.katastr.pozemek_velky'));
        }

        // Dlaždice paralelně, každá rozbalená do pole hodnot
        $indexy = array_keys($dlazdice);
        $odpovedi = Http::pool(fn (Pool $pool) => array_map(
            fn ($i) => $pool->timeout(25)->withHeaders(['Range' => 'bytes=' . $ifd[324][$i] . '-' . ($ifd[324][$i] + $ifd[325][$i] - 1)])->get($url),
            $indexy
        ));
        $data = [];
        foreach ($indexy as $k => $i) {
            $o = $odpovedi[$k] ?? null;
            if (!$o instanceof \Illuminate\Http\Client\Response || !in_array($o->status(), [200, 206], true)) {
                throw new RuntimeException('COG: dlaždice se nenačetla');
            }
            $data[$i] = $tif->dekoduj($o->body(), $tw, $th);
        }

        $pixel = function (int $s, int $r) use ($data, $tw, $th, $naRadek): ?float {
            $i = intdiv($r, $th) * $naRadek + intdiv($s, $tw);
            $v = $data[$i][($r % $th) * $tw + ($s % $tw)] ?? null;

            return ($v === null || $v < -1000 || $v > 10000 || is_nan($v)) ? null : (float) $v;
        };

        return array_map(function ($p) use ($pixel, $tif) {
            [$s, $r] = $p;
            if ($s < -0.5 || $r < -0.5 || $s > $tif->sirka - 0.5 || $r > $tif->vyska - 0.5) {
                return null;
            }
            $s0 = (int) floor($s);
            $r0 = (int) floor($r);
            $ts = $s - $s0;
            $tr = $r - $r0;
            $s1 = min($s0 + 1, $tif->sirka - 1);
            $r1 = min($r0 + 1, $tif->vyska - 1);
            $s0 = max($s0, 0);
            $r0 = max($r0, 0);
            $v = [$pixel($s0, $r0), $pixel($s1, $r0), $pixel($s0, $r1), $pixel($s1, $r1)];
            if (in_array(null, $v, true)) {
                return $pixel((int) round(max(0, $s)), (int) round(max(0, $r)));
            }

            return ($v[0] * (1 - $ts) + $v[1] * $ts) * (1 - $tr) + ($v[2] * (1 - $ts) + $v[3] * $ts) * $tr;
        }, $px);
    }

    private static function rozsah(string $url, int $od, int $do): string
    {
        $o = Http::timeout(25)->withHeaders(['Range' => "bytes={$od}-{$do}"])->get($url);
        if (!in_array($o->status(), [200, 206], true)) {
            throw new RuntimeException("COG: soubor nedostupný (HTTP {$o->status()})");
        }

        return $o->body();
    }
}
