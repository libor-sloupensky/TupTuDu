<?php

namespace App\Services\Pozemky;

/** Sjednocený tvar parcely pro editor, ať přijde z kterékoli země. */
class Parcela
{
    /**
     * @param string $zeme ISO kód země zdroje
     * @param string $id jednoznačný identifikátor v zemi (národní katastrální reference)
     * @param string $cislo číslo parcely tak, jak ho zná majitel
     * @param array $polygon [[lat, lon], ...]
     * @param float|null $vymera úřední výměra v m², když ji služba dává
     * @param array $navic další pole (obec, ku_kod, druh_pozemku…)
     */
    public static function sestav(string $zeme, string $id, string $cislo, array $polygon, ?float $vymera = null, array $navic = []): array
    {
        $polygon = self::uklid($polygon);

        return array_merge([
            'zeme' => $zeme,
            'id' => $id,
            'cislo' => $cislo,
            'label' => $cislo,
            'typ' => null,
            'polygon_wgs84' => $polygon,
            'centroid_wgs84' => Geo::stred($polygon),
            'bbox' => Geo::obalka($polygon),
            'vymera' => $vymera !== null ? (int) round($vymera) : (int) round(Geo::plocha($polygon)),
            'vymera_vypoctena' => $vymera === null,
        ], $navic);
    }

    /** Zaokrouhlí na 7 desetin (cm), zahodí opakovaný koncový bod a duplicity za sebou. */
    public static function uklid(array $polygon): array
    {
        $vystup = [];
        foreach ($polygon as $b) {
            $b = [round((float) $b[0], 7), round((float) $b[1], 7)];
            if ($vystup && end($vystup) === $b) {
                continue;
            }
            $vystup[] = $b;
        }
        if (count($vystup) > 1 && $vystup[0] === end($vystup)) {
            array_pop($vystup);
        }

        return $vystup;
    }

    /** Z více parcel v okolí bodu vybere tu, ve které bod leží (nebo nejbližší). */
    public static function vyberSBodem(array $parcely, float $lat, float $lon): ?array
    {
        foreach ($parcely as $p) {
            if (Geo::bodVPolygonu($lat, $lon, $p['polygon_wgs84'])) {
                return $p;
            }
        }
        // Bod přesně na hranici: nejbližší střed
        usort($parcely, fn ($a, $b) => Geo::vzdalenost([$lat, $lon], [$a['centroid_wgs84']['lat'], $a['centroid_wgs84']['lon']])
            <=> Geo::vzdalenost([$lat, $lon], [$b['centroid_wgs84']['lat'], $b['centroid_wgs84']['lon']]));

        return $parcely[0] ?? null;
    }
}
