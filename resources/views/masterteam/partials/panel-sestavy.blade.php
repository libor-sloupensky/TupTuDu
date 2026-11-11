{{-- Panel nábytkové sestavy (kuchyňská linka, vestavěná skříň), chování v public/js/koncept-v3/sestavy.js,
     popis v modules/sestavy.md. Vkládá se do panelu na plátně, hodnoty bere z inspector (kind 'sestava').
     Pole platí ihned jako ve všech panelech editoru (_poleIhnedInit): :value + @change + Enter odejde z pole. --}}
@php
    $krizek = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
    $povrchyKuchyne = [['klic' => 'cela', 'lesk' => true], ['klic' => 'korpus', 'lesk' => false], ['klic' => 'deska', 'lesk' => false]];
@endphp
<div class="flex flex-col gap-1.5 w-full" data-panel-sestavy style="width:372px;max-width:100%">
    {{-- Jeden kořen: šablona x-if bere jen první prvek --}}
    <datalist id="kk-sestava-sirky">@foreach ([30, 40, 45, 50, 60, 80, 90, 100] as $s)<option value="{{ $s }}"></option>@endforeach</datalist>
    <div class="flex items-center gap-2">
        <span class="kk-oznaceni text-teal-700 bg-teal-50" x-text="inspector.id"></span>
        <span class="text-gray-600 font-medium whitespace-nowrap" x-text="inspector.nazev"></span>
        <span class="text-gray-500 whitespace-nowrap" x-text="inspector.delka"></span>
        <button type="button" @click="smazatSestavu()" class="kk-smazat ml-auto" data-sestava-smaz>{!! $krizek !!}{{ __('ed_sablona.spolecne.smazat') }}</button>
    </div>
    <div class="kk-dily" role="group" aria-label="{{ __('ed_sablona.sestava.zalozky') }}" data-sestava-zalozky>
        <button type="button" data-sestava-zalozka="skrinky" :class="sestavaZalozka === 'skrinky' && 'kk-zap'" @click="sestavaZalozka = 'skrinky'"
                x-text="inspector.druh === 'skrin' ? preloz('ed_sablona.sestava.zalozka_dvere') : preloz('ed_sablona.sestava.zalozka_skrinky')"></button>
        <button type="button" data-sestava-zalozka="rozmery" :class="sestavaZalozka === 'rozmery' && 'kk-zap'" @click="sestavaZalozka = 'rozmery'">{{ __('ed_sablona.sestava.zalozka_rozmery') }}</button>
        <button type="button" data-sestava-zalozka="povrchy" :class="sestavaZalozka === 'povrchy' && 'kk-zap'" @click="sestavaZalozka = 'povrchy'">{{ __('ed_sablona.sestava.zalozka_povrchy') }}</button>
    </div>
    <div class="flex flex-col gap-1.5" style="max-height:62vh;overflow-y:auto;overflow-x:hidden">

        {{-- ── Skříňky / dveře: nákres zepředu, klik vybere skříňku, tah ji přesune ── --}}
        <template x-if="sestavaZalozka === 'skrinky'">
            <div class="flex flex-col gap-1.5">
                <div class="rounded" style="border:1px solid var(--c-border);cursor:pointer;background:var(--c-surface)" x-html="inspector.nakres" data-sestava-nakres-obal
                     @pointerdown.prevent="sestavaNakresStisk($event)" @pointermove="sestavaNakresPohyb($event)" @pointerup="sestavaNakresPusteni($event)" @pointercancel="sestavaNakresPusteni($event)"></div>
                <div class="text-gray-500 leading-snug" x-show="inspector.druh === 'kuchyn' && !inspector.sloupec">{{ __('ed_sablona.sestava.nakres_tip') }}</div>
                <template x-for="(t, i) in inspector.varovani" :key="i">
                    <div class="leading-snug" style="color:var(--c-warning-text, #b45309)" x-text="'⚠ ' + t"></div>
                </template>
                <button type="button" x-show="inspector.odSteny" @click="sestavaPritahni()" class="border rounded px-2 self-start" data-sestava-pritahni>{{ __('ed_sablona.sestava.pritahnout') }}</button>

                {{-- Kuchyň bez vybrané skříňky --}}
                <template x-if="inspector.druh === 'kuchyn' && !inspector.sloupec">
                    <div class="flex items-center gap-1 flex-wrap">
                        <button type="button" @click="sestavaVybavZnovu()" class="border rounded px-2" title="{{ __('ed_sablona.sestava.vybavit_tip') }}" data-sestava-vybavit>{{ __('ed_sablona.sestava.vybavit') }}</button>
                        <button type="button" @click="sestavaPridejSloupec()" class="border rounded px-2" data-sestava-pridat>{{ __('ed_sablona.sestava.pridat') }}</button>
                    </div>
                </template>

                {{-- Vybraná skříňka (sloupec) --}}
                <template x-if="inspector.druh === 'kuchyn' && inspector.sloupec">
                    <div class="flex flex-col gap-1.5 pt-1.5" style="border-top:1px solid var(--c-border)" data-sestava-sloupec-panel>
                        <div class="flex items-center gap-1">
                            <span class="text-gray-700 font-medium whitespace-nowrap" x-text="inspector.sloupec.lista ? preloz('ed_sablona.sestava.lista') : preloz('ed_sablona.sestava.skrinka', { cislo: inspector.sloupec.cislo })"></span>
                            <button type="button" class="border rounded px-1.5 ml-auto" :disabled="!inspector.sloupec.muzeVlevo" @click="sestavaPosunSloupec(-1)" title="{{ __('ed_sablona.sestava.vlevo') }}" aria-label="{{ __('ed_sablona.sestava.vlevo') }}" data-sestava-vlevo>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg></button>
                            <button type="button" class="border rounded px-1.5" :disabled="!inspector.sloupec.muzeVpravo" @click="sestavaPosunSloupec(1)" title="{{ __('ed_sablona.sestava.vpravo') }}" aria-label="{{ __('ed_sablona.sestava.vpravo') }}" data-sestava-vpravo>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
                            <button type="button" class="border rounded px-1.5" x-show="inspector.sloupec.sirkaCm >= 30" @click="sestavaRozdelSloupec()" data-sestava-rozdelit>{{ __('ed_sablona.sestava.rozdelit') }}</button>
                            <button type="button" class="kk-smazat" @click="sestavaOdeberSloupec()" data-sestava-odebrat>{!! $krizek !!}{{ __('ed_sablona.sestava.odebrat') }}</button>
                        </div>
                        <div class="kk-mrizka">
                            <span class="text-gray-500">{{ __('ed_sablona.sestava.sirka') }}</span>
                            <span class="kk-pole-jed"><input type="number" min="15" max="120" step="1" list="kk-sestava-sirky" data-sestava-sloupec="sirka"
                                   :value="inspector.sloupec.sirkaCm" @change="setSloupec('sirka', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                            <template x-if="!inspector.sloupec.lista">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.skladba_nazev') }}</span>
                                    <select data-sestava-sloupec="skladba" @change="setSloupec('skladba', $event.target.value)">
                                        <template x-for="o in sestavaVolby.skladba" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.skladba" x-text="o.nazev"></option></template>
                                    </select>
                                </div>
                            </template>
                            {{-- Spodní skříňka: čelo, počet, v desce --}}
                            <template x-if="['spodni', 'spodni_horni'].includes(inspector.sloupec.skladba)">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.dole') }}</span>
                                    <div class="flex items-center gap-1">
                                        <select data-sestava-sloupec="spodni.celo" @change="setSloupec('spodni.celo', $event.target.value)">
                                            <template x-for="o in sestavaVolby.celoSpodni" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.spodni.celo" x-text="o.nazev"></option></template>
                                        </select>
                                        <template x-if="sestavaPocty(inspector.sloupec.spodni.celo)">
                                            <select data-sestava-sloupec="spodni.pocet" :aria-label="preloz('ed_sablona.sestava.pocet')" @change="setSloupec('spodni.pocet', $event.target.value)">
                                                <template x-for="n in sestavaPocty(inspector.sloupec.spodni.celo)" :key="n"><option :value="n" :selected="n === inspector.sloupec.spodni.pocet" x-text="n + '×'"></option></template>
                                            </select>
                                        </template>
                                    </div>
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.v_desce') }}</span>
                                    <div class="flex items-center gap-1">
                                        <select data-sestava-sloupec="spodni.vDesce" @change="setSloupec('spodni.vDesce', $event.target.value)">
                                            <template x-for="o in sestavaVolby.vDesce" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.spodni.vDesce" x-text="o.nazev"></option></template>
                                        </select>
                                        <template x-if="inspector.sloupec.spodni.vDesce === 'drez'">
                                            <select data-sestava-sloupec="spodni.drez" @change="setSloupec('spodni.drez', $event.target.value)">
                                                <template x-for="o in sestavaVolby.drez" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.spodni.drez" x-text="o.nazev"></option></template>
                                            </select>
                                        </template>
                                        <template x-if="inspector.sloupec.spodni.vDesce === 'varna'">
                                            <select data-sestava-sloupec="spodni.varna" @change="setSloupec('spodni.varna', $event.target.value)">
                                                <template x-for="o in sestavaVolby.varna" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.spodni.varna" x-text="o.nazev"></option></template>
                                            </select>
                                        </template>
                                    </div>
                                    <template x-if="inspector.sloupec.spodni.celo === 'mycka'">
                                        <div style="display:contents">
                                            <span class="text-gray-500">{{ __('ed_sablona.sestava.celoSpodni.mycka') }}</span>
                                            <select data-sestava-sloupec="spodni.mycka" @change="setSloupec('spodni.mycka', $event.target.value)">
                                                <template x-for="o in sestavaVolby.mycka" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.spodni.mycka" x-text="o.nazev"></option></template>
                                            </select>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            {{-- Horní skříňka --}}
                            <template x-if="inspector.sloupec.skladba === 'spodni_horni'">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.nahore') }}</span>
                                    <div class="flex items-center gap-1">
                                        <select data-sestava-sloupec="horni.celo" @change="setSloupec('horni.celo', $event.target.value)">
                                            <template x-for="o in sestavaVolby.celoHorni" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.horni.celo" x-text="o.nazev"></option></template>
                                        </select>
                                        <template x-if="sestavaPocty(inspector.sloupec.horni.celo)">
                                            <select data-sestava-sloupec="horni.pocet" :aria-label="preloz('ed_sablona.sestava.pocet')" @change="setSloupec('horni.pocet', $event.target.value)">
                                                <template x-for="n in sestavaPocty(inspector.sloupec.horni.celo)" :key="n"><option :value="n" :selected="n === inspector.sloupec.horni.pocet" x-text="n + '×'"></option></template>
                                            </select>
                                        </template>
                                    </div>
                                    <template x-if="inspector.sloupec.podOknem">
                                        <div style="display:contents">
                                            <span></span>
                                            <label title="{{ __('ed_sablona.sestava.pod_oknem') }}"><input type="checkbox" data-sestava-sloupec="horni.presOkno" :checked="inspector.sloupec.horni.presOkno" @change="setSloupec('horni.presOkno', $event.target.checked)">{{ __('ed_sablona.sestava.pres_okno') }}</label>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            {{-- Vysoká skříň --}}
                            <template x-if="inspector.sloupec.skladba === 'vysoka'">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.napln') }}</span>
                                    <div class="flex items-center gap-1">
                                        <select data-sestava-sloupec="vysoka.celo" @change="setSloupec('vysoka.celo', $event.target.value)">
                                            <template x-for="o in sestavaVolby.celoVysoke" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.vysoka.celo" x-text="o.nazev"></option></template>
                                        </select>
                                        <template x-if="sestavaPocty(inspector.sloupec.vysoka.celo, true)">
                                            <select data-sestava-sloupec="vysoka.pocet" :aria-label="preloz('ed_sablona.sestava.nad_sebou')" :title="preloz('ed_sablona.sestava.nad_sebou')" @change="setSloupec('vysoka.pocet', $event.target.value)">
                                                <template x-for="n in sestavaPocty(inspector.sloupec.vysoka.celo, true)" :key="n"><option :value="n" :selected="n === inspector.sloupec.vysoka.pocet" x-text="n + '×'"></option></template>
                                            </select>
                                        </template>
                                    </div>
                                    <template x-if="inspector.sloupec.vysoka.celo === 'dvirka'">
                                        <div style="display:contents">
                                            <span></span>
                                            <label><input type="checkbox" data-sestava-sloupec="vysoka.dvoje" :checked="inspector.sloupec.vysoka.dvoje" @change="setSloupec('vysoka.dvoje', $event.target.checked)">{{ __('ed_sablona.sestava.vedle_sebe') }}</label>
                                        </div>
                                    </template>
                                </div>
                            </template>
                            {{-- Volné místo: volně stojící spotřebič, nad ním může být horní skříňka --}}
                            <template x-if="inspector.sloupec.skladba === 'volne'">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.co_stoji') }}</span>
                                    <select data-sestava-sloupec="volne.spotrebic" @change="setSloupec('volne.spotrebic', $event.target.value)">
                                        <template x-for="o in sestavaVolby.volne" :key="o.id"><option :value="o.id" :selected="o.id === inspector.sloupec.volne.spotrebic" x-text="o.nazev"></option></template>
                                    </select>
                                    <span></span>
                                    <label><input type="checkbox" data-sestava-sloupec="volne.horni" :checked="inspector.sloupec.volne.horni" @change="setSloupec('volne.horni', $event.target.checked)">{{ __('ed_sablona.sestava.horni_nad') }}</label>
                                </div>
                            </template>
                        </div>
                        <div class="text-gray-500 leading-snug" x-show="inspector.sloupec.lista">{{ __('ed_sablona.sestava.lista_tip') }}</div>
                        <div class="text-gray-500 leading-snug" x-show="inspector.sloupec.podOknem && !inspector.sloupec.horni.presOkno">{{ __('ed_sablona.sestava.pod_oknem') }}</div>
                        <button type="button" @click="sestavaVyberSloupec(null)" class="border rounded px-2 self-start" data-sestava-cela>{{ __('ed_sablona.sestava.cela_sestava') }}</button>
                    </div>
                </template>

                {{-- Vestavěná skříň: dveře --}}
                <template x-if="inspector.druh === 'skrin'">
                    <div class="flex flex-col gap-1.5">
                        <div class="kk-mrizka">
                            <span class="text-gray-500">{{ __('ed_sablona.sestava.dvere_nazev') }}</span>
                            <div class="kk-dily" role="group" data-sestava-dvere>
                                <template x-for="o in sestavaVolby.dvere" :key="o.id">
                                    <button type="button" :data-sestava-dvere-druh="o.id" :class="inspector.dvereDruh === o.id && 'kk-zap'" @click="setSestava('dvere', o.id)" x-text="o.nazev"></button>
                                </template>
                            </div>
                            <template x-if="inspector.dvereDruh !== 'zadne'">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.pocet_dilu') }}</span>
                                    <select data-sestava="pocet" @change="setSestava('pocet', $event.target.value)">
                                        <option value="" :selected="!inspector.pocet" x-text="preloz('ed_sablona.sestava.pocet_auto', { pocet: inspector.pocetAuto })"></option>
                                        <template x-for="n in inspector.pocetVolby" :key="n"><option :value="n" :selected="inspector.pocet === n" x-text="n"></option></template>
                                    </select>
                                </div>
                            </template>
                            <template x-if="inspector.dvereDruh === 'posuvne'">
                                <div style="display:contents">
                                    <span class="text-gray-500">{{ __('ed_sablona.sestava.ram_nazev') }}</span>
                                    <select data-sestava="ram" @change="setSestava('ram', $event.target.value)">
                                        <template x-for="o in sestavaVolby.ram" :key="o.id"><option :value="o.id" :selected="o.id === inspector.ram" x-text="o.nazev"></option></template>
                                    </select>
                                </div>
                            </template>
                        </div>
                        <div class="text-gray-500 leading-snug" x-show="inspector.dvereDruh !== 'zadne' && !inspector.dvereVybrane">{{ __('ed_sablona.sestava.dvere_tip') }}</div>
                        <template x-if="inspector.dvereVybrane">
                            <div class="kk-mrizka pt-1.5" style="border-top:1px solid var(--c-border)" data-sestava-dvere-panel>
                                <span class="text-gray-700 font-medium" x-text="preloz('ed_sablona.sestava.dvere_cislo', { cislo: inspector.dvereVybrane.cislo })"></span>
                                <span></span>
                                <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch_dveri') }}</span>
                                <select data-sestava-dvere-povrch @change="setDvereSkrine($event.target.value)">
                                    <option value="" :selected="!inspector.dvereVybrane.zrcadlo">{{ __('ed_sablona.sestava.jako_ostatni') }}</option>
                                    <template x-for="o in sestavaVolby.zrcadlo" :key="o.id"><option :value="o.id" :selected="o.id === inspector.dvereVybrane.zrcadlo" x-text="o.nazev"></option></template>
                                </select>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </template>

        {{-- ── Rozměry ── --}}
        <template x-if="sestavaZalozka === 'rozmery' && inspector.druh === 'kuchyn'">
            <div class="flex flex-col gap-1.5">
                <div class="kk-mrizka">
                    <span class="text-gray-500" title="{{ __('ed_sablona.sestava.deska_tip') }}">{{ __('ed_sablona.sestava.vyska_desky') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="75" max="105" step="1" data-sestava="vysky.deska" :value="inspector.vysky.deskaCm" @change="setSestava('vysky.deska', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.sokl_vyska') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="4" max="25" step="1" data-sestava="vysky.sokl" :value="inspector.vysky.soklCm" @change="setSestava('vysky.sokl', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.hloubka_spodni') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="30" max="80" step="1" data-sestava="hloubky.spodni" :value="inspector.hloubky.spodniCm" @change="setSestava('hloubky.spodni', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.hloubka_horni') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="20" max="60" step="1" data-sestava="hloubky.horni" :value="inspector.hloubky.horniCm" @change="setSestava('hloubky.horni', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.vyska_horni') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="30" max="120" step="1" data-sestava="vysky.horni" :disabled="inspector.vysky.keStropu" :value="inspector.vysky.horniCm" @change="setSestava('vysky.horni', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span class="text-gray-500" title="{{ __('ed_sablona.sestava.mezera_tip') }}">{{ __('ed_sablona.sestava.mezera') }}</span>
                    <span class="kk-pole-jed"><input type="number" min="35" max="90" step="1" data-sestava="vysky.mezera" :value="inspector.vysky.mezeraCm" @change="setSestava('vysky.mezera', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                    <span></span>
                    <label title="{{ __('ed_sablona.sestava.ke_stropu_tip') }}"><input type="checkbox" data-sestava="vysky.keStropu" :checked="inspector.vysky.keStropu" @change="setSestava('vysky.keStropu', $event.target.checked)">{{ __('ed_sablona.sestava.ke_stropu') }}</label>
                </div>
                <template x-if="inspector.roh">
                    <div class="flex flex-col gap-1.5 pt-1.5" style="border-top:1px solid var(--c-border)">
                        <div class="kk-mrizka">
                            <span class="text-gray-500">{{ __('ed_sablona.sestava.roh_dole') }}</span>
                            <select data-sestava="roh.spodni" @change="setSestava('roh.spodni', $event.target.value)">
                                <template x-for="o in sestavaVolby.rohSpodni" :key="o.id"><option :value="o.id" :selected="o.id === inspector.roh.spodni" x-text="o.nazev"></option></template>
                            </select>
                            <span class="text-gray-500">{{ __('ed_sablona.sestava.roh_nahore') }}</span>
                            <select data-sestava="roh.horni" @change="setSestava('roh.horni', $event.target.value)">
                                <template x-for="o in sestavaVolby.rohHorni" :key="o.id"><option :value="o.id" :selected="o.id === inspector.roh.horni" x-text="o.nazev"></option></template>
                            </select>
                        </div>
                        <button type="button" @click="sestavaZrusRoh()" class="border rounded px-2 self-start" data-sestava-zrusit-roh>{{ __('ed_sablona.sestava.zrusit_roh') }}</button>
                    </div>
                </template>
                <div class="flex items-center gap-1 flex-wrap" x-show="!inspector.roh && (inspector.ramenoVlevo || inspector.ramenoVpravo)">
                    <button type="button" x-show="inspector.ramenoVlevo" @click="sestavaPridejRameno('vlevo')" class="border rounded px-2" data-sestava-rameno="vlevo">{{ __('ed_sablona.sestava.rameno_vlevo') }}</button>
                    <button type="button" x-show="inspector.ramenoVpravo" @click="sestavaPridejRameno('vpravo')" class="border rounded px-2" data-sestava-rameno="vpravo">{{ __('ed_sablona.sestava.rameno_vpravo') }}</button>
                </div>
            </div>
        </template>
        <template x-if="sestavaZalozka === 'rozmery' && inspector.druh === 'skrin'">
            <div class="kk-mrizka">
                <span class="text-gray-500">{{ __('ed_sablona.sestava.vyska_skrine') }}</span>
                <span class="kk-pole-jed"><input type="number" min="60" max="350" step="1" data-sestava="vyska" :disabled="inspector.keStropu" :value="inspector.vyskaCm" @change="setSestava('vyska', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
                <span></span>
                <label title="{{ __('ed_sablona.sestava.ke_stropu_tip') }}"><input type="checkbox" data-sestava="keStropu" :checked="inspector.keStropu" @change="setSestava('vyska', $event.target.checked ? null : inspector.vyskaCm)">{{ __('ed_sablona.sestava.ke_stropu') }}</label>
                <span class="text-gray-500">{{ __('ed_sablona.sestava.hloubka_skrine') }}</span>
                <span class="kk-pole-jed"><input type="number" min="30" max="90" step="1" data-sestava="hloubka" :value="inspector.hloubkaCm" @change="setSestava('hloubka', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></span>
            </div>
        </template>

        {{-- ── Povrchy: dekor, barva (společný výběr barvy), lesk ── --}}
        <template x-if="sestavaZalozka === 'povrchy' && inspector.druh === 'kuchyn'">
            <div class="flex flex-col gap-1">
                @foreach ($povrchyKuchyne as $p)
                    <div class="kk-podlazi-pole" data-sestava-povrch="{{ $p['klic'] }}"><span class="w-24 shrink-0">{{ __('ed_sablona.sestava.povrch.' . $p['klic']) }}</span>
                        <select class="flex-1 min-w-0" data-sestava-dekor="{{ $p['klic'] }}" @change="setSestava('povrchy.{{ $p['klic'] }}.dekor', $event.target.value)">
                            <template x-for="o in sestavaVolby.dekory.{{ $p['klic'] }}" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.{{ $p['klic'] }}.dekor" x-text="o.nazev"></option></template>
                        </select>
                        @if ($p['lesk'])
                            <label class="shrink-0" title="{{ __('ed_sablona.sestava.lesk_tip') }}"><input type="checkbox" data-sestava-lesk="{{ $p['klic'] }}" :checked="inspector.povrchy.{{ $p['klic'] }}.lesk" @change="setSestava('povrchy.{{ $p['klic'] }}.lesk', $event.target.checked)">{{ __('ed_sablona.sestava.lesk') }}</label>
                        @endif
                    </div>
                    <div x-data="vyberBarvy({ hodnota: () => inspector?.povrchy?.{{ $p['klic'] }}?.barva, nastav: (hex) => setSestava('povrchy.{{ $p['klic'] }}.barva', hex), nahled: (hex) => nahledBarvy3d('sestava:' + inspector?.id + ':{{ $p['klic'] }}', hex), pouzite: () => barvyJinde('sestava:' + inspector?.id + ':{{ $p['klic'] }}') })">
                        @include('partials.vyber-barvy', ['popisek' => ''])
                    </div>
                    @if ($p['klic'] === 'cela')
                        <label data-sestava-cela-horni><input type="checkbox" :checked="inspector.povrchy.celaHorniJinak" @change="setSestava('povrchy.celaHorni.jinak', $event.target.checked)">{{ __('ed_sablona.sestava.cela_horni_jinak') }}</label>
                        <template x-if="inspector.povrchy.celaHorniJinak">
                            <div class="flex flex-col gap-1">
                                <div class="kk-podlazi-pole"><span class="w-24 shrink-0">{{ __('ed_sablona.sestava.povrch.celaHorni') }}</span>
                                    <select class="flex-1 min-w-0" data-sestava-dekor="celaHorni" @change="setSestava('povrchy.celaHorni.dekor', $event.target.value)">
                                        <template x-for="o in sestavaVolby.dekory.celaHorni" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.celaHorni.dekor" x-text="o.nazev"></option></template>
                                    </select>
                                    <label class="shrink-0"><input type="checkbox" :checked="inspector.povrchy.celaHorni.lesk" @change="setSestava('povrchy.celaHorni.lesk', $event.target.checked)">{{ __('ed_sablona.sestava.lesk') }}</label>
                                </div>
                                <div x-data="vyberBarvy({ hodnota: () => inspector?.povrchy?.celaHorni?.barva, nastav: (hex) => setSestava('povrchy.celaHorni.barva', hex), nahled: (hex) => nahledBarvy3d('sestava:' + inspector?.id + ':celaHorni', hex), pouzite: () => barvyJinde('sestava:' + inspector?.id + ':celaHorni') })">
                                    @include('partials.vyber-barvy', ['popisek' => ''])
                                </div>
                            </div>
                        </template>
                    @endif
                @endforeach
                <div class="kk-mrizka pt-1.5" style="border-top:1px solid var(--c-border)">
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch.sokl') }}</span>
                    <select data-sestava="povrchy.sokl" @change="setSestava('povrchy.sokl', $event.target.value)">
                        <template x-for="o in sestavaVolby.sokl" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.sokl" x-text="o.nazev"></option></template>
                    </select>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch.uchytky') }}</span>
                    <div class="flex items-center gap-1">
                        <select data-sestava="povrchy.uchytky.typ" @change="setSestava('povrchy.uchytky.typ', $event.target.value)">
                            <template x-for="o in sestavaVolby.uchytkyTyp" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.uchytky.typ" x-text="o.nazev"></option></template>
                        </select>
                        <select x-show="!['zadne', 'profil'].includes(inspector.povrchy.uchytky.typ)" data-sestava="povrchy.uchytky.barva" @change="setSestava('povrchy.uchytky.barva', $event.target.value)">
                            <template x-for="o in sestavaVolby.uchytkyBarva" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.uchytky.barva" x-text="o.nazev"></option></template>
                        </select>
                    </div>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch.drez') }}</span>
                    <select data-sestava="povrchy.drez" @change="setSestava('povrchy.drez', $event.target.value)">
                        <template x-for="o in sestavaVolby.drezMaterial" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.drez" x-text="o.nazev"></option></template>
                    </select>
                    <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch.spotrebice') }}</span>
                    <select data-sestava="povrchy.spotrebice" @change="setSestava('povrchy.spotrebice', $event.target.value)">
                        <template x-for="o in sestavaVolby.spotrebice" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.spotrebice" x-text="o.nazev"></option></template>
                    </select>
                    <span class="text-gray-500" title="{{ __('ed_sablona.sestava.zastena_tip') }}">{{ __('ed_sablona.sestava.povrch.zastena') }}</span>
                    <select data-sestava="povrchy.zastena" @change="setSestava('povrchy.zastena', $event.target.value)">
                        <option value="zadna" :selected="!inspector.povrchy.zastena">{{ __('ed_sablona.sestava.dekor.zadna') }}</option>
                        <template x-for="o in sestavaVolby.dekory.zastena" :key="o.id"><option :value="o.id" :selected="inspector.povrchy.zastena && o.id === inspector.povrchy.zastena.dekor" x-text="o.nazev"></option></template>
                    </select>
                </div>
                <template x-if="inspector.povrchy.zastena">
                    <div x-data="vyberBarvy({ hodnota: () => inspector?.povrchy?.zastena?.barva, nastav: (hex) => setSestava('povrchy.zastena.barva', hex), nahled: (hex) => nahledBarvy3d('sestava:' + inspector?.id + ':zastena', hex), pouzite: () => barvyJinde('sestava:' + inspector?.id + ':zastena') })">
                        @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.sestava.barva_zasteny')])
                    </div>
                </template>
            </div>
        </template>
        <template x-if="sestavaZalozka === 'povrchy' && inspector.druh === 'skrin'">
            <div class="flex flex-col gap-1">
                @foreach ([['klic' => 'dvere', 'lesk' => true], ['klic' => 'korpus', 'lesk' => false]] as $p)
                    <div class="kk-podlazi-pole" data-sestava-povrch="{{ $p['klic'] }}"><span class="w-24 shrink-0">{{ __('ed_sablona.sestava.povrch.' . $p['klic']) }}</span>
                        <select class="flex-1 min-w-0" data-sestava-dekor="{{ $p['klic'] }}" @change="setSestava('povrchy.{{ $p['klic'] }}.dekor', $event.target.value)">
                            <template x-for="o in sestavaVolby.dekory.{{ $p['klic'] === 'dvere' ? 'dvere' : 'korpus' }}" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.{{ $p['klic'] }}.dekor" x-text="o.nazev"></option></template>
                        </select>
                        @if ($p['lesk'])
                            <label class="shrink-0" title="{{ __('ed_sablona.sestava.lesk_tip') }}"><input type="checkbox" :checked="inspector.povrchy.{{ $p['klic'] }}.lesk" @change="setSestava('povrchy.{{ $p['klic'] }}.lesk', $event.target.checked)">{{ __('ed_sablona.sestava.lesk') }}</label>
                        @endif
                    </div>
                    <div x-data="vyberBarvy({ hodnota: () => inspector?.povrchy?.{{ $p['klic'] }}?.barva, nastav: (hex) => setSestava('povrchy.{{ $p['klic'] }}.barva', hex), nahled: (hex) => nahledBarvy3d('sestava:' + inspector?.id + ':{{ $p['klic'] }}', hex), pouzite: () => barvyJinde('sestava:' + inspector?.id + ':{{ $p['klic'] }}') })">
                        @include('partials.vyber-barvy', ['popisek' => ''])
                    </div>
                @endforeach
                <template x-if="inspector.dvereDruh === 'otocne'">
                    <div class="kk-mrizka pt-1.5" style="border-top:1px solid var(--c-border)">
                        <span class="text-gray-500">{{ __('ed_sablona.sestava.povrch.uchytky') }}</span>
                        <div class="flex items-center gap-1">
                            <select @change="setSestava('povrchy.uchytky.typ', $event.target.value)">
                                <template x-for="o in sestavaVolby.uchytkyTyp" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.uchytky.typ" x-text="o.nazev"></option></template>
                            </select>
                            <select x-show="!['zadne', 'profil'].includes(inspector.povrchy.uchytky.typ)" @change="setSestava('povrchy.uchytky.barva', $event.target.value)">
                                <template x-for="o in sestavaVolby.uchytkyBarva" :key="o.id"><option :value="o.id" :selected="o.id === inspector.povrchy.uchytky.barva" x-text="o.nazev"></option></template>
                            </select>
                        </div>
                    </div>
                </template>
            </div>
        </template>
    </div>
</div>
