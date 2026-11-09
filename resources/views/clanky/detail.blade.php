{{-- Článek (ClankyController). Texty a bloky: App\Support\Clanky, modules/blog.md. --}}
@php
    use App\Support\Clanky;
    use App\Support\Domeny;
    use App\Support\Lokalizace;

    $adresa = Clanky::adresa($clanek);
    $jazyk = $clanek['jazyk'];
    $obrazek = $clanek['obrazek'] ?? null;
    $autor = $clanek['autor'] ?? 'TupTuDu';
    // Jazykové verze podle klíče (hreflang). Kde verze není, vede přepínač na přehled článků, nebo na titulku.
    $verze = Clanky::verze($clanek);
    $prehledy = Clanky::verzePrehledu();
    $prepinac = [];
    foreach (Lokalizace::jazyky() as $kod) {
        $prepinac[$kod] = $verze[$kod] ?? $prehledy[$kod] ?? Lokalizace::adresaWebu('/', $kod);
    }
    $data = [
        [
            '@context' => 'https://schema.org',
            '@type' => 'Article',
            'headline' => $clanek['titulek'],
            'description' => $clanek['popis'],
            'inLanguage' => $jazyk,
            'datePublished' => $clanek['publikovano'],
            'dateModified' => $clanek['overeno'],
            'mainEntityOfPage' => $adresa,
            'author' => isset($clanek['autor'])
                ? ['@type' => 'Person', 'name' => $autor, 'worksFor' => ['@type' => 'Organization', 'name' => 'TupTuDu', 'url' => Lokalizace::adresaWebu('/', $jazyk)]]
                : ['@type' => 'Organization', 'name' => 'TupTuDu', 'url' => Lokalizace::adresaWebu('/', $jazyk)],
            'publisher' => [
                '@type' => 'Organization',
                'name' => 'TupTuDu',
                'logo' => ['@type' => 'ImageObject', 'url' => Domeny::url('web', '/brand/ikona-512.png')],
            ],
        ] + ($obrazek ? ['image' => Domeny::url('web', $obrazek)] : []),
        [
            '@context' => 'https://schema.org',
            '@type' => 'BreadcrumbList',
            'itemListElement' => [
                ['@type' => 'ListItem', 'position' => 1, 'name' => __('web.clanky'), 'item' => Clanky::adresaPrehledu($jazyk)],
                ['@type' => 'ListItem', 'position' => 2, 'name' => $clanek['titulek'], 'item' => $adresa],
            ],
        ],
    ];
    $datum = fn (string $iso) => \Illuminate\Support\Carbon::parse($iso)->locale($jazyk)->isoFormat('LL');
@endphp
<x-layouts.web :title="$clanek['titulek'] . ' — TupTuDu'" :popis="$clanek['popis']" :kanonicka="$adresa" :verze="$verze" :prepinac="$prepinac" :obrazek="$obrazek" og-typ="article">
    <x-slot:hlava>
        <script type="application/ld+json">{!! json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) !!}</script>
    </x-slot:hlava>

    <article class="tt-clanek tt-clanek-stranka" data-clanek="{{ $clanek['adresa'] }}">
        <nav class="tt-drobecky" aria-label="{{ __('clanky.drobecky') }}">
            <a href="{{ Clanky::adresaPrehledu($jazyk) }}">{{ __('web.clanky') }}</a>
        </nav>
        @if ($clanek['stav'] !== 'zverejneno')
            <div class="tt-upozorneni pozor"><p>{{ __('clanky.koncept') }}</p></div>
        @endif
        <h1>{!! Clanky::vlna(e($clanek['titulek']), $jazyk) !!}</h1>
        <p class="tt-clanek-meta">{{ __('clanky.autor', ['autor' => $autor]) }} · {{ __('clanky.overeno', ['datum' => $datum($clanek['overeno'])]) }}</p>
        <p class="tt-perex">{!! Clanky::vlna(e($clanek['perex']), $jazyk) !!}</p>

        {!! $html !!}

        @if ($souvisejici = Clanky::souvisejici($clanek))
            <h2>{{ __('clanky.souvisejici') }}</h2>
            <div class="tt-clanky-seznam">
                @foreach ($souvisejici as $dalsi)
                    <section class="tt-clanky-polozka">
                        <h3><a href="{{ Clanky::adresa($dalsi) }}">{!! Clanky::vlna(e($dalsi['titulek']), $jazyk) !!}</a></h3>
                        <p>{!! Clanky::vlna(e($dalsi['popis']), $jazyk) !!}</p>
                    </section>
                @endforeach
            </div>
        @endif
        <p class="tt-clanek-pozn">{{ __('web.upozorneni') }}</p>
    </article>
    <script src="/js/clanky.js?v={{ filemtime(public_path('js/clanky.js')) }}" defer></script>
</x-layouts.web>
