{{-- Společný nástroj na výběr barvy: chování v public/js/koncept-v3/vyber-barvy.js.
     Vkládá se do prvku s x-data="vyberBarvy({...})", parametr $popisek je text řádku. --}}
<div x-effect="zHodnoty()">
    <div class="kk-podlazi-pole"><span class="w-24 shrink-0">{{ $popisek ?? 'Barva' }}</span>
        <button type="button" class="kk-barva-symbol" :style="{ background: hex }" :aria-expanded="otevreno" data-barva-symbol
                title="Otevřít výběr barvy" aria-label="Otevřít výběr barvy" @click="prepni()"></button>
        <span class="truncate" x-text="popis"></span>
    </div>
    <template x-if="otevreno">
        <div class="kk-barva-nastroj" data-barva-nastroj>
            {{-- Vzorek: původní barva a ta, která se právě volí --}}
            <div class="kk-barva-vzorek">
                <button type="button" :style="{ background: puvodni }" title="Vrátit původní barvu" aria-label="Vrátit původní barvu" data-barva-puvodni @click="vyber(puvodni)"><span>Původní</span></button>
                <div :style="{ background: hex }" data-barva-nova><span>Nová</span></div>
            </div>
            <div class="kk-barva-kod">
                <span x-text="hex"></span>
                <button type="button" x-show="!ralPresny && ralNejblizsi" class="underline hover:text-primary" title="Nastaví přesně odstín z pole RAL" data-barva-nejblizsi @click="vyber(ralNejblizsi.hex)">použít přesný RAL</button>
            </div>

            <label class="kk-barva-posuvnik" title="Barevný tón"><span>Odstín <output x-text="hsl.h + '°'"></output></span>
                <input type="range" min="0" max="360" step="1" data-barva-posuvnik="h" :value="hsl.h" :style="{ background: stopaOdstin }" @input="posun('h', $event.target.value)" @change="potvrd()"></label>
            <label class="kk-barva-posuvnik" title="Od šedé po čistou barvu"><span>Sytost <output x-text="hsl.s + ' %'"></output></span>
                <input type="range" min="0" max="100" step="1" data-barva-posuvnik="s" :value="hsl.s" :style="{ background: stopaSytost }" @input="posun('s', $event.target.value)" @change="potvrd()"></label>
            <label class="kk-barva-posuvnik" title="Od černé přes barvu po bílou"><span>Jas <output x-text="hsl.l + ' %'"></output></span>
                <input type="range" min="0" max="100" step="1" data-barva-posuvnik="l" :value="hsl.l" :style="{ background: stopaJas }" @input="posun('l', $event.target.value)" @change="potvrd()"></label>

            <div class="kk-podlazi-pole" title="Odstín zvolené barvy, jde zkopírovat. Pro změnu napište čtyřmístný kód, nebo začněte psát název. Barva na obrazovce je orientační."><span class="w-24 shrink-0" x-text="ralPresny ? 'RAL' : 'Nejbližší RAL'"></span>
                <input type="text" class="flex-1 min-w-0" list="kk-ral-seznam" data-barva-ral :value="ralPole"
                       @focus="$event.target.select()" @change="zadejRal($event.target.value); if (!ralChyba) $event.target.value = ralPole" @keydown.enter.prevent="$event.target.blur()"></div>
            <div x-show="ralChyba" style="color: var(--c-error)" x-text="ralChyba"></div>

            <template x-if="pouzite.length">
                <div class="flex flex-col gap-1">
                    <span title="Barvy, které jsou teď jinde na domě. Klepnutím tuhle část sjednotíte s nimi.">Jinde použité</span>
                    <div class="flex flex-wrap gap-1" data-barva-pouzite>
                        <template x-for="b in pouzite" :key="b.hex">
                            <button type="button" class="kk-paleta-krytina" :class="b.hex === hex && 'kk-aktivni'" :style="{ background: b.hex }" :title="b.kde + ' · ' + b.hex" :aria-label="b.kde + ' ' + b.hex" @click="vyber(b.hex)"></button>
                        </template>
                    </div>
                </div>
            </template>
        </div>
    </template>
</div>
