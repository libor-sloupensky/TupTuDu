{{-- Přepínače mřížky a parcely. Jedno nastavení na dvou místech: panel Parcela a sekce Export (výkres se jím řídí).
     Parcela a to, co k ní patří, jen když je nějaká načtená. V úzkém panelu menší, aby se vešly na řádek. --}}
@php
    $popisek = 'flex items-center cursor-pointer select-none text-xs text-gray-500 ' . (($kompaktni ?? false) ? 'gap-0.5' : 'gap-1');
    $pole = ($kompaktni ?? false) ? 'w-3 h-3' : 'rounded text-primary w-3.5 h-3.5';
@endphp
<label class="{{ $popisek }}" data-tip="{{ __('ed_sablona.parcela.mrizka_tip') }}"><input type="checkbox" x-model="showGrid" @change="toggleGrid(); ulozitNastaveni()" class="{{ $pole }}"> {{ __('ed_sablona.parcela.mrizka') }}</label>
<label x-show="katastrParcely.length > 0" class="{{ $popisek }}" data-tip="{{ __('ed_sablona.parcela.parcely_tip') }}"><input type="checkbox" x-model="katastrZobrazitParcely" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="{{ $pole }}"> {{ __('ed_sablona.parcela.parcely') }}</label>
<label x-show="katastrParcely.length > 0" class="{{ $popisek }}" data-tip="{{ __('ed_sablona.parcela.stavby_tip') }}"><input type="checkbox" x-model="katastrZobrazitStavby" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="{{ $pole }}"> {{ __('ed_sablona.parcela.stavby') }}</label>
<label x-show="katastrParcely.length > 0" class="{{ $popisek }}" data-tip="{{ __('ed_sablona.parcela.sousede_tip') }}"><input type="checkbox" x-model="katastrZobrazitSousedy" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="{{ $pole }}"> {{ __('ed_sablona.parcela.sousede') }}</label>
<label x-show="katastrParcely.length > 0" class="{{ $popisek }}" data-tip="{{ __('ed_sablona.parcela.vysky_tip') }}"><input type="checkbox" x-model="katastrZobrazitVysky" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="{{ $pole }}"> {{ __('ed_sablona.parcela.vysky') }}</label>
