{{-- Blok článku `::obrazek cesta | popis pro nevidomé | popisek | šířka | výška`. --}}
@php
    [$cesta, $alt, $popisek, $sirka, $vyska] = array_pad($parametry, 5, '');
    // Obrázek s textem má variantu pro každý jazyk v podsložce, bez textu je jeden společný (modules/blog.md)
    $cesta = \App\Support\Clanky::obrazekVJazyce($cesta, $clanek['jazyk']);
@endphp
<figure class="tt-obrazek">
    <img src="{{ $cesta }}" alt="{{ $alt }}" width="{{ $sirka }}" height="{{ $vyska }}" loading="lazy" decoding="async">
    @if ($popisek !== '')
        <figcaption>{{ $popisek }}</figcaption>
    @endif
</figure>
