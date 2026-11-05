{{-- Blok článku `::obrazek cesta | popis pro nevidomé | popisek | šířka | výška`. --}}
@php [$cesta, $alt, $popisek, $sirka, $vyska] = array_pad($parametry, 5, ''); @endphp
<figure class="tt-obrazek">
    <img src="{{ $cesta }}" alt="{{ $alt }}" width="{{ $sirka }}" height="{{ $vyska }}" loading="lazy" decoding="async">
    @if ($popisek !== '')
        <figcaption>{{ $popisek }}</figcaption>
    @endif
</figure>
