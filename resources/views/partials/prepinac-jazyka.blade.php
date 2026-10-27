{{-- Přepínač jazyka — zobrazí se, až je na výběr víc jazyků (config/lokalizace.php). --}}
@if (count(config('lokalizace.jazyky')) > 1)
    <nav class="tt-jazyky" aria-label="{{ __('obecne.jazyk') }}">
        @foreach (config('lokalizace.jazyky') as $kod => $nazev)
            @if ($kod === app()->getLocale())
                <strong lang="{{ $kod }}">{{ $nazev }}</strong>
            @else
                <a href="{{ route('jazyk.prepnout', $kod) }}" lang="{{ $kod }}" hreflang="{{ $kod }}">{{ $nazev }}</a>
            @endif
        @endforeach
    </nav>
@endif
