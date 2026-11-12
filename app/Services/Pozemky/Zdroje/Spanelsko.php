<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\InspireGml;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use Illuminate\Support\Facades\Http;

/**
 * Španělsko: Dirección General del Catastro (INSPIRE WFS, parcely i budovy). Výšky ne: celostátní model
 * přes službu má jen 5 m (MDT05), na svahu vyhladí terasy a zídky, 2 m je jen ke stažení (modules/lokalizace.md). Katastr odpovídá jen přes http, https spojení odmítá.
 * Baskicko a Navarra mají vlastní katastr, tady nejsou.
 * Číslo parcely pro majitele je čtrnáctimístná referencia catastral.
 */
class Spanelsko implements ZdrojParcel
{
    private const WFS_CP = 'http://ovc.catastro.meh.es/INSPIRE/wfsCP.aspx';
    private const WFS_BU = 'http://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx';

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        $parcely = $this->dotaz(Geo::obalkaKolem($lat, $lon, 0.3), $lat, $lon);

        return Parcela::vyberSBodem($parcely, $lat, $lon);
    }

    public function parcelyVOblasti(array $obalka): array
    {
        return $this->dotaz($obalka);
    }

    private function dotaz(array $o, ?float $lat = null, ?float $lon = null): array
    {
        $xml = $this->wfs(self::WFS_CP, 'CP:CadastralParcel', $o);
        $vystup = [];
        foreach (InspireGml::prvky($xml, true) as $p) {
            $ref = $p['ref'] ?? $p['local_id'];
            if (!$ref) {
                continue;
            }
            $vystup[] = Parcela::sestav('ES', $ref, $ref, Geo::castSBodem($p['polygony'], $lat, $lon), $p['vymera'], ['typ' => 'pozemkova']);
        }

        return $vystup;
    }

    public function stavbyVOblasti(array $obalka): array
    {
        try {
            $xml = $this->wfs(self::WFS_BU, 'BU:Building', $obalka);
        } catch (\Throwable) {
            return [];
        }
        $vystup = [];
        foreach (InspireGml::prvky($xml, true) as $p) {
            foreach ($p['polygony'] as $polygon) {
                $vystup[] = ['polygon_wgs84' => Parcela::uklid($polygon)];
            }
        }

        return $vystup;
    }

    private function wfs(string $url, string $typ, array $o): string
    {
        // Katastr má ochranu proti robotům: bez User-Agent vrací 400, s krátkou hlavičkou nebo názvem aplikace
        // spojení často shodí (cURL 56), i s plnou hlavičkou prohlížeče občas. Opakování pak projde (12. 11. 2026).
        $odpoved = Http::timeout(20)
            ->withUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36')
            ->retry([300, 800, 1600, 3000], 0, fn ($e) => $e instanceof \Illuminate\Http\Client\ConnectionException)
            ->get($url, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typenames' => $typ,
            'bbox' => "{$o['min_lat']},{$o['min_lon']},{$o['max_lat']},{$o['max_lon']}",
            'SRSname' => 'EPSG::4326',
        ])->throw();
        $xml = $odpoved->body();
        // Odpověď je v ISO-8859-1, převést kvůli regulárním výrazům v UTF-8
        if (stripos(substr($xml, 0, 100), 'ISO-8859-1') !== false) {
            $xml = mb_convert_encoding($xml, 'UTF-8', 'ISO-8859-1');
        }

        return $xml;
    }
}
