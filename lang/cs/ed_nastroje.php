<?php

// Editor V3, nástroje kolem kresby: průvodce importem výkresu (import-pudorysu.js, import-prohlizec.js),
// katalog (katalog.js), export a sdílení (export-sdileni.js) a hlášky serveru
// (KonceptV3Controller, KonceptV3PodkladController, KonceptV3SdileniController, Katastr\Dmr5gService).
// Do JS jde přes ttSkupiny v koncept-v3.blade.php → preloz('ed_nastroje.klic').
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Výkres',
        'krok_strana' => 'Strana',
        'krok_meritko' => 'Měřítko',
        'krok_obrys' => 'Obvod domu',
        'krok_steny' => 'Stěny',
        'pokyn_soubor' => 'Vyber výkres půdorysu, nebo použij dříve nahraný.',
        'pokyn_strana' => 'Vyber stranu, na které je půdorys.',
        'pokyn_meritko' => 'Změř ve výkresu známý rozměr — klikni na dva body a zadej jejich skutečnou vzdálenost.',
        'pokyn_obrys' => 'Obkresli vnější hranu obvodových zdí — klikej do rohů domu.',
        'pokyn_steny' => 'Vyber variantu, která nejlépe odpovídá stěnám.',
        'jen_formaty' => 'Podporované jsou jen soubory PDF, PNG a JPG.',
        'nahrani_selhalo' => 'Soubor se nepodařilo nahrát.',
        'nahrani_selhalo_chyba' => 'Soubor se nepodařilo nahrát: :chyba',
        'strana_selhala' => 'Stranu se nepodařilo připravit.',
        'strana_selhala_chyba' => 'Stranu se nepodařilo připravit: :chyba',
        'nejdriv_zmer' => 'Nejdřív změř známý rozměr.',
        'nejdriv_meritko' => 'Nejdřív nastav měřítko.',
        'jen_vektor' => 'Rozpoznání stěn umí zatím jen vektorová PDF (výkres od architekta).',
        'worker_selhal' => 'worker selhal',
        'rozpoznani_nevyslo' => 'rozpoznání selhalo',
        'rozpoznani_selhalo' => 'Rozpoznání selhalo: :chyba',
        'steny_nenalezeny' => 'Ve výkresu se nepodařilo najít stěny. Zkus jiný výřez, nebo výkres obkresli ručně.',
        'nahradit_kresbu' => 'V konceptu už je kresba. Nahradit ji stěnami z výkresu?',
        'akce_steny' => 'Import stěn z výkresu',
        'akce_steny_otvory' => 'one=Import stěn z výkresu (:pocet otvor)|few=Import stěn z výkresu (:pocet otvory)|many=Import stěn z výkresu (:pocet otvoru)|other=Import stěn z výkresu (:pocet otvorů)',
        'zadej_rozmer' => 'zadej rozměr',
        'klikni_druhy_bod' => 'klikni na druhý bod',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Šířka',
        'hloubka' => 'Hloubka',
        'vyska' => 'Výška',
        'chyba_http' => 'Katalog: HTTP :status',
        'akce_vlozeni' => 'Vložení objektu: :nazev',
        'akce_rozmer' => 'Změna rozměru objektu',
        'akce_puvodni' => 'Původní rozměr objektu',
        'akce_otoceni' => 'Otočení objektu',
        'akce_kopie' => 'Kopie objektu',
        'akce_smazani' => 'Smazání objektu',
        'akce_vyska' => 'Výška objektu nad podlahou',
        'akce_barva' => 'Barva objektu',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Pohovky',
        'kresla' => 'Křesla',
        'zidle' => 'Židle',
        'stoly' => 'Jídelní stoly',
        'stolky' => 'Stolky',
        'postele' => 'Postele',
        'skrine' => 'Skříně a komody',
        'police' => 'Knihovny a police',
        'psaci' => 'Psací stoly',
        'svitidla' => 'Svítidla',
        'koberce' => 'Koberce',
        'obrazy' => 'Obrazy',
        'zrcadla' => 'Zrcadla',
        'koupelna' => 'Koupelna a WC',
        'rostliny' => 'Rostliny a květináče',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Obrázek se nepodařilo vytvořit',
        'meritko_koty' => ':delka  ·  kóty v cm',
        'podtitul' => 'Online nástroj pro návrh domu a rekonstrukce',
        'neni_co_exportovat' => 'Není co exportovat, podlaží nemá stěny.',
        'soubor_projekt' => 'projekt',
        'soubor_pudorysy' => 'pudorysy',
        'soubor_pudorys' => 'pudorys-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Není co sdílet, dům nemá stěny.',
        'odkaz_neulozen' => 'Odkaz se nepodařilo uložit.',
        'odkaz_aktualni' => 'Odkaz ukazuje aktuální stav.',
        'vypnout_potvrzeni' => 'Vypnout odkaz? Kdo ho má, už projekt neuvidí. Další sdílení dostane novou adresu.',
        'vypnuti_http' => 'Vypnutí odkazu: HTTP :status',
        'chybi_plan' => 'Chybí půdorys některého podlaží.',
        'neplatny_model' => 'Neplatný 3D model.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Úprava',
        'zacatek' => 'Začátek',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Vyber výkres.',
        'jen_formaty' => 'Nahrát jde jen PDF, PNG nebo JPG.',
        'soubor_velky' => 'Soubor je větší než :mb MB.',
        'chybi_poppler' => 'Na serveru chybí nástroje pro čtení PDF (poppler). Nahraj obrázek, nebo doplň poppler.',
        'vykres_neexistuje' => 'Výkres neexistuje.',
        'nenalezen' => 'Podklad nenalezen.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Parcela nenalezena. Zkontroluj číslo parcely a katastrální území.',
        'pojem_kratky' => 'Pojem příliš krátký',
        'ai_nedostupna' => 'AI není k dispozici',
        'ai_selhala' => 'AI odpověď selhala',
        'ai_prazdna' => 'Prázdná odpověď AI',
        'neocekavana_chyba' => 'Neočekávaná chyba',
        'zadny_polygon' => 'Žádný platný polygon.',
        'polygon_body' => 'Polygon musí mít alespoň 3 body.',
        'polygon_bez_bodu' => 'Žádné body v polygonu parcely.',
        'vysky_nedostupne' => 'Výšková data pro tuto oblast nejsou dostupná.',
        'souradnice_mimo' => 'Souřadnice mimo rozsah S-JTSK: :lat, :lon',
    ],
];
