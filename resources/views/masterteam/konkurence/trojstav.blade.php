{{-- Trojcestný přepínač sledovat / tiše / nesledovat. Čte a mění `rezim` z x-data nadřazeného řádku. --}}
<div class="kn-tri" role="group" aria-label="Režim sledování">
    @foreach(\App\Models\KonkurenceParametr::REZIMY as $r => $popisek)
        <button type="button" data-r="{{ $r }}" :aria-pressed="rezim === '{{ $r }}'"
                @click="knNastavRezim(@js($url), '{{ $r }}', $el)">{{ $popisek }}</button>
    @endforeach
</div>
