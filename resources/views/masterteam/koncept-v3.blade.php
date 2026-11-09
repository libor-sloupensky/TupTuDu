@php
    // Stejný editor běží v masterteamu i v zákaznické aplikaci (app.tuptudu.com/projects/{kod}).
    // Liší se jen předponou názvů rout a layoutem — předává je Aplikace\ProjektyController.
    $trasaV3 ??= 'masterteam.koncept-v3';
    $layoutV3 ??= 'layouts.app';
@endphp
<x-dynamic-component :component="$layoutV3" :title="$titulekV3 ?? 'Koncept V3 — TupTuDu'" :fullWidth="true">

{{-- Texty pro JS musí být hned, skripty editoru je čtou při načtení. Skupiny ed_* jsou jen tady, ať je ostatní stránky nenesou. --}}
@include('partials.lokalizace-js', ['ttSkupiny' => ['ed_sablona', 'ed_ui', 'ed_dum', 'ed_kresba', 'ed_ral', 'ed_nastroje', 'ed_katalog']])

{{-- Konva.js + Three.js + StavebníEngine + Renderer — všechno self-hosted,
     aby fungovalo i v zemích, kde jsou unpkg/cdnjs/jsdelivr blokované
     (Čína, Rusko, Írán). --}}
<script src="/js/konva-9.min.js?v=9"></script>
<script src="/js/three/three.min.js?v=r128"></script>
<script src="/js/three/OrbitControls.js?v=0.128"></script>
<script src="/js/three/GLTFLoader.js?v=0.128"></script>
<script src="/js/three/meshopt_decoder.js?v=0.128"></script>
{{-- Line2 — screen-space thickness pro linky (hranice parcel apod.).
     Pořadí důležité: LineSegments2 musí být PŘED Line2 (extends). --}}
<script src="/js/three/LineSegmentsGeometry.js?v=0.128"></script>
<script src="/js/three/LineGeometry.js?v=0.128"></script>
<script src="/js/three/LineMaterial.js?v=0.128"></script>
<script src="/js/three/LineSegments2.js?v=0.128"></script>
<script src="/js/three/Line2.js?v=0.128"></script>
<script src="/js/svetlo-3d.js?v={{ filemtime(public_path('js/svetlo-3d.js')) }}"></script>
<script src="/js/teren-3d.js?v={{ filemtime(public_path('js/teren-3d.js')) }}"></script>
<script>window.KATALOG_ZAKLAD = @json(config('katalog.zaklad'));</script>
<script src="/js/katalog-3d.js?v={{ filemtime(public_path('js/katalog-3d.js')) }}"></script>
<script src="/js/koncept-v3/stavebni-engine.js?v={{ filemtime(public_path('js/koncept-v3/stavebni-engine.js')) }}"></script>
<script src="/js/koncept-v3/pudorys-icons.js?v={{ filemtime(public_path('js/koncept-v3/pudorys-icons.js')) }}"></script>
<script src="/js/koncept-v3/mistnosti.js?v={{ filemtime(public_path('js/koncept-v3/mistnosti.js')) }}"></script>
<script src="/js/koncept-v3/koty-vyberu.js?v={{ filemtime(public_path('js/koncept-v3/koty-vyberu.js')) }}"></script>
<script src="/js/koncept-v3/koty-retezce.js?v={{ filemtime(public_path('js/koncept-v3/koty-retezce.js')) }}"></script>
<script src="/js/koncept-v3/strecha.js?v={{ filemtime(public_path('js/koncept-v3/strecha.js')) }}"></script>
<script src="/js/koncept-v3/zemina.js?v={{ filemtime(public_path('js/koncept-v3/zemina.js')) }}"></script>
<script src="/js/koncept-v3/ral.js?v={{ filemtime(public_path('js/koncept-v3/ral.js')) }}"></script>
<script src="/js/koncept-v3/vyber-barvy.js?v={{ filemtime(public_path('js/koncept-v3/vyber-barvy.js')) }}"></script>
<script src="/js/koncept-v3/export-sdileni.js?v={{ filemtime(public_path('js/koncept-v3/export-sdileni.js')) }}"></script>
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
    /* Tlačítko magnetu zapulzuje, když magnet nově zabere (jako kroužek u kurzoru) */
    @keyframes kk-magnet-puls { 0% { box-shadow: 0 0 0 0 var(--c-primary); } 100% { box-shadow: 0 0 0 7px rgba(0,0,0,0); } }
    .kk-tl.kk-magnet-puls { animation: kk-magnet-puls .6s ease-out 1; }
    @media (prefers-reduced-motion: reduce) { .kk-tl.kk-magnet-puls { animation: none; } }
    .kk-skupina { display: inline-flex; align-items: stretch; height: 28px; border: 1px solid var(--c-border);
                  border-radius: 6px; background: var(--c-surface); overflow: hidden; font-size: 12px; }
    .kk-skupina > button { padding: 0 8px; color: var(--c-text-secondary); transition: color .15s, background-color .15s; }
    .kk-skupina > button:hover:not(.kk-tl-aktivni) { background: var(--c-primary-10); color: var(--c-primary); }
    .kk-skupina > button.kk-tl-aktivni { background: var(--c-primary); color: var(--c-surface); }
    .kk-skupina-dily > * + * { border-left: 1px solid var(--c-border); }
    .kk-skupina > span { display: inline-flex; align-items: center; justify-content: center; min-width: 40px;
                         color: var(--c-text-secondary); font-variant-numeric: tabular-nums; }
    .kk-oddelovac { width: 1px; height: 16px; margin: 0 4px; background: var(--c-border); }
    /* Rámeček polí a pomocné texty: WCAG 2.1 chce u ovládacích prvků kontrast 3:1 a u textu 4,5:1.
       --c-border (#e5e1dc) má proti bílé 1,3:1 a text-gray-400 2,5:1, proto v editoru gray-500 (4,8:1). */
    .kk-pole { height: 28px; border: 1px solid #6b7280; border-radius: 6px; background: var(--c-surface);
               padding: 0 6px; font-size: 12px; color: var(--c-text-secondary); }
    .kk-pole:focus { outline: none; border-color: var(--c-primary); }
    /* Úchop panelu otvoru — svislý proužek s tečkami, táhne se myší i prstem (touch-action: none) */
    .kk-panel-uchop { flex: none; width: 16px; display: flex; flex-direction: column; align-items: center;
                      color: #6b7280; background: #f3f4f6; border-right: 1px solid #e5e7eb; border-radius: 6px 0 0 6px;
                      cursor: grab; touch-action: none; user-select: none; }
    .kk-panel-uchop:active { cursor: grabbing; background: #fdf0e7; color: var(--c-primary); }
    .kk-panel-uchop > svg { margin: auto 0; }
    .kk-panel-zavrit { flex: none; width: 16px; height: 18px; display: flex; align-items: center; justify-content: center;
                       color: #6b7280; border-radius: 6px 0 0 0; cursor: pointer; }
    .kk-panel-zavrit:hover { color: var(--c-surface); background: var(--c-primary); }
    /* Panel „Podlaží a plochy": řádek = podlaží, klik přepíná, tužka rozbalí úpravy právě tohoto řádku */
    .kk-podlazi-radek { display: flex; align-items: center; gap: 6px; min-height: 28px; padding: 0 4px 0 8px; border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--c-text-secondary); }
    .kk-podlazi-radek:hover { background: var(--c-primary-10); }
    .kk-podlazi-radek.kk-aktivni { background: var(--c-primary-10); color: var(--c-primary-text); font-weight: 700; box-shadow: inset 3px 0 0 var(--c-primary); }
    .kk-podlazi-radek.kk-skryte { opacity: .45; }
    .kk-podlazi-pozor { min-width: 16px; height: 16px; padding: 0 3px; border-radius: 8px; background: var(--c-error); color: var(--c-surface); font-size: 10px; font-weight: 700; line-height: 16px; text-align: center; }
    .kk-podlazi-tuzka { flex: none; width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center; border-radius: 5px; color: #6b7280; }
    .kk-podlazi-tuzka:hover, .kk-podlazi-tuzka.kk-aktivni { background: var(--c-surface); color: var(--c-primary); }
    .kk-podlazi-uprava { margin: 2px 0 4px 8px; padding: 6px 8px; border-left: 2px solid var(--c-primary); font-size: 12px; display: flex; flex-direction: column; gap: 4px; }
    .kk-podlazi-uprava input[type=number], .kk-podlazi-uprava input[type=text] { height: 24px; margin: 0; color: var(--c-text); font-size: 12px; padding: 0 4px; border: 1px solid #6b7280; border-radius: 4px; }
    .kk-podlazi-uprava input[type=number] { flex: none; width: 4rem; }
    #kk-panel-otvoru input[type=number] { flex: none; width: 4rem; padding-left: 4px; padding-right: 2px; }
    #kk-panel-otvoru .kk-barva-vzorek button { height: auto; line-height: normal; }
    #kk-panel-otvoru label.kk-barva-posuvnik { display: flex; flex-direction: column; align-items: stretch; }
    #kk-panel-otvoru .kk-paleta-krytina { height: 22px; }
    #kk-panel-otvoru input[type=text] { height: 24px; font-size: 12px; padding: 0 4px; border: 1px solid #6b7280; border-radius: 4px; }
    .kk-kota-pole { position: absolute; z-index: 14; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 3px; padding: 2px 4px; background: var(--c-surface); border: 1.5px solid var(--c-primary); border-radius: 5px; font-size: 12px; color: var(--c-text-secondary); }
    .kk-kota-pole input { width: 4.5rem; height: 22px; margin: 0; padding: 0 4px; font-size: 12px; color: var(--c-text); border: 0; outline: none; background: transparent; }
    .kk-barva-symbol { flex: none; width: 24px; height: 24px; border-radius: 5px; border: 1px solid #6b7280; padding: 0; cursor: pointer; }
    .kk-barva-symbol[aria-expanded="true"] { outline: 2px solid var(--c-primary); outline-offset: 1px; }
    .kk-barva-nastroj { display: flex; flex-direction: column; gap: 6px; margin: 4px 0 6px; padding: 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; color: #6b7280; }
    .kk-barva-vzorek { display: grid; grid-template-columns: 1fr 2fr; height: 56px; border: 1px solid #6b7280; border-radius: 5px; overflow: hidden; }
    .kk-barva-vzorek > * { display: flex; align-items: flex-end; padding: 0 0 0 4px; border: 0; margin: 0; min-width: 0; }
    .kk-barva-vzorek span { font-size: 10px; line-height: 14px; padding: 0 4px; margin-bottom: 3px; border-radius: 3px; background: rgba(255,255,255,.85); color: #374151; }
    .kk-barva-vzorek button { cursor: pointer; }
    .kk-barva-kod { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 8px; color: var(--c-text); }
    .kk-barva-posuvnik { display: flex; flex-direction: column; gap: 2px; margin: 0; font-size: 12px; font-weight: 400; color: #6b7280; }
    .kk-barva-posuvnik > span { display: flex; justify-content: space-between; }
    .kk-barva-posuvnik output { color: var(--c-text); font-variant-numeric: tabular-nums; }
    .kk-barva-posuvnik input[type=range] { -webkit-appearance: none; appearance: none; width: 100%; height: 14px; margin: 0; padding: 0; border-radius: 7px; border: 1px solid #9ca3af; cursor: pointer; }
    .kk-barva-posuvnik input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2px solid #374151; }
    .kk-barva-posuvnik input[type=range]::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid #374151; }
    .kk-barva-posuvnik input[type=range]::-moz-range-track { background: transparent; }
    .kk-podlazi-uprava select { height: 24px; margin: 0; color: var(--c-text); font-size: 12px; padding: 0 4px; border: 1px solid #6b7280; border-radius: 4px; }
    .kk-podlazi-pole label, .kk-podlazi-pole { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 400; margin: 0; color: #6b7280; }
    .kk-dum-zprava { position: absolute; left: 50%; bottom: 40px; transform: translateX(-50%); z-index: 20; max-width: 80%; background: var(--c-text, #2a2a2a); color: var(--c-surface); border-radius: 6px; padding: 6px 12px; font-size: 12px; }
    .kk-paleta-krytina { width: 22px; height: 22px; border-radius: 4px; border: 1px solid #9ca3af; padding: 0; }
    .kk-paleta-krytina.kk-aktivni { outline: 2px solid var(--c-primary); outline-offset: 1px; }
    /* Formuláře editoru. app.css dává polím a nápisům spodní okraj pro formuláře webu; v řádku editoru
       by pole sedělo o 8 px výš než text a selecty vedle něj. Zarovnání hlídá test-formulare-ui.cjs. */
    .kk-editor input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), .kk-editor select, .kk-editor textarea, .kk-editor label { margin: 0; }
    .kk-editor input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), .kk-editor select, .kk-editor textarea { border-radius: 4px; }
    .kk-section input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), .kk-section select { height: 24px; padding-top: 0; padding-bottom: 0; font-size: 12px; }
    /* Jednotné řádky panelu otvoru: všechna pole 24 px vysoká, písmo 12 px, řádek 26 px */
    #kk-panel-otvoru { font-size: 12px; line-height: 1.2; }
    #kk-panel-otvoru input[type=number], #kk-panel-otvoru select { height: 24px; font-size: 12px; line-height: 22px; padding-top: 0; padding-bottom: 0; }
    #kk-panel-otvoru input[type=checkbox] { width: 13px; height: 13px; margin: 0; }
    /* Globální label (app.css) je tučný, blokový a s okrajem — v panelu má být jako ostatní popisky */
    #kk-panel-otvoru label { display: inline-flex; align-items: center; font-size: 12px; font-weight: 400; margin: 0; color: #6b7280; }
    #kk-panel-otvoru button { height: 24px; font-size: 12px; line-height: 22px; padding-top: 0; padding-bottom: 0; }
    #kk-panel-otvoru .flex.items-center { min-height: 26px; }
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
</style>

{{-- komponenta se skládá funkcí, ne rozprostřením — jinak zmrznou gettery --}}
<div class="kk-editor" x-data="konceptV3Komponenta(_kkInitData)" x-init="init(); podkladInit()" x-cloak
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
            <span class="text-sm font-medium text-gray-700 truncate max-w-[200px]" x-text="projektNazev || preloz('ed_sablona.lista.novy_nazev')"></span>
            {{-- Na jakém podlaží se kreslí, když je panel vpravo sbalený --}}
            <span class="text-xs text-gray-500 whitespace-nowrap" x-show="seznamPodlazi.length > 1 && !rezim3d" x-cloak x-text="'· ' + nazevAktivniho"></span>
            <div class="flex-1"></div>
            {{-- Mapový podklad --}}
            @funkce('mapovy_podklad')
            <select x-model="katastrMapaPodklad"
                    @change="if (katastrParcely.length === 0 && katastrMapaPodklad !== 'zadny') { katastrMapaPodklad = 'zadny'; alert(preloz('ed_sablona.lista.nejprve_parcela')); } else { katastrZmenPodklad(); ulozitNastaveni(); }"
                    class="kk-pole">
                <option value="zadny">{{ __('ed_sablona.lista.podklad_zadny') }}</option>
                <option value="zakladni">{{ __('ed_sablona.lista.podklad_zakladni') }}</option>
                <option value="ortofoto">{{ __('ed_sablona.lista.podklad_ortofoto') }}</option>
                <option value="turisticka">{{ __('ed_sablona.lista.podklad_turisticka') }}</option>
            </select>
            @endfunkce
            {{-- 2D/3D přepínač --}}
            <div class="kk-skupina kk-skupina-dily">
                <button @click="rezim3d = false; prepni2d()" :class="!rezim3d && 'kk-tl-aktivni'">2D</button>
                <button @click="rezim3d = true; prepni3d()" :class="rezim3d && 'kk-tl-aktivni'">3D</button>
            </div>
            <button @click="undo()" data-historie-zpet :disabled="historiePozice <= 0" class="kk-tl text-base" data-tip-below="{{ __('ed_sablona.lista.zpet') }}">&#8630;</button>
            <button @click="redo()" data-historie-vpred :disabled="historiePozice >= historie.length - 1" class="kk-tl text-base" data-tip-below="{{ __('ed_sablona.lista.vpred') }}">&#8631;</button>
            <div class="kk-skupina">
                <button @click="zoomOut()" data-tip-below="{{ __('ed_sablona.lista.oddalit') }}">&minus;</button>
                <span x-text="Math.round(zoom * 100) + ' %'"></span>
                <button @click="zoomIn()" data-tip-below="{{ __('ed_sablona.lista.priblizit') }}">+</button>
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
            <button @click="prepniFullscreen()" class="kk-tl" :data-tip-below="celaObrazovka ? preloz('ed_sablona.lista.zmensit') : preloz('ed_sablona.lista.cela_obrazovka')">
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
                {{-- Rozsvícená je vždy jen jedna ikona: s otevřeným katalogem svítí Katalog místo Výběru --}}
                <button @click="nastroj = 'vyber'; panelOpen.katalog && prepniKatalog()" class="kk-tl" :class="nastroj === 'vyber' && !panelOpen.katalog && 'kk-tl-aktivni'"
                        data-tip="{{ __('ed_sablona.lista.vyber') }}">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="1" y="1" width="14" height="14" rx="1" stroke-dasharray="3 2"/>
                    </svg>
                </button>
                {{-- Posun (ruka) --}}
                <button @click="nastroj = 'posun'" class="kk-tl" :class="nastroj === 'posun' && 'kk-tl-aktivni'"
                        data-tip="{{ __('ed_sablona.lista.posun') }}">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9V3.5a1 1 0 012 0V8.5"/>
                        <path d="M8 7.5V2.5a1 1 0 012 0V8"/>
                        <path d="M10 7.5V3.5a1 1 0 012 0V8.5"/>
                        <path d="M12 6.5a1 1 0 012 0V10a5 5 0 01-5 5H8a4.5 4.5 0 01-3.5-1.7L2.8 11a1.2 1.2 0 011.7-1.3L6 11.5"/>
                    </svg>
                </button>
                {{-- Stěna --}}
                <button @click="nastroj = 'stena'" class="kk-tl" :class="nastroj === 'stena' && 'kk-tl-aktivni'"
                        data-tip="{{ __('ed_sablona.lista.stena') }}">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="2" y1="14" x2="14" y2="2"/>
                        <line x1="1" y1="13" x2="13" y2="1"/>
                    </svg>
                </button>
                {{-- Metr --}}
                <button @click="nastroj = nastroj === 'metr' ? 'vyber' : 'metr'" class="kk-tl" :class="nastroj === 'metr' && 'kk-tl-aktivni'"
                        data-tip="{{ __('ed_sablona.lista.metr') }}">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="1" y1="15" x2="15" y2="15"/><line x1="1" y1="13" x2="1" y2="15"/><line x1="15" y1="13" x2="15" y2="15"/>
                        <line x1="4" y1="14" x2="4" y2="15"/><line x1="7" y1="14" x2="7" y2="15"/><line x1="10" y1="14" x2="10" y2="15"/><line x1="13" y1="14" x2="13" y2="15"/>
                        <text x="8" y="11" font-size="7" text-anchor="middle" fill="currentColor" stroke="none">m</text>
                    </svg>
                </button>
                {{-- Otvor --}}
                <button @click="nastroj = nastroj === 'otvor' ? 'vyber' : 'otvor'" class="kk-tl" :class="nastroj === 'otvor' && 'kk-tl-aktivni'"
                        data-tip="{{ __('ed_sablona.lista.otvor') }}">
                    {{-- zeď v řezu s proraženým otvorem --}}
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                        <line x1="1" y1="5" x2="5" y2="5"/><line x1="1" y1="11" x2="5" y2="11"/>
                        <line x1="11" y1="5" x2="15" y2="5"/><line x1="11" y1="11" x2="15" y2="11"/>
                        <line x1="5" y1="4" x2="5" y2="12"/><line x1="11" y1="4" x2="11" y2="12"/>
                    </svg>
                </button>
                {{-- Schodiště --}}
                <button @click="nastroj === 'schody' ? (nastroj = 'vyber') : zacniSchody()" class="kk-tl" :class="nastroj === 'schody' && 'kk-tl-aktivni'" data-tip="{{ __('ed_sablona.lista.schody') }}">
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M2 14h3v-3h3V8h3V5h3V2"/>
                    </svg>
                </button>
                <button @click="prepniKatalog()" class="kk-tl" :class="panelOpen.katalog && ['vyber', 'katalog'].includes(nastroj) && 'kk-tl-aktivni'" data-tip="{{ __('ed_sablona.lista.katalog') }}" data-katalog-tlacitko>
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3.5 7.5V5.5a2 2 0 0 1 2-2h5a2 2 0 0 1 2 2v2"/><path d="M1.5 9a1.5 1.5 0 0 1 3 0v1.5h7V9a1.5 1.5 0 0 1 3 0v3.5h-13z"/><path d="M3.5 12.5V14M12.5 12.5V14"/>
                    </svg>
                </button>
                {{-- Úroveň podlahy (zvýšená, snížená, bez podlahy) se nastavuje v panelu místnosti, samostatný nástroj není --}}
            </div>

            {{-- Magnet: jedno tlačítko → panel s nastavením (podle výkazu výměr; bez kolečka — Libor).
                 Zvýrazněné, dokud magnet působí; pulz při každém novém zachycení. --}}
            <div class="relative ml-1" @click.outside="magnetPanel = false">
                <button type="button" id="kk-magnet-tl" @click="magnetPanel = !magnetPanel"
                        class="kk-tl relative" :class="[(magnetPanel || magnetSila > 0) && 'kk-tl-aktivni', magnetPuls && 'kk-magnet-puls']"
                        data-tip="{{ __('ed_sablona.lista.magnet') }}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m6 15-4-4 6.75-6.77a7.79 7.79 0 0 1 11 11L13 22l-4-4 6.39-6.36a2.14 2.14 0 0 0-3-3L6 15"/><path d="m5 8 4 4"/><path d="m12 15 4 4"/>
                    </svg>
                </button>
                <div x-show="magnetPanel" x-cloak id="kk-magnet-panel"
                     class="absolute left-0 top-full z-40 mt-1 w-64 rounded-lg border border-gray-300 bg-white p-3 text-xs shadow-lg">
                    <label class="mb-2 block">
                        <span class="flex justify-between text-gray-600"><span>{{ __('ed_sablona.lista.magnet_sila') }}</span><span class="tabular-nums" x-text="magnetSila === 0 ? preloz('ed_sablona.lista.vypnuto') : magnetSila + ' %'"></span></span>
                        <input type="range" min="0" max="100" step="10" x-model.number="magnetSila" @input="ulozitNastaveni()"
                               class="h-1 w-full cursor-pointer" style="accent-color: var(--c-primary);">
                    </label>
                    <label class="flex items-center gap-2 text-gray-600 mb-1">
                        <input type="checkbox" x-model="magnetUhly" @change="ulozitNastaveni()" style="accent-color: var(--c-primary);">
                        {{ __('ed_sablona.lista.magnet_uhly') }}
                    </label>
                    <label class="flex items-center gap-2 text-gray-600 mb-1">
                        <input type="checkbox" x-model="magnetVoditka" @change="ulozitNastaveni()" style="accent-color: var(--c-primary);">
                        {{ __('ed_sablona.lista.magnet_voditka') }}
                    </label>
                    <label class="flex items-center gap-2 text-gray-600">
                        <input type="checkbox" x-model="magnetBlik" @change="ulozitNastaveni()" style="accent-color: var(--c-primary);">
                        {{ __('ed_sablona.lista.magnet_blik') }}
                    </label>
                    <p class="mt-2 text-gray-500">{{ __('ed_sablona.lista.magnet_alt') }}</p>
                </div>
            </div>
            {{-- Volby stěny nejsou v liště — jsou v panelu na plátně jako volby otvoru (Libor 1. 11. 2026). --}}

            {{-- Volby otvoru nejsou v liště — jsou v panelu na plátně pod tlačítkem Otvor,
                 stejně jako vlastnosti vybraného otvoru (Libor, 1. 11. 2026). --}}
            {{-- Nápověda toggle --}}
            <button @click="napovedaOtevrena = !napovedaOtevrena"
                    class="ml-auto text-xs text-gray-500 hover:text-primary transition flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {{ __('ed_sablona.lista.napoveda') }}
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
                    <div class="font-semibold text-gray-600 mb-1">{{ __('ed_sablona.napoveda.navigace') }}</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>{{ __('ed_sablona.napoveda.kolecko') }}</strong></td><td>{{ __('ed_sablona.napoveda.zoom') }}</td></tr>
                        <tr><td><strong>6 / O</strong></td><td>{{ __('ed_sablona.napoveda.otvor_do_steny') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.prave_tah') }}</strong></td><td>{{ __('ed_sablona.napoveda.posun_platna') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.kompas') }}</strong></td><td>{{ __('ed_sablona.napoveda.kompas_tah') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.kompas_dvojklik') }}</strong></td><td>{{ __('ed_sablona.napoveda.reset_pozice') }}</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">{{ __('ed_sablona.napoveda.vyber') }}</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>{{ __('ed_sablona.napoveda.klik') }}</strong></td><td>{{ __('ed_sablona.napoveda.vybrat_prvek') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.ctrl_klik') }}</strong></td><td>{{ __('ed_sablona.napoveda.pridat_odebrat') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.tah_prazdno') }}</strong></td><td>{{ __('ed_sablona.napoveda.vyber_oblasti') }}</td></tr>
                        <tr><td><strong>Ctrl+A</strong></td><td>{{ __('ed_sablona.napoveda.vybrat_vse') }}</td></tr>
                        <tr><td><strong>Escape</strong></td><td>{{ __('ed_sablona.napoveda.zrusit_vyber') }}</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">{{ __('ed_sablona.napoveda.upravy') }}</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>R</strong></td><td>{{ __('ed_sablona.napoveda.otocit_90') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.alt_tah') }}</strong></td><td>{{ __('ed_sablona.napoveda.bez_magnetu') }}</td></tr>
                        <tr><td><strong>Delete</strong></td><td>{{ __('ed_sablona.napoveda.smazat_vybrane') }}</td></tr>
                        <tr><td><strong>Ctrl+Z</strong></td><td>{{ __('ed_sablona.napoveda.zpet') }}</td></tr>
                    </table>
                </div>
                <div>
                    <div class="font-semibold text-gray-600 mb-1">{{ __('ed_sablona.napoveda.kresleni') }}</div>
                    <table class="napoveda-tabulka" style="border-collapse:collapse">
                        <tr><td><strong>1 / 2 / 3 / 4</strong></td><td>{{ __('ed_sablona.napoveda.nastroje') }}</td></tr>
                        <tr><td><strong>Alt</strong></td><td>{{ __('ed_sablona.napoveda.alt_stena') }}</td></tr>
                        <tr><td><strong>{{ __('ed_sablona.napoveda.shift_klik') }}</strong></td><td>{{ __('ed_sablona.napoveda.rovna_cara') }}</td></tr>
                        <tr><td><strong>Ctrl+C / V / D</strong></td><td>{{ __('ed_sablona.napoveda.kopirovat') }}</td></tr>
                        <tr><td><strong>Ctrl+F</strong></td><td>{{ __('ed_sablona.napoveda.cela_obrazovka') }}</td></tr>
                    </table>
                </div>
            </div>
        </div>

        {{-- Canvas --}}
        <div id="kk-canvas-wrap" x-ref="canvasWrap" class="flex-1" style="position:relative;overflow:hidden">
            <div id="kk-container" x-ref="konvaContainer" style="position:absolute;inset:0;" x-show="!rezim3d"></div>
            <div id="kk-3d-container" x-ref="threeContainer" style="position:absolute;inset:0;" x-show="rezim3d" x-cloak></div>
            {{-- Přepsání kóty u vybrané stěny nebo otvoru: pole na místě čísla --}}
            <div class="kk-kota-pole" x-show="kotaEdit && !rezim3d" x-cloak :style="kotaEdit ? { left: kotaEdit.x + 'px', top: kotaEdit.y + 'px' } : {}" data-kota-pole>
                <input type="number" min="0" step="1" x-ref="kotaInput" title="{{ __('ed_sablona.platno.kota_tip') }}" @keydown.enter.prevent="$event.target.blur()" @keydown.escape.prevent="kotaEdit = null" @blur="kotaPotvrd($event.target.value)"><span>cm</span>
            </div>
            <div class="kk-status-row">
                <div class="kk-coords" x-text="'X: ' + kurzorX.toFixed(2) + ' Y: ' + kurzorY.toFixed(2)"></div>
                <div class="kk-3d-help" x-show="rezim3d" x-cloak>{{ __('ed_sablona.platno.napoveda_3d') }}</div>
            </div>

            {{-- Povinná atribuce Mapy.com — viditelná pokud je aktivní mapové podloží --}}
            <a x-show="katastrMapaPodklad && katastrMapaPodklad !== 'zadny' && !rezim3d"
               href="https://mapy.com/" target="_blank" rel="noopener noreferrer"
               style="position:absolute;bottom:4px;left:50%;transform:translateX(-50%);z-index:10;background:rgba(255,255,255,0.9);padding:3px 6px;border-radius:3px;pointer-events:auto;display:block">
                <img src="/img/external/mapy-com-logo.svg" alt="Mapy.com" style="height:14px;display:block">
            </a>

            {{-- Panel otvoru — na plátně v levém horním rohu (odsazení 6 px jako nahoře), úchopem vlevo
                 jde přetáhnout jinam (poloha se pamatuje), dvojklik na úchop ho vrátí. Ukazuje buď
                 volby nového otvoru (nástroj zapnutý), nebo vlastnosti výběru. --}}
            <div id="kk-panel-otvoru" x-show="rezim3d ? ['opening', 'opening_multi', 'mistnost', 'schodiste', 'katalog'].includes(inspector?.kind) : (nastroj === 'otvor' || nastroj === 'stena' || nastroj === 'schody' || nastroj === 'lico' || posunPodkladu || inspector)" x-cloak
                 class="bg-white rounded-lg shadow-md text-xs flex items-stretch"
                 :style="panelOtvoruStyl"
                 style="position:absolute;z-index:15;width:max-content;min-width:250px;max-width:min(420px,100%);border:1.5px solid var(--c-primary)">
                <div class="kk-panel-uchop" data-tip-below="{{ __('ed_sablona.platno.uchop') }}"
                     @pointerdown.prevent="panelOtvoruTahniStart($event)"
                     @pointermove="panelOtvoruTahni($event)"
                     @pointerup="panelOtvoruTahniKonec($event)"
                     @pointercancel="panelOtvoruTahniKonec($event)"
                     @dblclick.prevent="panelOtvoruReset()">
                    <button type="button" class="kk-panel-zavrit" data-kk-panel-zavrit aria-label="{{ __('projekty.panel_zavrit') }}" data-tip-below="{{ __('projekty.panel_zavrit') }}"
                            @pointerdown.stop @dblclick.stop @click.stop="panelZavri()">
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M1 1l7 7M8 1L1 8"/></svg>
                    </button>
                    <svg width="8" height="18" viewBox="0 0 8 18" fill="currentColor" aria-hidden="true">
                        <circle cx="2" cy="3" r="1.4"/><circle cx="6" cy="3" r="1.4"/>
                        <circle cx="2" cy="9" r="1.4"/><circle cx="6" cy="9" r="1.4"/>
                        <circle cx="2" cy="15" r="1.4"/><circle cx="6" cy="15" r="1.4"/>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                {{-- Nástroje domu: schody, usazení plánku, posun plánku --}}
                <template x-if="nastroj === 'schody'">
                    <div class="p-2 flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-gray-600 font-medium whitespace-nowrap">{{ __('ed_sablona.schody.nove') }}</span>
                            <select x-model="schodyTvar" class="border border-gray-500 rounded px-1 py-0.5 text-xs ml-auto">
                                <option value="prime">{{ __('ed_sablona.schody.tvar_prime') }}</option>
                                <option value="L">{{ __('ed_sablona.schody.tvar_l') }}</option>
                                <option value="U">{{ __('ed_sablona.schody.tvar_u') }}</option>
                            </select>
                        </div>
                        <div class="text-gray-500" x-text="schodyStart ? preloz('ed_sablona.schody.klepni_smer') : preloz('ed_sablona.schody.klepni_zacatek')"></div>
                    </div>
                </template>
                <template x-if="nastroj === 'lico'">
                    <div class="p-2 flex flex-col gap-1">
                        <span class="text-gray-600 font-medium">{{ __('ed_sablona.plan.usazeni') }}</span>
                        <div class="text-gray-500" x-text="licoKrok"></div>
                        <label class="flex items-center gap-1 text-gray-500" x-show="engine && engine.walls.size > 0">
                            <input type="checkbox" x-model="licoSeStenami"> {{ __('ed_sablona.plan.se_stenami') }}
                        </label>
                    </div>
                </template>
                <template x-if="posunPodkladu">
                    <div class="p-2 flex items-center gap-2">
                        <span class="text-gray-600">{{ __('ed_sablona.plan.tahni') }}</span>
                        <button type="button" @click="prepniPosunPodkladu()" class="border border-gray-500 rounded px-2 py-0.5 text-xs ml-auto hover:bg-orange-50">{{ __('ed_sablona.spolecne.hotovo') }}</button>
                    </div>
                </template>
                {{-- Nová stěna / oddělovač: typ a tloušťka (dřív v liště nástrojů) --}}
                <template x-if="nastroj === 'stena'">
                    <div class="p-2 flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-gray-600 font-medium whitespace-nowrap" x-text="stenaTyp === 'oddelovac' ? preloz('ed_sablona.stena.oddelovac') : preloz('ed_sablona.stena.nova')"></span>
                            <select x-model="stenaTyp" @change="tloustkaSteny = vychoziTloustka(stenaTyp); ulozitNastaveni()"
                                    class="border border-gray-500 rounded px-1 py-0.5 text-xs ml-auto">
                                <option value="obvodova">{{ __('ed_sablona.stena.typ_obvodova') }}</option>
                                <option value="nosna">{{ __('ed_sablona.stena.typ_nosna') }}</option>
                                <option value="pricka">{{ __('ed_sablona.stena.typ_pricka') }}</option>
                                <option value="zidka">{{ __('ed_sablona.stena.typ_zidka') }}</option>
                                <option value="plot">{{ __('ed_sablona.stena.typ_plot') }}</option>
                                {{-- Oddělovač místnosti: čára nulové tloušťky, chytá se jen na líc stěn (Libor 1. 11. 2026) --}}
                                <option value="oddelovac">{{ __('ed_sablona.stena.oddelovac') }}</option>
                            </select>
                            <template x-if="stenaTyp !== 'oddelovac'">
                                <span class="flex items-center gap-1">
                                    <span class="text-gray-500">{{ __('ed_sablona.spolecne.tloustka_zkr') }}</span>
                                    {{-- Tloušťka v cm (v enginu zůstávají metry) --}}
                                    <input type="number" min="5" max="60" step="1"
                                           :value="Math.round(tloustkaSteny * 100)"
                                           @change="tloustkaSteny = Math.min(0.6, Math.max(0.05, (parseFloat($event.target.value) || 0) / 100)); ulozitNastaveni()"
                                           @keydown.enter.prevent="$event.target.blur()"
                                           class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs">
                                    <span class="text-gray-500">cm</span>
                                </span>
                            </template>
                        </div>
                        <div class="text-gray-500" x-text="stenaTyp === 'oddelovac' ? preloz('ed_sablona.stena.klepni_oddelovac') : preloz('ed_sablona.stena.klepni_stena')"></div>
                    </div>
                </template>
                <template x-if="nastroj === 'otvor'">
                    <div class="p-2 flex flex-col gap-1">
                        <div class="flex items-center gap-2">
                            <span class="text-gray-600 font-medium whitespace-nowrap">{{ __('ed_sablona.otvor.novy') }}</span>
                            <select x-model="otvorTyp" @change="otvorSirka = { dvere: 0.9, okno: 1.2, pruchod: 0.9 }[otvorTyp] || otvorSirka; ulozitNastaveni()"
                                    class="border border-gray-500 rounded px-1 py-0.5 text-xs ml-auto">
                                {{-- Průchod tu není schválně — je mezi typy dveří v panelu vlastností --}}
                                <option value="dvere">{{ __('ed_sablona.otvor.dvere') }}</option>
                                <option value="okno">{{ __('ed_sablona.otvor.okno') }}</option>
                            </select>
                            <span class="text-gray-500">{{ __('ed_sablona.spolecne.sirka_zkr') }}</span>
                            {{-- Šířka v cm (v enginu zůstávají metry) --}}
                            <input type="number" min="40" max="300" step="5"
                                   :value="Math.round(otvorSirka * 100)"
                                   @change="otvorSirka = Math.min(3, Math.max(0.4, (parseFloat($event.target.value) || 0) / 100)); ulozitNastaveni()"
                                   @keydown.enter.prevent="$event.target.blur()"
                                   class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs">
                            <span class="text-gray-500">cm</span>
                        </div>
                        <div class="text-gray-500" x-show="!otvorZprava">{{ __('ed_sablona.otvor.klepni') }}</div>
                        <div class="text-orange-700" x-show="otvorZprava" x-cloak x-text="otvorZprava"></div>
                    </div>
                </template>
                <template x-if="nastroj !== 'otvor' && nastroj !== 'stena' && nastroj !== 'schody' && nastroj !== 'lico' && !posunPodkladu && inspector">
                    <div class="p-2 flex items-center gap-2 flex-wrap">
                        {{-- Multi-select indikátor --}}
                        <span x-show="inspector.count > 1" class="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold"
                              x-text="inspector.count + '×'"></span>

                        {{-- KUS Z KATALOGU --}}
                        <template x-if="inspector.kind === 'katalog'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="text-gray-700 font-medium" x-text="inspector.nazev"></div>
                                <div class="flex items-center gap-1">
                                    <span class="text-gray-600">{{ __('ed_sablona.katalog.rozmery') }}</span>
                                    <button type="button" @click="katalogRetez = !katalogRetez" data-katalog-retez :aria-pressed="katalogRetez" class="border border-gray-500 rounded px-1 hover:bg-gray-100"
                                            :style="katalogRetez ? 'color:var(--c-primary);border-color:var(--c-primary)' : ''"
                                            :data-tip-below="katalogRetez ? preloz('ed_sablona.katalog.retez_spojeno') : preloz('ed_sablona.katalog.retez_rozpojeno')">
                                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <path d="M6.5 9.5l3-3"/>
                                            <path d="M7 4.5l1-1a3 3 0 0 1 4.5 4.5l-1 1"/>
                                            <path d="M9 11.5l-1 1a3 3 0 0 1-4.5-4.5l1-1"/>
                                            <path x-show="!katalogRetez" d="M2 2l12 12" stroke-width="1.7"/>
                                        </svg>
                                    </button>
                                    <button type="button" x-show="inspector.zmeneno" @click="katalogPuvodni()" data-katalog-puvodni class="border border-gray-500 rounded px-2 hover:bg-gray-100 ml-auto">{{ __('ed_sablona.spolecne.puvodni') }}</button>
                                </div>
                                <template x-for="r in inspector.rozmery" :key="r.osa">
                                    <div class="flex items-center gap-1 text-gray-600" :data-katalog-rozmer="r.osa">
                                        <span style="width:52px" x-text="r.nazev"></span>
                                        <input type="number" min="1" step="1" :aria-label="preloz('ed_sablona.katalog.v_cm', { nazev: r.nazev })" class="border border-gray-500 rounded px-1 py-0.5 text-xs" style="width:56px" data-jednotka="cm"
                                               :value="r.cm" @change="katalogRozmer(r.osa, $event.target.value, 'cm')" @keydown.enter.prevent="$event.target.blur()"> cm
                                        <input type="number" min="1" step="1" :aria-label="preloz('ed_sablona.katalog.v_procentech', { nazev: r.nazev })" class="border border-gray-500 rounded px-1 py-0.5 text-xs ml-1" style="width:56px" data-jednotka="procenta"
                                               :value="r.procenta" @change="katalogRozmer(r.osa, $event.target.value, '%')" @keydown.enter.prevent="$event.target.blur()"> %
                                    </div>
                                </template>
                                <label class="flex items-center gap-1 text-gray-600" for="kk-katalog-uroven">{{ __('ed_sablona.katalog.nad_podlahou') }}
                                    <input id="kk-katalog-uroven" type="number" min="0" max="300" step="5" class="border border-gray-500 rounded px-1 py-0.5 text-xs ml-auto" style="width:56px"
                                           :value="inspector.urovenCm" @change="katalogUroven($event.target.value)" @keydown.enter.prevent="$event.target.blur()"> cm
                                </label>
                                <div class="flex items-center gap-1">
                                    <button type="button" @click="katalogOtoc()" class="border border-gray-500 rounded px-2 hover:bg-gray-100" data-katalog-otoc>{{ __('ed_sablona.spolecne.otocit_90') }}</button>
                                    <button type="button" @click="katalogKopie()" class="border border-gray-500 rounded px-2 hover:bg-gray-100" data-katalog-kopie>{{ __('ed_sablona.katalog.kopie') }}</button>
                                    {{-- Paleta potahu se rozbalí přes plochu: panel nesmí změnit výšku, jinak se plocha posune a kus pod myší uteče --}}
                                    <div x-show="inspector.barvy.length" class="relative" x-data="{ paleta: false }" @click.outside="paleta = false" data-katalog-barvy>
                                        <button type="button" @click="paleta = !paleta" :aria-expanded="paleta" class="border border-gray-500 rounded px-2 hover:bg-gray-100 flex items-center gap-1" data-katalog-paleta>
                                            <span class="rounded-full border border-gray-500" :style="'width:11px;height:11px;background:' + inspector.barvaHex"></span>{{ __('ed_sablona.katalog.barva') }}
                                        </button>
                                        <div x-show="paleta" x-cloak class="absolute z-30 left-0 mt-1 p-1.5 bg-white border border-gray-300 rounded shadow flex flex-col gap-1.5" style="width:240px">
                                            <button type="button" @click="katalogBarva(''); paleta = false" data-katalog-barva="" :aria-pressed="!inspector.barva" class="flex items-center gap-1.5 border rounded px-1.5 py-0.5 hover:bg-gray-100 self-start"
                                                    :style="!inspector.barva ? 'border-color:var(--c-primary);outline:1px solid var(--c-primary)' : 'border-color:#6b7280'">
                                                <span class="rounded-full border border-gray-500" :style="'width:14px;height:14px;background:' + inspector.puvodniCss"></span>{{ __('ed_sablona.katalog.barva_puvodni') }}
                                            </button>
                                            <div class="flex flex-wrap gap-1">
                                                <template x-for="b in inspector.barvy" :key="b.klic">
                                                    <button type="button" @click="katalogBarva(b.klic); paleta = false" :data-katalog-barva="b.klic" :aria-label="b.nazev" :aria-pressed="inspector.barva === b.klic" :data-tip-below="b.nazev"
                                                            class="rounded-full border border-gray-500" :style="'width:20px;height:20px;background:' + b.css + (inspector.barva === b.klic ? ';outline:2px solid var(--c-primary);outline-offset:1px' : '')"></button>
                                                </template>
                                            </div>
                                            <div data-katalog-vlastni x-data="vyberBarvy({ hodnota: () => inspector?.barvaHex, nastav: (hex) => katalogBarva(hex), pouzite: () => katalogPouziteBarvy() })">
                                                @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.katalog.barva_vlastni')])
                                            </div>
                                        </div>
                                    </div>
                                    <button type="button" @click="katalogSmaz()" class="border border-gray-500 rounded px-2 hover:bg-gray-100 ml-auto" data-katalog-smaz>{{ __('ed_sablona.spolecne.smazat') }}</button>
                                </div>
                            </div>
                        </template>

                        {{-- OTVORY: typ + šířka + směr otvírání + strana --}}
                        <template x-if="inspector.kind === 'opening' || inspector.kind === 'opening_multi'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-600 font-medium whitespace-nowrap" x-text="inspector.typLabel"></span>
                                    {{-- Okna mají spoustu atypických rozměrů (230, 175…), proto
                                         číslo. Dveře se vyrábějí v normové řadě, tam stačí výběr. --}}
                                    <div class="flex items-center gap-1 ml-auto">
                                        <span class="text-gray-500">{{ __('ed_sablona.spolecne.sirka_zkr') }}</span>
                                        <template x-if="inspector.typ === 'okno'">
                                            <span class="flex items-center gap-1">
                                                <input type="number" min="10" max="600" step="1"
                                                       class="w-16 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                                       :value="inspector.sirka !== null ? Math.round(inspector.sirka * 100) : ''"
                                                       @change="setOpeningSirka(parseFloat($event.target.value) / 100)"
                                                       @keydown.enter.prevent="$event.target.blur()">
                                                <span class="text-gray-500">cm</span>
                                            </span>
                                        </template>
                                        <template x-if="inspector.typ !== 'okno'">
                                            <select class="border border-gray-500 rounded px-1 py-0.5 text-xs"
                                                    @change="setOpeningSirka(parseFloat($event.target.value))"
                                                    :disabled="inspector.typ === null">
                                                <template x-if="inspector.sirka === null"><option value="" disabled selected>—</option></template>
                                                <template x-for="s in inspector.sirky" :key="s">
                                                    <option :value="s"
                                                            :selected="inspector.sirka !== null && Math.abs(s - inspector.sirka) < 0.001"
                                                            x-text="(s * 100).toFixed(0) + ' cm'"></option>
                                                </template>
                                            </select>
                                        </template>
                                        {{-- Výška a parapet otvoru hned vedle šířky — Libor 1. 11. 2026.
                                             Parapet posune celý otvor (výška zůstane); díl zvlášť jen v řádcích dílů. --}}
                                        <span class="text-gray-500 ml-1">{{ __('ed_sablona.spolecne.vyska_zkr') }}</span>
                                        <input type="number" min="30" max="400" step="1"
                                               class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                               :value="inspector.vyska !== null ? Math.round(inspector.vyska * 100) : ''"
                                               @change="setOpeningVyska(parseFloat($event.target.value) / 100)"
                                               @keydown.enter.prevent="$event.target.blur()">
                                        <span class="text-gray-500">cm</span>
                                        {{-- Parapet jen u oken; dveře, vrata a průchod ho nemají --}}
                                        <template x-if="!inspector.jeDvere">
                                            <span class="flex items-center gap-1">
                                                <span class="text-gray-500 ml-1">{{ __('ed_sablona.spolecne.parapet_zkr') }}</span>
                                                <input type="number" min="0" max="300" step="1"
                                                       class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                                       :value="inspector.parapet !== null ? Math.round(inspector.parapet * 100) : ''"
                                                       @change="setOpeningParapet(parseFloat($event.target.value) / 100)"
                                                       @keydown.enter.prevent="$event.target.blur()">
                                                <span class="text-gray-500">cm</span>
                                            </span>
                                        </template>
                                    </div>
                                </div>
                                {{-- DVEŘE / VRATA: původní nástroj — směr otvírání + dovnitř/ven (Libor 1. 11. 2026) --}}
                                <template x-if="inspector.jeDvere && inspector.dvereVolby.length > 0">
                                    <div class="flex items-center gap-2">
                                        <select class="border border-gray-500 rounded px-1 py-0.5 text-xs flex-1"
                                                @change="setDvereSmer($event.target.value)">
                                            <template x-if="inspector.dvereSmer === null"><option value="" disabled selected>—</option></template>
                                            <template x-for="v in inspector.dvereVolby" :key="v.key">
                                                <option :value="v.key" :selected="inspector.dvereSmer === v.key" x-text="v.label"></option>
                                            </template>
                                        </select>
                                        <button type="button"
                                                x-show="inspector.canFlipStrana"
                                                @click="flipOpeningStrana()"
                                                class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50 hover:border-orange-400"
                                                title="{{ __('ed_sablona.otvor.druha_strana') }}">
                                            ⇵
                                        </button>
                                    </div>
                                </template>
                                {{-- Křídla: počet dílů, každý díl si uživatel nastaví zvlášť (typ, sklopné, šířka).
                                     Žádné předvolby sestav — Libor 1. 11. 2026. --}}
                                <template x-if="inspector.maKridla && !inspector.jeDvere">
                                    <div class="flex flex-col gap-1">
                                        <div class="flex items-center gap-2">
                                            <span class="text-gray-500">{{ __('ed_sablona.otvor.dilu') }}</span>
                                            <select class="border border-gray-500 rounded px-1 py-0.5 text-xs"
                                                    @change="setPocetKridel(parseInt($event.target.value, 10))">
                                                <template x-if="inspector.pocetKridel === null"><option value="" disabled selected>—</option></template>
                                                <template x-for="n in inspector.pocetVolby" :key="n">
                                                    <option :value="n"
                                                            :selected="inspector.pocetKridel === n"
                                                            x-text="n === 0 ? preloz('ed_sablona.otvor.jen_otvor') : n"></option>
                                                </template>
                                            </select>
                                            <span class="flex-1"></span>
                                            {{-- Zrcadlení (levé ↔ pravé) je pro všechny sestavy; dovnitř/ven jen pro
                                                 otvory k podlaze — okno se otvírá vždy dovnitř (strana se určí sama). --}}
                                            <button type="button"
                                                    x-show="inspector.canZrcadlit"
                                                    @click="zrcadlitOtvor()"
                                                    class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50 hover:border-orange-400"
                                                    title="{{ __('ed_sablona.otvor.zrcadlit') }}">
                                                ⇄
                                            </button>
                                            <button type="button"
                                                    x-show="inspector.canFlipStrana"
                                                    @click="flipOpeningStrana()"
                                                    class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50 hover:border-orange-400"
                                                    title="{{ __('ed_sablona.otvor.druha_strana') }}">
                                                ⇵
                                            </button>
                                        </div>
                                        <template x-if="inspector.kridla && inspector.kridla.length > 0">
                                            <div class="flex flex-col gap-0.5">
                                                <template x-for="(k, i) in inspector.kridla" :key="i">
                                                    <div class="flex items-center gap-1">
                                                        <span class="text-gray-500 w-3" x-text="(i + 1) + '.'"></span>
                                                        {{-- Šířka dílu má smysl až od dvou dílů; u jednoho je rovna šířce otvoru --}}
                                                        <input type="number" min="20" max="300" step="1"
                                                               class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs disabled:bg-gray-100 disabled:text-gray-500"
                                                               :value="Math.round(k.sirka * 100)"
                                                               :disabled="inspector.kridla.length < 2"
                                                               @change="setKridloSirka(i, parseFloat($event.target.value) / 100)"
                                                               @keydown.enter.prevent="$event.target.blur()">
                                                        <span class="text-gray-500">cm</span>
                                                        <select class="border border-gray-500 rounded px-1 py-0.5 text-xs flex-1"
                                                                @change="setKridloTyp(i, $event.target.value)">
                                                            <template x-for="v in inspector.kridlaVolby" :key="v.key">
                                                                <option :value="v.key" :selected="k.otv === v.key" x-text="v.label"></option>
                                                            </template>
                                                        </select>
                                                        {{-- Sklopné je doplněk k typu (otevíravě-sklopné, posuvně-sklopné, pevné + sklopné = větračka) --}}
                                                        <label class="flex items-center gap-1 text-gray-500 whitespace-nowrap cursor-pointer" title="{{ __('ed_sablona.otvor.sklopne_tip') }}">
                                                            <input type="checkbox" :checked="k.sklopne" @change="setKridloSklopne(i, $event.target.checked)"> {{ __('ed_sablona.otvor.sklopne') }}
                                                        </label>
                                                        {{-- Parapet dílu jen u více dílů (dvojokno s nižším parapetem, boční díl
                                                             u francouzského okna); předvyplněný parapetem otvoru, zadává se až rozdíl --}}
                                                        <template x-if="inspector.kridla.length > 1">
                                                            <span class="flex items-center gap-1">
                                                                <input type="number" min="0" max="300" step="1"
                                                                       class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                                                       :class="Math.abs(k.parapet - inspector.parapet) > 0.001 && 'border-orange-500 bg-orange-50'"
                                                                       :value="Math.round(k.parapet * 100)"
                                                                       title="{{ __('ed_sablona.otvor.parapet_dilu_cm') }}"
                                                                       @change="setKridloParapet(i, parseFloat($event.target.value) / 100)"
                                                                       @keydown.enter.prevent="$event.target.blur()">
                                                                {{-- Popisek až za polem, jako „skl." za zaškrtávátkem (Libor) --}}
                                                                <span class="text-gray-500" title="{{ __('ed_sablona.otvor.parapet_dilu') }}">{{ __('ed_sablona.otvor.parapet_kratce') }}</span>
                                                            </span>
                                                        </template>
                                                    </div>
                                                </template>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                            </div>
                        </template>

                        {{-- SCHODIŠTĚ --}}
                        <template x-if="inspector.kind === 'schodiste'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-600 font-medium whitespace-nowrap">{{ __('ed_sablona.schody.nazev') }}</span>
                                    <span class="text-gray-500" x-text="inspector.trasa"></span>
                                </div>
                                <div class="flex items-center gap-1">
                                    <select class="border border-gray-500 rounded px-1 py-0.5 text-xs" title="{{ __('ed_sablona.schody.tvar_tip') }}" data-schody-tvar @change="setSchody('tvar', $event.target.value)">
                                        <option value="prime" :selected="inspector.tvar === 'prime'">{{ __('ed_sablona.schody.tvar_prime') }}</option>
                                        <option value="L" :selected="inspector.tvar === 'L'">{{ __('ed_sablona.schody.tvar_l') }}</option>
                                        <option value="U" :selected="inspector.tvar === 'U'">{{ __('ed_sablona.schody.tvar_u') }}</option>
                                    </select>
                                    <span class="text-gray-500 ml-1">{{ __('ed_sablona.spolecne.sirka_zkr') }}</span>
                                    <input type="number" min="60" max="250" step="5" title="{{ __('ed_sablona.schody.sirka_tip') }}" class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                           :value="Math.round(inspector.sirka * 100)" @change="setSchody('sirka', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()">
                                    <span class="text-gray-500">cm</span>
                                    <button type="button" @click="setSchody('otoc')" class="border border-gray-500 rounded px-2 py-0.5 text-xs ml-auto hover:bg-orange-50" title="{{ __('ed_sablona.spolecne.otocit_90') }}">⟳</button>
                                    <button type="button" x-show="inspector.tvar !== 'prime'" @click="setSchody('strana')" class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.schody.zrcadlit') }}">⇄</button>
                                </div>
                                <div class="text-gray-500" title="{{ __('ed_sablona.schody.vypocet_tip') }}" x-text="preloz('ed_sablona.schody.souhrn', { stupnu: prelozPocet('ed_sablona.schody.stupnu', inspector.n), vyska: Math.round(inspector.v * 1000), sirka: Math.round(inspector.b * 1000), delka: prelozCislo(inspector.delka, 2) })"></div>
                                <div class="flex items-center gap-1" title="{{ __('ed_sablona.schody.rucne_tip') }}">
                                    <span class="text-gray-500">{{ __('ed_sablona.schody.vyska_stupne') }}</span>
                                    <input type="number" min="100" max="250" step="1" data-schody="vyska" :value="Math.round(inspector.v * 1000)" @change="setSchody('vyska', parseFloat($event.target.value))" @keydown.enter.prevent="$event.target.blur()"><span class="text-gray-500">mm</span>
                                    <span class="text-gray-500 ml-2">{{ __('ed_sablona.schody.naslap') }}</span>
                                    <input type="number" min="150" max="500" step="1" data-schody="naslap" :value="Math.round(inspector.b * 1000)" @change="setSchody('naslap', parseFloat($event.target.value))" @keydown.enter.prevent="$event.target.blur()"><span class="text-gray-500">mm</span>
                                </div>
                                <template x-if="inspector.tvar !== 'prime'">
                                    <div class="flex items-center gap-1" title="{{ __('ed_sablona.schody.casti_tip') }}">
                                        <span class="text-gray-500">{{ __('ed_sablona.schody.casti') }}</span>
                                        <template x-for="(c, i) in inspector.casti" :key="i">
                                            <input type="number" min="0" step="1" :data-schody-cast="i" :value="c" @change="setSchodyCast(i, parseFloat($event.target.value))" @keydown.enter.prevent="$event.target.blur()">
                                        </template>
                                    </div>
                                </template>
                                <div data-barva-schodu x-data="vyberBarvy({ hodnota: () => inspector?.barva, nastav: (hex) => setSchody('barva', hex), nahled: (hex) => nahledBarvy3d('schody:' + inspector?.id, hex), pouzite: () => barvyJinde('schody:' + inspector?.id) })" title="{{ __('ed_sablona.schody.barva_tip') }}">
                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.barva.barva')])
                                </div>
                                <div class="text-orange-700" x-show="!inspector.pohodlne">{{ __('ed_sablona.schody.mimo_rozsah') }}</div>
                                <button type="button" @click="smazatSchody()" class="self-end border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-red-50 hover:border-red-400">{{ __('ed_sablona.spolecne.smazat') }}</button>
                            </div>
                        </template>

                        {{-- ZVÝŠENÁ PODLAHA PŘENESENÁ Z PODLAŽÍ NÍŽ, pod kterou není uzavřená místnost: odkud je, platnost
                             tady, schody. Jinak ji vypíše panel místnosti (níže). --}}
                        <template x-if="inspector.kind === 'plocha'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-600 font-medium whitespace-nowrap">{{ __('ed_sablona.plocha.zvysena') }}</span>
                                    <span class="text-gray-500 min-w-0 truncate" x-text="preloz('ed_sablona.plocha.z_podlazi', { dh: Math.round(inspector.dh * 100), domov: inspector.domov }) + (inspector.mistnost ? ' (' + inspector.mistnost + ')' : '')"></span>
                                    <button type="button" @click="schodkyNaPlochu(inspector.id)" class="ml-auto border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.plocha.schody_tip') }}">{{ __('ed_sablona.spolecne.schody') }}</button>
                                </div>
                                <label class="flex items-center gap-1 text-gray-500" title="{{ __('ed_sablona.plocha.prenos_tip') }}">
                                    <input type="checkbox" :checked="inspector.zapnuto" @change="prepniPrenos(engine.dum.aktivni, inspector.id)"> {{ __('ed_sablona.plocha.plati') }}
                                </label>
                            </div>
                        </template>

                        {{-- Nula otvoru: parapet a výška se měří od podlahy místnosti --}}
                        <template x-if="inspector.kind === 'opening' && inspector.nulaOtvoru">
                            <div class="text-gray-500 w-full" data-nula-otvoru title="{{ __('ed_sablona.otvor.nula_tip') }}"
                                 x-text="preloz('ed_sablona.otvor.nula', { rozdil: (inspector.nulaOtvoru > 0 ? '+' : '') + Math.round(inspector.nulaOtvoru * 100) })"></div>
                        </template>

                        {{-- BARVY OTVORŮ: u každého okna a dveří, ale platí pro celý dům. Jen otvor v obvodové stěně má dvě. --}}
                        <template x-if="(inspector.kind === 'opening' || inspector.kind === 'opening_multi') && barvyOtvoru(inspector.typ) && inspector.obvodovy === true">
                            <div class="flex flex-col gap-1 w-full pt-1 border-t border-gray-200" data-barvy-otvoru>
                                <div class="text-gray-500" x-text="{ okno: preloz('ed_sablona.otvor.barvy_okna'), dvere: preloz('ed_sablona.otvor.barvy_dvere'), vrata: preloz('ed_sablona.otvor.barvy_vrata') }[barvyOtvoru(inspector.typ)]"></div>
                                <div data-barva-otvoru="ven" x-data="vyberBarvy({ hodnota: () => barvaDomu(barvyOtvoru(inspector?.typ) + 'Ven'), nastav: (hex) => setBarvaDomu(barvyOtvoru(inspector?.typ) + 'Ven', hex), nahled: (hex) => nahledBarvy3d(barvyOtvoru(inspector?.typ) + 'Ven', hex), pouzite: () => barvyJinde(barvyOtvoru(inspector?.typ) + 'Ven') })">
                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.otvor.venku')])
                                </div>
                                <div data-barva-otvoru="dovnitr" x-data="vyberBarvy({ hodnota: () => barvaDomu(barvyOtvoru(inspector?.typ) + 'Dovnitr'), nastav: (hex) => setBarvaDomu(barvyOtvoru(inspector?.typ) + 'Dovnitr', hex), nahled: (hex) => nahledBarvy3d(barvyOtvoru(inspector?.typ) + 'Dovnitr', hex), pouzite: () => barvyJinde(barvyOtvoru(inspector?.typ) + 'Dovnitr') })">
                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.otvor.uvnitr')])
                                </div>
                            </div>
                        </template>
                        <template x-if="(inspector.kind === 'opening' || inspector.kind === 'opening_multi') && barvyOtvoru(inspector.typ) && inspector.obvodovy === false">
                            <div class="flex flex-col gap-1 w-full pt-1 border-t border-gray-200" data-barvy-otvoru>
                                <div class="text-gray-500" x-text="{ okno: preloz('ed_sablona.otvor.barva_okna_uvnitr'), dvere: preloz('ed_sablona.otvor.barva_dvere_vnitrni'), vrata: preloz('ed_sablona.otvor.barva_vrata_uvnitr') }[barvyOtvoru(inspector.typ)]"></div>
                                <div data-barva-otvoru="jedna" x-data="vyberBarvy({ hodnota: () => barvaDomu(barvaVnitrniho(inspector?.typ)), nastav: (hex) => setBarvaDomu(barvaVnitrniho(inspector?.typ), hex), nahled: (hex) => nahledBarvy3d(barvaVnitrniho(inspector?.typ), hex), pouzite: () => barvyJinde(barvaVnitrniho(inspector?.typ)) })">
                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.barva.barva')])
                                </div>
                            </div>
                        </template>

                        {{-- MÍSTNOST: název, podlaha ve 3D, barva v půdorysu, plocha jen pro čtení --}}
                        <template x-if="inspector.kind === 'mistnost'">
                            <div class="flex flex-col gap-1 w-full">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-600 font-medium whitespace-nowrap">{{ __('ed_sablona.mistnost.nazev') }}</span>
                                    <input type="text" maxlength="40" placeholder="{{ __('ed_sablona.spolecne.nazev') }}"
                                           class="flex-1 min-w-0 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                           :value="inspector.nazev"
                                           @change="setMistnostNazev($event.target.value)"
                                           @keydown.enter.prevent="$event.target.blur()">
                                    <span class="text-gray-500 whitespace-nowrap" x-text="inspector.plocha !== null ? prelozCislo(inspector.plocha, 1) + ' m²' : ''"></span>
                                </div>
                                <div class="kk-podlazi-pole" title="{{ __('ed_sablona.mistnost.dekor_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.mistnost.dekor') }}</span>
                                    <select class="flex-1 min-w-0 border border-gray-500 rounded px-1" data-dekor-podlahy @change="setMistnostPodlaha({ dekor: $event.target.value })">
                                        <template x-for="k in dekoryPodlahVolby" :key="k.id">
                                            <option :value="k.id" :selected="inspector.podlaha.dekor === k.id" x-text="k.nazev"></option>
                                        </template>
                                    </select></div>
                                <div data-barva-podlahy x-data="vyberBarvy({ hodnota: () => inspector?.podlaha?.barva, nastav: (hex) => setMistnostPodlaha({ barva: hex }), nahled: (hex) => nahledBarvy3d('podlaha:' + inspector?.id, hex), pouzite: () => barvyJinde('podlaha:' + inspector?.id) })">
                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.mistnost.barva_podlahy')])
                                    <button type="button" x-show="inspector.podlaha.vlastni" @click="setMistnostPodlaha({ barva: null })" class="underline text-gray-500 hover:text-primary" title="{{ __('ed_sablona.mistnost.podle_dekoru_tip') }}">{{ __('ed_sablona.mistnost.podle_dekoru') }}</button>
                                </div>
                                {{-- Úroveň podlahy: v úrovni podlaží (nic), zvýšená / snížená o cm, bez podlahy (galerie, otvor pro schody či šachtu).
                                     Podrobnosti se ukážou až po přepnutí z výchozí volby. --}}
                                <template x-if="inspector.uroven">
                                    <div class="flex flex-col gap-1">
                                        <div class="kk-podlazi-pole" title="{{ __('ed_sablona.mistnost.uroven_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.mistnost.uroven') }}</span>
                                            <select class="flex-1 min-w-0 border border-gray-500 rounded px-1" data-uroven-podlahy @change="setMistnostUroven('typ', $event.target.value)">
                                                <template x-for="t in typyPlochVolby" :key="t.id">
                                                    <option :value="t.id" :selected="inspector.uroven.typ === t.id" x-text="t.nazev"></option>
                                                </template>
                                            </select>
                                            <template x-if="inspector.uroven.typ === 'zvysena' || inspector.uroven.typ === 'snizena'">
                                                <input type="number" min="0" max="300" step="1" class="w-16" title="{{ __('ed_sablona.mistnost.rozdil_tip') }}"
                                                       :value="Math.round(Math.abs(inspector.uroven.dh) * 100)" @change="setMistnostUroven('dh', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()">
                                            </template>
                                            <span x-show="inspector.uroven.typ === 'zvysena' || inspector.uroven.typ === 'snizena'">cm</span>
                                            <button type="button" x-show="inspector.uroven.typ === 'zvysena' || inspector.uroven.typ === 'snizena'" @click="schodkyNaPlochu()" class="kk-btn" title="{{ __('ed_sablona.mistnost.schodky_tip') }}">{{ __('ed_sablona.spolecne.schody') }}</button>
                                        </div>
                                        {{-- Zvýšení se přenáší nahoru: zvedá se i strop, tedy podlaha nad ním --}}
                                        <template x-if="inspector.uroven.typ === 'zvysena' && inspector.uroven.vyssi.length > 0">
                                            <div class="flex items-center gap-1 flex-wrap">
                                                <label class="flex items-center gap-1 text-gray-500" title="{{ __('ed_sablona.mistnost.prenos_tip') }}">
                                                    <input type="checkbox" :checked="inspector.uroven.prenos" @change="setMistnostUroven('prenos', $event.target.checked)"> {{ __('ed_sablona.mistnost.prenest') }}
                                                </label>
                                                <template x-for="v in inspector.uroven.vyssi" :key="v.id">
                                                    <button type="button" class="border rounded px-1.5 text-xs" :disabled="!inspector.uroven.prenos"
                                                            :class="v.zapnuto && inspector.uroven.prenos ? 'border-orange-500 text-orange-700' : 'border-gray-400 text-gray-500'"
                                                            @click="prepniPrenos(v.id)" x-text="v.nazev"></button>
                                                </template>
                                            </div>
                                        </template>
                                        {{-- Zvýšená podlaha přenesená z podlaží níž, která zasahuje do této místnosti --}}
                                        <template x-for="z in inspector.prenesene" :key="z.id">
                                            <div class="flex items-center gap-2 text-gray-500">
                                                <span class="min-w-0 truncate" x-text="preloz('ed_sablona.mistnost.prenesena', { dh: Math.round(z.dh * 100), domov: z.domov }) + (z.mistnost ? ' (' + z.mistnost + ')' : '')"></span>
                                                <button type="button" @click="schodkyNaPlochu(z.id)" class="ml-auto border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.mistnost.schody_cast_tip') }}">{{ __('ed_sablona.spolecne.schody') }}</button>
                                                <button type="button" @click="prepniPrenos(engine.dum.aktivni, z.id)" class="border border-gray-500 rounded px-2 py-0.5 text-xs whitespace-nowrap shrink-0 hover:bg-orange-50" title="{{ __('ed_sablona.mistnost.neprenaset_tip') }}">{{ __('ed_sablona.mistnost.neprenaset') }}</button>
                                            </div>
                                        </template>
                                    </div>
                                </template>
                                <div class="flex items-center gap-1" title="{{ __('ed_sablona.mistnost.pudorys_tip') }}">
                                    <span class="text-gray-500 mr-1">{{ __('ed_sablona.mistnost.pudorys') }}</span>
                                    <template x-for="b in inspector.paleta" :key="b">
                                        <button type="button" @click="setMistnostBarva(b)"
                                                class="rounded border"
                                                :class="b === inspector.barva ? 'border-orange-500 ring-1 ring-orange-400' : 'border-gray-400'"
                                                :style="{ background: b, width: '20px', height: '20px', padding: 0 }"
                                                :title="b"></button>
                                    </template>
                                </div>
                            </div>
                        </template>

                        {{-- ODDĚLOVAČ MÍSTNOSTI: jen informace a smazání --}}
                        <template x-if="inspector.kind === 'oddelovac'">
                            <div class="flex items-center gap-2 w-full">
                                <span class="text-gray-600 font-medium whitespace-nowrap" x-text="inspector.count > 1 ? preloz('ed_sablona.stena.oddelovace') : preloz('ed_sablona.stena.oddelovac')"></span>
                                <span class="text-gray-500" x-show="inspector.delka !== null" x-text="inspector.delka !== null ? inspector.delka.toFixed(2) + ' m' : ''"></span>
                                <button type="button" @click="smazatVybraneOddelovace()"
                                        class="ml-auto border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-red-50 hover:border-red-400"
                                        title="{{ __('ed_sablona.stena.smazat_tip') }}">{{ __('ed_sablona.spolecne.smazat') }}</button>
                            </div>
                        </template>

                        {{-- STĚNY: typ (editable) + tloušťka --}}
                        <template x-if="inspector.kind === 'wall' || inspector.kind === 'wall_multi'">
                            <div class="flex items-center gap-2 w-full">
                                <select class="border border-gray-500 rounded px-1 py-0.5 text-xs font-medium"
                                        @change="setWallTyp($event.target.value)">
                                    {{-- „Různé" jen při výběru stěn různých typů, jinak v nabídce zbytečně straší --}}
                                    <template x-if="inspector.typ === null"><option value="" disabled selected>{{ __('ed_sablona.stena.ruzne') }}</option></template>
                                    <template x-for="tv in inspector.typyVolby" :key="tv.key">
                                        <option :value="tv.key"
                                                :selected="inspector.typ === tv.key"
                                                x-text="tv.label"></option>
                                    </template>
                                </select>
                                <div class="flex items-center gap-1 ml-auto">
                                    <span class="text-gray-500">{{ __('ed_sablona.spolecne.tloustka_zkr') }}</span>
                                    {{-- Volně psaná tloušťka v cm (jako šířka okna) — stěny bývají
                                         i atypické, přichytávání na normovou řadu tu překáželo. --}}
                                    <input type="number" min="2" max="100" step="1"
                                           class="w-16 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                           :value="inspector.tloustka !== null ? Math.round(inspector.tloustka * 100) : ''"
                                           :disabled="inspector.typ === null"
                                           @change="setWallTloustka(parseFloat($event.target.value) / 100, true)"
                                           @keydown.enter.prevent="$event.target.blur()">
                                    <span class="text-gray-500">cm</span>
                                    {{-- Výška: prázdné = podle podlaží --}}
                                    <span class="text-gray-500 ml-1">{{ __('ed_sablona.spolecne.vyska_zkr') }}</span>
                                    <input type="number" min="10" max="1200" step="1"
                                           class="w-14 border border-gray-500 rounded px-1 py-0.5 text-xs"
                                           :placeholder="Math.round(inspector.vyskaAuto * 100)"
                                           :value="inspector.vyskaVlastni !== null ? Math.round(inspector.vyskaVlastni * 100) : ''"
                                           @change="setWallVyska($event.target.value === '' ? 0 : parseFloat($event.target.value) / 100)"
                                           @keydown.enter.prevent="$event.target.blur()">
                                    <span class="text-gray-500">cm</span>
                                </div>
                            </div>
                        </template>
                        {{-- Nosná stěna bez podpory v podlaží pod ní: označit a nabídnout řešení, nic samo nepřesouvat --}}
                        <template x-if="inspector.kind === 'wall' && inspector.podepreni && inspector.podepreni.zajisteno">
                            <div class="flex items-center gap-1 flex-wrap w-full border-t border-gray-200 pt-1" data-stena-zajistena>
                                <span class="text-gray-500" title="{{ __('ed_sablona.stena.zajisteno_tip') }}" x-text="preloz('ed_sablona.stena.zajisteno', { delka: prelozCislo(inspector.podepreni.delka, 1) })"></span>
                                <button type="button" @click="stenaZajistena(false)" class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.stena.zrusit_zajisteni_tip') }}">{{ __('ed_sablona.stena.zrusit_zajisteni') }}</button>
                            </div>
                        </template>
                        <template x-if="inspector.kind === 'wall' && inspector.podepreni && !inspector.podepreni.zajisteno">
                            <div class="flex items-center gap-1 flex-wrap w-full border-t border-gray-200 pt-1">
                                <span style="color: var(--c-error)" title="{{ __('ed_sablona.stena.podepreni_tip') }}" x-text="inspector.podepreni.chybiZaklad ? preloz('ed_sablona.stena.chybi_zaklad', { delka: prelozCislo(inspector.podepreni.delka, 1) }) : preloz('ed_sablona.stena.nepodepreno', { delka: prelozCislo(inspector.podepreni.delka, 1), dole: inspector.podepreni.dole })"></span>
                                <button type="button" @click="stenaNaPricku()" class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.stena.na_pricku_tip') }}">{{ __('ed_sablona.stena.na_pricku') }}</button>
                                <button type="button" x-show="!inspector.podepreni.chybiZaklad" @click="pridatPodperu()" class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.stena.podpera_tip') }}">{{ __('ed_sablona.stena.podpera') }}</button>
                                <button type="button" @click="stenaZajistena(true)" data-zajistit class="border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-orange-50" title="{{ __('ed_sablona.stena.zajistit_tip') }}">{{ __('ed_sablona.stena.zajistit') }}</button>
                            </div>
                        </template>
                    </div>
                </template>
                </div>
            </div>
            <div class="kk-dum-zprava" x-show="dumZprava" x-cloak x-text="dumZprava"></div>
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
                 data-tip-below="{{ __('ed_sablona.platno.kompas') }}">
                <svg width="52" height="52" viewBox="0 0 52 52" style="margin:2px"
                     :style="'transform: rotate(' + kompasUhel + 'deg)'">
                    <text x="26" y="10" font-size="9" fill="#e53e3e" font-weight="700" text-anchor="middle">{{ __('ed_sablona.platno.kompas_sever') }}</text>
                    <text x="26" y="49" font-size="9" fill="#718096" text-anchor="middle">{{ __('ed_sablona.platno.kompas_jih') }}</text>
                    <text x="48" y="29.5" font-size="9" fill="#718096" text-anchor="middle">{{ __('ed_sablona.platno.kompas_vychod') }}</text>
                    <text x="4" y="29.5" font-size="9" fill="#718096" text-anchor="middle">{{ __('ed_sablona.platno.kompas_zapad') }}</text>
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
                        <option value="">{{ __('ed_sablona.projekt.novy_volba') }}</option>
                        <template x-for="k in koncepty" :key="k.id">
                            <option :value="k.id" x-text="k.nazev"></option>
                        </template>
                    </select>
                    {{-- Přejmenování double-click --}}
                    <button x-show="projektId" @click="zahajPreimenovaniKonceptu()"
                            class="p-0.5 text-gray-500 hover:text-gray-600"
                            title="{{ __('ed_sablona.projekt.prejmenovat') }}">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M11 1.5l3.5 3.5L5 14.5H1.5V11z"/></svg>
                    </button>
                    {{-- Smazat --}}
                    <button x-show="projektId" @click="smazatKoncept()"
                            class="p-0.5 text-gray-500 hover:text-red-500"
                            title="{{ __('ed_sablona.projekt.smazat') }}">
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
            <button @click="novyProjekt()" class="kk-btn" title="{{ __('ed_sablona.projekt.novy') }}">+</button>
        </div>

        {{-- Parcela (Katastr) --}}
        {{-- Podlaží a plochy: jediné místo pro přepínání, přidání a úpravu podlaží. Klik na řádek přepne,
             tužka rozbalí úpravy právě toho řádku, přidání je oddělené a podlaží vzniká až potvrzením. --}}
        <details class="kk-section" :open="panelOpen.plochy !== false" @toggle="panelOpen.plochy = $el.open; ulozitPanely()">
            <summary class="kk-section-hlava">
                <span>{{ __('ed_sablona.podlazi.nadpis') }}</span>
                <span x-show="seznamPodlazi.length > 1 && panelOpen.plochy === false" class="kk-pocet" x-text="nazevAktivniho"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <template x-if="panelOpen.plochy !== false">
                <div id="kk-podlazi-seznam" class="px-2 py-1.5">
                    {{-- Střecha --}}
                    <div class="kk-podlazi-radek" :class="[(rezimStrecha && !rezim3d) && 'kk-aktivni', (rezim3d && strechaPopis !== 'nastavit' && !zobrazStrechu3d) && 'kk-skryte', (rezim3d && strechaPopis !== 'nastavit' && zobrazStrechu3d) && 'kk-aktivni']"
                         data-radek="strecha" @click="prepniStrechu()" :title="strechaPopis === 'nastavit' ? preloz('ed_sablona.strecha.vytvorit') : (rezim3d ? preloz('ed_sablona.strecha.ukazat_skryt') : preloz('ed_sablona.strecha.ukazat_pudorys'))">
                        <span>{{ __('ed_sablona.strecha.nazev') }}</span>
                        <span class="ml-auto whitespace-nowrap" x-text="strechaPopisText"></span>
                        <button type="button" class="kk-podlazi-tuzka" :class="podlaziUprava === 'strecha' && 'kk-aktivni'"
                                title="{{ __('ed_sablona.strecha.upravit') }}" data-upravit="strecha" @click.stop="prepniUpravuStrechy()">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                        </button>
                    </div>
                    {{-- Nastavení střechy: typ, sklon, přesah, okap, krytina; hrany se přepínají klikem v půdorysu --}}
                    <template x-if="podlaziUprava === 'strecha' && strechaPanel">
                        <div class="kk-podlazi-uprava" data-uprava="strecha">
                            <template x-if="!strechaPanel.st">
                                <div class="flex flex-col gap-1">
                                    <span class="text-gray-500">{{ __('ed_sablona.strecha.zatim_nema') }}</span>
                                    <button type="button" @click="strechaVytvor()" class="kk-btn self-start">{{ __('ed_sablona.strecha.vytvorit') }}</button>
                                </div>
                            </template>
                            <template x-if="strechaPanel.st">
                                <div class="flex flex-col gap-1">
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.typ_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.typ') }}</span>
                                        <select class="flex-1 min-w-0" @change="setStrecha('typ', $event.target.value)">
                                            <template x-for="t in typyStrechVolby" :key="t.id">
                                                <option :value="t.id" :selected="strechaPanel.st.typ === t.id" x-text="t.nazev"></option>
                                            </template>
                                        </select>
                                        <button type="button" x-show="strechaPanel.st.typ === 'sedlova'" @click="setStrecha('otocHreben')" class="kk-btn" title="{{ __('ed_sablona.strecha.otocit_hreben') }}">⟳</button>
                                    </div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.sklon_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.sklon') }}</span>
                                        <input type="number" min="1" max="75" step="1" class="w-16" :value="strechaPanel.st.sklon" :disabled="strechaPanel.st.typ === 'plocha'"
                                               @change="setStrecha('sklon', parseFloat($event.target.value))" @keydown.enter.prevent="$event.target.blur()"><span>°</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.presah_okapu_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.presah_okapu') }}</span>
                                        <input type="number" min="0" max="300" step="5" class="w-16" :value="Math.round((strechaPanel.st.presah || 0) * 100)"
                                               @change="setStrecha('presah', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.presah_stitu_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.presah_stitu') }}</span>
                                        <input type="number" min="0" max="300" step="5" class="w-16" :value="Math.round((strechaPanel.st.presahStit || 0) * 100)"
                                               @change="setStrecha('presahStit', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.vyska_okapu_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.vyska_okapu') }}</span>
                                        <input type="number" min="0" max="1200" step="5" class="w-16" :value="Math.round(strechaPanel.zOkap * 100)"
                                               @change="setStrecha('vyskaOkapu', $event.target.value === '' ? null : parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span>
                                        <span class="ml-auto whitespace-nowrap" title="{{ __('ed_sablona.strecha.hreben_tip') }}" x-show="strechaPanel.zMax !== null" x-text="strechaPanel.zMax !== null ? preloz('ed_sablona.strecha.hreben', { vyska: prelozCislo(strechaPanel.zMax, 2) }) : ''"></span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.krytina_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.krytina') }}</span>
                                        <select class="flex-1 min-w-0" data-krytina @change="setStrecha('krytina', $event.target.value)">
                                            <template x-for="k in krytinyVolby" :key="k.id">
                                                <option :value="k.id" :selected="strechaPanel.krytina === k.id" x-text="k.nazev"></option>
                                            </template>
                                        </select></div>
                                    <div x-data="vyberBarvy({ hodnota: () => strechaPanel?.barva, nastav: (hex) => setStrecha('barva', hex), nahled: (hex) => nahledBarvyStrechy(hex), pouzite: () => barvyJinde('strecha') })">
                                        @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.barva.barva')])
                                    </div>
                                    <div class="text-gray-500" x-show="strechaPanel.bezObrysu">{{ __('ed_sablona.strecha.bez_obrysu') }}</div>
                                    {{-- Vybraná hrana: co nemá vlastní, bere z celku --}}
                                    <template x-if="strechaPanel.hrana">
                                        <div class="flex flex-col gap-1 mt-1 pt-1 border-t border-gray-200" data-hrana-panel>
                                            <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.hrana_tip') }}"><span class="w-24 shrink-0 font-semibold">{{ __('ed_sablona.strecha.hrana') }}</span>
                                                <select class="flex-1 min-w-0" @change="setHranaStrechy(strechaPanel.hrana.klic, { typ: $event.target.value })">
                                                    <option value="okap" :selected="strechaPanel.hrana.typ === 'okap'">{{ __('ed_sablona.strecha.okap_volba') }}</option>
                                                    <option value="stit" :selected="strechaPanel.hrana.typ === 'stit'">{{ __('ed_sablona.strecha.stit_volba') }}</option>
                                                </select></div>
                                            <template x-if="strechaPanel.hrana.typ === 'okap'">
                                                <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.sklon_plochy_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.sklon') }}</span>
                                                    <input type="number" min="1" max="75" step="1" class="w-16" data-hrana="sklon" :value="strechaPanel.hrana.sklon"
                                                           @change="setHranaStrechy(strechaPanel.hrana.klic, { sklon: parseFloat($event.target.value) })" @keydown.enter.prevent="$event.target.blur()"><span>°</span></div>
                                            </template>
                                            <div class="kk-podlazi-pole" :title="strechaPanel.hrana.typ === 'okap' ? preloz('ed_sablona.strecha.hrana_presah_okap_tip') : preloz('ed_sablona.strecha.hrana_presah_stit_tip')"><span class="w-24 shrink-0" data-hrana-popisek="presah" x-text="strechaPanel.hrana.typ === 'okap' ? preloz('ed_sablona.strecha.presah_okapu') : preloz('ed_sablona.strecha.presah_stitu')"></span>
                                                <input type="number" min="0" max="300" step="5" class="w-16" data-hrana="presah" :value="Math.round(strechaPanel.hrana.presah * 100)"
                                                       @change="setHranaStrechy(strechaPanel.hrana.klic, { presah: $event.target.value === '' ? null : parseFloat($event.target.value) / 100 })" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                            <template x-if="strechaPanel.hrana.typ === 'okap'">
                                                <div class="kk-podlazi-pole" title="{{ __('ed_sablona.strecha.hrana_vyska_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.strecha.vyska_okapu') }}</span>
                                                    <input type="number" min="0" max="1200" step="5" class="w-16" data-hrana="vyskaOkapu" :value="Math.round(strechaPanel.hrana.z * 100)"
                                                           @change="setHranaStrechy(strechaPanel.hrana.klic, { vyskaOkapu: $event.target.value === '' ? null : parseFloat($event.target.value) / 100 })" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                            </template>
                                            <template x-if="strechaPanel.hrana.typ === 'okap'">
                                                <div x-data="vyberBarvy({ hodnota: () => strechaPanel?.hrana?.barva || strechaPanel?.barva, nastav: (hex) => setHranaStrechy(strechaPanel.hrana.klic, { barva: hex }), nahled: (hex) => nahledBarvyStrechy(hex, strechaPanel.hrana.klic), pouzite: () => barvyJinde('hrana:' + strechaPanel?.hrana?.klic) })">
                                                    @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.barva.barva')])
                                                    <button type="button" x-show="strechaPanel.hrana.barva" @click="setHranaStrechy(strechaPanel.hrana.klic, { barva: null })" class="underline text-gray-500 hover:text-primary" title="{{ __('ed_sablona.strecha.jako_strecha_tip') }}">{{ __('ed_sablona.strecha.jako_strecha') }}</button>
                                                </div>
                                            </template>
                                            <button type="button" x-show="strechaPanel.hrana.rucne" @click="hranaJakoCelek(strechaPanel.hrana.klic)" class="self-start underline text-gray-500 hover:text-primary" title="{{ __('ed_sablona.strecha.vratit_tip') }}">{{ __('ed_sablona.strecha.vratit') }}</button>
                                        </div>
                                    </template>
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-500" x-show="!strechaPanel.hrana" x-text="rezim3d ? preloz('ed_sablona.strecha.hrany_ve_2d') : preloz('ed_sablona.strecha.klepni_hrana')"></span>
                                        <button type="button" @click="smazatStrechu()" title="{{ __('ed_sablona.strecha.smazat_tip') }}" class="ml-auto border border-gray-500 rounded px-2 py-0.5 text-xs whitespace-nowrap hover:bg-red-50 hover:border-red-400">{{ __('ed_sablona.strecha.smazat') }}</button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </template>
                    {{-- Podlaží shora dolů --}}
                    <template x-for="p in radkyPodlazi" :key="p.id">
                        <div>
                            <div class="kk-podlazi-radek" :data-radek="p.id"
                                 :class="[(p.aktivni && !rezimStrecha && !rezim3d) && 'kk-aktivni', (rezim3d && !p.viditelne3d) && 'kk-skryte', (rezim3d && p.viditelne3d) && 'kk-aktivni']"
                                 @click="naPodlazi(p.id)" :title="rezim3d ? preloz('ed_sablona.podlazi.ukazat_skryt', { nazev: p.nazev }) : preloz('ed_sablona.podlazi.prejit', { nazev: p.nazev })">
                                <span x-text="p.nazev"></span>
                                <span class="kk-podlazi-pozor" x-show="p.nepodeprene > 0 && !rezim3d" x-text="p.nepodeprene" :title="preloz('ed_sablona.podlazi.nepodeprene_tip', { pocet: p.nepodeprene })"></span>
                                <span class="ml-auto whitespace-nowrap" :title="preloz('ed_sablona.podlazi.plocha_tip', { pocet: p.pocet })" x-text="prelozCislo(p.plocha, 1) + ' m²'"></span>
                                <button type="button" class="kk-podlazi-tuzka" :class="podlaziUprava === p.id && 'kk-aktivni'"
                                        :title="preloz('ed_sablona.podlazi.upravit', { nazev: p.nazev })" :data-upravit="p.id" @click.stop="prepniUpravuPodlazi(p.id)">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
                                </button>
                            </div>
                            <div class="text-[11px] text-gray-500 pl-2 pb-0.5" x-show="p.typ === 'podkrovi' && Math.abs(p.plocha - p.zap) >= 0.05"
                                 x-text="preloz('ed_sablona.podlazi.z_toho_nad', { plocha: prelozCislo(p.zap, 1) })"></div>
                            {{-- Úpravy tohoto podlaží, ať je jasné, co se mění --}}
                            <template x-if="podlaziUprava === p.id">
                                <div class="kk-podlazi-uprava" :data-uprava="p.id">
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.podlazi.nazev_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.spolecne.nazev') }}</span>
                                        <input type="text" class="flex-1 min-w-0" maxlength="30" :value="p.nazev"
                                               @change="setPodlazi(p.id, 'nazev', $event.target.value)" @keydown.enter.prevent="$event.target.blur()"></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.podlazi.konstr_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.podlazi.konstr') }}</span>
                                        <input type="number" class="w-16" min="150" max="1200" step="1" :value="Math.round(p.vyska * 100)"
                                               @change="setPodlazi(p.id, 'vyska', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.podlazi.strop_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.podlazi.strop') }}</span>
                                        <input type="number" class="w-16" min="0" max="150" step="1" :value="Math.round(p.strop * 100)"
                                               @change="setPodlazi(p.id, 'strop', parseFloat($event.target.value) / 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.podlazi.kota_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.podlazi.kota') }}</span>
                                        <input type="number" class="w-16" step="1" :value="Math.round(p.kota * 100)" :data-kota="p.id"
                                               @change="setPodlazi(p.id, 'kota', $event.target.value === '' ? null : parseFloat($event.target.value) / 100); $event.target.value = Math.round(engine.kotaPodlazi(p.id) * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span>
                                        <button type="button" x-show="posunDomu !== 0" class="underline whitespace-nowrap hover:text-primary" title="{{ __('ed_sablona.podlazi.kota_nula_tip') }}" data-kota-nula @click="kotaNaNulu()">{{ __('ed_sablona.podlazi.kota_nula') }}</button></div>
                                    <div title="{{ __('ed_sablona.podlazi.fasada_tip') }}" data-barva-fasady
                                         x-data="vyberBarvy({ hodnota: () => barvaDomu('fasada'), nastav: (hex) => setBarvaDomu('fasada', hex), nahled: (hex) => nahledBarvy3d('fasada', hex), pouzite: () => barvyJinde('fasada') })">
                                        @include('partials.vyber-barvy', ['popisek' => __('ed_sablona.podlazi.barva_domu')])
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <span class="text-gray-500" title="{{ __('ed_sablona.podlazi.svetla_tip') }}" x-text="preloz('ed_sablona.podlazi.svetla', { vyska: prelozCislo(p.svetla, 2) })"></span>
                                        <button type="button" x-show="seznamPodlazi.length > 1" @click="smazatPodlazi(p.id)" title="{{ __('ed_sablona.podlazi.smazat_tip') }}"
                                                class="ml-auto border border-gray-500 rounded px-2 py-0.5 text-xs hover:bg-red-50 hover:border-red-400" x-text="preloz('ed_sablona.podlazi.smazat', { nazev: p.nazev })"></button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </template>
                    {{-- Základy: jen s parcelou, patří pod nejnižší podlaží. Nejsou to podlaží, odvozují se ze stěn. --}}
                    <template x-if="maZaklady">
                        <div>
                            <div class="kk-podlazi-radek" data-radek="zaklady" @click="prepniUpravuPodlazi('zaklady')" title="{{ __('ed_sablona.zaklady.radek_tip') }}">
                                <span>{{ __('ed_sablona.zaklady.nazev') }}</span>
                                <span class="ml-auto whitespace-nowrap" x-text="zakladyPopis"></span>
                                <button type="button" class="kk-podlazi-tuzka" :class="podlaziUprava === 'zaklady' && 'kk-aktivni'" title="{{ __('ed_sablona.zaklady.upravit') }}" data-upravit="zaklady" @click.stop="prepniUpravuPodlazi('zaklady')">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                                </button>
                            </div>
                            <template x-if="podlaziUprava === 'zaklady'">
                                <div class="flex flex-col gap-1 px-2 py-1.5 text-xs" data-zaklady-panel>
                                    <div x-show="zakladyChybi" style="color: var(--c-error)" data-zaklady-chybi x-text="zakladyChybi"></div>
                                    <template x-for="c in zemina?.casti || []" :key="c.id">
                                        <div class="kk-podlazi-pole" :title="preloz('ed_sablona.zaklady.cast_tip', { nazev: c.nazev, plocha: prelozCislo(c.plocha, 1) })"><span class="w-24 shrink-0" x-text="preloz('ed_sablona.zaklady.pod', { nazev: c.nazev })"></span>
                                            <select class="flex-1 min-w-0" :data-zaklad-typ="c.id" @change="setTypZakladu(c.id, $event.target.value)">
                                                <option value="pasy" :selected="c.typ === 'pasy'">{{ __('ed_sablona.zaklady.pasy') }}</option>
                                                <option value="deska" :selected="c.typ === 'deska'">{{ __('ed_sablona.zaklady.deska') }}</option>
                                                <option value="stavajici" :selected="c.typ === 'stavajici'">{{ __('ed_sablona.zaklady.stavajici') }}</option>
                                            </select></div>
                                    </template>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.nad_terenem_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.nad_terenem') }}</span>
                                        <input type="number" min="-500" max="500" step="5" class="w-16" data-zaklad="nadTerenem" :value="Math.round(posunDomu * 100)"
                                               @change="setNadTerenem(parseFloat($event.target.value) / 100); $event.target.value = Math.round(posunDomu * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.odkop_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.odkop') }}</span>
                                        <input type="number" min="0" max="300" step="10" class="w-16" data-zaklad="odkop" :value="Math.round(zakladyHodnota('odkop') * 100)"
                                               @change="setZaklady('odkop', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('odkop') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.sirka_pasu_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.sirka_pasu') }}</span>
                                        <input type="number" min="20" max="200" step="5" class="w-16" data-zaklad="sirkaPasu" :value="Math.round(zakladyHodnota('sirkaPasu') * 100)"
                                               @change="setZaklady('sirkaPasu', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('sirkaPasu') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.spara_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.spara') }}</span>
                                        <input type="number" min="40" max="300" step="5" class="w-16" data-zaklad="spara" :value="Math.round(zakladyHodnota('spara') * 100)"
                                               @change="setZaklady('spara', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('spara') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                    <label class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.prodlouzit_tip') }}"><input type="checkbox" data-zaklad-volba="prodlouzit" :checked="zakladyHodnota('prodlouzit')" @change="setVolbuZakladu('prodlouzit', $event.target.checked)"><span>{{ __('ed_sablona.zaklady.prodlouzit') }}</span></label>
                                    <div x-show="zakladNadTerenemPopis" class="text-gray-500" data-zaklad-nad-terenem x-text="zakladNadTerenemPopis"></div>
                                    <details>
                                        <summary class="cursor-pointer text-gray-500">{{ __('ed_sablona.zaklady.podrobnosti') }}</summary>
                                        <div class="flex flex-col gap-1 pt-1">
                                            <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.pod_dum_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.pod_dum') }}</span>
                                                <select class="flex-1 min-w-0" data-zaklad-volba="podDum" @change="setVolbuZakladu('podDum', $event.target.value)">
                                                    <option value="vykopek" :selected="zakladyHodnota('podDum') === 'vykopek'">{{ __('ed_sablona.zaklady.pod_dum_vykopek') }}</option>
                                                    <option value="sterk" :selected="zakladyHodnota('podDum') === 'sterk'">{{ __('ed_sablona.zaklady.pod_dum_sterk') }}</option>
                                                </select></div>
                                            <div class="kk-podlazi-pole" x-show="zemina?.casti.some(c => c.typ === 'deska')" title="{{ __('ed_sablona.zaklady.skladba_deska_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.skladba_deska') }}</span>
                                                <input type="number" min="0" max="200" step="5" class="w-16" data-zaklad="skladbaDeska" :value="Math.round(zakladyHodnota('skladbaDeska') * 100)"
                                                       @change="setZaklady('skladbaDeska', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('skladbaDeska') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                            <div class="kk-podlazi-pole" x-show="zemina?.casti.some(c => c.typ === 'pasy')" title="{{ __('ed_sablona.zaklady.skladba_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.skladba') }}</span>
                                                <input type="number" min="0" max="200" step="5" class="w-16" data-zaklad="skladba" :value="Math.round(zakladyHodnota('skladba') * 100)"
                                                       @change="setZaklady('skladba', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('skladba') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                            <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.ornice_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.ornice') }}</span>
                                                <input type="number" min="0" max="100" step="5" class="w-16" data-zaklad="ornice" :value="Math.round(zakladyHodnota('ornice') * 100)"
                                                       @change="setZaklady('ornice', parseFloat($event.target.value) / 100); $event.target.value = Math.round(zakladyHodnota('ornice') * 100)" @keydown.enter.prevent="$event.target.blur()"><span>cm</span></div>
                                            <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.svah_tip') }}"><span class="w-24 shrink-0 whitespace-nowrap">{{ __('ed_sablona.zaklady.svah') }}</span>
                                                <input type="number" min="0" max="3" step="0.05" class="w-16" data-zaklad="svah" :value="zakladyHodnota('svah')"
                                                       @change="setZaklady('svah', parseFloat($event.target.value)); $event.target.value = zakladyHodnota('svah')" @keydown.enter.prevent="$event.target.blur()"></div>
                                            <div class="kk-podlazi-pole" title="{{ __('ed_sablona.zaklady.nakypreni_tip') }}"><span class="w-24 shrink-0">{{ __('ed_sablona.zaklady.nakypreni') }}</span>
                                                <input type="number" min="1" max="2" step="0.05" class="w-16" data-zaklad="nakypreni" :value="zakladyHodnota('nakypreni')"
                                                       @change="setZaklady('nakypreni', parseFloat($event.target.value)); $event.target.value = zakladyHodnota('nakypreni')" @keydown.enter.prevent="$event.target.blur()"></div>
                                        </div>
                                    </details>
                                    {{-- Materiály: co po stavbě zůstane na pozemku navíc. Rostlý objem pro bilanci, nakypřený pro hromadu. --}}
                                    <template x-if="zemina">
                                        <div class="text-xs text-gray-600 border-t border-gray-100 pt-1.5 flex flex-col gap-0.5" data-materialy>
                                            <div class="font-semibold text-gray-700">{{ __('ed_sablona.zaklady.materialy') }}</div>
                                            <div class="flex gap-2 text-gray-500"><span class="flex-1"></span><span class="w-16 text-right">{{ __('ed_sablona.zaklady.rostly') }}</span><span class="w-16 text-right">{{ __('ed_sablona.zaklady.nakypreny') }}</span></div>
                                            <template x-for="r in materialyRadky" :key="r.id">
                                                <div class="flex gap-2" :data-material="r.id"><span class="flex-1" x-text="r.nazev"></span><span class="w-16 text-right font-semibold" x-text="r.rostly"></span><span class="w-16 text-right font-semibold" x-text="r.nakypreny"></span></div>
                                            </template>
                                            <div x-show="zemina.sterk >= 0.5" class="flex gap-2" data-material="sterk" title="{{ __('ed_sablona.zaklady.sterk_tip') }}"><span class="flex-1">{{ __('ed_sablona.zaklady.sterk') }}</span><span class="font-semibold" x-text="m3(zemina.sterk)"></span></div>
                                            <div x-show="zemina.mimoData > 0.05" class="text-amber-700" data-material-pozor>{{ __('ed_sablona.zaklady.mimo') }}</div>
                                            <details>
                                                <summary class="cursor-pointer text-gray-500">{{ __('ed_sablona.zaklady.jak') }}</summary>
                                                <div class="flex flex-col gap-0.5 pt-1">
                                                    <div x-text="preloz('ed_sablona.zaklady.vykopek', { vykopano: m3(zemina.vykopek.vykopano), zpet: m3(zemina.vykopek.zpet) })"></div>
                                                    <div x-text="preloz('ed_sablona.zaklady.ornice_bilance', { vykopano: m3(zemina.ornice.vykopano), zpet: m3(zemina.ornice.zpet) })"></div>
                                                    <div x-text="preloz('ed_sablona.zaklady.hromada', { objem: m3(zemina.hromada) })"></div>
                                                    <div x-text="terenPopis"></div>
                                                </div>
                                            </details>
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </template>
                    <div class="flex items-center gap-2 px-2 py-1 mt-1 border-t border-gray-200 text-xs font-semibold text-gray-700" x-show="prehledPloch && seznamPodlazi.length > 1" title="{{ __('ed_sablona.podlazi.celkem_tip') }}">
                        <span>{{ __('ed_sablona.podlazi.celkem') }}</span>
                        <span class="ml-auto pr-8" x-text="prehledPloch ? prelozCislo(prehledPloch.celkem, 1) + ' m²' : ''"></span>
                    </div>
                    <div class="text-[11px] text-gray-500 px-2 pt-1" x-show="rezim3d">{{ __('ed_sablona.podlazi.radky_3d') }}<span x-show="maZaklady"> {{ __('ed_sablona.podlazi.vykop_3d') }}</span></div>
                    {{-- Přidání: podlaží vzniká až klepnutím na konkrétní volbu --}}
                    <div class="mt-1">
                        <button type="button" id="kk-pridat-podlazi" @click="podlaziPridat = !podlaziPridat; podlaziUprava = null" class="kk-btn w-full text-xs" title="{{ __('ed_sablona.podlazi.pridat_tip') }}" x-text="podlaziPridat ? preloz('ed_sablona.podlazi.zavrit') : preloz('ed_sablona.podlazi.pridat')"></button>
                        <template x-if="podlaziPridat">
                            <div class="flex flex-col gap-1 pt-1.5">
                                <div class="flex items-center gap-1">
                                    <button type="button" @click="pridatPodlazi('nahoru')" class="kk-btn flex-1 text-xs" title="{{ __('ed_sablona.podlazi.patro_tip') }}">{{ __('ed_sablona.podlazi.patro') }}</button>
                                    <button type="button" @click="pridatPodlazi('sklep')" class="kk-btn flex-1 text-xs" title="{{ __('ed_sablona.podlazi.sklep_tip') }}">{{ __('ed_sablona.podlazi.sklep') }}</button>
                                    <button type="button" x-show="!maPodkrovi" @click="pridatPodlazi('podkrovi')" class="kk-btn flex-1 text-xs" title="{{ __('ed_sablona.podlazi.podkrovi_tip') }}">{{ __('ed_sablona.podlazi.podkrovi') }}</button>
                                </div>
                                <label class="kk-podlazi-pole" title="{{ __('ed_sablona.podlazi.kopie_tip') }}"><input type="checkbox" x-model="podlaziKopie" @change="_ulozNastaveniDumu()"> {{ __('ed_sablona.podlazi.kopie') }}</label>
                            </div>
                        </template>
                    </div>
                    <div class="flex items-center gap-2 px-1 pt-1.5" x-show="seznamPodlazi.length > 1 && !rezim3d">
                        <label class="kk-podlazi-pole" x-show="maSpodek" title="{{ __('ed_sablona.podlazi.spodek_tip') }}"><input type="checkbox" :checked="zobrazSpodek" @change="prepniSpodek()"> {{ __('ed_sablona.podlazi.spodek') }}</label>
                        <button type="button" @click="posunoutDum()" title="{{ __('ed_sablona.podlazi.posun_tip') }}" class="ml-auto text-xs text-gray-500 hover:text-primary underline">{{ __('ed_sablona.podlazi.posun') }}</button>
                    </div>
                </div>
            </template>
        </details>

        {{-- Katalog nábytku a vybavení, modules/katalog.md --}}
        <details id="kk-sekce-katalog" class="kk-section" :open="panelOpen.katalog" @toggle="panelOpen.katalog = $el.open; ulozitPanely(); if ($el.open) _katalogNacti(); else _katalogZrusVyber()">
            <summary class="kk-section-hlava">
                <span>{{ __('ed_sablona.katalog.nadpis') }}</span>
                <span x-show="katalog" class="kk-pocet" x-text="katalog?.polozky.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <template x-if="panelOpen.katalog">
                <div class="px-2 pb-2 flex flex-col gap-2 text-xs">
                    <div class="flex items-center gap-1">
                        <select id="kk-katalog-kategorie" x-model="katalogKategorie" :disabled="katalogHledat.trim() !== ''" aria-label="{{ __('ed_sablona.katalog.kategorie') }}" class="border border-gray-400 rounded px-1 py-1 text-xs flex-1 min-w-0">
                            <template x-for="k in katalog?.kategorie || []" :key="k.id">
                                <option :value="k.id" x-text="k.nazev" :selected="k.id === katalogKategorie"></option>
                            </template>
                        </select>
                        <input id="kk-katalog-hledat" type="search" x-model="katalogHledat" placeholder="{{ __('ed_sablona.katalog.hledat') }}" aria-label="{{ __('ed_sablona.katalog.hledat_aria') }}" class="border border-gray-400 rounded px-1 py-1 text-xs" style="width:110px">
                    </div>
                    <div x-show="!katalog" class="text-gray-500">{{ __('ed_sablona.katalog.nacitam') }}</div>
                    <div x-show="katalog && !katalogPolozky.length" class="text-gray-500">{{ __('ed_sablona.katalog.nic') }}</div>
                    <div class="overflow-y-auto" style="max-height:340px;display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:6px">
                        <template x-for="p in katalogPolozky" :key="p.id">
                            <button type="button" @click="katalogVyber(p)" @pointerdown="katalogTazeniStart($event, p)" @dragstart.prevent class="text-left rounded border p-1 flex flex-col gap-0.5 hover:border-gray-500"
                                    :style="(katalogVybrany?.id === p.id ? 'border-color:var(--c-primary);box-shadow:0 0 0 1px var(--c-primary)' : 'border-color:#e5e7eb') + ';touch-action:pan-y;user-select:none;cursor:grab'" :data-katalog-polozka="p.id">
                                <div class="relative"><img :src="Katalog3d.soubor('nahledy/' + p.id + '.webp')" :alt="p.nazev" loading="lazy" width="320" height="240" style="width:100%;height:auto;display:block;background:#f3f4f6;border-radius:4px">
                                    <span x-show="p.maska" class="absolute flex gap-px rounded-full border border-gray-300 bg-white px-1 py-0.5" style="right:3px;bottom:3px" :title="preloz('ed_sablona.katalog.jde_prebarvit')" data-katalog-prebarvit>
                                        <template x-for="c in Katalog3d.ukazka" :key="c"><span class="rounded-full" :style="'width:7px;height:7px;background:' + c"></span></template>
                                    </span></div>
                                <span class="text-gray-800 leading-tight" x-text="p.nazev"></span>
                                <span class="text-gray-500 leading-tight" x-text="katalogRozmery(p)"></span>
                            </button>
                        </template>
                    </div>
                    <div class="text-gray-500 leading-snug">
                        <span x-show="katalogVybrany">{{ __('ed_sablona.katalog.klepni') }}</span>
                        <span x-show="!katalogVybrany">{{ __('ed_sablona.katalog.pretahni') }} <a href="{{ \App\Support\Domeny::url('web', '/model-credits') }}" target="_blank" rel="noopener" class="underline">{{ __('ed_sablona.katalog.autori') }}</a></span>
                    </div>
                </div>
            </template>
        </details>

        <details class="kk-section" :open="panelOpen.parcela" @toggle="panelOpen.parcela = $el.open; ulozitPanely()">
            <summary class="kk-section-hlava">
                <span>@funkce('katastr') {{ __('ed_sablona.parcela.nadpis') }} @else {{ __('ed_sablona.parcela.mrizka') }} @endfunkce</span>
                <span x-show="katastrParcely.length > 0" class="kk-pocet" x-text="katastrParcely.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="px-3 py-2 space-y-2 max-h-96 overflow-y-auto">
                {{-- Checkboxy: Mřížka + katastr vrstvy (katastr jen s parcelami). Jeden řádek
                     pokud se vejdou, jinak wrap. gap-x menší aby se vešly vedle sebe. --}}
                <div class="flex items-center gap-x-2 gap-y-1 text-xs text-gray-500 flex-wrap" @click.stop>
                    @include('masterteam.partials.prepinace-parcely', ['kompaktni' => true])
                </div>
                {{-- KÚ hledání --}}
                @funkce('katastr')
                <div class="relative">
                    <label class="text-xs text-gray-500">{{ __('ed_sablona.parcela.ku') }}</label>
                    <input type="text" x-model="katastrKuHledani"
                           @input.debounce.200ms="katastrHledejKu()"
                           @focus="katastrKuNabidk = katastrKuVysledky.length > 0"
                           @click.outside="katastrKuNabidk = false"
                           placeholder="{{ __('ed_sablona.parcela.ku_hledat') }}"
                           class="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-primary">
                    <div x-show="katastrKuNabidk && katastrKuVysledky.length > 0"
                         class="absolute left-0 right-0 top-full z-30 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
                        <template x-for="ku in katastrKuVysledky" :key="ku.k">
                            <button @click="katastrVyberKu(ku)" class="block w-full text-left px-2 py-1 text-xs hover:bg-gray-50">
                                <span class="font-medium" x-text="ku.n"></span>
                                <span class="text-gray-500 ml-1" x-text="ku.o"></span>
                            </button>
                        </template>
                    </div>
                </div>
                {{-- Číslo + typ + tlačítko --}}
                <div class="flex gap-1 items-center">
                    <input type="text" x-model="katastrCislo" placeholder="{{ __('ed_sablona.parcela.cislo') }}"
                           @keydown.enter="katastrNactiParcelu()"
                           class="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1 h-7 focus:outline-none focus:border-primary">
                    <select x-model="katastrTyp" class="text-xs border border-gray-200 rounded px-1 h-7">
                        <option value="auto">{{ __('ed_sablona.parcela.typ_auto') }}</option>
                        <option value="pozemkova">{{ __('ed_sablona.parcela.typ_pozemkova') }}</option>
                        <option value="stavebni">{{ __('ed_sablona.parcela.typ_stavebni') }}</option>
                    </select>
                    <button @click="katastrNactiParcelu()"
                            :disabled="!katastrVybraneKu || !katastrCislo.trim() || katastrNacitani"
                            class="px-2 h-7 text-xs rounded text-white disabled:opacity-40"
                            style="background: var(--c-primary);">
                        <span x-show="!katastrNacitani">{{ __('ed_sablona.parcela.nacist') }}</span>
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
                        <details :open="p._detailsOpen === true" @toggle="p._detailsOpen = $el.open">
                            <summary class="flex items-center justify-between cursor-pointer select-none list-none">
                                <span class="flex items-center gap-1">
                                    <svg class="h-2.5 w-2.5 transition-transform text-gray-500" :class="(p._detailsOpen === true) && 'rotate-90'" fill="currentColor" viewBox="0 0 20 20"><path d="M6 4l8 6-8 6V4z"/></svg>
                                    <span class="font-medium select-text" style="user-select:text"
                                          @click.stop.prevent
                                          @mousedown.stop
                                          x-text="p.cislo + ' (' + (p.typ === 'stavebni' ? preloz('ed_sablona.parcela.zkratka_stavebni') : preloz('ed_sablona.parcela.zkratka_pozemkova')) + ')'"></span>
                                </span>
                                <button @click.stop.prevent="katastrOdeberParcelu(i)" class="text-gray-500 hover:text-red-500">&times;</button>
                            </summary>
                            <div class="text-gray-600 mt-0.5"><span class="text-gray-500">{{ __('ed_sablona.parcela.druh') }}</span> <span x-text="(p.druh_pozemku_cz || '—') + ', ' + (p.vymera || '?') + ' m²'"></span></div>
                            <template x-for="field in [{k:'radon', lbl:preloz('ed_sablona.parcela.radon')}, {k:'geologie', lbl:preloz('ed_sablona.parcela.geologie')}, {k:'ig_rajon', lbl:preloz('ed_sablona.zaklady.nazev')}]" :key="field.k">
                                <div x-show="p[field.k]">
                                    <div class="text-gray-600 mt-0.5 flex items-start gap-1">
                                        <div class="flex-1"><span class="text-gray-500" x-text="field.lbl + ':'"></span> <span x-text="p[field.k]"></span></div>
                                        <button @click.stop="otevriVysvetleni(i, field.k)"
                                                class="text-gray-300 hover:text-orange-600 border border-current rounded-full w-4 h-4 text-[9px] leading-none flex items-center justify-center flex-shrink-0"
                                                title="{{ __('ed_sablona.parcela.vysvetlit') }}">?</button>
                                    </div>
                                    <div x-show="p._vysvetleni_open === field.k && p._vysvetleni && p._vysvetleni[field.k]"
                                         class="bg-orange-50 border-l-2 border-orange-300 px-2 py-1 mt-0.5 text-gray-700 italic text-xs leading-snug">
                                        <span x-show="p._vysvetleni?.[field.k]?.loading">{{ __('ed_sablona.parcela.nacitam') }}</span>
                                        <span x-show="p._vysvetleni?.[field.k]?.popis" x-text="p._vysvetleni?.[field.k]?.popis"></span>
                                        <span x-show="p._vysvetleni?.[field.k]?.error" class="text-red-600" x-text="p._vysvetleni?.[field.k]?.error"></span>
                                    </div>
                                </div>
                            </template>
                        </details>
                        <div x-show="p._sousedi === false" class="text-red-600 font-medium mt-0.5">{{ __('ed_sablona.parcela.nesousedi') }}</div>
                    </div>
                </template>
                {{-- Souhrn --}}
                <div x-show="katastrParcely.length > 0" class="text-xs text-gray-600 border-t border-gray-100 pt-1.5">
                    <div>{{ __('ed_sablona.parcela.celkem') }} <strong x-text="katastrCelkovaVymera() + ' m²'"></strong></div>
                    <template x-if="vyskovyProfil">
                        <div>
                            <span>{{ __('ed_sablona.parcela.vyska') }} <strong x-text="preloz('ed_sablona.parcela.vyska_rozsah', { min: vyskovyProfil.vyska_min, max: vyskovyProfil.vyska_max })"></strong></span>
                            <span class="ml-2">{{ __('ed_sablona.parcela.prevyseni') }} <strong x-text="vyskovyProfil.vyskovy_rozdil + ' m'"></strong></span>
                        </div>
                    </template>
                    <span x-show="katastrNacitaniProfil" class="mt-1 text-xs text-gray-500">{{ __('ed_sablona.parcela.nacitam_profil') }}</span>
                </div>
                @endfunkce
            </div>
        </details>

        {{-- Objekty --}}
        <details class="kk-section" :open="panelOpen.objekty" @toggle="panelOpen.objekty = $el.open; ulozitPanely()">
            <summary class="kk-section-hlava">
                <span>{{ __('ed_sablona.objekty.nadpis') }}</span>
                <span x-show="seznamObjektu.length > 0" class="kk-pocet" x-text="seznamObjektu.length"></span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="px-3 py-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-gray-100">
                @include('masterteam.partials.prepinace-zobrazeni')
            </div>
            <div class="max-h-48 overflow-y-auto divide-y divide-gray-100">
                <template x-for="obj in seznamObjektu" :key="obj.id">
                    <div class="flex items-center justify-between px-3 py-1 text-xs cursor-pointer select-none transition-colors"
                         :style="hoverObjektId === obj.id && !vybraneIds.includes(obj.id) ? 'background-color: #dbeafe' : ''"
                         :class="vybraneIds.includes(obj.id) ? 'bg-blue-50' : 'hover:bg-gray-50'"
                         @click="vyberObjekt(obj.id, $event)"
                         @dblclick.stop="zacniEditObjekt(obj.id, obj.nazev)"
                         @mouseenter="zvyrazniObjekt(obj.id)"
                         @mouseleave="zvyrazniObjekt(null)">
                        <div class="flex items-center gap-1 min-w-0">
                            {{-- Označení z výkresu — stejná barva jako popisek na plátně
                                 (stěny fialově, otvory oranžově), ať jde řádek spárovat s kresbou --}}
                            <span class="kk-oznaceni" :class="obj.type === 'wall' ? 'text-purple-600 bg-purple-50' : obj.type === 'kus' ? 'text-teal-700 bg-teal-50' : 'text-orange-600 bg-orange-50'"
                                  x-text="obj.oznaceni || obj.id"></span>
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
                            <span class="text-gray-500 text-[10px]" x-text="obj.info"></span>
                            <button @click.stop="smazatObjekt(obj.id)" class="text-gray-300 hover:text-red-500 transition" title="{{ __('ed_sablona.spolecne.smazat') }}">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                    <path d="M18 6L6 18M6 6l12 12"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </template>
                <div x-show="seznamObjektu.length === 0" class="px-3 py-2 text-xs text-gray-500">
                    {{ __('ed_sablona.objekty.zadne') }}
                </div>
            </div>
        </details>

        {{-- Podklad (import půdorysu z výkresu) --}}
        <details class="kk-section" :open="panelOpen.podklad" @toggle="panelOpen.podklad = $el.open; ulozitPanely(); if ($el.open) impNactiDrive()">
            <summary class="kk-section-hlava">
                <span>{{ __('ed_sablona.podklad.nadpis') }}</span>
                <span x-show="podklad" class="kk-pocet">1</span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            {{-- V panelu je jen výkres, který se právě používá. Ostatní dřív nahrané
                 jsou pod „Nový výkres…“ v průvodci, ať se seznam nepřehlcuje. --}}
            <div class="px-3 py-2 space-y-2">
                <template x-if="!podklad">
                    <div>
                        <button @click="impOtevri()" class="kk-btn w-full text-xs">{{ __('ed_sablona.podklad.novy') }}</button>
                        <div class="text-[10px] text-gray-500 mt-1">{{ __('ed_sablona.podklad.popis') }}</div>
                    </div>
                </template>
                <template x-if="podklad">
                    <div class="space-y-1.5">
                        <div class="text-xs text-gray-600 truncate" x-text="podklad.nazev || preloz('ed_sablona.podklad.vykres')"></div>
                        <div class="text-[10px] text-gray-500">
                            {{ __('ed_sablona.podklad.zmereno') }} · <span x-text="podklad.sirkaM.toFixed(1) + ' × ' + podklad.vyskaM.toFixed(1) + ' m'"></span>
                        </div>
                        {{-- Usazení plánku na spodní podlaží a posun samotného plánku --}}
                        <div class="flex items-center gap-1 flex-wrap">
                            <button type="button" x-show="maSpodek" @click="licoZacni()" class="kk-btn text-xs">{{ __('ed_sablona.podklad.usadit') }}</button>
                            <button type="button" @click="prepniPosunPodkladu()" class="kk-btn text-xs" :class="posunPodkladu && 'kk-tl-aktivni'">{{ __('ed_sablona.podklad.posunout') }}</button>
                        </div>
                        {{-- Zobrazení podkladu — oddělené čarou, ať je vidět, že patří k sobě.
                             „Nad“ umožní obkreslovat i tam, kde už stěna leží. --}}
                        <div class="pt-2 mt-1 border-t border-gray-200">
                            <div class="text-[10px] text-gray-500 mb-1">{{ __('ed_sablona.podklad.zobrazeni') }}</div>
                            <div class="flex items-center rounded overflow-hidden border border-gray-200 w-full">
                                <template x-for="v in [{ k: 'pod', t: preloz('ed_sablona.podklad.pod') }, { k: 'nad', t: preloz('ed_sablona.podklad.nad') }, { k: 'skryt', t: preloz('ed_sablona.podklad.skryt') }]" :key="v.k">
                                    <button @click="podkladZmena({ zobrazeni: v.k })"
                                            class="flex-1 px-1 py-0.5 text-[11px] transition border-l border-gray-200 first:border-l-0"
                                            :class="podkladZobrazeni() === v.k ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-100'"
                                            x-text="v.t"></button>
                                </template>
                            </div>
                            {{-- vlevo bledý, vpravo sytý; x-model, ať jezdec drží polohu i po překreslení --}}
                            <div class="flex items-center gap-2 mt-1.5" x-show="podkladZobrazeni() !== 'skryt'">
                                <span class="text-[10px] text-gray-500 shrink-0">{{ __('ed_sablona.podklad.sytost') }}</span>
                                <input type="range" min="0.1" max="1" step="0.05"
                                       x-model.number="podklad.pruhlednost"
                                       @input="podkladZmena({ pruhlednost: parseFloat($event.target.value) })"
                                       class="flex-1">
                                <span class="text-[10px] text-gray-500 w-7 text-right"
                                      x-text="Math.round((podklad.pruhlednost ?? 0.5) * 100) + '%'"></span>
                            </div>
                        </div>
                        <div class="flex gap-1">
                            <button @click="impOtevri()" class="kk-btn flex-1 text-xs">{{ __('ed_sablona.podklad.novy') }}</button>
                            <button @click="podkladOdeber()" class="kk-btn text-xs text-red-600">{{ __('ed_sablona.podklad.odebrat') }}</button>
                        </div>
                    </div>
                </template>
            </div>
        </details>

        {{-- Export a sdílení: obrázky vznikají v prohlížeči, odkaz je hotový stav jen pro čtení (modules/sdileni.md) --}}
        <details class="kk-section" data-sekce-export :open="panelOpen.export" @toggle="panelOpen.export = $el.open; ulozitPanely(); if ($el.open && !sdileni) nactiSdileni()">
            <summary class="kk-section-hlava">
                <span>{{ __('ed_sablona.export.nadpis') }}</span>
                <span x-show="sdileni?.aktivni" class="kk-pocet" title="{{ __('ed_sablona.export.odkaz_zapnuty') }}">{{ __('ed_sablona.export.odkaz') }}</span>
                <svg class="kk-sipka" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="px-3 py-2 flex flex-col gap-2 text-xs">
                <template x-if="!exportPovolen">
                    <div class="text-gray-500">{{ __('tarify.exporty_jen_placene') }}</div>
                </template>
                <template x-if="exportPovolen">
                    <div class="flex flex-col gap-2">
                        <div class="flex flex-col gap-1" data-export-prepinace>
                            <div class="text-gray-500">{{ __('ed_sablona.export.na_pudorysu') }}</div>
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                @include('masterteam.partials.prepinace-zobrazeni')
                            </div>
                        </div>
                        <div class="flex flex-col gap-1" data-export-parcela>
                            <div class="text-gray-500" x-text="katastrParcely.length > 0 ? preloz('ed_sablona.export.na_pudorysu_parcela') : preloz('ed_sablona.export.na_pudorysu_mrizka')"></div>
                            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                                @include('masterteam.partials.prepinace-parcely')
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-1">
                            <button type="button" class="kk-btn text-xs" :disabled="exportBezi" data-export="pudorys" title="{{ __('ed_sablona.export.pudorys_tip') }}" @click="exportPudorys(false)">{{ __('ed_sablona.export.pudorys') }}</button>
                            <button type="button" class="kk-btn text-xs" :disabled="exportBezi" data-export="pudorysy" title="{{ __('ed_sablona.export.vsechna_tip') }}" @click="exportPudorys(true)">{{ __('ed_sablona.export.vsechna') }}</button>
                            <button type="button" class="kk-btn text-xs" :disabled="exportBezi" data-export="3d" title="{{ __('ed_sablona.export.obraz_3d_tip') }}" @click="export3d()">3D PNG</button>
                        </div>
                        <div class="flex flex-col gap-1 pt-2 border-t border-gray-200">
                            <div class="font-semibold text-gray-700">{{ __('ed_sablona.export.odkaz_nadpis') }}</div>
                            <template x-if="!sdileni?.aktivni">
                                <div class="flex flex-col gap-1">
                                    <div class="text-gray-500">{{ __('ed_sablona.export.odkaz_popis') }}</div>
                                    <button type="button" class="kk-btn text-xs self-start" :disabled="sdileniBezi" data-sdileni="vytvorit" @click="sdileniUloz()" x-text="sdileniBezi ? preloz('ed_sablona.export.pripravuji') : preloz('ed_sablona.export.vytvorit')"></button>
                                </div>
                            </template>
                            <template x-if="sdileni?.aktivni">
                                <div class="flex flex-col gap-1">
                                    <div class="flex items-center gap-1">
                                        <input type="text" readonly class="flex-1 min-w-0 border border-gray-500 rounded px-1" x-ref="sdileniAdresa" data-sdileni="adresa" :value="sdileni.url" @focus="$event.target.select()">
                                        <button type="button" class="kk-btn text-xs" data-sdileni="kopirovat" @click="sdileniKopiruj()" x-text="sdileniZkopirovano ? preloz('ed_sablona.export.zkopirovano') : preloz('ed_sablona.export.kopirovat')"></button>
                                    </div>
                                    <div class="text-gray-500" x-text="preloz('ed_sablona.export.stav', { datum: new Date(sdileni.upraveno).toLocaleString(TT_LOKALIZACE.jazyk) })"></div>
                                    <div class="flex flex-wrap gap-1">
                                        <a class="kk-btn text-xs" :href="sdileni.url" target="_blank" rel="noopener noreferrer" data-sdileni="otevrit">{{ __('ed_sablona.export.otevrit') }}</a>
                                        <button type="button" class="kk-btn text-xs" :disabled="sdileniBezi" data-sdileni="aktualizovat" title="{{ __('ed_sablona.export.aktualizovat_tip') }}" @click="sdileniUloz()" x-text="sdileniBezi ? preloz('ed_sablona.export.pripravuji') : preloz('ed_sablona.export.aktualizovat')"></button>
                                        <button type="button" class="kk-btn text-xs" :disabled="sdileniBezi" data-sdileni="vypnout" title="{{ __('ed_sablona.export.vypnout_tip') }}" @click="sdileniVypni()">{{ __('ed_sablona.export.vypnout') }}</button>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </details>

        {{-- Historie --}}
        <details class="kk-section" :open="panelOpen.historie" @toggle="panelOpen.historie = $el.open; ulozitPanely()">
            <summary data-historie-souhrn class="kk-section-hlava">
                <span>{{ __('ed_sablona.historie.nadpis') }}</span>
                {{-- Po Zpět je vidět i u sbaleného panelu, na kterém kroku se stojí --}}
                <span x-show="historie.length > 0" class="kk-pocet"
                      x-text="historiePozice < historie.length - 1
                          ? preloz('ed_sablona.historie.krok', { krok: historiePozice + 1, celkem: historie.length })
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
                        <span x-text="h.cas?.substring(11, 16)" class="text-gray-500 ml-2 shrink-0"></span>
                    </div>
                </template>
            </div>
        </details>
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
                        <span class="flex items-center gap-1" title="{{ __('ed_sablona.import.posun_tip') }}">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
                                <rect x="4" y="1" width="8" height="14" rx="4"/><path d="M12 1.5v5H8" fill="currentColor" opacity=".35"/>
                            </svg>
                            {{ __('ed_sablona.import.posun') }}
                        </span>
                        <span class="flex items-center gap-1" title="{{ __('ed_sablona.import.priblizeni_tip') }}">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3">
                                <rect x="4" y="1" width="8" height="14" rx="4"/><line x1="8" y1="4" x2="8" y2="6.5"/>
                            </svg>
                            {{ __('ed_sablona.import.priblizeni') }}
                        </span>
                        <span class="flex items-center gap-1" title="{{ __('ed_sablona.import.cely_tip') }}">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                                <path d="M6 1H1v5M10 1h5v5M10 15h5v-5M6 15H1v-5"/>
                            </svg>
                            {{ __('ed_sablona.import.cely') }}
                        </span>
                        <span class="flex items-center gap-1" title="{{ __('ed_sablona.import.zrusit_tip') }}">
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                                <rect x="1.5" y="4" width="13" height="8" rx="1.5"/><path d="M4.5 8h3"/>
                            </svg>
                            {{ __('ed_sablona.import.zrusit') }}
                        </span>
                    </div>
                    <button @click="impZavri()" class="text-gray-500 hover:text-gray-600 text-xl leading-none">&times;</button>
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
                    {{ __('ed_sablona.import.jen_vlozit') }}
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4 kk-posuvnik">
                <div x-show="impChyba" class="mb-3 text-xs text-red-600 bg-red-50 rounded px-2 py-1.5" x-text="impChyba"></div>

                {{-- Krok 1: soubor (stejná plocha pro nahrání jako ve výkazu výměr) --}}
                <div x-show="impKrok === 'soubor'" class="py-2">
                    {{-- Dříve nahrané výkresy — ať se stejný soubor nenahrává pořád dokola --}}
                    <template x-if="impDrive.length > 0">
                        <div class="mb-4">
                            <div class="text-xs font-medium text-gray-500 mb-1.5">{{ __('ed_sablona.import.drive') }}</div>
                            <div class="divide-y divide-gray-100 border border-gray-100 rounded max-h-56 overflow-y-auto kk-posuvnik">
                                <template x-for="(v, i) in impDrive" :key="v.otisk">
                                    <button @click="impPouzijDrive(v)"
                                            class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-orange-50">
                                        <span class="truncate">
                                            <span class="font-medium" x-text="v.nazev"></span>
                                            <span class="text-gray-500" x-show="v.stran > 1" x-text="' · ' + prelozPocet('ed_sablona.import.stran', v.stran)"></span>
                                            {{-- výkres si pamatuje měřítko i obvod → kroky se přeskočí --}}
                                            <span x-show="Object.keys(v.strany || {}).length"
                                                  class="ml-1 rounded bg-green-50 px-1.5 py-0.5 text-[10px] text-green-700">{{ __('ed_sablona.import.hotove') }}</span>
                                        </span>
                                        <span class="shrink-0 text-gray-500"
                                              x-text="(v.velikost ? Math.round(v.velikost / 1024) + ' kB' : '')
                                                  + (v.nahrano ? ' · ' + v.nahrano.substring(0, 10) : '')"></span>
                                    </button>
                                </template>
                            </div>
                        </div>
                    </template>
                    <label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded border-2 border-dashed py-10 text-sm transition"
                           :class="impPretahuje ? 'border-orange-500 text-orange-700 bg-orange-50' : 'border-gray-500 text-gray-500 hover:border-orange-400 hover:text-orange-700'"
                           @dragover.prevent="impPretahuje = true"
                           @dragleave.prevent="impPretahuje = false"
                           @drop.prevent="impPustSoubor($event)">
                        <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
                        </svg>
                        <span>{{ __('ed_sablona.import.nahraj') }}</span>
                        <span class="text-xs text-gray-500">{{ __('ed_sablona.import.nejlepe') }}</span>
                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" class="hidden" @change="impNahrajSoubor($event)">
                    </label>
                    <p x-show="impNacitani" x-cloak class="mt-2 text-xs text-gray-500">{{ __('ed_sablona.import.nahravam') }}</p>

                </div>

                {{-- Krok 2: výběr strany --}}
                <div x-show="impKrok === 'strana'">
                    <div class="text-xs text-gray-500 mb-2" x-text="preloz('ed_sablona.import.vyber_stranu', { stran: prelozPocet('ed_sablona.import.stran', impStran) })"></div>
                    <div class="grid grid-cols-4 gap-2 max-h-[55vh] overflow-y-auto">
                        <template x-for="s in impStran" :key="s">
                            <button @click="impVyberStranu(s)" class="border border-gray-200 rounded hover:border-orange-400 p-1 text-left">
                                <img :src="impNahledUrl(s)" loading="lazy" class="w-full bg-gray-50" alt="">
                                <div class="text-[10px] text-gray-500 text-center mt-0.5" x-text="preloz('ed_sablona.import.strana', { n: s })"></div>
                            </button>
                        </template>
                    </div>
                    <div x-show="impNacitani" class="text-xs text-gray-500 mt-2">{{ __('ed_sablona.import.pripravuji') }}</div>
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
                                            data-tip-below="{{ __('ed_sablona.import.zpet_esc') }}">&#8630;</button>
                                    <button x-show="pzObrys.length > 0" @click="pzObrysZnovu()"
                                            class="rounded px-2 py-1 text-gray-600 hover:bg-gray-200">{{ __('ed_sablona.import.znovu') }}</button>
                                </span>
                            </template>

                            <span class="text-gray-300">|</span>
                            <button @click="pzZoomKrok(-1)" class="rounded border border-gray-200 px-1.5 py-0.5 text-gray-600 hover:bg-gray-200">&minus;</button>
                            <span class="w-10 text-center text-gray-500" x-text="pzZoomProcent() + '%'"></span>
                            <button @click="pzZoomKrok(1)" class="rounded border border-gray-200 px-1.5 py-0.5 text-gray-600 hover:bg-gray-200">+</button>
                            {{-- magnet jako ikona — zapnutý svítí barvou značky --}}
                            <button @click="pzMagnetySila = pzMagnetySila > 0 ? 0 : 100"
                                    class="rounded p-1 transition hover:bg-gray-200"
                                    :class="pzMagnetySila > 0 ? 'text-primary' : 'text-gray-500'"
                                    data-tip-below="{{ __('ed_sablona.import.magnet_tip') }}">
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
                                     stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M2.2 14V8a5.8 5.8 0 0 1 11.6 0v6"/>
                                    <path d="M5.8 14V8a2.2 2.2 0 0 1 4.4 0v6"/>
                                    <line x1="2.2" y1="11.4" x2="5.8" y2="11.4"/>
                                    <line x1="10.2" y1="11.4" x2="13.8" y2="11.4"/>
                                </svg>
                            </button>
                            <span class="text-gray-500" x-show="pzNacitamMagnety">{{ __('ed_sablona.import.nacitam') }}</span>
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
                            {{ __('ed_sablona.import.obrys_uzavri') }}
                        </span>
                        <span x-show="pzObrysUzavren" class="text-gray-600"
                              x-html="preloz('ed_sablona.import.obvod_hotov', { rohy: prelozPocet('ed_sablona.import.rohy', pzObrys.length, { pocet: '<strong>' + pzObrys.length + '</strong>' }), plocha: '<strong>' + pzObrysPlocha().toFixed(1) + ' m²</strong>' })"></span>
                    </div>

                    {{-- Měření (ukáže se až po kliknutí na metr) --}}
                    <div x-show="impKrok === 'meritko' && (pzNastroj === 'kalibrace' || impZmereno())" class="flex items-center gap-2 text-xs flex-wrap">
                        <span x-show="impKalibBody.length < 2" class="text-orange-700">
                            {{ __('ed_sablona.import.klikni_body') }}
                        </span>
                        <template x-if="impKalibBody.length === 2">
                            <span class="flex items-center gap-1">
                                <span :class="impChybiRozmer() && 'text-orange-700 font-medium'">{{ __('ed_sablona.import.vzdalenost') }}</span>
                                <input type="number" x-model.number="impKalibMm" min="10" step="10" placeholder="{{ __('ed_sablona.import.priklad_mm') }}"
                                       class="w-28 rounded px-1 py-0.5 border"
                                       :class="impChybiRozmer() ? 'border-orange-500 bg-orange-50' : 'border-gray-200'">
                                <span>mm</span>
                                <button @click="impKalibZnovu()" class="text-gray-500 hover:text-gray-600 underline">{{ __('ed_sablona.import.zmerit_znovu') }}</button>
                                <span x-show="impChybiRozmer()" class="text-orange-700">{{ __('ed_sablona.import.dopln') }}</span>
                            </span>
                        </template>
                    </div>

                    <div class="flex items-center justify-between">
                        <div class="text-xs" :class="impMeritkoPlatne() ? 'text-gray-500' : 'text-orange-700'">
                            <template x-if="impKrok === 'meritko' && impRozmerM() && impMeritko()">
                                <span><span x-html="preloz('ed_sablona.import.meritko', { meritko: '<strong>1:' + impMeritko().jmenovatel + '</strong>' })"></span>
                                    <span x-show="!impMeritko().standard" class="text-orange-700">{{ __('ed_sablona.import.nebezne') }}</span>
                                </span>
                            </template>
                            {{-- Sken/printscreen: rozměr papíru neznáme, měřítko spočítat nejde --}}
                            <template x-if="impKrok === 'meritko' && impRozmerM() && !impMeritko()">
                                <span x-html="preloz('ed_sablona.import.cely_vykres', { sirka: '<strong>' + impRozmerM().sirka.toFixed(1) + '</strong>', vyska: '<strong>' + impRozmerM().vyska.toFixed(1) + '</strong>' })"></span>
                            </template>
                        </div>
                        <div class="flex gap-2">
                            <button x-show="impKrok === 'meritko'" @click="impNaObrys()" :disabled="!impMeritkoPlatne()"
                                    class="px-3 py-1.5 rounded text-white text-xs font-medium disabled:opacity-40"
                                    style="background: var(--c-primary);">
                                {{ __('ed_sablona.import.obkreslit') }}
                            </button>
                            <button x-show="impKrok === 'obrys'" @click="impRozpoznat()"
                                    :disabled="!pzObrysUzavren || !impStranaData?.vektor"
                                    class="px-3 py-1.5 rounded text-white text-xs font-medium disabled:opacity-40"
                                    style="background: var(--c-primary);">
                                {{ __('ed_sablona.import.rozpoznat') }}
                            </button>
                        </div>
                    </div>
                </div>

                {{-- Krok 4: varianty rozpoznaných stěn --}}
                <div x-show="impKrok === 'steny'" class="space-y-3">
                    <div x-show="impStav === 'pocitam'" class="py-10 text-center text-sm text-gray-500">
                        {{ __('ed_sablona.import.hledam') }}
                    </div>

                    <template x-if="impStav === 'hotovo'">
                        <div class="space-y-3">
                            <div class="space-y-3">
                                <template x-for="(v, i) in impVarianty" :key="i">
                                    <button @click="impVyberVariantu(i)"
                                            class="block w-full border-2 rounded p-2 text-left transition-colors"
                                            :class="impVybrana === i ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-500'">
                                        <div class="flex items-center justify-between text-xs mb-1.5">
                                            <span class="font-medium"
                                                  x-text="(i + 1) + '. ' + prelozPocet('ed_sablona.spolecne.sten', v.osy.length) + ' · ' + v.delka.toFixed(0) + ' m'"></span>
                                            <span class="flex items-center gap-3">
                                                <span class="text-gray-500" x-text="v.plocha ? preloz('ed_sablona.import.plocha', { plocha: v.plocha.toFixed(0) }) : ''"></span>
                                                {{-- potvrzení u vybrané varianty, ne až dole pod seznamem --}}
                                                <span x-show="impVybrana === i"
                                                      @click.stop="impPrevezmiSteny()"
                                                      class="px-3 py-1.5 rounded text-white text-xs font-medium cursor-pointer"
                                                      style="background: var(--c-primary);">
                                                    {{ __('ed_sablona.import.prevzit') }}
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
                                <div class="text-[11px] text-gray-500" x-text="preloz('ed_sablona.import.vysledek', { cas: impCas.toFixed(1) })"></div>
                                <div class="flex gap-2">

                                </div>
                            </div>
                        </div>
                    </template>

                    <div x-show="impStav === 'chyba'" class="flex items-center justify-between">
                        <span class="text-xs text-gray-500">{{ __('ed_sablona.import.zkus') }}</span>
                        <div class="flex gap-2">
                            <button @click="impKrok = 'meritko'" class="kk-btn text-xs">{{ __('ed_sablona.spolecne.zpet') }}</button>
                            <button @click="impVloz()" class="kk-btn text-xs">{{ __('ed_sablona.import.jen_vlozit') }}</button>
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
<script src="/js/koncept-v3/koncept-k-ui.js?v={{ filemtime(public_path('js/koncept-v3/koncept-k-ui.js')) }}"></script>
<script src="/js/koncept-v3/import-analyza.js?v={{ filemtime(public_path('js/koncept-v3/import-analyza.js')) }}"></script>
<script src="/js/koncept-v3/import-prohlizec.js?v={{ filemtime(public_path('js/koncept-v3/import-prohlizec.js')) }}"></script>
<script src="/js/koncept-v3/dum.js?v={{ filemtime(public_path('js/koncept-v3/dum.js')) }}"></script>
<script src="/js/koncept-v3/import-pudorysu.js?v={{ filemtime(public_path('js/koncept-v3/import-pudorysu.js')) }}"></script>
<script src="/js/koncept-v3/katalog.js?v={{ filemtime(public_path('js/koncept-v3/katalog.js')) }}"></script>
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
    metadata: @json($aktivni?->metadata ?? []),
    historie: @json($aktivni?->historie ?? []),
    historieAktualni: @json($aktivni?->historie_aktualni),
    csrf: '{{ csrf_token() }}',
    exporty: @json(\App\Support\Tarif::maExporty(auth()->user())),
    routes: {
        sdileni: '{{ route($trasaV3 . ".sdileni", ":id") }}',
        ulozit: '{{ route($trasaV3 . ".ulozit", ":id") }}',
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
            // (i při kreslení oddělovače místnosti — ten má stejný magnet úhlu)
            if ((ctx.isDraggingNode || ctx._oddelovacStart) && ctx._osaUhlu) {
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
                    osa.p, true, ' ' + (osa.domu ? preloz('ed_sablona.platno.uhel_k_osam') : preloz('ed_sablona.platno.uhel_k_vodorovne')));
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
