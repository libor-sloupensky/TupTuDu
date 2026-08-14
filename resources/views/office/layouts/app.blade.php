{{-- Layout modulu Doklady.

     Views modulu přišly z projektu office, kde měly vlastní navbar a
     @extends('layouts.app'). Zůstávají beze změny struktury — jen se místo
     původního navbaru vykreslí sdílený sidebar TupTuDu.com. Vlastní CSS
     modulu je zachované, aby se tabulky a formuláře nerozsypaly. --}}
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex">
    <title>TupTuDu — @yield('title', 'Doklady')</title>

    <link rel="stylesheet" href="/css/app.css?v={{ filemtime(public_path('css/app.css')) }}">
    <style>
        /* CSS převzaté z office — týká se jen obsahu modulu, ne sidebaru */
        .card { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }

        /* Přepínač firmy — v office seděl v navbaru, tady je pruh nad obsahem */
        .office-firma-bar { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; margin-bottom: 1.25rem; }
        .office-firma-bar .label { font-size: .75rem; text-transform: uppercase; letter-spacing: .05em; color: var(--c-text-secondary); font-weight: 800; }
        .firma-switcher { position: relative; display: inline-block; }
        .firma-switcher-btn { background: white; border: 1px solid var(--c-border); color: var(--c-text); padding: .4rem .7rem; border-radius: 6px; cursor: pointer; font-size: .9rem; font-weight: 600; display: flex; align-items: center; gap: .4rem; }
        .firma-switcher-btn:hover { border-color: var(--c-primary); }
        .firma-switcher-btn.klient-view { border-color: #e67e22; }
        .firma-switcher-btn .arrow { font-size: .6rem; }
        .firma-dropdown { display: none; position: absolute; top: 100%; left: 0; background: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 240px; z-index: 100; margin-top: .3rem; }
        .firma-dropdown.open { display: block; }
        .firma-dropdown form { margin: 0; }
        .firma-dropdown button { display: block; width: 100%; text-align: left; padding: .6rem 1rem; border: none; background: none; cursor: pointer; font-size: .88rem; color: var(--c-text); }
        .firma-dropdown button:hover { background: var(--c-primary-10); }
        .firma-dropdown button.active { background: var(--c-primary-20); font-weight: 600; }
        .firma-dropdown .separator { padding: .4rem 1rem; font-size: .72rem; color: #999; text-transform: uppercase; letter-spacing: .5px; border-top: 1px solid #eee; }
        .firma-dropdown button.klient-item { padding-left: 1.5rem; color: #666; }
        .firma-dropdown .add-link { display: block; padding: .6rem 1rem; font-size: .85rem; color: var(--c-primary); text-decoration: none; border-top: 1px solid #eee; }
        .firma-dropdown .add-link:hover { background: var(--c-primary-10); }
        .klient-varovani { background: #fff4e5; border: 1px solid #e67e22; color: #a04000; padding: .5rem .8rem; border-radius: 6px; font-size: .85rem; }
    </style>
    @yield('styles')
</head>
<body style="background: var(--c-bg);">
<div class="tt-layout">
    @include('partials.sidebar')

    <main class="tt-main" style="padding: 1.5rem;">
        @auth
            @php
                $__u = auth()->user();
                $__firmy = $__u->officeFirmy;
                $__aktivniIco = session('office_firma_ico');
                $__prohlizimKlienta = $__u->officeProhlizimKlienta();

                // Klientské firmy — vidí je jen uživatel v roli účetní
                $__klientFirmy = collect();
                $__ucetniIcos = $__u->officeFirmy()->wherePivot('role', 'ucetni')->pluck('office_firmy.ico')->toArray();
                if (!empty($__ucetniIcos)) {
                    $__klientIcos = \App\Models\Office\UcetniVazba::whereIn('ucetni_ico', $__ucetniIcos)
                        ->where('stav', 'schvaleno')->pluck('klient_ico')->toArray();
                    if (!empty($__klientIcos)) {
                        $__klientFirmy = \App\Models\Office\Firma::whereIn('ico', $__klientIcos)->get();
                    }
                }

                $__aktivniNazev = $__firmy->firstWhere('ico', $__aktivniIco)?->nazev
                    ?? $__klientFirmy->firstWhere('ico', $__aktivniIco)?->nazev
                    ?? $__firmy->first()?->nazev
                    ?? 'Firma';
                $__maVicFirem = $__firmy->count() + $__klientFirmy->count() > 1;
            @endphp

            @if ($__firmy->count() > 0)
                <div class="office-firma-bar">
                    <span class="label">Firma</span>
                    <div class="firma-switcher">
                        <button type="button" class="firma-switcher-btn{{ $__prohlizimKlienta ? ' klient-view' : '' }}"
                                onclick="document.getElementById('firmaDropdown').classList.toggle('open')">
                            {{ $__aktivniNazev }}
                            @if ($__maVicFirem)<span class="arrow">&#9662;</span>@endif
                        </button>
                        @if ($__maVicFirem)
                            <div class="firma-dropdown" id="firmaDropdown">
                                @foreach ($__firmy as $f)
                                    <form method="POST" action="{{ route('office.firma.prepnout', $f->ico) }}">
                                        @csrf
                                        <button type="submit" class="{{ $f->ico === $__aktivniIco ? 'active' : '' }}">{{ $f->nazev }}</button>
                                    </form>
                                @endforeach
                                @if ($__klientFirmy->count() > 0)
                                    <div class="separator">Klienti</div>
                                    @foreach ($__klientFirmy as $kf)
                                        <form method="POST" action="{{ route('office.firma.prepnout', $kf->ico) }}">
                                            @csrf
                                            <button type="submit" class="klient-item{{ $kf->ico === $__aktivniIco ? ' active' : '' }}">{{ $kf->nazev }}</button>
                                        </form>
                                    @endforeach
                                @endif
                            </div>
                        @endif
                    </div>
                    @if ($__prohlizimKlienta)
                        <span class="klient-varovani">Prohlížíte doklady klienta</span>
                    @endif
                </div>
            @endif
        @endauth

        @yield('content')
    </main>
</div>

@include('partials.error-tracker')

<script>
// Zavřít rozbalený přepínač firmy kliknutím mimo něj
document.addEventListener('click', function (e) {
    var dd = document.getElementById('firmaDropdown');
    if (dd && !e.target.closest('.firma-switcher')) {
        dd.classList.remove('open');
    }
});
</script>
@yield('scripts')
</body>
</html>
