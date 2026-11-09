<?php

// Editor V3, nástroje kolem kresby: průvodce importem výkresu (import-pudorysu.js, import-prohlizec.js),
// katalog (katalog.js), export a sdílení (export-sdileni.js) a hlášky serveru
// (KonceptV3Controller, KonceptV3PodkladController, KonceptV3SdileniController, Katastr\Dmr5gService).
// Do JS jde přes ttSkupiny v koncept-v3.blade.php → preloz('ed_nastroje.klic').
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Disegno',
        'krok_strana' => 'Pagina',
        'krok_meritko' => 'Scala',
        'krok_obrys' => 'Contorno casa',
        'krok_steny' => 'Pareti',
        'pokyn_soubor' => 'Scegli il disegno della pianta, oppure usane uno già caricato.',
        'pokyn_strana' => 'Scegli la pagina con la pianta.',
        'pokyn_meritko' => 'Misura nel disegno una dimensione nota — clicca su due punti e inserisci la loro distanza reale.',
        'pokyn_obrys' => 'Ricalca il bordo esterno dei muri perimetrali — clicca sugli angoli della casa.',
        'pokyn_steny' => 'Scegli la variante che corrisponde meglio alle pareti.',
        'jen_formaty' => 'Sono supportati solo file PDF, PNG e JPG.',
        'nahrani_selhalo' => 'Non è stato possibile caricare il file.',
        'nahrani_selhalo_chyba' => 'Non è stato possibile caricare il file: :chyba',
        'strana_selhala' => 'Non è stato possibile preparare la pagina.',
        'strana_selhala_chyba' => 'Non è stato possibile preparare la pagina: :chyba',
        'nejdriv_zmer' => 'Misura prima una dimensione nota.',
        'nejdriv_meritko' => 'Imposta prima la scala.',
        'jen_vektor' => 'Per ora il riconoscimento delle pareti funziona solo con PDF vettoriali (disegno dell’architetto).',
        'worker_selhal' => 'errore del worker',
        'rozpoznani_nevyslo' => 'riconoscimento non riuscito',
        'rozpoznani_selhalo' => 'Riconoscimento non riuscito: :chyba',
        'steny_nenalezeny' => 'Non è stato possibile trovare pareti nel disegno. Prova un’altra inquadratura, oppure ricalca il disegno a mano.',
        'nahradit_kresbu' => 'Il progetto contiene già un disegno. Vuoi sostituirlo con le pareti della pianta?',
        'akce_steny' => 'Importazione pareti dal disegno',
        'akce_steny_otvory' => 'one=Importazione pareti dal disegno (:pocet apertura)|other=Importazione pareti dal disegno (:pocet aperture)',
        'zadej_rozmer' => 'inserisci la misura',
        'klikni_druhy_bod' => 'clicca sul secondo punto',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Larghezza',
        'hloubka' => 'Profondità',
        'vyska' => 'Altezza',
        'chyba_http' => 'Catalogo: HTTP :status',
        'akce_vlozeni' => 'Inserimento oggetto: :nazev',
        'akce_rozmer' => 'Modifica dimensioni oggetto',
        'akce_puvodni' => 'Dimensioni originali oggetto',
        'akce_otoceni' => 'Rotazione oggetto',
        'akce_kopie' => 'Copia oggetto',
        'akce_smazani' => 'Eliminazione oggetto',
        'akce_vyska' => 'Altezza oggetto da terra',
        'akce_barva' => 'Colore dell’oggetto',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Divani',
        'kresla' => 'Poltrone',
        'zidle' => 'Sedie',
        'stoly' => 'Tavoli da pranzo',
        'stolky' => 'Tavolini',
        'postele' => 'Letti',
        'skrine' => 'Armadi e cassettiere',
        'police' => 'Librerie e mensole',
        'psaci' => 'Scrivanie',
        'svitidla' => 'Illuminazione',
        'koberce' => 'Tappeti',
        'obrazy' => 'Quadri',
        'zrcadla' => 'Specchi',
        'rostliny' => 'Piante e vasi',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Non è stato possibile creare l’immagine',
        'meritko_koty' => ':delka  ·  quote in cm',
        'podtitul' => 'Strumento online per progettare casa e ristrutturazione',
        'neni_co_exportovat' => 'Niente da esportare, il piano non ha pareti.',
        'soubor_projekt' => 'progetto',
        'soubor_pudorysy' => 'piante',
        'soubor_pudorys' => 'pianta-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Niente da condividere, la casa non ha pareti.',
        'odkaz_neulozen' => 'Non è stato possibile salvare il link.',
        'odkaz_aktualni' => 'Il link mostra lo stato attuale.',
        'vypnout_potvrzeni' => 'Disattivare il link? Chi lo ha non vedrà più il progetto. La prossima condivisione avrà un nuovo indirizzo.',
        'vypnuti_http' => 'Disattivazione del link: HTTP :status',
        'chybi_plan' => 'Manca la pianta di uno dei piani.',
        'neplatny_model' => 'Modello 3D non valido.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Modifica',
        'zacatek' => 'Inizio',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Scegli un disegno.',
        'jen_formaty' => 'Puoi caricare solo PDF, PNG o JPG.',
        'soubor_velky' => 'Il file supera :mb MB.',
        'chybi_poppler' => 'Sul server mancano gli strumenti per leggere i PDF (poppler). Carica un’immagine, oppure installa poppler.',
        'vykres_neexistuje' => 'Il disegno non esiste.',
        'nenalezen' => 'Base non trovata.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Particella non trovata. Controlla il numero di particella e il comune catastale.',
        'pojem_kratky' => 'Termine troppo corto',
        'ai_nedostupna' => 'AI non disponibile',
        'ai_selhala' => 'Risposta dell’AI non riuscita',
        'ai_prazdna' => 'Risposta dell’AI vuota',
        'neocekavana_chyba' => 'Errore imprevisto',
        'zadny_polygon' => 'Nessun poligono valido.',
        'polygon_body' => 'Il poligono deve avere almeno 3 punti.',
        'polygon_bez_bodu' => 'Nessun punto nel poligono della particella.',
        'vysky_nedostupne' => 'I dati altimetrici per quest’area non sono disponibili.',
        'souradnice_mimo' => 'Coordinate fuori dall’intervallo S-JTSK: :lat, :lon',
    ],
];
