{{--
    Sdílená horní lišta kategorií bugů — /masterteam/bugy + /masterteam/seo-404.
    Parametry:
      $aktivni  = klíč aktivní záložky ('vse'|'server'|'client'|'pomaly'|'dotazy'|'ztraceno')
      $pocty    = pole počtů (server, client, pomaly, dotazy, ztraceno)
      $stav     = (volitelné) zachování filtru stav na odkazech do /bugy
--}}
@php
    $stav = $stav ?? null;
    $bugUrl = fn ($typ) => route('masterteam.bugy') . '?typ=' . $typ . ($stav ? '&stav=' . $stav : '');
    $zalozky = [
        ['klic' => 'vse',      'label' => 'Všechny typy',    'url' => $bugUrl('vse'),      'pocet' => null,                     'barva' => ''],
        ['klic' => 'server',   'label' => 'Server',          'url' => $bugUrl('server'),   'pocet' => $pocty['server']   ?? 0,  'barva' => 'text-red-600'],
        ['klic' => 'client',   'label' => 'Klient (JS)',     'url' => $bugUrl('client'),   'pocet' => $pocty['client']   ?? 0,  'barva' => 'text-amber-600'],
        ['klic' => 'ztraceno', 'label' => '404 (ztracené)',  'url' => route('masterteam.seo404'), 'pocet' => $pocty['ztraceno'] ?? 0, 'barva' => 'text-gray-500'],
        // Perf-monitoring (Pomalé stránky / DB dotazy) záměrně NENÍ v menu — nejsou to bugy.
        // Data se dál logují do tabulky bugy (typ pomaly_request/pomaly_dotaz), lze dotázat SQL.
    ];
@endphp
<div class="inline-flex flex-wrap rounded-lg border border-gray-200 bg-white p-1 text-sm">
    @foreach($zalozky as $z)
        <a href="{{ $z['url'] }}"
           class="rounded-md px-3 py-1.5 transition {{ $aktivni === $z['klic'] ? 'bg-gray-200 text-gray-900' : 'text-gray-700 hover:bg-gray-50' }}">
            {{ $z['label'] }}
            @if($z['pocet'] !== null && $z['pocet'] > 0)
                <span class="ml-1 text-xs {{ $z['barva'] }}">({{ $z['pocet'] }})</span>
            @endif
        </a>
    @endforeach
</div>
