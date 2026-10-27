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
</x-layouts.zakaznik>
