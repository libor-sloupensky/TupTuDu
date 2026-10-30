@props(['title' => 'TupTuDu'])
{{-- Layout přihlašovacích stránek (login, registrace, obnova hesla, ověření e-mailu). --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $title }}</title>
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
</head>
<body>
    <div class="tt-prihlaseni">
        <main class="card">
            {{ $slot }}
            @include('partials.prepinac-jazyka')
        </main>
    </div>
@include('partials.paticka')
@include('partials.error-tracker')
@include('partials.lokalizace-js')
</body>
</html>
