{{-- Blok článku `::rez-vykopu`: schéma výkopu pro dům na pasech, bez měřítka. Barvy z tokenů, popisy pod obrázkem kvůli telefonu. --}}
<figure class="tt-rez">
    <svg viewBox="0 0 640 220" role="img" aria-label="{{ __('clanky.rez_popis') }}">
        {{-- Zemina pod úrovní výkopu --}}
        <rect class="tt-rez-zemina" x="0" y="118" width="640" height="102"/>
        {{-- Ornice: mimo pracovní prostor zůstává, v něm se vrátí navrch --}}
        <rect class="tt-rez-ornice" x="0" y="96" width="150" height="22"/>
        <rect class="tt-rez-ornice" x="490" y="96" width="150" height="22"/>
        {{-- Dosypání pod dům --}}
        <rect class="tt-rez-sterk" x="150" y="104" width="340" height="14"/>
        {{-- Pasy v rýhách --}}
        <rect class="tt-rez-beton" x="150" y="104" width="42" height="98"/>
        <rect class="tt-rez-beton" x="299" y="104" width="42" height="98"/>
        <rect class="tt-rez-beton" x="448" y="104" width="42" height="98"/>
        {{-- Deska a stěny --}}
        <rect class="tt-rez-dum" x="150" y="84" width="340" height="20"/>
        <rect class="tt-rez-dum" x="150" y="14" width="30" height="70"/>
        <rect class="tt-rez-dum" x="460" y="14" width="30" height="70"/>
        <rect class="tt-rez-dum" x="311" y="14" width="18" height="70"/>
        {{-- Hranice pracovního prostoru --}}
        <line class="tt-rez-teren" x1="70" y1="60" x2="70" y2="118"/>
        <line class="tt-rez-teren" x1="570" y1="60" x2="570" y2="118"/>
        {{-- Čísla kroků, význam pod obrázkem --}}
        <g class="tt-rez-znacka"><rect x="96" y="93" width="28" height="28" rx="5"/><text x="110" y="113">1</text></g>
        <g class="tt-rez-znacka"><rect x="157" y="146" width="28" height="28" rx="5"/><text x="171" y="166">2</text></g>
        <g class="tt-rez-znacka"><rect x="231" y="97" width="28" height="28" rx="5"/><text x="245" y="117">3</text></g>
        <g class="tt-rez-znacka"><rect x="516" y="56" width="28" height="28" rx="5"/><text x="530" y="76">4</text></g>
    </svg>
    <ol class="tt-rez-legenda">
        <li>{{ __('clanky.rez_1') }}</li>
        <li>{{ __('clanky.rez_2') }}</li>
        <li>{{ __('clanky.rez_3') }}</li>
        <li>{{ __('clanky.rez_4') }}</li>
    </ol>
</figure>
