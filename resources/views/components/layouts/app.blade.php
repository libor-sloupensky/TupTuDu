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
<body class="min-h-screen bg-gray-50 {{ $fullWidth ? '' : 'max-w-6xl mx-auto px-4 py-8' }}">
    {{ $slot }}

    {{-- Alpine.js (plugin collapse před jádrem) — editor používá x-data/x-init. --}}
    <script defer src="https://cdn.jsdelivr.net/npm/@alpinejs/collapse@3.x.x/dist/cdn.min.js"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
</body>
</html>
