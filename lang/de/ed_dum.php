<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Nábytková sestava (sestavy.js)
    'sestava' => [
        'kuchyn' => 'Küchenzeile',
        'skrin' => 'Einbauschrank',
    ],
    // Obecné, používá se na víc místech
    'strecha' => 'Dach',
    'strecha_nastavit' => 'einstellen',
    'hrana_strechy' => 'Dachkante',
    'sloup' => 'Säule',
    'smazat_podlazi_potvrzeni' => 'Geschoss :nazev samt Zeichnung löschen?',
    'schody_mezi_urovnemi' => 'zwischen Ebenen, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm aus :podlazi',
    'podlazi_niz' => 'Geschoss darunter',
    'schody_dolu' => '↓ runter',
    'stit' => 'Giebel',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Tondachziegel',
        'betonova' => 'Betondachstein',
        'bobrovka' => 'Biberschwanz',
        'sindel' => 'Bitumenschindel',
        'bridlice' => 'Schiefer',
        'falc' => 'Stehfalzblech',
        'trapez' => 'Trapezblech',
        'vlnity' => 'Wellblech',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Rot',
        'taska-zvetrala' => 'Rot, verwittert',
        'taska-lisejnik' => 'Rot mit Flechten',
        'taska-oranzova' => 'Orange',
        'taska-hneda-stara' => 'Braun, gealtert',
        'taska-cerna' => 'Schwarz',
        'taska-cerna-lisejnik' => 'Schwarz mit Flechten',
        'betonova-cihlova' => 'Ziegelrot',
        'betonova-hneda-mech' => 'Braun mit Moos',
        'betonova-tmava-mech' => 'Dunkelbraun mit Moos',
        'betonova-cerna' => 'Schwarz mit Moos',
        'betonova-seda' => 'Grau mit Moos',
        'bobrovka-cervena' => 'Rot',
        'bobrovka-hneda-stara' => 'Braun, gealtert',
        'bobrovka-seda' => 'Grau',
        'sindel-sedy' => 'Grau',
        'sindel-tmavy-mech' => 'Dunkel mit Moos',
        'bridlice-obdelnik' => 'Rechteckig',
        'bridlice-supina' => 'Schuppenform',
        'bridlice-stara' => 'Grau, gealtert',
        'bridlice-svetla' => 'Hellgrau',
    ],

    'barva_krytiny' => [
        'cervena' => 'Ziegelrot',
        'antracit' => 'Anthrazit',
        'hneda' => 'Braun',
        'seda' => 'Grau',
        'modroseda' => 'Blaugrau',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Glatt',
        'prkna' => 'Holzdielen',
        'parkety' => 'Fischgrätparkett',
        'dlazba30' => 'Fliesen 30 × 30 cm',
        'dlazba60' => 'Fliesen 60 × 60 cm',
        'beton' => 'Betonspachtel',
        'koberec' => 'Teppich',
    ],

    'typ_strechy' => [
        'sedlova' => 'Satteldach',
        'valbova' => 'Walmdach',
        'pultova' => 'Pultdach',
        'plocha' => 'Flachdach',
        // Jen nižší střecha nad částí podlaží bez patra
        'terasa' => 'Terrasse',
        'zadna' => 'Kein Dach',
    ],

    // Nižší střecha nad částí podlaží, nad kterou už patro není (garáž, krytý vstup)
    'nizsi' => [
        'vyber' => 'Dach',
        'vyber_tip' => 'Welches Dach du bearbeitest. Niedrigere Dächer fügt der Editor selbst über Teilen eines Geschosses hinzu, über denen kein weiteres Geschoss liegt. Du kannst sie auch per Klick im Grundriss wählen.',
        'hlavni' => 'Hauptdach',
        'cast' => 'niedrigerer Teil',
        'cast_n' => 'niedrigerer Teil :n',
        'typ_tip' => 'Das Pultdach steigt zur Wand des Obergeschosses an. Die Terrasse ist ein begehbares Flachdach mit Geländer, ohne Dach bleibt nur die Decke.',
        'vyska_okapu_tip' => 'Höhe, in der das Dach die Wandfläche schneidet, gemessen vom Boden dieses Geschosses. Standard ist die Deckenhöhe.',
        'krytina_auto' => 'Nach Neigung: ab :sklon° wie das Hauptdach (:krytina), bei geringerer Neigung Stehfalzblech in dessen Farbe.',
        'podle_sklonu' => 'nach Neigung',
        'podle_sklonu_tip' => 'Eindeckung und Farbe richten sich wieder nach Neigung und Hauptdach',
        'pod_sklonem' => 'Die Neigung liegt unter der Regeldachneigung der Eindeckung von :sklon°, es kann Wasser eindringen.',
        'terasa_info' => 'Plattenbelag auf Höhe des Bodens im Obergeschoss, Geländer an den Außenkanten.',
        'zadna_info' => 'Über diesem Teil bleibt nur die Decke.',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'Auf Geschossniveau',
        'zvysena' => 'Erhöht',
        'snizena' => 'Abgesenkt',
        'bez_podlahy' => 'Kein Boden',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Das ganze Haus ist ausgewählt. Ziehe an einer beliebigen Wand.',
        'planek_rucne' => 'Richte den Plan vorerst von Hand mit zwei Punkten aus (Panel Vorlage).',
        'planek_nesrovnan' => 'Der Plan ließ sich nicht automatisch am unteren Geschoss ausrichten. Richte ihn mit zwei Punkten aus (Panel Vorlage).',
        'planek_srovnan' => 'Plan am unteren Geschoss ausgerichtet (:rohu). Feinjustieren kannst du mit zwei Punkten im Panel Vorlage.',
        'shodnych_rohu' => 'one=:pocet passende Ecke|other=:pocet passende Ecken',
        'body_blizko' => 'Die Punkte liegen zu nah beieinander.',
        'planek_meritko' => 'Plan ausgerichtet, aber die Maßstäbe weichen um :procent % ab. Prüfe die Kalibrierung des Plans.',
        'planek_usazen' => 'Plan am unteren Geschoss ausgerichtet.',
        'pribyla_nosna' => 'In :nazev wurde eine tragende Wand ergänzt.',
        'schody_bez_podlazi' => 'Die Treppe führt ins Geschoss über dem aktiven. Füge zuerst ein höheres Geschoss hinzu.',
        'schody_odstraneny' => 'Die Treppe zu dieser Bodenfläche wurde entfernt.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Klicke auf den ersten Punkt im Plan (Haus- oder Treppenecke).',
        'tentyz_bod' => 'Klicke auf dieselbe Stelle im unteren Geschoss.',
        'druhy_bod' => 'Klicke auf den zweiten Punkt im Plan, möglichst weit vom ersten entfernt.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Neues Geschoss :nazev',
        'smazani_podlazi' => 'Geschoss :nazev gelöscht',
        'podlazi' => 'Geschoss :nazev',
        'vyska_domu' => 'Haushöhe',
        'usazeni_planku' => 'Plan ausgerichtet',
        'podpera' => 'Stütze in :nazev',
        'uroven_podlahy' => 'Bodenhöhe',
        'prenos_vysky' => 'Höhenübertragung',
        'schodiste' => 'Treppe',
        'schody_mezi_urovnemi' => 'Treppe zwischen Ebenen',
        'smazani_schodiste' => 'Treppe gelöscht',
        'posun_schodiste' => 'Treppe verschoben',
        'otoceni_schodiste' => 'Treppe gedreht',
        'sloup' => 'Säule',
        'posun_sloupu' => 'Säule verschoben',
        'otoceni_sloupu' => 'Säule gedreht',
        'smazani_sloupu' => 'Säule gelöscht',
        'smazani_strechy' => 'Dach gelöscht',
        'nizsi_strecha' => 'Niedrigeres Dach',
        'barva_domu' => 'Hausfarbe',
        'zaklady' => 'Fundament',
        'nova_sestava' => 'Neue Einbaumöbel',
        'sestava' => 'Einbaumöbel',
        'smazani_sestavy' => 'Einbaumöbel löschen',
        'delka_sestavy' => 'Länge der Einbaumöbel',
        'presun_skrinky' => 'Schrank verschieben',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Treppe',
        'sloup' => 'Säule',
        'sestava' => ':nazev, :povrch',
        'podlaha' => 'Boden, :nazev',
        'mistnost' => 'Raum',
        'fasada' => 'Fassade',
        'okna_venku' => 'Fenster außen',
        'okna_uvnitr' => 'Fenster innen',
        'dvere_venku' => 'Haustüren außen',
        'dvere_uvnitr' => 'Haustüren innen',
        'dvere_vnitrni' => 'Innentüren',
        'vrata_venku' => 'Tore außen',
        'vrata_uvnitr' => 'Tore innen',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'ca. :objem m³',
        'vykop' => ':objem Aushub',
        'chybi_vykop' => 'kein Fundament, :objem Aushub',
        'chybi' => 'kein Fundament',
        'chybi_upozorneni' => 'Kein Fundament: :seznam. Das Haus reicht hier nicht bis zum Gelände, deshalb wird hier nicht gegraben. Die Option „Fundament bis zum Gelände“ führt es bis nach unten.',
        'nad_terenem' => 'Das Fundament ragt bis zu :vyska m über das Gelände.',
        'teren_rovina' => 'Gelände: eben, Höhendaten sind nicht verfügbar.',
        'teren_vyska' => 'Gelände unter dem Haus: :vyska m ü. M. (laut Höhendaten)',
        'vykopek_chybi' => 'Aushub fehlt',
        'vykopek_navic' => 'Aushub übrig',
        'ornice_chybi' => 'Oberboden fehlt',
        'ornice_navic' => 'Oberboden übrig',
    ],
];
