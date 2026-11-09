{{-- Přehled článků v jazyce (ClankyController). --}}
@php
    use App\Support\Clanky;
    use App\Support\Lokalizace;

    // Články nejsou ve všech jazycích: přepínač vede na titulku
    $prepinac = [];
    foreach (Lokalizace::jazyky() as $kod) {
        $prepinac[$kod] = Lokalizace::adresaWebu('/', $kod);
    }
@endphp
<x-layouts.web :title="__('clanky.prehled_titulek')" :popis="__('clanky.prehled_popis')" :verze="[]" :prepinac="$prepinac">
    <div class="tt-clanek tt-clanek-stranka">
        <h1>{{ __('clanky.prehled_nadpis') }}</h1>
        <p class="tt-perex">{{ __('clanky.prehled_popis') }}</p>
        <div class="tt-clanky-seznam">
            @foreach ($clanky as $clanek)
                <section class="tt-clanky-polozka">
                    <h2><a href="{{ Clanky::adresa($clanek) }}">{{ $clanek['titulek'] }}</a></h2>
                    <p>{{ $clanek['popis'] }}</p>
                    <p class="tt-clanek-meta">{{ __('clanky.autor', ['autor' => $clanek['autor'] ?? 'TupTuDu']) }}@if ($clanek['stav'] !== 'zverejneno') · {{ __('clanky.koncept') }}@endif</p>
                </section>
            @endforeach
        </div>
    </div>
</x-layouts.web>
