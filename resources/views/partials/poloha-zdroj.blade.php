{{-- Odkaz na DB-IP — licence CC BY 4.0 ho žádá na stránkách, které používají
     zemi podle IP (určení jazyka a země, App\Support\PolohaIp). Text se nepřekládá.
     Jen když ji stránka opravdu použila (NastavLokalizaci): přihlášený uživatel má zemi
     i jazyk v účtu a editor pak má celou výšku okna. Jinak jen tenký řádek. --}}
@if (request()->attributes->get('poloha_db_ip'))
<footer class="tt-poloha-zdroj"><a href="https://db-ip.com" rel="noopener">IP Geolocation by DB-IP</a></footer>
@endif
