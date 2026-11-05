{{-- Blok článku `::vyzva Titulek | Text`: výzva V1 (modules/brand.md). Na dotykovém zařízení se v editoru kreslit nedá,
     místo registrace nabídne poslat si odkaz. Přepíná jen CSS, obsah stránky je pro všechny stejný.
     `zdroj` se uloží k registraci (FortifyServiceProvider, modules/blog.md). --}}
@php
    [$titulek, $text] = array_pad($parametry, 2, '');
    $registrace = \App\Support\Domeny::url('app', '/register?zdroj=' . $clanek['adresa']);
@endphp
<aside class="tt-vyzva" data-vyzva>
    <div class="tt-vyzva-titulek">{!! \App\Support\Clanky::vlna(e($titulek), $clanek['jazyk']) !!}</div>
    <p class="tt-jen-mys">{!! \App\Support\Clanky::vlna(e($text), $clanek['jazyk']) !!}</p>
    <p class="tt-jen-dotyk">{{ __('clanky.vyzva_dotyk') }}</p>
    <div class="tt-vyzva-akce">
        <a class="btn btn-primary tt-jen-mys" href="{{ $registrace }}" data-vyzva-klik>{{ __('web.zacit_zdarma') }}</a>
        <button type="button" class="btn btn-primary tt-jen-dotyk" data-poslat-odkaz>{{ __('clanky.vyzva_poslat') }}</button>
    </div>
    <p class="tt-clanek-meta" data-zkopirovano hidden>{{ __('clanky.vyzva_zkopirovano') }}</p>
</aside>
