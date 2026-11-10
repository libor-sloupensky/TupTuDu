<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // Platební údaje pro QR platby (SPAYD) — předplatné Kalkulio
    'platba' => [
        'cislo_uctu' => env('PLATBA_CISLO_UCTU', '5609982369'),
        'kod_banky' => env('PLATBA_KOD_BANKY', '0800'),
        'nazev_banky' => env('PLATBA_NAZEV_BANKY', 'Česká spořitelna'),
        'message' => env('PLATBA_MESSAGE', 'Kalkulio predplatne'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'eu-central-1'),
    ],

    'aws' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'eu-central-1'),
        // Bucket pro neměnný archiv stavebního deníku (Object Lock = compliance, 10 let).
        // Bez tohoto env je S3 archiv (vrstva 4) neaktivní = no-op.
        'denik_archiv_bucket' => env('AWS_DENIK_ARCHIV_BUCKET'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', '/auth/google/callback'),
    ],

    // Google Analytics 4 — měřicí ID (G-…) zákaznické části (web, app, přihlášení; masterteam ne).
    // Bez hodnoty se nic neměří a cookie lišta se nezobrazí (partials/cookies-lista, modules/marketing.md).
    'ga4' => [
        'measurement_id' => env('GA4_MEASUREMENT_ID'),
    ],

    // Čtení z Google Analytics 4 a Search Console servisním účtem pro Masterteam ▸ Přehled
    // (App\Services\Google\GoogleApi, modules/statistiky.md). Klíč je JSON servisního účtu:
    // na produkci base64 v GOOGLE_SA_JSON (GitHub Secret), lokálně cesta k souboru v GOOGLE_SA_SOUBOR.
    // Bez klíče stránka ukáže jen vlastní data. Čísla služeb nejsou tajná.
    'google_api' => [
        'klic_json' => env('GOOGLE_SA_JSON'),
        'klic_soubor' => env('GOOGLE_SA_SOUBOR'),
        'ga4_sluzba' => env('GA4_SLUZBA', '561796471'),
        'gsc_web' => env('GSC_WEB', 'sc-domain:tuptudu.com'),
        // Sitemapa, jejíž adresy se denně kontrolují v indexu (indexace:kontrola)
        'sitemapa' => env('GSC_SITEMAPA', 'https://www.tuptudu.com/sitemap.xml'),
        // Od kdy se měří (GA4 nasazené, web povolený vyhledávačům) — začátek „celého období“
        'mereno_od' => '2026-11-01',
    ],

    // Token cron URL (/cron/bugy/{token}, /cron/chyby/{token}). Jen z env — na produkci
    // GitHub Secret CRON_TOKEN přes deploy.yml. Repo je veřejné → ŽÁDNÁ výchozí hodnota
    // (bez tokenu jsou cron URL zavřené, hash_equals s prázdným řetězcem neprojde).
    'cron_token' => env('CRON_TOKEN'),

    'voyage' => [
        'key' => env('VOYAGE_API_KEY'),
    ],

    'anthropic' => [
        'key' => env('ANTHROPIC_API_KEY'),
        // Legacy: default pro kontroller-level config (rag, tezba). Pri deprecation
        // staci update .env ANTHROPIC_MODEL.
        'model' => env('ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001'),
        // Aktuální modely podle tiery (override z .env pri deprecation).
        // Default hodnoty viz App\Services\ClaudeApi konstanty.
        'model_haiku'  => env('ANTHROPIC_MODEL_HAIKU'),
        'model_sonnet' => env('ANTHROPIC_MODEL_SONNET'),
        'model_opus'   => env('ANTHROPIC_MODEL_OPUS'),
    ],

    'mapycz' => [
        'api_key' => env('MAPYCZ_API_KEY'),
    ],

    'visual_crossing' => [
        'key' => env('VISUAL_CROSSING_KEY'),
    ],

    'gemini' => [
        'key' => env('GEMINI_API_KEY'),
    ],

    'huggingface' => [
        'key' => env('HUGGINGFACE_API_KEY'),
    ],

];
