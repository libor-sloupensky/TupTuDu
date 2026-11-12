{{-- Jedna hodnota parametru: značka + slovo, u seznamu jazyků názvy, u textu text v jazyce stránky. Poznámka pod tím.
     V náhledu (Masterteam) se hodnota bez dokladu orámuje: na webu by se nezobrazila. --}}
@php
    $nazevParametru = fn ($p) => \Illuminate\Support\Facades\Lang::has('srovnani.p.' . $p->klic) ? __('srovnani.p.' . $p->klic) : $p->nazev;
    $bezDokladu = ! $s->verejne && $h && ! $h->lzeZverejnit();
@endphp
@if(! $h)
    <span class="sr-h sr-tlumene"><i class="sr-d q"></i> {{ __('srovnani.nezjisteno') }}</span>
@else
    <span @class(['sr-bez-dokladu' => $bezDokladu]) @if($bezDokladu) title="Bez dokladu nebo starší než 6 měsíců – na webu by se nezobrazilo" @endif>
        @if($p->typ === 'stav')
            @php $v = $h->hodnota === 'skryte' ? 'ne' : ($h->hodnota ?? '?'); @endphp
            <span class="sr-h"><i class="sr-d {{ $v === '?' ? 'q' : $v }}"></i> {{ __('srovnani.stav.' . $v) }}</span>
            @if($h->placene) <span class="sr-stitek">{{ __('srovnani.placene') }}</span>@endif
        @elseif($p->typ === 'seznam')
            {{ collect($h->data ?? [])->map(fn ($j) => \Illuminate\Support\Facades\Lang::has('srovnani.jazyk.' . $j) ? __('srovnani.jazyk.' . $j) : $j)->implode(', ') ?: __('srovnani.nezjisteno') }}
        @else
            {{ $s->text($h) ?: ($h->kratce() ?: __('srovnani.nezjisteno')) }}
        @endif
        @if(($poznamka ?? true) && ($pozn = $s->poznamka($h)))<span class="sr-pozn">{{ $pozn }}</span>@endif
    </span>
@endif
