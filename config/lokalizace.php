<?php

/**
 * Jazyk a země — dvě oddělené věci (dokumentace: modules/lokalizace.md).
 *
 *   jazyk  = v čem se texty zobrazí (cs, en, …)        → App::getLocale(), __(), preloz() v JS
 *   země   = které národní služby fungují (katastr…)   → Lokalizace::maFunkci(), @funkce, middleware `funkce:`
 *
 * Kazach může mít ruštinu a Kazachstán, Švýcar němčinu a Švýcarsko. Určuje
 * middleware NastavLokalizaci (pořadí viz tam), stav drží App\Support\Lokalizace.
 */
return [
    // Jazyky, které uživatel může zvolit. Nový jazyk = složka lang/{kod}/ + řádek sem
    // (kontrola úplnosti: php artisan preklady:kontrola).
    'jazyky' => [
        'cs' => 'Čeština',
        'en' => 'English',
        'sk' => 'Slovenčina',
        'pl' => 'Polski',
        'de' => 'Deutsch',
        'fr' => 'Français',
        'es' => 'Español',
        'it' => 'Italiano',
    ],

    // Skupiny textů, které neexistují ve všech jazycích (preklady:kontrola), např. 'skupina' => ['cs', 'en'].
    'skupiny_jazyku' => [],

    // Formát data podle jazyku (bez ext-intl). Používá Lokalizace::datum().
    'format_data' => [
        'cs' => 'j. n. Y', 'sk' => 'j. n. Y', 'en' => 'j M Y', 'pl' => 'd.m.Y',
        'de' => 'j.n.Y', 'fr' => 'd/m/Y', 'es' => 'd/m/Y', 'it' => 'd/m/Y',
    ],

    // Jazyk, ve kterém píšeme texty (vzor pro preklady:kontrola).
    'zdrojovy_jazyk' => 'cs',

    // Masterteam zatím jen česky. Až se bude překládat, stačí null — pak se jazyk
    // určí stejně jako v aplikaci (a stránky masterteamu potřebují odkaz na DB-IP).
    'masterteam_jazyk' => env('MASTERTEAM_JAZYK', 'cs'),

    // Když uživatel nic nezvolil a jazyk jeho země nemáme. Chybějící texty doplňuje
    // záložní jazyk APP_FALLBACK_LOCALE (také en).
    'vychozi_jazyk' => 'en',

    // Jazyk podle země příchodu (ISO 3166-1 → kód jazyka, nebo seznam v pořadí).
    // Použije se první aktivní z `jazyky` — dokud němčina není aktivní, dostane
    // Němec angličtinu. Slovák dostane češtinu, dokud nebude slovenština (Libor).
    'jazyk_zeme' => [
        'CZ' => 'cs',
        'DE' => 'de', 'AT' => 'de', 'LI' => 'de',
        'FR' => 'fr', 'MC' => 'fr',
        'PL' => 'pl',
        'IT' => 'it', 'SM' => 'it',
        'ES' => 'es',
        'SK' => ['sk', 'cs'],
        // Vícejazyčné země (CH, BE, LU) záměrně chybí — tam rozhodne volba uživatele.
    ],

    // Domovská země jazyka v adrese webu. Kdo otevře tuptudu.com/cs z ciziny (i Google z USA),
    // uvidí českou stránku včetně katastru a cen v Kč. Návštěvník ze země s tím jazykem si svou zemi nechá.
    'zeme_jazyka' => ['cs' => 'CZ'],

    // Země, kterou dostane uživatel bez vlastního nastavení. Dokud jsou všichni
    // zákazníci z ČR, je to CZ (jinak by přišli o katastr). Až půjdeme ven,
    // bude se země volit při registraci.
    'vychozi_zeme' => 'CZ',

    // Co ukazuje web a editor návštěvníkovi podle jeho země (ISO 3166-1 alpha-2): ceník, titulka, hledání podle čísla.
    // Pozemek sám bere data podle své polohy (config/pozemky.php), tohle je jen nabídka podle země uživatele.
    //   katastr         parcely z katastru kliknutím na mapě
    //   katastr_cislo   hledání parcely podle katastrálního území a čísla (jen ČR)
    //   vyskovy_profil  výšky terénu z modelu 1 m v celé zemi (Německo jen v 6 spolkových zemích, proto ne)
    //   mapovy_podklad  mapa Mapy.com pod půdorysem
    'zeme' => [
        'CZ' => ['katastr', 'katastr_cislo', 'vyskovy_profil', 'mapovy_podklad'],
        'SK' => ['katastr', 'vyskovy_profil', 'mapovy_podklad'],
        'PL' => ['katastr', 'vyskovy_profil', 'mapovy_podklad'],
        'FR' => ['katastr', 'vyskovy_profil', 'mapovy_podklad'],
        'ES' => ['katastr', 'mapovy_podklad'],
        'IT' => ['katastr', 'mapovy_podklad'],
        'DE' => ['katastr', 'mapovy_podklad'],
        'AT' => ['vyskovy_profil', 'mapovy_podklad'],
    ],

    // Národní domény webu → výchozí jazyk a země návštěvníka (host bez www.).
    // Např. 'tuptudu.de' => ['jazyk' => 'de', 'zeme' => 'DE']. Host musí být i v config/domeny.php.
    'domeny' => [],
];
