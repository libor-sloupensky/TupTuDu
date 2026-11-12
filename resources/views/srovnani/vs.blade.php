{{-- „X vs TupTuDu“ (modules/srovnani.md, Druhy stránek): ceny nahoře, situace čtenáře s verdiktem z dat,
     souměrné plusy obou, co umí oba, tabulka po skupinách, metodika. Plusy a mínusy počítá KonkurenceSrovnani::rozdily. --}}
@use('App\Http\Controllers\SrovnaniController')
@use('Illuminate\Support\Facades\Lang')
@php
    $k = $s->konkurent;
    $jmeno = $k->jmeno();
    $j = $s->jazyk;
    $rok = $s->mereni?->datum->year ?? date('Y');
    $r = $s->rozdily();
    $sit = $s->situace();
    $nazevP = fn ($p) => Lang::has('srovnani.p.' . $p->klic) ? __('srovnani.p.' . $p->klic) : $p->nazev;
    $profil = $s->verejne ? SrovnaniController::adresa($k, $j) : route('masterteam.konkurence.profil', $k);
@endphp
<x-layouts.web :title="__('srovnani.vs_titulek', ['nazev' => $jmeno, 'rok' => $rok])" :popis="__('srovnani.vs_popis', ['nazev' => $jmeno])"
    :verze="$verze ?? null" :prepinac="$prepinac ?? null" :kanonicka="$kanonicka ?? null" og-typ="article" :neindexovat="! $s->verejne">
<x-slot:hlava>
    @include('srovnani._spolecne')
    @if($s->verejne)@include('srovnani._data', ['nadpis' => __('srovnani.vs_h1', ['nazev' => $jmeno])])@endif
</x-slot:hlava>
<main class="sr">
    @include('srovnani._ramec', ['bezDokladu' => $s->bezDokladu(array_filter([$k, $s->my])), 'vs' => true])
    <nav class="sr-tlumene" style="font-size:14px"><a href="{{ $s->verejne ? SrovnaniController::prehledAdresa($j) : '/masterteam/konkurence' }}">{{ __('srovnani.drobecky') }}</a> › <a href="{{ $profil }}">{{ $jmeno }}</a> › {{ __('srovnani.srovnani_s') }}</nav>
    <h1>{{ __('srovnani.vs_h1', ['nazev' => $jmeno]) }}</h1>
    <p style="font-size:18px">{{ __('srovnani.vs_uvod') }}</p>

    <h2>{{ __('srovnani.vs_ceny') }}</h2>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th></th><th>{{ $jmeno }}</th><th>TupTuDu</th></tr></thead>
            <tbody>
            @foreach(['h_zdarma', 'j_limity_zdarma', 'j_cenik'] as $klic)
                @php $p = $s->parametr($klic); @endphp
                @continue(! $p || (! $s->hodnota($k, $p) && ! $s->hodnota($s->my, $p)))
                <tr><th style="min-width:110px">{{ $nazevP($p) }}</th>
                    <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                    <td>@include('srovnani._hodnota', ['h' => $s->hodnota($s->my, $p), 'p' => $p])</td></tr>
            @endforeach
            </tbody>
        </table>
    </div>

    @if($sit)
        <h2>{{ __('srovnani.vs_co_chces') }}</h2>
        <div class="sr-karty">
            @foreach($sit as $klic => $x)
                <div class="sr-karta">
                    <b>{{ __('srovnani.situace.' . $klic) }}</b>
                    <div style="margin:6px 0;font-weight:700;color:var(--c-primary-text)">
                        {{ $x['kdo'] === 'oba' ? __('srovnani.vs_oba') : ($x['kdo'] === 'x' ? __('srovnani.vs_vic_x', ['nazev' => $jmeno]) : __('srovnani.vs_vic_my')) }}
                    </div>
                    <span class="sr-pozn">{{ __('srovnani.vs_rozhoduje') }}: {{ collect($x['rozhoduje'])->map($nazevP)->implode(', ') }}</span>
                </div>
            @endforeach
        </div>
    @endif

    <div class="sr-dve">
        <section>
            <h2>{{ __('srovnani.vs_lepsi', ['nazev' => $jmeno]) }} ({{ count($r['plusX']) }})</h2>
            <ul>@forelse($r['plusX'] as $x)<li><b>{{ $nazevP($x['p']) }}</b>@if($pz = $s->poznamka($x['x']))<span class="sr-pozn">{{ $pz }}</span>@endif</li>@empty<li class="sr-tlumene">{{ __('srovnani.vs_nic') }}</li>@endforelse</ul>
        </section>
        <section>
            <h2>{{ __('srovnani.vs_lepsi', ['nazev' => 'TupTuDu']) }} ({{ count($r['plusMy']) }})</h2>
            <ul>@forelse($r['plusMy'] as $x)<li><b>{{ $nazevP($x['p']) }}</b>@if($pz = $s->poznamka($x['my']))<span class="sr-pozn">{{ $pz }}</span>@endif</li>@empty<li class="sr-tlumene">{{ __('srovnani.vs_nic') }}</li>@endforelse</ul>
        </section>
    </div>
    @if($r['shoda'])
        <h2>{{ __('srovnani.vs_oba_umi') }}</h2>
        <p>{{ collect($r['shoda'])->map(fn ($x) => $nazevP($x['p']))->implode(', ') }}.</p>
    @endif

    <p style="margin:22px 0;display:flex;gap:12px;flex-wrap:wrap">
        <a class="sr-cta" href="{{ \App\Support\Domeny::url('app', '/register?zdroj=srovnani-' . $k->adresa) }}">{{ __('srovnani.vs_vyzkouset') }}</a>
        @if($k->web)<a href="{{ $k->web }}" rel="nofollow noopener" target="_blank" style="align-self:center">{{ __('srovnani.vs_web_x', ['nazev' => $jmeno]) }} ↗</a>@endif
    </p>

    <h2>{{ __('srovnani.vs_vse') }}</h2>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th>{{ __('srovnani.vlastnost') }}</th><th>{{ $jmeno }}</th><th>TupTuDu</th></tr></thead>
            <tbody>
            @foreach($s->vlastnosti()->groupBy('skupina') as $skupina => $vSkupine)
                <tr class="sr-skupina"><th colspan="3">{{ __('srovnani.skupina.' . $skupina) }}</th></tr>
                @foreach($vSkupine as $p)
                    <tr>
                        <td @if(! $s->verejne) title="{{ $p->kriteria }}" @endif><b>{{ $nazevP($p) }}</b></td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($s->my, $p), 'p' => $p])</td>
                    </tr>
                @endforeach
            @endforeach
            </tbody>
        </table>
    </div>
    @if($r['nezjisteno'])
        <p class="sr-tlumene" style="font-size:14px;margin-top:8px">{{ __('srovnani.vs_nezjisteno', ['n' => count($r['nezjisteno'])]) }}</p>
    @endif

    @include('srovnani._metodika')
</main>
</x-layouts.web>
