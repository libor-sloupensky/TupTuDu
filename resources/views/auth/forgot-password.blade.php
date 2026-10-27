<x-layouts.prihlaseni :title="__('heslo.zapomenute_titulek')">
    <h1>{{ __('heslo.zapomenute_nadpis') }}</h1>
    <p class="tt-napoveda" style="margin:0 0 1rem;">{{ __('heslo.zapomenute_popis') }}</p>

    @if (session('status'))
        <div class="flash ok">{{ session('status') }}</div>
    @endif
    @if ($errors->any())
        <div class="flash chyba">
            @foreach ($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif

    <form method="POST" action="{{ route('password.email') }}">
        @csrf
        <label for="email">{{ __('prihlaseni.email') }}</label>
        <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="email">

        <button type="submit" class="btn btn-primary">{{ __('heslo.poslat_odkaz') }}</button>
    </form>

    <div class="tt-prihlaseni-odkazy">
        <a href="{{ route('login') }}">{{ __('heslo.zpet_na_prihlaseni') }}</a>
    </div>
</x-layouts.prihlaseni>
