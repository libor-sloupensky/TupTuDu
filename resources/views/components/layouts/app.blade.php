@props(['title' => 'TupTuDu', 'fullWidth' => false])
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex">
    <title>{{ $title }}</title>

    {{-- Tailwind utility třídy za běhu (bez build kroku) + Alpine. Brand styl viz /css/app.css. --}}
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="/css/app.css">
    <style>[x-cloak]{ display: none !important; }</style>
</head>
<body style="background: var(--c-bg);">
    <div class="tt-layout">
        @include('partials.sidebar')
        <main class="tt-main" style="{{ $fullWidth ? 'padding:.5rem;' : 'padding:2rem 1.5rem; max-width:72rem; margin:0 auto;' }}">
            {{ $slot }}
        </main>
    </div>

    {{-- Odchytávač JS chyb → /api/chyba (zobrazí se v /masterteam/chyby jako typ 'client'). --}}
    <script>
    (function () {
        var csrf = document.querySelector('meta[name=csrf-token]');
        csrf = csrf ? csrf.content : '';
        function posli(zprava, soubor, stack) {
            try {
                fetch('/api/chyba', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf, 'Accept': 'application/json' },
                    body: JSON.stringify({
                        zprava: String(zprava || '').slice(0, 500),
                        soubor: soubor || null,
                        stack: String(stack || '').slice(0, 8000),
                        uri: location.href,
                    }),
                });
            } catch (e) {}
        }
        window.addEventListener('error', function (e) {
            posli(e.message, (e.filename || '') + ':' + (e.lineno || ''), e.error && e.error.stack);
        });
        window.addEventListener('unhandledrejection', function (e) {
            var r = e.reason;
            posli((r && r.message) || r, null, r && r.stack);
        });
    })();
    </script>

    {{-- Alpine.js (plugin collapse před jádrem) — editor používá x-data/x-init. --}}
    <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>
