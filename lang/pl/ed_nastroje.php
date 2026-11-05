<?php

// Editor V3, nástroje kolem kresby: průvodce importem výkresu (import-pudorysu.js, import-prohlizec.js),
// katalog (katalog.js), export a sdílení (export-sdileni.js) a hlášky serveru
// (KonceptV3Controller, KonceptV3PodkladController, KonceptV3SdileniController, Katastr\Dmr5gService).
// Do JS jde přes ttSkupiny v koncept-v3.blade.php → preloz('ed_nastroje.klic').
return [
    // Průvodce importem půdorysu
    'import' => [
        'krok_soubor' => 'Rysunek',
        'krok_strana' => 'Strona',
        'krok_meritko' => 'Skala',
        'krok_obrys' => 'Obrys domu',
        'krok_steny' => 'Ściany',
        'pokyn_soubor' => 'Wybierz rysunek rzutu albo użyj wcześniej wgranego.',
        'pokyn_strana' => 'Wybierz stronę, na której jest rzut.',
        'pokyn_meritko' => 'Zmierz na rysunku znany wymiar — kliknij dwa punkty i podaj ich rzeczywistą odległość.',
        'pokyn_obrys' => 'Obrysuj zewnętrzną krawędź ścian zewnętrznych — klikaj w narożniki domu.',
        'pokyn_steny' => 'Wybierz wariant, który najlepiej odpowiada ścianom.',
        'jen_formaty' => 'Obsługiwane są tylko pliki PDF, PNG i JPG.',
        'nahrani_selhalo' => 'Nie udało się wgrać pliku.',
        'nahrani_selhalo_chyba' => 'Nie udało się wgrać pliku: :chyba',
        'strana_selhala' => 'Nie udało się przygotować strony.',
        'strana_selhala_chyba' => 'Nie udało się przygotować strony: :chyba',
        'nejdriv_zmer' => 'Najpierw zmierz znany wymiar.',
        'nejdriv_meritko' => 'Najpierw ustaw skalę.',
        'jen_vektor' => 'Rozpoznawanie ścian działa na razie tylko z wektorowymi plikami PDF (rysunek od projektanta).',
        'worker_selhal' => 'błąd workera',
        'rozpoznani_nevyslo' => 'rozpoznawanie nie powiodło się',
        'rozpoznani_selhalo' => 'Rozpoznawanie nie powiodło się: :chyba',
        'steny_nenalezeny' => 'Nie udało się znaleźć ścian na rysunku. Spróbuj innego wycinka albo obrysuj rysunek ręcznie.',
        'nahradit_kresbu' => 'W projekcie są już narysowane elementy. Zastąpić je ścianami z rysunku?',
        'akce_steny' => 'Import ścian z rysunku',
        'akce_steny_otvory' => 'one=Import ścian z rysunku (:pocet otwór)|few=Import ścian z rysunku (:pocet otwory)|many=Import ścian z rysunku (:pocet otworów)|other=Import ścian z rysunku (:pocet otworu)',
        'zadej_rozmer' => 'podaj wymiar',
        'klikni_druhy_bod' => 'kliknij drugi punkt',
    ],

    // Katalog nábytku a vybavení
    'katalog' => [
        'sirka' => 'Szerokość',
        'hloubka' => 'Głębokość',
        'vyska' => 'Wysokość',
        'chyba_http' => 'Katalog: HTTP :status',
        'akce_vlozeni' => 'Wstawienie obiektu: :nazev',
        'akce_rozmer' => 'Zmiana rozmiaru obiektu',
        'akce_puvodni' => 'Oryginalny rozmiar obiektu',
        'akce_otoceni' => 'Obrót obiektu',
        'akce_kopie' => 'Kopia obiektu',
        'akce_smazani' => 'Usunięcie obiektu',
        'akce_vyska' => 'Wysokość obiektu nad podłogą',
    ],

    // Kategorie katalogu podle id z public/katalog/katalog.json
    'kategorie' => [
        'pohovky' => 'Sofy',
        'kresla' => 'Fotele',
        'zidle' => 'Krzesła',
        'stoly' => 'Stoły jadalne',
        'stolky' => 'Stoliki',
        'postele' => 'Łóżka',
        'skrine' => 'Szafy i komody',
        'police' => 'Regały i półki',
        'psaci' => 'Biurka',
        'svitidla' => 'Oświetlenie',
        'koberce' => 'Dywany',
        'obrazy' => 'Obrazy',
        'zrcadla' => 'Lustra',
        'rostliny' => 'Rośliny i doniczki',
    ],

    // Export obrázků; soubor_* jsou části názvu staženého souboru
    'export' => [
        'obrazek_selhal' => 'Nie udało się utworzyć obrazu',
        'meritko_koty' => '1 m  ·  wymiary w cm',
        'podtitul' => 'Narzędzie online do projektowania domu i remontu',
        'neni_co_exportovat' => 'Nie ma czego eksportować, kondygnacja nie ma ścian.',
        'soubor_projekt' => 'projekt',
        'soubor_pudorysy' => 'rzuty',
        'soubor_pudorys' => 'rzut-:podlazi',
    ],

    // Sdílení odkazem (editor a KonceptV3SdileniController)
    'sdileni' => [
        'neni_co_sdilet' => 'Nie ma czego udostępniać, dom nie ma ścian.',
        'odkaz_neulozen' => 'Nie udało się zapisać linku.',
        'odkaz_aktualni' => 'Link pokazuje bieżący stan.',
        'vypnout_potvrzeni' => 'Wyłączyć link? Kto go ma, nie zobaczy już projektu. Kolejne udostępnienie dostanie nowy adres.',
        'vypnuti_http' => 'Wyłączenie linku: HTTP :status',
        'chybi_plan' => 'Brakuje rzutu jednej z kondygnacji.',
        'neplatny_model' => 'Nieprawidłowy model 3D.',
    ],

    // Výchozí popisy kroků historie ze serveru
    'historie' => [
        'uprava' => 'Edycja',
        'zacatek' => 'Początek',
    ],

    // Nahrání výkresu (KonceptV3PodkladController)
    'podklad' => [
        'vyber_vykres' => 'Wybierz rysunek.',
        'jen_formaty' => 'Można wgrać tylko PDF, PNG lub JPG.',
        'soubor_velky' => 'Plik jest większy niż :mb MB.',
        'chybi_poppler' => 'Na serwerze brakuje narzędzi do odczytu PDF (poppler). Wgraj obraz albo doinstaluj poppler.',
        'vykres_neexistuje' => 'Rysunek nie istnieje.',
        'nenalezen' => 'Nie znaleziono podkładu.',
    ],

    // Katastr, výškový profil a vysvětlení pojmů (KonceptV3Controller, Katastr\Dmr5gService)
    'katastr' => [
        'parcela_nenalezena' => 'Nie znaleziono działki. Sprawdź numer działki i obręb katastralny.',
        'pojem_kratky' => 'Pojęcie jest za krótkie',
        'ai_nedostupna' => 'AI nie jest dostępna',
        'ai_selhala' => 'Odpowiedź AI nie powiodła się',
        'ai_prazdna' => 'Pusta odpowiedź AI',
        'neocekavana_chyba' => 'Nieoczekiwany błąd',
        'zadny_polygon' => 'Brak prawidłowego wielokąta.',
        'polygon_body' => 'Wielokąt musi mieć co najmniej 3 punkty.',
        'polygon_bez_bodu' => 'Brak punktów w wielokącie działki.',
        'vysky_nedostupne' => 'Dane wysokościowe dla tego obszaru nie są dostępne.',
        'souradnice_mimo' => 'Współrzędne poza zakresem S-JTSK: :lat, :lon',
    ],
];
