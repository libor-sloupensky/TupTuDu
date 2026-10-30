{{-- Náhled změny tarifu před potvrzením (PredplatneController@nahled) — částky spočítal Paddle. --}}
<x-layouts.zakaznik :title="__('tarify.predplatne_titulek')">
    <h1>{{ __('tarify.zmena_nadpis') }}</h1>

    <section class="card tt-ucet-sekce">
        <h2>{{ __('tarify.nazev.' . $tarif) }}, {{ __('tarify.obdobi.' . $obdobi) }}</h2>

        @if ($zaplatiHned)
            <p>{!! __('tarify.nahled_hned', ['castka' => '<strong>' . e($zaplatiHned) . '</strong>']) !!}</p>
        @elseif ($rozdilPriste)
            <p>{{ __('tarify.nahled_priste') }}</p>
        @endif
        @if ($kredit)
            <p>{{ __('tarify.nahled_kredit', ['castka' => $kredit]) }}</p>
        @endif
        @if ($pristePlatba && $pristeDatum)
            <p class="muted">{{ __('tarify.nahled_dalsi', ['castka' => $pristePlatba, 'obdobi' => __('tarify.obdobi.' . $obdobi), 'datum' => $pristeDatum]) }}</p>
        @endif
        <p class="tt-napoveda">{{ __('tarify.nahled_doklad') }}</p>

        <form method="POST" action="{{ route('app.predplatne.zmenit') }}" class="tt-predplatne-akce">
            @csrf
            <input type="hidden" name="tarif" value="{{ $tarif }}">
            <input type="hidden" name="obdobi" value="{{ $obdobi }}">
            <button type="submit" class="btn btn-primary">
                {{ $zaplatiHned ? __('tarify.potvrdit_zaplatit', ['castka' => $zaplatiHned]) : __('tarify.potvrdit_zmenu') }}
            </button>
            <a class="btn" href="{{ route('app.predplatne') }}">{{ __('tarify.zpet') }}</a>
        </form>
    </section>
</x-layouts.zakaznik>
