{{-- Uvedení autorů modelů z katalogu, které vyžaduje licence CC BY (modules/katalog.md). --}}
<x-layouts.web :title="__('pravni.autori_titulek') . ' — TupTuDu'" :neindexovat="true">
    <article class="tt-pravni">
        <h1>{{ __('pravni.autori_titulek') }}</h1>
        <p>{{ __('pravni.autori_uvod') }}</p>
        @foreach ($zdroje as $z)
            <h2>{{ $z['nazev'] }}</h2>
            <p>
                {{ __('pravni.autori_autor') }}: {{ $z['autor'] }}.
                {{ __('pravni.autori_licence') }}: <a href="{{ $z['licenceOdkaz'] }}" rel="noopener" target="_blank">{{ $z['licence'] }}</a>.
                {{ trans_choice('pravni.autori_pocet', $z['pocet'], ['pocet' => $z['pocet']]) }}
            </p>
            <p>
                <a href="{{ $z['odkaz'] }}" rel="noopener" target="_blank">{{ $z['odkaz'] }}</a>
            </p>
            @if ($z['dila']->isNotEmpty())
                <p>{{ __('pravni.autori_dila') }}</p>
                <ul>
                    @foreach ($z['dila'] as $d)
                        <li>@if ($d['dilo'])<em>{{ $d['dilo'] }}</em>, @endif{{ $d['autor'] }}@if ($d['odkaz']), <a href="{{ $d['odkaz'] }}" rel="noopener" target="_blank">{{ $d['odkaz'] }}</a>@endif</li>
                    @endforeach
                </ul>
            @endif
        @endforeach
        <p>{{ __('pravni.autori_upravy') }}</p>
        <p>{{ __('pravni.autori_materialy') }}</p>
    </article>
</x-layouts.web>
