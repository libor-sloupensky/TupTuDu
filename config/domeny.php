<?php

/**
 * Tři oddělené části aplikace — každá na vlastní subdoméně (po vzoru Kalkulia, kvůli bezpečnosti).
 *
 *   web        tuptudu.com (+ www.)        veřejný web; později i národní domény
 *   app        app.tuptudu.com             zákaznická aplikace (přihlášení, koncepty)
 *   masterteam masterteam.tuptudu.com      správa pro náš tým
 *
 * Session cookie je vázaná na host (SESSION_DOMAIN=null), takže přihlášení do app
 * se nikdy nepřenese do masterteamu. Routy hlídá middleware `subdomena:…`
 * (App\Http\Middleware\NaSubdomene), pomocné metody má App\Support\Domeny.
 *
 * Lokálně: tuptudu.localhost, app.tuptudu.localhost, masterteam.tuptudu.localhost
 * (prohlížeče *.localhost samy překládají na 127.0.0.1). Holé 127.0.0.1 / localhost
 * lokálně propouští všechno — kvůli UI testům v services/import-test.
 */
return [
    // Hosty veřejného webu (bez www. — to se bere jako totéž). Národní domény se přidají sem.
    'web' => array_filter(array_map('trim', explode(',', env('DOMENA_WEB', 'tuptudu.com')))),

    'app' => env('DOMENA_APP', 'app.tuptudu.com'),

    'masterteam' => env('DOMENA_MASTERTEAM', 'masterteam.tuptudu.com'),
];
