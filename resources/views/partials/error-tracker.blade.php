{{-- Odchytávač JS chyb → /api/chyba (zobrazí se v /masterteam/chyby jako typ 'client').

     Sdílený partial — includovat v KAŽDÉM layoutu, jinak jsou chyby z těch
     stránek neviditelné. Vyžaduje <meta name="csrf-token"> v hlavičce. --}}
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
