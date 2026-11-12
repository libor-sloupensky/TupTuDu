<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\GeoTiff;
use App\Services\Pozemky\Hranice;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Německo: model terénu DGM1 (1 m) vede každá spolková země. Celoněmecký DGM1 od BKG je placený.
 * Na zavolání zdarma (ověřeno 12. 11. 2026): Bavorsko (výšky pro seznam bodů), NRW, Hesensko,
 * Braniborsko s Berlínem a Meklenbursko (WCS). Ostatní země dávají jen soubory ke stažení
 * nebo celé metry (Bádensko-Württembersko), tam výškový profil zatím není.
 */
class NemeckoVysky implements ZdrojVysek
{
    /** Spolková země → služba. osy: názvy os pro subset WCS, pasmo: UTM pásmo ETRS89 (25832/25833). */
    private const ZEME = [
        'BY' => ['typ' => 'body', 'url' => 'https://geoservices.bayern.de/bvvapi/od/hoehen/v1/elevation/list', 'pasmo' => 32],
        'NW' => ['typ' => 'wcs', 'url' => 'https://www.wcs.nrw.de/geobasis/wcs_nw_dgm', 'pokryti' => 'nw_dgm', 'osy' => ['x', 'y'], 'pasmo' => 32,
            'navic' => ['GEOTIFF:COMPRESSION' => 'None']],
        'HE' => ['typ' => 'wcs', 'url' => 'https://inspire-hessen.de/raster/dgm1/ows', 'pokryti' => 'he_dgm1', 'osy' => ['E', 'N'], 'pasmo' => 32],
        'BB' => ['typ' => 'wcs', 'url' => 'https://isk.geobasis-bb.de/ows/dgm_wcs', 'pokryti' => 'bb_dgm', 'osy' => ['x', 'y'], 'pasmo' => 33],
        'BE' => ['typ' => 'wcs', 'url' => 'https://isk.geobasis-bb.de/ows/dgm_wcs', 'pokryti' => 'bb_dgm', 'osy' => ['x', 'y'], 'pasmo' => 33],
        'MV' => ['typ' => 'wcs', 'url' => 'https://www.geodaten-mv.de/dienste/dgm_wcs', 'pokryti' => 'mv_dgm', 'osy' => ['x', 'y'], 'pasmo' => 33],
    ];

    /** Spolkové země s výškami (pro mapu: „výškový profil tu máme“). */
    public static function zemeSVyskami(): array
    {
        return array_keys(self::ZEME);
    }

    public function vysky(array $body): array
    {
        $lat = array_sum(array_column($body, 0)) / count($body);
        $lon = array_sum(array_column($body, 1)) / count($body);
        $hlavni = Hranice::zeme($lat, $lon, Hranice::SPOLKOVE_ZEME);
        $kandidati = array_values(array_unique(array_filter([$hlavni, ...Hranice::blizke($lat, $lon, 1000, Hranice::SPOLKOVE_ZEME)])));

        $nejlepsi = null;
        foreach ($kandidati as $land) {
            if (!isset(self::ZEME[$land])) {
                continue;
            }
            $z = $this->zeme($land, $body);
            // U hranice spolkových zemí vzít službu, která pokryje nejvíc bodů
            $platnych = count(array_filter($z, fn ($v) => $v !== null));
            if ($platnych === count($body)) {
                return $z;
            }
            if (!$nejlepsi || $platnych > $nejlepsi[0]) {
                $nejlepsi = [$platnych, $z];
            }
        }
        if (!$nejlepsi) {
            throw new RuntimeException(__('ed_nastroje.katastr.vysky_zeme_nejsou'));
        }

        return $nejlepsi[1];
    }

    private function zeme(string $land, array $body): array
    {
        $s = self::ZEME[$land];
        $utm = array_map(fn ($b) => Geo::utm($b[0], $b[1], $s['pasmo']), $body);

        return $s['typ'] === 'body' ? $this->bavorsko($s, $utm) : $this->wcs($s, $utm);
    }

    /** Bavorsko: POST seznamu bodů v UTM 32, výška jako třetí složka. Dávky po 300 (nad ~450 občas HTTP 500). */
    private function bavorsko(array $s, array $utm): array
    {
        $davky = array_chunk($utm, 300, true);
        $odpovedi = Http::pool(fn (Pool $pool) => array_map(
            fn ($d) => $pool->timeout(25)->post($s['url'], [
                'srid' => 25832,
                'coords' => array_values(array_map(fn ($p) => [round($p[0], 2), round($p[1], 2)], $d)),
            ]),
            $davky
        ));
        $vysky = array_fill(0, count($utm), null);
        foreach ($davky as $i => $davka) {
            $o = $odpovedi[$i] ?? null;
            if (!$o instanceof \Illuminate\Http\Client\Response || !$o->successful()) {
                throw new RuntimeException('Výšky Bavorska neodpověděly');
            }
            $coords = $o->json('coords') ?? [];
            foreach (array_keys($davka) as $j => $klic) {
                $v = $coords[$j][2] ?? null;
                $vysky[$klic] = is_numeric($v) ? (float) $v : null;
            }
        }

        return $vysky;
    }

    /** WCS 2.0: jeden výřez rastru 1 m pro všechny body. */
    private function wcs(array $s, array $utm): array
    {
        $e = array_column($utm, 0);
        $n = array_column($utm, 1);
        $okraj = 3;
        [$ox, $oy] = $s['osy'];
        $url = $s['url'] . '?' . http_build_query([
            'SERVICE' => 'WCS', 'VERSION' => '2.0.1', 'REQUEST' => 'GetCoverage',
            'COVERAGEID' => $s['pokryti'], 'FORMAT' => 'image/tiff',
        ] + ($s['navic'] ?? []))
            . '&SUBSET=' . rawurlencode(sprintf('%s(%.1f,%.1f)', $ox, min($e) - $okraj, max($e) + $okraj))
            . '&SUBSET=' . rawurlencode(sprintf('%s(%.1f,%.1f)', $oy, min($n) - $okraj, max($n) + $okraj));
        $tif = GeoTiff::zDat(Http::timeout(30)->get($url)->throw()->body());

        return array_map(fn ($p) => ($v = $tif->hodnota($p[0], $p[1])) === null ? null : round($v, 2), $utm);
    }
}
