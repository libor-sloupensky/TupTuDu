<x-layouts.prihlaseni :title="__('heslo.nove_titulek')">
    <h1>{{ __('heslo.nove_nadpis') }}</h1>

    @if ($errors->any())
        <div class="flash chyba">
            @foreach ($errors->all() as $error)<div>{{ $error }}</div>@endforeach
        </div>
    @endif

    <form method="POST" action="{{ route('password.update') }}">
        @csrf
        <input type="hidden" name="token" value="{{ $request->route('token') }}">

        <label for="email">{{ __('prihlaseni.email') }}</label>
        <input id="email" type="email" name="email" value="{{ old('email', $request->email) }}" required autocomplete="email">

        <label for="password">{{ __('heslo.nove_heslo') }}</label>
        <input id="password" type="password" name="password" required minlength="8" autofocus autocomplete="new-password">

        <label for="password_confirmation">{{ __('registrace.heslo_znovu') }}</label>
        <input id="password_confirmation" type="password" name="password_confirmation" required minlength="8" autocomplete="new-password">

        <button type="submit" class="btn btn-primary">{{ __('heslo.nastavit') }}</button>
    </form>
</x-layouts.prihlaseni>
