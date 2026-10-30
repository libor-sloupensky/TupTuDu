@props(['title' => 'TupTuDu'])
{{-- Layout veřejného webu (tuptudu.com): vitrína, právní stránky, kontakt.
     Vlastní styly stránky jdou do slotu `hlava`. --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Web zatím neindexovat (vitrína „v přípravě") — při spuštění odstranit, viz modules/aplikace.md --}}
    <meta name="robots" content="noindex">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $title }}</title>
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    {{ $hlava ?? '' }}
</head>
<body class="tt-web">
    <div class="topbar">
        <a href="{{ \App\Support\Domeny::url('web', '/') }}" class="brand-title"><span class="brand">TupTuDu</span></a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
            <a href="{{ \App\Support\Domeny::url('web', '/pricing') }}">{{ __('web.cenik') }}</a>
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
</body>
</html>
