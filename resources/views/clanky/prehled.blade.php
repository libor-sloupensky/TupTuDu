{{-- Přehled článků v jazyce (ClankyController). --}}
@php use App\Support\Clanky; @endphp
<x-layouts.web :title="__('clanky.prehled_titulek')" :popis="__('clanky.prehled_popis')">
    <div class="tt-clanek tt-clanek-stranka">
        <h1>{{ __('clanky.prehled_nadpis') }}</h1>
        <p class="tt-perex">{{ __('clanky.prehled_popis') }}</p>
        <div class="tt-clanky-seznam">
            @foreach ($clanky as $clanek)
                <section class="tt-clanky-polozka">
                    <h2><a href="{{ Clanky::adresa($clanek) }}">{{ $clanek['titulek'] }}</a></h2>
                    <p>{{ $clanek['popis'] }}</p>
                    @if ($clanek['stav'] !== 'zverejneno')
                        <p class="tt-clanek-meta">{{ __('clanky.koncept') }}</p>
                    @endif
                </section>
            @endforeach
        </div>
    </div>
</x-layouts.web>
