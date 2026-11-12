<?php

/**
 * Veřejné srovnávací stránky (modules/srovnani.md): profil nástroje a „X vs TupTuDu“.
 * Obsah se generuje z analýzy konkurence v DB (jen režim Sledovat a hodnoty s dokladem).
 */
return [
    // Zveřejněné jazyky. Němčina je připravená (texty i poznámky), ale zatím se nezveřejňuje
    // (Libor 12. 11. 2026: v Německu nejtvrdší praxe placených výzev, bez advokáta zatím ne).
    'jazyky' => ['cs', 'sk', 'pl', 'en', 'fr', 'es', 'it'],

    // Část adresy podle jazyka: /cs/srovnani/planner-5d, /cs/srovnani/planner-5d-vs-tuptudu
    'segmenty' => [
        'cs' => 'srovnani', 'sk' => 'porovnanie', 'pl' => 'porownanie', 'en' => 'compare',
        'de' => 'vergleich', 'fr' => 'comparatif', 'es' => 'comparativa', 'it' => 'confronto',
    ],

    // Hodnota starší než tolik měsíců se na webu nezobrazí (KonkurenceHodnota::lzeZverejnit)
    'platnost_mesicu' => 6,
];
