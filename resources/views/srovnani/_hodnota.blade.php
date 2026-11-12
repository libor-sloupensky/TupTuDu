{{-- Jedna hodnota parametru: značka + slovo, u seznamu jazyků názvy, u čísla a textu text. Poznámka pod tím.
     V náhledu se hodnota bez dokladu orámuje (na webu by se nezobrazila). --}}
@php
    $jazyky = ['cs' => 'čeština', 'sk' => 'slovenština', 'pl' => 'polština', 'de' => 'němčina', 'fr' => 'francouzština', 'es' => 'španělština', 'it' => 'italština', 'en' => 'angličtina', 'nl' => 'nizozemština', 'pt' => 'portugalština', 'ru' => 'ruština', 'uk' => 'ukrajinština', 'ja' => 'japonština', 'zh' => 'čínština', 'ko' => 'korejština', 'sv' => 'švédština', 'da' => 'dánština', 'no' => 'norština', 'nb' => 'norština', 'fi' => 'finština', 'tr' => 'turečtina', 'hu' => 'maďarština'];
    $slova = ['ano' => 'má', 'castecne' => 'částečně', 'ne' => 'nemá', '?' => 'nezjištěno', 'skryte' => 'nemá'];
@endphp
@if(! $h)
    <span class="sr-h sr-tlumene"><i class="sr-d q"></i> nezjištěno</span>
@else
    <span class="{{ ($nahled ?? false) && ! $h->lzeZverejnit() ? 'sr-bez-dokladu' : '' }}" @if(($nahled ?? false) && ! $h->lzeZverejnit()) title="Bez dokladu nebo starší než 6 měsíců – na webu by se nezobrazilo" @endif>
        @if($p->typ === 'stav')
            @php $v = $h->hodnota === 'skryte' ? 'ne' : ($h->hodnota ?? '?'); @endphp
            <span class="sr-h"><i class="sr-d {{ $v === '?' ? 'q' : $v }}"></i> {{ $slova[$v] ?? $v }}</span>
            @if($h->placene) <span class="sr-stitek">placené</span>@endif
        @elseif($p->typ === 'seznam')
            {{ collect($h->data ?? [])->map(fn ($j) => $jazyky[$j] ?? $j)->implode(', ') ?: 'nezjištěno' }}
        @else
            {{ $h->kratce() ?: 'nezjištěno' }}{{ $p->jednotka && $p->typ === 'cislo' ? ' ' . $p->jednotka : '' }}
        @endif
        @if($h->poznamka && ($poznamka ?? true))<span class="sr-pozn">{{ $h->poznamka }}</span>@endif
    </span>
@endif
