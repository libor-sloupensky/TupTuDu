{{-- Rám právní stránky (PravniController). Obsah = celý dokument v jazyce návštěvníka. --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Návrh textu — do schválení právníkem neindexovat --}}
    <meta name="robots" content="noindex">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $titulek }} — TupTuDu</title>
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
</head>
<body>
    <div class="topbar">
        <a href="{{ \App\Support\Domeny::url('web', '/') }}" class="brand-title"><span class="brand">TupTuDu</span></a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
        </div>
    </div>
    <article class="tt-pravni">
        @include($obsah)
    </article>
@include('partials.poloha-zdroj')
@include('partials.error-tracker')
@include('partials.lokalizace-js')
</body>
</html>
