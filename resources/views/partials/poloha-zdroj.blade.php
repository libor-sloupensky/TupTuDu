{{-- Odkaz na DB-IP — licence CC BY 4.0 ho žádá na stránkách, které používají
     zemi podle IP (určení jazyka a země, App\Support\PolohaIp). Text se nepřekládá.
     Jen když ji stránka opravdu použila (NastavLokalizaci): přihlášený uživatel má zemi
     i jazyk v účtu a odkaz pak není. V editoru leží na konci pravého panelu, výšku plochy nebere. --}}
@if (request()->attributes->get('poloha_db_ip'))
<div class="tt-poloha-zdroj"><a href="https://db-ip.com" rel="noopener">IP Geolocation by DB-IP</a></div>
@endif
