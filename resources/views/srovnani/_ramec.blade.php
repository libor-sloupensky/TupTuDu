{{-- Pruh náhledu (jen v Masterteamu) a řádek autorství. Autorství musí být vidět hned nahoře: stránku píše
     výrobce jednoho ze srovnávaných nástrojů, skrytá reklama je nekalá praktika (modules/srovnani.md, Právní rámec). --}}
@if($nahled ?? false)
    <div class="sr-nahled">
        <b>Náhled, na webu není.</b> Generováno z analýzy konkurence (jen parametry a aplikace v režimu Sledovat).
        Hodnot bez dokladu: <b>{{ $bezDokladu }}</b>. Jsou orámované a na webu by se nezobrazily.
        <a href="/masterteam/konkurence" style="color:inherit">← Zpět na analýzu</a>
    </div>
@endif
<p class="sr-autor">
    Sestavil tým TupTuDu, tedy výrobce jednoho ze srovnávaných nástrojů. Stav k {{ $s->mereni?->datum->format('j. n. Y') ?? '—' }}.
    Údaje bereme z webu, ceníku a nápovědy výrobce a z vlastního vyzkoušení. Našel jsi nepřesnost? <a href="/cs/contact">Napiš nám</a>, ověříme a opravíme.
</p>
