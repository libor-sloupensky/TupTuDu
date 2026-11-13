<?php

// Texty pro JavaScript — v prohlížeči přes preloz('skupina.klic'), viz partials/lokalizace-js.
// Posílá se celé na každou stránku s partialem → sem jen to, co JS opravdu potřebuje.
return [
    'obecne' => [
        'akce_selhala' => 'Aktion fehlgeschlagen:',
        'chyba_spojeni' => 'Verbindungsfehler. Bitte versuche es noch einmal.',
        'ulozeno' => 'Gespeichert',
    ],
    // Stejný koncept uložený jinde (koncept-k-ui.js, _konfliktUlozeni)
    'koncept' => [
        'konflikt_nadpis' => 'Das Projekt wurde inzwischen woanders geändert',
        'konflikt_text' => 'In einem anderen Tab oder auf einem anderen Gerät gibt es eine neuere Version dieses Projekts. Damit nichts überschrieben wird, ist das Speichern pausiert. Lade die aktuelle Version oder überschreibe sie mit dem, was du hier siehst.',
        'konflikt_nacist' => 'Aktuelle Version laden',
        'konflikt_prepsat' => 'Mit dieser Version überschreiben',
    ],
    // Limity tarifu v editoru (public/js/koncept-v3/limit-tarifu.js) — stejné texty jako tarify.php
    'tarify' => [
        'limit_uprav_nadpis' => 'Dein Tageslimit für Änderungen ist erreicht',
        'limit_uprav_text' => 'Im Tarif Gratis kannst du :limit Änderungen pro Tag machen – jede neue Wand, jede Verschiebung und jede Öffnung zählt. Ansehen kannst du weiterhin, bearbeiten erst morgen wieder. Mit einem Abo bearbeitest du ohne Limit.',
        'limit_projektu_nadpis' => 'Dein Tarif erlaubt kein weiteres Projekt',
        'limit_projektu_text' => 'Anzahl der Projekte in deinem Tarif: :limit. Ein höherer Tarif erlaubt mehr Projekte – oder lösche ein Projekt, das du nicht mehr brauchst.',
        'zbyva_uprav' => 'Heute noch :zbyva von :limit Änderungen',
        'zobrazit_predplatne' => 'Abo ansehen',
        'zavrit' => 'Schließen',
        'zkouska_tlacitko' => ':dni Tage kostenlos testen',
        'zkouska_popis' => 'Ohne Karte und ohne Verpflichtung. Unbegrenzt ändern, ein Projekt. Danach wechselt dein Konto automatisch zu Gratis.',
        'zkouska_nadpis' => 'Dein kostenloser Test läuft',
        'zkouska_chyba' => 'Der Test konnte nicht gestartet werden. Bitte versuche es noch einmal.',
    ],
];
