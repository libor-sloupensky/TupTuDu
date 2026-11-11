{{-- Účet zákazníka (UcetController). --}}
<x-layouts.zakaznik :title="__('ucet.titulek')">
    <h1>{{ __('ucet.nadpis') }}</h1>

    @if (session('stav'))
        <div class="flash ok">{{ session('stav') }}</div>
    @endif
    @if ($errors->any())
        <div class="flash chyba">
            @foreach ($errors->all() as $chyba)<div>{{ $chyba }}</div>@endforeach
        </div>
    @endif
    @unless ($uzivatel->hasVerifiedEmail())
        <div class="flash">{{ __('ucet.email_neovereny') }}</div>
    @endunless

    <section class="card tt-ucet-sekce">
        <h2>{{ __('ucet.udaje') }}</h2>
        <form method="POST" action="{{ route('app.ucet.ulozit') }}">
            @csrf
            @method('PATCH')
            <label for="jmeno">{{ __('ucet.jmeno') }}</label>
            <input id="jmeno" type="text" name="jmeno" value="{{ old('jmeno', $uzivatel->jmeno) }}" required maxlength="100">

            <label for="prijmeni">{{ __('ucet.prijmeni') }}</label>
            <input id="prijmeni" type="text" name="prijmeni" value="{{ old('prijmeni', $uzivatel->prijmeni) }}" maxlength="100">

            <label for="email">{{ __('ucet.email') }}</label>
            <input id="email" type="email" name="email" value="{{ old('email', $uzivatel->email) }}" required>

            <label for="jazyk">{{ __('ucet.jazyk') }}</label>
            <select id="jazyk" name="jazyk">
                @foreach (config('lokalizace.jazyky') as $kod => $nazev)
                    <option value="{{ $kod }}" @selected(old('jazyk', $uzivatel->jazyk ?? app()->getLocale()) === $kod)>{{ $nazev }}</option>
                @endforeach
            </select>

            <label for="zeme">{{ __('ucet.zeme') }}</label>
            <select id="zeme" name="zeme">
                @foreach ($zeme as $kod => $nazev)
                    <option value="{{ $kod }}" @selected(old('zeme', $vybranaZeme) === $kod)>{{ $nazev }}</option>
                @endforeach
            </select>
            <p class="tt-napoveda">{{ __('ucet.zeme_napoveda') }}</p>

            <button type="submit" class="btn btn-primary">{{ __('ucet.ulozit') }}</button>
        </form>
    </section>

    <section class="card tt-ucet-sekce">
        <h2>{{ __('ucet.heslo') }}</h2>
        <form method="POST" action="{{ route('app.ucet.heslo') }}">
            @csrf
            @method('PUT')
            @if ($uzivatel->heslo)
                <label for="current_password">{{ __('ucet.soucasne_heslo') }}</label>
                <input id="current_password" type="password" name="current_password" required autocomplete="current-password">
            @else
                <p class="tt-napoveda">{{ __('ucet.heslo_google') }}</p>
            @endif

            <label for="password">{{ __('ucet.nove_heslo') }}</label>
            <input id="password" type="password" name="password" required minlength="8" autocomplete="new-password">

            <label for="password_confirmation">{{ __('ucet.nove_heslo_znovu') }}</label>
            <input id="password_confirmation" type="password" name="password_confirmation" required minlength="8" autocomplete="new-password">

            <button type="submit" class="btn btn-primary">{{ __('ucet.zmenit_heslo') }}</button>
        </form>
    </section>

    {{-- Logo firmy (tarif Profi): nahrání s náhledem a odstranění, LogoFirmyController --}}
    <section class="card tt-ucet-sekce" x-data="logoFirmy({ url: @js($logoUrl), smi: @js($logoSmi) })">
        <h2>{{ __('ucet.logo_nadpis') }}</h2>
        <p class="tt-napoveda" style="margin-top:0">{{ __('ucet.logo_popis', ['mb' => \App\Services\LogoUploader::MAX_VSTUP_MB]) }}</p>
        @unless ($logoSmi)
            <p class="tt-napoveda">{{ __('ucet.logo_jen_profi') }} <a href="{{ route('app.predplatne') }}">{{ __('ucet.logo_tarify') }}</a></p>
        @endunless
        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap">
            {{-- Bílý podklad jako papír exportu --}}
            <div x-show="url" x-cloak style="display:flex; align-items:center; justify-content:center; width:11rem; height:5rem; padding:.4rem; border:1px solid var(--c-border); border-radius:var(--s-radius); background:#fff">
                <img :src="url" alt="{{ __('ucet.logo_nadpis') }}" style="max-width:100%; max-height:100%; object-fit:contain">
            </div>
            @if ($logoSmi)
                <label class="btn btn-primary" :style="bezi && 'opacity:.6; pointer-events:none'">
                    <span x-text="bezi ? @js(__('ucet.logo_nahravam')) : (url ? @js(__('ucet.logo_zmenit')) : @js(__('ucet.logo_nahrat')))"></span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" @change="nahraj($event)" hidden>
                </label>
            @endif
            <button type="button" class="btn btn-danger" x-show="url" x-cloak :disabled="bezi" @click="odstran()">{{ __('ucet.logo_odstranit') }}</button>
        </div>
        <p x-show="chyba" x-cloak x-text="chyba" style="color:var(--c-error); margin:.75rem 0 0"></p>
    </section>

    <script>
        function logoFirmy(init) {
            const hlavicky = { 'Accept': 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]').content };
            return {
                url: init.url || '',
                bezi: false,
                chyba: '',
                async nahraj(udalost) {
                    const soubor = udalost.target.files?.[0];
                    if (!soubor) return;
                    this.chyba = '';
                    if (soubor.size > {{ \App\Services\LogoUploader::MAX_VSTUP_MB }} * 1024 * 1024) {
                        this.chyba = @js(__('ucet.logo_chyba_velikost', ['mb' => \App\Services\LogoUploader::MAX_VSTUP_MB]));
                        udalost.target.value = '';
                        return;
                    }
                    this.bezi = true;
                    try {
                        const telo = new FormData();
                        telo.append('logo', soubor);
                        const r = await fetch(@js(route('app.ucet.logo.ulozit')), { method: 'POST', headers: hlavicky, body: telo });
                        const d = await r.json();
                        if (!r.ok || !d.ok) {
                            // 422 a 403 jsou běžná odmítnutí s vlastní hláškou, cokoli jiného je chyba k nahlášení
                            this.chyba = d.error || d.message || @js(__('ucet.logo_chyba_ulozeni'));
                            if (![403, 422].includes(r.status)) window.zalogujChybu?.(new Error('HTTP ' + r.status), 'Účet: nahrání loga firmy', { velikost: soubor.size, typ: soubor.type });
                            return;
                        }
                        this.url = d.url;
                    } catch (e) {
                        this.chyba = @js(__('ucet.logo_chyba_ulozeni'));
                        window.zalogujChybu?.(e, 'Účet: nahrání loga firmy', { velikost: soubor.size, typ: soubor.type });
                    } finally {
                        this.bezi = false;
                        udalost.target.value = ''; // ať jde nahrát znovu stejný soubor
                    }
                },
                async odstran() {
                    if (!confirm(@js(__('ucet.logo_odstranit_dotaz')))) return;
                    this.bezi = true;
                    this.chyba = '';
                    try {
                        const r = await fetch(@js(route('app.ucet.logo.smazat')), { method: 'DELETE', headers: hlavicky });
                        const d = await r.json();
                        if (!r.ok || !d.ok) throw new Error('HTTP ' + r.status);
                        this.url = '';
                    } catch (e) {
                        this.chyba = @js(__('ucet.logo_chyba_ulozeni'));
                        window.zalogujChybu?.(e, 'Účet: odstranění loga firmy');
                    } finally {
                        this.bezi = false;
                    }
                },
            };
        }
    </script>
</x-layouts.zakaznik>
