<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\InspireGml;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use Illuminate\Support\Facades\Http;

/**
 * Itálie: Agenzia delle Entrate, katastrální mapa jako INSPIRE WFS (CC BY 4.0, RDN2008 = EPSG:6706,
 * pořadí os lat lon). Výměru služba nedává, počítá se z obrysu. Provincie Trento a Bolzano
 * vedou vlastní katastr a ve službě nejsou.
 * Služba je pomalá i na prosté spočítání prvků (8–22 s, 12. 11. 2026), rychlejší cesta není:
 * GetFeatureInfo mapové služby vrací prázdno.
 */
class Italie implements ZdrojParcel
{
    private const WFS = 'https://wfs.cartografia.agenziaentrate.gov.it/inspire/wfs/owfs01.php';

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        $parcely = $this->dotaz(Geo::obalkaKolem($lat, $lon, 0.3), 20, $lat, $lon);

        return Parcela::vyberSBodem($parcely, $lat, $lon);
    }

    public function parcelyVOblasti(array $obalka): array
    {
        return $this->dotaz($obalka, 200);
    }

    private function dotaz(array $o, int $pocet, ?float $lat = null, ?float $lon = null): array
    {
        // Služba odpovídá 8–32 s, i na prosté spočítání prvků (WFS 1.1 vrací jen „Richiesta non valida“)
        $xml = Http::timeout(40)->get(self::WFS, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'CP:CadastralParcel',
            'count' => $pocet,
            'bbox' => "{$o['min_lat']},{$o['min_lon']},{$o['max_lat']},{$o['max_lon']},urn:ogc:def:crs:EPSG::4326",
        ])->throw()->body();

        $vystup = [];
        foreach (InspireGml::prvky($xml, true) as $p) {
            $ref = $p['ref'] ?? $p['local_id'];
            if (!$ref) {
                continue;
            }
            // Reference: kód obce (4) + sekce (1) + list (4) + příloha (2) + „.“ + parcela
            $list = null;
            if (preg_match('/^([A-Z]\d{3})([A-Z_0])(\d{4})/', $ref, $m)) {
                $list = ltrim($m[3], '0') ?: '0';
            }
            $cislo = $p['label'] ?? $ref;
            // V Itálii se parcela udává listem mapy a číslem: „Fg. 481 Part. 123“
            $vystup[] = Parcela::sestav('IT', $ref, $list !== null ? "Fg. {$list} Part. {$cislo}" : $cislo,
                Geo::castSBodem($p['polygony'], $lat, $lon), null, ['typ' => 'pozemkova', 'ku_kod' => substr($ref, 0, 4) ?: null]);
        }

        return $vystup;
    }

    public function stavbyVOblasti(array $obalka): array
    {
        return [];
    }
}
