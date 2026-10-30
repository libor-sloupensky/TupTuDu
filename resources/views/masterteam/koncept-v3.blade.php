@php
    // Stejný editor běží v masterteamu i v zákaznické aplikaci (app.tuptudu.com/projects/{kod}).
    // Liší se jen předponou názvů rout a layoutem — předává je Aplikace\ProjektyController.
    $trasaV3 ??= 'masterteam.koncept-v3';
    $layoutV3 ??= 'layouts.app';
@endphp
<x-dynamic-component :component="$layoutV3" :title="$titulekV3 ?? 'Koncept V3 — TupTuDu'" :fullWidth="true">

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
<script src="/js/koncept-v3/stavebni-engine.js?v={{ filemtime(public_path('js/koncept-v3/stavebni-engine.js')) }}"></script>
<script src="/js/koncept-v3/pudorys-icons.js?v={{ filemtime(public_path('js/koncept-v3/pudorys-icons.js')) }}"></script>
<script src="/js/koncept-v3/konva-renderer.js?v={{ filemtime(public_path('js/koncept-v3/konva-renderer.js')) }}"></script>

<style>
    [x-cloak] { display: none !important; }
    #kk-tooltip {
        position: fixed; background: #333; color: #fff; font-size: 11px;
        padding: 3px 8px; border-radius: 4px; white-space: nowrap;
        z-index: 999999; pointer-events: none; opacity: 0;
        transition: opacity 0.1s;
    }
    #kk-tooltip.visible { opacity: 1; }
    /* Pravý panel — samostatné bloky jako v Kalkuliu (zaoblená karta, tenká
       obruba, tučný nadpis, šipka vpravo, obruba v brand barvě při najetí).
       Barvy a font jsou naše (--c-*, Nunito z /css/app.css). */
    .kk-panel-b { gap: 8px; }
    .kk-karta, .kk-section {
        background: var(--c-surface); border: 1px solid var(--c-border);
        border-radius: var(--s-radius); overflow: hidden; flex-shrink: 0;
        transition: border-color .15s;
    }
    .kk-section:hover { border-color: color-mix(in srgb, var(--c-primary) 45%, var(--c-border)); }
    .kk-section-hlava {
        display: flex; align-items: center; gap: 8px; padding: 9px 12px;
        font-size: 13.5px; font-weight: 700; line-height: 1.3; color: var(--c-text);
        cursor: pointer; user-select: none; list-style: none;
    }
    .kk-section-hlava::-webkit-details-marker { display: none; }
    .kk-sipka { margin-left: auto; flex-shrink: 0; color: var(--c-text-secondary); transition: transform .2s; }
    .kk-section[open] > .kk-section-hlava .kk-sipka { transform: rotate(180deg); }
    .kk-section[open] > .kk-section-hlava { border-bottom: 1px solid var(--c-border); }
    .kk-panel-b input[type=checkbox], .kk-panel-b input[type=range] { accent-color: var(--c-primary); }
    /* označení objektu (W3, D56) na začátku řádku seznamu — pevná šířka, ať názvy lícují */
    .kk-oznaceni {
        flex-shrink: 0; min-width: 34px; padding: 0 4px; border-radius: 4px; text-align: center;
        font-size: 10px; font-weight: 800; line-height: 16px; font-variant-numeric: tabular-nums;
    }
    /* počet položek v nadpisu bloku */
    .kk-pocet {
        padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700;
        font-variant-numeric: tabular-nums;
        background: var(--c-primary-10); color: var(--c-primary-text);
    }
    /* Bliknutí po Zpět / Vpřed — ať si uživatel všimne, že se posunul v historii.
       Rychlý náběh do brand barvy (120 ms, ease-out), pomalý dozvuk zpět
       (~660 ms). Mezikroky chybí záměrně: začátek a konec je vlastní styl prvku,
       takže to sedí na šedou šipku i na zvýrazněný řádek. */
    /* Lišty editoru — tlačítka jako ve výkazu výměr: bílý čtvereček s tenkou
       obrubou, aktivní nástroj v barvě značky. Najetí řeší CSS (dřív @mouseenter
       s natvrdo zapsanou barvou na každém tlačítku zvlášť). */
    .kk-lista { background: color-mix(in srgb, var(--c-bg) 55%, var(--c-surface)); }
    .kk-tl { display: inline-flex; align-items: center; justify-content: center; height: 28px; min-width: 28px;
             padding: 0 6px; border: 1px solid var(--c-border); border-radius: 6px; background: var(--c-surface);
             color: var(--c-text-secondary); line-height: 1; transition: border-color .15s, color .15s, background-color .15s; }
    .kk-tl:hover:not(:disabled) { border-color: var(--c-primary); color: var(--c-primary); }
    .kk-tl:disabled { opacity: .35; cursor: default; }
    .kk-tl.kk-tl-aktivni { border-color: var(--c-primary); background: var(--c-primary-10); color: var(--c-primary); }
    .kk-skupina { display: inline-flex; align-items: stretch; height: 28px; border: 1px solid var(--c-border);
                  border-radius: 6px; background: var(--c-surface); overflow: hidden; font-size: 12px; }
    .kk-skupina > button { padding: 0 8px; color: var(--c-text-secondary); transition: color .15s, background-color .15s; }
    .kk-skupina > button:hover:not(.kk-tl-aktivni) { background: var(--c-primary-10); color: var(--c-primary); }
    .kk-skupina > button.kk-tl-aktivni { background: var(--c-primary); color: var(--c-surface); }
    .kk-skupina-dily > * + * { border-left: 1px solid var(--c-border); }
    .kk-skupina > span { display: inline-flex; align-items: center; justify-content: center; min-width: 40px;
                         color: var(--c-text-secondary); font-variant-numeric: tabular-nums; }
    .kk-oddelovac { width: 1px; height: 16px; margin: 0 4px; background: var(--c-border); }
    .kk-pole { height: 28px; border: 1px solid var(--c-border); border-radius: 6px; background: var(--c-surface);
               padding: 0 6px; font-size: 12px; color: var(--c-text-secondary); }
    .kk-pole:focus { outline: none; border-color: var(--c-primary); }
    @keyframes kk-blik {
        0%  { animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
        15% { color: var(--c-primary); background-color: color-mix(in srgb, var(--c-primary) 14%, transparent);
              animation-timing-function: cubic-bezier(.4, 0, .2, 1); }
    }
    @keyframes kk-blik-tlacitko {
        0%  { animation-timing-function: cubic-bezier(.2, .7, .3, 1); }
        15% { color: var(--c-primary); transform: scale(1.18);
              animation-timing-function: cubic-bezier(.4, 0, .2, 1); }
    }
    .kk-blik { animation: kk-blik 780ms; }
    .kk-blik-tlacitko { animation: kk-blik-tlacitko 780ms; }
    @media (prefers-reduced-motion: reduce) {
        .kk-blik-tlacitko { animation-name: kk-blik; }   /* jen barva, bez zvětšení */
    }
    /* Širší posuvník v okně importu — výchozí je v prohlížečích velmi tenký.
       POZOR: Chrome dává přednost standardní vlastnosti scrollbar-width před
       ::-webkit-scrollbar, takže se tu ZÁMĚRNĚ neuvádí (jinak by se šířka
       ignorovala). Firefox si vezme aspoň barvy níže. */
    .kk-posuvnik::-webkit-scrollbar { width: 18px; }
    .kk-posuvnik::-webkit-scrollbar-track { background: #f3f4f6; border-radius: 8px; }
    .kk-posuvnik::-webkit-scrollbar-thumb {
        background: #9ca3af; border-radius: 8px;
        border: 3px solid #f3f4f6; background-clip: padding-box;
    }
    .kk-posuvnik::-webkit-scrollbar-thumb:hover { background: #6b7280; background-clip: padding-box; }
    @supports (-moz-appearance: none) { .kk-posuvnik { scrollbar-color: #9ca3af #f3f4f6; } }
    .koncept-k-wrap { width: 100%; overflow: hidden; }
    .koncept-k-wrap.fullscreen { position: fixed; inset: 0; z-index: 9999; }
    /* V fullscreen režimu skrýt web navigaci (header + sidebar + footer) */
    body.kk-fullscreen > header,
    body.kk-fullscreen #kk-sidebar,
    body.kk-fullscreen > footer,
    body.kk-fullscreen footer { display: none !important; }
    .kk-divider { cursor: col-resize; background: #e5e7eb; position: relative; }
    .kk-divider:hover, .kk-divider.dragging { background: var(--c-primary); }
    .kk-toolbar { display: flex; align-items: center; gap: 8px; padding: 6px 12px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
    .kk-toolbar button, .kk-toolbar select { font-size: 12px; }
    .kk-btn { padding: 4px 10px; border-radius: 4px; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 12px; transition: all .15s; }
    .kk-btn:hover { border-color: var(--c-primary); color: var(--c-primary); }
    .kk-btn.active { background: var(--c-primary); color: white; border-color: var(--c-primary); }
    .kk-status-row { position: absolute; bottom: 4px; left: 4px; display: flex; align-items: stretch; gap: 4px; z-index: 10; pointer-events: none; }
    .kk-status-row > div { padding: 2px 8px; border-radius: 3px; font: 12px/1.4 monospace; display: flex; align-items: center; }
    .kk-coords { background: rgba(0,80,0,.85); color: #0f0; }
    .kk-3d-help { background: rgba(0,0,0,.65); color: #ddd; }
    #kk-canvas-wrap { position: relative; width: 100%; height: 100%; overflow: hidden; background: #fff; }
    #kk-canvas-wrap.zvyraznovac-cursor canvas { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Ccircle cx='10' cy='10' r='9' fill='rgba(255,105,180,0.35)' stroke='rgba(255,105,180,0.8)' stroke-width='1'/%3E%3C/svg%3E") 10 10, crosshair !important; }
    /* Chat styly importovány z /css/chat-widget.css */
</style>

{{-- komponenta se skládá funkcí, ne rozprostřením — jinak zmrznou gettery --}}
<div x-data="konceptV3Komponenta(_kkInitData)" x-init="init(); podkladInit()" x-cloak
     class="koncept-k-wrap" :class="{ 'fullscreen': celaObrazovka }"
     :style="'height:' + editorHeight + 'px'"
     x-effect="document.body.classList.toggle('kk-fullscreen', celaObrazovka)"
     @keydown.window="onKeyDown($event)">

    <div x-ref="gridWrap" class="w-full h-full" :style="gridStyle">

    {{-- ═══ PANEL A — Canvas (grafika) ═══ --}}
    <div class="flex flex-col bg-white" :class="celaObrazovka ? '' : 'rounded-lg border border-gray-200'"
         :style="'order:' + (obracene ? 2 : 0) + ';min-width:0;min-height:0'">
        {{-- Toolbar — řádek 1: název, 2D/3D, zoom, layout, fullscreen --}}
        <div class="kk-lista flex items-center px-3 py-1.5 border-b border-gray-200 gap-1.5">
            <span class="text-sm font-medium text-gray-700 truncate max-w-[200px]" x-text="projektNazev || 'Nový koncept'"></span>
            <div class="flex-1"></div>
            {{-- Mapový podklad --}}
            <select x-model="katastrMapaPodklad"
                    @change="if (katastrParcely.length === 0 && katastrMapaPodklad !== 'zadny') { katastrMapaPodklad = 'zadny'; alert('Nejprve načtěte parcelu.'); } else { katastrZmenPodklad(); ulozitNastaveni(); }"
                    class="kk-pole">
                <option value="zadny">Bez podkladu</option>
                <option value="zakladni">Základní mapa</option>
                <option value="ortofoto">Ortofoto</option>
                <option value="turisticka">Turistická</option>
            </select>
            {{-- 2D/3D přepínač --}}
            <div class="kk-skupina kk-skupina-dily">
                <button @click="rezim3d = false; prepni2d()" :class="!rezim3d && 'kk-tl-aktivni'">2D</button>
                <button @click="rezim3d = true; prepni3d()" :class="rezim3d && 'kk-tl-aktivni'">3D</button>
            </div>
            <button @click="undo()" data-historie-zpet :disabled="historiePozice <= 0" class="kk-tl text-base" data-tip-below="Zpět (Ctrl+Z)">&#8630;</button>
            <button @click="redo()" data-historie-vpred :disabled="historiePozice >= historie.length - 1" class="kk-tl text-base" data-tip-below="Vpřed (Ctrl+Shift+Z)">&#8631;</button>
            <div class="kk-skupina">
                <button @click="zoomOut()" data-tip-below="Oddálit (kolečko)">&minus;</button>
                <span x-text="Math.round(zoom * 100) + ' %'"></span>
                <button @click="zoomIn()" data-tip-below="Přiblížit (kolečko)">+</button>
            </div>
            <span class="kk-oddelovac"></span>
            {{-- Layout --}}
            <button @click="cyklujLayout()" class="kk-tl" :data-tip-below="layoutTip">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                    <g x-show="layoutMode === 0">
                        <rect x="1" y="1" width="8" height="14" rx="1" fill="currentColor" opacity="0.15"/><rect x="1" y="1" width="8" height="14" rx="1"/>
                        <line x1="11" y1="3" x2="15" y2="3"/><line x1="11" y1="6" x2="15" y2="6"/><line x1="11" y1="9" x2="14" y2="9"/>
                    </g>
                    <g x-show="layoutMode === 1">
                        <rect x="7" y="1" width="8" height="14" rx="1" fill="currentColor" opacity="0.15"/><rect x="7" y="1" width="8" height="14" rx="1"/>
                        <line x1="1" y1="3" x2="5" y2="3"/><line x1="1" y1="6" x2="5" y2="6"/><line x1="1" y1="9" x2="4" y2="9"/>
                    </g>
                </svg>
            </button>
            {{-- Fullscreen --}}
            <button @click="prepniFullscreen()" class="kk-tl" :data-tip-below="celaObrazovka ? 'Zmenšit (F11)' : 'Celá obrazovka (F11)'">
                <svg x-show="!celaObrazovka" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="1,5 1,1 5,1"/><polyline points="11,1 15,1 15,5"/><polyline points="15,11 15,15 11,15"/><polyline points="5,15 1,15 1,11"/>
                </svg>
                <svg x-show="celaObrazovka" x-cloak width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="5,1 5,5 1,5"/><polyline points="15,5 11,5 11,1"/><polyline points="11,15 11,11 15,11"/><polyline points="1,11 5,11 5,15"/>
                </svg>
            </button>
        </div>
        {{-- Toolbar — řádek 2: nástroje + nápověda --}}
        <div class="kk-lista flex items-center px-3 py-1.5 gap-2 border-b border-gray-200">
            <div class="flex items-center gap-1.5">
                {{-- Výběr --}}
                <button @click="nastroj = 'vyber'" class="kk-tl" :class="nastroj === 'vyber' && 'kk-tl-aktivni'"
                        data-tip="Výběr (1)">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="1" y="1" width="14" height="14" rx="1" stroke-dasharray="3 2"/>
                    </svg>
                </button>
                {{-- Posun (ruka) --}}
                <button @click="nastroj = 'posun'" class="kk-tl" :class="nastroj === 'posun' && 'kk-tl-aktivni'"
                        data-tip="Posun (2 / pravé myšítko)">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9V3.5a1 1 0 012 0V8.5"/>
                        <path d="M8 7.5V2.5a1 1 0 012 0V8"/>
                        <path d="M10 7.5V3.5a1 1 0 012 0V8.5"/>
                        <path d="M12 6.5a1 1 0 012 0V10a5 5 0 01-5 5H8a4.5 4.5 0 01-3.5-1.7L2.8 11a1.2 1.2 0 011.7-1.3L6 11.5"/>
                    </svg>
                </button>
                {{-- Zvýrazňovač — sloužil JEN k označení stěn pro AI (posílá se jako
                     „oznacene“ do AI úpravy). V3 je bez AI, takže je SKRYTÝ;
                     v budoucnu k vymazání i s _detekujOznaceneSteny(). --}}
                <div class="relative" style="display:none">
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
                <button @click="nastroj = 'stena'" class="kk-tl" :class="nastroj === 'stena' && 'kk-tl-aktivni'"
                        data-tip="Kreslit stěnu (4) · držet Alt = bez magnetu">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="2" y1="14" x2="14" y2="2"/>
                        <line x1="1" y1="13" x2="13" y2="1"/>
                    </svg>
                </button>
                {{-- Metr --}}
                <button @click="nastroj = nastroj === 'metr' ? 'vyber' : 'metr'" class="kk-tl" :class="nastroj === 'metr' && 'kk-tl-aktivni'"
                        data-tip="Měřit vzdálenost (5 / M)">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="1" y1="15" x2="15" y2="15"/><line x1="1" y1="13" x2="1" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/>
                        <line x1="4" y1="14" x2="4" y2="15"/><line x1="7" y1="14" x2="7" y2="15"/><line x1="10" y1="14" x2="10" y2="15"/><line x1="13" y1="14" x2="13" y2="15"/>
                        <text x="8" y="11" font-size="7" text-anchor="middle" fill="currentColor" stroke="none">m</text>
                    </svg>
                </button>
                {{-- Otvor --}}
                <button @click="nastroj = nastroj === 'otvor' ? 'vyber' : 'otvor'" class="kk-tl" :class="nastroj === 'otvor' && 'kk-tl-aktivni'"
                        data-tip="Vložit otvor do stěny (6 / O)">
                    {{-- zeď v řezu s proraženým otvorem --}}
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <line x1="1" y1="5" x2="5" y2="5"/><line x1="1" y1="11" x2="5" y2="11"/>
                        <line x1="11" y1="5" x2="15" y2="5"/><line x1="11" y1="11" x2="15" y2="11"/>
                        <line x1="5" y1="4" x2="5" y2="12"/><line x1="11" y1="4" x2="11" y2="12"/>
                    </svg>
                </button>
            </div>

            {{-- Volby stěny — jen když je nástroj zapnutý (stejně jako u otvoru) --}}
            <div x-show="nastroj === 'stena'" x-cloak class="flex items-center gap-1 ml-1 text-xs">
                <select x-model="stenaTyp" @change="tloustkaSteny = vychoziTloustka(stenaTyp); ulozitNastaveni()"
                        class="kk-pole">
                    <option value="obvodova">Obvodová</option>
                    <option value="nosna">Nosná</option>
                    <option value="pricka">Příčka</option>
                    <option value="zidka">Zídka</option>
                    <option value="plot">Plot</option>
                </select>
                {{-- Tloušťka v cm (v enginu zůstávají metry) --}}
                <input type="number" min="5" max="60" step="1"
                       :value="Math.round(tloustkaSteny * 100)"
                       @change="tloustkaSteny = Math.min(0.6, Math.max(0.05, (parseFloat($event.target.value) || 0) / 100)); ulozitNastaveni()"
                       @keydown.enter.prevent="$event.target.blur()"
                       class="kk-pole w-14">
                <span class="text-gray-400">cm</span>
            </div>

            {{-- Volby otvoru — jen když je nástroj zapnutý --}}
            <div x-show="nastroj === 'otvor'" x-cloak class="flex items-center gap-1 ml-1 text-xs">
                <select x-model="otvorTyp" @change="otvorSirka = { dvere: 0.9, okno: 1.2, pruchod: 0.9 }[otvorTyp] || otvorSirka; ulozitNastaveni()"
                        class="kk-pole">
                    {{-- Průchod tu není schválně — je mezi typy dveří v panelu vlastností --}}
                    <option value="dvere">Dveře</option>
                    <option value="okno">Okno</option>
                </select>
                {{-- Šířka v cm (v enginu zůstávají metry) --}}
                <input type="number" min="40" max="300" step="5"
                       :value="Math.round(otvorSirka * 100)"
                       @change="otvorSirka = Math.min(3, Math.max(0.4, (parseFloat($event.target.value) || 0) / 100)); ulozitNastaveni()"
                       @keydown.enter.prevent="$event.target.blur()"
                       class="kk-pole w-14">
                <span class="text-gray-400">cm</span>
                <span x-show="otvorZprava" x-cloak class="text-orange-700" x-text="otvorZprava"></span>
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
                        <tr><td><strong>6 / O</strong></td><td>otvor do stěny</td></tr>
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
                        <tr><td><strong>Alt + tah</strong></td><td>bez magnetu (bod, stěna, otáčení)</td></tr>
                        <tr><td><strong>Delete</strong></td><td>smazat vybrané</td></tr>
                        <tr><td><strong>Ctrl+Z</strong></td><td>zpět</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">Kreslení a nástroje</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>1 / 2 / 3 / 4</strong></td><td>výběr / posun / zvýrazňovač / stěna</td></tr>
                        <tr><td><strong>Alt</strong></td><td>kreslit stěnu bez magnetu</td></tr>
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
                 style="position:absolute;top:12px;right:80px;z-index:15;min-width:180px;border:1.5px solid var(--c-primary)">
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
                                    {{-- Okna mají spoustu atypických rozměrů (230, 175…), proto
                                         číslo. Dveře se vyrábějí v normové řadě, tam stačí výběr. --}}
                                    <div class="flex items-center gap-1 ml-auto">
                                        <span class="text-gray-500">š:</span>
                                        <template x-if="inspector.typ === 'okno'">
                                            <span class="flex items-center gap-1">
                                                <input type="number" min="10" max="600" step="1"
                                                       class="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
                                                       :value="inspector.sirka !== null ? Math.round(inspector.sirka * 100) : ''"
                                                       @change="setOpeningSirka(parseFloat($event.target.value) / 100)"
                                                       @keydown.enter.prevent="$event.target.blur()">
                                                <span class="text-gray-500">cm</span>
                                            </span>
                                        </template>
                                        <template x-if="inspector.typ !== 'okno'">
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
                                        </template>
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
                                    {{-- Volně psaná tloušťka v cm (jako šířka okna) — stěny bývají
                                         i atypické, přichytávání na normovou řadu tu překáželo. --}}
                                    <input type="number" min="2" max="100" step="1"
                                           class="w-16 border border-gray-300 rounded px-1 py-0.5 text-xs"
                                           :value="inspector.tloustka !== null ? Math.round(inspector.tloustka * 100) : ''"
                                           :disabled="inspector.typ === null"
                                           @change="setWallTloustka(parseFloat($event.target.value) / 100, true)"
                                           @keydown.enter.prevent="$event.target.blur()">
                                    <span class="text-gray-500">cm</span>
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
    <div class="kk-panel-b flex flex-col overflow-y-auto"
         :style="'order:' + (obracene ? 0 : 2) + ';min-width:0;min-height:0'">
        {{-- Projekt select + přejmenování --}}
        <div class="kk-karta flex items-center gap-1 px-2 py-1.5">
            <template x-if="!_prejmenovaniKonceptu">
                <div class="flex items-center gap-1 flex-1 min-w-0 group">
                    <select x-model="projektId" @change="prepniProjekt()" class="kk-btn flex-1 truncate text-sm">
                        <option value="">— Vytvořit nový koncept —</option>
                        <template x-for="k in koncepty" :key="k.id">
                            <option :value="k.id" x-text="k.nazev"></option>
                        </template>
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
            <button @click="novyProjekt()" class="kk-btn" title="Vytvořit nový koncept">+</button>
        </div>

        {{-- Parcela (Katastr) --}}
        <details class="kk-section" :open="panelOpen.parcela" @toggle="panelOpen.parcela = $el.open; ulozitPanely()">
            <summary class="kk-section-hlava">
                <span>Parcela</span>
                <span x-show="katastrParcely.length > 0" class="kk-pocet" x-text="katastrParcely.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="px-3 py-2 space-y-2 max-h-96 overflow-y-auto">
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
                            style="background: var(--c-primary);">
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

        {{-- Objekty --}}
        <details class="kk-section" :open="panelOpen.objekty" @toggle="panelOpen.objekty = $el.open; ulozitPanely()">
            <summary class="kk-section-hlava">
                <span>Objekty</span>
                <span x-show="seznamObjektu.length > 0" class="kk-pocet" x-text="seznamObjektu.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
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
                            {{-- Označení z výkresu — stejná barva jako popisek na plátně
                                 (stěny fialově, otvory oranžově), ať jde řádek spárovat s kresbou --}}
                            <span class="kk-oznaceni" :class="obj.type === 'wall' ? 'text-purple-600 bg-purple-50' : 'text-orange-600 bg-orange-50'"
                                  x-text="obj.id"></span>
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

        {{-- Podklad (import půdorysu z výkresu) --}}
        <details class="kk-section" :open="panelOpen.podklad" @toggle="panelOpen.podklad = $el.open; ulozitPanely(); if ($el.open) impNactiDrive()">
            <summary class="kk-section-hlava">
                <span>Podklad</span>
                <span x-show="podklad" class="kk-pocet">1</span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            {{-- V panelu je jen výkres, který se právě používá. Ostatní dřív nahrané
                 jsou pod „Nový výkres…“ v průvodci, ať se seznam nepřehlcuje. --}}
            <div class="px-3 py-2 space-y-2">
                <template x-if="!podklad">
                    <div>
                        <button @click="impOtevri()" class="kk-btn w-full text-xs">Nový výkres…</button>
                        <div class="text-[10px] text-gray-400 mt-1">PDF od architekta, sken nebo obrázek půdorysu.</div>
                    </div>
                </template>
                <template x-if="podklad">
                    <div class="space-y-1.5">
                        <div class="text-xs text-gray-600 truncate" x-text="podklad.nazev || 'Výkres'"></div>
                        <div class="text-[10px] text-gray-400">
                            změřeno · <span x-text="podklad.sirkaM.toFixed(1) + ' × ' + podklad.vyskaM.toFixed(1) + ' m'"></span>
                        </div>
                        {{-- Zobrazení podkladu — oddělené čarou, ať je vidět, že patří k sobě.
                             „Nad“ umožní obkreslovat i tam, kde už stěna leží. --}}
                        <div class="pt-2 mt-1 border-t border-gray-200">
                            <div class="text-[10px] text-gray-400 mb-1">Zobrazení podkladu</div>
                            <div class="flex items-center rounded overflow-hidden border border-gray-200 w-full">
                                <template x-for="v in [{ k: 'pod', t: 'Pod' }, { k: 'nad', t: 'Nad' }, { k: 'skryt', t: 'Skrýt' }]" :key="v.k">
                                    <button @click="podkladZmena({ zobrazeni: v.k })"
                                            class="flex-1 px-1 py-0.5 text-[11px] transition border-l border-gray-200 first:border-l-0"
                                            :class="podkladZobrazeni() === v.k ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'"
                                            x-text="v.t"></button>
                                </template>
                            </div>
                            {{-- vlevo bledý, vpravo sytý; x-model, ať jezdec drží polohu i po překreslení --}}
                            <div class="flex items-center gap-2 mt-1.5" x-show="podkladZobrazeni() !== 'skryt'">
                                <span class="text-[10px] text-gray-400 shrink-0">Sytost</span>
                                <input type="range" min="0.1" max="1" step="0.05"
                                       x-model.number="podklad.pruhlednost"
                                       @input="podkladZmena({ pruhlednost: parseFloat($event.target.value) })"
                                       class="flex-1">
                                <span class="text-[10px] text-gray-400 w-7 text-right"
                                      x-text="Math.round((podklad.pruhlednost ?? 0.5) * 100) + '%'"></span>
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <button @click="impOtevri()" class="kk-btn flex-1 text-xs">Nový výkres…</button>
                            <button @click="podkladOdeber()" class="kk-btn text-xs text-red-600">Odebrat</button>
                        </div>
                    </div>
                </template>
            </div>
        </details>

        {{-- Historie --}}
        <details class="kk-section" :open="panelOpen.historie" @toggle="panelOpen.historie = $el.open; ulozitPanely()">
            <summary data-historie-souhrn class="kk-section-hlava">
                <span>Historie</span>
                {{-- Po Zpět je vidět i u sbaleného panelu, na kterém kroku se stojí --}}
                <span x-show="historie.length > 0" class="kk-pocet"
                      x-text="historiePozice < historie.length - 1
                          ? 'krok ' + (historiePozice + 1) + ' z ' + historie.length
                          : historie.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="max-h-40 overflow-y-auto divide-y divide-gray-100">
                {{-- Nejnovější nahoře. Aktuální krok je zvýrazněný, kroky „v budoucnosti“
                     (po Zpět) jsou zašedlé — Vpřed je vrátí, nová úprava je zahodí. --}}
                <template x-for="(h, i) in historie.slice().reverse()" :key="h.id || i">
                    <div class="flex items-center justify-between px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                         :class="historie.length - 1 - i === historiePozice ? 'bg-primary/10 font-medium' : ''"
                         :data-krok="h.id"
                         @click="nactiHistorii(historie.length - 1 - i)">
                        <span x-text="h.popis" class="truncate"
                              :class="historie.length - 1 - i > historiePozice ? 'text-gray-300 line-through' : 'text-gray-600'"></span>
                        <span x-text="h.cas?.substring(11, 16)" class="text-gray-400 ml-2 shrink-0"></span>
                    </div>
                </template>
            </div>
        </details>

        {{-- AI Chat — V3 bude bez AI. Panel je zatím jen SKRYTÝ; v budoucnu určeno k VYMAZÁNÍ
             (spolu s AI logikou v koncept-k-ui.js a AI routami/metodami V3). --}}
        {{-- AI Chat — summary + obsah --}}
        <div class="kk-section flex-1 flex flex-col min-h-0" style="display:none">
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
                                    style="background: var(--c-primary);">
                                &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </div>{{-- /Panel B --}}

    </div>{{-- /grid wrapper --}}

    {{-- ═══ PRŮVODCE IMPORTEM PŮDORYSU ═══ --}}
    {{-- Esc ruší rozdělanou akci (výřez, měření), okno se zavírá křížkem --}}
    <div x-show="impOtevren" x-cloak class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-2"
         @keydown.escape.window.prevent.stop="impEsc()">
        <div class="bg-white rounded-lg shadow-xl flex flex-col" style="width: 96vw; height: 94vh">
            {{-- Hlavička: vlevo pokyn k aktuálnímu kroku, vpravo ovládání pohledu --}}
            <div class="flex items-center justify-between gap-4 px-4 py-2.5 border-b border-gray-200">
                <div class="text-sm font-medium" :class="impKrok === 'obrys' ? 'text-green-700' : 'text-orange-700'"
                     x-text="impPokyn()"></div>

                <div class="flex items-center gap-3 shrink-0">
                    <div x-show="['meritko', 'obrys'].includes(impKrok)" class="flex items-center gap-3 text-[11px] text-gray-500">
                        <span class="flex items-center gap-1" title="Posun výkresu">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
                                <rect x="4" y="1" width="8" height="14" rx="4"/><path d="M12 1.5v5H8" fill="currentColor" opacity=".35"/>
                            </svg>
                            pravé = posun
                        </span>
                        <span class="flex items-center gap-1" title="Přiblížení ke kurzoru">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
                                <rect x="4" y="1" width="8" height="14" rx="4"/><line x1="8" y1="4" x2="8" y2="6.5"/>
                            </svg>
                            kolečko = zoom
                        </span>
                        <span class="flex items-center gap-1" title="Celý výkres">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                                <path d="M6 1H1v5M10 1h5v5M10 15h5v-5M6 15H1v-5"/>
                            </svg>
                            dvojklik = celý výkres
                        </span>
                        <span class="flex items-center gap-1" title="Zrušit poslední akci">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                                <rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.5 8h3"/>
                            </svg>
                            Esc = zpět
                        </span>
                    </div>
                    <button @click="impZavri()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
                </div>
            </div>

            {{-- Krokování — dá se vracet na hotové kroky --}}
            <div class="flex items-center gap-1 px-4 py-2 border-b border-gray-100 text-xs">
                <template x-for="(k, i) in impKroky()" :key="k">
                    <span class="flex items-center gap-1">
                        <button @click="impNaKrok(k)" :disabled="!impKrokDostupny(k)"
                                class="rounded px-2 py-1 transition"
                                :class="impKrok === k ? 'bg-orange-100 text-orange-700 font-medium'
                                    : (impKrokDostupny(k) ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed')"
                                x-text="(i + 1) + '. ' + impNazevKroku(k)"></button>
                        <span x-show="i < impKroky().length - 1" class="text-gray-300">›</span>
                    </span>
                </template>

                <button x-show="impZmereno() && impKrok !== 'soubor'" @click="impVloz()"
                        class="ml-auto rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50">
                    Jen vložit podklad
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 kk-posuvnik">
                <div x-show="impChyba" class="mb-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5" x-text="impChyba"></div>

                {{-- Krok 1: soubor (stejná plocha pro nahrání jako ve výkazu výměr) --}}
                <div x-show="impKrok === 'soubor'" class="py-2">
                    {{-- Dříve nahrané výkresy — ať se stejný soubor nenahrává pořád dokola --}}
                    <template x-if="impDrive.length > 0">
                        <div class="mb-4">
                            <div class="text-xs font-medium text-gray-500 mb-1.5">Dříve nahrané výkresy</div>
                            <div class="divide-y divide-gray-100 border border-gray-100 rounded max-h-56 overflow-y-auto kk-posuvnik">
                                <template x-for="(v, i) in impDrive" :key="v.otisk">
                                    <button @click="impPouzijDrive(v)"
                                            class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-orange-50">
                                        <span class="truncate">
                                            <span class="font-medium" x-text="v.nazev"></span>
                                            <span class="text-gray-400" x-show="v.stran > 1" x-text="' · ' + v.stran + ' stran'"></span>
                                            {{-- výkres si pamatuje měřítko i obvod → kroky se přeskočí --}}
                                            <span x-show="Object.keys(v.strany || {}).length"
                                                  class="ml-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">měřítko i obvod hotové</span>
                                        </span>
                                        <span class="shrink-0 text-gray-400"
                                              x-text="(v.velikost ? Math.round(v.velikost / 1024) + ' kB' : '')
                                                  + (v.nahrano ? ' · ' + v.nahrano.substring(0, 10) : '')"></span>
                                    </button>
                                </template>
                            </div>
                        </div>
                    </template>
                    <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed py-10 text-sm transition"
                           :class="impPretahuje ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-700'"
                           @dragover.prevent="impPretahuje = true"
                           @dragleave.prevent="impPretahuje = false"
                           @drop.prevent="impPustSoubor($event)">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
                        </svg>
                        <span>Klikni nebo přetáhni výkres půdorysu (PDF, PNG nebo JPG, max 25 MB)</span>
                        <span class="text-xs text-gray-400">Nejlépe vektorové PDF od architekta — z něj jdou rozpoznat stěny.</span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" @change="impNahrajSoubor($event)">
                    </label>
                    <p x-show="impNacitani" x-cloak class="mt-2 text-xs text-gray-500">Nahrávám…</p>

                </div>

                {{-- Krok 2: výběr strany --}}
                <div x-show="impKrok === 'strana'">
                    <div class="text-xs text-gray-500 mb-2">Vyberte stranu s půdorysem (<span x-text="impStran"></span> stran):</div>
                    <div class="grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
                        <template x-for="s in impStran" :key="s">
                            <button @click="impVyberStranu(s)" class="border border-gray-200 rounded hover:border-orange-400 p-1 text-left">
                                <img :src="impNahledUrl(s)" loading="lazy" class="w-full bg-gray-50" alt="">
                                <div class="text-[10px] text-gray-500 text-center mt-0.5" x-text="'strana ' + s"></div>
                            </button>
                        </template>
                    </div>
                    <div x-show="impNacitani" class="text-xs text-gray-400 mt-2">Připravuji stranu…</div>
                </div>

                {{-- Krok 3 a 4: měřítko s výřezem, pak obkreslení obvodu — stejný prohlížeč --}}
                <div x-show="['meritko', 'obrys'].includes(impKrok)" class="space-y-2">
                    {{-- Vedení krokem: co se po uživateli chce, plus jen ty
                         nástroje, které v daném kroku dávají smysl. --}}
                    <div class="flex items-center justify-between gap-3 flex-wrap">

                        <div class="flex items-center gap-2 text-xs">
                            {{-- akce kroku „obrys“ --}}
                            <template x-if="impKrok === 'obrys'">
                                <span class="flex items-center gap-1">
                                    <button x-show="pzObrys.length > 0" @click="pzObrysZpet()"
                                            class="rounded px-2.5 py-1 text-base text-gray-600 hover:bg-gray-200"
                                            data-tip-below="Zpět (Esc)">&#8630;</button>
                                    <button x-show="pzObrys.length > 0" @click="pzObrysZnovu()"
                                            class="rounded px-2 py-1 text-gray-600 hover:bg-gray-200">Začít znovu</button>
                                </span>
                            </template>

                            <span class="text-gray-300">|</span>
                            <button @click="pzZoomKrok(-1)" class="rounded border border-gray-200 px-1.5 py-0.5 text-gray-600 hover:bg-gray-200">&minus;</button>
                            <span class="w-10 text-center text-gray-400" x-text="pzZoomProcent() + '%'"></span>
                            <button @click="pzZoomKrok(1)" class="rounded border border-gray-200 px-1.5 py-0.5 text-gray-600 hover:bg-gray-200">+</button>
                            {{-- magnet jako ikona — zapnutý svítí barvou značky --}}
                            <button @click="pzMagnetySila = pzMagnetySila > 0 ? 0 : 100"
                                    class="rounded p-1 transition hover:bg-gray-200"
                                    :class="pzMagnetySila > 0 ? 'text-primary' : 'text-gray-400'"
                                    data-tip-below="Přichytávání ke koncům a čarám výkresu">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                     stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2.2 14V8a5.8 5.8 0 0 1 11.6 0v6"/>
                                    <path d="M5.8 14V8a2.2 2.2 0 0 1 4.4 0v6"/>
                                    <line x1="2.2" y1="11.4" x2="5.8" y2="11.4"/>
                                    <line x1="10.2" y1="11.4" x2="13.8" y2="11.4"/>
                                </svg>
                            </button>
                            <span class="text-gray-400" x-show="pzNacitamMagnety">načítám…</span>
                        </div>
                    </div>

                    {{-- Prohlížeč výkresu --}}
                    <div x-ref="pzViewport"
                         class="relative border border-gray-200 rounded overflow-hidden bg-gray-100"
                         :style="'height: calc(94vh - 230px); cursor: ' + pzKurzorStyl()"
                         @wheel.prevent="pzKolecko($event)"
                         @mousedown="pzMysDolu($event)"
                         @mousemove="pzMysPohyb($event)"
                         @mouseup="pzMysNahoru($event)"
                         @mouseleave="pzPosouvam = false; pzSnap = null"
                         @dblclick="pzDvojklik()"
                         @contextmenu.prevent>
                        <div class="absolute top-0 left-0" :style="pzStyl()">
                            <img :src="impStranaData?.obrazek" @load="pzObrazekNacten($event)" alt="" class="max-w-none select-none" draggable="false">
                        </div>

                        {{-- Výřez --}}
                        <template x-if="pzVyrezNaObrazovce()">
                            <div class="absolute border-2 border-orange-500 bg-orange-500/10 pointer-events-none"
                                 :style="'left:' + pzVyrezNaObrazovce().left + 'px; top:' + pzVyrezNaObrazovce().top + 'px; width:' + pzVyrezNaObrazovce().sirka + 'px; height:' + pzVyrezNaObrazovce().vyska + 'px'">
                                <span class="absolute -top-5 left-0 text-[10px] bg-orange-500 text-white px-1 rounded" x-text="pzVyrezPopis()"></span>
                            </div>
                        </template>

                        {{-- Měřicí čára, obrys domu a značka magnetu — kreslí se na plátno.
                             SVG tu nejde: Alpine neumí x-for uvnitř SVG (vytváří HTML elementy). --}}
                        <canvas x-ref="pzPlatno" x-effect="pzPrekresli()"
                                class="absolute inset-0 pointer-events-none"></canvas>
                    </div>

                    {{-- Obkreslení obvodu --}}
                    <div x-show="impKrok === 'obrys'" class="flex items-center gap-2 text-xs flex-wrap">
                        <span x-show="!pzObrysUzavren" class="text-gray-500">
                            Obrys uzavřete kliknutím na první bod nebo dvojklikem.
                        </span>
                        <span x-show="pzObrysUzavren" class="text-gray-600">
                            Obvod hotov: <strong x-text="pzObrys.length"></strong>
                            <span x-text="pzObrys.length === 1 ? 'roh' : (pzObrys.length < 5 ? 'rohy' : 'rohů')"></span>,
                            zastavěná plocha <strong x-text="pzObrysPlocha().toFixed(1) + ' m²'"></strong>.
                        </span>
                    </div>

                    {{-- Měření (ukáže se až po kliknutí na metr) --}}
                    <div x-show="impKrok === 'meritko' && (pzNastroj === 'kalibrace' || impZmereno())" class="flex items-center gap-2 text-xs flex-wrap">
                        <span x-show="impKalibBody.length < 2" class="text-orange-700">
                            Klikněte ve výkresu na dva body, jejichž skutečnou vzdálenost znáte (např. konce kóty).
                        </span>
                        <template x-if="impKalibBody.length === 2">
                            <span class="flex items-center gap-1">
                                <span :class="impChybiRozmer() && 'text-orange-700 font-medium'">Skutečná vzdálenost mezi body:</span>
                                <input type="number" x-model.number="impKalibMm" min="10" step="10" placeholder="např. 3000"
                                       class="w-28 rounded px-1 py-0.5 border"
                                       :class="impChybiRozmer() ? 'border-orange-500 bg-orange-50' : 'border-gray-200'">
                                <span>mm</span>
                                <button @click="impKalibZnovu()" class="text-gray-400 hover:text-gray-600 underline">změřit znovu</button>
                                <span x-show="impChybiRozmer()" class="text-orange-700">← doplňte, jinak neznáme měřítko</span>
                            </span>
                        </template>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="text-xs" :class="impMeritkoPlatne() ? 'text-gray-500' : 'text-orange-700'">
                            <template x-if="impKrok === 'meritko' && impRozmerM() && impMeritko()">
                                <span>Zadaný rozměr odpovídá měřítku <strong x-text="'1:' + impMeritko().jmenovatel"></strong>.
                                    <span x-show="!impMeritko().standard" class="text-orange-700">Není to běžné měřítko — překontrolujte zadanou vzdálenost.</span>
                                </span>
                            </template>
                            {{-- Sken/printscreen: rozměr papíru neznáme, měřítko spočítat nejde --}}
                            <template x-if="impKrok === 'meritko' && impRozmerM() && !impMeritko()">
                                <span>Celý výkres by byl <strong x-text="impRozmerM().sirka.toFixed(1)"></strong> ×
                                      <strong x-text="impRozmerM().vyska.toFixed(1)"></strong> m ve skutečnosti.</span>
                            </template>
                        </div>
                        <div class="flex gap-2">
                            <button x-show="impKrok === 'meritko'" @click="impNaObrys()" :disabled="!impMeritkoPlatne()"
                                    class="px-3 py-1.5 rounded text-white text-xs font-medium disabled:opacity-40"
                                    style="background: var(--c-primary);">
                                Obkreslit obvod domu
                            </button>
                            <button x-show="impKrok === 'obrys'" @click="impRozpoznat()"
                                    :disabled="!pzObrysUzavren || !impStranaData?.vektor"
                                    class="px-3 py-1.5 rounded text-white text-xs font-medium disabled:opacity-40"
                                    style="background: var(--c-primary);">
                                Rozpoznat vnitřní stěny
                            </button>
                        </div>
                    </div>
                </div>

                {{-- Krok 4: varianty rozpoznaných stěn --}}
                <div x-show="impKrok === 'steny'" class="space-y-3">
                    <div x-show="impStav === 'pocitam'" class="py-10 text-center text-sm text-gray-500">
                        Hledám stěny ve výkresu…
                    </div>

                    <template x-if="impStav === 'hotovo'">
                        <div class="space-y-3">
                            <div class="space-y-3">
                                <template x-for="(v, i) in impVarianty" :key="i">
                                    <button @click="impVyberVariantu(i)"
                                            class="block w-full border-2 rounded p-2 text-left transition-colors"
                                            :class="impVybrana === i ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'">
                                        <div class="flex items-center justify-between text-xs mb-1.5">
                                            <span class="font-medium"
                                                  x-text="(i + 1) + '. ' + v.osy.length + ' stěn · ' + v.delka.toFixed(0) + ' m'"></span>
                                            <span class="flex items-center gap-3">
                                                <span class="text-gray-400" x-text="v.plocha ? v.plocha.toFixed(0) + ' m² plocha' : ''"></span>
                                                {{-- potvrzení u vybrané varianty, ne až dole pod seznamem --}}
                                                <span x-show="impVybrana === i"
                                                      @click.stop="impPrevezmiSteny()"
                                                      class="px-3 py-1.5 rounded text-white text-xs font-medium cursor-pointer"
                                                      style="background: var(--c-primary);">
                                                    Převzít tuto variantu
                                                </span>
                                            </span>
                                        </div>
                                        {{-- výška podle okna, ať je celá varianta vidět naráz;
                                             rozlišení plátna se dopočítá v impNakresliNahledy() --}}
                                        <canvas :data-nahled="i"
                                                class="block w-full h-[60vh] bg-white border border-gray-100"></canvas>
                                    </button>
                                </template>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="text-[11px] text-gray-400">
                                    Rozpoznání trvalo <span x-text="impCas.toFixed(1)"></span> s.
                                    Výsledek je podklad k doúpravě — stěny pak opravíte v editoru nad výkresem.
                                </div>
                                <div class="flex gap-2">

                                </div>
                            </div>
                        </div>
                    </template>

                    <div x-show="impStav === 'chyba'" class="flex items-center justify-between">
                        <span class="text-xs text-gray-500">Zkuste jiný výřez, nebo výkres vložte jen jako podklad a obkreslete ho.</span>
                        <div class="flex gap-2">
                            <button @click="impKrok = 'meritko'" class="kk-btn text-xs">Zpět</button>
                            <button @click="impVloz()" class="kk-btn text-xs">Jen vložit podklad</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Auto-redirect na poslední otevřený koncept
if (!{{ $aktivni?->id ?? 'null' }}) {
    const lastId = localStorage.getItem('kv3_lastProjekt');
    if (lastId && !new URLSearchParams(window.location.search).has('id')) {
        window.location.href = '{{ route($trasaV3) }}?id=' + lastId;
    }
}
</script>
<link rel="stylesheet" href="/css/chat-widget.css?v=1">
<script src="/js/chat-widget.js?v=1"></script>
<script src="/js/koncept-v3/koncept-k-ui.js?v={{ filemtime(public_path('js/koncept-v3/koncept-k-ui.js')) }}"></script>
<script src="/js/koncept-v3/import-analyza.js?v={{ filemtime(public_path('js/koncept-v3/import-analyza.js')) }}"></script>
<script src="/js/koncept-v3/import-prohlizec.js?v={{ filemtime(public_path('js/koncept-v3/import-prohlizec.js')) }}"></script>
<script src="/js/koncept-v3/import-pudorysu.js?v={{ filemtime(public_path('js/koncept-v3/import-pudorysu.js')) }}"></script>
<script src="/js/koncept-v3/limit-tarifu.js?v={{ filemtime(public_path('js/koncept-v3/limit-tarifu.js')) }}"></script>
<script>
var _kkInitData = {
    // Limity tarifu (App\Support\Tarif::stav) — jen v zákaznické aplikaci, null = bez omezení
    limit: @json($limitTarifu ?? null),
    // Seznam konceptů do nabídky. Musí jít z dat (ne ze statického HTML) —
    // po přejmenování Alpine nabídku překreslí ze šablony a ručně opravený
    // text v DOM by se ztratil (ukázal by se starý název).
    koncepty: @json($koncepty->map(fn ($k) => ['id' => $k->id, 'nazev' => $k->nazev])->values()),
    projektId: {{ $aktivni?->id ?? 'null' }},
    projektNazev: @json($aktivni?->nazev ?? ''),
    projektData: @json($aktivni?->data ?? []),
    verze: {{ $aktivni?->verze ?? 0 }},
    faze: @json($aktivni?->faze ?? 'rozhovor'),
    metadata: @json($aktivni?->metadata ?? []),
    chat: @json($aktivni?->chat ?? []),
    historie: @json($aktivni?->historie ?? []),
    historieAktualni: @json($aktivni?->historie_aktualni),
    csrf: '{{ csrf_token() }}',
    routes: {
        ulozit: '{{ route($trasaV3 . ".ulozit", ":id") }}',
        aiVytvor: '{{ route($trasaV3 . ".aiVytvor") }}',
        aiUprav: '{{ route($trasaV3 . ".aiUprav", ":id") }}',
        vytvorit: '{{ route($trasaV3 . ".vytvorit") }}',
        indexK: '{{ route($trasaV3) }}',
        katastrParcela: '{{ route($trasaV3 . ".katastr.parcela") }}',
        katastrStavby: '{{ route($trasaV3 . ".katastr.stavby") }}',
        katastrOkolni: '{{ route($trasaV3 . ".katastr.okolni") }}',
        katastrVyskovy: '{{ route($trasaV3 . ".katastr.vyskovy") }}',
        katastrSousednost: '{{ route($trasaV3 . ".katastr.sousednost") }}',
        katastrUlozit: '{{ route($trasaV3 . ".katastr.ulozit", ":id") }}',
        vysvetleni: '{{ route($trasaV3 . ".vysvetleni") }}',
        smazat: '{{ route($trasaV3 . ".smazat", ":id") }}',
        // Import půdorysu — podklad
        podkladNahrat: '{{ route($trasaV3 . ".podklad.nahrat") }}',
        podkladSeznam: '{{ route($trasaV3 . ".podklad.seznam") }}',
        podkladStrana: '{{ route($trasaV3 . ".podklad.strana", ":otisk") }}',
        podkladNastaveni: '{{ route($trasaV3 . ".podklad.nastaveni", ":otisk") }}',
        // Adresy obrázku podkladu relativně — ukládají se do konceptu a s hostem
        // by po přesunu na jinou (sub)doménu přestaly fungovat (viz podkladAdresy)
        podkladNahled: '{{ route($trasaV3 . ".podklad.nahled", [":otisk", ":strana"], false) }}',
        podkladObrazek: '{{ route($trasaV3 . ".podklad.obrazek", [":otisk", ":strana", ":dpi"], false) }}',
        podkladVektor: '{{ route($trasaV3 . ".podklad.vektor", [":otisk", ":strana"], false) }}',
    },
    // verze analyzátoru — worker si ji přidá do adresy, aby nebral starou verzi z cache
    {{-- verze pro cache: nejnovější ze VŠECH souborů importu, ne jen analyzátoru —
         jinak se změna ve workeru neprojeví a prohlížeč podává starou kopii --}}
    verzeImportu: '{{ max(
        filemtime(public_path("js/koncept-v3/import-analyza.js")),
        filemtime(public_path("js/koncept-v3/import-worker.js")),
    ) }}',
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
            // Magnety a náhledy napojení v barvě značky (dřív zelené). Plátno CSS
            // proměnné nezná — čte se jejich hodnota.
            var cssMagnetu = getComputedStyle(document.documentElement);
            var barvaMagnetu = cssMagnetu.getPropertyValue('--c-primary').trim();
            var barvaMagnetuTmava = cssMagnetu.getPropertyValue('--c-primary-text').trim();
            // Náhled přichycení (barva značky). Pro napojení „I" vede po čele hostitele
            // (kratičká úsečka), jinak po ose stěny, na kterou se konec chytá.
            var caraMagnetu = function (body, bod, koncoveZarazky, usek) {
                var mer = (ctx.stage && ctx.stage.scaleX()) || 1;
                dofLayer.add(new Konva.Line({ listening: false,
                    points: body,
                    stroke: barvaMagnetu, strokeWidth: 2 / mer, dash: [6 / mer, 4 / mer], opacity: 0.9,
                }));
                if (bod) {
                    dofLayer.add(new Konva.Circle({
                        listening: false,
                        x: bod.x, y: bod.y,
                        // v kresebných pixelech kolečko při přiblížení narostlo tak,
                        // že zakrylo celý spoj — držíme ho na stálé velikosti
                        radius: 8 / mer, fill: barvaMagnetu, opacity: 0.4,
                        stroke: barvaMagnetuTmava, strokeWidth: 2 / mer,
                    }));
                }
                // U čela je přerušovaná čára jen orientační (vede přes celou tloušťku
                // stěny, ať je spoj vidět). Přichytit se dá na kratší úsek uvnitř —
                // ten se kreslí plně, aby bylo poznat, kam až stěna smí.
                var zar = body;
                if (usek) {
                    zar = [usek.a.x, usek.a.y, usek.b.x, usek.b.y];
                    dofLayer.add(new Konva.Line({ listening: false,
                        points: zar,
                        stroke: barvaMagnetu, strokeWidth: 4 / mer, opacity: 0.95, lineCap: 'round',
                    }));
                }
                // Krátká vodicí čára (čelo stěny) by sama o sobě zanikla —
                // zarážky na koncích ukážou, kam až lze posunout (líc).
                if (koncoveZarazky) {
                    var dx = zar[2] - zar[0], dy = zar[3] - zar[1];
                    var L = Math.hypot(dx, dy) || 1;
                    if (L < 0.001) { dx = body[2] - body[0]; dy = body[3] - body[1]; L = Math.hypot(dx, dy) || 1; }
                    var kx = (-dy / L) * (5 / mer), ky = (dx / L) * (5 / mer);
                    [[zar[0], zar[1]], [zar[2], zar[3]]].forEach(function (p) {
                        dofLayer.add(new Konva.Line({ listening: false,
                            points: [p[0] - kx, p[1] - ky, p[0] + kx, p[1] + ky],
                            stroke: barvaMagnetu, strokeWidth: 2 / mer, opacity: 0.9,
                        }));
                    });
                }
            };
            if (ctx._snapPreview) {
                var sp = ctx._snapPreview;
                if (sp.line) {
                    // Čára vede přesně tudy, kam konec sedne: po čele hostitele
                    // (napojení „I"), po jeho líci (okraj), nebo po jeho ose (střih).
                    var spCara = sp.zobrazLine || sp.line;   // u čela celá šířka stěny
                    caraMagnetu([spCara.a.x, spCara.a.y, spCara.b.x, spCara.b.y], sp.point, !!sp.cela,
                        sp.zobrazLine ? sp.line : null);
                } else if (sp.wall) {
                    var hostA = ctx.engine.nodes.get(sp.wall.nodeA);
                    var hostB = ctx.engine.nodes.get(sp.wall.nodeB);
                    if (hostA && hostB) caraMagnetu([hostA.x, hostA.y, hostB.x, hostB.y], sp.point);
                }
                // Nůžky u bodu říkají, že puštění hostitele rozstřihne
                if (sp.rezim === 'strih' && sp.point) {
                    var merStrih = (ctx.stage && ctx.stage.scaleX()) || 1;
                    dofLayer.add(new Konva.Text({ listening: false,
                        x: sp.point.x - 38 / merStrih, y: sp.point.y - 34 / merStrih,
                        text: '\u2702', fontSize: 24 / merStrih, fill: barvaMagnetu,
                    }));
                }
            }

            // Vodítka zarovnání: tečkovaně v barvě značky od rohu, se kterým se tažený
            // konec srovnal (v prodloužení jeho stěny nebo napříč), kroužek na rohu.
            if (ctx.isDraggingNode && ctx._voditkaZobraz) {
                var merV = (ctx.stage && ctx.stage.scaleX()) || 1;
                ctx._voditkaZobraz.forEach(function (g) {
                    var dx = g.k.x - g.od.x, dy = g.k.y - g.od.y, dl = Math.hypot(dx, dy) || 1;
                    var pres = 24 / merV;   // kousek za konec, ať je vidět, že čára jde skrz
                    dofLayer.add(new Konva.Line({ listening: false,
                        points: [g.od.x, g.od.y, g.k.x + dx / dl * pres, g.k.y + dy / dl * pres],
                        stroke: barvaMagnetu, strokeWidth: 1.2 / merV, dash: [2 / merV, 4 / merV], lineCap: 'round',
                    }));
                    dofLayer.add(new Konva.Circle({ listening: false, x: g.od.x, y: g.od.y,
                        radius: 4 / merV, stroke: barvaMagnetu, strokeWidth: 1.2 / merV }));
                });
            }
            // Vodicí osa zachyceného úhlu: kudy stěna povede — čárkovaně v barvě
            // úhlu, od vzdáleného konce přes tažený bod až za okraj plátna.
            if (ctx.isDraggingNode && ctx._osaUhlu) {
                var merO = (ctx.stage && ctx.stage.scaleX()) || 1;
                var o = ctx._osaUhlu, odx = o.k.x - o.od.x, ody = o.k.y - o.od.y, ol = Math.hypot(odx, ody);
                if (ol > 1) {
                    var dal = Math.max(ctx.stage.width(), ctx.stage.height()) / merO;
                    dofLayer.add(new Konva.Line({ listening: false,
                        points: [o.od.x, o.od.y, o.k.x + odx / ol * dal, o.k.y + ody / ol * dal],
                        stroke: barvaMagnetu,
                        strokeWidth: 1 / merO, dash: [8 / merO, 5 / merO], opacity: 0.7,
                    }));
                }
            }

            // Hotové napojení „I": čára po čele se ukáže i při posouvání
            // hotové stěny, ať je vidět, kam až se smí a kde je líc.
            if (ctx.isDraggingNode && ctx.draggingNodeId) {
                var cDrag = ctx.engine.getNodeMovementConstraint(ctx.draggingNodeId);
                if (cDrag && cDrag.type === 'slide' && cDrag.cela && cDrag.line) {
                    var nDrag = ctx.engine.nodes.get(ctx.draggingNodeId);
                    var caraDrag = cDrag.zobrazLine || cDrag.line;   // celá šířka čela
                    caraMagnetu(
                        [caraDrag.a.x, caraDrag.a.y, caraDrag.b.x, caraDrag.b.y],
                        nDrag ? { x: nDrag.x, y: nDrag.y } : null,
                        true,
                        cDrag.zobrazLine ? cDrag.line : null
                    );
                }
            }
            var selNodes = ctx.renderer.selectedNodes;
            var selWalls = ctx.renderer.selectedWalls;
            var anyNodeSel = selNodes && selNodes.size > 0;
            var anyWallSel = selWalls && selWalls.size > 0;
            // Rozkreslený úsek stěny má úhelník i bez označené stěny
            var kresliSe = !!(ctx.kreslimStenu && ctx._stenaUsekId && ctx.engine.walls.get(ctx._stenaUsekId));
            if (!anyNodeSel && !anyWallSel && !kresliSe) { dofLayer.listening(false); dofLayer.batchDraw(); return; }
            var scale = (ctx.stage && ctx.stage.scaleX()) || 1;
            // Barvy úhlů ze značky. Plátno CSS proměnné nezná — čte se jejich hodnota.
            var cssZnacky = getComputedStyle(document.documentElement);
            var barvaUhlu = cssZnacky.getPropertyValue('--c-primary').trim();
            var barvaPopisku = cssZnacky.getPropertyValue('--c-primary-text').trim();

            // ─── Indikátory na vybraných uzlech (frozen, slide, detach buttons) ───
            if (anyNodeSel) selNodes.forEach(function (nodeId) {
                var node = ctx.engine.nodes.get(nodeId);
                if (!node) return;
                var c = ctx.engine.getNodeMovementConstraint(nodeId);
                if (c && c.type === 'frozen') {
                    // Frozen × — malý, aby se vešel do kruhu uzlu (radius ~5 px)
                    var s = 3 / scale;
                    dofLayer.add(new Konva.Line({ listening: false, points: [node.x - s, node.y - s, node.x + s, node.y + s], stroke: '#dc2626', strokeWidth: 1.5 / scale }));
                    dofLayer.add(new Konva.Line({ listening: false, points: [node.x - s, node.y + s, node.x + s, node.y - s], stroke: '#dc2626', strokeWidth: 1.5 / scale }));
                } else if (c && c.type === 'slide') {
                    // Barva jako u přichytávání — je to táž věc: „tudy se smí posouvat"
                    var cara = c.zobrazLine || c.line;   // u čela celá šířka stěny
                    caraMagnetu(
                        [cara.a.x, cara.a.y, cara.b.x, cara.b.y],
                        null,
                        !!c.cela,       // u krátkého čela i zarážky na koncích
                        c.zobrazLine ? c.line : null
                    );
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
                            // Mezera musí být větší než dosah přichytávání (20 px
                            // obrazovky), jinak se stěna hned chytí zpátky.
                            var merMez = (ctx.stage && ctx.stage.scaleX()) || 1;
                            var ok = ctx.engine.detachWallFromNode(w.id, nodeId, (20 / merMez) + 6);
                            if (ok) {
                                // Ve výběru zůstane jen odpojená stěna. Kliknutím na
                                // roh se totiž vybraly VŠECHNY stěny v uzlu (kvůli
                                // úhlům) a tažení pak hýbalo i tou, od které jsme se
                                // právě odpojili — odpojení vypadalo jako neúčinné.
                                ctx.renderer.setSelection([w.id]);
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
            // Blok běží vždy — pomocné funkce (vykresliUhel) používá i rozkreslená
            // stěna níž; vlastní projití označených zdí je podmíněné.
            {
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
                    // Rameno = osa stěny (bod na ní + směr ven z uzlu). Vrchol úhlu se
                    // počítá z os a líců, ne z polohy uzlu — u napojení na okraj leží
                    // uzel na líci hostitele, u střihu na jeho ose; průsečík líců je
                    // v obou případech tentýž skutečný roh.
                    var rameno = function (w) {
                        var a = ctx.engine.nodes.get(w.nodeA);
                        var d = wallDirFromNode(nodeId, w);
                        return a && d ? { p: { x: a.x, y: a.y }, d: d } : null;
                    };
                    var rA = rameno(wallA), rB = rameno(wallB);
                    if (!rA || !rB) return;
                    // Zacvaknout může jen úhel u právě taženého bodu (kreslení i posun)
                    var tazeny = ctx.isDraggingNode && ctx.draggingNodeId;
                    var uTazeneho = !!tazeny && [wallA, wallB].some(function (w) { return w.nodeA === tazeny || w.nodeB === tazeny; });
                    vykresliUhel(rA, rB,
                        (wallA.tloustka || 0.1) * ctx.engine.PX_PER_M / 2,
                        (wallB.tloustka || 0.1) * ctx.engine.PX_PER_M / 2,
                        { x: node.x, y: node.y }, uTazeneho);
                };
                /**
                 * Vykreslí obloučkem úhel mezi dvěma stěnami.
                 * JEDINÉ místo, kde se úhelník kreslí — používá ho označená stěna,
                 * rozkreslená stěna i náhled přichycení při tažení.
                 *
                 * Jako na výkrese: vrchol je v ROHU LÍCŮ, oblouk opisuje celý úhel
                 * mezi nimi. U pravého úhlu je to čtvrtkruh a jeho konce jsou
                 * souběžné se stěnami, ke kterým přiléhají. (Dřív byl střed v ose
                 * a oblouk se jen ořízl na líce — konce šly šikmo, velikost se
                 * měnila s tloušťkou zdi a u napojení na okraj byl úhel odsunutý.)
                 *
                 * Velikost (poloměr 24 px, čára 2,5 px, písmo 11 px) se řídí
                 * stejným pravidlem jako kóty a označení — renderer.velikostPopisku:
                 * u příčky stejná jako u nosné zdi, při přiblížení nepřeroste,
                 * po oddálení se zmenšuje s výkresem a nečitelný úhel se nekreslí.
                 *
                 * @param ramenoA,ramenoB  {p, d} — bod na ose stěny a směr ramene od vrcholu
                 * @param halfA,halfB      poloviční tloušťky ramen v px
                 * @param zaloha           bod spoje pro stěny v přímce (osy se neprotnou)
                 * @param uTazeneho        úhel u taženého bodu — když na něj zabral magnet,
                 *                         zvýrazní se (silnější oblouk, číslo v štítku)
                 * @param pripona          text za číslem (např. „ k osám domu")
                 */
                var vykresliUhel = function (ramenoA, ramenoB, halfA, halfB, zaloha, uTazeneho, pripona) {
                    var aL = Math.hypot(ramenoA.d.x, ramenoA.d.y), bL = Math.hypot(ramenoB.d.x, ramenoB.d.y);
                    if (aL === 0 || bL === 0) return;
                    var ua = { x: ramenoA.d.x / aL, y: ramenoA.d.y / aL };
                    var ub = { x: ramenoB.d.x / bL, y: ramenoB.d.y / bL };
                    var angA = Math.atan2(ua.y, ua.x) * 180 / Math.PI;
                    var angB = Math.atan2(ub.y, ub.x) * 180 / Math.PI;
                    var diff = angB - angA;
                    while (diff > 180) diff -= 360;
                    while (diff < -180) diff += 360;
                    var absDiff = Math.abs(diff);
                    if (absDiff < 1) return;
                    // Oblouk jde po směru hodinových ručiček (plátno má +y dolů) od ramene,
                    // od kterého je to k druhému kratší cestou.
                    var start = diff > 0 ? angA : angB;

                    // Líc, který svírá úhel = osa posunutá o půl tloušťky k druhému rameni.
                    var lic = function (rameno, u, half, k) {
                        var n = { x: -u.y, y: u.x };
                        if (n.x * k.x + n.y * k.y < 0) { n.x = -n.x; n.y = -n.y; }
                        return { x: rameno.p.x + n.x * half, y: rameno.p.y + n.y * half };
                    };
                    var det = ua.x * ub.y - ua.y * ub.x;
                    var V;
                    if (Math.abs(det) > 1e-6) {
                        var fA = lic(ramenoA, ua, halfA, ub);
                        var fB = lic(ramenoB, ub, halfB, ua);
                        var t = ((fB.x - fA.x) * ub.y - (fB.y - fA.y) * ub.x) / det;
                        V = { x: fA.x + ua.x * t, y: fA.y + ua.y * t };
                    } else if (zaloha) {
                        // Stěny v přímce: vrchol na společném líci na straně oblouku.
                        var s = (start + 90) * Math.PI / 180;
                        V = { x: zaloha.x + Math.cos(s) * halfA, y: zaloha.y + Math.sin(s) * halfA };
                    } else {
                        return;
                    }

                    if (!ctx.renderer.citelnePismo(11)) return;
                    var v = function (px) { return ctx.renderer.velikostPopisku(px); };
                    var R = v(24);
                    // Zacvaknutý úhel: magnet právě drží tažený bod a úhel je jeden
                    // z magnetových (90°, 45°…) — ne třeba 87,3° k jiné stěně, když
                    // bod drží vodorovná osa.
                    var zacvaknuto = uTazeneho && ctx._magnet && ctx._magnet.uhel
                        && ctx.MAGNET_UHLY.some(function (u) { return Math.abs(absDiff - u) < 0.05; });
                    var a0 = start * Math.PI / 180, a1 = (start + absDiff) * Math.PI / 180;
                    dofLayer.add(new Konva.Shape({ listening: false,
                        // zaoblené konce — lineCap u Konva.Arc nefunguje (kreslí uzavřený tvar)
                        sceneFunc: function (c, tvar) {
                            c.beginPath();
                            c.arc(V.x, V.y, R, a0, a1, false);
                            c.strokeShape(tvar);
                        },
                        stroke: barvaUhlu, strokeWidth: v(zacvaknuto ? 4 : 2.5), lineCap: 'round',
                    }));
                    var midAng = (start + absDiff / 2) * Math.PI / 180;
                    if (Math.abs(absDiff - 90) < 0.05) {
                        // Stavařská značka pravého úhlu — tečka uprostřed čtvrtkruhu.
                        dofLayer.add(new Konva.Circle({ listening: false,
                            x: V.x + Math.cos(midAng) * R * 0.5,
                            y: V.y + Math.sin(midAng) * R * 0.5,
                            radius: v(zacvaknuto ? 2.8 : 2.2), fill: barvaUhlu,
                        }));
                    }
                    // Desetinu ukázat jen u „nekulatého" úhlu — jinak by zaokrouhlení
                    // tvářilo 90,5° jako 90° a nešlo by poznat, že roh není pravý.
                    var txt = (Math.abs(absDiff - Math.round(absDiff)) < 0.05
                        ? Math.round(absDiff)
                        : absDiff.toFixed(1)) + '°' + (pripona || '');
                    if (zacvaknuto) {
                        // Číslo ve štítku barvy značky — „zacvaklo to“
                        var stitek = new Konva.Label({ listening: false,
                            x: V.x + Math.cos(midAng) * (R + v(13)),
                            y: V.y + Math.sin(midAng) * (R + v(13)),
                        });
                        stitek.add(new Konva.Tag({ fill: barvaUhlu, cornerRadius: v(4) }));
                        stitek.add(new Konva.Text({ text: txt, fontSize: v(11), fontStyle: 'bold',
                            fill: '#ffffff', padding: v(3) }));
                        stitek.offsetX(stitek.width() / 2);
                        stitek.offsetY(stitek.height() / 2);
                        dofLayer.add(stitek);
                        return;
                    }
                    // Bílý obrys pod písmem — čitelné i nad čárami podkladu a stěn.
                    var popisek = new Konva.Text({ listening: false,
                        x: V.x + Math.cos(midAng) * (R + v(12)),
                        y: V.y + Math.sin(midAng) * (R + v(12)),
                        text: txt,
                        fontSize: v(11),
                        fontStyle: 'bold',
                        fill: barvaPopisku,
                        stroke: '#ffffff', strokeWidth: v(3),
                        fillAfterStrokeEnabled: true,
                    });
                    popisek.offsetX(popisek.width() / 2);
                    popisek.offsetY(popisek.height() / 2);
                    dofLayer.add(popisek);
                };
                var addPair = function (nodeId, wA, wB) {
                    if (!wA || !wB || wA.id === wB.id) return;
                    var ids = [wA.id, wB.id].sort();
                    var key = nodeId + ':' + ids[0] + ':' + ids[1];
                    if (drawnPairs.has(key)) return;
                    drawnPairs.add(key);
                    drawAngleArc(nodeId, wA, wB);
                };
                if (anyWallSel) selWalls.forEach(function (wId) {
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

                // ─── Úhly rozkresleného úseku stěny ───
                // Rozkreslený úsek je normální stěna, takže se použije úplně
                // stejná cesta jako u označených zdí (addPair → drawAngleArc).
                if (kresliSe) {
                    var rozkreslena = ctx.engine.walls.get(ctx._stenaUsekId);
                    [rozkreslena.nodeA, rozkreslena.nodeB].forEach(function (nId) {
                        ctx.engine.getNodeWalls(nId).forEach(function (soused) {
                            if (soused.id !== rozkreslena.id) addPair(nId, rozkreslena, soused);
                        });
                    });
                    // Začátek napojený na stěnu (vazba, ne sdílený uzel) — úhel k ní
                    var hostZacatku = rozkreslena.odConstraint && ctx.engine.walls.get(rozkreslena.odConstraint.host);
                    if (hostZacatku) addPair(rozkreslena.nodeA, rozkreslena, hostZacatku);
                }

                // ─── Úhel k přichytávané stěně UŽ PŘI TAŽENÍ ───
                // Dokud spoj nevznikl, nebyla dvojice stěn, ke které úhel patří —
                // ukázal se až po napojení a dalším kliknutí a nedalo se mířit.
                // Kreslí se z náhledu přichycení, takže sedí na tutéž polohu,
                // kam konec po puštění sedne.
                var sp = ctx._snapPreview;
                if (sp && sp.wall && sp.point && !sp.cela && ctx.isDraggingNode && ctx.draggingNodeId) {
                    var hostW = ctx.engine.walls.get(sp.wall.id);
                    var hostA = hostW && ctx.engine.nodes.get(hostW.nodeA);
                    var hostB = hostW && ctx.engine.nodes.get(hostW.nodeB);
                    if (hostW && hostA && hostB) {
                        ctx.engine.getNodeWalls(ctx.draggingNodeId).forEach(function (tazena) {
                            if (tazena.id === hostW.id) return;
                            // Osa tažené stěny po přichycení: z jejího pevného konce do
                            // bodu, kam konec sedne (na líc u okraje, na osu u střihu).
                            var opora = ctx.engine.nodes.get(tazena.nodeA === ctx.draggingNodeId ? tazena.nodeB : tazena.nodeA);
                            if (!opora) return;
                            vykresliUhel(
                                { p: { x: hostA.x, y: hostA.y }, d: { x: hostB.x - hostA.x, y: hostB.y - hostA.y } },
                                { p: { x: opora.x, y: opora.y }, d: { x: opora.x - sp.point.x, y: opora.y - sp.point.y } },
                                (hostW.tloustka || 0.1) * ctx.engine.PX_PER_M / 2,
                                (tazena.tloustka || 0.1) * ctx.engine.PX_PER_M / 2,
                                sp.point, true);
                        });
                    }
                }
            }

            // ─── K čemu úhel zacvakl (reference magnetu) ───
            // Stěna: obrys v barvě značky. Osa domu (rastr): čárkovaná osa přes
            // začátek stěny a oblouk s popiskem. Bez toho nebylo poznat, proč
            // stěna drží zrovna tenhle úhel (Klemov W60: 135° k obrazovce).
            var refUhlu = ctx.isDraggingNode && ctx._magnet && ctx._magnet.reference;
            if (refUhlu && refUhlu.stena) {
                var polyRef = ctx.engine.getWallPolygon(refUhlu.stena);
                if (polyRef && polyRef.length) {
                    var bodyRef = [];
                    polyRef.forEach(function (b) { bodyRef.push(b.x, b.y); });
                    dofLayer.add(new Konva.Line({ listening: false, closed: true, points: bodyRef,
                        fill: barvaMagnetu, opacity: 0.18 }));
                    dofLayer.add(new Konva.Line({ listening: false, closed: true, points: bodyRef,
                        stroke: barvaMagnetu, strokeWidth: 2 / scale }));
                }
            }
            if (refUhlu && refUhlu.osa && ctx._osaUhlu) {
                var osa = refUhlu.osa, rOsy = osa.uhel * Math.PI / 180;
                var wdx = ctx._osaUhlu.k.x - osa.p.x, wdy = ctx._osaUhlu.k.y - osa.p.y;
                var smerSteny = Math.atan2(wdy, wdx);
                // ze čtyř směrů osy ten nejbližší ke stěně — od něj se úhel měří
                var smerOsy = rOsy, odchylkaOsy = 9;
                for (var kOsy = 0; kOsy < 4; kOsy++) {
                    var aOsy = rOsy + kOsy * Math.PI / 2;
                    var dOsy = Math.abs(Math.atan2(Math.sin(smerSteny - aOsy), Math.cos(smerSteny - aOsy)));
                    if (dOsy < odchylkaOsy) { odchylkaOsy = dOsy; smerOsy = aOsy; }
                }
                var dalOsy = Math.max(ctx.stage.width(), ctx.stage.height()) / scale;
                dofLayer.add(new Konva.Line({ listening: false,
                    points: [osa.p.x - Math.cos(smerOsy) * dalOsy, osa.p.y - Math.sin(smerOsy) * dalOsy,
                             osa.p.x + Math.cos(smerOsy) * dalOsy, osa.p.y + Math.sin(smerOsy) * dalOsy],
                    stroke: barvaMagnetu, strokeWidth: 1 / scale, dash: [3 / scale, 4 / scale], opacity: 0.8,
                }));
                var tazenaSt = ctx.engine.getNodeWalls(ctx.draggingNodeId)[0];
                vykresliUhel(
                    { p: { x: osa.p.x, y: osa.p.y }, d: { x: Math.cos(smerOsy), y: Math.sin(smerOsy) } },
                    { p: { x: osa.p.x, y: osa.p.y }, d: { x: wdx, y: wdy } },
                    0, ((tazenaSt && tazenaSt.tloustka) || 0.1) * ctx.engine.PX_PER_M / 2,
                    osa.p, true, osa.domu ? ' k osám domu' : ' k vodorovné');
            }

            dofLayer.listening(anyNodeSel);
            dofLayer.batchDraw();
        }
        var origRender = ctx.renderer.render.bind(ctx.renderer);
        ctx.renderer.render = function () { origRender(); redraw(); };
        // Úhly a ostatní značky mají velikost podle přiblížení — po zoomu znovu
        ctx.renderer.afterZoom = redraw;
        // Náhledy bez změny kresby (napojení začátku stěny při najetí myší)
        ctx.renderer.prekresliPrekryv = redraw;
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

</x-dynamic-component>
