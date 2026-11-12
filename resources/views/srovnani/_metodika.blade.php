{{-- Metodika a zdroje: povinná část každé srovnávací stránky (modules/srovnani.md, Právní rámec). --}}
@php $jmeno = $s->konkurent->jmeno(); $zdroje = $s->zdroje($s->konkurent); @endphp
<section class="sr-metodika">
    <h2 style="font-size:18px;margin-top:0">{{ __('srovnani.metodika_nadpis') }}</h2>
    <p>{{ __('srovnani.metodika_1') }}</p>
    <p>{{ __('srovnani.metodika_2') }}</p>
    <p><a href="{{ \App\Support\Lokalizace::adresaWebu('/contact') }}">{{ __('srovnani.metodika_zastupce', ['nazev' => $jmeno]) }}</a></p>
    <p>{{ __('srovnani.metodika_znamka', ['nazev' => $jmeno]) }}</p>
    @if($zdroje)
        <details style="margin-top:8px"><summary>{{ __('srovnani.zdroje', ['n' => count($zdroje)]) }}</summary>
            <ul style="margin-top:6px">@foreach($zdroje as $z)<li style="overflow-wrap:anywhere"><a href="{{ $z }}" rel="nofollow noopener" target="_blank">{{ $z }}</a></li>@endforeach</ul>
        </details>
    @endif
</section>
