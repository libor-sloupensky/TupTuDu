{{-- Jazyk, země a texty pro JavaScript (config/lokalizace.php, modules/lokalizace.md).
     Texty z lang/{jazyk}/js.php, chybějící doplní záložní jazyk.
       preloz('obecne.chyba_spojeni')
       preloz('koncepty.smazat_potvrzeni', { nazev: 'Můj dům' })   → :nazev v textu
       window.TT_LOKALIZACE.funkce.includes('katastr')               → služba v zemi uživatele --}}
@php
    $ttTexty = __('js');
    $ttZalozni = __('js', [], config('app.fallback_locale'));
    // Blade neumí @json přes víc řádků — data se proto skládají tady
    $ttLokalizace = [
        'jazyk' => \App\Support\Lokalizace::jazyk(),
        'zeme' => \App\Support\Lokalizace::zeme(),
        'funkce' => \App\Support\Lokalizace::funkce(),
        'texty' => \Illuminate\Support\Arr::dot(array_replace_recursive(
            is_array($ttZalozni) ? $ttZalozni : [],
            is_array($ttTexty) ? $ttTexty : []
        )),
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
        Object.keys(parametry || {}).forEach(function (nazev) {
            text = text.split(':' + nazev).join(parametry[nazev]);
        });
        return text;
    };
</script>
