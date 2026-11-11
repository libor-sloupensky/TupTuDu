{{-- Veřejný odkaz na stav projektu. Vlastní hlava bez analytiky a cookie lišty: adresa je tajná,
     nesmí odtéct do měření ani přes Referer. Žádný kód editoru, viz modules/sdileni.md. --}}
<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" data-theme="{{ request()->cookie('tt_rezim') === 'light' ? 'light' : 'dark' }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow, noarchive">
    <meta name="referrer" content="no-referrer">
    @include('partials.hlasic-chyb-inline')
    <title>{{ $sdileni->nazev }} — TupTuDu</title>
    @include('partials.hlava-brand')
    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    <style>
        .tt-sdileni { max-width: 1200px; margin: 0 auto; padding: 16px; }
        .tt-sdileni h1 { margin: 0 0 2px; font-size: 1.5rem; }
        .tt-sdileni-stav { color: var(--c-text-secondary); font-size: .85rem; margin: 0 0 14px; }
        .tt-sdileni-vyber { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
        .tt-sdileni-vyber button { padding: 6px 12px; border: 1px solid var(--c-border); border-radius: var(--s-radius); background: var(--c-surface); color: var(--c-text); cursor: pointer; font: inherit; font-size: .9rem; }
        .tt-sdileni-vyber button[aria-pressed="true"] { background: var(--c-primary); border-color: var(--c-primary); color: var(--c-on-primary, #fff); }
        .tt-sdileni-plocha { position: relative; height: min(72vh, 720px); border: 1px solid var(--c-border); border-radius: var(--s-radius); overflow: hidden; background: #e8ecf0; touch-action: none; }
        .tt-sdileni-plocha canvas { display: block; width: 100%; height: 100%; }
        .tt-sdileni-plocha img { display: block; width: 100%; height: 100%; object-fit: contain; }
        .tt-sdileni-ovladani { position: absolute; left: 10px; top: 10px; display: flex; flex-wrap: wrap; gap: 4px; max-width: calc(100% - 20px); }
        .tt-sdileni-ovladani button { padding: 4px 9px; border: 1px solid #9ca3af; border-radius: 5px; background: #fff; color: #374151; font: inherit; font-size: .8rem; cursor: pointer; }
        .tt-sdileni-ovladani button[aria-pressed="false"] { opacity: .5; text-decoration: line-through; }
        .tt-sdileni-plan { background: #fff; border: 1px solid var(--c-border); border-radius: var(--s-radius); text-align: center; }
        .tt-sdileni-plan img { display: inline-block; vertical-align: top; max-width: 100%; max-height: 78vh; width: auto; height: auto; }
        .tt-sdileni-zprava { padding: 24px; color: #374151; text-align: center; }
        .tt-sdileni-pata { margin-top: 12px; color: var(--c-text-secondary); font-size: .85rem; }
        /* Logo firmy autora: na bílé destičce, loga bývají kreslená na světlý podklad */
        .tt-sdileni-hlava { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
        .tt-sdileni-logo { height: 56px; max-width: 220px; object-fit: contain; padding: 6px 10px; border-radius: var(--s-radius); background: #fff; }
    </style>
</head>
<body class="tt-web">
    <div class="topbar">
        <a href="{{ \App\Support\Domeny::url('web', '/') }}" class="brand-title" rel="noreferrer">@include('partials.znacka')</a>
    </div>
    <main class="tt-sdileni">
        <div class="tt-sdileni-hlava">
            <h1>{{ $sdileni->nazev }}</h1>
            @if ($logoFirmy)
                <img class="tt-sdileni-logo" src="{{ url('/share/' . $sdileni->token . '/logo') }}" alt="{{ __('sdileni.logo_alt') }}">
            @endif
        </div>
        <p class="tt-sdileni-stav">{{ __('sdileni.stav_k', ['datum' => trim(\App\Support\Lokalizace::datum($sdileni->upraveno) . ' ' . $sdileni->upraveno?->format('H:i'))]) }}</p>

        <div class="tt-sdileni-vyber" role="group" aria-label="{{ __('sdileni.pohled') }}" data-sdileni-vyber>
            <button type="button" aria-pressed="true" data-pohled="3d">{{ __('sdileni.pohled_3d') }}</button>
            @foreach ($sdileni->podlazi as $p)
                <button type="button" aria-pressed="false" data-pohled="plan-{{ $p['id'] }}">{{ $p['nazev'] }}</button>
            @endforeach
        </div>

        <section data-panel="3d">
            <div class="tt-sdileni-plocha" data-sdileni-plocha
                 data-model="{{ url('/share/' . $sdileni->token . '/model') }}"
                 data-nahled="{{ url('/share/' . $sdileni->token . '/soubor/nahled.png') }}"
                 data-text-strecha="{{ __('sdileni.strecha') }}"
                 data-text-autori="{{ __('sdileni.autori_modelu') }}"
                 data-autori="{{ \App\Support\Domeny::url('web', '/model-credits') }}"
                 data-text-jama="{{ __('sdileni.napoveda_jama') }}"
                 data-text-chyba="{{ __('sdileni.chyba_modelu') }}"
                 data-text-alt="{{ __('sdileni.nahled_alt', ['nazev' => $sdileni->nazev]) }}">
                <div class="tt-sdileni-zprava" data-sdileni-zprava>{{ __('sdileni.nacitam') }}</div>
                <div class="tt-sdileni-ovladani" data-sdileni-ovladani></div>
            </div>
            <p class="tt-sdileni-pata">{{ __('sdileni.napoveda_3d') }}</p>
        </section>
        @foreach ($sdileni->podlazi as $p)
            <section data-panel="plan-{{ $p['id'] }}" hidden>
                <a class="tt-sdileni-plan" style="display:block" href="{{ url('/share/' . $sdileni->token . '/soubor/plan-' . $p['id'] . '.png') }}" target="_blank" rel="noopener noreferrer" title="{{ __('sdileni.plan_cely') }}">
                    <img loading="lazy" alt="{{ __('sdileni.plan_alt', ['podlazi' => $p['nazev']]) }}" src="{{ url('/share/' . $sdileni->token . '/soubor/plan-' . $p['id'] . '.png') }}">
                </a>
            </section>
        @endforeach

        <p class="tt-sdileni-pata">{{ __('sdileni.upozorneni') }}</p>
    </main>
@include('partials.paticka')
@include('partials.error-tracker')
<script src="/js/three/three.min.js?v=r128"></script>
<script src="/js/three/OrbitControls.js?v=0.128"></script>
<script src="/js/three/GLTFLoader.js?v=0.128"></script>
<script src="/js/three/meshopt_decoder.js?v=0.128"></script>
<script src="/js/svetlo-3d.js?v={{ filemtime(public_path('js/svetlo-3d.js')) }}"></script>
<script src="/js/teren-3d.js?v={{ filemtime(public_path('js/teren-3d.js')) }}"></script>
<script>window.KATALOG_ZAKLAD = @json(config('katalog.zaklad'));</script>
<script src="/js/katalog-3d.js?v={{ filemtime(public_path('js/katalog-3d.js')) }}"></script>
{{-- Vzhledy střešních krytin, vyrábí services/krytiny/sestav.py (modules/dum.md, část Krytiny) --}}
<script>window.KRYTINY_VZHLEDY = @json(json_decode(file_get_contents(public_path('textury/krytiny/vzhledy.json')))); window.KRYTINY_VERZE = {{ filemtime(public_path('textury/krytiny/vzhledy.json')) }};</script>
<script src="/js/krytiny-3d.js?v={{ filemtime(public_path('js/krytiny-3d.js')) }}"></script>
{{-- Omítka, skla a nejnižší pohled kamery (modules/dum.md, část Fasáda, skla a pohled) --}}
<script>window.POVRCHY_VERZE = {{ filemtime(public_path('textury/omitka/normala.webp')) }};</script>
<script src="/js/povrchy-3d.js?v={{ filemtime(public_path('js/povrchy-3d.js')) }}"></script>
<script src="/js/sdileni-prohlizec.js?v={{ filemtime(public_path('js/sdileni-prohlizec.js')) }}"></script>
</body>
</html>
