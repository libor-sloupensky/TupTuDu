{{-- Metodika a zdroje: povinná část každé srovnávací stránky (modules/srovnani.md, Právní rámec). --}}
<section class="sr-metodika">
    <h2 style="font-size:18px;margin-top:0">Jak jsme srovnávali</h2>
    <p>Pro všechny nástroje používáme stejnou sadu vlastností a stejná pravidla, kdy je vlastnost „má“, „částečně“ a „nemá“.
        Každý údaj má zdroj a datum ověření. Údaje starší než šest měsíců nezobrazujeme. Hodnocení hvězdičkami ani vítěze nevyhlašujeme.
        Co se nepodařilo ověřit, je označené jako nezjištěno.</p>
    <p>Ceny jsou z ceníků výrobců. Zahraniční ceny přepočítáváme kurzem ČNB k uvedenému datu a většinou jsou bez DPH.</p>
    <p><b>Zastupuješ {{ $s->konkurent->kratky ?: $s->konkurent->nazev }}?</b> Napiš nám přes <a href="/cs/contact">kontaktní formulář</a>.
        Údaj ověříme, opravíme a u stránky uvedeme datum opravy.</p>
    <p>{{ $s->konkurent->kratky ?: $s->konkurent->nazev }} je ochranná známka svého vlastníka. TupTuDu s ním není nijak spojené.</p>
    @if(! empty($zdroje))
        <details style="margin-top:8px"><summary>Zdroje ({{ count($zdroje) }})</summary>
            <ul style="margin-top:6px">@foreach($zdroje as $z)<li style="overflow-wrap:anywhere">{{ $z }}</li>@endforeach</ul>
        </details>
    @endif
</section>
