{{-- Analýza konkurence (modules/konkurence.md). Záložky: přehled konkurentů s vývojem, katalog parametrů
     s režimem sledovat / tiše / nesledovat, matice posledního měření a události. Barvy jen z proměnných brandu. --}}
@use('App\Http\Controllers\Masterteam\KonkurenceController', 'KC')
@use('App\Models\Konkurent')
@php
    $zalozky = ['prehled' => 'Přehled', 'parametry' => 'Parametry', 'matice' => 'Matice', 'udalosti' => 'Události'];
    $rezimPoradi = ['sledovat' => 0, 'tise' => 1, 'nesledovat' => 2];
    $stavZnacka = fn ($v) => match ($v) { 'ano' => 'ano', 'castecne' => 'cast', 'ne' => 'ne', 'skryte' => 'skr', default => 'q' };
@endphp
<x-layouts.app title="Konkurence — TupTuDu">
<style>
    .kn { color: var(--c-text); }
    .kn-tlumene { color: var(--c-text-secondary); }
    .kn-karta { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; }
    .kn-zalozky { display: inline-flex; gap: 2px; padding: 3px; border: 1px solid var(--c-border); border-radius: 9px; background: var(--c-surface); }
    .kn-zalozky a { padding: 6px 14px; border-radius: 7px; font-size: 14px; font-weight: 600; color: var(--c-text-secondary); text-decoration: none; }
    .kn-zalozky a[aria-current="page"] { background: var(--c-primary); color: var(--c-on-primary); }
    .kn-zalozky a[aria-current="page"] .kn-tlumene { color: inherit; opacity: .75; }
    .kn-tri { display: inline-flex; border: 1px solid var(--c-border-strong); border-radius: 7px; overflow: hidden; flex: none; }
    .kn-tri button { font-size: 12px; font-weight: 600; padding: 4px 9px; color: var(--c-text-secondary); background: transparent; border: 0; cursor: pointer; }
    .kn-tri button + button { border-left: 1px solid var(--c-border); }
    .kn-tri button[aria-pressed="true"][data-r="sledovat"] { background: var(--c-primary); color: var(--c-on-primary); }
    .kn-tri button[aria-pressed="true"][data-r="tise"] { background: var(--c-primary-20); color: var(--c-text); }
    .kn-tri button[aria-pressed="true"][data-r="nesledovat"] { background: var(--c-border); color: var(--c-text); }
    .kn-vypnute { opacity: .5; }
    .kn-stitek { display: inline-block; font-size: 11px; font-weight: 600; line-height: 1.3; padding: 1px 6px; border-radius: 5px; background: var(--c-primary-10); color: var(--c-primary-text); white-space: nowrap; }
    .kn-stitek.sedy { background: color-mix(in srgb, var(--c-text) 8%, transparent); color: var(--c-text-secondary); }
    .kn-tab { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 13.5px; }
    .kn-tab th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; color: var(--c-text-secondary); padding: 8px 10px; border-bottom: 1px solid var(--c-border-strong); background: var(--c-surface); }
    .kn-tab td { padding: 8px 10px; border-bottom: 1px solid var(--c-border); vertical-align: middle; }
    .kn-tab tr:last-child td { border-bottom: 0; }
    .kn-d { display: inline-block; width: 12px; height: 12px; border-radius: 50%; vertical-align: middle; }
    .kn-d.ano { background: var(--c-ok); }
    .kn-d.cast { border: 2px solid var(--c-warn); background: linear-gradient(90deg, var(--c-warn) 50%, transparent 50%); }
    .kn-d.ne { width: 7px; height: 7px; border: 1.5px solid var(--c-border-strong); }
    .kn-d.skr { border: 2px dashed var(--c-text-secondary); }
    .kn-d.q { width: auto; height: auto; border-radius: 0; color: var(--c-text-secondary); font-size: 11px; font-weight: 700; }
    .kn-d.q::before { content: "?"; }
    .kn-d.pl { box-shadow: 0 0 0 2px var(--c-surface), 0 0 0 3.5px var(--c-primary); }
    .kn-mesice { display: inline-grid; grid-template-columns: repeat(12, 9px); gap: 2px; vertical-align: middle; }
    .kn-mesice i { width: 9px; height: 14px; border-radius: 2px; border: 1px solid var(--c-border); }
    .kn-jaz { display: inline-flex; gap: 2px; flex-wrap: nowrap; }
    .kn-jaz span { font-size: 10.5px; font-weight: 700; width: 20px; text-align: center; padding: 1px 0; border-radius: 4px; text-transform: uppercase; color: color-mix(in srgb, var(--c-text-secondary) 45%, transparent); }
    .kn-jaz span.n { background: var(--c-ok); color: var(--c-surface); }
    .kn-jaz span.w { box-shadow: inset 0 0 0 1.5px var(--c-ok); color: var(--c-text); }
    .kn-bar { display: inline-block; width: 48px; height: 6px; border-radius: 3px; background: var(--c-border); overflow: hidden; vertical-align: middle; margin-right: 6px; }
    .kn-bar i { display: block; height: 100%; background: var(--c-primary); }
    .kn-cislo { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .kn-filtr { font-size: 13px; font-weight: 600; padding: 4px 11px; border-radius: 999px; border: 1px solid var(--c-border-strong); color: var(--c-text-secondary); background: transparent; cursor: pointer; }
    .kn-filtr[aria-pressed="true"] { border-color: var(--c-primary); color: var(--c-text); background: var(--c-primary-10); }
    .kn-matice-obal { overflow: auto; max-height: 78vh; }
    .kn-matice { border-collapse: separate; border-spacing: 0; font-size: 13px; }
    .kn-matice th, .kn-matice td { border-bottom: 1px solid var(--c-border); background: var(--c-surface); text-transform: none; letter-spacing: 0; }
    .kn-matice thead th { position: sticky; top: 0; z-index: 2; vertical-align: bottom; border-bottom: 1px solid var(--c-border-strong); }
    .kn-matice thead th.kn-roh { left: 0; z-index: 3; }
    .kn-matice th.kn-sloupec { width: 30px; min-width: 30px; height: 130px; padding: 0 0 8px; }
    .kn-matice th.kn-sloupec span { display: inline-block; writing-mode: vertical-rl; transform: rotate(180deg); white-space: nowrap; font-weight: 700; color: var(--c-text); font-size: 12.5px; }
    .kn-matice th.kn-radek { position: sticky; left: 0; z-index: 1; text-align: left; font-weight: 600; padding: 6px 12px; min-width: 210px; max-width: 280px; border-right: 1px solid var(--c-border); color: var(--c-text); }
    .kn-matice td { text-align: center; padding: 0 2px; height: 34px; }
    .kn-matice td.kn-text { font-size: 11px; max-width: 30px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; color: var(--c-text-secondary); }
    .kn-matice tr.kn-skupina th { background: color-mix(in srgb, var(--c-text) 5%, var(--c-surface)); text-align: left; padding: 7px 12px; font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--c-text-secondary); position: sticky; left: 0; }
    .kn-matice .kn-my { background: var(--c-primary-10); }
</style>

<div class="kn" x-data="{ filtr: 'vse' }">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
            <h1 class="text-2xl font-bold">Konkurence</h1>
            <p class="kn-tlumene text-sm mt-1">
                @if($mereni)
                    Měření {{ $mereni->nazev }} (od {{ $mereni->datum->format('j. n. Y') }})@if($predchozi), předchozí {{ $predchozi->nazev }}@endif.
                    {{ $konkurenti->count() - 1 }} aplikací, {{ $parametry->count() }} parametrů.
                @else
                    Zatím žádné měření. Data nahraje <code>php artisan konkurence:import</code>.
                @endif
            </p>
        </div>
        <nav class="kn-zalozky" aria-label="Části analýzy">
            @foreach($zalozky as $klic => $nazev)
                <a href="?z={{ $klic }}" @if($zalozka === $klic) aria-current="page" @endif>
                    {{ $nazev }}@if($klic === 'parametry')<span class="kn-tlumene" style="font-weight:500" title="sledovat / tiše / nesledovat"> {{ $pocty['sledovat'] ?? 0 }} · {{ $pocty['tise'] ?? 0 }} · {{ $pocty['nesledovat'] ?? 0 }}</span>@endif
                </a>
            @endforeach
        </nav>
    </div>

    <p class="kn-tlumene text-sm mb-4" style="max-width:80ch">
        <b class="kn">Sledovat</b> = v matici a smí do srovnání na webu.
        <b class="kn">Tiše</b> = měříme jen pro sebe, nikde nezveřejňujeme.
        <b class="kn">Nesledovat</b> = neměříme.
        Stejně funguje přepínač u parametrů i u aplikací.
    </p>

    {{-- ───────── Přehled ───────── --}}
    @if($zalozka === 'prehled')
        @php
            $radky = collect($radky)->sortBy([
                fn ($a, $b) => ($b['k']->jeTuptudu() <=> $a['k']->jeTuptudu()),
                fn ($a, $b) => $rezimPoradi[$a['k']->rezim] <=> $rezimPoradi[$b['k']->rezim],
                fn ($a, $b) => $b['body'] <=> $a['body'],
            ]);
        @endphp
        <div class="kn-karta" style="overflow-x:auto">
            <table class="kn-tab" style="min-width:980px">
                <thead>
                    <tr>
                        <th>Aplikace</th>
                        <th>Režim</th>
                        <th title="Body ze sledovaných parametrů typu má/nemá: má = 1, částečně = ½">Funkce</th>
                        <th>Vývoj</th>
                        <th>Poslední vydání</th>
                        <th title="Události (vydání, nové funkce) po měsících za posledních 12 měsíců, vpravo tento měsíc">12 měsíců</th>
                        <th title="Plně = jazyk nástroje, obrysem = jen web">Jazyky</th>
                        <th style="text-align:right">Od Kč/měs</th>
                        @if($predchozi)<th style="text-align:right" title="Změněné hodnoty proti předchozímu měření">Změny</th>@endif
                    </tr>
                </thead>
                <tbody>
                @foreach($radky as $r)
                    @php $k = $r['k']; @endphp
                    <tr x-data="{ rezim: @js($k->rezim) }" :class="rezim === 'nesledovat' && 'kn-vypnute'" @if($k->jeTuptudu()) style="background:var(--c-primary-10)" @endif>
                        <td style="min-width:160px">
                            <a href="{{ $k->web }}" target="_blank" rel="noopener" class="font-semibold" style="color:var(--c-text)">{{ $k->kratky ?: $k->nazev }}</a>
                            <div class="kn-tlumene text-xs">{{ Konkurent::SEGMENTY[$k->segment] ?? $k->segment }}@if($k->pridano && $mereni && $k->pridano->gt($mereni->datum)) · <span class="kn-stitek">nový {{ $k->pridano->format('j. n.') }}</span>@endif</div>
                        </td>
                        <td>
                            @unless($k->jeTuptudu())
                                @include('masterteam.konkurence.trojstav', ['url' => route('masterteam.konkurence.konkurent.rezim', $k)])
                            @endunless
                        </td>
                        <td class="kn-cislo">
                            <span class="kn-bar"><i style="width: {{ $r['z'] ? round($r['body'] / $r['z'] * 100) : 0 }}%"></i></span>{{ str_replace('.', ',', $r['body']) }}<span class="kn-tlumene"> / {{ $r['z'] }}</span>
                        </td>
                        <td style="min-width:120px">
                            @if($r['verdikt'])
                                <span class="kn-stitek" style="background: color-mix(in srgb, {{ KC::barvaVerdiktu($r['verdikt']->text) }} 18%, transparent); color: var(--c-text)" title="{{ $r['verdikt']->poznamka }}">{{ $r['verdikt']->text }}</span>
                            @else
                                <span class="kn-tlumene">—</span>
                            @endif
                        </td>
                        <td class="kn-cislo">
                            @php $dv = KC::datum($r['vydani']); @endphp
                            @if($dv)
                                {{ $dv->format(strlen($r['vydani']) > 7 ? 'j. n. Y' : 'n/Y') }}
                                @if($r['vydani6'] !== null)<div class="kn-tlumene text-xs">{{ (int) $r['vydani6'] }}× za 6 měs.</div>@endif
                            @else
                                <span class="kn-tlumene">{{ $r['vydani'] ?: '—' }}</span>
                            @endif
                        </td>
                        <td>
                            <span class="kn-mesice">
                                @foreach($mesice as $m)
                                    @php $n = $r['udalosti'][$m->format('Y-m')] ?? 0; @endphp
                                    <i title="{{ $m->format('n/Y') }}: {{ $n }}" style="background: {{ $n ? 'color-mix(in srgb, var(--c-primary) ' . min(100, 30 + $n * 25) . '%, transparent)' : 'transparent' }}"></i>
                                @endforeach
                            </span>
                        </td>
                        <td>
                            @if($r['jazyky'] || $r['jazykyWeb'])
                                <span class="kn-jaz" title="Nástroj: {{ implode(', ', $r['jazyky']) ?: '?' }} · web: {{ implode(', ', $r['jazykyWeb']) ?: '?' }}">
                                    @foreach(KC::CILOVE_JAZYKY as $j)
                                        <span class="{{ in_array($j, $r['jazyky'], true) ? 'n' : (in_array($j, $r['jazykyWeb'], true) ? 'w' : '') }}">{{ $j }}</span>
                                    @endforeach
                                </span>
                                <span class="kn-tlumene text-xs kn-cislo"> {{ count($r['jazyky']) ?: '' }}</span>
                            @else
                                <span class="kn-tlumene">nezjištěno</span>
                            @endif
                        </td>
                        <td class="kn-cislo" style="text-align:right">{{ $r['cena'] !== null ? number_format($r['cena'], 0, ',', ' ') : '—' }}</td>
                        @if($predchozi)<td class="kn-cislo" style="text-align:right">{{ $r['zmeny'] ?? 0 }}</td>@endif
                    </tr>
                @endforeach
                </tbody>
            </table>
        </div>
        <p class="kn-tlumene text-xs mt-2">
            Od druhého měření přibude sloupec Změny (kolik hodnot se proti minule změnilo). Vývoj a vydání jsou parametry v režimu Tiše, na web nejdou.
        </p>
    @endif

    {{-- ───────── Parametry ───────── --}}
    @if($zalozka === 'parametry')
        @php
            $vyplneno = [];
            foreach ($hodnoty as $radek) {
                foreach ($radek as $pId => $h) {
                    if ($h->hodnota !== '?' && ($h->hodnota !== null || $h->cislo !== null || $h->text !== null || $h->data)) {
                        $vyplneno[$pId] = ($vyplneno[$pId] ?? 0) + 1;
                    }
                }
            }
            $pocetKonk = $konkurenti->count();
        @endphp
        <div class="mb-3 flex flex-wrap gap-2 items-center" role="group" aria-label="Filtr parametrů">
            @foreach(['vse' => 'Vše', 'sledovat' => 'Sledovat', 'tise' => 'Tiše', 'nesledovat' => 'Nesledovat', 'nove' => 'Nové návrhy'] as $f => $nazev)
                <button type="button" class="kn-filtr" :aria-pressed="filtr === '{{ $f }}'" @click="filtr = '{{ $f }}'">{{ $nazev }}</button>
            @endforeach
            <span class="kn-tlumene text-xs ml-2">Přepnutí se uloží hned.</span>
        </div>

        <div class="grid gap-4">
        @foreach($parametry->groupBy('skupina') as $skupina => $vSkupine)
            <section class="kn-karta" x-data="{ pocet: {{ $vSkupine->count() }} }">
                <h2 class="px-4 pt-3 pb-2 font-bold" style="border-bottom:1px solid var(--c-border)">{{ $skupiny[$skupina] ?? $skupina }}</h2>
                <div>
                @foreach($vSkupine as $p)
                    @php $novy = $p->pridano && $mereni && $p->pridano->gt($mereni->datum); @endphp
                    <div x-data="{ rezim: @js($p->rezim), novy: @js($novy) }"
                         x-show="filtr === 'vse' || filtr === rezim || (filtr === 'nove' && novy)"
                         :class="rezim === 'nesledovat' && 'kn-vypnute'"
                         class="flex items-center gap-3 px-4 py-2" style="border-bottom:1px solid var(--c-border)">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-semibold" title="Jak měřit: {{ $p->jak_merit }}">{{ $p->nazev }}</span>
                                @if($novy)<span class="kn-stitek">nový {{ $p->pridano->format('j. n.') }}</span>@endif
                                @if($p->typ !== 'stav')<span class="kn-stitek sedy">{{ \App\Models\KonkurenceParametr::TYPY[$p->typ] ?? $p->typ }}</span>@endif
                                @if($p->automaticky)<span class="kn-stitek sedy" title="Jde vyčíst strojově: {{ $p->jak_merit }}">strojově</span>@endif
                            </div>
                            @if($p->popis)<div class="kn-tlumene text-xs mt-0.5">{{ $p->popis }}</div>@endif
                        </div>
                        <div class="kn-tlumene text-xs kn-cislo text-right" style="width:74px" title="U kolika aplikací je hodnota zjištěná">
                            {{ $vyplneno[$p->id] ?? 0 }} / {{ $pocetKonk }}
                        </div>
                        @include('masterteam.konkurence.trojstav', ['url' => route('masterteam.konkurence.parametr.rezim', $p)])
                    </div>
                @endforeach
                </div>
            </section>
        @endforeach
        </div>
    @endif

    {{-- ───────── Matice ───────── --}}
    @if($zalozka === 'matice')
        @php
            $sTise = request()->boolean('tise');
            $rezimy = $sTise ? ['sledovat', 'tise'] : ['sledovat'];
            $sloupce = $konkurenti->filter(fn ($k) => $k->jeTuptudu() || in_array($k->rezim, $rezimy, true));
            $radkyM = $parametry->filter(fn ($p) => in_array($p->rezim, $rezimy, true));
        @endphp
        <div class="mb-3 flex flex-wrap items-center gap-4 text-sm">
            <a href="?z=matice{{ $sTise ? '' : '&tise=1' }}" class="kn-filtr" aria-pressed="{{ $sTise ? 'true' : 'false' }}" style="text-decoration:none">I parametry a aplikace v režimu Tiše</a>
            <span class="kn-tlumene flex flex-wrap gap-3 items-center">
                <span><i class="kn-d ano"></i> má</span>
                <span><i class="kn-d cast"></i> částečně</span>
                <span><i class="kn-d ne"></i> nemá</span>
                <span><i class="kn-d q"></i> nezjištěno</span>
                <span><i class="kn-d ano pl"></i> jen placené</span>
                <span>prázdné = neměřeno</span>
            </span>
        </div>
        <div class="kn-karta kn-matice-obal">
            <table class="kn-matice">
                <thead>
                    <tr>
                        <th class="kn-radek kn-roh">Parametr</th>
                        @foreach($sloupce as $k)
                            <th class="kn-sloupec {{ $k->jeTuptudu() ? 'kn-my' : '' }}" title="{{ $k->nazev }}"><span>{{ $k->kratky ?: $k->nazev }}</span></th>
                        @endforeach
                    </tr>
                </thead>
                <tbody>
                @foreach($radkyM->groupBy('skupina') as $skupina => $vSkupine)
                    <tr class="kn-skupina"><th colspan="{{ $sloupce->count() + 1 }}">{{ $skupiny[$skupina] ?? $skupina }}</th></tr>
                    @foreach($vSkupine as $p)
                        <tr>
                            <th class="kn-radek" title="{{ $p->popis }}">{{ $p->nazev }}@if($p->rezim === 'tise') <span class="kn-stitek sedy">tiše</span>@endif</th>
                            @foreach($sloupce as $k)
                                @php $h = $hodnoty[$k->id][$p->id] ?? null; @endphp
                                @php
                                    $titulek = $h ? trim(($k->kratky ?: $k->nazev) . ' · ' . $p->nazev . "\n" . ($h->kratce() ? $h->kratce() . "\n" : '') . ($h->poznamka ?? '') . ($h->zdroj ? "\n" . $h->zdroj : '') . ($h->overeno ? "\nověřeno " . $h->overeno->format('j. n. Y') : '')) : '';
                                @endphp
                                @if($p->typ === 'stav')
                                    <td class="{{ $k->jeTuptudu() ? 'kn-my' : '' }}" title="{{ $titulek }}">@if($h && $h->hodnota)<i class="kn-d {{ $stavZnacka($h->hodnota) }} {{ $h->placene ? 'pl' : '' }}"></i>@endif</td>
                                @else
                                    <td class="kn-text {{ $k->jeTuptudu() ? 'kn-my' : '' }}" title="{{ $titulek }}">{{ $h ? ($p->typ === 'seznam' ? count($h->data ?? []) : \Illuminate\Support\Str::limit($h->kratce(), 4, '')) : '' }}</td>
                                @endif
                            @endforeach
                        </tr>
                    @endforeach
                @endforeach
                </tbody>
            </table>
        </div>
        <p class="kn-tlumene text-xs mt-2">Najetím na buňku se ukáže poznámka, zdroj a datum ověření. U seznamů je v buňce počet (např. jazyků).</p>
    @endif

    {{-- ───────── Události ───────── --}}
    @if($zalozka === 'udalosti')
        @if($udalosti->isEmpty())
            <div class="kn-karta px-6 py-10 text-center kn-tlumene">Zatím žádné události. Přibývají z rešerší a měsíčních měření.</div>
        @else
            <div class="kn-karta" style="overflow-x:auto">
                <table class="kn-tab">
                    <thead><tr><th>Měsíc</th><th>Aplikace</th><th>Druh</th><th>Co se stalo</th></tr></thead>
                    <tbody>
                    @foreach($udalosti as $u)
                        <tr>
                            <td class="kn-cislo">{{ $u->datum->format('n/Y') }}</td>
                            <td class="font-semibold" style="white-space:nowrap">{{ $u->konkurent->kratky ?: $u->konkurent->nazev }}</td>
                            <td><span class="kn-stitek {{ $u->typ === 'vydani' ? 'sedy' : '' }}">{{ \App\Models\KonkurenceUdalost::TYPY[$u->typ] ?? $u->typ }}</span></td>
                            <td>{{ $u->popis }}@if($u->zdroj) <a href="{{ $u->zdroj }}" target="_blank" rel="noopener" class="kn-tlumene text-xs">zdroj</a>@endif</td>
                        </tr>
                    @endforeach
                    </tbody>
                </table>
            </div>
        @endif
    @endif
</div>

<script>
    // Trojcestný přepínač režimu (parametr i aplikace): uloží hned, při chybě vrátí původní stav.
    // Režim je v x-data řádku (`rezim`), aby na něj reagoval filtr a ztlumení řádku.
    async function knNastavRezim(url, novy, el) {
        const data = Alpine.$data(el);
        const puvodni = data.rezim;
        if (novy === puvodni) return;
        data.rezim = novy;
        try {
            const odp = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ rezim: novy }),
            });
            if (!odp.ok) throw new Error('HTTP ' + odp.status);
            await odp.json();
        } catch (e) {
            data.rezim = puvodni;
            chybaUzivateli(e, 'Uložení režimu sledování', { url, rezim: novy });
        }
    }
</script>
</x-layouts.app>
