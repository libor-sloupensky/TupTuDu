{{-- „X vs TupTuDu“ (modules/srovnani.md, Druhy stránek 2): ceny nahoře, situace čtenáře s verdiktem z dat,
     souměrné plusy obou, co umí obě, tabulka po skupinách, metodika. Plusy a mínusy počítá KonkurenceSrovnani::rozdily. --}}
@php
    $k = $s->konkurent;
    $jmeno = $k->kratky ?: $k->nazev;
    $r = $s->rozdily();
    $sit = $s->situace();
    $zdroje = collect($s->hodnoty[$k->id] ?? [])->pluck('zdroj')->filter(fn ($z) => str_starts_with((string) $z, 'http'))->unique()->values()->all();
    $ceny = $s->parametry->whereIn('klic', ['j_cenik', 'j_limity_zdarma']);
@endphp
<x-layouts.web :title="$jmeno . ' vs TupTuDu: srovnání funkcí a cen'" :popis="'V čem je lepší ' . $jmeno . ' a v čem TupTuDu. Ceny, funkce a jazyky obou nástrojů vedle sebe, s datem ověření.'" :neindexovat="true">
<x-slot:hlava>@include('srovnani._spolecne')</x-slot:hlava>
<main class="sr">
    @include('srovnani._ramec', ['bezDokladu' => $s->bezDokladu(array_filter([$k, $s->my]))])
    <nav class="sr-tlumene" style="font-size:14px">Srovnání nástrojů › <a href="{{ ($nahled ?? false) ? route('masterteam.konkurence.profil', $k) : '#' }}">{{ $jmeno }}</a> › vs TupTuDu</nav>
    <h1>{{ $jmeno }} vs TupTuDu</h1>
    <p style="font-size:18px">Oba nástroje slouží k návrhu domu, každý ale míří jinam. Tady najdeš, v čem je lepší který, ať si vybereš podle toho, co potřebuješ.</p>

    <h2>Ceny</h2>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th></th><th>{{ $jmeno }}</th><th>TupTuDu</th></tr></thead>
            <tbody>
            @foreach($ceny as $p)
                <tr><th>{{ $p->nazev }}</th>
                    <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                    <td>@include('srovnani._hodnota', ['h' => $s->hodnota($s->my, $p), 'p' => $p])</td></tr>
            @endforeach
            </tbody>
        </table>
    </div>

    @if($sit)
        <h2>Co chceš udělat?</h2>
        <div class="sr-karty">
            @foreach($sit as $x)
                <div class="sr-karta">
                    <b>{{ $x['nazev'] }}</b>
                    <div style="margin:6px 0;font-weight:700;color:var(--c-primary-text)">
                        {{ $x['kdo'] === 'oba' ? 'Oba podobně' : ($x['kdo'] === 'x' ? 'Víc toho má ' . $jmeno : 'Víc toho má TupTuDu') }}
                    </div>
                    <span class="sr-pozn">Rozhoduje: {{ collect($x['rozhoduje'])->pluck('nazev')->implode(', ') }}</span>
                </div>
            @endforeach
        </div>
    @endif

    <div class="sr-dve">
        <section>
            <h2>V čem je lepší {{ $jmeno }} ({{ count($r['plusX']) }})</h2>
            <ul>@forelse($r['plusX'] as $x)<li><b>{{ $x['p']->nazev }}</b>@if($x['x']->poznamka)<span class="sr-pozn">{{ $x['x']->poznamka }}</span>@endif</li>@empty<li class="sr-tlumene">Ve sledovaných vlastnostech nic.</li>@endforelse</ul>
        </section>
        <section>
            <h2>V čem je lepší TupTuDu ({{ count($r['plusMy']) }})</h2>
            <ul>@forelse($r['plusMy'] as $x)<li><b>{{ $x['p']->nazev }}</b>@if($x['my']->poznamka)<span class="sr-pozn">{{ $x['my']->poznamka }}</span>@endif</li>@empty<li class="sr-tlumene">Ve sledovaných vlastnostech nic.</li>@endforelse</ul>
        </section>
    </div>
    @if($r['shoda'])
        <h2>Co umí oba</h2>
        <p>{{ collect($r['shoda'])->pluck('p.nazev')->implode(', ') }}.</p>
    @endif

    <h2>Všechny vlastnosti vedle sebe</h2>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th>Vlastnost</th><th>{{ $jmeno }}</th><th>TupTuDu</th></tr></thead>
            <tbody>
            @foreach($s->parametry->groupBy('skupina') as $skupina => $vSkupine)
                @continue($skupina === 'j')
                <tr class="sr-skupina"><th colspan="3">{{ \App\Models\KonkurenceParametr::SKUPINY[$skupina] ?? $skupina }}</th></tr>
                @foreach($vSkupine as $p)
                    <tr>
                        <td title="{{ $p->kriteria }}"><b>{{ $p->nazev }}</b></td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($s->my, $p), 'p' => $p])</td>
                    </tr>
                @endforeach
            @endforeach
            </tbody>
        </table>
    </div>
    @if($r['nezjisteno'])
        <p class="sr-tlumene" style="font-size:14px;margin-top:8px">U {{ count($r['nezjisteno']) }} vlastností se hodnotu u jednoho z nástrojů nepodařilo ověřit, do plusů a mínusů se proto nepočítají.</p>
    @endif

    @include('srovnani._metodika', ['zdroje' => $zdroje])
</main>
</x-layouts.web>
