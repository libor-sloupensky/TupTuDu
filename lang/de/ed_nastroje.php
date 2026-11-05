<?php

// Editor V3, nástroje kolem kresby: průvodce importem výkresu (import-pudorysu.js, import-prohlizec.js),
// katalog (katalog.js), export a sdílení (export-sdileni.js) a hlášky serveru
// (KonceptV3Controller, KonceptV3PodkladController, KonceptV3SdileniController, Katastr\Dmr5gService).
// Do JS jde přes ttSkupiny v koncept-v3.blade.php → preloz('ed_nastroje.klic').
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Plan',
        'krok_strana' => 'Seite',
        'krok_meritko' => 'Maßstab',
        'krok_obrys' => 'Hausumriss',
        'krok_steny' => 'Wände',
        'pokyn_soubor' => 'Wähle einen Grundrissplan aus oder nimm einen früher hochgeladenen.',
        'pokyn_strana' => 'Wähle die Seite mit dem Grundriss.',
        'pokyn_meritko' => 'Miss im Plan ein bekanntes Maß – klicke auf zwei Punkte und gib ihren echten Abstand ein.',
        'pokyn_obrys' => 'Zeichne die Außenkante der Außenwände nach – klicke in die Hausecken.',
        'pokyn_steny' => 'Wähle die Variante, die am besten zu den Wänden passt.',
        'jen_formaty' => 'Unterstützt werden nur PDF-, PNG- und JPG-Dateien.',
        'nahrani_selhalo' => 'Die Datei konnte nicht hochgeladen werden.',
        'nahrani_selhalo_chyba' => 'Die Datei konnte nicht hochgeladen werden: :chyba',
        'strana_selhala' => 'Die Seite konnte nicht vorbereitet werden.',
        'strana_selhala_chyba' => 'Die Seite konnte nicht vorbereitet werden: :chyba',
        'nejdriv_zmer' => 'Miss zuerst ein bekanntes Maß.',
        'nejdriv_meritko' => 'Stelle zuerst den Maßstab ein.',
        'jen_vektor' => 'Die Wanderkennung funktioniert bisher nur mit Vektor-PDFs (Plan vom Architekten).',
        'worker_selhal' => 'Worker fehlgeschlagen',
        'rozpoznani_nevyslo' => 'Erkennung fehlgeschlagen',
        'rozpoznani_selhalo' => 'Erkennung fehlgeschlagen: :chyba',
        'steny_nenalezeny' => 'Im Plan wurden keine Wände gefunden. Versuche einen anderen Ausschnitt oder zeichne den Plan von Hand nach.',
        'nahradit_kresbu' => 'Im Projekt gibt es schon eine Zeichnung. Durch die Wände aus dem Plan ersetzen?',
        'akce_steny' => 'Wände aus Plan importiert',
        'akce_steny_otvory' => 'one=Wände aus Plan importiert (:pocet Öffnung)|other=Wände aus Plan importiert (:pocet Öffnungen)',
        'zadej_rozmer' => 'Maß eingeben',
        'klikni_druhy_bod' => 'klicke auf den zweiten Punkt',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Breite',
        'hloubka' => 'Tiefe',
        'vyska' => 'Höhe',
        'chyba_http' => 'Katalog: HTTP :status',
        'akce_vlozeni' => 'Objekt eingefügt: :nazev',
        'akce_rozmer' => 'Objektmaß geändert',
        'akce_puvodni' => 'Originalmaß des Objekts',
        'akce_otoceni' => 'Objekt gedreht',
        'akce_kopie' => 'Objekt kopiert',
        'akce_smazani' => 'Objekt gelöscht',
        'akce_vyska' => 'Objekthöhe über Boden',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Sofas',
        'kresla' => 'Sessel',
        'zidle' => 'Stühle',
        'stoly' => 'Esstische',
        'stolky' => 'Beistelltische',
        'postele' => 'Betten',
        'skrine' => 'Schränke und Kommoden',
        'police' => 'Bücherschränke und Regale',
        'psaci' => 'Schreibtische',
        'svitidla' => 'Leuchten',
        'koberce' => 'Teppiche',
        'obrazy' => 'Bilder',
        'zrcadla' => 'Spiegel',
        'rostliny' => 'Pflanzen und Töpfe',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Das Bild konnte nicht erstellt werden',
        'meritko_koty' => '1 m  ·  Maße in cm',
        'podtitul' => 'Online-Tool zur Planung von Haus und Umbau',
        'neni_co_exportovat' => 'Nichts zu exportieren, das Geschoss hat keine Wände.',
        'soubor_projekt' => 'projekt',
        'soubor_pudorysy' => 'grundrisse',
        'soubor_pudorys' => 'grundriss-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Nichts zu teilen, das Haus hat keine Wände.',
        'odkaz_neulozen' => 'Der Link konnte nicht gespeichert werden.',
        'odkaz_aktualni' => 'Der Link zeigt den aktuellen Stand.',
        'vypnout_potvrzeni' => 'Link deaktivieren? Wer ihn hat, sieht das Projekt nicht mehr. Erneutes Teilen erhält eine neue Adresse.',
        'vypnuti_http' => 'Link deaktivieren: HTTP :status',
        'chybi_plan' => 'Der Grundriss eines Geschosses fehlt.',
        'neplatny_model' => 'Ungültiges 3D-Modell.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Änderung',
        'zacatek' => 'Beginn',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Wähle einen Plan aus.',
        'jen_formaty' => 'Hochladen lassen sich nur PDF, PNG oder JPG.',
        'soubor_velky' => 'Die Datei ist größer als :mb MB.',
        'chybi_poppler' => 'Auf dem Server fehlen die Werkzeuge zum Lesen von PDFs (poppler). Lade ein Bild hoch oder installiere poppler.',
        'vykres_neexistuje' => 'Der Plan existiert nicht.',
        'nenalezen' => 'Vorlage nicht gefunden.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Parzelle nicht gefunden. Prüfe die Parzellennummer und das Katastergebiet.',
        'pojem_kratky' => 'Begriff zu kurz',
        'ai_nedostupna' => 'KI ist nicht verfügbar',
        'ai_selhala' => 'Die KI-Antwort ist fehlgeschlagen',
        'ai_prazdna' => 'Leere KI-Antwort',
        'neocekavana_chyba' => 'Unerwarteter Fehler',
        'zadny_polygon' => 'Kein gültiges Polygon.',
        'polygon_body' => 'Ein Polygon braucht mindestens 3 Punkte.',
        'polygon_bez_bodu' => 'Keine Punkte im Polygon der Parzelle.',
        'vysky_nedostupne' => 'Für dieses Gebiet sind keine Höhendaten verfügbar.',
        'souradnice_mimo' => 'Koordinaten außerhalb des Bereichs von S-JTSK: :lat, :lon',
    ],
];
