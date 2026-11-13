{{-- Profil nástroje X (modules/srovnani.md, Druhy stránek): nahoře odpovědi na to, co lidé hledají (je zdarma, jazyky,
     cena), pak vlastnosti X s kontextem trhu („kolik srovnávaných nástrojů to má“). Bez verdiktu a hodnotících slov. --}}
@use('App\Http\Controllers\SrovnaniController')
@use('Illuminate\Support\Facades\Lang')
@php
    $k = $s->konkurent;
    $jmeno = $k->jmeno();
    $j = $s->jazyk;
    $rok = $s->mereni?->datum->year ?? date('Y');
    $hv = fn ($klic) => $s->hodnota($k, $s->parametr($klic));
    $jazykyNastroje = $hv('i_jazyky_nastroj')?->data ?? [];
    $zdarma = $hv('h_zdarma');
    $vsAdresa = $s->verejne ? SrovnaniController::adresa($k, $j, true) : route('masterteam.konkurence.srovnani', $k);
    $nazevP = fn ($p) => Lang::has('srovnani.p.' . $p->klic) ? __('srovnani.p.' . $p->klic) : $p->nazev;
    $popisP = fn ($p) => Lang::has('srovnani.pp.' . $p->klic) ? __('srovnani.pp.' . $p->klic) : $p->popis;
    $pocetTrh = $s->sledovani->filter(fn ($x) => $s->hodnota($x, $s->parametr('a_steny')) || $s->hodnota($x, $s->parametr('h_zdarma')))->count();
@endphp
<x-layouts.web :title="__('srovnani.profil_titulek', ['nazev' => $jmeno, 'rok' => $rok])" :popis="__('srovnani.profil_popis', ['nazev' => $jmeno])"
    :verze="$verze ?? null" :prepinac="$prepinac ?? null" :kanonicka="$kanonicka ?? null" og-typ="article" :neindexovat="! $s->verejne">
<x-slot:hlava>
    @include('srovnani._spolecne')
    @if($s->verejne)@include('srovnani._data', ['nadpis' => __('srovnani.profil_h1', ['nazev' => $jmeno])])@endif
</x-slot:hlava>
<main class="sr">
    @include('srovnani._ramec', ['bezDokladu' => $s->bezDokladu([$k])])
    <nav class="sr-tlumene" style="font-size:14px"><a href="{{ $s->verejne ? SrovnaniController::prehledAdresa($j) : '/masterteam/konkurence' }}">{{ __('srovnani.drobecky') }}</a> › {{ $jmeno }}</nav>
    <h1>{{ __('srovnani.profil_h1', ['nazev' => $jmeno]) }}</h1>
    @if($popis = $k->verejne('popis', $j))<p style="font-size:18px">{{ $popis }}</p>@endif

    <h2>{{ __('srovnani.profil_rychle') }}</h2>
    <div class="sr-karty">
        {{-- Verze zdarma: odpověď a hned pod ní, co omezuje (Libor 13. 11. 2026: jeden blok, odrážky) --}}
        @php $limity = $hv('j_limity_zdarma'); @endphp
        <div class="sr-karta"><div class="sr-karta-nadpis">{{ __('srovnani.profil_zdarma') }}</div>
            @include('srovnani._hodnota', ['h' => $zdarma, 'p' => $s->parametr('h_zdarma'), 'odpoved' => true, 'poznamka' => ! $limity])
            @if($limity)@include('srovnani._text', ['text' => $s->text($limity)])@endif
        </div>
        @if($jazykyNastroje)
            <div class="sr-karta"><div class="sr-karta-nadpis">{{ __('srovnani.profil_jazyky') }}</div>
                <div>{{ __('srovnani.profil_v_jazyce', ['jazyk' => __('srovnani.jazyk.' . $j), 'kod' => $j]) }}:
                    <span class="sr-h"><i class="sr-d {{ in_array($j, $jazykyNastroje, true) ? 'ano' : 'ne' }}"></i> {{ in_array($j, $jazykyNastroje, true) ? __('srovnani.ano') : __('srovnani.ne') }}</span></div>
                <span class="sr-pozn">{{ collect($jazykyNastroje)->map(fn ($x) => (Lang::has('srovnani.jazyk.' . $x) ? __('srovnani.jazyk.' . $x) : $x) . ' (' . $x . ')')->implode(', ') }}</span></div>
        @endif
        @if($platformy = $k->verejne('platformy', $j))
            <div class="sr-karta"><div class="sr-karta-nadpis">{{ __('srovnani.profil_bezi') }}</div>{{ $platformy }}</div>
        @endif
    </div>

    @if($hv('j_cenik'))
        <h2>{{ __('srovnani.profil_cena') }}</h2>
        <div class="sr-karta">@include('srovnani._hodnota', ['h' => $hv('j_cenik'), 'p' => $s->parametr('j_cenik')])</div>
    @endif
    <p style="margin:22px 0"><a class="sr-cta" href="{{ $vsAdresa }}">{{ __('srovnani.profil_cta', ['nazev' => $jmeno]) }} →</a></p>

    <h2>{{ __('srovnani.profil_vlastnosti', ['nazev' => $jmeno]) }}</h2>
    <p class="sr-tlumene" style="font-size:14px">{{ __('srovnani.profil_trh_uvod') }}</p>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr><th>{{ __('srovnani.vlastnost') }}</th><th>{{ $jmeno }}</th><th>{{ __('srovnani.profil_trh', ['n' => $pocetTrh]) }}</th></tr></thead>
            <tbody>
            @foreach($s->vlastnosti()->groupBy('skupina') as $skupina => $vSkupine)
                <tr class="sr-skupina"><th colspan="3">{{ __('srovnani.skupina.' . $skupina) }}</th></tr>
                @foreach($vSkupine as $p)
                    @continue($p->typ === 'seznam' || $p->klic === 'h_zdarma')
                    <tr>
                        <td @if(! $s->verejne) title="{{ $p->kriteria }}" @endif><b>{{ $nazevP($p) }}</b>@if($popisP($p))<span class="sr-pozn">{{ $popisP($p) }}</span>@endif</td>
                        <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $p), 'p' => $p])</td>
                        <td class="sr-tlumene" style="white-space:nowrap">
                            @if($p->typ === 'stav')
                                @php $t = $s->trh($p); @endphp
                                {{ $t['ma'] }}@if($t['castecne']) {{ __('srovnani.profil_trh_castecne', ['n' => $t['castecne']]) }}@endif
                            @endif
                        </td>
                    </tr>
                @endforeach
            @endforeach
            </tbody>
        </table>
    </div>

    @if($s->podobne()->isNotEmpty())
        <h2>{{ __('srovnani.podobne') }}</h2>
        <p>
            @foreach($s->podobne() as $x)
                <a href="{{ $s->verejne ? SrovnaniController::adresa($x, $j) : route('masterteam.konkurence.profil', $x) }}">{{ $x->jmeno() }}</a>@if(! $loop->last) · @endif
            @endforeach
        </p>
    @endif

    @include('srovnani._metodika')
</main>
</x-layouts.web>
