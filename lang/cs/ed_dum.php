<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Nábytková sestava (sestavy.js)
    'sestava' => [
        'kuchyn' => 'Kuchyňská linka',
        'skrin' => 'Vestavěná skříň',
    ],
    // Obecné, používá se na víc místech
    'strecha' => 'Střecha',
    'strecha_nastavit' => 'nastavit',
    'hrana_strechy' => 'Hrana střechy',
    'sloup' => 'Sloup',
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
        'vlnity' => 'Vlnitý plech',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Červená',
        'taska-zvetrala' => 'Červená, zvětralá',
        'taska-lisejnik' => 'Červená s lišejníkem',
        'taska-oranzova' => 'Oranžová',
        'taska-hneda-stara' => 'Hnědá, stará',
        'taska-cerna' => 'Černá',
        'taska-cerna-lisejnik' => 'Černá s lišejníkem',
        'betonova-cihlova' => 'Cihlová',
        'betonova-hneda-mech' => 'Hnědá s mechem',
        'betonova-tmava-mech' => 'Tmavě hnědá s mechem',
        'betonova-cerna' => 'Černá s mechem',
        'betonova-seda' => 'Šedá s mechem',
        'bobrovka-cervena' => 'Červená',
        'bobrovka-hneda-stara' => 'Hnědá, stará',
        'bobrovka-seda' => 'Šedá',
        'sindel-sedy' => 'Šedý',
        'sindel-tmavy-mech' => 'Tmavý s mechem',
        'bridlice-obdelnik' => 'Obdélníková',
        'bridlice-supina' => 'Šupinová',
        'bridlice-stara' => 'Šedá, stará',
        'bridlice-svetla' => 'Světle šedá',
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
        // Jen nižší střecha nad částí podlaží bez patra
        'terasa' => 'Terasa',
        'zadna' => 'Bez střechy',
    ],

    // Nižší střecha nad částí podlaží, nad kterou už patro není (garáž, krytý vstup)
    'nizsi' => [
        'vyber' => 'Střecha',
        'vyber_tip' => 'Kterou střechu upravuješ. Nižší střechy přidá editor sám nad části podlaží, nad kterými už patro není. Vybrat je jde i klepnutím v půdorysu.',
        'hlavni' => 'Hlavní',
        'cast' => 'nižší část',
        'cast_n' => 'nižší část :n',
        'typ_tip' => 'Pultová stoupá ke zdi patra. Terasa je plochá pochozí střecha se zábradlím, bez střechy zůstane jen strop.',
        'vyska_okapu_tip' => 'Výška, kde střecha protne líc stěny, měřená od podlahy tohoto podlaží. Výchozí je výška stropu.',
        'krytina_auto' => 'Podle sklonu: od :sklon° jako hlavní střecha (:krytina), při menším sklonu falcovaný plech v její barvě.',
        'podle_sklonu' => 'podle sklonu',
        'podle_sklonu_tip' => 'Krytinu a barvu znovu určí sklon a hlavní střecha',
        'pod_sklonem' => 'Krytina je pod svým bezpečným sklonem :sklon°, hrozí zatékání.',
        'terasa_info' => 'Dlažba ve výšce podlahy patra, zábradlí na vnějších hranách.',
        'zadna_info' => 'Nad touto částí zůstane jen strop.',
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
        'sloup' => 'Sloup',
        'posun_sloupu' => 'Posun sloupu',
        'otoceni_sloupu' => 'Otočení sloupu',
        'smazani_sloupu' => 'Smazání sloupu',
        'smazani_strechy' => 'Smazání střechy',
        'nizsi_strecha' => 'Nižší střecha',
        'barva_domu' => 'Barva domu',
        'zaklady' => 'Základy',
        'nova_sestava' => 'Nová nábytková sestava',
        'sestava' => 'Nábytková sestava',
        'smazani_sestavy' => 'Smazání nábytkové sestavy',
        'delka_sestavy' => 'Délka nábytkové sestavy',
        'presun_skrinky' => 'Přesun skříňky',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Schody',
        'sloup' => 'Sloup',
        'sestava' => ':nazev, :povrch',
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
