{{--
    Miniaturní hlásič chyb, který běží DŘÍV než Vite bundle (app.js).
    Plný hlásič (window.zalogujChybu) žije uvnitř bundlu — když se bundle
    nenačte (rozbitý deploy 24. 9. 2026, výpadek CDN, blokace), nehlásí nic
    a web je pro nás potichu mrtvý. Tenhle kousek zachytí:
      - selhání načtení skriptu nebo stylu (window 'error' v capture fázi),
      - JS chyby, které nastanou před inicializací plného hlásiče.
    Jakmile plný hlásič naběhne, tenhle už JS chyby nepřebírá (jen resource
    chyby, které window.onerror nevidí). Max 3 hlášení na stránku.
--}}
<script>
(function () {
    var t = document.querySelector('meta[name=csrf-token]'); if (!t) return;
    var n = 0, s = {}, obnovuji = false;
    // 404 u /build/assets = stránka z mezipaměti prohlížeče (obnovená karta, tlačítko Zpět)
    // odkazuje na soubory, které nasazení nahradilo novými (bug 3620, 23. 10. 2026).
    // Jednou stránku načíst znovu — čerstvé HTML má aktuální soubory. Když soubor chybí
    // i po obnově (do minuty), je build opravdu rozbitý a hlásí se.
    function obnov() {
        if (obnovuji) return true;
        var k = 'kk-obnova-po-nasazeni', ted = Date.now(), minule = 0;
        try { minule = +sessionStorage.getItem(k) || 0; sessionStorage.setItem(k, String(ted)); } catch (e) { return false; }
        if (ted - minule < 60000) return false;
        obnovuji = true;
        location.reload();
        return true;
    }
    function h(z, k) {
        if (n >= 3 || s[z]) return; s[z] = 1; n++;
        try {
            fetch('/api/bug', { method: 'POST', keepalive: true,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': t.content, 'Accept': 'application/json' },
                body: JSON.stringify({ zprava: z.substring(0, 500), soubor: k, uri: location.href.substring(0, 500), uroven: 'error' }) })
            .catch(function () {});
        } catch (e) {}
    }
    window.addEventListener('error', function (e) {
        var el = e.target;
        if (el && el !== window && (el.tagName === 'SCRIPT' || el.tagName === 'LINK')) {
            var u = String(el.src || el.href || '');
            // Jen vlastní zdroje — cizí (gtag, pixel) blokují adblockery, to není náš bug.
            // Vlastní zdroj: nejdřív ověřit, že na serveru opravdu chybí (404/500 = starý
            // manifest po deployi, rozbitý build). Přechodné výpadky sítě / přerušené
            // načítání na mobilu dávaly jen šum (8 hlášení za týden, assety v pořádku).
            if (u.indexOf(location.origin + '/') === 0) {
                try {
                    fetch(u, { method: 'HEAD', cache: 'no-store' }).then(function (r) {
                        if (r.status < 400) return;
                        if (r.status === 404 && u.indexOf('/build/assets/') > 0 && obnov()) return;
                        h('Nepodařilo se načíst ' + el.tagName.toLowerCase() + ' (HTTP ' + r.status + '): ' + u, 'nacteni-zdroje');
                    }).catch(function () {});
                } catch (e) {}
            }
        } else if (!window.zalogujChybu && e.message && e.message !== 'Script error.') {
            h(e.message, (e.filename ? e.filename.split('/').pop() : 'inline') + (e.lineno ? ':' + e.lineno : ''));
        }
    }, true);
})();
</script>
