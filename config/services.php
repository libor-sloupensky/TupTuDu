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

    'cron_token' => env('CRON_TOKEN', 'QmPusoUbgryaOS8PcAniswSRDsN_Bj9wy-KR4YrWq-A'),

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
