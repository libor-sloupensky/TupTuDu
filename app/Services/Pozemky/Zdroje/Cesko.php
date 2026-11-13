<?php

namespace App\Services\Pozemky\Zdroje;

use App\Services\Katastr\CuzkWfsClient;
use App\Services\Pozemky\Geo;
use App\Services\Pozemky\InspireGml;
use App\Services\Pozemky\Parcela;
use App\Services\Pozemky\ZdrojParcel;
use Illuminate\Support\Facades\Http;

/**
 * Česko: ČÚZK INSPIRE WFS (rozšířené parcely CPX). Hledání podle čísla dál dělá CuzkWfsClient,
 * tady je parcela v bodě pro výběr na mapě. Okolí a stavby bere ze stávajícího klienta.
 * Výšky (DMR 5G) jsou v CeskoVysky.
 */
class Cesko implements ZdrojParcel
{
    private const WFS_CPX = 'https://services.cuzk.cz/wfs/inspire-cpx-wfs.asp';

    public function __construct(private CuzkWfsClient $klient)
    {
    }

    public function parcelaVBode(float $lat, float $lon): ?array
    {
        $o = Geo::obalkaKolem($lat, $lon, 0.3);
        $odpoved = Http::timeout(20)->get(self::WFS_CPX, [
            'service' => 'WFS',
            'version' => '2.0.0',
            'request' => 'GetFeature',
            'typeNames' => 'cp-ext:CadastralParcel',
            'srsName' => 'urn:ogc:def:crs:EPSG::4326',
            'filter' => InspireGml::filtrObalky($o, 'cp:geometry'),
            'count' => 20,
        ])->throw();

        $parcely = [];
        foreach (InspireGml::prvky(InspireGml::over($odpoved->body(), 'ČÚZK'), true) as $p) {
            $parcely[] = $this->sestav($p, $lat, $lon);
        }

        return Parcela::vyberSBodem($parcely, $lat, $lon);
    }

    private function sestav(array $p, float $lat, float $lon): array
    {
        $label = $p['label'] ?? '';
        $stavebni = str_starts_with($label, 'st.');
        $cislo = trim(preg_replace('/^st\.\s*/', '', $label));
        $kuKod = null;
        if ($p['ref'] && preg_match('/^(\d+)-/', $p['ref'], $m)) {
            $kuKod = (int) $m[1];
        }
        $druh = null;
        if (preg_match('/landType[^>]*xlink:href="[^"]*\/([^"\/]+)"/', $p['xml'], $m)) {
            $druh = $m[1];
        }
        $kuNazev = null;
        if (preg_match('/<(?:\w+:)?zoning\b[^>]*xlink:title="([^"]*)"/', $p['xml'], $m)) {
            $kuNazev = html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }
        $obec = null;
        if (preg_match('/<(?:\w+:)?administrativeUnit\b[^>]*xlink:title="([^"]*)"/', $p['xml'], $m)) {
            $obec = html_entity_decode($m[1], ENT_QUOTES | ENT_XML1, 'UTF-8');
        }

        return Parcela::sestav('CZ', $p['ref'] ?? $label, $cislo, Geo::castSBodem($p['polygony'], $lat, $lon), $p['vymera'], [
            'label' => $label,
            'typ' => $stavebni ? 'stavebni' : 'pozemkova',
            'ku_kod' => $kuKod,
            'ku_nazev' => $kuNazev,
            'obec' => $obec,
            'druh_pozemku' => $druh,
            'druh_pozemku_cz' => CuzkWfsClient::DRUH_POZEMKU_CZ[$druh] ?? $druh,
        ]);
    }

    public function parcelyVOblasti(array $obalka): array
    {
        return $this->klient->nactiParcelyVOblasti($obalka);
    }

    public function stavbyVOblasti(array $obalka): array
    {
        return $this->klient->nactiStavby($obalka);
    }
}
