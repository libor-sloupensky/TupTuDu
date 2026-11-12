<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Nábytková sestava (sestavy.js)
    'sestava' => [
        'kuchyn' => 'Cocina',
        'skrin' => 'Armario empotrado',
    ],
    // Obecné, používá se na víc místech
    'strecha' => 'Cubierta',
    'strecha_nastavit' => 'ajustar',
    'hrana_strechy' => 'Borde de cubierta',
    'sloup' => 'Pilar',
    'smazat_podlazi_potvrzeni' => '¿Borrar la planta :nazev y todo su dibujo?',
    'schody_mezi_urovnemi' => 'entre niveles, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm desde :podlazi',
    'podlazi_niz' => 'planta inferior',
    'schody_dolu' => '↓ abajo',
    'stit' => 'hastial',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Teja cerámica',
        'betonova' => 'Teja de hormigón',
        'bobrovka' => 'Teja plana',
        'sindel' => 'Teja asfáltica',
        'bridlice' => 'Pizarra',
        'falc' => 'Chapa de junta alzada',
        'trapez' => 'Chapa grecada',
        'vlnity' => 'Chapa ondulada',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Roja',
        'taska-zvetrala' => 'Roja, envejecida',
        'taska-lisejnik' => 'Roja con líquenes',
        'taska-oranzova' => 'Naranja',
        'taska-hneda-stara' => 'Marrón, envejecida',
        'taska-cerna' => 'Negra',
        'taska-cerna-lisejnik' => 'Negra con líquenes',
        'betonova-cihlova' => 'Rojo ladrillo',
        'betonova-hneda-mech' => 'Marrón con musgo',
        'betonova-tmava-mech' => 'Marrón oscuro con musgo',
        'betonova-cerna' => 'Negra con musgo',
        'betonova-seda' => 'Gris con musgo',
        'bobrovka-cervena' => 'Roja',
        'bobrovka-hneda-stara' => 'Marrón, envejecida',
        'bobrovka-seda' => 'Gris',
        'sindel-sedy' => 'Gris',
        'sindel-tmavy-mech' => 'Oscura con musgo',
        'bridlice-obdelnik' => 'Rectangular',
        'bridlice-supina' => 'En escamas',
        'bridlice-stara' => 'Gris, envejecida',
        'bridlice-svetla' => 'Gris claro',
    ],

    'barva_krytiny' => [
        'cervena' => 'Rojo teja',
        'antracit' => 'Antracita',
        'hneda' => 'Marrón',
        'seda' => 'Gris',
        'modroseda' => 'Gris azulado',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Liso',
        'prkna' => 'Tarima de madera',
        'parkety' => 'Parqué en espiga',
        'dlazba30' => 'Baldosa 30 × 30 cm',
        'dlazba60' => 'Baldosa 60 × 60 cm',
        'beton' => 'Microcemento',
        'koberec' => 'Moqueta',
    ],

    'typ_strechy' => [
        'sedlova' => 'A dos aguas',
        'valbova' => 'A cuatro aguas',
        'pultova' => 'A un agua',
        'plocha' => 'Plana',
        // Jen nižší střecha nad částí podlaží bez patra
        'terasa' => 'Terraza',
        'zadna' => 'Sin cubierta',
    ],

    // Nižší střecha nad částí podlaží, nad kterou už patro není (garáž, krytý vstup)
    'nizsi' => [
        'vyber' => 'Cubierta',
        'vyber_tip' => 'Qué cubierta estás editando. El editor añade por sí solo cubiertas más bajas sobre las partes de una planta que no tienen otra planta encima. También puedes elegirlas haciendo clic en el plano.',
        'hlavni' => 'Principal',
        'cast' => 'parte baja',
        'cast_n' => 'parte baja :n',
        'typ_tip' => 'La de un agua sube hacia la pared de la planta superior. La terraza es una cubierta plana transitable con barandilla; sin cubierta solo queda el forjado.',
        'vyska_okapu_tip' => 'Altura a la que la cubierta corta la cara de la pared, medida desde el suelo de esta planta. Por defecto es la altura del techo.',
        'krytina_auto' => 'Según la pendiente: desde :sklon° como la cubierta principal (:krytina); con menos pendiente, chapa de junta alzada en su color.',
        'podle_sklonu' => 'según la pendiente',
        'podle_sklonu_tip' => 'La cobertura y el color vuelven a depender de la pendiente y de la cubierta principal',
        'pod_sklonem' => 'La pendiente es inferior a la mínima segura de esta cobertura (:sklon°), puede haber filtraciones.',
        'terasa_info' => 'Solado a la altura del suelo de la planta superior, barandilla en los bordes exteriores.',
        'zadna_info' => 'Sobre esta parte solo queda el forjado.',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'A nivel de planta',
        'zvysena' => 'Elevado',
        'snizena' => 'Rebajado',
        'bez_podlahy' => 'Sin suelo',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Toda la casa está seleccionada. Arrastra cualquier pared.',
        'planek_rucne' => 'De momento, alinea el plano a mano con dos puntos (panel Base).',
        'planek_nesrovnan' => 'No se ha podido alinear el plano con la planta inferior automáticamente. Alinéalo con dos puntos (panel Base).',
        'planek_srovnan' => 'Plano alineado con la planta inferior (:rohu). Puedes afinarlo con dos puntos en el panel Base.',
        'shodnych_rohu' => 'one=:pocet esquina coincidente|other=:pocet esquinas coincidentes',
        'body_blizko' => 'Los puntos están demasiado cerca.',
        'planek_meritko' => 'Plano alineado, pero las escalas difieren un :procent %. Comprueba la calibración del plano.',
        'planek_usazen' => 'Plano alineado con la planta inferior.',
        'pribyla_nosna' => 'Se ha añadido una pared de carga en la planta :nazev.',
        'schody_bez_podlazi' => 'La escalera lleva a la planta sobre la activa. Añade primero una planta superior.',
        'schody_odstraneny' => 'Se han quitado los escalones hasta este suelo.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Haz clic en el primer punto del plano (una esquina de la casa o de la escalera).',
        'tentyz_bod' => 'Haz clic en el mismo sitio de la planta inferior.',
        'druhy_bod' => 'Haz clic en el segundo punto del plano, lo más lejos posible del primero.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Planta nueva :nazev',
        'smazani_podlazi' => 'Borrar planta :nazev',
        'podlazi' => 'Planta :nazev',
        'vyska_domu' => 'Altura de la casa',
        'usazeni_planku' => 'Alinear plano',
        'podpera' => 'Apoyo en :nazev',
        'uroven_podlahy' => 'Nivel del suelo',
        'prenos_vysky' => 'Traslado de altura',
        'schodiste' => 'Escalera',
        'schody_mezi_urovnemi' => 'Escalones entre niveles',
        'smazani_schodiste' => 'Borrar escalera',
        'posun_schodiste' => 'Mover escalera',
        'otoceni_schodiste' => 'Girar escalera',
        'sloup' => 'Pilar',
        'posun_sloupu' => 'Mover pilar',
        'otoceni_sloupu' => 'Girar pilar',
        'smazani_sloupu' => 'Eliminar pilar',
        'smazani_strechy' => 'Borrar cubierta',
        'nizsi_strecha' => 'Cubierta más baja',
        'barva_domu' => 'Color de la casa',
        'zaklady' => 'Cimentación',
        'nova_sestava' => 'Nuevo mobiliario a medida',
        'sestava' => 'Mobiliario a medida',
        'smazani_sestavy' => 'Borrar mobiliario a medida',
        'delka_sestavy' => 'Longitud del mobiliario a medida',
        'presun_skrinky' => 'Mover módulo',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Escalera',
        'sloup' => 'Pilar',
        'sestava' => ':nazev, :povrch',
        'podlaha' => 'Suelo, :nazev',
        'mistnost' => 'estancia',
        'fasada' => 'Fachada',
        'okna_venku' => 'Ventanas por fuera',
        'okna_uvnitr' => 'Ventanas por dentro',
        'dvere_venku' => 'Puertas de entrada por fuera',
        'dvere_uvnitr' => 'Puertas de entrada por dentro',
        'dvere_vnitrni' => 'Puertas interiores',
        'vrata_venku' => 'Puertas de garaje por fuera',
        'vrata_uvnitr' => 'Puertas de garaje por dentro',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => '~:objem m³',
        'vykop' => ':objem de excavación',
        'chybi_vykop' => 'sin cimentación, :objem de excavación',
        'chybi' => 'sin cimentación',
        'chybi_upozorneni' => 'Sin cimentación: :seznam. Aquí la casa no llega al terreno, por eso no se excava. La opción Prolongar cimiento al suelo lo completa.',
        'nad_terenem' => 'El cimiento sobresale del terreno hasta :vyska m.',
        'teren_rovina' => 'Terreno: llano, sin datos de altitud disponibles.',
        'teren_vyska' => 'Terreno bajo la casa: :vyska m s. n. m. (según datos de altitud)',
        'vykopek_chybi' => 'Falta tierra excavada',
        'vykopek_navic' => 'Sobra tierra excavada',
        'ornice_chybi' => 'Falta tierra vegetal',
        'ornice_navic' => 'Sobra tierra vegetal',
    ],
];
