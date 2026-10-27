@props(['title' => 'TupTuDu', 'fullWidth' => false])
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    @include('partials.hlasic-chyb-inline')
    <meta name="robots" content="noindex">
    <title>{{ $title }}</title>

    {{-- Tailwind utility třídy za běhu (bez build kroku) + Alpine. Brand styl viz /css/app.css. --}}
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Brand barva pro třídy bg-primary / text-primary / border-primary (i s průhledností
        // bg-primary/20) — bez toho je Tailwind nezná a např. aktivní záložka je bílá na bílé.
        // Hodnoty jen z CSS proměnných v /css/app.css, žádný hex.
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
    <div class="tt-layout">
        @include('partials.sidebar')
        <main class="tt-main" style="{{ $fullWidth ? 'padding:.5rem;' : 'padding:2rem 1.5rem; max-width:72rem; margin:0 auto;' }}">
            {{ $slot }}
        </main>
    </div>

    @include("partials.error-tracker")

    {{-- Alpine.js (plugin collapse před jádrem) — editor používá x-data/x-init. --}}
    <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>
