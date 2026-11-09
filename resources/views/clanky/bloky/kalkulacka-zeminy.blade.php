{{-- Blok článku `::kalkulacka-zeminy`. Výpočet a dosazování čísel: public/js/kalkulacka-zemina.js, výchozí hodnoty
     odpovídají editoru (modules/zemina.md). Pole v cm mají data-meritko 0.01, kalkulačka počítá v metrech.
     Verze článku pro jinou zemi přepíše výchozí hodnoty parametry, např. `::kalkulacka-zeminy spara=80 | ornice=30`
     (klíče jako data-pole níž, cm v cm). Úvod kalkulačky jmenuje země z hlavičky článku (`zeme:`). --}}
@php
    $vlastni = [];
    foreach ($parametry ?? [] as $parametr) {
        if (preg_match('/^([a-zA-Z]+)\s*=\s*([0-9.]+)$/', $parametr, $m)) {
            $vlastni[$m[1]] = (float) $m[2];
        }
    }
    $zeme = array_map(fn ($kod) => __('zeme.' . $kod), \App\Support\Clanky::zeme($clanek));
    $uvod = $zeme === [] ? __('clanky.kalk_uvod_obecny') : __('clanky.kalk_uvod', ['zeme' => implode(' / ', $zeme)]);
    $pole = function (string $klic, string $popisek, $hodnota, $min, $max, $krok, string $meritko = '1', string $podminka = '') use ($vlastni) {
        $hodnota = $vlastni[$klic] ?? $hodnota;

        return compact('klic', 'popisek', 'hodnota', 'min', 'max', 'krok', 'meritko', 'podminka');
    };
    $hlavni = [
        $pole('delka', __('clanky.kalk_delka'), 12, 3, 60, 0.1),
        $pole('sirka', __('clanky.kalk_sirka'), 10, 3, 60, 0.1),
    ];
    $podrobnosti = [
        $pole('vnitrni', __('clanky.kalk_vnitrni'), 10, 0, 200, 0.5, '1', 'pasy'),
        $pole('spara', __('clanky.kalk_spara'), 100, 40, 300, 5, '0.01', 'pasy'),
        $pole('sirkaPasu', __('clanky.kalk_sirka_pasu'), 50, 20, 150, 5, '0.01', 'pasy'),
        $pole('skladba', __('clanky.kalk_skladba'), 45, 15, 150, 5, '0.01'),
        $pole('ornice', __('clanky.kalk_ornice'), 25, 0, 60, 5, '0.01'),
        $pole('odkop', __('clanky.kalk_odkop'), 80, 0, 300, 5, '0.01'),
        $pole('svah', __('clanky.kalk_svah'), 0.5, 0, 2, 0.05),
        $pole('nakypreni', __('clanky.kalk_nakypreni'), 1.25, 1, 1.6, 0.05),
        $pole('vyskaSklepu', __('clanky.kalk_vyska_sklepu'), 305, 200, 400, 5, '0.01', 'sklep'),
    ];
@endphp
<form class="tt-kalkulacka" data-kalkulacka="zemina" data-clanek="{{ $clanek['adresa'] }}" novalidate>
    <div class="tt-kalkulacka-titulek">{{ __('clanky.kalk_nadpis') }}</div>
    <p class="tt-kalkulacka-uvod">{{ $uvod }}</p>
    <div class="tt-kalkulacka-sloupce">
        <div class="tt-kalkulacka-pole">
            <div class="tt-kalkulacka-radek">
                @foreach ($hlavni as $p)
                    <div>
                        <label for="kalk-{{ $p['klic'] }}">{{ $p['popisek'] }}</label>
                        <input type="number" inputmode="decimal" id="kalk-{{ $p['klic'] }}" data-pole="{{ $p['klic'] }}" value="{{ $p['hodnota'] }}" min="{{ $p['min'] }}" max="{{ $p['max'] }}" step="{{ $p['krok'] }}">
                    </div>
                @endforeach
            </div>
            <div>
                <label for="kalk-typ">{{ __('clanky.kalk_typ') }}</label>
                <select id="kalk-typ" data-pole="typ">
                    <option value="pasy">{{ __('clanky.kalk_typ_pasy') }}</option>
                    <option value="deska">{{ __('clanky.kalk_typ_deska') }}</option>
                </select>
            </div>
            <div class="tt-kalkulacka-radek">
                <div>
                    <label for="kalk-podDum">{{ __('clanky.kalk_pod_dum') }}</label>
                    <select id="kalk-podDum" data-pole="podDum">
                        <option value="vykopek">{{ __('clanky.kalk_pod_dum_vykopek') }}</option>
                        <option value="sterk">{{ __('clanky.kalk_pod_dum_sterk') }}</option>
                    </select>
                </div>
                <div>
                    <label for="kalk-sklep">{{ __('clanky.kalk_sklep') }}</label>
                    <select id="kalk-sklep" data-pole="sklep">
                        <option value="ne">{{ __('clanky.kalk_sklep_ne') }}</option>
                        <option value="ano">{{ __('clanky.kalk_sklep_ano') }}</option>
                    </select>
                </div>
            </div>
            <div>
                <label for="kalk-nadTerenem">{{ __('clanky.kalk_nad_terenem') }}</label>
                <input type="number" inputmode="decimal" id="kalk-nadTerenem" data-pole="nadTerenem" data-meritko="0.01" value="{{ $vlastni['nadTerenem'] ?? 30 }}" min="0" max="150" step="5">
            </div>
            <details>
                <summary>{{ __('clanky.kalk_podrobnosti') }}</summary>
                <div class="tt-kalkulacka-podrobnosti">
                    @foreach ($podrobnosti as $p)
                        <div @if ($p['podminka'] === 'pasy') data-pouze-pasy @elseif ($p['podminka'] === 'sklep') data-pouze-sklep hidden @endif>
                            <label for="kalk-{{ $p['klic'] }}">{{ $p['popisek'] }}</label>
                            <input type="number" inputmode="decimal" id="kalk-{{ $p['klic'] }}" data-pole="{{ $p['klic'] }}" data-meritko="{{ $p['meritko'] }}" value="{{ $p['hodnota'] }}" min="{{ $p['min'] }}" max="{{ $p['max'] }}" step="{{ $p['krok'] }}" @if ($p['klic'] === 'skladba') data-vychozi-pasy="45" data-vychozi-deska="70" @endif>
                        </div>
                    @endforeach
                </div>
            </details>
        </div>
        <div class="tt-kalkulacka-vysledek" aria-live="polite">
            <div class="tt-kalkulacka-popisek">{{ __('clanky.kalk_vysledek') }}</div>
            <div>
                <table>
                    <thead>
                        <tr><th></th><th class="cislo">{{ __('clanky.kalk_rostly') }}</th><th class="cislo">{{ __('clanky.kalk_nakypreny') }}</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{{ __('clanky.kalk_ornice_navic') }}</td>
                            <td class="cislo"><strong data-v="ornice-navic">–</strong> m³</td>
                            <td class="cislo"><span data-v="ornice-navic-nakypreny">–</span> m³</td>
                        </tr>
                        <tr data-ukaz="vykopek-navic">
                            <td>{{ __('clanky.kalk_vykopek_navic') }}</td>
                            <td class="cislo"><strong data-v="vykopek-navic">–</strong> m³</td>
                            <td class="cislo"><span data-v="vykopek-navic-nakypreny">–</span> m³</td>
                        </tr>
                        <tr data-ukaz="vykopek-chybi" hidden>
                            <td>{{ __('clanky.kalk_vykopek_chybi') }}</td>
                            <td class="cislo"><strong data-v="vykopek-chybi">–</strong> m³</td>
                            <td class="cislo">–</td>
                        </tr>
                    </tbody>
                </table>
                <dl class="tt-kalkulacka-souhrn">
                    <div><dt>{{ __('clanky.kalk_vykopano') }}</dt><dd><span data-v="celkem-vykopano">–</span> m³</dd></div>
                    <div><dt>{{ __('clanky.kalk_zpet') }}</dt><dd><span data-v="celkem-zpet">–</span> m³</dd></div>
                    <div><dt>{{ __('clanky.kalk_zbude') }}</dt><dd><strong data-v="celkem-zbude">–</strong> m³</dd></div>
                    <div data-ukaz="sterk"><dt>{{ __('clanky.kalk_sterk') }}</dt><dd><span data-v="sterk">–</span> m³</dd></div>
                    <div><dt>{{ __('clanky.kalk_hromada') }}</dt><dd><span data-v="hromada">–</span> m³ {{ __('clanky.kalk_nakypreno') }}</dd></div>
                </dl>
            </div>
            <p class="tt-clanek-meta">{{ __('clanky.kalk_odhad') }}</p>
        </div>
    </div>
    <div class="tt-kalkulacka-aplikace" data-vyzva>
        <p class="tt-jen-mys">{{ __('clanky.kalk_aplikace') }}</p>
        <p class="tt-jen-dotyk">{{ __('clanky.vyzva_dotyk') }}</p>
        <a class="btn btn-primary tt-jen-mys" href="{{ \App\Support\Clanky::adresaRegistrace($clanek) }}" data-vyzva-klik>{{ __('clanky.kalk_aplikace_tlacitko') }}</a>
        <button type="button" class="btn btn-primary tt-jen-dotyk" data-poslat-odkaz>{{ __('clanky.vyzva_poslat') }}</button>
        <p class="tt-clanek-meta" data-zkopirovano hidden>{{ __('clanky.vyzva_zkopirovano') }}</p>
    </div>
</form>
<script src="/js/kalkulacka-zemina.js?v={{ filemtime(public_path('js/kalkulacka-zemina.js')) }}" defer></script>
