<?php

// Editor V3, dům přes podlaží (public/js/koncept-v3/dum.js). Názvy podlaží (:nazev) generuje stavebni-engine.js.
return [
    // Nábytková sestava (sestavy.js)
    'sestava' => [
        'kuchyn' => 'Cuisine',
        'skrin' => 'Placard intégré',
    ],
    // Obecné, používá se na víc místech
    'strecha' => 'Toit',
    'strecha_nastavit' => 'régler',
    'hrana_strechy' => 'Bord du toit',
    'sloup' => 'Poteau',
    'smazat_podlazi_potvrzeni' => 'Supprimer le niveau :nazev et tout son dessin ?',
    'schody_mezi_urovnemi' => 'entre deux hauteurs de sol, :nazev',

    // Popisky na plátně
    'plocha_stitek' => ':vyska cm depuis :podlazi',
    'podlazi_niz' => 'le niveau inférieur',
    'schody_dolu' => '↓ descente',
    'stit' => 'pignon',

    // Typ krytiny, kód se ukládá do střechy
    'krytina' => [
        'taska' => 'Tuile terre cuite',
        'betonova' => 'Tuile béton',
        'bobrovka' => 'Tuile plate',
        'sindel' => 'Bardeau bitumé',
        'bridlice' => 'Ardoise',
        'falc' => 'Joint debout',
        'trapez' => 'Bac acier',
        'vlnity' => 'Tôle ondulée',
    ],

    // Vzhled krytiny z fotografie, kód se ukládá jako průměrná barva vzhledu (krytiny-3d.js)
    'vzhled_krytiny' => [
        'taska-cervena' => 'Rouge',
        'taska-zvetrala' => 'Rouge, patinée',
        'taska-lisejnik' => 'Rouge avec lichens',
        'taska-oranzova' => 'Orange',
        'taska-hneda-stara' => 'Brune, vieillie',
        'taska-cerna' => 'Noire',
        'taska-cerna-lisejnik' => 'Noire avec lichens',
        'betonova-cihlova' => 'Rouge brique',
        'betonova-hneda-mech' => 'Brune avec mousse',
        'betonova-tmava-mech' => 'Brun foncé avec mousse',
        'betonova-cerna' => 'Noire avec mousse',
        'betonova-seda' => 'Grise avec mousse',
        'bobrovka-cervena' => 'Rouge',
        'bobrovka-hneda-stara' => 'Brune, vieillie',
        'bobrovka-seda' => 'Grise',
        'sindel-sedy' => 'Gris',
        'sindel-tmavy-mech' => 'Sombre avec mousse',
        'bridlice-obdelnik' => 'Rectangulaire',
        'bridlice-supina' => 'En écailles',
        'bridlice-stara' => 'Grise, vieillie',
        'bridlice-svetla' => 'Gris clair',
    ],

    'barva_krytiny' => [
        'cervena' => 'Rouge brique',
        'antracit' => 'Anthracite',
        'hneda' => 'Brun',
        'seda' => 'Gris',
        'modroseda' => 'Gris-bleu',
    ],

    // Dekor podlahy, kód se ukládá do místnosti
    'dekor' => [
        'hladka' => 'Uni',
        'prkna' => 'Lames de bois',
        'parkety' => 'Parquet, bâtons rompus',
        'dlazba30' => 'Carrelage 30 × 30 cm',
        'dlazba60' => 'Carrelage 60 × 60 cm',
        'beton' => 'Béton ciré',
        'koberec' => 'Moquette',
    ],

    'typ_strechy' => [
        'sedlova' => 'Deux pans',
        'valbova' => 'Quatre pans',
        'pultova' => 'Monopente',
        'plocha' => 'Plat',
        // Jen nižší střecha nad částí podlaží bez patra
        'terasa' => 'Terrasse',
        'zadna' => 'Sans toit',
    ],

    // Nižší střecha nad částí podlaží, nad kterou už patro není (garáž, krytý vstup)
    'nizsi' => [
        'vyber' => 'Toit',
        'vyber_tip' => 'Le toit que vous modifiez. L’éditeur ajoute lui-même des toits plus bas au-dessus des parties d’un niveau sans étage au-dessus. Vous pouvez aussi les sélectionner d’un clic sur le plan.',
        'hlavni' => 'Principal',
        'cast' => 'partie basse',
        'cast_n' => 'partie basse :n',
        'typ_tip' => 'Le toit monopente monte vers le mur de l’étage. La terrasse est un toit plat accessible avec garde-corps ; sans toit, il ne reste que le plafond.',
        'vyska_okapu_tip' => 'Hauteur où le toit rencontre le nu du mur, mesurée depuis le sol de ce niveau. Par défaut, la hauteur sous plafond.',
        'krytina_auto' => 'Selon la pente : à partir de :sklon°, comme le toit principal (:krytina), en dessous, joint debout de la même couleur.',
        'podle_sklonu' => 'selon la pente',
        'podle_sklonu_tip' => 'La couverture et la couleur suivent de nouveau la pente et le toit principal',
        'pod_sklonem' => 'La pente est inférieure à la pente minimale de la couverture (:sklon°), risque d’infiltrations.',
        'terasa_info' => 'Dallage au niveau du sol de l’étage, garde-corps sur les bords extérieurs.',
        'zadna_info' => 'Seul le plafond reste au-dessus de cette partie.',
    ],

    // Úroveň podlahy místnosti
    'uroven_podlahy' => [
        'bezna' => 'Au niveau',
        'zvysena' => 'Surélevé',
        'snizena' => 'Abaissé',
        'bez_podlahy' => 'Sans sol',
    ],

    // Krátké hlášky nad plátnem
    'hlaska' => [
        'cely_dum_vybrany' => 'Toute la maison est sélectionnée. Faites glisser n’importe quel mur.',
        'planek_rucne' => 'Pour l’instant, calez le plan à la main avec deux points (panneau Fond de plan).',
        'planek_nesrovnan' => 'Le plan n’a pas pu être aligné automatiquement sur le niveau inférieur. Calez-le avec deux points (panneau Fond de plan).',
        'planek_srovnan' => 'Plan aligné sur le niveau inférieur (:rohu). Vous pouvez l’affiner avec deux points dans le panneau Fond de plan.',
        'shodnych_rohu' => 'one=:pocet angle correspondant|other=:pocet angles correspondants',
        'body_blizko' => 'Les points sont trop proches l’un de l’autre.',
        'planek_meritko' => 'Plan calé, mais les échelles diffèrent de :procent %. Vérifiez le calibrage du plan.',
        'planek_usazen' => 'Plan calé sur le niveau inférieur.',
        'pribyla_nosna' => 'Mur porteur ajouté au niveau :nazev.',
        'schody_bez_podlazi' => 'L’escalier mène au niveau situé au-dessus du niveau actif. Ajoutez d’abord un niveau supérieur.',
        'schody_odstraneny' => 'L’escalier menant à ce sol a été supprimé.',
    ],

    // Ruční usazení plánku dvěma body
    'lico' => [
        'prvni_bod' => 'Cliquez sur le premier point du plan (un angle de la maison ou de l’escalier).',
        'tentyz_bod' => 'Cliquez au même endroit sur le niveau inférieur.',
        'druhy_bod' => 'Cliquez sur le second point du plan, le plus loin possible du premier.',
    ],

    // Kroky v historii úprav
    'krok' => [
        'nove_podlazi' => 'Nouveau niveau :nazev',
        'smazani_podlazi' => 'Suppression du niveau :nazev',
        'podlazi' => 'Niveau :nazev',
        'vyska_domu' => 'Hauteur de la maison',
        'usazeni_planku' => 'Calage du plan',
        'podpera' => 'Appui au niveau :nazev',
        'uroven_podlahy' => 'Hauteur du sol',
        'prenos_vysky' => 'Report de hauteur',
        'schodiste' => 'Escalier',
        'schody_mezi_urovnemi' => 'Marches entre deux hauteurs de sol',
        'smazani_schodiste' => 'Suppression de l’escalier',
        'posun_schodiste' => 'Déplacement de l’escalier',
        'otoceni_schodiste' => 'Rotation de l’escalier',
        'sloup' => 'Poteau',
        'posun_sloupu' => 'Déplacement du poteau',
        'otoceni_sloupu' => 'Rotation du poteau',
        'smazani_sloupu' => 'Suppression du poteau',
        'smazani_strechy' => 'Suppression du toit',
        'nizsi_strecha' => 'Toit plus bas',
        'barva_domu' => 'Couleur de la maison',
        'zaklady' => 'Fondations',
        'nova_sestava' => 'Nouvel aménagement',
        'sestava' => 'Aménagement',
        'smazani_sestavy' => 'Suppression de l’aménagement',
        'delka_sestavy' => 'Longueur de l’aménagement',
        'presun_skrinky' => 'Déplacement d’un caisson',
    ],

    // Kde se barva v domě používá (nabídka použitých barev)
    'barvy' => [
        'schody' => 'Escalier',
        'sloup' => 'Poteau',
        'sestava' => ':nazev, :povrch',
        'podlaha' => 'Sol, :nazev',
        'mistnost' => 'pièce',
        'fasada' => 'Façade',
        'okna_venku' => 'Fenêtres, extérieur',
        'okna_uvnitr' => 'Fenêtres, intérieur',
        'dvere_venku' => 'Porte d’entrée, extérieur',
        'dvere_uvnitr' => 'Porte d’entrée, intérieur',
        'dvere_vnitrni' => 'Portes intérieures',
        'vrata_venku' => 'Porte de garage, extérieur',
        'vrata_uvnitr' => 'Porte de garage, intérieur',
    ],

    // Základy a zemina. :objem u výkopu už obsahuje text s jednotkou (klíč objem).
    'zaklady' => [
        'objem' => 'env. :objem m³',
        'vykop' => 'fouille :objem',
        'chybi_vykop' => 'sans fondation, fouille :objem',
        'chybi' => 'sans fondation',
        'chybi_upozorneni' => 'Fondation manquante : :seznam. La maison n’atteint pas le terrain à cet endroit, on n’y creuse donc pas. L’option « Prolonger la fondation au sol » la complète.',
        'nad_terenem' => 'La fondation dépasse le terrain de :vyska m au maximum.',
        'teren_rovina' => 'Terrain : plat, données d’altitude non disponibles.',
        'teren_vyska' => 'Terrain sous la maison : :vyska m d’altitude (d’après les données altimétriques)',
        'vykopek_chybi' => 'Déblais manquants',
        'vykopek_navic' => 'Déblais en surplus',
        'ornice_chybi' => 'Terre végétale manquante',
        'ornice_navic' => 'Terre végétale en surplus',
    ],
];
