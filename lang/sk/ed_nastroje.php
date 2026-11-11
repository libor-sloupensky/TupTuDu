<?php

// Editor V3, nástroje kolem kresby. Klíče a použití viz lang/cs/ed_nastroje.php.
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Výkres',
        'krok_strana' => 'Strana',
        'krok_meritko' => 'Mierka',
        'krok_obrys' => 'Obvod domu',
        'krok_steny' => 'Steny',
        'pokyn_soubor' => 'Vyber výkres pôdorysu alebo použi skôr nahraný.',
        'pokyn_strana' => 'Vyber stranu, na ktorej je pôdorys.',
        'pokyn_meritko' => 'Zmeraj vo výkrese známy rozmer — klikni na dva body a zadaj ich skutočnú vzdialenosť.',
        'pokyn_obrys' => 'Obkresli vonkajšiu hranu obvodových stien — klikaj do rohov domu.',
        'pokyn_steny' => 'Vyber variantu, ktorá najlepšie zodpovedá stenám.',
        'jen_formaty' => 'Podporované sú len súbory PDF, PNG a JPG.',
        'nahrani_selhalo' => 'Súbor sa nepodarilo nahrať.',
        'nahrani_selhalo_chyba' => 'Súbor sa nepodarilo nahrať: :chyba',
        'strana_selhala' => 'Stranu sa nepodarilo pripraviť.',
        'strana_selhala_chyba' => 'Stranu sa nepodarilo pripraviť: :chyba',
        'nejdriv_zmer' => 'Najprv zmeraj známy rozmer.',
        'nejdriv_meritko' => 'Najprv nastav mierku.',
        'jen_vektor' => 'Rozpoznávanie stien zatiaľ funguje len s vektorovými PDF (výkres od architekta).',
        'worker_selhal' => 'worker zlyhal',
        'rozpoznani_nevyslo' => 'rozpoznanie zlyhalo',
        'rozpoznani_selhalo' => 'Rozpoznanie zlyhalo: :chyba',
        'steny_nenalezeny' => 'Vo výkrese sa nepodarilo nájsť steny. Skús iný výrez alebo výkres obkresli ručne.',
        'nahradit_kresbu' => 'V koncepte už je kresba. Nahradiť ju stenami z výkresu?',
        'akce_steny' => 'Import stien z výkresu',
        'akce_steny_otvory' => 'one=Import stien z výkresu (:pocet otvor)|few=Import stien z výkresu (:pocet otvory)|many=Import stien z výkresu (:pocet otvoru)|other=Import stien z výkresu (:pocet otvorov)',
        'zadej_rozmer' => 'zadaj rozmer',
        'klikni_druhy_bod' => 'klikni na druhý bod',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Šírka',
        'hloubka' => 'Hĺbka',
        'vyska' => 'Výška',
        'chyba_http' => 'Katalóg: HTTP :status',
        'akce_vlozeni' => 'Vloženie objektu: :nazev',
        'akce_rozmer' => 'Zmena rozmeru objektu',
        'akce_puvodni' => 'Pôvodný rozmer objektu',
        'akce_otoceni' => 'Otočenie objektu',
        'akce_kopie' => 'Kópia objektu',
        'akce_smazani' => 'Zmazanie objektu',
        'akce_vyska' => 'Výška objektu nad podlahou',
        'akce_barva' => 'Farba objektu',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Pohovky',
        'kresla' => 'Kreslá',
        'zidle' => 'Stoličky',
        'stoly' => 'Jedálenské stoly',
        'stolky' => 'Stolíky',
        'postele' => 'Postele',
        'skrine' => 'Skrine a komody',
        'police' => 'Knižnice a police',
        'psaci' => 'Písacie stoly',
        'svitidla' => 'Svietidlá',
        'koberce' => 'Koberce',
        'obrazy' => 'Obrazy',
        'zrcadla' => 'Zrkadlá',
        'koupelna' => 'Kúpeľňa a WC',
        'rostliny' => 'Rastliny a kvetináče',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Obrázok sa nepodarilo vytvoriť',
        'meritko_koty' => ':delka  ·  kóty v cm',
        'podtitul' => 'Online nástroj na návrh domu a rekonštrukcie',
        'neni_co_exportovat' => 'Nie je čo exportovať, podlažie nemá steny.',
        'soubor_projekt' => 'projekt',
        'soubor_pudorysy' => 'podorysy',
        'soubor_pudorys' => 'podorys-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Nie je čo zdieľať, dom nemá steny.',
        'odkaz_neulozen' => 'Odkaz sa nepodarilo uložiť.',
        'odkaz_aktualni' => 'Odkaz ukazuje aktuálny stav.',
        'vypnout_potvrzeni' => 'Vypnúť odkaz? Kto ho má, už projekt neuvidí. Ďalšie zdieľanie dostane novú adresu.',
        'vypnuti_http' => 'Vypnutie odkazu: HTTP :status',
        'chybi_plan' => 'Chýba pôdorys niektorého podlažia.',
        'neplatny_model' => 'Neplatný 3D model.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Úprava',
        'zacatek' => 'Začiatok',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Vyber výkres.',
        'jen_formaty' => 'Nahrať možno len PDF, PNG alebo JPG.',
        'soubor_velky' => 'Súbor je väčší než :mb MB.',
        'chybi_poppler' => 'Na serveri chýbajú nástroje na čítanie PDF (poppler). Nahraj obrázok alebo doplň poppler.',
        'vykres_neexistuje' => 'Výkres neexistuje.',
        'nenalezen' => 'Podklad sa nenašiel.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Parcela sa nenašla. Skontroluj číslo parcely a katastrálne územie.',
        'pojem_kratky' => 'Pojem je príliš krátky',
        'ai_nedostupna' => 'AI nie je k dispozícii',
        'ai_selhala' => 'Odpoveď AI zlyhala',
        'ai_prazdna' => 'Prázdna odpoveď AI',
        'neocekavana_chyba' => 'Neočakávaná chyba',
        'zadny_polygon' => 'Žiadny platný polygón.',
        'polygon_body' => 'Polygón musí mať aspoň 3 body.',
        'vysky_pomalu' => 'Výškový profil sa teraz nepodarilo načítať, mapová služba odpovedá pomaly. Skús to o chvíľu.',
        'polygon_bez_bodu' => 'Žiadne body v polygóne parcely.',
        'vysky_nedostupne' => 'Výškové dáta pre túto oblasť nie sú dostupné.',
        'souradnice_mimo' => 'Súradnice mimo rozsahu S-JTSK: :lat, :lon',
    ],
];
