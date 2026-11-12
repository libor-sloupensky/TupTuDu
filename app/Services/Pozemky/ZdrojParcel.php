<?php

namespace App\Services\Pozemky;

/**
 * Katastr jedné země (nebo části země). Všechny souřadnice ve WGS84, polygon [[lat, lon], ...].
 * Výstup parcely sjednocuje Parcela::sestav(), editor s ní pak pracuje stejně v každé zemi.
 */
interface ZdrojParcel
{
    /** Parcela, do které padne bod, nebo null. */
    public function parcelaVBode(float $lat, float $lon): ?array;

    /** Parcely v obálce (okolí pozemku), stačí obrys a číslo. */
    public function parcelyVOblasti(array $obalka): array;

    /** Obrysy staveb v obálce: [['polygon_wgs84' => [[lat, lon], ...]], ...]. */
    public function stavbyVOblasti(array $obalka): array;
}
