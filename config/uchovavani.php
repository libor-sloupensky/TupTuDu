<?php

// Jak dlouho uchováváme osobní a technické údaje. Maže je denně `php artisan uchovavani:promazat`
// (App\Support\PlanovaneUlohy). Zásady ochrany osobních údajů (pravni/soukromi-*) berou lhůty
// odsud — změna tady = změna v textu zásad, obojí sedí vždy spolu.
return [
    // Zprávy z kontaktního formuláře (kontaktni_zpravy) — od odeslání
    'kontaktni_zpravy_mesicu' => 24,

    // Záznamy o chybách (bugy), ztracené adresy (seo_404) a řádky laravel.log — od posledního výskytu
    'technicke_zaznamy_mesicu' => 12,

    // Počty úprav v editoru za den (denni_upravy, limit tarifu Zdarma) — od toho dne.
    // Zásady píšou „N měsíce“ → hodnota 2–4, jinak upravit i tvar slova v pravni/soukromi-cs.
    'denni_upravy_mesicu' => 3,
];
