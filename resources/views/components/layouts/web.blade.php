@props(['title' => 'TupTuDu'])
{{-- Layout veřejného webu (tuptudu.com): vitrína, právní stránky, kontakt.
     Vlastní styly stránky jdou do slotu `hlava`. --}}
<!DOCTYPE html>
{{-- Tmavý režim je výchozí; světlý podle cookie tt_rezim (partials/prepinac-rezimu) --}}
<html lang="{{ app()->getLocale() }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Indexuje se jen tuptudu.com (od 1. 11. 2026). Stejná titulka běží i na app.tuptudu.com (kvůli Paddle)
         a lokálně — tam noindex, ať Google nemá duplicitu. Kanonická adresa vždy na www. --}}
    @if (\App\Support\Domeny::jeWeb())
    <link rel="canonical" href="{{ \App\Support\Domeny::url('web', request()->path()) }}">
    @else
    <meta name="robots" content="noindex">
    @endif
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $title }}</title>
    @include('partials.hlava-brand')
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    {{ $hlava ?? '' }}
</head>
<body class="tt-web">
    <div class="topbar">
        <a href="{{ \App\Support\Domeny::url('web', '/') }}" class="brand-title">@include('partials.znacka')</a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
            <a href="{{ \App\Support\Domeny::url('web', '/pricing') }}">{{ __('web.cenik') }}</a>
            @include('partials.prepinac-rezimu')
            {{-- Přihlášení běží na app.tuptudu.com (vlastní session), web o přihlášení neví. --}}
            <a class="btn" href="{{ \App\Support\Domeny::url('app', '/login') }}">{{ __('obecne.prihlaseni') }}</a>
        </div>
    </div>
    <main class="tt-web-obsah">
        {{ $slot }}
    </main>
@include('partials.paticka')
@include('partials.error-tracker')
@include('partials.lokalizace-js')
@include('partials.cookies-lista')
</body>
</html>
