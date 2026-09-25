{{-- Odchytávač JS chyb → /api/chyba (zobrazí se v /masterteam/chyby jako typ 'client').

     Sdílený partial — includovat v KAŽDÉM layoutu, jinak jsou chyby z těch
     stránek neviditelné. Vyžaduje <meta name="csrf-token"> v hlavičce.

     Převzato z kalkulia (resources/js/app.js). Endpoint má rate limit
     30/5 min per IP + dedup přes hash. Kromě automatického zachytávání
     (window.onerror, unhandledrejection) vystavuje:
       - window.zalogujChybu(e, 'Kontext', {detaily})  — tichý zápis chyby
       - window.chybaUzivateli(e, 'Akce', {detaily})   — alert uživateli + zápis
     Obojí POVINNĚ v catch blocích (viz CLAUDE.md, „Hlášení chyb z frontendu"). --}}
<script>
(function () {
    const ENDPOINT = '/api/chyba';
    const csrfToken = document.querySelector('meta[name=csrf-token]')?.content;

    // Throttle — max 10 unikátních zpráv per stránka
    const odeslano = new Set();
    let pocet = 0;

    function odeslat(payload) {
        // Bez CSRF tokenu by server odpověděl 419 — helpery níž ale existovat
        // musí vždy, aby jejich volání v catch blocích nikdy nespadlo.
        if (!csrfToken) return;
        if (pocet >= 10) return;
        const klic = payload.zprava + '|' + payload.soubor;
        if (odeslano.has(klic)) return;
        odeslano.add(klic);
        pocet++;
        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, 'Accept': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => {});
    }

    /**
     * Serializace detailů k chybě (co uživatel dělal / rozepsaná data).
     * Citlivé klíče se NIKDY neodesílají — filtrují se už tady na klientovi.
     */
    function bezpecneDetaily(detaily) {
        if (detaily === undefined || detaily === null) return null;
        const citlive = /(heslo|password|passwd|token|secret|csrf|authorization|auth|pin|cvv|rodne)/i;
        try {
            const txt = typeof detaily === 'string'
                ? detaily
                : JSON.stringify(detaily, (k, v) => (citlive.test(k) ? '[skryto]' : v));
            return txt ? String(txt).substring(0, 2000) : null;
        } catch (_) {
            return null;
        }
    }

    /**
     * Manuální report chyby z try/catch nebo volitelný kontextový log.
     * Bezpečné volat i když error tracking není dostupný (CSRF, network) —
     * nikdy nevyhodí výjimku.
     *
     * Použití:
     *   catch (e) {
     *       status.textContent = 'Chyba připojení.';
     *       window.zalogujChybu?.(e, 'Uložení kategorií', { firmaIco });
     *   }
     */
    window.zalogujChybu = function (errorOrMessage, kontext, detaily) {
        try {
            let zprava, stack;
            if (errorOrMessage instanceof Error) {
                zprava = errorOrMessage.message || errorOrMessage.name || 'Unknown error';
                stack = errorOrMessage.stack ? String(errorOrMessage.stack) : null;
            } else if (typeof errorOrMessage === 'string') {
                zprava = errorOrMessage;
                stack = null;
            } else {
                try { zprava = JSON.stringify(errorOrMessage); } catch (_) { zprava = String(errorOrMessage); }
                stack = null;
            }
            // Kontext (= popis kde se chyba stala) se přidá před zprávu
            const prefix = kontext ? `[${kontext}] ` : '';
            odeslat({
                zprava: (prefix + zprava).substring(0, 500),
                soubor: kontext || 'manual',
                stack: stack ? stack.substring(0, 8000) : null,
                uri: location.href.substring(0, 500),
                uroven: 'error',
                kontext: bezpecneDetaily(detaily),
            });
        } catch (_) {
            // Polkneme — error tracking nesmí shodit volajícího
        }
    };

    /**
     * Chyba, kterou VIDÍ uživatel — zároveň ji nahlásí do /masterteam/chyby.
     *
     * POUŽÍVAT VŽDY místo holého alert() v catch blocích. Bez tohoto se o
     * selhání nedozvíme: window.onerror zachytí jen NEODCHYCENÉ chyby, takže
     * všechno v try/catch je pro nás neviditelné — a přitom jsou to právě ty
     * nejbolestivější případy (nepovedený upload, neuložená práce), po kterých
     * uživatel mlčky odejde.
     *
     * Použití:
     *   catch (e) { chybaUzivateli(e, 'Uložení nastavení', { firmaIco }); }
     *   → uživatel uvidí: „Uložení nastavení se nezdařilo: <důvod>"
     *   → nám do chyb spadne zpráva + stack + ty detaily
     *
     * @param chyba   Error nebo text
     * @param akce    co se nepovedlo, lidsky („Uložení nastavení")
     * @param detaily volitelný objekt s kontextem (ID, rozepsaná data).
     *                Citlivé klíče se odfiltrují automaticky.
     */
    window.chybaUzivateli = function (chyba, akce, detaily) {
        const zprava = chyba instanceof Error
            ? (chyba.message || chyba.name || 'Neznámá chyba')
            : String(chyba);

        // Hlásit DŘÍV než alert — ten blokuje vlákno a uživatel může zavřít kartu.
        try { window.zalogujChybu(chyba, akce, detaily); } catch (_) {}

        try { console.error(akce ? akce + ':' : 'Chyba:', chyba); } catch (_) {}
        alert((akce ? akce + ' se nezdařilo: ' : '') + zprava);

        return zprava;
    };

    window.addEventListener('error', function (e) {
        const msg = e.message || (e.error && e.error.message) || 'Unknown error';
        if (!msg || msg === 'Script error.') return;
        odeslat({
            zprava: msg.substring(0, 500),
            soubor: (e.filename ? e.filename.split('/').pop() : '') + (e.lineno ? ':' + e.lineno : ''),
            stack: e.error?.stack ? String(e.error.stack).substring(0, 8000) : null,
            uri: location.href.substring(0, 500),
            uroven: 'error',
        });
    });

    window.addEventListener('unhandledrejection', function (e) {
        const reason = e.reason;
        let msg = 'Unhandled promise rejection';
        let stack = null;
        if (reason instanceof Error) {
            msg = reason.message || msg;
            stack = reason.stack ? String(reason.stack) : null;
        } else if (typeof reason === 'string') {
            msg = reason;
        } else {
            try { msg = JSON.stringify(reason).substring(0, 500); } catch (_) {}
        }
        odeslat({
            zprava: msg.substring(0, 500),
            soubor: 'promise',
            stack: stack ? stack.substring(0, 8000) : null,
            uri: location.href.substring(0, 500),
            uroven: 'error',
        });
    });
})();
</script>
