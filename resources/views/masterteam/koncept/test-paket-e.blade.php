<x-layouts.app title="Test Paket E — Kalkulio Masterteam">

@php
    $realneJson = isset($realnePredvolby) ? json_encode($realnePredvolby, JSON_UNESCAPED_UNICODE) : '{}';
@endphp

{{-- Konva + StavebníEngine + Renderer (jen 2D, bez 3D) --}}
<script src="/js/konva-9.min.js?v=9"></script>
<script src="/js/stavebni-engine.js?v={{ filemtime(public_path('js/stavebni-engine.js')) }}"></script>
<script src="/js/pudorys-icons.js?v={{ filemtime(public_path('js/pudorys-icons.js')) }}"></script>
<script src="/js/konva-renderer.js?v={{ filemtime(public_path('js/konva-renderer.js')) }}"></script>

<style>
    .pe-grid { display: grid; grid-template-columns: 360px 1fr; gap: 12px; height: calc(100vh - 80px); }
    .pe-panel { display: flex; flex-direction: column; gap: 8px; padding: 10px; background: #f9fafb; border-right: 1px solid #e5e7eb; overflow-y: auto; }
    .pe-panel textarea { font-family: 'Consolas', monospace; font-size: 11px; padding: 6px; border: 1px solid #d1d5db; border-radius: 4px; }
    .pe-panel .uprava { font-family: inherit; font-size: 13px; }
    .pe-btn { padding: 6px 12px; border-radius: 4px; border: 1px solid #d1d5db; background: white; cursor: pointer; font-size: 13px; }
    .pe-btn:hover { border-color: #dd5500; color: #dd5500; }
    .pe-btn.primary { background: #dd5500; color: white; border-color: #dd5500; }
    .pe-btn.primary:hover { background: #ea580c; }
    .pe-status { font-size: 12px; color: #4b5563; padding: 4px 8px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
    .pe-canvas { position: relative; background: #fff; }
    #pe-canvas-container { width: 100%; height: 100%; }
    .pe-error { background: #fee; color: #991b1b; padding: 8px; border-radius: 4px; font-size: 12px; }
    .pe-success { background: #efe; color: #065f46; padding: 8px; border-radius: 4px; font-size: 12px; }
</style>

<div x-data="testPaketE()" x-init="init()" class="pe-grid">
    <div class="pe-panel">
        <h2 class="text-lg font-bold text-gray-800">Test paket E</h2>
        <p class="text-xs text-gray-500">
            Editor pro testování reprezentace E. Vlož paket JSON → klik "Načíst" →
            engine.fromAsciiPlus → renderer. Pro úpravu zadej příkaz a klik "Pošli AI".
        </p>

        <label class="text-xs font-semibold text-gray-700">Předvolby</label>
        <div class="flex flex-wrap gap-1">
            <template x-for="(p, key) in paketsPredvolby" :key="key">
                <button class="pe-btn" @click="loadPredvolba(key)" x-text="key"></button>
            </template>
        </div>

        <label class="text-xs font-semibold text-gray-700">Paket E (JSON)</label>
        <textarea x-model="paketText" rows="14" spellcheck="false"
                  @input="paketDirty = true"></textarea>

        <button class="pe-btn primary" @click="nacist()">▶ Načíst do canvasu</button>
        <div class="pe-status" x-text="status" x-show="status"></div>
        <div class="pe-error" x-text="chyba" x-show="chyba"></div>

        <hr class="my-2">

        <label class="text-xs font-semibold text-gray-700">AI úprava</label>
        <textarea x-model="upravaText" rows="3" class="uprava" placeholder="např: rozšiř místnost A o 1m na úkor B"></textarea>
        <button class="pe-btn" @click="aiUprava()" :disabled="aiBezi">
            <span x-show="!aiBezi">✨ Pošli AI</span>
            <span x-show="aiBezi">⏳ Volám AI...</span>
        </button>
        <div class="pe-success" x-text="aiVysledek" x-show="aiVysledek"></div>
    </div>

    <div class="pe-canvas">
        <div id="pe-canvas-container"></div>
    </div>
</div>

<script>
function testPaketE() {
    return {
        paketText: '',
        paketDirty: false,
        status: '',
        chyba: '',
        upravaText: 'Rozšiř místnost A o 1m na úkor B (posuň hranici mezi nimi).',
        aiBezi: false,
        aiVysledek: '',
        engine: null,
        renderer: null,

        paketsPredvolby: Object.assign({}, {!! $realneJson !!}, {
            'jednoduchy': {
                granularita: 0.5,
                grid: '..AAAABBBB..\n..AAAABBBB..\n..AAAABBBB..\n..AAAABBBB..',
                mistnosti: [
                    { id: 'A', nazev: 'Obývák', typ: 'LivingRoom' },
                    { id: 'B', nazev: 'Ložnice', typ: 'Bedroom' },
                ],
                otvory: [
                    { id: 'd1', typ: 'dvere', sirka_cm: 80, mezi: ['A','B'], pozice_cm: 100, otevira_do: 'A' },
                    { id: 'o1', typ: 'okno', sirka_cm: 120, mezi: ['A','.'], pozice_cm: 100 },
                ],
                vybaveni: [
                    { id: 'n1', typ: 'BedDouble', kategorie: 'loznice', v_mistnosti: 'B', u_steny: 'V', od_kraje_cm: 30, sirka_cm: 160, hloubka_cm: 200 },
                ],
            },
            'L_tvar': {
                granularita: 0.5,
                grid: '.AAAAAAAA....\n.AAAAAAAA....\n.AAAAAAAA....\n.BBBBBCCCCCC.\n.BBBBBCCCCCC.\n.BBBBBCCCCCC.',
                mistnosti: [
                    { id: 'A', nazev: 'Obývák', typ: 'LivingRoom' },
                    { id: 'B', nazev: 'Kuchyň', typ: 'Kitchen' },
                    { id: 'C', nazev: 'Ložnice', typ: 'Bedroom' },
                ],
                otvory: [
                    { id: 'd1', typ: 'dvere', sirka_cm: 80, mezi: ['A','B'], pozice_cm: 100, otevira_do: 'A' },
                    { id: 'd2', typ: 'dvere', sirka_cm: 80, mezi: ['B','C'], pozice_cm: 50, otevira_do: 'C' },
                    { id: 'd3', typ: 'dvere', sirka_cm: 90, mezi: ['A','.'], pozice_cm: 100 },
                    { id: 'o1', typ: 'okno', sirka_cm: 150, mezi: ['A','.'], pozice_cm: 250 },
                    { id: 'o2', typ: 'okno', sirka_cm: 120, mezi: ['C','.'], pozice_cm: 150 },
                ],
                vybaveni: [
                    { id: 'n1', typ: 'BedDouble', kategorie: 'loznice', v_mistnosti: 'C', u_steny: 'S', od_kraje_cm: 50, sirka_cm: 160, hloubka_cm: 200 },
                    { id: 'n2', typ: 'Sofa', kategorie: 'obyvak', v_mistnosti: 'A', u_steny: 'J', od_kraje_cm: 100, sirka_cm: 220, hloubka_cm: 90 },
                ],
            },
            'T_tvar_5': {
                granularita: 0.25,
                grid: '....AAAAAAAA....\n....AAAAAAAA....\n....AAAAAAAA....\n....AAAAAAAA....\nBBBBBBBBCCCCCCCC\nBBBBBBBBCCCCCCCC\nBBBBBBBBCCCCCCCC\nBBBBBBBBCCCCCCCC\nDDDDDDDDEEEEEEEE\nDDDDDDDDEEEEEEEE\nDDDDDDDDEEEEEEEE',
                mistnosti: [
                    { id: 'A', nazev: 'Předsíň', typ: 'Hallway' },
                    { id: 'B', nazev: 'Obývák', typ: 'LivingRoom' },
                    { id: 'C', nazev: 'Kuchyň', typ: 'Kitchen' },
                    { id: 'D', nazev: 'Ložnice 1', typ: 'Bedroom' },
                    { id: 'E', nazev: 'Ložnice 2', typ: 'Bedroom' },
                ],
                otvory: [
                    { id: 'd1', typ: 'dvere', sirka_cm: 80, mezi: ['A','B'], pozice_cm: 50, otevira_do: 'B' },
                    { id: 'd2', typ: 'dvere', sirka_cm: 80, mezi: ['A','C'], pozice_cm: 50, otevira_do: 'C' },
                    { id: 'd3', typ: 'dvere', sirka_cm: 70, mezi: ['B','D'], pozice_cm: 50, otevira_do: 'D' },
                    { id: 'd4', typ: 'dvere', sirka_cm: 70, mezi: ['C','E'], pozice_cm: 50, otevira_do: 'E' },
                    { id: 'd5', typ: 'dvere', sirka_cm: 90, mezi: ['A','.'], pozice_cm: 100 },
                ],
                vybaveni: [],
            },
        }),

        init() {
            this.engine = new StavebniEngine({ pxPerM: 80 });
            const wrap = document.getElementById('pe-canvas-container');
            this.stage = new Konva.Stage({
                container: 'pe-canvas-container',
                width: wrap.clientWidth,
                height: wrap.clientHeight,
            });
            this.renderer = new KonvaRenderer(this.stage, this.engine);

            // Pan + zoom
            this.stage.draggable(true);
            this.stage.on('wheel', e => {
                e.evt.preventDefault();
                const oldScale = this.stage.scaleX();
                const pointer = this.stage.getPointerPosition() || { x: this.stage.width()/2, y: this.stage.height()/2 };
                const mp = { x: (pointer.x - this.stage.x()) / oldScale, y: (pointer.y - this.stage.y()) / oldScale };
                const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
                this.stage.scale({ x: newScale, y: newScale });
                this.stage.position({ x: pointer.x - mp.x * newScale, y: pointer.y - mp.y * newScale });
                this.renderer.renderGrid && this.renderer.renderGrid();
            });

            // Pokud existuje reálná předvolba, načti tu nejdřív; jinak L_tvar
            const klice = Object.keys(this.paketsPredvolby);
            const realna = klice.find(k => k.startsWith('#'));
            this.loadPredvolba(realna || 'L_tvar');

            window.addEventListener('resize', () => {
                this.stage.width(wrap.clientWidth);
                this.stage.height(wrap.clientHeight);
                this.renderer.render();
            });
        },

        fitView() {
            if (!this.engine || this.engine.walls.size === 0) return;
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const node of this.engine.nodes.values()) {
                minX = Math.min(minX, node.x); minY = Math.min(minY, node.y);
                maxX = Math.max(maxX, node.x); maxY = Math.max(maxY, node.y);
            }
            const pad = 60;
            const cw = this.stage.width() - pad * 2;
            const ch = this.stage.height() - pad * 2;
            const scale = Math.min(cw / (maxX - minX || 1), ch / (maxY - minY || 1), 2);
            const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
            this.stage.scale({ x: scale, y: scale });
            this.stage.position({ x: this.stage.width() / 2 - cx * scale, y: this.stage.height() / 2 - cy * scale });
        },

        loadPredvolba(key) {
            const p = this.paketsPredvolby[key];
            if (!p) return;
            this.paketText = JSON.stringify(p, null, 2);
            this.paketDirty = true;
            this.nacist();
        },

        nacist() {
            this.chyba = '';
            this.aiVysledek = '';
            let paket;
            try {
                paket = JSON.parse(this.paketText);
            } catch (e) {
                this.chyba = 'Špatný JSON: ' + e.message;
                return;
            }
            try {
                const result = this.engine.fromAsciiPlus(paket);
                if (!result.ok) {
                    this.chyba = 'Engine: ' + result.chyba;
                    return;
                }
                this.status = `✓ ${result.stats.prostory} prostorů, ${result.stats.walls} stěn, ${result.stats.openings} otvorů, ${result.stats.vybaveni} vybavení`;
                this.fitView();
                this.renderer.render();
                this.paketDirty = false;
            } catch (e) {
                this.chyba = 'Render selhal: ' + e.message;
                console.error(e);
            }
        },

        async aiUprava() {
            if (this.aiBezi) return;
            this.aiBezi = true;
            this.chyba = '';
            this.aiVysledek = '';
            let paket;
            try {
                paket = JSON.parse(this.paketText);
            } catch (e) {
                this.chyba = 'Špatný JSON: ' + e.message;
                this.aiBezi = false;
                return;
            }
            try {
                const csrf = document.querySelector('meta[name="csrf-token"]').content;
                const r = await fetch('{{ route("masterteam.koncept.testPaketEUprava") }}', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
                    body: JSON.stringify({ paket, uprava: this.upravaText }),
                });
                const json = await r.json();
                if (!json.ok) {
                    this.chyba = 'AI: ' + json.chyba;
                    if (json.raw) console.log('Raw AI response:', json.raw);
                    return;
                }
                this.aiVysledek = '✓ AI vrátila upravený paket. Načítám...';
                this.paketText = JSON.stringify(json.paket, null, 2);
                this.nacist();
            } catch (e) {
                this.chyba = 'Síťová chyba: ' + e.message;
            } finally {
                this.aiBezi = false;
            }
        },
    };
}
</script>
</x-layouts.app>
