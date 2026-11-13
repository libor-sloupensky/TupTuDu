{{-- Pruh náhledu (jen v Masterteamu) a krátké autorství. Celé autorství s výzvou k opravě je dole v metodice
     (Libor 13. 11. 2026: nahoře rušilo). Krátká věta nahoře zůstává, aby bylo od začátku jasné, že stránku píše výrobce
     jednoho ze srovnávaných nástrojů (skrytá reklama je nekalá praktika, modules/srovnani.md, Právní rámec). --}}
@if(! $s->verejne)
    <div class="sr-nahled">
        <b>Náhled z Masterteamu.</b> Generováno z analýzy konkurence (jen parametry a aplikace v režimu Sledovat).
        Hodnot bez dokladu: <b>{{ $bezDokladu }}</b>, jsou orámované a na webu se nezobrazí.
        @if($s->konkurent->maStranku('cs'))<a href="{{ \App\Http\Controllers\SrovnaniController::adresa($s->konkurent, 'cs', $vs ?? false) }}" style="color:inherit">Veřejná stránka</a> ·@endif
        <a href="/masterteam/konkurence" style="color:inherit">← Zpět na analýzu</a>
    </div>
@endif
<p class="sr-autor-kratce">
    {{ __('srovnani.autor_kratce', ['datum' => \App\Support\Lokalizace::datum($s->overeno()) ?? '—']) }}
    <a href="#metodika">{{ __('srovnani.metodika_nadpis') }}</a>
</p>
