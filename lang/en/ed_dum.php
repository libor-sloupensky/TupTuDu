<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Obecné, používá se na víc místech
    'strecha' => 'Roof',
    'strecha_nastavit' => 'set up',
    'hrana_strechy' => 'Roof edge',
    'sloup' => 'Column',
    'smazat_podlazi_potvrzeni' => 'Delete storey :nazev and everything drawn on it?',
    'schody_mezi_urovnemi' => 'between levels, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm from :podlazi',
    'podlazi_niz' => 'the storey below',
    'schody_dolu' => '↓ down',
    'stit' => 'gable',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Clay tile',
        'betonova' => 'Concrete tile',
        'bobrovka' => 'Plain tile',
        'sindel' => 'Asphalt shingle',
        'bridlice' => 'Slate',
        'falc' => 'Standing seam metal',
        'trapez' => 'Trapezoidal sheet',
        'vlnity' => 'Corrugated sheet',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Red',
        'taska-zvetrala' => 'Red, weathered',
        'taska-lisejnik' => 'Red with lichen',
        'taska-oranzova' => 'Orange',
        'taska-hneda-stara' => 'Brown, aged',
        'taska-cerna' => 'Black',
        'taska-cerna-lisejnik' => 'Black with lichen',
        'betonova-cihlova' => 'Brick red',
        'betonova-hneda-mech' => 'Brown with moss',
        'betonova-tmava-mech' => 'Dark brown with moss',
        'betonova-cerna' => 'Black with moss',
        'betonova-seda' => 'Grey with moss',
        'bobrovka-cervena' => 'Red',
        'bobrovka-hneda-stara' => 'Brown, aged',
        'bobrovka-seda' => 'Grey',
        'sindel-sedy' => 'Grey',
        'sindel-tmavy-mech' => 'Dark with moss',
        'bridlice-obdelnik' => 'Rectangular',
        'bridlice-supina' => 'Fish scale',
        'bridlice-stara' => 'Grey, aged',
        'bridlice-svetla' => 'Light grey',
    ],

    'barva_krytiny' => [
        'cervena' => 'Brick red',
        'antracit' => 'Anthracite',
        'hneda' => 'Brown',
        'seda' => 'Grey',
        'modroseda' => 'Blue-grey',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Plain',
        'prkna' => 'Wooden boards',
        'parkety' => 'Parquet, herringbone',
        'dlazba30' => 'Tiles 30 × 30 cm',
        'dlazba60' => 'Tiles 60 × 60 cm',
        'beton' => 'Concrete screed',
        'koberec' => 'Carpet',
    ],

    'typ_strechy' => [
        'sedlova' => 'Gable',
        'valbova' => 'Hipped',
        'pultova' => 'Mono-pitch',
        'plocha' => 'Flat',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'At storey level',
        'zvysena' => 'Raised',
        'snizena' => 'Lowered',
        'bez_podlahy' => 'No floor',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'The whole house is selected. Drag any wall.',
        'planek_rucne' => 'Align the plan by hand using two points for now (Underlay panel).',
        'planek_nesrovnan' => 'The plan could not be aligned with the storey below automatically. Align it using two points (Underlay panel).',
        'planek_srovnan' => 'Plan aligned with the storey below (:rohu). Fine-tune it using two points in the Underlay panel.',
        'shodnych_rohu' => 'one=:pocet matching corner|other=:pocet matching corners',
        'body_blizko' => 'The points are too close together.',
        'planek_meritko' => 'Plan aligned, but the scales differ by :procent %. Check the drawing calibration.',
        'planek_usazen' => 'Plan aligned with the storey below.',
        'pribyla_nosna' => 'A load-bearing wall was added to :nazev.',
        'schody_bez_podlazi' => 'Stairs lead to the storey above the active one. Add a higher storey first.',
        'schody_odstraneny' => 'The stairs to this floor were removed.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Click the first point on the plan (a corner of the house or the stairs).',
        'tentyz_bod' => 'Click the same place on the storey below.',
        'druhy_bod' => 'Click the second point on the plan, as far from the first as possible.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'New storey :nazev',
        'smazani_podlazi' => 'Delete storey :nazev',
        'podlazi' => 'Storey :nazev',
        'vyska_domu' => 'House height',
        'usazeni_planku' => 'Align plan',
        'podpera' => 'Support to :nazev',
        'uroven_podlahy' => 'Floor level',
        'prenos_vysky' => 'Height carry-over',
        'schodiste' => 'Stairs',
        'schody_mezi_urovnemi' => 'Stairs between levels',
        'smazani_schodiste' => 'Delete stairs',
        'posun_schodiste' => 'Move stairs',
        'otoceni_schodiste' => 'Rotate stairs',
        'sloup' => 'Column',
        'posun_sloupu' => 'Move column',
        'otoceni_sloupu' => 'Rotate column',
        'smazani_sloupu' => 'Delete column',
        'smazani_strechy' => 'Delete roof',
        'barva_domu' => 'House colour',
        'zaklady' => 'Foundations',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Stairs',
        'sloup' => 'Column',
        'podlaha' => 'Floor, :nazev',
        'mistnost' => 'room',
        'fasada' => 'Facade',
        'okna_venku' => 'Windows outside',
        'okna_uvnitr' => 'Windows inside',
        'dvere_venku' => 'Entrance doors outside',
        'dvere_uvnitr' => 'Entrance doors inside',
        'dvere_vnitrni' => 'Internal doors',
        'vrata_venku' => 'Garage doors outside',
        'vrata_uvnitr' => 'Garage doors inside',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => '~:objem m³',
        'vykop' => ':objem excavation',
        'chybi_vykop' => 'no foundation, :objem excavation',
        'chybi' => 'no foundation',
        'chybi_upozorneni' => 'No foundation: :seznam. The house does not reach the ground here, so nothing is dug. The Extend foundation to ground option brings it down.',
        'nad_terenem' => 'The foundation rises up to :vyska m above the ground.',
        'teren_rovina' => 'Ground: flat, elevation data not available.',
        'teren_vyska' => 'Ground under the house: :vyska m a.s.l. (from elevation data)',
        'vykopek_chybi' => 'Excavated soil short',
        'vykopek_navic' => 'Excavated soil surplus',
        'ornice_chybi' => 'Topsoil short',
        'ornice_navic' => 'Topsoil surplus',
    ],
];
