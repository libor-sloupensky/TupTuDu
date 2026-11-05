/**
 * Chování článků na webu (modules/blog.md): výzva a poslání odkazu na počítač.
 * Události do GA4 jdou jen se souhlasem, gtag.js se bez něj nenačte (partials/cookies-lista).
 */
(function () {
    const clanek = document.querySelector('[data-clanek]')?.dataset.clanek || '';

    document.querySelectorAll('[data-vyzva-klik]').forEach((odkaz) => {
        odkaz.addEventListener('click', () => {
            window.gtag?.('event', 'clanek_vyzva', { clanek });
        });
    });

    document.querySelectorAll('[data-poslat-odkaz]').forEach((tlacitko) => {
        tlacitko.addEventListener('click', async () => {
            window.gtag?.('event', 'clanek_poslat_odkaz', { clanek });
            const adresa = location.origin + location.pathname;
            try {
                if (navigator.share) {
                    await navigator.share({ title: document.title, url: adresa });
                    return;
                }
                await navigator.clipboard.writeText(adresa);
                tlacitko.closest('[data-vyzva]')?.querySelector('[data-zkopirovano]')?.removeAttribute('hidden');
            } catch (e) {
                // Zavření nabídky sdílení není chyba
                if (e.name !== 'AbortError') window.zalogujChybu?.(e, 'Článek: poslání odkazu', { clanek });
            }
        });
    });
})();
