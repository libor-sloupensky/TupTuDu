{{-- Přepínač jazyka — zobrazí se, až je na výběr víc jazyků (config/lokalizace.php).
     Na webu vede přímo na stejnou stránku v jiném jazyce (jazyk je v adresě), jinde přes volbu do session a účtu. --}}
@if (count(config('lokalizace.jazyky')) > 1)
    <details class="tt-jazyky">
        <summary aria-label="{{ __('obecne.jazyk') }}: {{ config('lokalizace.jazyky.' . app()->getLocale()) }}">{{ strtoupper(app()->getLocale()) }}</summary>
        <nav aria-label="{{ __('obecne.jazyk') }}">
            @foreach (config('lokalizace.jazyky') as $kod => $nazev)
                @if ($kod === app()->getLocale())
                    <strong lang="{{ $kod }}">{{ $nazev }}</strong>
                @else
                    <a href="{{ \App\Support\Domeny::jeWeb() ? \App\Support\Domeny::url('web', request()->path(), $kod) : route('jazyk.prepnout', $kod) }}" lang="{{ $kod }}" hreflang="{{ $kod }}">{{ $nazev }}</a>
                @endif
            @endforeach
        </nav>
    </details>
    @once
        <script>
            document.addEventListener('click', function (e) {
                document.querySelectorAll('details.tt-jazyky[open]').forEach(function (d) {
                    if (!d.contains(e.target)) d.open = false;
                });
            });
        </script>
    @endonce
@endif
