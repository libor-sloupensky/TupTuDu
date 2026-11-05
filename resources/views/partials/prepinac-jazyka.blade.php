{{-- Přepínač jazyka — zobrazí se, až je na výběr víc jazyků (config/lokalizace.php).
     $verze = stránka s jazykem v adrese: odkazy vedou přímo na její verze (kód => adresa). --}}
@if (count(config('lokalizace.jazyky')) > 1)
    <nav class="tt-jazyky" aria-label="{{ __('obecne.jazyk') }}">
        @foreach (config('lokalizace.jazyky') as $kod => $nazev)
            @if ($kod === app()->getLocale())
                <strong lang="{{ $kod }}">{{ $nazev }}</strong>
            @else
                <a href="{{ ($verze ?? [])[$kod] ?? route('jazyk.prepnout', $kod) }}" lang="{{ $kod }}" hreflang="{{ $kod }}">{{ $nazev }}</a>
            @endif
        @endforeach
    </nav>
@endif
