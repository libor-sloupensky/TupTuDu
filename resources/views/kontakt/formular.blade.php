{{-- Kontaktní formulář (KontaktController) — veřejně neuvádíme e-mail, píše se přes tohle. --}}
<x-layouts.web :title="__('kontakt.titulek') . ' — TupTuDu'">
    <div class="tt-kontakt">
        <h1>{{ __('kontakt.nadpis') }}</h1>

        @if (session('odeslano'))
            <div class="flash ok">{{ __('kontakt.odeslano') }}</div>
        @else
            <p class="tt-kontakt-uvod">{{ __('kontakt.uvod') }}</p>

            @if ($errors->any())
                <div class="flash chyba">
                    @foreach ($errors->all() as $chyba)<div>{{ $chyba }}</div>@endforeach
                </div>
            @endif

            <form method="POST" action="{{ route('kontakt.odeslat') }}" class="card" id="tt-kontakt-formular">
                @csrf
                <input type="hidden" name="cas" value="{{ $casFormulare }}">
                {{-- Past na roboty: člověk pole nevidí, robot ho vyplní --}}
                <div class="tt-past" aria-hidden="true">
                    <label for="web">Web</label>
                    <input id="web" type="text" name="web" tabindex="-1" autocomplete="off">
                </div>

                <label for="jmeno">{{ __('kontakt.jmeno') }}</label>
                <input id="jmeno" type="text" name="jmeno" value="{{ old('jmeno') }}" required maxlength="100" autocomplete="name">

                <label for="email">{{ __('kontakt.email') }}</label>
                <input id="email" type="email" name="email" value="{{ old('email') }}" required maxlength="190" autocomplete="email">

                <label for="tema">{{ __('kontakt.tema') }}</label>
                <select id="tema" name="tema">
                    @foreach ($temata as $tema)
                        <option value="{{ $tema }}" @selected(old('tema', $vybraneTema) === $tema)>{{ __('kontakt.temata.' . $tema) }}</option>
                    @endforeach
                </select>

                {{-- U všech témat; povinné jen u témat k účtu (KontaktniZprava::TEMATA_UCTU) — přepíná skript dole --}}
                <div id="tt-ucet-email" data-temata='@json(\App\Models\KontaktniZprava::TEMATA_UCTU)'>
                    <div class="row-check">
                        <input id="stejny_email" type="checkbox" name="stejny_email" value="1" @checked(old('tema') === null || old('stejny_email'))>
                        <label for="stejny_email">{{ __('kontakt.stejny_email') }}</label>
                    </div>
                    <div id="tt-email-uctu">
                        <label for="email_uctu">{{ __('kontakt.email_uctu') }}</label>
                        <input id="email_uctu" type="email" name="email_uctu" value="{{ old('email_uctu') }}" maxlength="190">
                    </div>
                </div>

                <label for="zprava">{{ __('kontakt.zprava') }}</label>
                <textarea id="zprava" name="zprava" rows="7" required minlength="10" maxlength="5000">{{ old('zprava') }}</textarea>

                <button type="submit" class="btn btn-primary">{{ __('kontakt.odeslat') }}</button>
                <p class="tt-napoveda tt-kontakt-gdpr">
                    {{ __('kontakt.osobni_udaje') }}
                    <a href="{{ \App\Support\Domeny::url('web', '/privacy') }}">{{ __('pravni.soukromi_titulek') }}</a>
                </p>
            </form>
            <script>
                (() => {
                    const tema = document.getElementById('tema');
                    const blok = document.getElementById('tt-ucet-email');
                    const stejny = document.getElementById('stejny_email');
                    const jiny = document.getElementById('tt-email-uctu');
                    const emailUctu = document.getElementById('email_uctu');
                    const temataUctu = JSON.parse(blok.dataset.temata);
                    const prekresli = () => {
                        jiny.hidden = stejny.checked;
                        emailUctu.required = !stejny.checked && temataUctu.includes(tema.value);
                    };
                    tema.addEventListener('change', prekresli);
                    stejny.addEventListener('change', prekresli);
                    prekresli();
                })();
            </script>
        @endif
    </div>
</x-layouts.web>
