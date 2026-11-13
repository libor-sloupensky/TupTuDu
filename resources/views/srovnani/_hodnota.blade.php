{{-- Jedna hodnota parametru: značka + slovo („má“; s $odpoved „ano“ pro otázky jako „Je zdarma?“), u seznamu jazyků
     názvy, u textu odrážky (_text). Poznámka pod tím. V náhledu (Masterteam) se hodnota bez dokladu orámuje. --}}
@php
    $bezDokladu = ! $s->verejne && $h && ! $h->lzeZverejnit();
    $slova = ($odpoved ?? false) ? 'srovnani.odpoved.' : 'srovnani.stav.';
@endphp
@if(! $h)
    {{-- nenalezeno: v popisu, ceníku ani nápovědě výrobce jsme zmínku nenašli (modules/srovnani.md, Doplnění B) --}}
    <span class="sr-h sr-tlumene sr-tip" title="{{ __('srovnani.nenalezeno_tip') }}"><i class="sr-d q"></i> {{ __('srovnani.nezjisteno') }}</span>
@else
    <span @class(['sr-bez-dokladu' => $bezDokladu]) @if($bezDokladu) title="Bez dokladu nebo starší než 6 měsíců – na webu by se nezobrazilo" @endif>
        @if($p->typ === 'stav')
            @php $v = $h->hodnota === 'skryte' ? 'ne' : ($h->hodnota ?? '?'); @endphp
            <span @class(['sr-h', 'sr-tip' => $v === '?']) @if($v === '?') title="{{ __('srovnani.nenalezeno_tip') }}" @endif><i class="sr-d {{ $v === '?' ? 'q' : $v }}"></i> {{ __($slova . $v) }}</span>
            @if($h->placene) <span class="sr-stitek">{{ __('srovnani.placene') }}</span>@endif
        @elseif($p->typ === 'seznam')
            {{ collect($h->data ?? [])->map(fn ($j) => \Illuminate\Support\Facades\Lang::has('srovnani.jazyk.' . $j) ? __('srovnani.jazyk.' . $j) : $j)->implode(', ') ?: __('srovnani.nezjisteno') }}
        @elseif($p->typ === 'text')
            @include('srovnani._text', ['text' => $s->text($h) ?: $h->kratce()])
        @else
            {{ $s->text($h) ?: ($h->kratce() ?: __('srovnani.nezjisteno')) }}
        @endif
        @if(($poznamka ?? true) && ($pozn = $s->poznamka($h)))<span class="sr-pozn">{{ $pozn }}</span>@endif
    </span>
@endif
