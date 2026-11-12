{{-- Strukturovaná data: Article a drobečky. Žádné Review ani hodnocení (modules/srovnani.md, SEO). --}}
@php
    $drobecky = [['@type' => 'ListItem', 'position' => 1, 'name' => __('srovnani.drobecky'), 'item' => \App\Http\Controllers\SrovnaniController::prehledAdresa($s->jazyk)],
        ['@type' => 'ListItem', 'position' => 2, 'name' => $nadpis]];
    $ld = [
        ['@context' => 'https://schema.org', '@type' => 'Article', 'headline' => $nadpis, 'inLanguage' => $s->jazyk,
            'dateModified' => $s->mereni?->updated_at?->toDateString() ?? $s->mereni?->datum?->toDateString(),
            'author' => ['@type' => 'Organization', 'name' => 'TupTuDu', 'url' => \App\Support\Lokalizace::adresaWebu('/')],
            'publisher' => ['@type' => 'Organization', 'name' => 'TupTuDu']],
        ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $drobecky],
    ];
@endphp
<script type="application/ld+json">{!! json_encode($ld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
