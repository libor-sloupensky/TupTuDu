<?php

// E-maily zákazníkům (App\Notifications\*).
return [
    'pozdrav' => 'Hallo,',
    'podpis' => 'Dein TupTuDu-Team',
    'overeni_predmet' => 'Bestätige deine E-Mail-Adresse – TupTuDu',
    'overeni_text' => 'danke für deine Registrierung bei TupTuDu. Bitte bestätige zum Abschluss deine E-Mail-Adresse.',
    'overeni_tlacitko' => 'E-Mail-Adresse bestätigen',
    'overeni_nezadal' => 'Falls du dich nicht registriert hast, kannst du diese Nachricht ignorieren.',
    'heslo_predmet' => 'Neues Passwort festlegen – TupTuDu',
    'heslo_text' => 'wir haben eine Anfrage erhalten, für dein Konto ein neues Passwort festzulegen.',
    'heslo_tlacitko' => 'Neues Passwort festlegen',
    'heslo_platnost' => 'Der Link ist :minut Minuten gültig.',
    'heslo_nezadal' => 'Falls die Anfrage nicht von dir stammt, musst du nichts tun.',
    // Zkouška zdarma končí (App\Notifications\ZkouskaKonci, 2 dny před koncem)
    'zkouska_konci_predmet' => 'Dein kostenloser Test endet am :datum — TupTuDu',
    'zkouska_konci_text' => 'dein kostenloser Test des Tarifs Home endet am :datum.',
    'zkouska_konci_potom' => 'Danach wechselt dein Konto automatisch zu Gratis. Es wird nichts berechnet und deine Projekte bleiben – du kannst dann nur wieder :limit Änderungen pro Tag machen.',
    'zkouska_konci_cena' => 'Wenn du weiter ohne Limit zeichnen möchtest, kostet Home :mesic im Monat oder :rok im Jahr und erlaubt bis zu :projektu Projekte.',
    'zkouska_konci_tlacitko' => 'Mit Home weitermachen',
    'zkouska_konci_nic' => 'Wenn du nicht weitermachen möchtest, musst du nichts tun.',
];
