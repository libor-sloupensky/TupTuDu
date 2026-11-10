@props([
    'title' => 'TupTuDu',
    'popis' => null,        // popis stránky pro výsledky hledání a náhled při sdílení
    'verze' => null,        // jazykové verze stránky: kód => adresa; výchozí všechny, článek předá jen své verze
    'kanonicka' => null,    // kanonická adresa, výchozí je verze v aktuálním jazyce, jinak adresa stránky
    'prepinac' => null,     // kam vedou odkazy přepínače jazyka, výchozí jsou jazykové verze
    'obrazek' => null,      // náhled při sdílení, cesta od kořene webu
    'ogTyp' => 'website',
    'neindexovat' => false, // stránka, která do vyhledávačů nepatří (právní texty); odkazy z ní roboti dál sledují
])
{{-- Layout veřejného webu (tuptudu.com): vitrína, právní stránky, kontakt, články.
     Vlastní styly stránky jdou do slotu `hlava`. --}}
@php
    use App\Support\Clanky;
    use App\Support\Domeny;
    use App\Support\Lokalizace;

    $ttJazyk = app()->getLocale();
    $verze ??= Domeny::jeWeb() ? Lokalizace::verzeStranky('/' . Domeny::cestaBezJazyka(request()->path())) : [];
    $ttKanonicka = $kanonicka ?? ($verze[$ttJazyk] ?? Domeny::url('web', request()->path()));
    $ttClanky = isset(Clanky::SEGMENTY[$ttJazyk]) && Clanky::vsechny($ttJazyk) !== [];
@endphp
<!DOCTYPE html>
{{-- Tmavý režim je výchozí; světlý podle cookie tt_rezim (partials/prepinac-rezimu) --}}
<html lang="{{ $ttJazyk }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Indexuje se jen tuptudu.com (od 1. 11. 2026). Stejná titulka běží i na app.tuptudu.com (kvůli Paddle)
         a lokálně — tam noindex, ať Google nemá duplicitu. Kanonická adresa vždy na www. --}}
    @if (Domeny::jeWeb() && $neindexovat)
    <meta name="robots" content="noindex, follow">
    @elseif (Domeny::jeWeb())
    <link rel="canonical" href="{{ $ttKanonicka }}">
    @if (count($verze) > 1)
    @foreach ($verze as $kod => $adresa)
    <link rel="alternate" hreflang="{{ $kod }}" href="{{ $adresa }}">
    @endforeach
    {{-- x-default jen na anglickou verzi; článek bez ní ho nemá, cizinci by jinak dostali češtinu --}}
    @isset($verze[config('lokalizace.vychozi_jazyk')])
    <link rel="alternate" hreflang="x-default" href="{{ $verze[config('lokalizace.vychozi_jazyk')] }}">
    @endisset
    @endif
    @else
    <meta name="robots" content="noindex">
    @endif
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $title }}</title>
    @if ($popis)
    <meta name="description" content="{{ $popis }}">
    <meta property="og:description" content="{{ $popis }}">
    @endif
    <meta property="og:title" content="{{ $title }}">
    <meta property="og:type" content="{{ $ogTyp }}">
    <meta property="og:url" content="{{ $ttKanonicka }}">
    <meta property="og:site_name" content="TupTuDu">
    <meta property="og:locale" content="{{ ['cs' => 'cs_CZ', 'en' => 'en_GB', 'sk' => 'sk_SK', 'pl' => 'pl_PL', 'de' => 'de_DE', 'fr' => 'fr_FR', 'es' => 'es_ES', 'it' => 'it_IT'][$ttJazyk] ?? $ttJazyk }}">
    <meta property="og:image" content="{{ Domeny::url('web', $obrazek ?? '/img/vitrina/dum-3d.png') }}">
    <meta name="twitter:card" content="summary_large_image">
    @include('partials.hlava-brand')
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    {{ $hlava ?? '' }}
</head>
<body class="tt-web">
    <div class="topbar">
        <a href="{{ Lokalizace::adresaWebu('/') }}" class="brand-title">@include('partials.znacka')</a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka', ['verze' => $prepinac ?? $verze])
            @if ($ttClanky)
            <a href="{{ Clanky::adresaPrehledu($ttJazyk) }}">{{ __('web.clanky') }}</a>
            @endif
            <a href="{{ Lokalizace::adresaWebu('/pricing') }}">{{ __('web.cenik') }}</a>
            @include('partials.prepinac-rezimu')
            {{-- Přihlášení běží na app.tuptudu.com (vlastní session), web o přihlášení neví. --}}
            <a class="btn" href="{{ Domeny::url('app', '/login') }}">{{ __('obecne.prihlaseni') }}</a>
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
