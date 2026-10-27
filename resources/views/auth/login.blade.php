<x-layouts.prihlaseni :title="__('prihlaseni.titulek')">
    <h1>{{ __('prihlaseni.nadpis') }} <span class="brand">TupTuDu</span>{{ \App\Support\Domeny::jeMasterteam() ? ' — ' . __('prihlaseni.masterteam') : '' }}</h1>

    @if (session('status'))
        <div class="flash ok">{{ session('status') }}</div>
    @endif
    @if ($errors->any())
        <div class="flash chyba">
            @foreach ($errors->all() as $error){{ $error }}@endforeach
        </div>
    @endif

    <form method="POST" action="/login">
        @csrf
        <label for="email">{{ __('prihlaseni.email') }}</label>
        <input id="email" type="email" name="email" value="{{ old('email') }}" required autofocus autocomplete="username">

        <label for="password">{{ __('prihlaseni.heslo') }}</label>
        <input id="password" type="password" name="password" required autocomplete="current-password">

        <div class="row-check">
            <input id="remember" type="checkbox" name="remember">
            <label for="remember">{{ __('prihlaseni.zapamatovat') }}</label>
        </div>

        <button type="submit" class="btn btn-primary">{{ __('prihlaseni.prihlasit') }}</button>
    </form>

    @include('partials.google-tlacitko')

    <div class="tt-prihlaseni-odkazy">
        <a href="{{ route('password.request') }}">{{ __('prihlaseni.zapomenute_heslo') }}</a>
        @unless (\App\Support\Domeny::jeMasterteam())
            <a href="{{ route('register') }}">{{ __('prihlaseni.registrace') }}</a>
        @endunless
    </div>
</x-layouts.prihlaseni>
