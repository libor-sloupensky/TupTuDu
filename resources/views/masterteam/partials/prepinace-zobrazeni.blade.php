{{-- Přepínače zobrazení půdorysu. Jedno nastavení na dvou místech: panel Objekty a sekce Export (výkres se jím řídí). --}}
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Zobrazit/skrýt stěny">
    <input type="checkbox" x-model="showSteny" @change="toggleSteny()" class="rounded text-primary w-3.5 h-3.5">
    Stěny
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Zobrazit/skrýt okna a dveře">
    <input type="checkbox" x-model="showOtvory" @change="toggleOtvory()" class="rounded text-primary w-3.5 h-3.5">
    Otvory
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Rozměry kolem domu a v místnostech. U vybrané stěny a otvoru jsou vidět vždy">
    <input type="checkbox" x-model="showKoty" @change="toggleKoty()" class="rounded text-primary w-3.5 h-3.5">
    Kóty
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Označení stěn a otvorů ve výkresu (W38, O41)">
    <input type="checkbox" x-model="showZnacky" @change="toggleZnacky()" class="rounded text-primary w-3.5 h-3.5">
    Značky
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Uzlové body všech stěn. Vypnuto: jen u vybrané stěny">
    <input type="checkbox" x-model="showNodes" @change="if(renderer){renderer.showNodes=showNodes;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    Body
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Zvýraznění místností (názvy + plocha)">
    <input type="checkbox" x-model="showMistnosti" @change="if(renderer){renderer.showMistnosti=showMistnosti;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    Místnosti
</label>
<label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Nábytek a vybavení (kuchyně, koupelna, spotřebiče)">
    <input type="checkbox" x-model="showVybaveni" @change="if(renderer){renderer.showVybaveni=showVybaveni;renderer.render()};ulozitNastaveni()" class="rounded text-primary w-3.5 h-3.5">
    Vybavení
</label>
