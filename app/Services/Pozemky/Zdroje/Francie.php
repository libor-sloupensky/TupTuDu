<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use App\Services\Pozemky\ZdrojVysek;
use Illuminate\Http\Client\Pool;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Francie: IGN. Parcely z API Carto (modul cadastre, data PCI Etalab, Licence Ouverte),
 * stavby z BD TOPO (WFS Géoplateforme), výšky z RGE ALTI 1 m (služba altimétrie Géoplateforme).
 */
class Francie implements ZdrojParcel, ZdrojVysek
{
    private const PARCELY = 'https://apicarto.ign.fr/api/cadastre/parcelle';
    private const WFS = 'https://data.geopf.fr/wfs/ows';
    private const ALTI = 'https://data.geopf.fr/altimetrie/1.0/calcul/alti/rest/elevation.json';
    private const DAVKA = 150;

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        $parcely = $this->dotaz(['type' => 'Point', 'coordinates' => [$lon, $lat]], 10, $lat, $lon);

        return Parcela::vyberSBodem($parcely, $lat, $lon);
    }

    public function parcelyVOblasti(array $o): array
    {
        return $this->dotaz(self::obdelnik($o), 300);
    }

    private function dotaz(array $geom, int $limit, ?float $lat = null, ?float $lon = null): array
    {
        $odpoved = Http::timeout(25)->get(self::PARCELY, [
            'geom' => json_encode($geom),
            '_limit' => $limit,
        ])->throw();

        $vystup = [];
        foreach ($odpoved->json('features') ?? [] as $f) {
            $pr = $f['properties'] ?? [];
            $polygon = Geo::castSBodem(Geo::zGeoJson($f['geometry'] ?? null), $lat, $lon);
            if (count($polygon) < 3) {
                continue;
            }
            // Číslo parcely ve Francii = sekce + číslo (AB 123), v obci jednoznačné
            $cislo = trim(ltrim((string) ($pr['section'] ?? ''), '0') . ' ' . ltrim((string) ($pr['numero'] ?? ''), '0'));
            $vystup[] = Parcela::sestav('FR', (string) ($pr['idu'] ?? $cislo), $cislo, $polygon,
                isset($pr['contenance']) && $pr['contenance'] > 0 ? (float) $pr['contenance'] : null,
                ['obec' => $pr['nom_com'] ?? null, 'typ' => 'pozemkova']);
        }

        return $vystup;
    }

    public function stavbyVOblasti(array $o): array
    {
        $odpoved = Http::timeout(25)->get(self::WFS, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'BDTOPO_V3:batiment',
            'outputFormat' => 'application/json',
            'srsName' => 'EPSG:4326',
            'count' => 300,
            'bbox' => "{$o['min_lat']},{$o['min_lon']},{$o['max_lat']},{$o['max_lon']},urn:ogc:def:crs:EPSG::4326",
        ]);
        if (!$odpoved->successful()) {
            return [];
        }
        $vystup = [];
        foreach ($odpoved->json('features') ?? [] as $f) {
            foreach (Geo::zGeoJson($f['geometry'] ?? null) as $polygon) {
                $vystup[] = ['polygon_wgs84' => Parcela::uklid($polygon)];
            }
        }

        return $vystup;
    }

    public function vysky(array $body): array
    {
        $davky = array_chunk($body, self::DAVKA, true);
        $odpovedi = Http::pool(fn (Pool $pool) => array_map(
            fn ($d) => $pool->timeout(25)->get(self::ALTI, [
                'lon' => implode('|', array_map(fn ($b) => sprintf('%.7f', $b[1]), $d)),
                'lat' => implode('|', array_map(fn ($b) => sprintf('%.7f', $b[0]), $d)),
                'resource' => 'ign_rge_alti_wld',
                'zonly' => 'true',
            ]),
            $davky
        ));

        $vysky = array_fill(0, count($body), null);
        foreach ($davky as $i => $davka) {
            $o = $odpovedi[$i] ?? null;
            if (!$o instanceof \Illuminate\Http\Client\Response || !$o->successful()) {
                throw new RuntimeException('Altimétrie IGN neodpověděla');
            }
            $z = $o->json('elevations') ?? [];
            foreach (array_keys($davka) as $j => $klic) {
                $v = $z[$j] ?? null;
                // -99999 = bez dat
                $vysky[$klic] = is_numeric($v) && $v > -1000 ? (float) $v : null;
            }
        }

        return $vysky;
    }

    private static function obdelnik(array $o): array
    {
        return ['type' => 'Polygon', 'coordinates' => [[
            [$o['min_lon'], $o['min_lat']], [$o['max_lon'], $o['min_lat']],
            [$o['max_lon'], $o['max_lat']], [$o['min_lon'], $o['max_lat']], [$o['min_lon'], $o['min_lat']],
        ]]];
    }
}
