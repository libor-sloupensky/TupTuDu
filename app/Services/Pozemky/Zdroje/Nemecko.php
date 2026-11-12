<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Pozemky\Geo;
use App\Services\Pozemky\Hranice;
use App\Services\Pozemky\InspireGml;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use Illuminate\Support\Facades\Http;

/**
 * Německo: katastr (ALKIS) vede každá spolková země zvlášť, celoněmecká veřejná služba není.
 * Bezplatnou WFS má 15 zemí ze 16, Bavorsko ne (vektor je placený, zdarma jen rastrová mapa).
 * Služby ověřené 12. 11. 2026, adresy a zvláštnosti v modules/lokalizace.md.
 *
 * Schémata: ave = AdV „ALKIS vereinfacht“ (flstkennz, flaeche, gemarkung), cp = INSPIRE,
 * berlin a bremen = vlastní názvy polí. Číslo parcely se čte z Flurstückskennzeichen,
 * které je ve všech zemích stejné: země 2, Gemarkung 4, Flur 3, Zähler 5, Nenner 4 (doplněné „_“).
 */
class Nemecko implements ZdrojParcel
{
    /** crs: v jakých souřadnicích služba bere obálku (4326 a 4258 lat lon, 258xx východ sever). */
    private const ZEME = [
        'BW' => ['url' => 'https://owsproxy.lgl-bw.de/owsproxy/wfs/WFS_INSP_BW_Flst_ALKIS', 'typ' => 'cp:CadastralParcel', 'schema' => 'cp', 'crs' => 4326],
        'BE' => ['url' => 'https://gdi.berlin.de/services/wfs/alkis_flurstuecke', 'typ' => 'alkis_flurstuecke:flurstuecke', 'schema' => 'berlin', 'crs' => 4326],
        'BB' => ['url' => 'https://isk.geobasis-bb.de/ows/alkis_vereinf_wfs', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'HB' => ['url' => 'https://geodienste.bremen.de/wfs_hduk2958loah3976niun', 'typ' => 'app:flurstuecke', 'schema' => 'ave', 'crs' => 4326],
        'HH' => ['url' => 'https://geodienste.hamburg.de/WFS_HH_ALKIS_vereinfacht', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'HE' => ['url' => 'https://www.gds.hessen.de/wfs2/aaa-suite/cgi-bin/alkis/vereinf/wfs', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'MV' => ['url' => 'https://www.geodaten-mv.de/dienste/alkis_wfs_einfach', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 25833, 'vystup' => 25833],
        'NI' => ['url' => 'https://opendata.lgln.niedersachsen.de/doorman/noauth/alkis_wfs_einfach', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'NW' => ['url' => 'https://www.wfs.nrw.de/geobasis/wfs_nw_alkis_vereinfacht', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'RP' => ['url' => 'https://geo5.service24.rlp.de/wfs/alkis_rp.fcgi', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'SL' => ['url' => 'https://geoportal.saarland.de/gdi-sl/inspirewfs_Flurstuecke_Grundstuecke_ALKIS', 'typ' => 'cp:CadastralParcel', 'schema' => 'cp', 'crs' => 4326],
        'SN' => ['url' => 'https://geodienste.sachsen.de/aaa/public_alkis/vereinf/wfs', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4258],
        'ST' => ['url' => 'https://www.geodatenportal.sachsen-anhalt.de/wss/service/ST_LVermGeo_ALKIS_WFS_OpenData/guest', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 4326],
        'SH' => ['url' => 'https://service.gdi-sh.de/SH_INSPIREDOWNLOAD_AI_CP_ALKIS', 'typ' => 'cp:CadastralParcel', 'schema' => 'cp', 'crs' => 4326],
        'TH' => ['url' => 'https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs', 'typ' => 'ave:Flurstueck', 'schema' => 'ave', 'crs' => 25832],
    ];

    /** Spolková země bodu; u hranice zemí i sousední. */
    private function zemeBodu(float $lat, float $lon): array
    {
        $hlavni = Hranice::zeme($lat, $lon, Hranice::SPOLKOVE_ZEME);

        return array_values(array_unique(array_filter([$hlavni, ...Hranice::blizke($lat, $lon, 1000, Hranice::SPOLKOVE_ZEME)])));
    }

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        foreach ($this->zemeBodu($lat, $lon) as $land) {
            if (!isset(self::ZEME[$land])) {
                continue;
            }
            $parcely = $this->dotaz($land, Geo::obalkaKolem($lat, $lon, 0.3), 30, $lat, $lon);
            $p = Parcela::vyberSBodem(array_filter($parcely, fn ($p) => Geo::bodVPolygonu($lat, $lon, $p['polygon_wgs84'])) ?: $parcely, $lat, $lon);
            if ($p) {
                return $p;
            }
        }

        return null;
    }

    public function parcelyVOblasti(array $o): array
    {
        $lat = ($o['min_lat'] + $o['max_lat']) / 2;
        $lon = ($o['min_lon'] + $o['max_lon']) / 2;
        // U hranice spolkových zemí (Berlín, Brémy) i sousední země, první s výsledkem
        foreach ($this->zemeBodu($lat, $lon) as $land) {
            if (isset(self::ZEME[$land]) && ($parcely = $this->dotaz($land, $o, 200))) {
                return $parcely;
            }
        }

        return [];
    }

    public function stavbyVOblasti(array $obalka): array
    {
        return [];
    }

    /** Spolkové země s veřejnou WFS (pro ověřovací příkaz a dokumentaci). */
    public static function zemeSKatastrem(): array
    {
        return array_keys(self::ZEME);
    }

    private function dotaz(string $land, array $o, int $pocet, ?float $lat = null, ?float $lon = null): array
    {
        $z = self::ZEME[$land];
        $crs = $z['crs'];
        if ($crs === 25832 || $crs === 25833) {
            $pasmo = $crs - 25800;
            [$e1, $n1] = Geo::utm($o['min_lat'], $o['min_lon'], $pasmo);
            [$e2, $n2] = Geo::utm($o['max_lat'], $o['max_lon'], $pasmo);
            [$e3, $n3] = Geo::utm($o['min_lat'], $o['max_lon'], $pasmo);
            [$e4, $n4] = Geo::utm($o['max_lat'], $o['min_lon'], $pasmo);
            $bbox = sprintf('%.2f,%.2f,%.2f,%.2f,urn:ogc:def:crs:EPSG::%d',
                min($e1, $e2, $e3, $e4), min($n1, $n2, $n3, $n4), max($e1, $e2, $e3, $e4), max($n1, $n2, $n3, $n4), $crs);
        } else {
            $bbox = "{$o['min_lat']},{$o['min_lon']},{$o['max_lat']},{$o['max_lon']},urn:ogc:def:crs:EPSG::{$crs}";
        }
        $vystupCrs = $z['vystup'] ?? ($crs === 4258 ? 4258 : 4326);

        $xml = Http::timeout(25)->get($z['url'], [
            'SERVICE' => 'WFS',
            'VERSION' => '2.0.0',
            'REQUEST' => 'GetFeature',
            'TYPENAMES' => $z['typ'],
            'COUNT' => $pocet,
            'SRSNAME' => "urn:ogc:def:crs:EPSG::{$vystupCrs}",
            'BBOX' => $bbox,
        ])->throw()->body();

        $utmVystup = $vystupCrs === 25832 || $vystupCrs === 25833;
        $vystup = [];
        foreach (InspireGml::prvky($xml, !$utmVystup) as $p) {
            $casti = $p['polygony'];
            if ($utmVystup) {
                // InspireGml s latLon=false vrátil [N, E] jako [lat, lon]: přepočítat z UTM
                $pasmo = $vystupCrs - 25800;
                $casti = array_map(fn ($c) => array_map(fn ($b) => Geo::utmZpet($b[1], $b[0], $pasmo), $c), $casti);
            }
            $polygon = Geo::castSBodem($casti, $lat, $lon);
            if (count($polygon) < 3) {
                continue;
            }
            [$id, $cislo, $vymera, $gemarkung] = $this->pole($z['schema'], $p);
            if (!$id) {
                continue;
            }
            $vystup[] = Parcela::sestav('DE', $id, $cislo, $polygon, $vymera, [
                'typ' => 'pozemkova',
                'ku_nazev' => $gemarkung,
                'spolkova_zeme' => $land,
            ]);
        }

        return $vystup;
    }

    /** [id, číslo, výměra, Gemarkung] podle schématu služby. */
    private function pole(string $schema, array $p): array
    {
        $x = $p['xml'];
        if ($schema === 'cp') {
            $id = $p['ref'] ?? $p['local_id'];

            return [$id, $p['label'] ?? self::cisloZKennzeichen((string) $id), $p['vymera'], null];
        }
        $kennz = InspireGml::text($x, $schema === 'berlin' ? 'fsko' : 'flstkennz');
        $plocha = InspireGml::text($x, $schema === 'berlin' ? 'afl' : 'flaeche');
        $gemarkung = InspireGml::text($x, $schema === 'berlin' ? 'namgmk' : 'gemarkung');
        $zae = InspireGml::text($x, $schema === 'berlin' ? 'zae' : 'flstnrzae');
        $nen = InspireGml::text($x, $schema === 'berlin' ? 'nen' : 'flstnrnen');
        $cislo = $zae ? ltrim($zae, '0') . ($nen ? '/' . ltrim($nen, '0') : '') : self::cisloZKennzeichen((string) $kennz);

        return [$kennz, $cislo, is_numeric($plocha) ? (float) $plocha : null, $gemarkung];
    }

    /** Flurstückskennzeichen „054308002018840168__“ → „1884/168“. */
    public static function cisloZKennzeichen(string $k): string
    {
        if (strlen($k) < 18) {
            return $k;
        }
        $zae = ltrim(substr($k, 9, 5), '0_');
        $nen = ltrim(rtrim(substr($k, 14, 4), '_'), '0');

        return $zae . ($nen !== '' ? "/{$nen}" : '');
    }
}
