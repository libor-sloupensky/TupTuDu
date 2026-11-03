{{-- Ikony, manifest, barva lišty prohlížeče a přednačtení písem — do <head> každého layoutu za <title>.
     Soubory: public/brand (generuje services/znacka-svg.py), písma public/fonts (viz modules/brand.md).
     Barva lišty = --c-bg z /css/app.css pro daný režim (meta neumí číst CSS proměnnou);
     po přepnutí režimu ji přepíše partials/prepinac-rezimu. --}}
<link rel="icon" href="/brand/ikona-tmave.svg" type="image/svg+xml">
<link rel="icon" href="/brand/ikona-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/brand/ikona-180.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="{{ request()->cookie('tt_rezim') === 'light' ? '#f3f5f9' : '#141a24' }}">
<link rel="preload" href="/fonts/rubik-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/plex-latin.woff2" as="font" type="font/woff2" crossorigin>
