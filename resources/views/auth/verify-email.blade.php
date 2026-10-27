<x-layouts.prihlaseni :title="__('overeni.titulek')">
    <h1>{{ __('overeni.nadpis') }}</h1>
    <p>{{ __('overeni.popis', ['email' => auth()->user()->email]) }}</p>

    @if (session('status') === 'verification-link-sent')
        <div class="flash ok">{{ __('overeni.odeslano') }}</div>
    @endif

    <form method="POST" action="{{ route('verification.send') }}">
        @csrf
        <button type="submit" class="btn btn-primary">{{ __('overeni.poslat_znovu') }}</button>
    </form>

    <div class="tt-prihlaseni-odkazy">
        <a href="{{ route('app.ucet') }}">{{ __('overeni.zmenit_email') }}</a>
        <form method="POST" action="/logout" style="margin:0;">
            @csrf
            <button type="submit" class="tt-odkaz-tlacitko">{{ __('obecne.odhlasit') }}</button>
        </form>
    </div>
</x-layouts.prihlaseni>
