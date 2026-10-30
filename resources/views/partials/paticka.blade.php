{{-- Patička zákaznických stránek (web, přihlášení, aplikace mimo editor).
     Odkazy vždy na tuptudu.com — právní stránky a kontakt žijí jen na webu.
     DB-IP: licence CC BY 4.0 žádá odkaz na stránkách, které používají zemi podle IP
     (App\Support\PolohaIp); text se nepřekládá. Editor má místo patičky jen ten odkaz
     (partials/poloha-zdroj). --}}
<footer class="tt-paticka">
    {{-- Ceník, podmínky, zásady a vrácení peněz musí být dostupné bez přihlášení (požadavek Paddlu) --}}
    <nav>
        <a href="{{ \App\Support\Domeny::url('web', '/pricing') }}">{{ __('web.cenik') }}</a>
        <a href="{{ \App\Support\Domeny::url('web', '/terms') }}">{{ __('pravni.podminky_titulek') }}</a>
        <a href="{{ \App\Support\Domeny::url('web', '/privacy') }}">{{ __('pravni.soukromi_titulek') }}</a>
        <a href="{{ \App\Support\Domeny::url('web', '/refunds') }}">{{ __('pravni.vraceni_titulek') }}</a>
        <a href="{{ \App\Support\Domeny::url('web', '/contact') }}">{{ __('kontakt.titulek') }}</a>
    </nav>
    <div class="tt-paticka-spodek">
        © {{ date('Y') }} WormUP s.r.o. · <a href="https://db-ip.com" rel="noopener">IP Geolocation by DB-IP</a>
    </div>
</footer>
