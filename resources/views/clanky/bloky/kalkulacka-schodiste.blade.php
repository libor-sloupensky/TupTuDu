{{-- Blok článku `::kalkulacka-schodiste`. Výpočet a nákres: public/js/kalkulacka-schodiste.js, počítá stejně jako
     schody v editoru (modules/dum.md, část Schody). Pole v cm a mm mají data-meritko, kalkulačka počítá v metrech.
     Verze článku pro jinou zemi přepíše výchozí hodnoty a doporučení parametry, např.
     `::kalkulacka-schodiste sirka=80 | vyskaMax=190 | sirkaMin=80` (vyska a sirka v cm, cilova v mm,
     limity vyskaMin, vyskaMax, krokMin, krokMax v mm, sirkaMin v cm, rameno = nejvíc výšek v rameni). Úvod jmenuje země z hlavičky (`zeme:`). --}}
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
    ], fn ($x) => $x !== null);
    $mm = fn (string $klic, float $vychozi) => (int) round(($limity[$klic] ?? $vychozi) * 1000);
    $doporuceni = [
        'vyska' => __('clanky.schod_dop_vyska', ['od' => $mm('vyskaMin', 0.15), 'do' => $mm('vyskaMax', 0.18)]),
        'krok' => __('clanky.schod_dop_krok', ['od' => $mm('krokMin', 0.6), 'do' => $mm('krokMax', 0.65)]),
        'sirka' => __('clanky.schod_dop_sirka', ['od' => (int) round(($limity['sirkaMin'] ?? 0.9) * 100)]),
        'rameno' => __('clanky.schod_dop_rameno', ['do' => (int) ($limity['rameno'] ?? 18)]),
    ];
    $zeme = array_map(fn ($kod) => __('zeme.' . $kod), \App\Support\Clanky::zeme($clanek));
    $uvod = $zeme === [] ? __('clanky.schod_uvod_obecny') : __('clanky.schod_uvod', ['zeme' => implode(' / ', $zeme)]);
    $vysledky = [
        ['n', __('clanky.schod_n'), '', null],
        ['rameno', __('clanky.schod_rameno'), '', 'rameno'],
        ['h', __('clanky.schod_h'), 'mm', 'vyska'],
        ['b', __('clanky.schod_b'), 'mm', null],
        ['krok', __('clanky.schod_krok'), 'mm', 'krok'],
        ['sklon', __('clanky.schod_sklon'), '°', null],
        ['pudorys', __('clanky.schod_pudorys'), 'm', 'sirka'],
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
            <div class="tt-kalkulacka-radek">
                <div>
                    <label for="schod-tvar">{{ __('clanky.schod_tvar') }}</label>
                    <select id="schod-tvar" data-pole="tvar">
                        <option value="prime">{{ __('clanky.schod_tvar_prime') }}</option>
                        <option value="L">{{ __('clanky.schod_tvar_l') }}</option>
                        <option value="U">{{ __('clanky.schod_tvar_u') }}</option>
                    </select>
                </div>
                <div>
                    <label for="schod-sirka">{{ __('clanky.schod_sirka') }}</label>
                    <input type="number" inputmode="decimal" id="schod-sirka" data-pole="sirka" data-meritko="0.01" value="{{ $vlastni['sirka'] ?? 100 }}" min="60" max="150" step="5">
                </div>
            </div>
            <details>
                <summary>{{ __('clanky.kalk_podrobnosti') }}</summary>
                <div class="tt-kalkulacka-podrobnosti">
                    <div>
                        <label for="schod-cilova">{{ __('clanky.schod_cilova') }}</label>
                        <input type="number" inputmode="decimal" id="schod-cilova" data-pole="cilova" data-meritko="0.001" value="{{ $vlastni['cilova'] ?? 175 }}" min="140" max="210" step="1">
                    </div>
                </div>
            </details>
        </div>
        <div class="tt-kalkulacka-vysledek" aria-live="polite">
            <div class="tt-kalkulacka-popisek">{{ __('clanky.kalk_vysledek') }}</div>
            <dl class="tt-kalkulacka-souhrn">
                @foreach ($vysledky as [$klic, $popisek, $jednotka, $stav])
                    <div>
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
            <ul class="tt-schody-doporuceni">
                @foreach ($doporuceni as $klic => $text)
                    <li data-stav="{{ $klic }}">{{ $text }}</li>
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
