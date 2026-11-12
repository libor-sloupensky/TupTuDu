{{-- Výběr pozemku na mapě (Libor 12. 11. 2026): jeden postup pro všechny země, logika v public/js/koncept-v3/mapa-pozemku.js.
     Najdi místo, klikni na parcely (vrstva hranic podle země), nebo pozemek obkresli. --}}
<div x-show="mapaPozemku" x-cloak class="fixed inset-0 z-50 flex items-center justify-center p-3"
     style="background: rgba(15, 23, 42, 0.55);" @keydown.escape.window="if (mapaPozemku) { mapaRezim === 'obkreslit' && mapaBodu ? mapaZpetBod() : zavriMapuPozemku() }"
     data-mapa-okno>
    <div class="bg-white rounded-lg shadow-xl flex flex-col w-full h-full overflow-hidden" style="max-width: 1200px; max-height: 92vh;" @click.stop>
        {{-- Hlavička: hledání místa, podklad, zavřít --}}
        <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
            <span class="text-sm font-medium text-gray-700 whitespace-nowrap">{{ __('ed_sablona.mapa.nadpis') }}</span>
            <div class="relative flex-1 min-w-0">
                <input type="text" x-model="mapaHledani" @input="mapaHledej()" @keydown.enter.prevent="mapaNavrhy.length && mapaVyberNavrh(mapaNavrhy[0])"
                       placeholder="{{ __('ed_sablona.mapa.hledat') }}" data-mapa-hledat
                       class="w-full text-sm border border-gray-200 rounded px-2 h-8 focus:outline-none focus:border-primary">
                <div x-show="mapaNavrhy.length" @click.outside="mapaNavrhy = []"
                     class="absolute left-0 right-0 top-full z-[1000] bg-white border border-gray-200 rounded shadow-lg max-h-64 overflow-y-auto">
                    <template x-for="(n, i) in mapaNavrhy" :key="i">
                        <button type="button" @click="mapaVyberNavrh(n)" class="block w-full text-left px-2 py-1.5 text-sm hover:bg-gray-50">
                            <span class="font-medium" x-text="n.nazev"></span>
                            <span class="text-gray-500 text-xs ml-1" x-text="n.misto"></span>
                        </button>
                    </template>
                </div>
            </div>
            <div class="kk-skupina kk-skupina-dily">
                <button type="button" @click="mapaPrepniPodklad('aerial')" :class="mapaPodklad === 'aerial' && 'kk-tl-aktivni'">{{ __('ed_sablona.mapa.letecka') }}</button>
                <button type="button" @click="mapaPrepniPodklad('basic')" :class="mapaPodklad === 'basic' && 'kk-tl-aktivni'">{{ __('ed_sablona.mapa.mapa') }}</button>
            </div>
            <button type="button" @click="zavriMapuPozemku()" class="text-gray-500 hover:text-gray-800 text-xl leading-none px-1" title="{{ __('ed_sablona.mapa.zavrit') }}">&times;</button>
        </div>

        {{-- Mapa --}}
        <div class="relative flex-1 min-h-0">
            <div data-mapa-pozemku class="absolute inset-0 bg-gray-200"></div>
            {{-- Nápověda nad mapou --}}
            <div class="absolute left-1/2 top-2 z-[500] -translate-x-1/2 max-w-[90%] text-xs rounded px-2 py-1 shadow bg-white text-gray-700" data-mapa-napoveda>
                <span x-show="mapaRezim === 'obkreslit'">{{ __('ed_sablona.mapa.napoveda_kresli') }}</span>
                <span x-show="mapaRezim !== 'obkreslit' && mapaZoom < 16">{{ __('ed_sablona.mapa.napoveda_priblizit') }}</span>
                <span x-show="mapaRezim !== 'obkreslit' && mapaZoom >= 16 && mapaInfo?.parcely">{{ __('ed_sablona.mapa.napoveda_klik') }}</span>
                <span x-show="mapaRezim !== 'obkreslit' && mapaZoom >= 16 && mapaInfo && !mapaInfo.parcely">{{ __('ed_sablona.mapa.napoveda_bez_katastru') }}</span>
                <span x-show="mapaZoom >= 16 && mapaInfo && !mapaInfo.vysky" class="block text-gray-500">{{ __('ed_sablona.mapa.bez_vysek') }}</span>
            </div>
            <div x-show="mapaNacitani" class="absolute right-2 top-2 z-[500] text-xs rounded px-2 py-1 shadow bg-white text-gray-600">{{ __('ed_sablona.mapa.hledam') }}</div>
        </div>

        {{-- Hláška a výběr --}}
        <div class="border-t border-gray-200 px-3 py-2 space-y-1.5">
            <div x-show="mapaHlaska" class="text-xs text-red-600 bg-red-50 rounded px-2 py-1" x-text="mapaHlaska" data-mapa-hlaska></div>
            <div class="flex items-center gap-2 flex-wrap">
                <span class="text-xs text-gray-500">{{ __('ed_sablona.mapa.vybrano') }}</span>
                <span x-show="!mapaVybrane.length" class="text-xs text-gray-400">{{ __('ed_sablona.mapa.nic_vybrano') }}</span>
                <template x-for="(p, i) in mapaVybrane" :key="p.id">
                    <span class="inline-flex items-center gap-1 text-xs rounded border border-orange-300 bg-orange-50 px-1.5 py-0.5" data-mapa-vybrana>
                        <span class="font-medium" x-text="p.cislo"></span>
                        <span class="text-gray-500" x-text="(p.vymera || '?') + ' m²'"></span>
                        <button type="button" @click="mapaOdeber(i)" class="text-gray-400 hover:text-red-500">&times;</button>
                    </span>
                </template>
                <div class="flex-1"></div>
                <template x-if="mapaRezim === 'obkreslit'">
                    <div class="flex items-center gap-1.5">
                        <button type="button" @click="mapaZpetBod()" :disabled="!mapaBodu" class="kk-btn text-xs disabled:opacity-40">{{ __('ed_sablona.mapa.zpet_bod') }}</button>
                        <button type="button" @click="mapaDokonciObrys()" :disabled="mapaBodu < 3" class="kk-btn text-xs disabled:opacity-40">{{ __('ed_sablona.mapa.hotovo') }}</button>
                    </div>
                </template>
                <button type="button" @click="mapaObkreslit()" class="kk-btn text-xs" data-mapa-obkreslit
                        x-text="mapaRezim === 'obkreslit' ? preloz('ed_sablona.mapa.obkreslit_konec') : preloz('ed_sablona.mapa.obkreslit')"></button>
                <button type="button" @click="mapaPotvrd()" :disabled="!mapaVybrane.length || mapaPridavani" data-mapa-potvrdit
                        class="px-3 h-8 text-xs rounded text-white disabled:opacity-40" style="background: var(--c-primary);">
                    <span x-show="!mapaPridavani">{{ __('ed_sablona.mapa.pridat') }} <span x-show="mapaVybrane.length" x-text="'(' + mapaVybrane.length + ')'"></span></span>
                    <span x-show="mapaPridavani">{{ __('ed_sablona.mapa.pridavam') }}</span>
                </button>
            </div>
        </div>
    </div>
</div>
<style>
    .kk-mapa-stitek { background: rgba(255,255,255,0.9); border: 0; box-shadow: none; font-weight: 600; font-size: 11px; padding: 0 4px; }
    .kk-mapa-stitek::before { display: none; }
</style>
