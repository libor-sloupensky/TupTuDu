@props(['title' => 'TupTuDu', 'fullWidth' => false])
{{-- Layout zákaznické aplikace (app.tuptudu.com). Hlavička místo menu masterteamu;
     Tailwind + Alpine stejně jako layouts.app (editor V3 je potřebuje). --}}
<!DOCTYPE html>
{{-- Režim podle cookie tt_rezim: kdo si ho přepne na webu, má ho i tady (výchozí tmavý, Libor 11. 11. 2026) --}}
<html lang="{{ app()->getLocale() }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <meta name="robots" content="noindex">
    <title>{{ $title }}</title>
    @include('partials.hlava-brand')

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
        <a href="{{ route('app.projekty') }}" class="brand-title">@include('partials.znacka')</a>
        <div class="topbar-akce">
            @include('partials.prepinac-jazyka')
            @include('partials.prepinac-rezimu')
            @if (auth()->user()->jeMaster())
                <a href="{{ \App\Support\Domeny::url('masterteam', '/masterteam') }}">{{ __('aplikace.do_masterteamu') }}</a>
            @endif
            <a href="{{ route('app.predplatne') }}" class="{{ request()->routeIs('app.predplatne*') ? 'aktivni' : '' }}">{{ __('aplikace.predplatne') }}</a>
            <a href="{{ route('app.ucet') }}" class="{{ request()->routeIs('app.ucet*') ? 'aktivni' : '' }}">{{ __('aplikace.ucet') }}</a>
            <form method="POST" action="/logout">
                @csrf
                <button type="submit" class="btn btn-sm">{{ __('obecne.odhlasit') }}</button>
            </form>
        </div>
    </header>

    {{-- Editor (fullWidth) bez okraje, každý pixel plochy se hodí (Libor 13. 11. 2026) --}}
    <main class="tt-zakaznik-obsah" style="{{ $fullWidth ? 'padding:0;' : 'padding:2rem 1.5rem; max-width:48rem; margin:0 auto;' }}">
        {{ $slot }}
    </main>

    {{-- Editor (fullWidth) zabírá celé okno: bez patičky, povinný odkaz na DB-IP má v pravém panelu --}}
    @unless ($fullWidth)
        @include('partials.paticka')
    @endunless
    @include('partials.error-tracker')
    @include('partials.lokalizace-js')
    @include('partials.cookies-lista')

    <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>
