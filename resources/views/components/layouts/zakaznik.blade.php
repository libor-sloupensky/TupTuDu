@props(['title' => 'TupTuDu', 'fullWidth' => false])
{{-- Layout zákaznické aplikace (app.tuptudu.com). Hlavička místo menu masterteamu;
     Tailwind + Alpine stejně jako layouts.app (editor V3 je potřebuje). --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <meta name="robots" content="noindex">
    <title>{{ $title }}</title>

    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Brand barvy jen z CSS proměnných v /css/app.css (viz layouts.app)
        const ttBarva = (promenna) => `color-mix(in srgb, var(${promenna}) calc(<alpha-value> * 100%), transparent)`;
        tailwind.config = {
            theme: { extend: { colors: {
                primary: { DEFAULT: ttBarva('--c-primary'), dark: ttBarva('--c-primary-text') },
            } } },
        };
    </script>
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    <style>[x-cloak]{ display: none !important; }</style>
</head>
<body style="background: var(--c-bg);">
    <header class="topbar tt-zakaznik-hlavicka">
        <a href="{{ route('app.projekty') }}" class="brand-title"><span class="brand">TupTuDu</span></a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
            @if (auth()->user()->jeMaster())
                <a href="{{ \App\Support\Domeny::url('masterteam', '/masterteam') }}">{{ __('aplikace.do_masterteamu') }}</a>
            @endif
            <a href="{{ route('app.ucet') }}" class="{{ request()->routeIs('app.ucet*') ? 'aktivni' : '' }}">{{ __('aplikace.ucet') }}</a>
            <form method="POST" action="/logout">
                @csrf
                <button type="submit" class="btn btn-sm">{{ __('obecne.odhlasit') }}</button>
            </form>
        </div>
    </header>

    <main class="tt-zakaznik-obsah" style="{{ $fullWidth ? 'padding:.5rem;' : 'padding:2rem 1.5rem; max-width:48rem; margin:0 auto;' }}">
        {{ $slot }}
    </main>

    @include('partials.poloha-zdroj')
    @include('partials.error-tracker')
    @include('partials.lokalizace-js')

    <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>
