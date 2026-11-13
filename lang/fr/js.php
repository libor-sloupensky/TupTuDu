<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'L’action a échoué :',
        'chyba_spojeni' => 'Erreur de connexion. Merci de réessayer.',
        'ulozeno' => 'Enregistré',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Ce projet a changé ailleurs entre-temps',
        'konflikt_text' => 'Une version plus récente de ce projet existe dans un autre onglet ou sur un autre appareil. Pour éviter que les modifications s’écrasent, l’enregistrement est suspendu. Chargez la version actuelle ou remplacez-la par ce que vous voyez ici.',
        'konflikt_nacist' => 'Charger la version actuelle',
        'konflikt_prepsat' => 'Remplacer par cette version',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Vous avez atteint votre limite de modifications du jour',
        'limit_uprav_text' => 'Avec la formule Gratuit, vous pouvez faire :limit modifications par jour : chaque nouveau mur, déplacement ou ouverture compte. Vous pouvez continuer à consulter votre projet et le modifier de nouveau demain. Avec un abonnement, vous modifiez sans limite.',
        'limit_projektu_nadpis' => 'Votre formule ne permet pas de créer un projet de plus',
        'limit_projektu_text' => 'Nombre de projets dans votre formule : :limit. Une formule supérieure permet d’en avoir davantage. Vous pouvez aussi supprimer un projet dont vous n’avez plus besoin.',
        'zbyva_uprav' => 'Il vous reste :zbyva modifications sur :limit aujourd’hui',
        'zobrazit_predplatne' => 'Voir l’abonnement',
        'zavrit' => 'Fermer',
        'zkouska_tlacitko' => 'Essayer gratuitement pendant :dni jours',
        'zkouska_popis' => 'Sans carte ni engagement. Modifications illimitées, un projet. Ensuite, votre compte repasse automatiquement en Gratuit.',
        'zkouska_nadpis' => 'Votre essai gratuit a commencé',
        'zkouska_chyba' => 'Impossible d’activer l’essai. Veuillez réessayer.',
    ],
];
