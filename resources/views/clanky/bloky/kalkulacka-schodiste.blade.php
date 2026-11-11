{{-- Blok článku `::kalkulacka-schodiste`. Výpočet a nákres: public/js/kalkulacka-schodiste.js, přímé schody a schody s odpočívadly
     staví stejně jako editor (modules/dum.md, část Schody), navíc hlídá nášlap podle vyhlášky. Pole v cm a mm mají data-meritko, kalkulačka počítá v metrech.
     Verze článku pro jinou zemi přepíše výchozí hodnoty a doporučení parametry, např.
     `::kalkulacka-schodiste sirka=80 | vyskaMax=190 | sirkaMin=80` (vyska, sirka a prumer v cm, cilova v mm,
     limity vyskaMin, vyskaMax, krokMin, krokMax, naslapMin, zakrivMin a podchod v mm (naslapMin=0 vypne přidávání výšek), sirkaMin v cm, rameno = nejvíc výšek v rameni).
     Prvky s data-jen se ukazují jen u vyjmenovaných tvarů. Úvod jmenuje země z hlavičky (`zeme:`). --}}
@php
    $vlastni = [];
    foreach ($parametry ?? [] as $parametr) {
        if (preg_match('/^([a-zA-Z]+)\s*=\s*([0-9.]+)$/', $parametr, $m)) {
            $vlastni[$m[1]] = (float) $m[2];
        }
    }
    $limity = array_filter([
        'vyskaMin' => isset($vlastni['vyskaMin']) ? $vlastni['vyskaMin'] / 1000 : null,
        'vyskaMax' => isset($vlastni['vyskaMax']) ? $vlastni['vyskaMax'] / 1000 : null,
        'krokMin' => isset($vlastni['krokMin']) ? $vlastni['krokMin'] / 1000 : null,
        'krokMax' => isset($vlastni['krokMax']) ? $vlastni['krokMax'] / 1000 : null,
        'sirkaMin' => isset($vlastni['sirkaMin']) ? $vlastni['sirkaMin'] / 100 : null,
        'rameno' => $vlastni['rameno'] ?? null,
        'naslapMin' => isset($vlastni['naslapMin']) ? $vlastni['naslapMin'] / 1000 : null,
        'zakrivMin' => isset($vlastni['zakrivMin']) ? $vlastni['zakrivMin'] / 1000 : null,
        'podchod' => isset($vlastni['podchod']) ? $vlastni['podchod'] / 1000 : null,
    ], fn ($x) => $x !== null);
    $mm = fn (string $klic, float $vychozi) => (int) round(($limity[$klic] ?? $vychozi) * 1000);
    $doporuceni = [
        'vyska' => __('clanky.schod_dop_vyska', ['od' => $mm('vyskaMin', 0.15), 'do' => $mm('vyskaMax', 0.18)]),
        'krok' => __('clanky.schod_dop_krok', ['od' => $mm('krokMin', 0.6), 'do' => $mm('krokMax', 0.65)]),
        'sirka' => __('clanky.schod_dop_sirka', ['od' => (int) round(($limity['sirkaMin'] ?? 0.9) * 100)]),
        'rameno' => __('clanky.schod_dop_rameno', ['do' => (int) ($limity['rameno'] ?? 18)]),
        'naslap' => __('clanky.schod_dop_naslap', ['od' => $mm('naslapMin', 0.275)]),
        'merena' => __('clanky.schod_dop_merena', ['od' => $mm('naslapMin', 0.275), 'vnitrni' => $mm('zakrivMin', 0.18)]),
        'podchod' => __('clanky.schod_dop_podchod', ['od' => $mm('podchod', 2.1)]),
    ];
    // Doporučení, která platí jen pro některé tvary
    $jenTvary = ['merena' => 'Lz Uz tocite', 'podchod' => 'tocite'];
    $tvary = ['prime' => 'schod_tvar_prime', 'L' => 'schod_tvar_l', 'Lz' => 'schod_tvar_lz', 'U' => 'schod_tvar_u',
        'U2' => 'schod_tvar_u2', 'Uz' => 'schod_tvar_uz', 'tocite' => 'schod_tvar_tocite'];
    $zeme = array_map(fn ($kod) => __('zeme.' . $kod), \App\Support\Clanky::zeme($clanek));
    $uvod = $zeme === [] ? __('clanky.schod_uvod_obecny') : __('clanky.schod_uvod', ['zeme' => implode(' / ', $zeme)]);
    $vysledky = [
        ['n', __('clanky.schod_n'), '', null, null],
        ['rameno', __('clanky.schod_rameno'), '', 'rameno', null],
        ['h', __('clanky.schod_h'), 'mm', 'vyska', null],
        ['b', __('clanky.schod_b'), 'mm', 'naslap', null],
        ['krok', __('clanky.schod_krok'), 'mm', 'krok', null],
        ['sklon', __('clanky.schod_sklon'), '°', null, null],
        ['merena', __('clanky.schod_merena'), 'mm', 'merena', 'Lz Uz tocite'],
        ['nejuzsi', __('clanky.schod_nejuzsi'), 'mm', null, 'Lz Uz'],
        ['otacka', __('clanky.schod_otacka'), '', null, 'tocite'],
        ['podchod', __('clanky.schod_podchod'), 'm', 'podchod', 'tocite'],
        ['pudorys', __('clanky.schod_pudorys'), 'm', 'sirka', null],
    ];
@endphp
<form class="tt-kalkulacka" data-kalkulacka="schodiste" data-clanek="{{ $clanek['adresa'] }}" data-limity="{{ json_encode($limity) }}"
      data-popisek-pudorys="{{ __('clanky.schod_nakres_pudorys') }}" novalidate>
    <div class="tt-kalkulacka-titulek">{{ __('clanky.schod_nadpis') }}</div>
    <p class="tt-kalkulacka-uvod">{{ $uvod }}</p>
    <div class="tt-kalkulacka-sloupce">
        <div class="tt-kalkulacka-pole">
            <div>
                <label for="schod-vyska">{{ __('clanky.schod_vyska') }}</label>
                <input type="number" inputmode="decimal" id="schod-vyska" data-pole="vyska" data-meritko="0.01" value="{{ $vlastni['vyska'] ?? 290 }}" min="200" max="450" step="1">
            </div>
            <div>
                <label for="schod-tvar">{{ __('clanky.schod_tvar') }}</label>
                <select id="schod-tvar" data-pole="tvar">
                    @foreach ($tvary as $hodnota => $klic)
                        <option value="{{ $hodnota }}">{{ __('clanky.' . $klic) }}</option>
                    @endforeach
                </select>
            </div>
            <div data-jen="prime L Lz U U2 Uz">
                <label for="schod-sirka">{{ __('clanky.schod_sirka') }}</label>
                <input type="number" inputmode="decimal" id="schod-sirka" data-pole="sirka" data-meritko="0.01" value="{{ $vlastni['sirka'] ?? 100 }}" min="60" max="250" step="5">
            </div>
            <div data-jen="Lz Uz" hidden>
                <label for="schod-zatacka">{{ __('clanky.schod_zatacka') }}</label>
                <select id="schod-zatacka" data-pole="zatacka">
                    <option value="osa">{{ __('clanky.schod_zatacka_osa') }}</option>
                    <option value="rozlozene">{{ __('clanky.schod_zatacka_rozlozene') }}</option>
                </select>
            </div>
            <div data-jen="tocite" hidden>
                <label for="schod-prumer">{{ __('clanky.schod_prumer') }}</label>
                <input type="number" inputmode="decimal" id="schod-prumer" data-pole="prumer" data-meritko="0.01" value="{{ $vlastni['prumer'] ?? 200 }}" min="120" max="300" step="10">
            </div>
            <div>
                <label for="schod-cilova">{{ __('clanky.schod_cilova') }}</label>
                <input type="number" inputmode="decimal" id="schod-cilova" data-pole="cilova" data-meritko="0.001" value="{{ $vlastni['cilova'] ?? 175 }}" min="140" max="210" step="1">
            </div>
        </div>
        <div class="tt-kalkulacka-vysledek" aria-live="polite">
            <div class="tt-kalkulacka-popisek">{{ __('clanky.kalk_vysledek') }}</div>
            <dl class="tt-kalkulacka-souhrn">
                @foreach ($vysledky as [$klic, $popisek, $jednotka, $stav, $jen])
                    <div @if ($jen) data-jen="{{ $jen }}" hidden @endif @if (in_array($klic, ['merena', 'nejuzsi'])) data-zatacka @endif data-radek="{{ $klic }}">
                        <dt>{{ $popisek }}</dt>
                        <dd>
                            <strong data-v="{{ $klic }}">–</strong> {{ $jednotka }}
                            @if ($stav)
                                <span class="tt-schody-stav" data-stav="{{ $stav }}" title="{{ $doporuceni[$stav] }}">
                                    <span class="ok">✓</span><span class="ne">!</span>
                                </span>
                            @endif
                        </dd>
                    </div>
                @endforeach
            </dl>
            <p class="tt-schody-nelze" data-nelze hidden>{{ __('clanky.schod_nelze') }}</p>
            <ul class="tt-schody-doporuceni">
                @foreach ($doporuceni as $klic => $text)
                    <li data-stav="{{ $klic }}" @isset($jenTvary[$klic]) data-jen="{{ $jenTvary[$klic] }}" hidden @endisset @if ($klic === 'merena') data-zatacka @endif>{{ $text }}</li>
                @endforeach
            </ul>
        </div>
    </div>
    <figure class="tt-schody-nakresy">
        <svg data-nakres="bokorys" viewBox="0 0 640 320" role="img" aria-label="{{ __('clanky.schod_nakres_bokorys') }}"></svg>
        <svg data-nakres="pudorys" viewBox="0 0 420 320" role="img" aria-label="{{ __('clanky.schod_nakres_pudorys_popis') }}"></svg>
        <figcaption class="tt-clanek-meta">{{ __('clanky.schod_nakres_popis') }}</figcaption>
    </figure>
    <div class="tt-kalkulacka-aplikace" data-vyzva>
        <p class="tt-jen-mys">{{ __('clanky.schod_aplikace') }}</p>
        <p class="tt-jen-dotyk">{{ __('clanky.vyzva_dotyk') }}</p>
        <a class="btn btn-primary tt-jen-mys" href="{{ \App\Support\Clanky::adresaRegistrace($clanek) }}" data-vyzva-klik>{{ __('clanky.schod_aplikace_tlacitko') }}</a>
        <button type="button" class="btn btn-primary tt-jen-dotyk" data-poslat-odkaz>{{ __('clanky.vyzva_poslat') }}</button>
        <p class="tt-clanek-meta" data-zkopirovano hidden>{{ __('clanky.vyzva_zkopirovano') }}</p>
    </div>
</form>
<script src="/js/kalkulacka-schodiste.js?v={{ filemtime(public_path('js/kalkulacka-schodiste.js')) }}" defer></script>
