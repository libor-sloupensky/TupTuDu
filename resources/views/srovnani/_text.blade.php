{{-- Text hodnoty (ceník, limity verze zdarma): řádky „- …“ jako odrážky, ostatní řádky jako drobná poznámka pod nimi.
     Text bez odrážek (starší data) se vypíše jako odstavec. --}}
@php
    $radky = collect(preg_split('/\r?\n/', trim((string) $text)))->map(fn ($r) => trim($r))->filter();
    $odrazky = $radky->filter(fn ($r) => str_starts_with($r, '- '))->map(fn ($r) => substr($r, 2));
    $poznamky = $radky->reject(fn ($r) => str_starts_with($r, '- '));
@endphp
@if($odrazky->isNotEmpty())
    <ul class="sr-odrazky">@foreach($odrazky as $o)<li>{{ $o }}</li>@endforeach</ul>
    @foreach($poznamky as $p)<span class="sr-pozn">{{ $p }}</span>@endforeach
@else
    {{ $radky->implode(' ') }}
@endif
