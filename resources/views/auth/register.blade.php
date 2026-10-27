<x-layouts.prihlaseni :title="__('registrace.titulek')">
    <h1>{{ __('registrace.nadpis') }}</h1>

    @if ($errors->any())
        <div class="flash chyba">
            @foreach ($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif

    <form method="POST" action="{{ route('register') }}">
        @csrf
        <label for="jmeno">{{ __('registrace.jmeno') }}</label>
        <input id="jmeno" type="text" name="jmeno" value="{{ old('jmeno') }}" required maxlength="100" autofocus autocomplete="given-name">

        <label for="prijmeni">{{ __('registrace.prijmeni') }}</label>
        <input id="prijmeni" type="text" name="prijmeni" value="{{ old('prijmeni') }}" maxlength="100" autocomplete="family-name">

        <label for="email">{{ __('prihlaseni.email') }}</label>
        <input id="email" type="email" name="email" value="{{ old('email') }}" required autocomplete="email">

        <label for="password">{{ __('prihlaseni.heslo') }}</label>
        <input id="password" type="password" name="password" required minlength="8" autocomplete="new-password">

        <label for="password_confirmation">{{ __('registrace.heslo_znovu') }}</label>
        <input id="password_confirmation" type="password" name="password_confirmation" required minlength="8" autocomplete="new-password">

        <div class="row-check">
            <input id="souhlas" type="checkbox" name="souhlas" value="1" required @checked(old('souhlas'))>
            <label for="souhlas">{!! __('registrace.souhlas', [
                'podminky' => '<a href="' . e(\App\Support\Domeny::url('web', '/terms')) . '" target="_blank">' . e(__('pravni.podminky_odkaz')) . '</a>',
                'soukromi' => '<a href="' . e(\App\Support\Domeny::url('web', '/privacy')) . '" target="_blank">' . e(__('pravni.soukromi_odkaz')) . '</a>',
            ]) !!}</label>
        </div>

        <button type="submit" class="btn btn-primary">{{ __('registrace.tlacitko') }}</button>
    </form>

    @include('partials.google-tlacitko')

    <div class="tt-prihlaseni-odkazy">
        <a href="{{ route('login') }}">{{ __('registrace.mam_ucet') }}</a>
    </div>
</x-layouts.prihlaseni>
