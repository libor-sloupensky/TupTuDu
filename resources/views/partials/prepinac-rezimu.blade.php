{{-- Přepínač tmavý / světlý režim. Volba v cookie tt_rezim (rok, na celé doméně webu jako u cookie lišty),
     server ji čte v layoutu a nastaví <html data-theme>, takže stránka nebliká. Cookie je nešifrovaná
     (bootstrap/app.php: encryptCookies except). Zatím jen web a přihlášení — editor čeká na úpravu
     Tailwind tříd, layouty app/zakaznik drží data-theme="light". --}}
@php
    $ttWebDomena = config('domeny.web')[0];
    $ttHost = request()->getHost();
    $ttRezimDomena = ($ttHost === $ttWebDomena || str_ends_with($ttHost, '.' . $ttWebDomena)) ? '.' . $ttWebDomena : '';
    $ttSvetly = request()->cookie('tt_rezim') === 'light';
@endphp
<button type="button" class="tt-rezim" data-rezim aria-pressed="{{ $ttSvetly ? 'true' : 'false' }}"
        title="{{ __('obecne.rezim_prepnout') }}" aria-label="{{ __('obecne.rezim_prepnout') }}">
    <svg class="tt-rezim-slunce" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>
    <svg class="tt-rezim-mesic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>
</button>
@once
<script>
(function () {
    var DOMENA = @json($ttRezimDomena);
    var html = document.documentElement;
    function nastav(rezim) {
        html.setAttribute('data-theme', rezim);
        var s = 'tt_rezim=' + rezim + '; Max-Age=' + (365 * 24 * 3600) + '; Path=/; SameSite=Lax';
        if (DOMENA) s += '; Domain=' + DOMENA;
        if (location.protocol === 'https:') s += '; Secure';
        document.cookie = s;
        document.querySelectorAll('[data-rezim]').forEach(function (b) { b.setAttribute('aria-pressed', String(rezim === 'light')); });
        var meta = document.querySelector('meta[name=theme-color]');
        if (meta) meta.setAttribute('content', getComputedStyle(document.body).backgroundColor);
    }
    document.querySelectorAll('[data-rezim]').forEach(function (b) {
        b.addEventListener('click', function () {
            nastav(html.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
        });
    });
})();
</script>
@endonce
