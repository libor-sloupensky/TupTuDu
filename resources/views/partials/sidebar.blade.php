{{-- Levý sidebar administrace (styl dle kalkulia — bílý, oranžové akcenty). --}}
@auth
<aside class="tt-sidebar">
    <div class="tt-sidebar-inner">
        <div class="tt-brand-title"><a href="/masterteam"><span class="brand">TupTuDu</span></a></div>

        <div class="tt-section">
            <div class="tt-section-label">Masterteam</div>
            <a href="/masterteam" class="{{ request()->is('masterteam') ? 'active' : '' }}">Přehled</a>
            <a href="/masterteam/koncept" class="{{ request()->is('masterteam/koncept') ? 'active' : '' }}">Koncept (editor)</a>
            <a href="/masterteam/koncept-testovani" class="{{ request()->is('masterteam/koncept-testovani*') ? 'active' : '' }}">Koncept testování</a>
            <a href="/masterteam/pravidla-objektu" class="{{ request()->is('masterteam/pravidla-objektu*') ? 'active' : '' }}">Pravidla objektů</a>
            <a href="/masterteam/chyby" class="{{ request()->is('masterteam/chyby*') ? 'active' : '' }}">Chyby</a>
            <a href="/masterteam/uzivatele" class="{{ request()->is('masterteam/uzivatele*') ? 'active' : '' }}">Uživatelé</a>
        </div>

        <form method="POST" action="/logout" class="tt-logout">
            @csrf
            <button type="submit" class="btn btn-sm">Odhlásit ({{ auth()->user()->celeJmeno() }})</button>
        </form>
    </div>
</aside>
@endauth
