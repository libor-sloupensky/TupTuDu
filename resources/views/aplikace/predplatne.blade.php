{{-- Předplatné zákazníka (PredplatneController, modules/platby.md). Ceny z config/tarify.php
     v měně podle země účtu; platba v okně Paddlu (partials/paddle-js). --}}
@php
    use App\Support\Tarif;

    $limitUprav = $stav['kroku_denne'];
    $limitProjektu = $stav['projektu'];
    $platne = $predplatne?->valid() ? $predplatne : null;
    $lzeMenit = $platne && ! $platne->onGracePeriod();
    $datum = fn ($cas) => $cas?->timezone(config('app.timezone'))->format('j. n. Y');
    // Ceny karet a úspora ročního placení
    $karty = [];
    foreach (Tarif::PLACENE as $tarif) {
        $mesic = Tarif::cena($tarif, 'mesic', $mena);
        $rok = Tarif::cena($tarif, 'rok', $mena);
        $karty[$tarif] = [
            'mesic' => Tarif::castka($mesic, $mena),
            'rok' => Tarif::castka($rok, $mena),
            'rok_mesicne' => Tarif::castka(round($rok / 12, $mena === 'CZK' ? 0 : 2), $mena),
            'usetrite' => (int) round((1 - $rok / ($mesic * 12)) * 100),
            'projektu' => Tarif::limit($tarif, 'projektu'),
        ];
    }
    $karty = array_reverse($karty, true);   // od nižšího tarifu
    $vychoziObdobi = in_array(request('obdobi'), Tarif::OBDOBI, true) ? request('obdobi') : ($aktualniCena['obdobi'] ?? 'rok');
@endphp
<x-layouts.zakaznik :title="__('tarify.predplatne_titulek')">
    <h1>{{ __('tarify.predplatne_nadpis') }}</h1>

    @if (session('stav'))
        <div class="flash ok">{{ session('stav') }}</div>
    @endif
    @if (session('chyba'))
        <div class="flash chyba">{{ session('chyba') }}</div>
    @endif
    @if ($platbaChyba)
        <div class="flash chyba">{{ __('tarify.platba_chyba') }}</div>
    @endif

    {{-- Po zaplacení: předplatné založí až zpráva z Paddlu → chvíli čekat --}}
    @if (request('zaplaceno') && ! $platne)
        <div class="flash ok" x-data="cekaniNaAktivaci()" x-init="spust()">
            <span x-show="!dlouho">{{ __('tarify.zaplaceno_ceka') }}</span>
            <span x-show="dlouho" x-cloak>{{ __('tarify.zaplaceno_dlouho') }}</span>
        </div>
    @endif

    <section class="card tt-ucet-sekce">
        <h2>{{ __('tarify.vas_tarif') }}: <span class="brand">{{ __('tarify.nazev.' . $stav['tarif']) }}</span></h2>

        @if ($uzivatel->jeMaster())
            <p class="muted">{{ __('tarify.master') }}</p>
        @endif
        @if ($limitUprav !== null)
            <p>{{ __('tarify.vyuziti_uprav', ['pouzito' => min($upravDnes, $limitUprav), 'limit' => $limitUprav]) }}</p>
        @endif
        <p>
            {{ $limitProjektu === null
                ? __('tarify.vyuziti_projektu_neomezene', ['pocet' => $stav['pocet_projektu']])
                : __('tarify.vyuziti_projektu', ['pocet' => $stav['pocet_projektu'], 'limit' => $limitProjektu]) }}
        </p>

        @if ($predplatne)
            @if ($platne && $aktualniCena)
                <p>{{ __('tarify.aktivni', ['tarif' => __('tarify.nazev.' . $aktualniCena['tarif']), 'obdobi' => __('tarify.obdobi.' . $aktualniCena['obdobi'])]) }}</p>
            @endif

            @if ($predplatne->pastDue())
                <div class="flash chyba">{{ __('tarify.nezaplaceno') }}</div>
            @elseif ($predplatne->paused())
                <div class="flash chyba">{{ __('tarify.pozastaveno') }}</div>
            @elseif ($predplatne->onGracePeriod())
                <p>{{ __('tarify.konci', ['tarif' => __('tarify.nazev.' . $stav['tarif']), 'datum' => $datum($predplatne->ends_at)]) }}</p>
            @elseif ($dalsiPlatba)
                <p class="muted">{{ __('tarify.dalsi_platba', [
                    'castka' => Tarif::castka((int) $dalsiPlatba->rawAmount() / 100, $dalsiPlatba->currency()->getCode()),
                    'datum' => $datum($dalsiPlatba->date()),
                ]) }}</p>
            @endif

            <div class="tt-predplatne-akce">
                <a class="btn" href="{{ route('app.predplatne.karta') }}">{{ __('tarify.zmenit_kartu') }}</a>
                @if ($platne && $predplatne->onGracePeriod())
                    <form method="POST" action="{{ route('app.predplatne.obnovit') }}">
                        @csrf
                        <button type="submit" class="btn btn-primary">{{ __('tarify.obnovit') }}</button>
                    </form>
                @elseif ($lzeMenit)
                    <form method="POST" action="{{ route('app.predplatne.zrusit') }}"
                          onsubmit="return confirm(@js(__('tarify.zrusit_potvrzeni')))">
                        @csrf
                        <button type="submit" class="btn btn-danger">{{ __('tarify.zrusit') }}</button>
                    </form>
                @endif
            </div>
        @endif
    </section>

    {{-- Tarify: bez předplatného nabídka platby, s předplatným změna tarifu --}}
    @if (! $uzivatel->jeMaster() && (! $predplatne || $lzeMenit))
        <section class="tt-ucet-sekce" x-data="{ obdobi: @js($vychoziObdobi) }">
            <div class="tt-tarify-hlava">
                <h2>{{ $lzeMenit ? __('tarify.zmena_nadpis') : __('tarify.placene_tarify') }}</h2>
                <div class="tt-prepinac-obdobi" role="group">
                    <button type="button" :class="{ aktivni: obdobi === 'mesic' }" @click="obdobi = 'mesic'">{{ __('tarify.platit_mesicne') }}</button>
                    <button type="button" :class="{ aktivni: obdobi === 'rok' }" @click="obdobi = 'rok'">{{ __('tarify.platit_rocne') }}</button>
                </div>
            </div>
            @if ($lzeMenit)
                <p class="tt-napoveda">{{ __('tarify.zmena_vysvetleni') }}</p>
            @endif

            <div class="tt-tarify">
                @foreach ($karty as $tarif => $karta)
                    @php $jeAktualni = fn ($obdobi) => $aktualniCena && $aktualniCena['tarif'] === $tarif && $aktualniCena['obdobi'] === $obdobi; @endphp
                    <div class="card tt-tarif {{ $zvyraznit === $tarif ? 'zvyrazneny' : '' }}">
                        <h3>{{ __('tarify.nazev.' . $tarif) }}</h3>
                        <p class="muted">{{ __('tarify.pro_koho.' . $tarif) }}</p>
                        <div class="tt-tarif-cena" x-show="obdobi === 'mesic'">
                            <strong>{{ $karta['mesic'] }}</strong> {{ __('tarify.za_mesic') }}
                        </div>
                        <div class="tt-tarif-cena" x-show="obdobi === 'rok'" x-cloak>
                            <strong>{{ $karta['rok'] }}</strong> {{ __('tarify.za_rok') }}
                            <div class="muted">{{ __('tarify.rocne_vychazi', ['castka' => $karta['rok_mesicne']]) }} · {{ __('tarify.usetrite', ['procent' => $karta['usetrite']]) }}</div>
                        </div>
                        <ul>
                            <li>{{ __('tarify.uprav_neomezene') }}</li>
                            <li>{{ $karta['projektu'] === null ? __('tarify.projektu_neomezene') : __('tarify.projektu_az', ['limit' => $karta['projektu']]) }}</li>
                            @include('partials.tarif-funkce')
                        </ul>

                        @if ($lzeMenit)
                            @foreach (Tarif::OBDOBI as $obdobi)
                                <div x-show="obdobi === @js($obdobi)" @if ($obdobi !== $vychoziObdobi) x-cloak @endif>
                                    @if ($jeAktualni($obdobi))
                                        <span class="tag vlastnik">{{ __('tarify.aktualni') }}</span>
                                    @else
                                        <form method="POST" action="{{ route('app.predplatne.zmenit') }}"
                                              onsubmit="return confirm(@js(__('tarify.zmena_potvrzeni', ['tarif' => __('tarify.nazev.' . $tarif), 'obdobi' => __('tarify.obdobi.' . $obdobi)])))">
                                            @csrf
                                            <input type="hidden" name="tarif" value="{{ $tarif }}">
                                            <input type="hidden" name="obdobi" value="{{ $obdobi }}">
                                            <button type="submit" class="btn">{{ __('tarify.prejit') }}</button>
                                        </form>
                                    @endif
                                </div>
                            @endforeach
                        @elseif ($nabidky)
                            <button type="button" class="btn btn-primary" @click="otevriPlatbu(@js($tarif), obdobi)">
                                {{ __('tarify.vybrat', ['tarif' => __('tarify.nazev.' . $tarif)]) }}
                            </button>
                        @else
                            <button type="button" class="btn" disabled>{{ __('tarify.vybrat', ['tarif' => __('tarify.nazev.' . $tarif)]) }}</button>
                        @endif
                    </div>
                @endforeach
            </div>

            @if (! $predplatne && ! $platbyZapnute)
                <p class="muted">{{ __('tarify.platby_pripravujeme') }}</p>
            @endif
            <p class="tt-napoveda">{{ __('tarify.cenik_dph') }}</p>
            <p class="flash chyba" id="tt-platba-chyba" hidden>{{ __('tarify.platba_okno_chyba') }}</p>
        </section>
    @endif

    <section class="card tt-ucet-sekce">
        <h2>{{ __('tarify.doklady') }}</h2>
        @if ($transakce->isEmpty())
            <p class="muted">{{ __('tarify.zadne_platby') }}</p>
        @else
            <table>
                <tr><th>{{ __('tarify.datum') }}</th><th>{{ __('tarify.castka') }}</th><th>{{ __('tarify.stav') }}</th><th></th></tr>
                @foreach ($transakce as $platba)
                    <tr>
                        <td>{{ $datum($platba->billed_at) }}</td>
                        <td>{{ Tarif::castka((int) $platba->total / 100, $platba->currency) }}</td>
                        <td>{{ Lang::has('tarify.stav_platby.' . $platba->status) ? __('tarify.stav_platby.' . $platba->status) : $platba->status }}</td>
                        <td>
                            @if ($platba->invoice_number)
                                <a href="{{ route('app.predplatne.doklad', $platba->id) }}" target="_blank" rel="noopener">{{ __('tarify.doklad') }}</a>
                            @endif
                        </td>
                    </tr>
                @endforeach
            </table>
        @endif
        <p class="tt-napoveda" style="margin-top:1rem;">
            {!! __('tarify.vraceni_info', ['odkaz' => '<a href="' . e(\App\Support\Domeny::url('web', '/refunds')) . '">' . e(__('pravni.vraceni_titulek')) . '</a>']) !!}
        </p>
    </section>

    @if ($nabidky)
        @include('partials.paddle-js')
    @endif
    <script>
        // Nabídky pro platební okno Paddlu (Cashier: zákazník, cena, typ předplatného)
        const TT_NABIDKY = @json($nabidky);

        function otevriPlatbu(tarif, obdobi) {
            const chyba = document.getElementById('tt-platba-chyba');
            chyba.hidden = true;
            try {
                const moznosti = JSON.parse(JSON.stringify(TT_NABIDKY[tarif][obdobi]));
                // Cashier chystá okno vložené do stránky — chceme překryvné
                moznosti.settings = Object.assign({}, moznosti.settings, { displayMode: 'overlay' });
                delete moznosti.settings.frameStyle;
                Paddle.Checkout.open(moznosti);
            } catch (e) {
                chyba.hidden = false;
                window.zalogujChybu?.(e, 'Předplatné: otevření platebního okna', { tarif, obdobi });
            }
        }

        // Po zaplacení se čeká na zprávu z Paddlu (webhook) — pak obnovit stránku
        function cekaniNaAktivaci() {
            return {
                dlouho: false,
                async spust() {
                    for (let pokus = 0; pokus < 30; pokus++) {
                        await new Promise(r => setTimeout(r, 2000));
                        try {
                            const r = await fetch(@js(route('app.predplatne.stav')), { headers: { Accept: 'application/json' } });
                            if (r.ok && (await r.json()).predplatne) {
                                window.location.href = @js(route('app.predplatne'));
                                return;
                            }
                        } catch (e) {
                            window.zalogujChybu?.(e, 'Předplatné: čekání na aktivaci', { pokus });
                        }
                    }
                    this.dlouho = true;
                },
            };
        }
    </script>
</x-layouts.zakaznik>
