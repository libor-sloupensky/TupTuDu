<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ __('web.titulek') }}</title>
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    <style>
        .wrap { display: flex; align-items: center; justify-content: center; min-height: 72vh; padding: 1.5rem; text-align: center; }
        h1 { font-size: 1.75rem; }
    </style>
</head>
<body>
    <div class="topbar">
        <span class="brand-title"><span class="brand">TupTuDu</span></span>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
            {{-- Přihlášení běží na app.tuptudu.com (vlastní session), web o přihlášení neví. --}}
            <a class="btn" href="{{ \App\Support\Domeny::url('app', '/login') }}">{{ __('obecne.prihlaseni') }}</a>
        </div>
    </div>
    <div class="wrap">
        <h1>{{ __('web.v_priprave') }}</h1>
    </div>
@include('partials.poloha-zdroj')
@include('partials.error-tracker')
@include('partials.lokalizace-js')
</body>
</html>
