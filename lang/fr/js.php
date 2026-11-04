<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'chyba_spojeni' => 'Erreur de connexion. Merci de réessayer.',
        'ulozeno' => 'Enregistré',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Ce projet a changé ailleurs entre-temps',
        'konflikt_text' => 'Une version plus récente de ce projet existe dans un autre onglet ou sur un autre appareil. Pour éviter que les modifications s’écrasent, l’enregistrement est suspendu. Charge la version actuelle ou remplace-la par ce que tu vois ici.',
        'konflikt_nacist' => 'Charger la version actuelle',
        'konflikt_prepsat' => 'Remplacer par cette version',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Tu as atteint ta limite de modifications du jour',
        'limit_uprav_text' => 'Avec la formule Gratuit, tu peux faire :limit modifications par jour : chaque nouveau mur, déplacement ou ouverture compte. Tu peux continuer à consulter ton projet et le modifier de nouveau demain. Avec un abonnement, tu modifies sans limite.',
        'limit_projektu_nadpis' => 'Ta formule ne permet pas de créer un projet de plus',
        'limit_projektu_text' => 'Nombre de projets dans ta formule : :limit. Une formule supérieure permet d’en avoir davantage. Tu peux aussi supprimer un projet dont tu n’as plus besoin.',
        'zbyva_uprav' => 'Il te reste :zbyva modifications sur :limit aujourd’hui',
        'zobrazit_predplatne' => 'Voir l’abonnement',
        'zavrit' => 'Fermer',
    ],
];
