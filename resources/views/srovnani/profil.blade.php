{{-- Profil nástroje X (modules/srovnani.md, Druhy stránek 1): neutrální přehled sledovaných vlastností X s kontextem trhu
     („kolik srovnávaných nástrojů to má“), bez verdiktu a hodnotících slov. Vede na „X vs TupTuDu“. --}}
@php
    $k = $s->konkurent;
    $jmeno = $k->kratky ?: $k->nazev;
    $hodnota = fn ($klic) => ($p = $s->parametry->firstWhere('klic', $klic)) ? $s->hodnota($k, $p) : null;
    $zdroje = collect($s->hodnoty[$k->id] ?? [])->pluck('zdroj')->filter(fn ($z) => str_starts_with((string) $z, 'http'))->unique()->values()->all();
    $pocetTrh = $s->sledovani->count();
@endphp
<x-layouts.web :title="$jmeno . ': funkce, ceny a jazyky — TupTuDu'" :popis="'Co umí ' . $jmeno . ', kolik stojí a v jakých jazycích je. Přehled ' . $s->parametry->count() . ' vlastností s datem ověření.'" :neindexovat="true">
<x-slot:hlava>@include('srovnani._spolecne')</x-slot:hlava>
<main class="sr">
    @include('srovnani._ramec', ['bezDokladu' => $s->bezDokladu([$k])])
    <nav class="sr-tlumene" style="font-size:14px">Srovnání nástrojů › {{ $jmeno }}</nav>
    <h1>{{ $jmeno }}: funkce, ceny a jazyky</h1>
    <p style="font-size:18px">
        {{ $jmeno }} je nástroj pro {{ $k->cilovka ?: 'návrh domu a interiéru' }}.
        @if($k->platformy) Běží na: {{ implode(', ', $k->platformy) }}.@endif
    </p>
    <p style="margin:18px 0"><a class="sr-cta" href="{{ ($nahled ?? false) ? route('masterteam.konkurence.srovnani', $k) : '#' }}">Srovnání {{ $jmeno }} s TupTuDu →</a></p>

    <h2>Ceny</h2>
    <div class="sr-karty">
        @foreach(['j_cenik' => 'Tarify', 'j_limity_zdarma' => 'Co omezuje verze zdarma', 'h_zdarma' => 'Trvalá verze zdarma'] as $klic => $nadpis)
            @php $p = $s->parametry->firstWhere('klic', $klic); @endphp
            @if($p)
                <div class="sr-karta"><div class="sr-tlumene" style="font-size:13px">{{ $nadpis }}</div>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</div>
            @endif
        @endforeach
    </div>

    <h2>Vlastnosti</h2>
    <p class="sr-tlumene" style="font-size:14px">Sloupec vpravo říká, kolik z {{ $pocetTrh }} srovnávaných nástrojů danou věc má, ať je vidět, co je běžné a co výjimečné.</p>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th>Vlastnost</th><th>{{ $jmeno }}</th><th>Má z {{ $pocetTrh }} nástrojů</th></tr></thead>
            <tbody>
            @foreach($s->parametry->groupBy('skupina') as $skupina => $vSkupine)
                @continue($skupina === 'j')
                <tr class="sr-skupina"><th colspan="3">{{ \App\Models\KonkurenceParametr::SKUPINY[$skupina] ?? $skupina }}</th></tr>
                @foreach($vSkupine as $p)
                    <tr>
                        <td title="{{ $p->kriteria }}"><b>{{ $p->nazev }}</b>@if($p->popis)<span class="sr-pozn">{{ $p->popis }}</span>@endif</td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                        <td class="sr-tlumene" style="white-space:nowrap">
                            @if($p->typ === 'stav')
                                @php $t = $s->trh($p); @endphp
                                {{ $t['ma'] }}@if($t['castecne']) + {{ $t['castecne'] }} částečně@endif
                                @if($t['zjisteno'] < $pocetTrh)<span class="sr-pozn">zjištěno u {{ $t['zjisteno'] }}</span>@endif
                            @endif
                        </td>
                    </tr>
                @endforeach
            @endforeach
            </tbody>
        </table>
    </div>

    @if($s->podobne()->isNotEmpty())
        <h2>Podobné nástroje</h2>
        <p>
            @foreach($s->podobne() as $j)
                <a href="{{ ($nahled ?? false) ? route('masterteam.konkurence.profil', $j) : '#' }}">{{ $j->kratky ?: $j->nazev }}</a>@if(! $loop->last), @endif
            @endforeach
        </p>
    @endif

    @include('srovnani._metodika', ['zdroje' => $zdroje])
</main>
</x-layouts.web>
