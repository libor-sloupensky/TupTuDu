{{-- Client error tracking — silent JS chyby do tabulky `bugy` (/masterteam/bugy, typ 'client').

     Sdílený partial — includovat v KAŽDÉM layoutu, jinak jsou chyby z těch
     stránek neviditelné. Vyžaduje <meta name="csrf-token"> v hlavičce.
     Do <head> patří navíc partials.hlasic-chyb-inline (nenačtené skripty/styly
     a chyby dřív, než se tenhle hlásič inicializuje).

     Endpoint /api/bug má rate limit 30/5min per IP + dedup přes hash.
     Kromě automatického zachytávání (window.onerror, unhandledrejection) vystavuje:
       - window.zalogujChybu(e, 'Kontext', {detaily})  — tichý zápis chyby
       - window.chybaUzivateli(e, 'Akce', {detaily})   — alert uživateli + zápis
     Obojí POVINNĚ v catch blocích (viz CLAUDE.md, „Hlášení chyb z frontendu"). --}}
<script>
(function () {
    const ENDPOINT = '/api/bug';
    const csrfToken = document.querySelector('meta[name=csrf-token]')?.content;

    // Throttle — max 10 unikátních zpráv per stránka
    const odeslano = new Set();
    let pocet = 0;

    function odeslat(payload) {
        // Bez CSRF tokenu se nic neposílá — helpery níž ale existovat musí vždy,
        // aby jejich volání v catch blocích nikdy nespadlo (ReferenceError).
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
     * Manuální report chyby z try/catch nebo volitelný kontextový log.
     * Bezpečné volat i když error tracking není dostupný (CSRF, network) —
     * nikdy nevyhodí výjimku.
     *
     * Použití:
     *   try { ... }
     *   catch (e) {
     *       console.error('Konva render selhal:', e);
     *       window.zalogujChybu?.(e, 'Konva render');
     *   }
     */
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

    // Síťové selhání fetch (Firefox „NetworkError when attempting to fetch resource.",
    // Chrome „Failed to fetch", Safari „Load failed") — viz zalogujChybu.
    const SITOVA_CHYBA = /NetworkError when attempting to fetch|^Failed to fetch$|^Load failed$|network error/i;

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
            // Přerušené spojení (odchod ze stránky během načítání, ztráta signálu) není
            // chyba kódu a nedá se opravit; výpadky serveru hlídá hlídač webu.
            if (SITOVA_CHYBA.test(zprava)) return;
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
     * Chyba, kterou VIDÍ uživatel — zároveň ji nahlásí do /masterteam/bugy.
     *
     * POUŽÍVAT VŽDY místo holého alert() v catch blocích. Bez tohoto se o
     * selhání nedozvíme: window.onerror zachytí jen NEODCHYCENÉ chyby, takže
     * všechno v try/catch je pro nás neviditelné — a přitom jsou to právě ty
     * nejbolestivější případy (nepovedený upload, neuložená práce), po kterých
     * uživatel mlčky odejde.
     *
     * Použití:
     *   catch (e) { chybaUzivateli(e, 'Uložení výkazu', { vvId, nazev }); }
     *   → uživatel uvidí: „Uložení výkazu se nezdařilo: <důvod>"
     *   → nám do bugů spadne zpráva + stack + ty detaily
     *
     * @param chyba   Error nebo text
     * @param akce    co se nepovedlo, lidsky („Uložení výkazu")
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

    // Chyby, které nejsou naše: Firefox hlásí „Permission denied to access property",
    // když Alpine (MutationObserver) narazí na uzel vložený rozšířením prohlížeče.
    const IGNOROVAT = [/Permission denied to access property/i];

    window.addEventListener('error', function (e) {
        const msg = e.message || (e.error && e.error.message) || 'Unknown error';
        if (!msg || msg === 'Script error.') return;
        if (IGNOROVAT.some(re => re.test(msg))) return;
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
            // Zamítnutí prázdným objektem / null (iOS Chrome, překladače, rozšíření)
            // nenese žádnou informaci — v bugách jen šum („{}" bez stacku).
            if (msg === '{}' || msg === 'null' || msg === undefined) return;
        }
        if (SITOVA_CHYBA.test(msg)) return;
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
