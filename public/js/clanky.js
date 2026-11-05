/**
 * Chování článků na webu (modules/blog.md): výzva a poslání odkazu na počítač.
 * Události do GA4 jdou jen se souhlasem, gtag.js se bez něj nenačte (partials/cookies-lista).
 */
(function () {
    const clanek = document.querySelector('[data-clanek]')?.dataset.clanek || '';
    // Stejná podmínka jako .tt-jen-dotyk v app.css: editor zatím kreslí jen myší
    const jeDotyk = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

    async function poslatOdkaz(prvek) {
        window.gtag?.('event', 'clanek_poslat_odkaz', { clanek });
        const adresa = location.origin + location.pathname;
        try {
            if (navigator.share) {
                await navigator.share({ title: document.title, url: adresa });
                return;
            }
            await navigator.clipboard.writeText(adresa);
            prvek.closest('[data-vyzva]')?.querySelector('[data-zkopirovano]')?.removeAttribute('hidden');
        } catch (e) {
            // Zavření nabídky sdílení není chyba
            if (e.name !== 'AbortError') window.zalogujChybu?.(e, 'Článek: poslání odkazu', { clanek });
        }
    }

    document.querySelectorAll('[data-vyzva-klik]').forEach((odkaz) => {
        odkaz.addEventListener('click', (e) => {
            // Odkaz do aplikace přímo v textu: na dotyku nabídne poslat si článek, kreslit se tam nedá
            if (odkaz.hasAttribute('data-dotyk-poslat') && jeDotyk()) {
                e.preventDefault();
                poslatOdkaz(odkaz);
                return;
            }
            window.gtag?.('event', 'clanek_vyzva', { clanek });
        });
    });

    document.querySelectorAll('[data-poslat-odkaz]').forEach((tlacitko) => {
        tlacitko.addEventListener('click', () => poslatOdkaz(tlacitko));
    });
})();
