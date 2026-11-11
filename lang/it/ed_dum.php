<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Obecné, používá se na víc místech
    'strecha' => 'Tetto',
    'strecha_nastavit' => 'imposta',
    'hrana_strechy' => 'Bordo del tetto',
    'sloup' => 'Colonna',
    'smazat_podlazi_potvrzeni' => 'Eliminare il piano :nazev con il suo disegno?',
    'schody_mezi_urovnemi' => 'tra i livelli, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm da :podlazi',
    'podlazi_niz' => 'piano inferiore',
    'schody_dolu' => '↓ giù',
    'stit' => 'timpano',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Tegola in cotto',
        'betonova' => 'Tegola in cemento',
        'bobrovka' => 'Tegola piana',
        'sindel' => 'Tegola canadese',
        'bridlice' => 'Ardesia',
        'falc' => 'Lamiera aggraffata',
        'trapez' => 'Lamiera grecata',
        'vlnity' => 'Lamiera ondulata',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Rossa',
        'taska-zvetrala' => 'Rossa, invecchiata',
        'taska-lisejnik' => 'Rossa con licheni',
        'taska-oranzova' => 'Arancione',
        'taska-hneda-stara' => 'Marrone, invecchiata',
        'taska-cerna' => 'Nera',
        'taska-cerna-lisejnik' => 'Nera con licheni',
        'betonova-cihlova' => 'Rosso mattone',
        'betonova-hneda-mech' => 'Marrone con muschio',
        'betonova-tmava-mech' => 'Marrone scuro con muschio',
        'betonova-cerna' => 'Nera con muschio',
        'betonova-seda' => 'Grigia con muschio',
        'bobrovka-cervena' => 'Rossa',
        'bobrovka-hneda-stara' => 'Marrone, invecchiata',
        'bobrovka-seda' => 'Grigia',
        'sindel-sedy' => 'Grigia',
        'sindel-tmavy-mech' => 'Scura con muschio',
        'bridlice-obdelnik' => 'Rettangolare',
        'bridlice-supina' => 'A scaglie',
        'bridlice-stara' => 'Grigia, invecchiata',
        'bridlice-svetla' => 'Grigio chiaro',
    ],

    'barva_krytiny' => [
        'cervena' => 'Rosso mattone',
        'antracit' => 'Antracite',
        'hneda' => 'Marrone',
        'seda' => 'Grigio',
        'modroseda' => 'Grigio-blu',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Liscia',
        'prkna' => 'Assi di legno',
        'parkety' => 'Parquet a spina di pesce',
        'dlazba30' => 'Piastrelle 30 × 30 cm',
        'dlazba60' => 'Piastrelle 60 × 60 cm',
        'beton' => 'Cemento spatolato',
        'koberec' => 'Moquette',
    ],

    'typ_strechy' => [
        'sedlova' => 'A due falde',
        'valbova' => 'A padiglione',
        'pultova' => 'A una falda',
        'plocha' => 'Piano',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'Al livello del piano',
        'zvysena' => 'Rialzato',
        'snizena' => 'Ribassato',
        'bez_podlahy' => 'Senza pavimento',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Tutta la casa è selezionata. Trascina una parete qualsiasi.',
        'planek_rucne' => 'Per ora allinea la pianta a mano con due punti (pannello Base).',
        'planek_nesrovnan' => 'Non è stato possibile allineare automaticamente la pianta al piano inferiore. Allineala con due punti (pannello Base).',
        'planek_srovnan' => 'Pianta allineata al piano inferiore (:rohu). Puoi rifinirla con due punti nel pannello Base.',
        'shodnych_rohu' => 'one=:pocet angolo corrispondente|other=:pocet angoli corrispondenti',
        'body_blizko' => 'I punti sono troppo vicini tra loro.',
        'planek_meritko' => 'Pianta allineata, ma le scale differiscono del :procent %. Controlla la calibrazione del disegno.',
        'planek_usazen' => 'Pianta allineata al piano inferiore.',
        'pribyla_nosna' => 'Al piano :nazev è stata aggiunta una parete portante.',
        'schody_bez_podlazi' => 'La scala porta al piano sopra quello attivo. Aggiungi prima un piano superiore.',
        'schody_odstraneny' => 'La scala verso questo pavimento è stata rimossa.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Clicca sul primo punto della pianta (angolo della casa o della scala).',
        'tentyz_bod' => 'Clicca sullo stesso punto al piano inferiore.',
        'druhy_bod' => 'Clicca sul secondo punto della pianta, il più lontano possibile dal primo.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Nuovo piano :nazev',
        'smazani_podlazi' => 'Eliminazione piano :nazev',
        'podlazi' => 'Piano :nazev',
        'vyska_domu' => 'Altezza casa',
        'usazeni_planku' => 'Allineamento pianta',
        'podpera' => 'Appoggio a :nazev',
        'uroven_podlahy' => 'Livello pavimento',
        'prenos_vysky' => 'Riporto altezza',
        'schodiste' => 'Scala',
        'schody_mezi_urovnemi' => 'Scala tra livelli',
        'smazani_schodiste' => 'Eliminazione scala',
        'posun_schodiste' => 'Spostamento scala',
        'otoceni_schodiste' => 'Rotazione scala',
        'sloup' => 'Colonna',
        'posun_sloupu' => 'Spostamento colonna',
        'otoceni_sloupu' => 'Rotazione colonna',
        'smazani_sloupu' => 'Eliminazione colonna',
        'smazani_strechy' => 'Eliminazione tetto',
        'barva_domu' => 'Colore casa',
        'zaklady' => 'Fondazioni',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Scale',
        'sloup' => 'Colonna',
        'podlaha' => 'Pavimento, :nazev',
        'mistnost' => 'stanza',
        'fasada' => 'Facciata',
        'okna_venku' => 'Finestre, esterno',
        'okna_uvnitr' => 'Finestre, interno',
        'dvere_venku' => 'Porte d’ingresso, esterno',
        'dvere_uvnitr' => 'Porte d’ingresso, interno',
        'dvere_vnitrni' => 'Porte interne',
        'vrata_venku' => 'Portoni, esterno',
        'vrata_uvnitr' => 'Portoni, interno',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'circa :objem m³',
        'vykop' => ':objem di scavo',
        'chybi_vykop' => 'manca la fondazione, :objem di scavo',
        'chybi' => 'manca la fondazione',
        'chybi_upozorneni' => 'Manca la fondazione: :seznam. Qui la casa non arriva al terreno, perciò non si scava. L’opzione Prolunga fondazione a terra la completa.',
        'nad_terenem' => 'La fondazione sporge dal terreno fino a :vyska m.',
        'teren_rovina' => 'Terreno: pianeggiante, dati altimetrici non disponibili.',
        'teren_vyska' => 'Terreno sotto la casa: :vyska m s.l.m. (dai dati altimetrici)',
        'vykopek_chybi' => 'Terra di scavo mancante',
        'vykopek_navic' => 'Terra di scavo in eccesso',
        'ornice_chybi' => 'Terra vegetale mancante',
        'ornice_navic' => 'Terra vegetale in eccesso',
    ],
];
