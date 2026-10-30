{{-- Ceník na veřejném webu (CenikController). Paddle ho chce vidět při schvalování domény:
     popis produktu, funkce a ceny shodné s Paddlem (config/tarify.php, modules/platby.md).
     Přepínač měsíčně/ročně bez JS (rádio + CSS), web nemá Alpine. --}}
@php
    use App\Support\Domeny;
    use App\Support\Tarif;

    $karty = [];
    foreach ([Tarif::STAVEBNIK, Tarif::PROFI] as $tarif) {
        $mesic = Tarif::cena($tarif, 'mesic', $mena);
        $rok = Tarif::cena($tarif, 'rok', $mena);
        $karty[$tarif] = [
            'mesic' => Tarif::castka($mesic, $mena),
            'rok' => Tarif::castka($rok, $mena),
            'rok_mesicne' => Tarif::castka(round($rok / 12, $mena === 'CZK' ? 0 : 2), $mena),
            'usetrite' => (int) round((1 - $rok / ($mesic * 12)) * 100),
            'projektu' => $limity[$tarif]['projektu'],
        ];
    }
@endphp
<x-layouts.web :title="__('tarify.cenik_titulek')">
    <div class="tt-cenik">
        <h1>{{ __('tarify.cenik_nadpis') }}</h1>
        <p class="tt-cenik-uvod">{{ __('tarify.cenik_uvod') }}</p>

        <input type="radio" name="obdobi" id="tt-obdobi-mesic" class="tt-obdobi-volba">
        <input type="radio" name="obdobi" id="tt-obdobi-rok" class="tt-obdobi-volba" checked>
        <div class="tt-prepinac-obdobi">
            <label for="tt-obdobi-mesic">{{ __('tarify.platit_mesicne') }}</label>
            <label for="tt-obdobi-rok">{{ __('tarify.platit_rocne') }}</label>
        </div>

        <div class="tt-tarify">
            <div class="card tt-tarif">
                <h3>{{ __('tarify.nazev.zdarma') }}</h3>
                <p class="muted">{{ __('tarify.pro_koho.zdarma') }}</p>
                <div class="tt-tarif-cena"><strong>{{ Tarif::castka(0, $mena) }}</strong> {{ __('tarify.navzdy') }}</div>
                <ul>
                    <li>{{ __('tarify.uprav_denne', ['limit' => $limity['zdarma']['kroku_denne']]) }}</li>
                    <li>{{ __('tarify.projekt_jeden') }}</li>
                </ul>
                <a class="btn" href="{{ Domeny::url('app', '/register') }}">{{ __('tarify.zacit_zdarma') }}</a>
            </div>

            @foreach ($karty as $tarif => $karta)
                <div class="card tt-tarif">
                    <h3>{{ __('tarify.nazev.' . $tarif) }}</h3>
                    <p class="muted">{{ __('tarify.pro_koho.' . $tarif) }}</p>
                    <div class="tt-tarif-cena tt-jen-mesic"><strong>{{ $karta['mesic'] }}</strong> {{ __('tarify.za_mesic') }}</div>
                    <div class="tt-tarif-cena tt-jen-rok">
                        <strong>{{ $karta['rok'] }}</strong> {{ __('tarify.za_rok') }}
                        <div class="muted">{{ __('tarify.rocne_vychazi', ['castka' => $karta['rok_mesicne']]) }} · {{ __('tarify.usetrite', ['procent' => $karta['usetrite']]) }}</div>
                    </div>
                    <ul>
                        <li>{{ __('tarify.uprav_neomezene') }}</li>
                        <li>{{ $karta['projektu'] === null ? __('tarify.projektu_neomezene') : __('tarify.projektu_az', ['limit' => $karta['projektu']]) }}</li>
                        <li>{{ __('tarify.nove_funkce') }}</li>
                    </ul>
                    @foreach (Tarif::OBDOBI as $obdobi)
                        <a class="btn btn-primary tt-jen-{{ $obdobi }}" href="{{ Domeny::url('app', '/billing?tarif=' . $tarif . '&obdobi=' . $obdobi) }}">
                            {{ __('tarify.vybrat', ['tarif' => __('tarify.nazev.' . $tarif)]) }}
                        </a>
                    @endforeach
                </div>
            @endforeach
        </div>

        <section class="tt-cenik-spolecne">
            <h2>{{ __('tarify.v_kazdem_tarifu') }}</h2>
            <ul>
                @foreach (__('tarify.spolecne') as $funkce)
                    <li>{{ $funkce }}</li>
                @endforeach
                @funkce('katastr')
                    <li>{{ __('tarify.spolecne_katastr') }}</li>
                @endfunkce
            </ul>
        </section>

        <ul class="tt-cenik-poznamky">
            <li>{{ __('tarify.cenik_uprava') }}</li>
            <li>{{ __('tarify.cenik_dph') }}</li>
            <li>{{ __('tarify.cenik_paddle') }}</li>
            <li>{{ __('tarify.cenik_obnova') }}</li>
            <li>
                <a href="{{ Domeny::url('web', '/refunds') }}">{{ __('tarify.cenik_vraceni') }}</a> ·
                <a href="{{ Domeny::url('web', '/terms') }}">{{ __('pravni.podminky_titulek') }}</a>
            </li>
        </ul>
    </div>
</x-layouts.web>
