<x-layouts.app title="Koncept — Kalkulio" :fullWidth="true">

{{-- Konva.js + Three.js + StavebníEngine + Renderer — všechno self-hosted,
     aby fungovalo i v zemích, kde jsou unpkg/cdnjs/jsdelivr blokované
     (Čína, Rusko, Írán). --}}
<script src="/js/konva-9.min.js?v=9"></script>
<script src="/js/three/three.min.js?v=r128"></script>
<script src="/js/three/OrbitControls.js?v=0.128"></script>
{{-- Line2 — screen-space thickness pro linky (hranice parcel apod.).
     Pořadí důležité: LineSegments2 musí být PŘED Line2 (extends). --}}
<script src="/js/three/LineSegmentsGeometry.js?v=0.128"></script>
<script src="/js/three/LineGeometry.js?v=0.128"></script>
<script src="/js/three/LineMaterial.js?v=0.128"></script>
<script src="/js/three/LineSegments2.js?v=0.128"></script>
<script src="/js/three/Line2.js?v=0.128"></script>
<script src="/js/stavebni-engine.js?v={{ filemtime(public_path('js/stavebni-engine.js')) }}"></script>
<script src="/js/pudorys-icons.js?v={{ filemtime(public_path('js/pudorys-icons.js')) }}"></script>
<script src="/js/konva-renderer.js?v={{ filemtime(public_path('js/konva-renderer.js')) }}"></script>

<style>
    [x-cloak] { display: none !important; }
    #kk-tooltip {
        position: fixed; background: #333; color: #fff; font-size: 11px;
        padding: 3px 8px; border-radius: 4px; white-space: nowrap;
        z-index: 999999; pointer-events: none; opacity: 0;
        transition: opacity 0.1s;
    }
    #kk-tooltip.visible { opacity: 1; }
    .kk-section { border-bottom: 3px solid var(--color-primary, #dd5500); }
    .koncept-k-wrap { width: 100%; overflow: hidden; }
    .koncept-k-wrap.fullscreen { position: fixed; inset: 0; z-index: 9999; }
    /* V fullscreen režimu skrýt web navigaci (header + sidebar + footer) */
    body.kk-fullscreen > header,
    body.kk-fullscreen #kk-sidebar,
    body.kk-fullscreen > footer,
    body.kk-fullscreen footer { display: none !important; }
    .kk-divider { cursor: col-resize; background: #e5e7eb; position: relative; }
    .kk-divider:hover, .kk-divider.dragging { background: var(--color-primary, #dd5500); }
    .kk-toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .kk-toolbar button, .kk-toolbar select { font-size: 12px; }
    .kk-btn { padding: 4px 10px; border-radius: 4px; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 12px; transition: all .15s; }
    .kk-btn:hover { border-color: var(--color-primary, #dd5500); color: var(--color-primary, #dd5500); }
    .kk-btn.active { background: var(--color-primary, #dd5500); color: white; border-color: var(--color-primary, #dd5500); }
    .kk-status-row { position: absolute; bottom: 4px; left: 4px; display: flex; align-items: stretch; gap: 4px; z-index: 10; pointer-events: none; }
    .kk-status-row > div { padding: 2px 8px; border-radius: 3px; font: 12px/1.4 monospace; display: flex; align-items: center; }
    .kk-coords { background: rgba(0,80,0,.85); color: #0f0; }
    .kk-3d-help { background: rgba(0,0,0,.65); color: #ddd; }
    #kk-canvas-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    #kk-canvas-wrap.zvyraznovac-cursor canvas { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='9' fill='rgba(255,105,180,0.35)' stroke='rgba(255,105,180,0.8)' stroke-width='1'/%3E%3C/svg%3E") 10 10, crosshair !important; }
    /* Chat styly importovány z /css/chat-widget.css */
</style>

<div x-data="konceptKEditor(_kkInitData)" x-init="init()" x-cloak
     class="koncept-k-wrap" :class="{ 'fullscreen': celaObrazovka }"
     :style="'height:' + editorHeight + 'px'"
     x-effect="document.body.classList.toggle('kk-fullscreen', celaObrazovka)"
     @keydown.window="onKeyDown($event)">

    <div x-ref="gridWrap" class="w-full h-full" :style="gridStyle">

    {{-- ═══ PANEL A — Canvas (grafika) ═══ --}}
    <div class="flex flex-col bg-white" :class="celaObrazovka ? '' : 'rounded-lg border border-gray-200'"
         :style="'order:' + (obracene ? 2 : 0) + ';min-width:0;min-height:0'">
        {{-- Toolbar — řádek 1: název, 2D/3D, zoom, layout, fullscreen --}}
        <div class="flex items-center px-3 py-1.5 bg-white border-b border-gray-200 gap-1">
            <span class="text-sm font-medium text-gray-700 truncate max-w-[200px]" x-text="projektNazev || 'Nový koncept'"></span>
            <div class="flex-1"></div>
            {{-- Mapový podklad --}}
            <select x-model="katastrMapaPodklad"
                    @change="if (katastrParcely.length === 0 && katastrMapaPodklad !== 'zadny') { katastrMapaPodklad = 'zadny'; alert('Nejprve načtěte parcelu.'); } else { katastrZmenPodklad(); ulozitNastaveni(); }"
                    class="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 mr-1">
                <option value="zadny">Bez podkladu</option>
                <option value="zakladni">Základní mapa</option>
                <option value="ortofoto">Ortofoto</option>
                <option value="turisticka">Turistická</option>
            </select>
            {{-- 2D/3D přepínač --}}
            <div class="flex items-center rounded overflow-hidden border border-gray-200 mr-2">
                <button @click="rezim3d = false; prepni2d()" class="px-2 py-0.5 text-xs transition" :class="!rezim3d ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'">2D</button>
                <button @click="rezim3d = true; prepni3d()" class="px-2 py-0.5 text-xs border-l border-gray-200 transition" :class="rezim3d ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'">3D</button>
            </div>
            <button @click="undo()" class="rounded px-2.5 py-1 text-base text-gray-600 hover:bg-gray-200 disabled:opacity-30" data-tip-below="Zpět (Ctrl+Z)">&#8630;</button>
            <button @click="zoomOut()" class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200">&minus;</button>
            <span class="text-xs text-gray-400 w-8 text-center" x-text="Math.round(zoom * 100) + '%'"></span>
            <button @click="zoomIn()" class="rounded px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-200">+</button>
            <span class="text-gray-300 mx-1">|</span>
            {{-- Layout --}}
            <button @click="cyklujLayout()" class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition" :data-tip-below="layoutTip">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <g x-show="layoutMode === 0">
                        <rect x="1" y="1" width="8" height="14" rx="1" fill="currentColor" opacity="0.15"/><rect x="1" y="1" width="8" height="14" rx="1"/>
                        <line x1="11" y1="3" x2="15" y2="3"/><line x1="11" y1="6" x2="15" y2="6"/><line x1="11" y1="9" x2="14" y2="9"/>
                    </g>
                    <g x-show="layoutMode === 1">
                        <rect x="7" y="1" width="8" height="14" rx="1" fill="currentColor" opacity="0.15"/><rect x="7" y="1" width="8" height="14" rx="1"/>
                        <line x1="1" y1="3" x2="5" y2="3"/><line x1="1" y1="6" x2="5" y2="6"/><line x1="1" y1="9" x2="4" y2="9"/>
                    </g>
                    <g x-show="layoutMode === 2">
                        <rect x="1" y="1" width="14" height="7" rx="1" fill="currentColor" opacity="0.15"/><rect x="1" y="1" width="14" height="7" rx="1"/>
                        <line x1="3" y1="11" x2="13" y2="11"/><line x1="3" y1="13.5" x2="10" y2="13.5"/>
                    </g>
                    <g x-show="layoutMode === 3">
                        <rect x="1" y="8" width="14" height="7" rx="1" fill="currentColor" opacity="0.15"/><rect x="1" y="8" width="14" height="7" rx="1"/>
                        <line x1="3" y1="2.5" x2="13" y2="2.5"/><line x1="3" y1="5" x2="10" y2="5"/>
                    </g>
                </svg>
            </button>
            {{-- Fullscreen --}}
            <button @click="prepniFullscreen()" class="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition" :data-tip-below="celaObrazovka ? 'Zmenšit (F11)' : 'Celá obrazovka (F11)'">
                <svg x-show="!celaObrazovka" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1,5 1,1 5,1"/><polyline points="11,1 15,1 15,5"/><polyline points="15,11 15,15 11,15"/><polyline points="5,15 1,15 1,11"/>
                </svg>
                <svg x-show="celaObrazovka" x-cloak width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="5,1 5,5 1,5"/><polyline points="15,5 11,5 11,1"/><polyline points="11,15 11,11 15,11"/><polyline points="1,11 5,11 5,15"/>
                </svg>
            </button>
        </div>
        {{-- Toolbar — řádek 2: nástroje + nápověda --}}
        <div class="flex items-center px-3 py-1 gap-2 border-b border-gray-100">
            <div class="flex items-center gap-1">
                {{-- Výběr --}}
                <button @click="nastroj = 'vyber'" class="rounded p-1.5 transition"
                        :style="nastroj === 'vyber' ? 'color: var(--color-primary, #DD5500)' : 'color: #6b7280'"
                        @mouseenter="if (nastroj !== 'vyber') $el.style.backgroundColor='#f3f4f6'"
                        @mouseleave="$el.style.backgroundColor='transparent'"
                        data-tip="Výběr (1)">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="1" y="1" width="14" height="14" rx="1" stroke-dasharray="3 2"/>
                    </svg>
                </button>
                {{-- Posun (ruka) --}}
                <button @click="nastroj = 'posun'" class="rounded p-1.5 transition"
                        :style="nastroj === 'posun' ? 'color: var(--color-primary, #DD5500)' : 'color: #6b7280'"
                        @mouseenter="if (nastroj !== 'posun') $el.style.backgroundColor='#f3f4f6'"
                        @mouseleave="$el.style.backgroundColor='transparent'"
                        data-tip="Posun (2 / pravé myšítko)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9V3.5a1 1 0 012 0V8.5"/>
                        <path d="M8 7.5V2.5a1 1 0 012 0V8"/>
                        <path d="M10 7.5V3.5a1 1 0 012 0V8.5"/>
                        <path d="M12 6.5a1 1 0 012 0V10a5 5 0 01-5 5H8a4.5 4.5 0 01-3.5-1.7L2.8 11a1.2 1.2 0 011.7-1.3L6 11.5"/>
                    </svg>
                </button>
                {{-- Zvýrazňovač --}}
                <div class="relative">
                    <button @click="nastroj = nastroj === 'zvyraznovac' ? 'vyber' : 'zvyraznovac'" class="rounded p-1.5 transition"
                            :style="nastroj === 'zvyraznovac' ? 'background-color: rgba(255,105,180,0.15); color: #ec4899;' : 'color: #6b7280'"
                            @mouseenter="if (nastroj !== 'zvyraznovac') $el.style.backgroundColor='#f3f4f6'"
                            @mouseleave="$el.style.backgroundColor = nastroj === 'zvyraznovac' ? 'rgba(255,105,180,0.15)' : 'transparent'"
                            data-tip="Zvýrazňovač (3 / B)">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M10 1.5l4.5 4.5-7.5 7.5H2.5V9z"/>
                            <path d="M8.5 3l4.5 4.5"/>
                            <path d="M1.5 15h6" stroke-width="2.5" style="color: #ec4899; opacity: 0.35"/>
                        </svg>
                    </button>
                    <button x-show="nastroj === 'zvyraznovac' && zvyrazneniBody.length > 0"
                            x-cloak @click.stop="smazZvyrazneni()"
                            class="rounded-full flex items-center justify-center"
                            style="position:absolute;top:-5px;right:-5px;width:18px;height:18px;background:#ec4899;color:white;z-index:10;font-size:10px;line-height:1"
                            title="Smazat zvýraznění">&times;</button>
                </div>
                {{-- Stěna --}}
                <button @click="nastroj = 'stena'" class="rounded p-1.5 transition"
                        :style="nastroj === 'stena' ? 'color: var(--color-primary, #DD5500)' : 'color: #6b7280'"
                        @mouseenter="if (nastroj !== 'stena') $el.style.backgroundColor='#f3f4f6'"
                        @mouseleave="$el.style.backgroundColor='transparent'"
                        data-tip="Kreslit stěnu (4)">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="2" y1="14" x2="14" y2="2"/>
                        <line x1="1" y1="13" x2="13" y2="1"/>
                    </svg>
                </button>
                {{-- Metr --}}
                <button @click="nastroj = nastroj === 'metr' ? 'vyber' : 'metr'" class="rounded p-1.5 transition"
                        :style="nastroj === 'metr' ? 'color: var(--color-primary, #DD5500)' : 'color: #6b7280'"
                        @mouseenter="if (nastroj !== 'metr') $el.style.backgroundColor='#f3f4f6'"
                        @mouseleave="$el.style.backgroundColor='transparent'"
                        data-tip="Měřit vzdálenost (5 / M)">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="1" y1="15" x2="15" y2="15"/><line x1="1" y1="13" x2="1" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/>
                        <line x1="4" y1="14" x2="4" y2="15"/><line x1="7" y1="14" x2="7" y2="15"/><line x1="10" y1="14" x2="10" y2="15"/><line x1="13" y1="14" x2="13" y2="15"/>
                        <text x="8" y="11" font-size="7" text-anchor="middle" fill="currentColor" stroke="none">m</text>
                    </svg>
                </button>
            </div>
            {{-- Nápověda toggle --}}
            <button @click="napovedaOtevrena = !napovedaOtevrena"
                    class="ml-auto text-xs text-gray-400 hover:text-primary transition flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                Nápověda
                <svg class="h-3 w-3 transition-transform" :class="napovedaOtevrena && 'rotate-180'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
        </div>
        <style>
            .napoveda-tabulka td { border: 1px dashed #d1d5db; padding: 2px 8px; }
        </style>
        <div x-show="napovedaOtevrena" x-collapse class="px-3 pb-2 text-xs text-gray-500 border-b border-gray-100 overflow-x-auto">
            <div class="flex gap-4 mt-1 flex-wrap min-w-0">
                <div>
                    <div class="font-semibold text-gray-600 mb-1">Navigace</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>Kolečko / + / &minus;</strong></td><td>zoom</td></tr>
                        <tr><td><strong>Pravé tl. + tah</strong></td><td>posun plátna</td></tr>
                        <tr><td><strong>Kompas</strong></td><td>tažením otáčí mapu</td></tr>
                        <tr><td><strong>Dvojklik na kompas</strong></td><td>reset pozice</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">Výběr</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>Klik</strong></td><td>vybrat prvek</td></tr>
                        <tr><td><strong>Ctrl/Shift + klik</strong></td><td>přidat/odebrat z výběru</td></tr>
                        <tr><td><strong>Tah na prázdno</strong></td><td>výběr oblasti</td></tr>
                        <tr><td><strong>Ctrl+A</strong></td><td>vybrat vše</td></tr>
                        <tr><td><strong>Escape</strong></td><td>zrušit výběr</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">Úpravy</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>R</strong></td><td>otočit 90°</td></tr>
                        <tr><td><strong>Delete</strong></td><td>smazat vybrané</td></tr>
                        <tr><td><strong>Ctrl+Z</strong></td><td>zpět</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">Kreslení a nástroje</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>1 / 2 / 3 / 4</strong></td><td>výběr / stěna / posun / zvýrazňovač</td></tr>
                        <tr><td><strong>B</strong></td><td>zvýrazňovač zap/vyp</td></tr>
                        <tr><td><strong>Shift + klik</strong></td><td>rovná čára zvýrazňovačem</td></tr>
                        <tr><td><strong>Ctrl+C / V / D</strong></td><td>kopírovat / vložit / duplikovat</td></tr>
                        <tr><td><strong>F11</strong></td><td>celá obrazovka</td></tr>
                    </table>
                </div>
            </div>
        </div>

        {{-- Canvas --}}
        <div id="kk-canvas-wrap" x-ref="canvasWrap" class="flex-1" style="position:relative;overflow:hidden" :class="nastroj === 'zvyraznovac' ? 'zvyraznovac-cursor' : ''">
            <div id="kk-container" x-ref="konvaContainer" style="position:absolute;inset:0;" x-show="!rezim3d"></div>
            <div id="kk-3d-container" x-ref="threeContainer" style="position:absolute;inset:0;" x-show="rezim3d" x-cloak></div>
            <div class="kk-status-row">
                <div class="kk-coords" x-text="'X: ' + kurzorX.toFixed(2) + ' Y: ' + kurzorY.toFixed(2)"></div>
                <div class="kk-3d-help" x-show="rezim3d" x-cloak>Levé tl. = rotace · Pravé tl. = posun · Kolečko = zoom</div>
            </div>

            {{-- Povinná atribuce Mapy.com — viditelná pokud je aktivní mapové podloží --}}
            <a x-show="katastrMapaPodklad && katastrMapaPodklad !== 'zadny' && !rezim3d"
               href="https://mapy.com/" target="_blank" rel="noopener noreferrer"
               style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);z-index:10;background:rgba(255,255,255,0.9);padding:3px 6px;border-radius:3px;pointer-events:auto;display:block">
                <img src="/img/external/mapy-com-logo.png" alt="Mapy.com" style="height:14px;display:block">
            </a>

            {{-- Inspector panel — vlastnosti vybraného objektu (ukotvený vlevo od kompasu) --}}
            <div x-show="inspector && !rezim3d" x-cloak
                 class="bg-white rounded-lg shadow-md text-xs"
                 style="position:absolute;top:12px;right:80px;z-index:15;min-width:180px;border:1.5px solid var(--color-primary, #dd5500)">
                <template x-if="inspector">
                    <div class="p-2 flex items-center gap-2 flex-wrap">
                        {{-- Multi-select indikátor --}}
                        <span x-show="inspector.count > 1" class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold"
                              x-text="inspector.count + '×'"></span>

                        {{-- OTVORY: typ + šířka + směr otvírání + strana --}}
                        <template x-if="inspector.kind === 'opening' || inspector.kind === 'opening_multi'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-600 font-medium whitespace-nowrap" x-text="inspector.typLabel"></span>
                                    <div class="flex items-center gap-1 ml-auto">
                                        <span class="text-gray-500">š:</span>
                                        <select class="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                                @change="setOpeningSirka(parseFloat($event.target.value))"
                                                :disabled="inspector.typ === null">
                                            <option value="" disabled :selected="inspector.sirka === null">—</option>
                                            <template x-for="s in inspector.sirky" :key="s">
                                                <option :value="s"
                                                        :selected="inspector.sirka !== null && Math.abs(s - inspector.sirka) < 0.001"
                                                        x-text="(s * 100).toFixed(0) + ' cm'"></option>
                                            </template>
                                        </select>
                                    </div>
                                </div>
                                <template x-if="inspector.hasDoor">
                                    <div class="flex items-center gap-2">
                                        <select class="border border-gray-300 rounded px-1 py-0.5 text-xs flex-1"
                                                @change="setOpeningSmer($event.target.value)">
                                            <option value="" disabled :selected="inspector.smer === null">—</option>
                                            <template x-for="v in inspector.smeryVolby" :key="v.key">
                                                <option :value="v.key"
                                                        :selected="inspector.smer === v.key"
                                                        x-text="v.label"></option>
                                            </template>
                                        </select>
                                        <button type="button"
                                                x-show="inspector.canFlipStrana"
                                                @click="flipOpeningStrana()"
                                                class="border border-gray-300 rounded px-2 py-0.5 text-xs hover:bg-orange-50 hover:border-orange-400"
                                                title="Otočit na druhou stranu zdi">
                                            ⇄
                                        </button>
                                    </div>
                                </template>
                            </div>
                        </template>

                        {{-- STĚNY: typ (editable) + tloušťka --}}
                        <template x-if="inspector.kind === 'wall' || inspector.kind === 'wall_multi'">
                            <div class="flex items-center gap-2 w-full">
                                <select class="border border-gray-300 rounded px-1 py-0.5 text-xs font-medium"
                                        @change="setWallTyp($event.target.value)">
                                    <option value="" disabled :selected="inspector.typ === null">Různé</option>
                                    <template x-for="tv in inspector.typyVolby" :key="tv.key">
                                        <option :value="tv.key"
                                                :selected="inspector.typ === tv.key"
                                                x-text="tv.label"></option>
                                    </template>
                                </select>
                                <div class="flex items-center gap-1 ml-auto">
                                    <span class="text-gray-500">tl:</span>
                                    <select class="border border-gray-300 rounded px-1 py-0.5 text-xs"
                                            @change="setWallTloustka(parseFloat($event.target.value))"
                                            :disabled="inspector.typ === null">
                                        <option value="" disabled :selected="inspector.tloustka === null">—</option>
                                        <template x-for="t in inspector.tloustky" :key="t">
                                            <option :value="t"
                                                    :selected="inspector.tloustka !== null && Math.abs(t - inspector.tloustka) < 0.001"
                                                    x-text="(t * 100).toFixed(t >= 0.1 ? 0 : 1) + ' cm'"></option>
                                        </template>
                                    </select>
                                </div>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
            {{-- Měřítko s pravítkem --}}
            <div style="position:absolute;bottom:8px;right:12px;z-index:10;pointer-events:none;display:flex;align-items:center;gap:0" x-show="!rezim3d">
                <div style="position:relative;height:10px" :style="'width:' + meritkoPx + 'px'">
                    <div style="position:absolute;bottom:0;left:0;right:0;height:2px;background:#444"></div>
                    <div style="position:absolute;bottom:0;left:0;width:2px;height:10px;background:#444"></div>
                    <div style="position:absolute;bottom:0;right:0;width:2px;height:10px;background:#444"></div>
                    <div style="position:absolute;bottom:0;left:50%;width:1px;height:6px;background:#888;transform:translateX(-50%)"></div>
                </div>
                <span style="font:11px/1.2 monospace;color:#444;font-weight:600;margin-left:5px" x-text="meritkoText"></span>
            </div>
            {{-- Kompas --}}
            <div style="position:absolute;top:12px;right:12px;z-index:10;cursor:grab;user-select:none;width:56px;height:56px"
                 @mousedown.prevent="kompasStart($event)"
                 @dblclick.prevent="kompasUhel = 0; aplikujRotaci(); fitView(); _katastrAutosave(); ulozitNastaveni()"
                 data-tip-below="Tažením otočit · Dvojklik = reset pozice">
                <svg width="52" height="52" viewBox="0 0 52 52" style="margin:2px"
                     :style="'transform: rotate(' + kompasUhel + 'deg)'">
                    <text x="26" y="10" font-size="9" fill="#e53e3e" font-weight="700" text-anchor="middle">S</text>
                    <text x="26" y="49" font-size="9" fill="#718096" text-anchor="middle">J</text>
                    <text x="48" y="29.5" font-size="9" fill="#718096" text-anchor="middle">V</text>
                    <text x="4" y="29.5" font-size="9" fill="#718096" text-anchor="middle">Z</text>
                    <polygon points="26,12 23,23 26,21 29,23" fill="#e53e3e"/>
                    <polygon points="26,40 23,29 26,31 29,29" fill="#a0aec0"/>
                    <polygon points="40,26 29,23 31,26 29,29" fill="#a0aec0"/>
                    <polygon points="12,26 23,23 21,26 23,29" fill="#a0aec0"/>
                    <circle cx="26" cy="26" r="2" fill="#2d3748"/>
                </svg>
            </div>
        </div>
    </div>{{-- /Panel A --}}

    {{-- ═══ DIVIDER ═══ --}}
    <div @mousedown.prevent="startDrag($event)"
         @touchstart.prevent="startDrag($event)"
         class="flex items-center justify-center z-10 select-none group bg-gray-100 hover:bg-primary/20 transition-colors"
         :style="'order:1;touch-action:none;cursor:' + (vertikalni ? 'row-resize' : 'col-resize')">
        <div class="flex items-center justify-center"
             :class="vertikalni ? 'gap-1.5' : 'flex-col gap-1.5'">
            <div class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-primary transition-colors"></div>
            <div class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-primary transition-colors"></div>
            <div class="w-1 h-1 rounded-full bg-gray-400 group-hover:bg-primary transition-colors"></div>
        </div>
    </div>

    {{-- ═══ PANEL B — Projekty + Chat ═══ --}}
    <div class="flex flex-col overflow-hidden"
         :style="'order:' + (obracene ? 0 : 2) + ';min-width:0;min-height:0'">
        {{-- Projekt select + přejmenování --}}
        <div class="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200 bg-white flex-shrink-0">
            <template x-if="!_prejmenovaniKonceptu">
                <div class="flex items-center gap-1 flex-1 min-w-0 group">
                    <select x-model="projektId" @change="prepniProjekt()" class="kk-btn flex-1 truncate text-sm">
                        <option value="">— Nový koncept —</option>
                        @foreach($koncepty as $k)
                            <option value="{{ $k->id }}">{{ $k->nazev }}</option>
                        @endforeach
                    </select>
                    {{-- Přejmenování double-click --}}
                    <button x-show="projektId" @click="zahajPreimenovaniKonceptu()"
                            class="p-0.5 text-gray-400 hover:text-gray-600"
                            title="Přejmenovat">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 1.5l3.5 3.5L5 14.5H1.5V11z"/></svg>
                    </button>
                    {{-- Smazat --}}
                    <button x-show="projektId" @click="smazatKoncept()"
                            class="p-0.5 text-gray-400 hover:text-red-500"
                            title="Smazat koncept">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
                    </button>
                </div>
            </template>
            <template x-if="_prejmenovaniKonceptu">
                <div class="flex items-center gap-1 flex-1 min-w-0">
                    <input type="text" x-model="_novyNazevKonceptu" x-ref="konceptRenameInput"
                           @keydown.enter="potvrdPreimenovaniKonceptu()"
                           @keydown.escape="_prejmenovaniKonceptu = false"
                           @blur="potvrdPreimenovaniKonceptu()"
                           class="flex-1 text-sm border border-primary rounded px-2 py-0.5 focus:outline-none">
                    <button @click="potvrdPreimenovaniKonceptu()" class="text-xs text-primary">✓</button>
                </div>
            </template>
            <button @click="novyProjekt()" class="kk-btn" title="Nový">+</button>
        </div>

        {{-- Objekty --}}
        <details class="kk-section flex-shrink-0" :open="panelOpen.objekty" @toggle="panelOpen.objekty = $el.open; ulozitPanely()">
            <summary class="px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 flex items-center gap-1 select-none">
                <svg class="h-3 w-3 transition-transform shrink-0" :class="panelOpen.objekty && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                <span x-text="'Objekty (' + seznamObjektu.length + ')'">Objekty (0)</span>
            </summary>
            <div class="px-3 py-1.5 flex items-center gap-3 border-b border-gray-100">
                <label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Zobrazit/skrýt stěny a otvory">
                    <input type="checkbox" x-model="showObjekty" @change="toggleObjekty()" class="rounded text-primary w-3.5 h-3.5">
                    Objekty
                </label>
                <label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Rozměry stěn (délky)">
                    <input type="checkbox" x-model="showKoty" @change="toggleKoty()" class="rounded text-primary w-3.5 h-3.5">
                    Kóty
                </label>
                <label class="flex items-center gap-1 text-xs text-gray-500 cursor-pointer select-none" data-tip="Uzlové body stěn (rohy)">
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
            </div>
            <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                <template x-for="obj in seznamObjektu" :key="obj.id">
                    <div class="flex items-center justify-between px-3 py-1 text-xs cursor-pointer transition-colors"
                         :style="hoverObjektId === obj.id && !vybraneIds.includes(obj.id) ? 'background-color: #dbeafe' : ''"
                         :class="vybraneIds.includes(obj.id) ? 'bg-blue-50' : 'hover:bg-gray-50'"
                         @click="vyberObjekt(obj.id)"
                         @dblclick.stop="zacniEditObjekt(obj.id, obj.nazev)"
                         @mouseenter="zvyrazniObjekt(obj.id)"
                         @mouseleave="zvyrazniObjekt(null)">
                        <div class="flex items-center gap-1 min-w-0">
                            <span x-show="editObjektId !== obj.id"
                                  :class="vybraneIds.includes(obj.id) ? 'font-bold text-blue-700' : 'text-gray-600'"
                                  x-text="obj.nazev" class="truncate"></span>
                            <svg x-show="editObjektId !== obj.id"
                                 @click.stop="zacniEditObjekt(obj.id, obj.nazev)"
                                 width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                 class="shrink-0 text-gray-300 hover:text-primary cursor-pointer" style="margin-left:3px">
                                <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                            </svg>
                            <input x-show="editObjektId === obj.id"
                                   x-model="editObjektNazev"
                                   @click.stop
                                   @keydown.enter="ulozitEditObjekt()"
                                   @keydown.escape="editObjektId = null"
                                   @blur="ulozitEditObjekt()"
                                   class="text-xs border border-primary rounded px-1 py-0 w-28 outline-none">
                        </div>
                        <div class="flex items-center gap-1 shrink-0 ml-1">
                            <span class="text-gray-400 text-[10px]" x-text="obj.info"></span>
                            <button @click.stop="smazatObjekt(obj.id)" class="text-gray-300 hover:text-red-500 transition" title="Smazat">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </template>
                <div x-show="seznamObjektu.length === 0" class="px-3 py-2 text-xs text-gray-400">
                    Žádné objekty
                </div>
            </div>
        </details>

        {{-- Parcela (Katastr) --}}
        <details class="kk-section flex-shrink-0" :open="panelOpen.parcela" @toggle="panelOpen.parcela = $el.open; ulozitPanely()">
            <summary class="px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 flex items-center gap-1 select-none">
                <svg class="h-3 w-3 transition-transform shrink-0" :class="panelOpen.parcela && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                <span>Parcela</span>
                <template x-if="katastrParcely.length > 0">
                    <span class="font-semibold" x-text="'(' + katastrParcely.length + ')'"></span>
                </template>
            </summary>
            <div class="border-t border-gray-100 px-3 py-2 space-y-2 max-h-96 overflow-y-auto">
                {{-- Checkboxy: Mřížka + katastr vrstvy (katastr jen s parcelami). Jeden řádek
                     pokud se vejdou, jinak wrap. gap-x menší aby se vešly vedle sebe. --}}
                <div class="flex items-center gap-x-2 gap-y-1 text-xs text-gray-500 flex-wrap" @click.stop>
                    <label class="flex items-center gap-0.5 cursor-pointer" data-tip="Zobrazit/skrýt podkladovou mřížku"><input type="checkbox" x-model="showGrid" @change="toggleGrid(); ulozitNastaveni()" class="w-3 h-3"> Mřížka</label>
                    <label x-show="katastrParcely.length > 0" class="flex items-center gap-0.5 cursor-pointer" data-tip="Zobrazit/skrýt polygony parcel"><input type="checkbox" x-model="katastrZobrazitParcely" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="w-3 h-3"> Parcely</label>
                    <label x-show="katastrParcely.length > 0" class="flex items-center gap-0.5 cursor-pointer" data-tip="Zobrazit/skrýt budovy na parcelách"><input type="checkbox" x-model="katastrZobrazitStavby" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="w-3 h-3"> Stavby</label>
                    <label x-show="katastrParcely.length > 0" class="flex items-center gap-0.5 cursor-pointer" data-tip="Zobrazit/skrýt sousední parcely"><input type="checkbox" x-model="katastrZobrazitSousedy" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="w-3 h-3"> Sousedé</label>
                    <label x-show="katastrParcely.length > 0" class="flex items-center gap-0.5 cursor-pointer" data-tip="Výškové body DMR 5G (barevná škála)"><input type="checkbox" x-model="katastrZobrazitVysky" @change="katastrPrekreslitCanvas(); ulozitNastaveni()" class="w-3 h-3"> Výška</label>
                </div>
                {{-- KÚ hledání --}}
                <div class="relative">
                    <label class="text-xs text-gray-400">Katastrální území</label>
                    <input type="text" x-model="katastrKuHledani"
                           @input.debounce.200ms="katastrHledejKu()"
                           @focus="katastrKuNabidk = katastrKuVysledky.length > 0"
                           @click.outside="katastrKuNabidk = false"
                           placeholder="Začněte psát název..."
                           class="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary">
                    <div x-show="katastrKuNabidk && katastrKuVysledky.length > 0"
                         class="absolute left-0 right-0 top-full z-30 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                        <template x-for="ku in katastrKuVysledky" :key="ku.k">
                            <button @click="katastrVyberKu(ku)" class="block w-full text-left px-2 py-1 text-xs hover:bg-gray-50">
                                <span class="font-medium" x-text="ku.n"></span>
                                <span class="text-gray-400 ml-1" x-text="ku.o"></span>
                            </button>
                        </template>
                    </div>
                </div>
                {{-- Číslo + typ + tlačítko --}}
                <div class="flex gap-1 items-center">
                    <input type="text" x-model="katastrCislo" placeholder="Číslo parcely"
                           @keydown.enter="katastrNactiParcelu()"
                           class="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1 h-7 focus:outline-none focus:border-primary">
                    <select x-model="katastrTyp" class="text-xs border border-gray-200 rounded px-1 h-7">
                        <option value="auto">Auto</option>
                        <option value="pozemkova">Pozemková</option>
                        <option value="stavebni">Stavební</option>
                    </select>
                    <button @click="katastrNactiParcelu()"
                            :disabled="!katastrVybraneKu || !katastrCislo.trim() || katastrNacitani"
                            class="px-2 h-7 text-xs rounded text-white disabled:opacity-40"
                            style="background: var(--color-primary, #dd5500);">
                        <span x-show="!katastrNacitani">Načíst</span>
                        <span x-show="katastrNacitani">...</span>
                    </button>
                </div>
                {{-- Chyba --}}
                <div x-show="katastrChyba" class="text-xs text-red-600 bg-red-50 rounded px-2 py-1" x-text="katastrChyba"></div>
                {{-- Seznam parcel --}}
                <template x-for="(p, i) in katastrParcely" :key="i">
                    <div class="rounded border p-1.5 text-xs transition-colors"
                         :class="p._sousedi === false ? 'border-red-300 bg-red-50' : (_katastrZvyraznenyIndex === i ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50')"
                         @mouseenter="katastrZvyrazniParcelu(i)"
                         @mouseleave="katastrZvyrazniParcelu(null)">
                        <details :open="p._detailsOpen !== false" @toggle="p._detailsOpen = $el.open">
                            <summary class="flex items-center justify-between cursor-pointer select-none list-none">
                                <span class="flex items-center gap-1">
                                    <svg class="h-2.5 w-2.5 transition-transform text-gray-400" :class="(p._detailsOpen !== false) && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                                    <span class="font-medium select-text" style="user-select:text"
                                          @click.stop.prevent
                                          @mousedown.stop
                                          x-text="p.cislo + ' (' + (p.typ === 'stavebni' ? 'st.' : 'p.č.') + ')'"></span>
                                </span>
                                <button @click.stop.prevent="katastrOdeberParcelu(i)" class="text-gray-400 hover:text-red-500">&times;</button>
                            </summary>
                            <div class="text-gray-600 mt-0.5"><span class="text-gray-400">Druh:</span> <span x-text="(p.druh_pozemku_cz || '—') + ', ' + (p.vymera || '?') + ' m²'"></span></div>
                            <template x-for="field in [{k:'radon', lbl:'Radon'}, {k:'geologie', lbl:'Geologie'}, {k:'ig_rajon', lbl:'Základy'}]" :key="field.k">
                                <div x-show="p[field.k]">
                                    <div class="text-gray-600 mt-0.5 flex items-start gap-1">
                                        <div class="flex-1"><span class="text-gray-400" x-text="field.lbl + ':'"></span> <span x-text="p[field.k]"></span></div>
                                        <button @click.stop="otevriVysvetleni(i, field.k)"
                                                class="text-gray-300 hover:text-orange-600 border border-current rounded-full w-4 h-4 text-[9px] leading-none flex items-center justify-center flex-shrink-0"
                                                title="Vysvětlit AI">?</button>
                                    </div>
                                    <div x-show="p._vysvetleni_open === field.k && p._vysvetleni && p._vysvetleni[field.k]"
                                         class="bg-orange-50 border-l-2 border-orange-300 px-2 py-1 mt-0.5 text-gray-700 italic text-xs leading-snug">
                                        <span x-show="p._vysvetleni?.[field.k]?.loading">Načítám…</span>
                                        <span x-show="p._vysvetleni?.[field.k]?.popis" x-text="p._vysvetleni?.[field.k]?.popis"></span>
                                        <span x-show="p._vysvetleni?.[field.k]?.error" class="text-red-600" x-text="p._vysvetleni?.[field.k]?.error"></span>
                                    </div>
                                </div>
                            </template>
                        </details>
                        <div x-show="p._sousedi === false" class="text-red-600 font-medium mt-0.5">Nesousedí</div>
                    </div>
                </template>
                {{-- Souhrn --}}
                <div x-show="katastrParcely.length > 0" class="text-xs text-gray-600 border-t border-gray-100 pt-1.5">
                    <div>Celkem: <strong x-text="katastrCelkovaVymera() + ' m²'"></strong></div>
                    <template x-if="vyskovyProfil">
                        <div>
                            <span>Výška: <strong x-text="vyskovyProfil.vyska_min + ' – ' + vyskovyProfil.vyska_max + ' m n.m.'"></strong></span>
                            <span class="ml-2">Převýšení: <strong x-text="vyskovyProfil.vyskovy_rozdil + ' m'"></strong></span>
                        </div>
                    </template>
                    <span x-show="katastrNacitaniProfil" class="mt-1 text-xs text-gray-400">Načítám výškový profil...</span>
                </div>
            </div>
        </details>

        {{-- Historie --}}
        <details class="kk-section flex-shrink-0" :open="panelOpen.historie" @toggle="panelOpen.historie = $el.open; ulozitPanely()">
            <summary class="px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 flex items-center gap-1 select-none">
                <svg class="h-3 w-3 transition-transform shrink-0" :class="panelOpen.historie && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                <span x-text="'Historie (' + historie.length + ')'">Historie (0)</span>
            </summary>
            <div class="max-h-40 overflow-y-auto divide-y divide-gray-100">
                <template x-for="(h, i) in historie.slice().reverse()" :key="i">
                    <div class="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer" @click="nactiHistorii(historie.length - 1 - i)">
                        <span x-text="h.popis" class="truncate text-gray-600"></span>
                        <span x-text="h.cas?.substring(11, 16)" class="text-gray-400 ml-2 shrink-0"></span>
                    </div>
                </template>
            </div>
        </details>

        {{-- AI Chat --}}
        {{-- AI Chat — summary + obsah --}}
        <div class="kk-section flex-1 flex flex-col min-h-0">
            <div @click="panelOpen.chat = !panelOpen.chat; ulozitPanely()"
                 class="px-3 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:bg-gray-50 flex items-center justify-between flex-shrink-0 select-none">
                <div class="flex items-center gap-1">
                    <svg class="h-3 w-3 transition-transform shrink-0" :class="panelOpen.chat && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                    <span>AI asistent</span>
                </div>
                <div class="flex items-center gap-1">
                    <span x-show="faze" class="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          :class="faze === 'navrh' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'"
                          x-text="faze === 'navrh' ? 'návrh' : faze === 'rozhovor' ? 'rozhovor' : faze"></span>
                    <select x-model="aiModel" @change="ulozitNastaveni()" @click.stop
                            class="text-[10px] border border-gray-200 rounded px-1 py-0 bg-white text-gray-500"
                            data-tip="AI model">
                        <option value="claude-haiku-4-5-20251001">Haiku</option>
                        <option value="claude-sonnet-4-6">Sonnet</option>
                        <option value="claude-opus-4-8">Opus</option>
                    </select>
                </div>
            </div>
            <template x-if="panelOpen.chat">
                <div class="flex-1 flex flex-col min-h-0">
                    <div class="flex-1 overflow-y-auto p-3 space-y-2" x-ref="chatBox" @kk-volba="kkKlikVolba($event.detail)">
                        <template x-for="(msg, i) in chat" :key="i">
                            <div class="flex" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
                                <div class="kk-chat-msg" :class="msg.role === 'user' ? 'kk-chat-user' : 'kk-chat-ai'">
                                    {{-- Vizuálně skrytý prefix — zkopíruje se do clipboardu pro orientaci --}}
                                    <span class="kk-sr-only" x-text="msg.role === 'user' ? 'Já: ' : 'AI: '"></span>
                                    <span x-html="kkFormatujChat(msg.text)"></span>
                                </div>
                            </div>
                        </template>
                        <div x-show="aiNacitani" class="flex justify-start">
                            <div class="kk-spinner">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83"/></svg>
                                Přemýšlím...
                            </div>
                        </div>
                    </div>
                    <div class="p-2 border-t border-gray-100 flex-shrink-0">
                        <div class="flex gap-1">
                            <textarea x-model="aiVstup" @keydown.enter="if (!$event.shiftKey) { $event.preventDefault(); posliAi(); }" rows="2"
                                      class="kk-chat-input flex-1 rounded border border-gray-200 px-2 py-1.5 text-sm resize-none focus:outline-none focus:border-primary"
                                      placeholder="Popiš změnu... (zkratka: /navrh popis = přeskoč rozhovor)"></textarea>
                            <button @click="posliAi()" :disabled="aiNacitani || !aiVstup.trim()"
                                    class="px-3 rounded bg-primary text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 shrink-0"
                                    style="background: var(--color-primary, #dd5500);">
                                &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>{{-- /Panel B --}}

    </div>{{-- /grid wrapper --}}
</div>

<script>
// Auto-redirect na poslední otevřený koncept
if (!{{ $aktivni?->id ?? 'null' }}) {
    const lastId = localStorage.getItem('kk_lastProjekt');
    if (lastId && !new URLSearchParams(window.location.search).has('id')) {
        window.location.href = '{{ route("masterteam.koncept") }}?id=' + lastId;
    }
}
</script>
<link rel="stylesheet" href="/css/chat-widget.css?v=1">
<script src="/js/chat-widget.js?v=1"></script>
<script src="/js/koncept-k-ui.js?v={{ filemtime(public_path('js/koncept-k-ui.js')) }}"></script>
<script>
var _kkInitData = {
    projektId: {{ $aktivni?->id ?? 'null' }},
    projektNazev: @json($aktivni?->nazev ?? ''),
    projektData: @json($aktivni?->data ?? []),
    verze: {{ $aktivni?->verze ?? 0 }},
    faze: @json($aktivni?->faze ?? 'rozhovor'),
    metadata: @json($aktivni?->metadata ?? []),
    chat: @json($aktivni?->chat ?? []),
    historie: @json($aktivni?->historie ?? []),
    csrf: '{{ csrf_token() }}',
    routes: {
        ulozit: '{{ route("masterteam.koncept.ulozit", ":id") }}',
        aiVytvor: '{{ route("masterteam.koncept.aiVytvor") }}',
        aiUprav: '{{ route("masterteam.koncept.aiUprav", ":id") }}',
        vytvorit: '{{ route("masterteam.koncept.vytvorit") }}',
        indexK: '{{ route("masterteam.koncept") }}',
        katastrParcela: '{{ route("masterteam.koncept.katastr.parcela") }}',
        katastrStavby: '{{ route("masterteam.koncept.katastr.stavby") }}',
        katastrOkolni: '{{ route("masterteam.koncept.katastr.okolni") }}',
        katastrVyskovy: '{{ route("masterteam.koncept.katastr.vyskovy") }}',
        katastrSousednost: '{{ route("masterteam.koncept.katastr.sousednost") }}',
        katastrUlozit: '{{ route("masterteam.koncept.katastr.ulozit", ":id") }}',
        vysvetleni: '{{ route("masterteam.koncept.vysvetleni") }}',
        smazat: '{{ route("masterteam.koncept.smazat", ":id") }}',
    },
    mapyczApiKey: '{{ config("services.mapycz.api_key", "") }}',
    // Constraint editor (T-junction slide, detach, snap, junction type barvy).
    // Plně zpětně kompatibilní — koncepty bez constraint metadata (ručně
    // kreslené) se chovají jako předtím (volný 2D drag).
    vyvojMode: true,
};
</script>

<div id="kk-tooltip"></div>

{{-- Constraint editor overlay: DOF indikátor + detach buttons + snap preview.
     Aktivní jen pokud stěny mají constraint metadata (import z pudorys). --}}
<script>
(function () {
    function dofIndicator() {
        if (!window.Alpine) return setTimeout(dofIndicator, 200);
        var wrap = document.getElementById('kk-canvas-wrap');
        if (!wrap) return setTimeout(dofIndicator, 200);
        var alpineRoot = wrap.closest('[x-data]');
        var ctx = alpineRoot && Alpine.$data(alpineRoot);
        if (!ctx || !ctx.engine || !ctx.renderer || !ctx.stage) return setTimeout(dofIndicator, 300);

        var dofLayer = new Konva.Layer({ listening: false });
        ctx.stage.add(dofLayer);

        function redraw() {
            dofLayer.destroyChildren();
            if (ctx._snapPreview) {
                var sp = ctx._snapPreview;
                var hostA = ctx.engine.nodes.get(sp.wall.nodeA);
                var hostB = ctx.engine.nodes.get(sp.wall.nodeB);
                if (hostA && hostB) {
                    dofLayer.add(new Konva.Line({
                        points: [hostA.x, hostA.y, hostB.x, hostB.y],
                        stroke: '#10b981', strokeWidth: 2, dash: [6, 4], opacity: 0.9,
                    }));
                    dofLayer.add(new Konva.Circle({
                        x: sp.point.x, y: sp.point.y,
                        radius: 8, fill: '#10b981', opacity: 0.5,
                        stroke: '#059669', strokeWidth: 2,
                    }));
                }
            }
            var selNodes = ctx.renderer.selectedNodes;
            var selWalls = ctx.renderer.selectedWalls;
            var anyNodeSel = selNodes && selNodes.size > 0;
            var anyWallSel = selWalls && selWalls.size > 0;
            if (!anyNodeSel && !anyWallSel) { dofLayer.listening(false); dofLayer.batchDraw(); return; }
            var scale = (ctx.stage && ctx.stage.scaleX()) || 1;

            // ─── Indikátory na vybraných uzlech (frozen, slide, detach buttons) ───
            if (anyNodeSel) selNodes.forEach(function (nodeId) {
                var node = ctx.engine.nodes.get(nodeId);
                if (!node) return;
                var c = ctx.engine.getNodeMovementConstraint(nodeId);
                if (c && c.type === 'frozen') {
                    // Frozen × — malý, aby se vešel do kruhu uzlu (radius ~5 px)
                    var s = 3 / scale;
                    dofLayer.add(new Konva.Line({ points: [node.x - s, node.y - s, node.x + s, node.y + s], stroke: '#dc2626', strokeWidth: 1.5 / scale }));
                    dofLayer.add(new Konva.Line({ points: [node.x - s, node.y + s, node.x + s, node.y - s], stroke: '#dc2626', strokeWidth: 1.5 / scale }));
                } else if (c && c.type === 'slide') {
                    dofLayer.add(new Konva.Line({ points: [c.line.a.x, c.line.a.y, c.line.b.x, c.line.b.y], stroke: '#dd5500', strokeWidth: 1.5 / scale, dash: [4 / scale, 3 / scale], opacity: 0.8 }));
                }
                var walls = ctx.engine.getNodeWalls(nodeId);
                var hasMultipleWalls = walls.length >= 2;
                if (walls.length > 0) {
                    walls.forEach(function (w, i) {
                        // Detach šipka se kreslí POUZE na straně, kde je stěna skutečně ukotvena
                        // (tj. tento endpoint má constraint) nebo kde je uzel sdílený s jinou stěnou
                        // (roh). Bez toho by se šipka objevovala i na nenapojených koncích.
                        var isEndA = w.nodeA === nodeId;
                        var hasConstraintHere = isEndA ? !!w.odConstraint : !!w.doConstraint;
                        if (!hasConstraintHere && !hasMultipleWalls) return;
                        var otherId = w.nodeA === nodeId ? w.nodeB : w.nodeA;
                        var other = ctx.engine.nodes.get(otherId);
                        if (!other) return;
                        var dx = other.x - node.x, dy = other.y - node.y;
                        var L = Math.hypot(dx, dy);
                        if (L === 0) return;
                        var ux = dx / L, uy = dy / L;
                        var dist = (25 + i * 4) / scale;
                        var bx = node.x + ux * dist, by = node.y + uy * dist;
                        var btn = new Konva.Group({ x: bx, y: by, listening: true });
                        btn.add(new Konva.Circle({ x: 0, y: 0, radius: 8 / scale, fill: '#fee2e2', stroke: '#dc2626', strokeWidth: 1.5 / scale }));
                        // Šipka mířící OD uzlu (ve směru ux, uy) — místo × symbolu
                        var ar = 4.5 / scale;
                        btn.add(new Konva.Arrow({
                            points: [-ux * ar, -uy * ar, ux * ar, uy * ar],
                            stroke: '#dc2626', strokeWidth: 1.5 / scale,
                            fill: '#dc2626',
                            pointerLength: 4 / scale,
                            pointerWidth: 4 / scale,
                        }));
                        btn.setAttr('_detachWallId', w.id);
                        btn.setAttr('_detachNodeId', nodeId);
                        btn.on('click tap', function () {
                            ctx.engine.pushUndo && ctx.engine.pushUndo();
                            var ok = ctx.engine.detachWallFromNode(w.id, nodeId);
                            if (ok) {
                                ctx.renderer.render();
                                if (typeof ctx.markDirty === 'function') ctx.markDirty();
                                else if (typeof ctx.scheduleAutoSave === 'function') ctx.scheduleAutoSave();
                            }
                        });
                        btn.on('mouseenter', function () { document.body.style.cursor = 'pointer'; });
                        btn.on('mouseleave', function () { document.body.style.cursor = ''; });
                        dofLayer.add(btn);
                    });
                }
            });

            // ─── Úhly napojení u vybraných zdí (bez duplicit) ───
            if (anyWallSel) {
                var drawnPairs = new Set();
                // Směr stěny "ven z uzlu". Pro T-junction (uzel není endpoint) = axis stěny.
                // Používáme to místo "směr k druhému endpointu", aby úhel byl invariantní
                // vůči drift uzlu (při rigidní translaci dragované stěny zůstává úhel stabilní).
                var wallDirFromNode = function (nodeId, w) {
                    var a = ctx.engine.nodes.get(w.nodeA);
                    var b = ctx.engine.nodes.get(w.nodeB);
                    if (!a || !b) return null;
                    if (w.nodeA === nodeId) return { x: b.x - a.x, y: b.y - a.y };
                    if (w.nodeB === nodeId) return { x: a.x - b.x, y: a.y - b.y };
                    return { x: b.x - a.x, y: b.y - a.y };
                };
                var drawAngleArc = function (nodeId, wallA, wallB) {
                    var node = ctx.engine.nodes.get(nodeId);
                    if (!node || !wallA || !wallB) return;
                    // Idealní junction pozice: pro T-junction leží přesně na ose hostitele
                    // (stored t × host vector). Stored node může být driftovaný kvůli floating-point,
                    // arc se pak vizuálně odlepí od průsečíku stěn. Spočítat ideal ze constraintu.
                    var cx = node.x, cy = node.y;
                    var recenterFromConstraint = function (childW, hostW, isEndA) {
                        if (!childW || !hostW) return false;
                        var con = isEndA ? childW.odConstraint : childW.doConstraint;
                        if (!con || con.host !== hostW.id) return false;
                        var ha = ctx.engine.nodes.get(hostW.nodeA);
                        var hb = ctx.engine.nodes.get(hostW.nodeB);
                        if (!ha || !hb) return false;
                        // Projekce aktuální pozice uzlu na osu hostitele — sleduje pohyb při dragu.
                        // Stored con.t se BĚHEM drag neaktualizuje, takže projekce je spolehlivější.
                        var childNode = ctx.engine.nodes.get(isEndA ? childW.nodeA : childW.nodeB);
                        if (!childNode) return false;
                        var hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                        var hL2 = hdx * hdx + hdy * hdy;
                        if (hL2 === 0) return false;
                        var projT = ((childNode.x - ha.x) * hdx + (childNode.y - ha.y) * hdy) / hL2;
                        projT = Math.max(0, Math.min(1, projT));
                        cx = ha.x + projT * hdx;
                        cy = ha.y + projT * hdy;
                        return true;
                    };
                    if (wallA.nodeA === nodeId) recenterFromConstraint(wallA, wallB, true);
                    else if (wallA.nodeB === nodeId) recenterFromConstraint(wallA, wallB, false);
                    if (cx === node.x && cy === node.y) {
                        if (wallB.nodeA === nodeId) recenterFromConstraint(wallB, wallA, true);
                        else if (wallB.nodeB === nodeId) recenterFromConstraint(wallB, wallA, false);
                    }
                    var dirA = wallDirFromNode(nodeId, wallA);
                    var dirB = wallDirFromNode(nodeId, wallB);
                    if (!dirA || !dirB) return;
                    var ax = dirA.x, ay = dirA.y;
                    var bx = dirB.x, by = dirB.y;
                    var aL = Math.hypot(ax, ay), bL = Math.hypot(bx, by);
                    if (aL === 0 || bL === 0) return;
                    var angA = Math.atan2(ay, ax) * 180 / Math.PI;
                    var angB = Math.atan2(by, bx) * 180 / Math.PI;
                    var diff = angB - angA;
                    while (diff > 180) diff -= 360;
                    while (diff < -180) diff += 360;
                    var absDiff = Math.abs(diff);
                    if (absDiff < 1) return;
                    // Arc radius je WORLD-constant (v metrech reálu) — plave se zoomem jako budova.
                    // Bez toho by při odzoomování byly arcy obrovské vůči stěnám a překrývaly se
                    // (screen-constant 32 px = velké vůči malé budově). 30 cm world = přirozená škála.
                    var r = 0.30 * ctx.engine.PX_PER_M;
                    var halfA = (wallA.tloustka || 0.1) * ctx.engine.PX_PER_M / 2;
                    var halfB = (wallB.tloustka || 0.1) * ctx.engine.PX_PER_M / 2;
                    var maxShiftDeg = absDiff * 0.4;
                    var shiftA = Math.min(maxShiftDeg, Math.asin(Math.min(1, halfA / r)) * 180 / Math.PI);
                    var shiftB = Math.min(maxShiftDeg, Math.asin(Math.min(1, halfB / r)) * 180 / Math.PI);
                    var rotation = diff > 0 ? (angA + shiftA) : (angB + shiftB);
                    var sweep = absDiff - shiftA - shiftB;
                    if (sweep <= 1) return;
                    dofLayer.add(new Konva.Arc({
                        x: cx, y: cy,
                        innerRadius: r, outerRadius: r,
                        angle: sweep, rotation: rotation,
                        stroke: '#f59e0b', strokeWidth: r * 0.05,
                    }));
                    var midAng = (rotation + sweep / 2) * Math.PI / 180;
                    var tx = cx + Math.cos(midAng) * r * 1.55;
                    var ty = cy + Math.sin(midAng) * r * 1.55;
                    var txt = Math.round(absDiff) + '°';
                    // Text ve stejné škále jako arc (world-constant) — proporčně k rádiusu
                    var fontPx = r * 0.45;
                    dofLayer.add(new Konva.Text({
                        x: tx, y: ty,
                        text: txt,
                        fontSize: fontPx,
                        fontStyle: 'bold',
                        fill: '#b45309',
                        offsetX: (txt.length * fontPx * 0.27),
                        offsetY: fontPx * 0.45,
                    }));
                };
                var addPair = function (nodeId, wA, wB) {
                    if (!wA || !wB || wA.id === wB.id) return;
                    var ids = [wA.id, wB.id].sort();
                    var key = nodeId + ':' + ids[0] + ':' + ids[1];
                    if (drawnPairs.has(key)) return;
                    drawnPairs.add(key);
                    drawAngleArc(nodeId, wA, wB);
                };
                selWalls.forEach(function (wId) {
                    var w = ctx.engine.walls.get(wId);
                    if (!w) return;
                    [w.nodeA, w.nodeB].forEach(function (nId) {
                        // Páry s jinými zdmi sdílejícími tento uzel
                        var neighbors = ctx.engine.getNodeWalls(nId);
                        neighbors.forEach(function (nbr) {
                            if (nbr.id !== w.id) addPair(nId, w, nbr);
                        });
                    });
                    // T-junction host: spoj w s host stěnou v místě constraintu
                    if (w.odConstraint && w.odConstraint.host) {
                        var hostA = ctx.engine.walls.get(w.odConstraint.host);
                        if (hostA) addPair(w.nodeA, w, hostA);
                    }
                    if (w.doConstraint && w.doConstraint.host) {
                        var hostB = ctx.engine.walls.get(w.doConstraint.host);
                        if (hostB) addPair(w.nodeB, w, hostB);
                    }
                });
            }

            dofLayer.listening(anyNodeSel);
            dofLayer.batchDraw();
        }
        var origRender = ctx.renderer.render.bind(ctx.renderer);
        ctx.renderer.render = function () { origRender(); redraw(); };
        redraw();
    }
    document.addEventListener('alpine:initialized', dofIndicator);
})();
</script>

<script>
(function(){
    const tip = document.getElementById('kk-tooltip');
    document.addEventListener('mouseover', function(e) {
        const el = e.target.closest('[data-tip],[data-tip-below]');
        if (!el) { tip.classList.remove('visible'); return; }
        const text = el.getAttribute('data-tip') || el.getAttribute('data-tip-below');
        if (!text) { tip.classList.remove('visible'); return; }
        tip.textContent = text;
        tip.classList.add('visible');
        const r = el.getBoundingClientRect();
        const isBelow = el.hasAttribute('data-tip-below');
        // Nejdřív zobrazit aby měl rozměry
        tip.style.top = '0'; tip.style.left = '0';
        const tw = tip.offsetWidth, th = tip.offsetHeight;
        let top = isBelow ? r.bottom + 6 : r.top - th - 6;
        let left = r.left + r.width / 2 - tw / 2;
        if (left + tw > window.innerWidth - 4) left = window.innerWidth - tw - 4;
        if (left < 4) left = 4;
        if (top < 4) top = r.bottom + 6;
        if (top + th > window.innerHeight - 4) top = r.top - th - 6;
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
    });
    document.addEventListener('mouseout', function(e) {
        const el = e.target.closest('[data-tip],[data-tip-below]');
        if (el) tip.classList.remove('visible');
    });
})();
</script>

</x-layouts.app>
