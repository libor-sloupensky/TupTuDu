{{-- Přehled srovnávaných nástrojů v jazyce (modules/srovnani.md): verze zdarma, jazyk čtenáře, platformy, odkazy. --}}
@use('App\Http\Controllers\SrovnaniController')
@php $rok = $data->first()?->mereni?->datum->year ?? date('Y'); @endphp
<x-layouts.web :title="__('srovnani.prehled_titulek', ['rok' => $rok])" :popis="__('srovnani.prehled_popis')" :verze="$verze" :prepinac="$prepinac">
<x-slot:hlava>@include('srovnani._spolecne')</x-slot:hlava>
<main class="sr">
    <h1>{{ __('srovnani.prehled_h1') }}</h1>
    <p style="font-size:18px">{{ __('srovnani.prehled_uvod') }}</p>
    <p class="sr-autor">{{ __('srovnani.autor', ['datum' => \App\Support\Lokalizace::datum($data->map->overeno()->filter()->max()) ?? '—']) }}</p>
    <div class="sr-obal">
        <table class="sr-tab">
            <thead><tr>
                <th>{{ __('srovnani.prehled_nastroj') }}</th><th>{{ __('srovnani.prehled_zdarma') }}</th>
                <th>{{ __('srovnani.prehled_jazyk') }}</th><th>{{ __('srovnani.prehled_bezi') }}</th><th>{{ __('srovnani.prehled_stranky') }}</th>
            </tr></thead>
            <tbody>
            @foreach(collect([$my])->filter()->concat($data) as $s)
                @php
                    $k = $s->konkurent;
                    $jeMy = $k->jeTuptudu();
                    $jazyky = $s->hodnota($k, $s->parametr('i_jazyky_nastroj'))?->data;
                    $odkaz = $jeMy ? \App\Support\Lokalizace::adresaWebu('/') : SrovnaniController::adresa($k, $jazyk);
                @endphp
                <tr @class(['sr-my' => $jeMy])>
                    <td><a href="{{ $odkaz }}"><b>{{ $k->jmeno() }}</b></a>@if($jeMy) <span class="sr-stitek">{{ __('srovnani.prehled_my') }}</span>@endif
                        @if($popis = $k->verejne('popis', $jazyk))<span class="sr-pozn">{{ \Illuminate\Support\Str::limit($popis, 120) }}</span>@endif</td>
                    <td>@include('srovnani._hodnota', ['h' => $s->hodnota($k, $s->parametr('h_zdarma')), 'p' => $s->parametr('h_zdarma'), 'poznamka' => false, 'odpoved' => true])</td>
                    <td>
                        @if($jazyky === null)
                            <span class="sr-tlumene">{{ __('srovnani.nezjisteno') }}</span>
                        @else
                            <span class="sr-h"><i class="sr-d {{ in_array($jazyk, $jazyky, true) ? 'ano' : 'ne' }}"></i> {{ in_array($jazyk, $jazyky, true) ? __('srovnani.ano') : __('srovnani.ne') }}</span>
                        @endif
                    </td>
                    <td style="font-size:13.5px">{{ $k->verejne('platformy', $jazyk) }}</td>
                    <td style="white-space:nowrap">@unless($jeMy)<a href="{{ SrovnaniController::adresa($k, $jazyk) }}">{{ __('srovnani.profil') }}</a> · <a href="{{ SrovnaniController::adresa($k, $jazyk, true) }}">{{ __('srovnani.srovnani_s') }}</a>@endunless</td>
                </tr>
            @endforeach
            </tbody>
        </table>
    </div>
    <section class="sr-metodika">
        <h2 style="font-size:18px;margin-top:0">{{ __('srovnani.metodika_nadpis') }}</h2>
        <p>{{ __('srovnani.metodika_1') }}</p>
        <p>{{ __('srovnani.metodika_2') }}</p>
    </section>
</main>
</x-layouts.web>
