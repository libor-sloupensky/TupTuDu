{{-- Přepínače zobrazení půdorysu. Jedno nastavení na dvou místech: panel Objekty a sekce Export (výkres se jím řídí). --}}
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.steny_tip') }}">
    <input type="checkbox" x-model="showSteny" @change="toggleSteny()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.steny') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.otvory_tip') }}">
    <input type="checkbox" x-model="showOtvory" @change="toggleOtvory()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.otvory') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.koty_tip') }}">
    <input type="checkbox" x-model="showKoty" @change="toggleKoty()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.koty') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.znacky_tip') }}">
    <input type="checkbox" x-model="showZnacky" @change="toggleZnacky()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.znacky') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.body_tip') }}">
    <input type="checkbox" x-model="showNodes" @change="if(renderer){renderer.showNodes=showNodes;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.body') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.mistnosti_tip') }}">
    <input type="checkbox" x-model="showMistnosti" @change="if(renderer){renderer.showMistnosti=showMistnosti;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.mistnosti') }}
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="{{ __('ed_sablona.objekty.vybaveni_tip') }}">
    <input type="checkbox" x-model="showVybaveni" @change="if(renderer){renderer.showVybaveni=showVybaveni;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    {{ __('ed_sablona.objekty.vybaveni') }}
</label>
