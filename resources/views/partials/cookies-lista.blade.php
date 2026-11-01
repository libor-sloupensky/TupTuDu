{{-- Cookie lišta + Google Analytics 4 (modules/marketing.md).

     Consent mode v2 v „základní" variantě: gtag.js se načte až po souhlasu s analytikou,
     bez souhlasu k Googlu neodejde vůbec nic. Zobrazí se jen s GA4_MEASUREMENT_ID
     (config services.ga4), takže lokálně a v masterteamu nic neměří.

     Volba se ukládá do cookie `tt_cookies` ({"v":1,"a":0|1,"m":0|1}) na celou doménu
     (.tuptudu.com — web, app i přihlášení sdílí jednu volbu), platí 12 měsíců.
     Změna volby: window.ttCookiesOtevrit() (odkaz „Nastavení cookies" v patičce).
     Marketingová volba (m) se zatím jen ukládá — uplatní se, až přibude měření Google Ads.

     Includovat na konec <body> AŽ ZA partials.error-tracker (používá window.zalogujChybu). --}}
@php
    // Masterteam (vč. jeho přihlašovací stránky, která sdílí layout prihlaseni) se neměří — interní část.
    $ttGa4 = \App\Support\Domeny::jeMasterteam() ? null : config('services.ga4.measurement_id');
    // Cookie na celé doméně webu (.tuptudu.com), aby volba platila i na app.; jinde (127.0.0.1) bez domény.
    $ttWebDomena = config('domeny.web')[0];
    $ttHost = request()->getHost();
    $ttCookieDomena = ($ttHost === $ttWebDomena || str_ends_with($ttHost, '.' . $ttWebDomena)) ? '.' . $ttWebDomena : '';
@endphp
@if ($ttGa4)
<div class="tt-cookies" id="tt-cookies" hidden role="dialog" aria-modal="false" aria-labelledby="tt-cookies-nadpis">
    <div class="tt-cookies-text">
        <strong id="tt-cookies-nadpis">{{ __('cookies.nadpis') }}</strong>
        <p>{{ __('cookies.text') }}
            <a href="{{ \App\Support\Domeny::url('web', '/privacy') }}">{{ __('cookies.vice') }}</a></p>
        <div class="tt-cookies-volby" id="tt-cookies-volby" hidden>
            <label><input type="checkbox" checked disabled> {{ __('cookies.nezbytne') }}</label>
            <label><input type="checkbox" id="tt-cookies-analytika"> {{ __('cookies.analytika') }}</label>
            <label><input type="checkbox" id="tt-cookies-marketing"> {{ __('cookies.marketing') }}</label>
        </div>
    </div>
    <div class="tt-cookies-tlacitka">
        <button type="button" class="btn btn-primary" data-volba="vse">{{ __('cookies.prijmout_vse') }}</button>
        <button type="button" class="btn" data-volba="nezbytne">{{ __('cookies.jen_nezbytne') }}</button>
        <button type="button" class="btn" data-volba="nastavit">{{ __('cookies.nastavit') }}</button>
        <button type="button" class="btn btn-primary" data-volba="ulozit" hidden>{{ __('cookies.ulozit') }}</button>
    </div>
</div>
<script>
(function () {
    var ID = @json($ttGa4);
    var COOKIE = 'tt_cookies';
    var DOMENA = @json($ttCookieDomena);
    var PLATNOST = 365 * 24 * 3600;

    var lista = document.getElementById('tt-cookies');
    var volby = document.getElementById('tt-cookies-volby');
    var chkAnalytika = document.getElementById('tt-cookies-analytika');
    var chkMarketing = document.getElementById('tt-cookies-marketing');
    var gtagNacten = false;

    // Stub gtag + výchozí consent (vše odmítnuto) — ještě před případným načtením gtag.js
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = window.gtag || gtag;
    gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
    });

    function nacistVolbu() {
        try {
            var kus = document.cookie.split('; ').find(function (c) { return c.indexOf(COOKIE + '=') === 0; });
            if (!kus) return null;
            var v = JSON.parse(decodeURIComponent(kus.slice(COOKIE.length + 1)));
            return (v && v.v === 1) ? { a: v.a ? 1 : 0, m: v.m ? 1 : 0 } : null;
        } catch (e) {
            window.zalogujChybu?.(e, 'Cookie lišta: čtení volby');
            return null;
        }
    }

    function zapsatCookie(nazev, hodnota, maxAge) {
        var s = nazev + '=' + hodnota + '; Max-Age=' + maxAge + '; Path=/; SameSite=Lax';
        if (DOMENA) s += '; Domain=' + DOMENA;
        if (location.protocol === 'https:') s += '; Secure';
        document.cookie = s;
    }

    function smazatGaCookies() {
        document.cookie.split('; ').forEach(function (c) {
            var nazev = c.split('=')[0];
            if (nazev === '_ga' || nazev.indexOf('_ga_') === 0) {
                zapsatCookie(nazev, '', 0);
                if (DOMENA) { // GA ukládá na nejvyšší doménu; smazat i variantu bez domény
                    document.cookie = nazev + '=; Max-Age=0; Path=/';
                }
            }
        });
    }

    function nacistGtag() {
        if (gtagNacten) return;
        gtagNacten = true;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ID);
        document.head.appendChild(s);
        gtag('js', new Date());
        gtag('config', ID);
    }

    function pouzitVolbu(volba) {
        gtag('consent', 'update', {
            analytics_storage: volba.a ? 'granted' : 'denied',
            ad_storage: volba.m ? 'granted' : 'denied',
            ad_user_data: volba.m ? 'granted' : 'denied',
            ad_personalization: volba.m ? 'granted' : 'denied',
        });
        if (volba.a) {
            nacistGtag();
        } else {
            smazatGaCookies();
        }
    }

    function ulozitVolbu(volba) {
        try {
            zapsatCookie(COOKIE, encodeURIComponent(JSON.stringify({ v: 1, a: volba.a, m: volba.m })), PLATNOST);
        } catch (e) {
            window.zalogujChybu?.(e, 'Cookie lišta: uložení volby', volba);
        }
        pouzitVolbu(volba);
        lista.hidden = true;
    }

    function zobrazit(rozbalit, volba) {
        chkAnalytika.checked = !!(volba && volba.a);
        chkMarketing.checked = !!(volba && volba.m);
        volby.hidden = !rozbalit;
        lista.querySelector('[data-volba=nastavit]').hidden = rozbalit;
        lista.querySelector('[data-volba=ulozit]').hidden = !rozbalit;
        lista.hidden = false;
    }

    lista.addEventListener('click', function (e) {
        var tlacitko = e.target.closest('[data-volba]');
        if (!tlacitko) return;
        switch (tlacitko.dataset.volba) {
            case 'vse': ulozitVolbu({ a: 1, m: 1 }); break;
            case 'nezbytne': ulozitVolbu({ a: 0, m: 0 }); break;
            case 'nastavit': zobrazit(true, nacistVolbu()); break;
            case 'ulozit': ulozitVolbu({ a: chkAnalytika.checked ? 1 : 0, m: chkMarketing.checked ? 1 : 0 }); break;
        }
    });

    window.ttCookiesOtevrit = function () { zobrazit(true, nacistVolbu()); };

    var ulozena = nacistVolbu();
    if (ulozena) {
        pouzitVolbu(ulozena);
    } else {
        zobrazit(false, null);
    }
})();
</script>
@endif
