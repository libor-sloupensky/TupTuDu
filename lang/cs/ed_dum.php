<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Obecné, používá se na víc místech
    'strecha' => 'Střecha',
    'strecha_nastavit' => 'nastavit',
    'hrana_strechy' => 'Hrana střechy',
    'smazat_podlazi_potvrzeni' => 'Smazat podlaží :nazev i s jeho kresbou?',
    'schody_mezi_urovnemi' => 'mezi úrovněmi, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm z :podlazi',
    'podlazi_niz' => 'podlaží níž',
    'schody_dolu' => '↓ dolů',
    'stit' => 'štít',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Pálená taška',
        'betonova' => 'Betonová taška',
        'bobrovka' => 'Bobrovka',
        'sindel' => 'Asfaltový šindel',
        'bridlice' => 'Břidlice',
        'falc' => 'Falcovaný plech',
        'trapez' => 'Trapézový plech',
    ],

    'barva_krytiny' => [
        'cervena' => 'Cihlová',
        'antracit' => 'Antracit',
        'hneda' => 'Hnědá',
        'seda' => 'Šedá',
        'modroseda' => 'Modrošedá',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Hladká',
        'prkna' => 'Dřevěná prkna',
        'parkety' => 'Parkety, rybí kost',
        'dlazba30' => 'Dlažba 30 × 30 cm',
        'dlazba60' => 'Dlažba 60 × 60 cm',
        'beton' => 'Betonová stěrka',
        'koberec' => 'Koberec',
    ],

    'typ_strechy' => [
        'sedlova' => 'Sedlová',
        'valbova' => 'Valbová',
        'pultova' => 'Pultová',
        'plocha' => 'Plochá',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'V úrovni podlaží',
        'zvysena' => 'Zvýšená',
        'snizena' => 'Snížená',
        'bez_podlahy' => 'Bez podlahy',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Celý dům je vybraný. Táhni za kteroukoli stěnu.',
        'planek_rucne' => 'Plánek zatím usaď ručně dvěma body (panel Podklad).',
        'planek_nesrovnan' => 'Plánek se nepodařilo srovnat se spodním podlažím automaticky. Usaď ho dvěma body (panel Podklad).',
        'planek_srovnan' => 'Plánek srovnán se spodním podlažím (:rohu). Doladit lze dvěma body v panelu Podklad.',
        'shodnych_rohu' => 'one=:pocet shodný roh|few=:pocet shodné rohy|many=:pocet shodných rohů|other=:pocet shodných rohů',
        'body_blizko' => 'Body jsou příliš blízko sebe.',
        'planek_meritko' => 'Plánek usazen, ale měřítka se liší o :procent %. Zkontroluj kalibraci výkresu.',
        'planek_usazen' => 'Plánek usazen na spodní podlaží.',
        'pribyla_nosna' => 'Do podlaží :nazev přibyla nosná stěna.',
        'schody_bez_podlazi' => 'Schodiště vede do podlaží nad aktivním. Nejdřív přidej vyšší podlaží.',
        'schody_odstraneny' => 'Schody k této podlaze byly odstraněny.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Klepni na první bod na plánku (roh domu nebo schodiště).',
        'tentyz_bod' => 'Klepni na totéž místo ve spodním podlaží.',
        'druhy_bod' => 'Klepni na druhý bod na plánku, co nejdál od prvního.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Nové podlaží :nazev',
        'smazani_podlazi' => 'Smazání podlaží :nazev',
        'podlazi' => 'Podlaží :nazev',
        'vyska_domu' => 'Výška domu',
        'usazeni_planku' => 'Usazení plánku',
        'podpera' => 'Podpěra do :nazev',
        'uroven_podlahy' => 'Úroveň podlahy',
        'prenos_vysky' => 'Přenos výšky',
        'schodiste' => 'Schodiště',
        'schody_mezi_urovnemi' => 'Schody mezi úrovněmi',
        'smazani_schodiste' => 'Smazání schodiště',
        'posun_schodiste' => 'Posun schodiště',
        'otoceni_schodiste' => 'Otočení schodiště',
        'smazani_strechy' => 'Smazání střechy',
        'barva_domu' => 'Barva domu',
        'zaklady' => 'Základy',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Schody',
        'podlaha' => 'Podlaha, :nazev',
        'mistnost' => 'místnost',
        'fasada' => 'Fasáda',
        'okna_venku' => 'Okna venku',
        'okna_uvnitr' => 'Okna uvnitř',
        'dvere_venku' => 'Vchodové dveře venku',
        'dvere_uvnitr' => 'Vchodové dveře uvnitř',
        'dvere_vnitrni' => 'Vnitřní dveře',
        'vrata_venku' => 'Vrata venku',
        'vrata_uvnitr' => 'Vrata uvnitř',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'cca :objem m³',
        'vykop' => ':objem výkop',
        'chybi_vykop' => 'chybí základ, :objem výkop',
        'chybi' => 'chybí základ',
        'chybi_upozorneni' => 'Chybí základ: :seznam. Dům tu nedosahuje na terén, proto se tu nekope. Základ dotáhne volba Prodloužit základ k zemi.',
        'nad_terenem' => 'Základ vystupuje nad terén až o :vyska m.',
        'teren_rovina' => 'Terén: rovina, výšková data nejsou k dispozici.',
        'teren_vyska' => 'Terén pod domem: :vyska m n.m. (podle výškových dat)',
        'vykopek_chybi' => 'Výkopek chybí',
        'vykopek_navic' => 'Výkopek navíc',
        'ornice_chybi' => 'Ornice chybí',
        'ornice_navic' => 'Ornice navíc',
    ],
];
