{{-- Blok článku `::nakypreni`: 1 m³ zeminy v zemi a tatáž zemina na korbě, bez měřítka. Korba má stejně široké
     dno jako kostka, zemina v ní sahá o čtvrtinu výš (koeficient 1,25 pro běžnou hlínu), čárkovaně úroveň 1 m³.
     Barvy z tokenů (třídy tt-rez z řezu výkopu), popisy pod obrázkem kvůli telefonu. --}}
<figure class="tt-rez">
    <svg viewBox="0 0 640 250" role="img" aria-label="{{ __('clanky.nakyp_popis') }}">
        {{-- Vlevo zemina a v ní kostka 1 m³ --}}
        <rect class="tt-rez-zemina" x="0" y="80" width="300" height="170"/>
        <rect class="tt-rez-zasyp" x="100" y="115" width="100" height="100"/>
        <rect class="tt-rez-obrys" x="100" y="115" width="100" height="100"/>
        <text class="tt-rez-text" x="150" y="173">{{ __('clanky.nakyp_v_zemi') }}</text>
        {{-- Šipka: vykopání --}}
        <path class="tt-rez-sipka" d="M318 165 H352"/>
        <polygon class="tt-rez-sipka-hrot" points="364,165 350,157 350,173"/>
        {{-- Vpravo korba se stejně širokým dnem: zemina o čtvrtinu výš, čárkovaně úroveň 1 m³ --}}
        <rect class="tt-rez-zasyp" x="450" y="90" width="100" height="125"/>
        <line class="tt-rez-obrys" x1="450" y1="115" x2="550" y2="115"/>
        <path class="tt-rez-korba" d="M447 66 V218 H553 V66"/>
        <circle class="tt-rez-kolo" cx="474" cy="233" r="11"/>
        <circle class="tt-rez-kolo" cx="526" cy="233" r="11"/>
        <text class="tt-rez-text" x="500" y="54">{{ __('clanky.nakyp_na_hromade') }}</text>
        {{-- Čísla, význam pod obrázkem --}}
        <g class="tt-rez-znacka"><rect x="22" y="22" width="28" height="28" rx="5"/><text x="36" y="42">1</text></g>
        <g class="tt-rez-znacka"><rect x="590" y="22" width="28" height="28" rx="5"/><text x="604" y="42">2</text></g>
    </svg>
    <ol class="tt-rez-legenda">
        <li>{{ __('clanky.nakyp_1') }}</li>
        <li>{{ __('clanky.nakyp_2') }}</li>
    </ol>
</figure>
