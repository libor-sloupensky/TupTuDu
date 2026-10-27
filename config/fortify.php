<?php

use Laravel\Fortify\Features;

return [

    'guard' => 'web',

    'passwords' => 'users',

    'username' => 'email',

    'email' => 'email',

    'lowercase_usernames' => true,

    // Po přihlášení → administrace.
    'home' => '/masterteam',

    'prefix' => '',

    'domain' => null,

    // Přihlášení běží na app i masterteamu (každá subdoména má vlastní session),
    // z veřejného webu se přesměruje na app.
    'middleware' => ['web', 'subdomena:app,masterteam'],

    'limiters' => [
        'login' => 'login',
        'verification' => '6,1',
    ],

    'views' => true,

    // Kam po registraci, ověření e-mailu a obnově hesla. Registrace je jen na app
    // (FortifyServiceProvider), obnova hesla na app i masterteamu (vrací na login té subdomény).
    'redirects' => [
        'register' => '/projects',
        'email-verification' => '/projects',
        'password-reset' => '/login',
    ],

    // Zákaznická část: registrace (jen app.tuptudu.com), obnova hesla a ověření
    // e-mailu (zákaznické routy mají middleware `verified`). Akce a šablony
    // nastavuje FortifyServiceProvider.
    'features' => [
        Features::registration(),
        Features::resetPasswords(),
        Features::emailVerification(),
    ],

];
