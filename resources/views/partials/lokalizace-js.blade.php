{{-- Jazyk, země a texty pro JavaScript (config/lokalizace.php, modules/lokalizace.md).
     Texty z lang/{jazyk}/js.php, chybějící doplní záložní jazyk. Vloží se jednou za stránku.
     Editor vkládá partial hned na začátku a předá své skupiny: ['ttSkupiny' => ['ed_dum', …]] → preloz('ed_dum.klic').
       preloz('obecne.chyba_spojeni')
       preloz('koncepty.smazat_potvrzeni', { nazev: 'Můj dům' })     → :nazev v textu
       prelozPocet('ed_dum.sten', 3)                                 → text "one=:pocet stěna|few=:pocet stěny|other=:pocet stěn"
       prelozCislo(2.8, 2)                                           → 2,80 podle jazyka
       window.TT_LOKALIZACE.funkce.includes('katastr')               → služba v zemi uživatele --}}
@once
@php
    $ttJazyk = \App\Support\Lokalizace::jazyk();
    $ttZalozni = config('app.fallback_locale');
    $ttSloz = fn ($skupina) => array_replace_recursive(
        (array) (is_array($a = __($skupina, [], $ttZalozni)) ? $a : []),
        (array) (is_array($b = __($skupina)) ? $b : [])
    );
    $ttDalsi = [];
    foreach ($ttSkupiny ?? [] as $ttSkupina) {
        $ttDalsi[$ttSkupina] = $ttSloz($ttSkupina);
    }
    // Blade neumí @json přes víc řádků — data se proto skládají tady
    $ttLokalizace = [
        'jazyk' => $ttJazyk,
        'zeme' => \App\Support\Lokalizace::zeme(),
        'funkce' => \App\Support\Lokalizace::funkce(),
        'texty' => \Illuminate\Support\Arr::dot($ttSloz('js') + $ttDalsi),
    ];
@endphp
<script>
    window.TT_LOKALIZACE = @json($ttLokalizace);
    window.preloz = function (klic, parametry) {
        var text = window.TT_LOKALIZACE.texty[klic];
        if (text === undefined) {
            // Chybějící klíč = chyba v kódu, ne u uživatele → jen tichý zápis do bugů
            window.zalogujChybu?.(new Error('Chybí překlad: ' + klic), 'Překlady', { klic: klic, jazyk: window.TT_LOKALIZACE.jazyk });
            return klic;
        }
        // Delší názvy první, ať :nazev nerozbije :n
        Object.keys(parametry || {}).sort(function (a, b) { return b.length - a.length; }).forEach(function (nazev) {
            text = text.split(':' + nazev).join(parametry[nazev]);
        });
        return text;
    };
    // Množné číslo podle jazyka. Text má varianty "one=…|few=…|many=…|other=…", počet je :pocet.
    window.prelozPocet = function (klic, pocet, parametry) {
        var varianty = {};
        window.preloz(klic, Object.assign({ pocet: pocet }, parametry)).split('|').forEach(function (cast) {
            var i = cast.indexOf('=');
            varianty[cast.slice(0, i)] = cast.slice(i + 1);
        });
        var kategorie = new Intl.PluralRules(window.TT_LOKALIZACE.jazyk).select(pocet);
        return varianty[kategorie] ?? varianty.other ?? klic;
    };
    window.prelozCislo = function (cislo, desetiny) {
        return Number(cislo).toLocaleString(window.TT_LOKALIZACE.jazyk, { minimumFractionDigits: desetiny, maximumFractionDigits: desetiny, useGrouping: false });
    };
</script>
@endonce
