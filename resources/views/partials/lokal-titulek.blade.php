{{-- Jen na lokálu (APP_ENV=local): značka před titulkem stránky, ať je v liště prohlížeče hned vidět,
     která záložka je localhost a která produkce (Libor 13. 11. 2026). Hlídá i titulek, který mění JS.
     Vkládá ho partials.error-tracker, takže platí ve všech layoutech. Na produkci se nevypíše vůbec. --}}
@if (app()->environment('local'))
<script>
(function () {
    var ZNACKA = '🛠 ';
    function oznac() {
        if (document.title.indexOf(ZNACKA) !== 0) document.title = ZNACKA + document.title;
    }
    oznac();
    var t = document.querySelector('title');
    if (t && window.MutationObserver) new MutationObserver(oznac).observe(t, { childList: true, characterData: true, subtree: true });
})();
</script>
@endif
