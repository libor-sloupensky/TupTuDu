{{-- Blok článku `::rez-sklepu`: výkop pro dům se sklepem v měřítku 1 m = 40 px. Dům 12 m, spodek 3,2 m pod terénem, u dna 0,8 m, svah 1 : 0,5, pro změnu čísel upravit i kóty a popisek. Světle hnědá je zemina, která se vrátí kolem stěn, jako u schématu rez-vykopu. --}}
<figure class="tt-rez">
    <svg viewBox="0 0 760 296" role="img" aria-label="{{ __('clanky.rez_sklep_popis') }}">
        {{-- Rostlá zemina --}}
        <rect class="tt-rez-zemina" x="0" y="122" width="760" height="174"/>
        {{-- Zásyp kolem stěn sklepu, od svahu výkopu po stěnu --}}
        <polygon class="tt-rez-zasyp" points="49,122 140,122 140,240 108,240"/>
        <polygon class="tt-rez-zasyp" points="711,122 620,122 620,240 652,240"/>
        {{-- Ornice navrchu --}}
        <rect class="tt-rez-ornice" x="0" y="112" width="140" height="10"/>
        <rect class="tt-rez-ornice" x="620" y="112" width="140" height="10"/>
        {{-- Vnitřek sklepu --}}
        <rect class="tt-rez-vnitrek" x="156" y="110" width="448" height="112"/>
        {{-- Pasy v rýhách pod stěnami sklepu --}}
        <rect class="tt-rez-beton" x="138" y="240" width="20" height="20"/>
        <rect class="tt-rez-beton" x="602" y="240" width="20" height="20"/>
        {{-- Stěny, deska pod sklepem a strop --}}
        <rect class="tt-rez-dum" x="140" y="100" width="16" height="140"/>
        <rect class="tt-rez-dum" x="604" y="100" width="16" height="140"/>
        <rect class="tt-rez-dum" x="140" y="222" width="480" height="18"/>
        <rect class="tt-rez-dum" x="140" y="100" width="480" height="10"/>
        <rect class="tt-rez-dum" x="140" y="20" width="16" height="80"/>
        <rect class="tt-rez-dum" x="604" y="20" width="16" height="80"/>
        {{-- Hranice výkopu --}}
        <line class="tt-rez-teren" x1="44" y1="112" x2="108" y2="240"/>
        <line class="tt-rez-teren" x1="716" y1="112" x2="652" y2="240"/>
        {{-- Kóty --}}
        <g class="tt-rez-kota">
            <path d="M44 92H140M44 86V98M140 86V98"/>
            <text x="92" y="82">{{ __('clanky.rez_sklep_nahore') }}</text>
            <path d="M108 246H140M108 240V252M140 240V252"/>
            <text x="94" y="270">{{ __('clanky.rez_sklep_dole') }}</text>
            <path d="M16 112V240M10 112H22M10 240H22"/>
            <text class="tt-rez-kota-vlevo" x="26" y="216">{{ __('clanky.rez_sklep_hloubka') }}</text>
            <path d="M140 280H620M140 274V286M620 274V286"/>
            <text x="380" y="274">{{ __('clanky.rez_sklep_sirka') }}</text>
        </g>
    </svg>
    <figcaption>{{ __('clanky.rez_sklep') }}</figcaption>
</figure>
