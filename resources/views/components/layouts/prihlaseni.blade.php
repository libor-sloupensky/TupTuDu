@props(['title' => 'TupTuDu'])
{{-- Layout přihlašovacích stránek (login, registrace, obnova hesla, ověření e-mailu). --}}
<!DOCTYPE html>
{{-- Tmavý režim je výchozí; světlý podle cookie tt_rezim (partials/prepinac-rezimu) --}}
<html lang="{{ app()->getLocale() }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $title }}</title>
    @include('partials.hlava-brand')
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
</head>
<body>
    <div class="tt-prihlaseni">
        <main class="card">
            {{ $slot }}
            @include('partials.prepinac-jazyka')
            @include('partials.prepinac-rezimu')
        </main>
    </div>
@include('partials.paticka')
@include('partials.error-tracker')
@include('partials.lokalizace-js')
@include('partials.cookies-lista')
</body>
</html>
