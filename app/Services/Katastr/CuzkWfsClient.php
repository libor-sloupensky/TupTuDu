<?php

namespace App\Services\Katastr;

use Illuminate\Support\Facades\Http;

class CuzkWfsClient
{
    private const WFS_CPX = 'https://services.cuzk.cz/wfs/inspire-cpx-wfs.asp';
    private const WFS_BU = 'https://services.cuzk.cz/wfs/inspire-BU-wfs.asp';

    /** Překlad INSPIRE druh pozemku → čeština (dle ČÚZK) */
    private const DRUH_POZEMKU_CZ = [
        'ArableGround' => 'Orná půda',
        'Grassland' => 'Trvalý travní porost',
        'Garden' => 'Zahrada',
        'Orchard' => 'Ovocný sad',
        'Forest' => 'Lesní pozemek',
        'WaterArea' => 'Vodní plocha',
        'BuiltUpArea' => 'Zastavěná plocha a nádvoří',
        'OtherArea' => 'Ostatní plocha',
        'Vineyard' => 'Vinice',
        'HopGarden' => 'Chmelnice',
    ];

    /** Překlad HILUCS klasifikace využití → čeština (hlavní i podkategorie) */
    private const VYUZITI_CZ = [
        // Hlavní kategorie
        'Agriculture' => 'Zemědělství',
        'Residential' => 'Bydlení',
        'IndustrialAndManufacturing' => 'Průmysl a výroba',
        'Transport' => 'Doprava',
        'CommercialServices' => 'Komerční služby',
        'CommunityServices' => 'Občanská vybavenost',
        'Recreation' => 'Rekreace',
        'Forestry' => 'Lesnictví',
        'Mining' => 'Těžba',
        'NotKnown' => 'Nezjištěno',
        // HILUCS podkategorie (s číselnými prefixy)
        '1_1_1_CommercialAgriculturalProduction' => 'Zemědělská výroba',
        '1_1_2_FarmingInfrastructure' => 'Zemědělská infrastruktura',
        '1_2_Forestry' => 'Lesnictví',
        '1_3_Fishing' => 'Rybářství',
        '1_4_Mining' => 'Těžba',
        '2_1_IndustrialProduction' => 'Průmyslová výroba',
        '2_2_EnergyProduction' => 'Výroba energie',
        '3_1_CommercialServices' => 'Komerční služby',
        '3_2_FinancialServices' => 'Finanční služby',
        '3_3_Trade' => 'Obchod',
        '4_1_Transport' => 'Doprava',
        '4_1_1_RoadTransport' => 'Silniční doprava',
        '4_1_2_RailTransport' => 'Železniční doprava',
        '5_1_Residential' => 'Bydlení',
        '5_1_1_PermanentResidential' => 'Trvalé bydlení',
        '5_1_2_ResidentialWithOtherUse' => 'Bydlení s jiným využitím',
        '6_1_PublicAdministration' => 'Veřejná správa',
        '6_2_Education' => 'Vzdělávání',
        '6_3_HealthServices' => 'Zdravotnictví',
        '6_4_SocialServices' => 'Sociální služby',
        '6_5_CulturalServices' => 'Kultura',
        '6_6_ReligiousServices' => 'Náboženské služby',
    ];

    /**
     * Načte parcelu z WFS CPX podle kódu KÚ, čísla parcely a typu.
     * Vrací pole s polygonem a atributy, nebo null.
     *
     * @param int $kuKod Kód katastrálního území
     * @param string $cisloParcely Číslo parcely (např. "123/4")
     * @param string $typ 'auto'|'pozemkova'|'stavebni'
     */
    public function nactiParcelu(int $kuKod, string $cisloParcely, string $typ = 'auto'): ?array
    {
        if ($typ === 'auto') {
            // Zkusit nejdříve pozemkovou, pak stavební
            $result = $this->dotazWfs($kuKod, $cisloParcely, 'pozemkova');
            if (!$result) {
                $result = $this->dotazWfs($kuKod, $cisloParcely, 'stavebni');
            }
            return $result;
        }

        return $this->dotazWfs($kuKod, $cisloParcely, $typ);
    }

    /**
     * Načte stavby na dané parcele z WFS BU.
     */
    /**
     * Načte parcely v oblasti (BBOX) z WFS CPX. Vrací pole parcel ve WGS84.
     */
    public function nactiParcelyVOblasti(array $bboxWgs84): array
    {
        $filter = <<<XML
        <fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0">
            <fes:BBOX>
                <fes:ValueReference>cp:geometry</fes:ValueReference>
                <gml:Envelope xmlns:gml="http://www.opengis.net/gml/3.2" srsName="urn:ogc:def:crs:EPSG::4326">
                    <gml:lowerCorner>{$bboxWgs84['min_lat']} {$bboxWgs84['min_lon']}</gml:lowerCorner>
                    <gml:upperCorner>{$bboxWgs84['max_lat']} {$bboxWgs84['max_lon']}</gml:upperCorner>
                </gml:Envelope>
            </fes:BBOX>
        </fes:Filter>
        XML;

        $response = Http::timeout(30)->get(self::WFS_CPX, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'cp-ext:CadastralParcel',
            'srsName' => 'urn:ogc:def:crs:EPSG::4326',
            'filter' => $filter,
            'count' => 50, // Limit — nechceme stovky parcel
        ]);

        if (!$response->successful()) {
            return [];
        }

        return $this->parseViceParcelGml($response->body());
    }

    /**
     * Parsuje více parcel z GML odpovědi (BBOX dotaz) — vrací zjednodušená data.
     */
    private function parseViceParcelGml(string $gml): array
    {
        $parcely = [];

        // Rozdělit na jednotlivé member/CadastralParcel bloky
        if (!preg_match_all('/<(?:wfs:)?member>(.*?)<\/(?:wfs:)?member>/s', $gml, $members)) {
            return [];
        }

        foreach ($members[1] as $memberGml) {
            // Polygon
            $polygon = [];
            if (preg_match('/<(?:\w+:)?posList[^>]*>(.*?)<\/(?:\w+:)?posList>/s', $memberGml, $m)) {
                $coords = preg_split('/\s+/', trim($m[1]));
                for ($i = 0; $i < count($coords) - 1; $i += 2) {
                    $polygon[] = [(float)$coords[$i], (float)$coords[$i + 1]];
                }
            }
            if (count($polygon) < 3) continue;

            // Label
            $label = null;
            if (preg_match('/<(?:\w+:)?label>([^<]+)<\//', $memberGml, $m)) {
                $label = trim($m[1]);
            }

            // Typ (stavební/pozemková) z localId
            $typ = 'pozemkova';
            if (preg_match('/<(?:\w+:)?localId>([^<]+)<\//', $memberGml, $m)) {
                if (str_contains($m[1], 'ST.') || str_contains($m[1], '.st.')) {
                    $typ = 'stavebni';
                }
            }

            $parcely[] = [
                'polygon_wgs84' => $polygon,
                'label' => $label,
                'typ' => $typ,
            ];
        }

        return $parcely;
    }

    /**
     * Načte stavby z WFS BU.
     * Přijímá bbox ve WGS84 (lat/lon), vrací polygony ve WGS84.
     */
    public function nactiStavby(array $bboxWgs84): array
    {
        $filter = $this->bboxFilterWgs84($bboxWgs84);

        $response = Http::timeout(30)->get(self::WFS_BU, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'BU:Building',
            'srsName' => 'urn:ogc:def:crs:EPSG::4326',
            'filter' => $filter,
        ]);

        if (!$response->successful()) {
            return [];
        }

        return $this->parseStavbyGml($response->body(), true);
    }

    private function dotazWfs(int $kuKod, string $cisloParcely, string $typ): ?array
    {
        // StoredQuery GetParcel: TEXT = "239/11" (pozemková) nebo "st. 239/11" (stavební)
        $text = ($typ === 'stavebni') ? "st. {$cisloParcely}" : $cisloParcely;

        $params = [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'storedQuery_Id' => 'GetParcel',
            'UPPER_ZONING_ID' => $kuKod,
            'TEXT' => $text,
        ];

        // Dva dotazy: S-JTSK pro přesný polygon (metry) + WGS84 pro centroid (mapa)
        $responseSjtsk = Http::timeout(30)->get(self::WFS_CPX, $params + [
            'srsName' => 'urn:ogc:def:crs:EPSG::5514',
        ]);

        if (!$responseSjtsk->successful()) {
            return null;
        }

        $parcela = $this->parseParcelaGml($responseSjtsk->body(), $typ);
        if (!$parcela) {
            return null;
        }

        // WGS84 dotaz pro polygon + centroid (mapa)
        $responseWgs = Http::timeout(15)->get(self::WFS_CPX, $params + [
            'srsName' => 'urn:ogc:def:crs:EPSG::4326',
        ]);

        if ($responseWgs->successful()) {
            $wgsData = $this->parseWgs84($responseWgs->body());
            if ($wgsData) {
                $parcela['polygon_wgs84'] = $wgsData['polygon'];
                $parcela['centroid_wgs84'] = $wgsData['centroid'];
            }
        }

        return $parcela;
    }

    /**
     * Parsuje GML odpověď WFS CPX a vrací pole s polygonem + atributy.
     */
    private function parseParcelaGml(string $gml, string $typ): ?array
    {
        // Zkontrolovat, že obsahuje parcelu (před odstraněním namespace)
        if (strpos($gml, 'CadastralParcel') === false) {
            return null;
        }

        // Polygon — gml:posList (souřadnice v S-JTSK)
        $polygon = [];
        if (preg_match('/<(?:\w+:)?posList[^>]*>(.*?)<\/(?:\w+:)?posList>/s', $gml, $m)) {
            $coords = preg_split('/\s+/', trim($m[1]));
            for ($i = 0; $i < count($coords) - 1; $i += 2) {
                $polygon[] = [(float)$coords[$i], (float)$coords[$i + 1]];
            }
        }

        if (empty($polygon)) {
            return null;
        }

        // Výměra — cp:areaValue
        $vymera = null;
        if (preg_match('/<(?:\w+:)?areaValue[^>]*>([\d.]+)<\//', $gml, $m)) {
            $vymera = (int)round((float)$m[1]);
        }

        // Druh pozemku — cp-ext:landType href obsahuje hodnotu jako "ArableGround"
        $druhPozemku = null;
        if (preg_match('/landType[^>]*xlink:href="[^"]*\/([^"\/]+)"/', $gml, $m)) {
            $druhPozemku = $m[1];
        }

        // Label (číslo parcely) — cp:label
        $label = null;
        if (preg_match('/<(?:\w+:)?label>([^<]+)<\//', $gml, $m)) {
            $label = trim($m[1]);
        }

        // LocalId pro ověření — base:localId
        $localId = null;
        if (preg_match('/<(?:\w+:)?localId>([^<]+)<\//', $gml, $m)) {
            $localId = $m[1];
        }

        // HILUCS klasifikace využití — hilucsValue href
        $vyuziti = null;
        if (preg_match('/hilucsValue[^>]*xlink:href="[^"]*\/([^"\/]+)"/', $gml, $m)) {
            $vyuziti = $m[1];
        }

        return [
            'polygon_sjtsk' => $polygon,
            'vymera' => $vymera,
            'druh_pozemku' => $druhPozemku,
            'druh_pozemku_cz' => self::DRUH_POZEMKU_CZ[$druhPozemku] ?? $druhPozemku,
            'vyuziti' => $vyuziti,
            'vyuziti_cz' => self::prekladVyuziti($vyuziti),
            'typ' => $typ,
            'label' => $label,
            'local_id' => $localId,
            'bbox' => $this->spocitejBbox($polygon),
        ];
    }

    /**
     * Parsuje GML staveb — vrací pole polygonů.
     */
    private function parseStavbyGml(string $gml, bool $wgs84 = false): array
    {
        $stavby = [];
        $key = $wgs84 ? 'polygon_wgs84' : 'polygon_sjtsk';
        if (preg_match_all('/<(?:\w+:)?posList[^>]*>(.*?)<\/(?:\w+:)?posList>/s', $gml, $matches)) {
            foreach ($matches[1] as $posListText) {
                $coords = preg_split('/\s+/', trim($posListText));
                $polygon = [];
                for ($i = 0; $i < count($coords) - 1; $i += 2) {
                    $polygon[] = [(float)$coords[$i], (float)$coords[$i + 1]];
                }
                if (count($polygon) >= 3) {
                    $stavby[] = [$key => $polygon];
                }
            }
        }

        return $stavby;
    }

    /**
     * Parsuje WGS84 polygon + centroid z GML odpovědi.
     * EPSG:4326 posList: páry [lat, lon].
     */
    private function parseWgs84(string $gml): ?array
    {
        // Polygon z posList
        $polygon = [];
        if (preg_match('/<(?:\w+:)?posList[^>]*>(.*?)<\/(?:\w+:)?posList>/s', $gml, $m)) {
            $coords = preg_split('/\s+/', trim($m[1]));
            for ($i = 0; $i < count($coords) - 1; $i += 2) {
                $polygon[] = [(float)$coords[$i], (float)$coords[$i + 1]]; // [lat, lon]
            }
        }

        if (empty($polygon)) {
            return null;
        }

        // Centroid z Envelope
        $centroid = null;
        $lower = $upper = null;
        if (preg_match('/<(?:\w+:)?lowerCorner>([^<]+)<\//', $gml, $m)) {
            $lower = preg_split('/\s+/', trim($m[1]));
        }
        if (preg_match('/<(?:\w+:)?upperCorner>([^<]+)<\//', $gml, $m)) {
            $upper = preg_split('/\s+/', trim($m[1]));
        }
        if ($lower && $upper && count($lower) >= 2 && count($upper) >= 2) {
            $centroid = [
                'lat' => round(((float)$lower[0] + (float)$upper[0]) / 2, 7),
                'lon' => round(((float)$lower[1] + (float)$upper[1]) / 2, 7),
            ];
        }

        return [
            'polygon' => $polygon,
            'centroid' => $centroid,
        ];
    }

    private function spocitejBbox(array $polygon): array
    {
        $xs = array_column($polygon, 0);
        $ys = array_column($polygon, 1);
        return [
            'min_x' => min($xs),
            'min_y' => min($ys),
            'max_x' => max($xs),
            'max_y' => max($ys),
        ];
    }

    private function bboxFilterWgs84(array $bbox): string
    {
        // EPSG:4326: lowerCorner = min_lat min_lon, upperCorner = max_lat max_lon
        return <<<XML
        <fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0">
            <fes:BBOX>
                <fes:ValueReference>bu-core2d:geometry</fes:ValueReference>
                <gml:Envelope xmlns:gml="http://www.opengis.net/gml/3.2" srsName="urn:ogc:def:crs:EPSG::4326">
                    <gml:lowerCorner>{$bbox['min_lat']} {$bbox['min_lon']}</gml:lowerCorner>
                    <gml:upperCorner>{$bbox['max_lat']} {$bbox['max_lon']}</gml:upperCorner>
                </gml:Envelope>
            </fes:BBOX>
        </fes:Filter>
        XML;
    }

    /**
     * Přeloží HILUCS využití do češtiny. Zpracuje i podkategorie s číselným prefixem.
     */
    private static function prekladVyuziti(?string $vyuziti): ?string
    {
        if (!$vyuziti) return null;
        // Přímý překlad
        if (isset(self::VYUZITI_CZ[$vyuziti])) {
            return self::VYUZITI_CZ[$vyuziti];
        }
        // Fallback: odstranit číselný prefix (1_1_1_Xxx → Xxx) a zkusit znovu
        $bezPrefixu = preg_replace('/^[\d_]+/', '', $vyuziti);
        if ($bezPrefixu && isset(self::VYUZITI_CZ[$bezPrefixu])) {
            return self::VYUZITI_CZ[$bezPrefixu];
        }
        // Poslední pokus: CamelCase → mezery
        $citelne = preg_replace('/([a-z])([A-Z])/', '$1 $2', $bezPrefixu ?: $vyuziti);
        return $citelne;
    }
}
