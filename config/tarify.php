<?php

// Tarify zákaznické aplikace — limity a ceny (App\Support\Tarif, modules/platby.md).
//
// Placené tarify se platí přes Paddle (Laravel Cashier Paddle). Každý placený tarif má
// v Paddlu svůj produkt se dvěma cenami (měsíčně, ročně); jejich ID (pro_…, pri_…) jsou
// v .env a zakládá je `php artisan paddle:katalog`. Tarif uživatele se pozná podle
// produktu v jeho předplatném — po zdražení (nová cena téhož produktu) platí dál.
//
// Limit null = bez omezení.
return [
    'tarify' => [
        'zdarma' => [
            // Úpravy v editoru za den — každý krok historie (nová stěna, posun stěny
            // nebo otvoru, smazání…). Prohlížení, Zpět/Vpřed a výchozí krok se nepočítá.
            'kroku_denne' => 30,
            'projektu' => 1,
            // Obrázky PNG a sdílení odkazem (Libor 4. 11. 2026, modules/sdileni.md).
            // Až bude PDF: zdarma jen ploché, bez vrstev (stránka jako obrázek).
            'exporty' => true,
            // Zdrojová data, která jdou nahrát do jiných programů (DWG/DXF, 3D model,
            // PDF s vrstvami) — jen placené tarify (Libor 13. 11. 2026). Zatím žádný takový export není.
            'zdrojova_data' => false,
        ],
        // Zkušební verze Stavebníku: 14 dní bez karty, jednou na účet, jen v aplikaci
        // (Paddle o ní neví). Úpravy bez omezení, ale projekt a zdrojová data jako Zdarma —
        // návrh se bez placené verze nedá ze systému vyjmout. Pak zpět na Zdarma.
        'zkouska' => [
            'dni' => 14,
            'kroku_denne' => null,
            'projektu' => 1,
            'exporty' => true,
            'zdrojova_data' => false,
        ],
        'stavebnik' => [
            'kroku_denne' => null,
            'projektu' => 5,
            'exporty' => true,
            'zdrojova_data' => true,
            'paddle' => [
                'produkt' => env('PADDLE_PRODUKT_STAVEBNIK'),
                'mesic' => env('PADDLE_CENA_STAVEBNIK_MESIC'),
                'rok' => env('PADDLE_CENA_STAVEBNIK_ROK'),
            ],
        ],
        'profi' => [
            'kroku_denne' => null,
            'projektu' => null,
            'exporty' => true,
            'zdrojova_data' => true,
            'paddle' => [
                'produkt' => env('PADDLE_PRODUKT_PROFI'),
                'mesic' => env('PADDLE_CENA_PROFI_MESIC'),
                'rok' => env('PADDLE_CENA_PROFI_ROK'),
            ],
        ],
    ],

    // Ceny včetně DPH podle měny — ceník je ukazuje a `paddle:katalog` podle nich zakládá
    // ceny v Paddlu (základ EUR, pro Česko pevná cena v Kč). Měna podle země: CZ → CZK,
    // jinak EUR. Firmy s DIČ z EU zaplatí bez DPH — konečnou částku ukáže Paddle.
    // Potvrzeno Liborem 2026-10-29 (průzkum konkurence v modules/platby.md).
    'ceny' => [
        'CZK' => [
            'stavebnik' => ['mesic' => 249, 'rok' => 1490],
            'profi' => ['mesic' => 990, 'rok' => 8290],
        ],
        'EUR' => [
            'stavebnik' => ['mesic' => 9.90, 'rok' => 59],
            'profi' => ['mesic' => 39.90, 'rok' => 329],
        ],
    ],
];
