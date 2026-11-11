<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Nábytková sestava (sestavy.js)
    'sestava' => [
        'kuchyn' => 'Kuchynská linka',
        'skrin' => 'Vstavaná skriňa',
    ],
    // Obecné, používá se na víc místech
    'strecha' => 'Strecha',
    'strecha_nastavit' => 'nastaviť',
    'hrana_strechy' => 'Hrana strechy',
    'sloup' => 'Stĺp',
    'smazat_podlazi_potvrzeni' => 'Zmazať podlažie :nazev aj s jeho kresbou?',
    'schody_mezi_urovnemi' => 'medzi úrovňami, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm z :podlazi',
    'podlazi_niz' => 'podlažie nižšie',
    'schody_dolu' => '↓ nadol',
    'stit' => 'štít',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Pálená škridla',
        'betonova' => 'Betónová škridla',
        'bobrovka' => 'Bobrovka',
        'sindel' => 'Asfaltový šindeľ',
        'bridlice' => 'Bridlica',
        'falc' => 'Falcovaný plech',
        'trapez' => 'Trapézový plech',
        'vlnity' => 'Vlnitý plech',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Červená',
        'taska-zvetrala' => 'Červená, zvetraná',
        'taska-lisejnik' => 'Červená s lišajníkom',
        'taska-oranzova' => 'Oranžová',
        'taska-hneda-stara' => 'Hnedá, stará',
        'taska-cerna' => 'Čierna',
        'taska-cerna-lisejnik' => 'Čierna s lišajníkom',
        'betonova-cihlova' => 'Tehlová',
        'betonova-hneda-mech' => 'Hnedá s machom',
        'betonova-tmava-mech' => 'Tmavohnedá s machom',
        'betonova-cerna' => 'Čierna s machom',
        'betonova-seda' => 'Sivá s machom',
        'bobrovka-cervena' => 'Červená',
        'bobrovka-hneda-stara' => 'Hnedá, stará',
        'bobrovka-seda' => 'Sivá',
        'sindel-sedy' => 'Sivý',
        'sindel-tmavy-mech' => 'Tmavý s machom',
        'bridlice-obdelnik' => 'Obdĺžniková',
        'bridlice-supina' => 'Šupinová',
        'bridlice-stara' => 'Sivá, stará',
        'bridlice-svetla' => 'Svetlosivá',
    ],

    'barva_krytiny' => [
        'cervena' => 'Tehlová',
        'antracit' => 'Antracit',
        'hneda' => 'Hnedá',
        'seda' => 'Sivá',
        'modroseda' => 'Modrosivá',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Hladká',
        'prkna' => 'Drevené dosky',
        'parkety' => 'Parkety, rybia kosť',
        'dlazba30' => 'Dlažba 30 × 30 cm',
        'dlazba60' => 'Dlažba 60 × 60 cm',
        'beton' => 'Betónová stierka',
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
        'bezna' => 'V úrovni podlažia',
        'zvysena' => 'Zvýšená',
        'snizena' => 'Znížená',
        'bez_podlahy' => 'Bez podlahy',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Celý dom je vybraný. Ťahaj za ktorúkoľvek stenu.',
        'planek_rucne' => 'Plán zatiaľ osaď ručne dvoma bodmi (panel Podklad).',
        'planek_nesrovnan' => 'Plán sa nepodarilo zarovnať so spodným podlažím automaticky. Osaď ho dvoma bodmi (panel Podklad).',
        'planek_srovnan' => 'Plán zarovnaný so spodným podlažím (:rohu). Doladiť sa dá dvoma bodmi v paneli Podklad.',
        'shodnych_rohu' => 'one=:pocet zhodný roh|few=:pocet zhodné rohy|many=:pocet zhodného rohu|other=:pocet zhodných rohov',
        'body_blizko' => 'Body sú príliš blízko seba.',
        'planek_meritko' => 'Plán osadený, ale mierky sa líšia o :procent %. Skontroluj kalibráciu výkresu.',
        'planek_usazen' => 'Plán osadený na spodné podlažie.',
        'pribyla_nosna' => 'Do podlažia :nazev pribudla nosná stena.',
        'schody_bez_podlazi' => 'Schodisko vedie do podlažia nad aktívnym. Najprv pridaj vyššie podlažie.',
        'schody_odstraneny' => 'Schody k tejto podlahe boli odstránené.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Klikni na prvý bod na pláne (roh domu alebo schodiska).',
        'tentyz_bod' => 'Klikni na to isté miesto v spodnom podlaží.',
        'druhy_bod' => 'Klikni na druhý bod na pláne, čo najďalej od prvého.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Nové podlažie :nazev',
        'smazani_podlazi' => 'Zmazanie podlažia :nazev',
        'podlazi' => 'Podlažie :nazev',
        'vyska_domu' => 'Výška domu',
        'usazeni_planku' => 'Osadenie plánu',
        'podpera' => 'Podpera do :nazev',
        'uroven_podlahy' => 'Úroveň podlahy',
        'prenos_vysky' => 'Prenos výšky',
        'schodiste' => 'Schodisko',
        'schody_mezi_urovnemi' => 'Schody medzi úrovňami',
        'smazani_schodiste' => 'Zmazanie schodiska',
        'posun_schodiste' => 'Posun schodiska',
        'otoceni_schodiste' => 'Otočenie schodiska',
        'sloup' => 'Stĺp',
        'posun_sloupu' => 'Posun stĺpa',
        'otoceni_sloupu' => 'Otočenie stĺpa',
        'smazani_sloupu' => 'Zmazanie stĺpa',
        'smazani_strechy' => 'Zmazanie strechy',
        'barva_domu' => 'Farba domu',
        'zaklady' => 'Základy',
        'nova_sestava' => 'Nová nábytková zostava',
        'sestava' => 'Nábytková zostava',
        'smazani_sestavy' => 'Zmazanie nábytkovej zostavy',
        'delka_sestavy' => 'Dĺžka nábytkovej zostavy',
        'presun_skrinky' => 'Presun skrinky',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Schody',
        'sloup' => 'Stĺp',
        'sestava' => ':nazev, :povrch',
        'podlaha' => 'Podlaha, :nazev',
        'mistnost' => 'miestnosť',
        'fasada' => 'Fasáda',
        'okna_venku' => 'Okná vonku',
        'okna_uvnitr' => 'Okná vnútri',
        'dvere_venku' => 'Vchodové dvere vonku',
        'dvere_uvnitr' => 'Vchodové dvere vnútri',
        'dvere_vnitrni' => 'Vnútorné dvere',
        'vrata_venku' => 'Brány vonku',
        'vrata_uvnitr' => 'Brány vnútri',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'cca :objem m³',
        'vykop' => ':objem výkop',
        'chybi_vykop' => 'chýba základ, :objem výkop',
        'chybi' => 'chýba základ',
        'chybi_upozorneni' => 'Chýba základ: :seznam. Dom tu nedosahuje na terén, preto sa tu nekope. Základ dotiahne voľba Predĺžiť základ k zemi.',
        'nad_terenem' => 'Základ vystupuje nad terén až o :vyska m.',
        'teren_rovina' => 'Terén: rovina, výškové dáta nie sú k dispozícii.',
        'teren_vyska' => 'Terén pod domom: :vyska m n. m. (podľa výškových dát)',
        'vykopek_chybi' => 'Výkopok chýba',
        'vykopek_navic' => 'Výkopok navyše',
        'ornice_chybi' => 'Ornica chýba',
        'ornice_navic' => 'Ornica navyše',
    ],
];
