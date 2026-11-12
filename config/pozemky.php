<?php

use App\Services\Pozemky\Zdroje;

/**
 * Pozemky v Evropě: odkud bere editor parcely, stavby a výšky terénu (dokumentace modules/lokalizace.md,
 * část Pozemky v Evropě). Zemi určuje poloha pozemku, ne země uživatele.
 *
 *   parcely   třída se ZdrojParcel (parcela v bodě, okolí, stavby), null = katastr pro zemi nemáme
 *   vysky     třída se ZdrojVysek, null = bez výškového profilu
 *   rozliseni rozlišení modelu terénu v metrech (editor u hrubšího než 2 m napíše, že je terén orientační)
 *   okoli     false, když služba neumí parcely v obálce (Polsko)
 *   wms       průhledná vrstva hranic parcel nad mapou při výběru pozemku
 *   atribuce  povinné uvedení zdroje (licence CC BY a podobné)
 *
 * Každou službu ověřuje `php artisan pozemky:over` (skutečné dotazy na náhodná místa).
 */
return [
    'zeme' => [
        'CZ' => [
            'parcely' => Zdroje\Cesko::class,
            'vysky' => Zdroje\CeskoVysky::class,
            'rozliseni' => 1,
            'wms' => ['url' => 'https://services.cuzk.cz/wms/wms.asp', 'vrstvy' => 'KN', 'verze' => '1.3.0', 'crs' => 'EPSG:3857'],
            'atribuce' => '© ČÚZK',
        ],
        'SK' => [
            'parcely' => Zdroje\Slovensko::class,
            'vysky' => Zdroje\Slovensko::class,
            'rozliseni' => 1,
            // Server posílá Cross-Origin-Resource-Policy: same-origin, prohlížeč dlaždice zahodí: jdou přes náš server
            'wms' => ['url' => 'https://inspirews.skgeodesy.sk/geoserver/cp/ows', 'vrstvy' => 'CP.CadastralParcel', 'verze' => '1.3.0', 'crs' => 'EPSG:3857', 'proxy' => true],
            'atribuce' => '© ÚGKK SR (CC BY 4.0)',
        ],
        'PL' => [
            'parcely' => Zdroje\Polsko::class,
            'vysky' => Zdroje\Polsko::class,
            'rozliseni' => 1,
            'okoli' => false,
            'wms' => ['url' => 'https://integracja.gugik.gov.pl/cgi-bin/KrajowaIntegracjaEwidencjiGruntow', 'vrstvy' => 'dzialki,numery_dzialek', 'verze' => '1.3.0', 'crs' => 'EPSG:3857'],
            'atribuce' => '© GUGiK',
        ],
        'FR' => [
            'parcely' => Zdroje\Francie::class,
            'vysky' => Zdroje\Francie::class,
            'rozliseni' => 1,
            'wms' => ['url' => 'https://data.geopf.fr/wms-r', 'vrstvy' => 'CADASTRALPARCELS.PARCELLAIRE_EXPRESS', 'verze' => '1.3.0', 'crs' => 'EPSG:3857'],
            'atribuce' => '© IGN, DGFiP (Licence Ouverte)',
        ],
        'ES' => [
            'parcely' => Zdroje\Spanelsko::class,
            'vysky' => Zdroje\Spanelsko::class,
            'rozliseni' => 5,
            'wms' => ['url' => 'https://ovc.catastro.meh.es/cartografia/INSPIRE/spadgcwms.aspx', 'vrstvy' => 'CP.CadastralParcel', 'verze' => '1.3.0', 'crs' => 'EPSG:3857'],
            'atribuce' => '© Dirección General del Catastro, © IGN España (CC BY 4.0)',
        ],
        // Katastr po spolkových zemích (Zdroje\Nemecko), Bavorsko bez bezplatné WFS (jen mapa bez čísel).
        // Vrstva parcel podle spolkové země bodu, viz Pozemky::infoBodu.
        'DE' => [
            'parcely' => Zdroje\Nemecko::class,
            // Výšky jen v BY, NW, HE, BB, BE, MV (Zdroje\NemeckoVysky::zemeSVyskami)
            'vysky' => Zdroje\NemeckoVysky::class,
            'rozliseni' => 1,
            'wms_oblasti' => [
                'BW' => ['url' => 'https://owsproxy.lgl-bw.de/owsproxy/ows/WMS_INSP_BW_Flst_ALKIS', 'vrstvy' => 'alkis:CP.CadastralParcel'],
                'BY' => ['url' => 'https://geoservices.bayern.de/od/wms/alkis/v1/parzellarkarte', 'vrstvy' => 'by_alkis_parzellarkarte_umr_schwarz'],
                'BE' => ['url' => 'https://gdi.berlin.de/services/wms/alkis_flurstuecke', 'vrstvy' => 'flurstuecke'],
                'BB' => ['url' => 'https://isk.geobasis-bb.de/ows/alkis_wms', 'vrstvy' => 'adv_alkis_flurstuecke'],
                'HB' => ['url' => 'https://geodienste.bremen.de/wms_inspire_cp_alkis', 'vrstvy' => 'cp_cadastralparcel'],
                'HH' => ['url' => 'https://geodienste.hamburg.de/HH_WMS_INSPIRE_Flurstuecke', 'vrstvy' => 'CP.CadastralParcel'],
                'HE' => ['url' => 'https://www.gds-srv.hessen.de/cgi-bin/lika-services/ogc-free-maps.ows', 'vrstvy' => 'he_alk_t'],
                'MV' => ['url' => 'https://www.geodaten-mv.de/dienste/alkis_wms', 'vrstvy' => 'adv_alkis_flurstuecke'],
                'NI' => ['url' => 'https://www.inspire.niedersachsen.de/doorman/noauth/alkis-vs-cp', 'vrstvy' => 'CP.CadastralParcel'],
                'NW' => ['url' => 'https://www.wms.nrw.de/geobasis/wms_nw_alkis', 'vrstvy' => 'adv_alkis_flurstuecke'],
                'RP' => ['url' => 'https://geo5.service24.rlp.de/wms/liegenschaften_rp.fcgi', 'vrstvy' => 'Flurstueck'],
                'SL' => ['url' => 'https://geoportal.saarland.de/gdi-sl/inspirewms_Flurstuecke_Grundstuecke_ALKIS', 'vrstvy' => 'CP.CadastralParcel'],
                'SN' => ['url' => 'https://geodienste.sachsen.de/wms_geosn_alkis-adv/guest', 'vrstvy' => 'adv_alkis_flurstuecke', 'od_zoomu' => 19],
                'ST' => ['url' => 'https://www.geodatenportal.sachsen-anhalt.de/wss/service/ST_LVermGeo_ALKIS_WMS_AdV_konform_App/guest', 'vrstvy' => 'adv_alkis_flurstuecke'],
                'SH' => ['url' => 'https://service.gdi-sh.de/SH_INSPIREVIEW_AI_CP_ALKIS', 'vrstvy' => 'CP.CadastralParcel'],
                'TH' => ['url' => 'https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wms_th', 'vrstvy' => 'adv_alkis_flurstuecke'],
            ],
            'atribuce' => '© GeoBasis-DE, Vermessungsverwaltungen der Länder',
        ],
        'IT' => [
            'parcely' => Zdroje\Italie::class,
            'vysky' => Zdroje\ItalieVysky::class,
            'rozliseni' => 10,
            'wms' => ['url' => 'https://wms.cartografia.agenziaentrate.gov.it/inspire/wms/ows01.php', 'vrstvy' => 'CP.CadastralParcel', 'verze' => '1.1.1', 'crs' => 'EPSG:4258'],
            'atribuce' => '© Agenzia delle Entrate (CC BY 4.0), © INGV TINITALY (CC BY 4.0)',
        ],
        // Rakousko: katastr BEV přes WFS je placený, pozemek se obkreslí; výšky ALS-DGM 1 m (COG)
        'AT' => [
            'parcely' => null,
            'vysky' => Zdroje\RakouskoVysky::class,
            'rozliseni' => 1,
            'atribuce' => '© BEV (CC BY 4.0)',
        ],
    ],
];
