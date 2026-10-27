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
    ],

    // Plán první vlny (Evropa) — zatím neaktivní, jen pro přehled:
    // de Deutsch, fr Français, pl Polski, it Italiano, es Español, sk Slovenčina

    // Jazyk, ve kterém píšeme texty (vzor pro preklady:kontrola).
    'zdrojovy_jazyk' => 'cs',

    // Masterteam zatím jen česky. Až se bude překládat, stačí null — pak se jazyk
    // určí stejně jako v aplikaci (a stránky masterteamu potřebují odkaz na DB-IP).
    'masterteam_jazyk' => 'cs',

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

    // Země, kterou dostane uživatel bez vlastního nastavení. Dokud jsou všichni
    // zákazníci z ČR, je to CZ (jinak by přišli o katastr). Až půjdeme ven,
    // bude se země volit při registraci.
    'vychozi_zeme' => 'CZ',

    // Národní služby podle země (ISO 3166-1 alpha-2). Země, která tu není, nemá žádnou.
    // Služby přes INSPIRE (katastrální parcely) půjdou časem zapnout i jinde v EU.
    'zeme' => [
        'CZ' => [
            'katastr',          // parcely, sousední a okolní parcely, stavby (ČÚZK)
            'vyskovy_profil',   // výškový profil terénu (ČÚZK DMR 5G)
            'mapovy_podklad',   // mapový podklad katastru v editoru
        ],
    ],

    // Národní domény webu → výchozí jazyk a země návštěvníka (host bez www.).
    // Např. 'tuptudu.de' => ['jazyk' => 'de', 'zeme' => 'DE']. Host musí být i v config/domeny.php.
    'domeny' => [],
];
