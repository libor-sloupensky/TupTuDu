<?php

namespace App\Services\Pozemky;

/**
 * Výška geoidu EGM2008 nad elipsoidem (m) pro Evropu, mřížka 5' (GeographicLib egm2008-5).
 * Pro služby, které vrací výšku nad elipsoidem ETRS89 místo nadmořské (Slovensko INSPIRE):
 * nadmořská výška ≈ elipsoidická − N. Ověřeno na Kriváni: 2537,22 − 42,89 = 2494,33 m (úředně 2494,7 m).
 *
 * Data: resources/data/geoid-egm2008-evropa.bin, int16 LE v cm, řádky od 71° s. š. k jihu,
 * sloupce od 10° z. d. na východ, krok 1/12°.
 */
class Geoid
{
    private const SEVER = 71.0;
    private const ZAPAD = -10.0;
    private const KROK = 1 / 12;
    private const RADKU = 433;
    private const SLOUPCU = 505;

    private static ?string $data = null;

    public static function n(float $lat, float $lon): ?float
    {
        self::$data ??= file_get_contents(resource_path('data/geoid-egm2008-evropa.bin'));

        $r = (self::SEVER - $lat) / self::KROK;
        $s = ($lon - self::ZAPAD) / self::KROK;
        if ($r < 0 || $s < 0 || $r > self::RADKU - 1 || $s > self::SLOUPCU - 1) {
            return null;
        }
        $r0 = (int) floor($r);
        $s0 = (int) floor($s);
        $r1 = min($r0 + 1, self::RADKU - 1);
        $s1 = min($s0 + 1, self::SLOUPCU - 1);
        $tr = $r - $r0;
        $ts = $s - $s0;

        $v = fn (int $rr, int $ss) => unpack('v', self::$data, 2 * ($rr * self::SLOUPCU + $ss))[1];
        $z = fn (int $x) => $x >= 32768 ? $x - 65536 : $x;
        $a = $z($v($r0, $s0));
        $b = $z($v($r0, $s1));
        $c = $z($v($r1, $s0));
        $d = $z($v($r1, $s1));

        return (($a * (1 - $ts) + $b * $ts) * (1 - $tr) + ($c * (1 - $ts) + $d * $ts) * $tr) / 100;
    }
}
