{{-- Titulní stránka webu (tuptudu.com). Paddle ji při schvalování domény čte jako popis produktu —
     slibovat jen to, co aplikace opravdu umí (modules/platby.md). Národní služby přes @funkce. --}}
@php use App\Support\Domeny; @endphp
<x-layouts.web :title="__('web.titulek')">
    <div class="tt-vitrina">
        <section class="tt-vitrina-hlavni">
            <div>
                <h1>{{ __('web.nadpis') }}</h1>
                <p class="tt-vitrina-perex">{{ __('web.perex') }}</p>
                <div class="tt-vitrina-akce">
                    <a class="btn btn-primary" href="{{ Domeny::url('app', '/register') }}">{{ __('web.zacit_zdarma') }}</a>
                    <a class="btn" href="{{ Domeny::url('web', '/pricing') }}">{{ __('web.cenik_tlacitko') }}</a>
                </div>
            </div>
        </section>

        <section>
            <h2>{{ __('web.funkce_nadpis') }}</h2>
            <div class="tt-vitrina-mrizka">
                @foreach (['pudorys', '3d', 'podklad'] as $funkce)
                    <div class="card tt-vitrina-karta">
                        <h3>{{ __('web.funkce.' . $funkce . '.nadpis') }}</h3>
                        <p>{{ __('web.funkce.' . $funkce . '.text') }}</p>
                    </div>
                @endforeach
                @funkce('katastr')
                    <div class="card tt-vitrina-karta">
                        <h3>{{ __('web.funkce.pozemek.nadpis') }}</h3>
                        <p>{{ __('web.funkce.pozemek.text') }}</p>
                    </div>
                @endfunkce
            </div>
            <div class="tt-vitrina-pohledy">
                <figure class="card">
                    <img src="/img/vitrina/pudorys.png" width="788" height="740" alt="{{ __('web.obrazek_popis') }}" loading="lazy">
                    <figcaption>{{ __('web.obrazek_popis') }}</figcaption>
                </figure>
                <figure class="card">
                    <img src="/img/vitrina/dum-3d.png" width="788" height="740" alt="{{ __('web.obrazek_3d_popis') }}" loading="lazy">
                    <figcaption>{{ __('web.obrazek_3d_popis') }}</figcaption>
                </figure>
            </div>
        </section>

        <section>
            <h2>{{ __('web.pro_koho_nadpis') }}</h2>
            <div class="tt-vitrina-mrizka">
                @foreach (['stavebnici', 'profesionalove'] as $skupina)
                    <div class="card tt-vitrina-karta">
                        <h3>{{ __('web.pro_koho.' . $skupina . '.nadpis') }}</h3>
                        <p>{{ __('web.pro_koho.' . $skupina . '.text') }}</p>
                    </div>
                @endforeach
            </div>
        </section>

        <section>
            <h2>{{ __('web.postup_nadpis') }}</h2>
            <ol class="tt-vitrina-postup">
                @foreach (__('web.postup') as $krok)
                    <li>{{ $krok }}</li>
                @endforeach
            </ol>
            <p class="tt-napoveda">{{ __('web.upozorneni') }}</p>
        </section>

        <section class="card tt-vitrina-zaver">
            <h2>{{ __('web.zaver_nadpis') }}</h2>
            <p>{{ __('web.zaver_text') }}</p>
            <div class="tt-vitrina-akce">
                <a class="btn btn-primary" href="{{ Domeny::url('app', '/register') }}">{{ __('web.zacit_zdarma') }}</a>
                <a class="btn" href="{{ Domeny::url('web', '/pricing') }}">{{ __('web.cenik_tlacitko') }}</a>
            </div>
        </section>
    </div>
</x-layouts.web>
