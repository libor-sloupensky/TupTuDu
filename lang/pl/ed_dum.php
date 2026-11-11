<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Obecné, používá se na víc místech
    'strecha' => 'Dach',
    'strecha_nastavit' => 'ustaw',
    'hrana_strechy' => 'Krawędź dachu',
    'sloup' => 'Słup',
    'smazat_podlazi_potvrzeni' => 'Usunąć kondygnację :nazev wraz z jej rysunkiem?',
    'schody_mezi_urovnemi' => 'między poziomami, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm (:podlazi)',
    'podlazi_niz' => 'kondygnacja niżej',
    'schody_dolu' => '↓ w dół',
    'stit' => 'szczyt',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Dachówka ceramiczna',
        'betonova' => 'Dachówka betonowa',
        'bobrovka' => 'Karpiówka',
        'sindel' => 'Gont bitumiczny',
        'bridlice' => 'Łupek',
        'falc' => 'Blacha na rąbek',
        'trapez' => 'Blacha trapezowa',
    ],

    'barva_krytiny' => [
        'cervena' => 'Ceglasty',
        'antracit' => 'Antracyt',
        'hneda' => 'Brązowy',
        'seda' => 'Szary',
        'modroseda' => 'Niebieskoszary',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Gładka',
        'prkna' => 'Deski drewniane',
        'parkety' => 'Parkiet, jodełka',
        'dlazba30' => 'Płytki 30 × 30 cm',
        'dlazba60' => 'Płytki 60 × 60 cm',
        'beton' => 'Szpachla betonowa',
        'koberec' => 'Wykładzina',
    ],

    'typ_strechy' => [
        'sedlova' => 'Dwuspadowy',
        'valbova' => 'Czterospadowy',
        'pultova' => 'Jednospadowy',
        'plocha' => 'Płaski',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'Na poziomie kondygnacji',
        'zvysena' => 'Podwyższona',
        'snizena' => 'Obniżona',
        'bez_podlahy' => 'Bez podłogi',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Cały dom jest zaznaczony. Przeciągnij dowolną ścianę.',
        'planek_rucne' => 'Na razie dopasuj rzut ręcznie dwoma punktami (panel Podkład).',
        'planek_nesrovnan' => 'Nie udało się automatycznie dopasować rzutu do kondygnacji niżej. Dopasuj go dwoma punktami (panel Podkład).',
        'planek_srovnan' => 'Rzut dopasowany do kondygnacji niżej (:rohu). Możesz go doprecyzować dwoma punktami w panelu Podkład.',
        'shodnych_rohu' => 'one=:pocet zgodny narożnik|few=:pocet zgodne narożniki|many=:pocet zgodnych narożników|other=:pocet zgodnego narożnika',
        'body_blizko' => 'Punkty są zbyt blisko siebie.',
        'planek_meritko' => 'Rzut dopasowany, ale skale różnią się o :procent %. Sprawdź kalibrację rysunku.',
        'planek_usazen' => 'Rzut dopasowany do kondygnacji niżej.',
        'pribyla_nosna' => 'Na kondygnacji :nazev dodano ścianę nośną.',
        'schody_bez_podlazi' => 'Schody prowadzą na kondygnację nad aktywną. Najpierw dodaj wyższą kondygnację.',
        'schody_odstraneny' => 'Schody do tej podłogi zostały usunięte.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Kliknij pierwszy punkt na rzucie (narożnik domu lub schodów).',
        'tentyz_bod' => 'Kliknij to samo miejsce na kondygnacji niżej.',
        'druhy_bod' => 'Kliknij drugi punkt na rzucie, jak najdalej od pierwszego.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Nowa kondygnacja :nazev',
        'smazani_podlazi' => 'Usunięcie kondygnacji :nazev',
        'podlazi' => 'Kondygnacja :nazev',
        'vyska_domu' => 'Wysokość domu',
        'usazeni_planku' => 'Dopasowanie rzutu',
        'podpera' => 'Podpora na kondygnacji :nazev',
        'uroven_podlahy' => 'Poziom podłogi',
        'prenos_vysky' => 'Przeniesienie wysokości',
        'schodiste' => 'Schody',
        'schody_mezi_urovnemi' => 'Schody między poziomami',
        'smazani_schodiste' => 'Usunięcie schodów',
        'posun_schodiste' => 'Przesunięcie schodów',
        'otoceni_schodiste' => 'Obrót schodów',
        'sloup' => 'Słup',
        'posun_sloupu' => 'Przesunięcie słupa',
        'otoceni_sloupu' => 'Obrót słupa',
        'smazani_sloupu' => 'Usunięcie słupa',
        'smazani_strechy' => 'Usunięcie dachu',
        'barva_domu' => 'Kolor domu',
        'zaklady' => 'Fundamenty',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Schody',
        'sloup' => 'Słup',
        'podlaha' => 'Podłoga, :nazev',
        'mistnost' => 'pomieszczenie',
        'fasada' => 'Elewacja',
        'okna_venku' => 'Okna na zewnątrz',
        'okna_uvnitr' => 'Okna wewnątrz',
        'dvere_venku' => 'Drzwi wejściowe na zewnątrz',
        'dvere_uvnitr' => 'Drzwi wejściowe wewnątrz',
        'dvere_vnitrni' => 'Drzwi wewnętrzne',
        'vrata_venku' => 'Bramy na zewnątrz',
        'vrata_uvnitr' => 'Bramy wewnątrz',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'ok. :objem m³',
        'vykop' => ':objem wykopu',
        'chybi_vykop' => 'brak fundamentu, :objem wykopu',
        'chybi' => 'brak fundamentu',
        'chybi_upozorneni' => 'Brak fundamentu: :seznam. Dom nie sięga tu terenu, dlatego nie ma tu wykopu. Fundament doprowadzi opcja Przedłuż fundament do gruntu.',
        'nad_terenem' => 'Fundament wystaje nad teren maksymalnie o :vyska m.',
        'teren_rovina' => 'Teren: płaski, dane wysokościowe nie są dostępne.',
        'teren_vyska' => 'Teren pod domem: :vyska m n.p.m. (według danych wysokościowych)',
        'vykopek_chybi' => 'Brakuje urobku',
        'vykopek_navic' => 'Nadmiar urobku',
        'ornice_chybi' => 'Brakuje humusu',
        'ornice_navic' => 'Nadmiar humusu',
    ],
];
