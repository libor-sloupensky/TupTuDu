{{-- Levý sidebar administrace (styl dle kalkulia — bílý, oranžové akcenty). --}}
@auth
<aside class="tt-sidebar">
    <div class="tt-sidebar-inner">
        <div class="tt-brand-title"><a href="/masterteam"><span class="brand">TupTuDu</span></a></div>

        <div class="tt-section">
            <div class="tt-section-label">Masterteam</div>
            <a href="/masterteam" class="{{ request()->is('masterteam') ? 'active' : '' }}">Přehled</a>

            {{-- Koncepty — sbalovací podsekce (mechanika převzatá z kalkulia).
                 Stav si pamatuje localStorage, takže rozbalení přežije překlik. --}}
            @php
                $konceptyAktivni = request()->is('masterteam/koncept*')
                    || request()->is('masterteam/pravidla-objektu*');
            @endphp
            <div class="tt-subsection">
                <button type="button" class="tt-subsection-toggle" onclick="ttToggleSection('koncepty')">
                    <span>Koncepty</span>
                    <svg id="tt-arrow-koncepty" class="tt-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                    </svg>
                </button>
                <div id="tt-body-koncepty" class="tt-subsection-body" data-vychozi-otevreno="{{ $konceptyAktivni ? '1' : '0' }}">
                    <a href="/masterteam/koncept" class="{{ request()->is('masterteam/koncept') ? 'active' : '' }}">Koncept (editor)</a>
                    <a href="/masterteam/koncept-testovani" class="{{ request()->is('masterteam/koncept-testovani*') ? 'active' : '' }}">Koncept testování</a>
                    <a href="/masterteam/koncept-solver" class="{{ request()->is('masterteam/koncept-solver*') ? 'active' : '' }}">Koncept solver (balonky)</a>
                    <a href="/masterteam/pravidla-objektu" class="{{ request()->is('masterteam/pravidla-objektu*') ? 'active' : '' }}">Pravidla objektů</a>
                </div>
            </div>

            <a href="/masterteam/chyby" class="{{ request()->is('masterteam/chyby*') ? 'active' : '' }}">Chyby</a>
            <a href="/masterteam/uzivatele" class="{{ request()->is('masterteam/uzivatele*') ? 'active' : '' }}">Uživatelé</a>
        </div>

        {{-- Modul Doklady — vlastní sekce, zobrazí se jen když má uživatel firmu --}}
        @if (auth()->user()->officeFirmy()->exists())
            <div class="tt-section">
                <div class="tt-section-label">Doklady</div>
                <a href="{{ route('office.doklady.index') }}" class="{{ request()->is('doklady') || request()->is('doklady/[0-9]*') ? 'active' : '' }}">Přehled dokladů</a>
                @if (auth()->user()->officeMaRoli('ucetni'))
                    <a href="{{ route('office.klienti.index') }}" class="{{ request()->is('doklady/klienti*') ? 'active' : '' }}">Klienti</a>
                @endif
                @if (! auth()->user()->officeProhlizimKlienta())
                    <a href="{{ route('office.firma.nastaveni') }}" class="{{ request()->is('doklady/nastaveni*') ? 'active' : '' }}">Nastavení firmy</a>
                @endif
            </div>
        @endif

        <form method="POST" action="/logout" class="tt-logout">
            @csrf
            <button type="submit" class="btn btn-sm">Odhlásit ({{ auth()->user()->celeJmeno() }})</button>
        </form>
    </div>
</aside>

<script>
// Sbalování sekcí sidebaru — stav v localStorage, ať přežije překlik mezi stránkami.
function ttToggleSection(nazev) {
    var body = document.getElementById('tt-body-' + nazev);
    var arrow = document.getElementById('tt-arrow-' + nazev);
    if (!body) return;

    var sbaleno = body.classList.toggle('collapsed');
    if (arrow) arrow.classList.toggle('collapsed', sbaleno);

    var stav = JSON.parse(localStorage.getItem('tt_sidebar_sekce') || '{}');
    stav[nazev] = !sbaleno;
    localStorage.setItem('tt_sidebar_sekce', JSON.stringify(stav));
}

// Obnovení stavu po načtení stránky. Sekce, ve které uživatel právě je,
// se rozbalí vždy — jinak by nebylo vidět, kde se nachází.
(function () {
    var stav = JSON.parse(localStorage.getItem('tt_sidebar_sekce') || '{}');

    document.querySelectorAll('.tt-subsection-body').forEach(function (body) {
        var nazev = body.id.replace('tt-body-', '');
        var arrow = document.getElementById('tt-arrow-' + nazev);
        var jsemUvnitr = body.dataset.vychoziOtevreno === '1';
        var otevrit = jsemUvnitr || stav[nazev] !== false;

        body.classList.toggle('collapsed', !otevrit);
        if (arrow) arrow.classList.toggle('collapsed', !otevrit);
    });
})();
</script>
@endauth
