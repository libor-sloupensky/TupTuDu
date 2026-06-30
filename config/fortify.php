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

    'middleware' => ['web'],

    'limiters' => [
        'login' => 'login',
    ],

    'views' => true,

    // Fáze 1: jen přihlášení. Registrace, reset hesla a ověření emailu
    // zatím vypnuté (master admin je seedovaný a předověřený).
    'features' => [
        // Features::registration(),
        // Features::resetPasswords(),
        // Features::emailVerification(),
    ],

];
