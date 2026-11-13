<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\Geoid;
use App\Services\Pozemky\GeoTiff;
use App\Services\Pozemky\InspireGml;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Support\Facades\Http;

/**
 * Slovensko: ÚGKK SR, INSPIRE služby na GeoServeru (CC BY 4.0).
 * Parcely registra C přes WFS s výstupem GeoJSON, výšky z DMR 5.0 (1 m, celé SK) přes WCS.
 */
class Slovensko implements ZdrojParcel, ZdrojVysek
{
    private const WFS = 'https://inspirews.skgeodesy.sk/geoserver/cp/ows';
    private const WCS = 'https://inspirews.skgeodesy.sk/geoserver/el/ows';

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        $parcely = $this->dotaz(Geo::obalkaKolem($lat, $lon, 0.3), 20, $lat, $lon);

        return Parcela::vyberSBodem($parcely, $lat, $lon);
    }

    public function parcelyVOblasti(array $obalka): array
    {
        return $this->dotaz($obalka, 150);
    }

    private function dotaz(array $o, int $pocet, ?float $lat = null, ?float $lon = null): array
    {
        $odpoved = Http::timeout(25)->get(self::WFS, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'cp:CP.CadastralParcel',
            'outputFormat' => 'application/json',
            'srsName' => 'EPSG:4326',
            'count' => $pocet,
            'bbox' => "{$o['min_lat']},{$o['min_lon']},{$o['max_lat']},{$o['max_lon']},urn:ogc:def:crs:EPSG::4326",
        ])->throw();

        $vystup = [];
        foreach (InspireGml::overJson($odpoved->json(), 'ÚGKK SR') as $f) {
            $pr = $f['properties'] ?? [];
            $polygon = Geo::castSBodem(Geo::zGeoJson($f['geometry'] ?? null), $lat, $lon);
            if (count($polygon) < 3) {
                continue;
            }
            $ref = $pr['nationalCadastralReference'] ?? ($pr['inspireId']['localId'] ?? '');
            $kuKod = preg_match('/^(\d+)_/', $ref, $m) ? (int) $m[1] : null;
            $vystup[] = Parcela::sestav('SK', $ref, (string) ($pr['label'] ?? $ref), $polygon,
                isset($pr['areaValue']['value']) ? (float) $pr['areaValue']['value'] : null,
                ['ku_kod' => $kuKod, 'typ' => 'pozemkova']);
        }

        return $vystup;
    }

    public function stavbyVOblasti(array $obalka): array
    {
        // Slovensko budovy v INSPIRE zatím nedává (ověřeno 12. 11. 2026)
        return [];
    }

    /** DMR 5.0 v ETRS89 / TM34 (EPSG:3046), jeden výřez WCS pro všechny body. */
    public function vysky(array $body): array
    {
        $utm = array_map(fn ($b) => Geo::utm($b[0], $b[1], 34), $body);
        $e = array_column($utm, 0);
        $n = array_column($utm, 1);
        $okraj = 3;
        // WCS 2.0 chce parametr subset dvakrát, http_build_query to neumí, URL se skládá ručně
        $url = self::WCS . '?' . http_build_query([
            'service' => 'WCS', 'version' => '2.0.1', 'request' => 'GetCoverage',
            'coverageId' => 'el__EL.GridCoverage', 'format' => 'image/tiff',
        ]) . '&subset=' . rawurlencode(sprintf('E(%.1f,%.1f)', min($e) - $okraj, max($e) + $okraj))
            . '&subset=' . rawurlencode(sprintf('N(%.1f,%.1f)', min($n) - $okraj, max($n) + $okraj));
        $tif = GeoTiff::zDat(Http::timeout(30)->get($url)->throw()->body());

        // Služba vrací výšku nad elipsoidem ETRS89 (Kriváň 2537 m místo 2495 m), odečíst geoid.
        // Na pozemku je geoid prakticky konstantní, stačí jedna hodnota pro střed.
        $n = Geoid::n(array_sum(array_column($body, 0)) / count($body), array_sum(array_column($body, 1)) / count($body)) ?? 0.0;

        return array_map(fn ($p) => ($v = $tif->hodnota($p[0], $p[1])) === null ? null : round($v - $n, 2), $utm);
    }
}
