<x-layouts.app title="Koncept solver — TupTuDu">
    <style>
        .ks-wrap { padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; }
        .ks-layout { display: flex; gap: 1.25rem; align-items: flex-start; flex-wrap: wrap; }
        .ks-controls { width: 250px; flex: 0 0 250px; font-size: .9rem; }
        .ks-controls h3 { margin: .6rem 0 .5rem; font-size: .95rem; }
        .ks-controls h3:first-child { margin-top: 0; }
        .ks-shapes { display: flex; gap: .4rem; margin-bottom: .8rem; }
        .ks-shape { flex: 1; padding: .45rem 0; border: 1px solid var(--c-border); border-radius: 8px; background: var(--c-surface); cursor: pointer; text-align: center; font-weight: 700; line-height: 1.1; }
        .ks-shape small { display: block; font-size: .62rem; font-weight: 500; opacity: .8; }
        .ks-shape.active { background: var(--c-primary, #d97706); color: #fff; border-color: transparent; }
        .ks-row { display: flex; justify-content: space-between; align-items: center; margin: .4rem 0; gap: .5rem; }
        .ks-row input[type=range] { flex: 1; }
        .ks-mroom { display: flex; justify-content: space-between; align-items: center; margin: .3rem 0; gap: .5rem; }
        .ks-mroom > label { display: flex; align-items: center; gap: .35rem; }
        .ks-sub { display: flex; justify-content: space-between; align-items: center; margin: .18rem 0 .18rem 1.1rem; gap: .5rem; color: var(--c-text-secondary); font-size: .85rem; }
        .ks-pctin { width: 3.2rem; padding: .15rem .3rem; text-align: right; }
        .ks-cnt { width: 3.2rem; padding: .15rem .3rem; text-align: center; }
        .ks-pctwrap { white-space: nowrap; color: var(--c-text-secondary); }
        .ks-controls hr { border: none; border-top: 1px solid var(--c-border); margin: .8rem 0; }
        .ks-canvas-wrap { flex: 1; min-width: 360px; }
        .ks-bar { display: flex; gap: 1rem; align-items: center; margin: 0 0 .8rem; flex-wrap: wrap; }
        #ks-canvas { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); cursor: default; max-width: 100%; }
        .ks-legend { font-size: .82rem; color: var(--c-text-secondary); margin-top: .5rem; }
        .ks-stav { font-weight: 700; font-size: .9rem; }
        .ks-stav.ok { color: var(--c-ok); } .ks-stav.bad { color: var(--c-error); }
    </style>

    <div class="ks-wrap">
        <h1>Koncept solver (v12) — editovatelná ukotvení</h1>

        <div class="ks-layout">
            <div class="ks-controls">
                <h3>Tvar domu</h3>
                <div class="ks-shapes" id="ks-shapes">
                    <div class="ks-shape" data-shape="ctverec">▢<small>čtverec</small></div>
                    <div class="ks-shape active" data-shape="obdelnik">▭<small>obdélník</small></div>
                    <div class="ks-shape" data-shape="L">L<small>L-dům</small></div>
                    <div class="ks-shape" data-shape="U">U<small>U-dům</small></div>
                </div>
                <div class="ks-row"><label>Velikost domu</label><strong id="ks-size-val">110 m²</strong></div>
                <input type="range" id="ks-size" min="60" max="220" step="5" value="110" style="width:100%">
                <div class="ks-row"><label>Rozměr</label><span class="ks-pctwrap"><input id="ks-dimw" type="number" step="0.1" min="3" class="ks-cnt"> × <input id="ks-dimh" type="number" step="0.1" min="3" class="ks-cnt"> m</span></div>
                <hr>
                <h3>Místnosti <span style="font-weight:400;color:var(--c-text-secondary);font-size:.75rem">(% domu)</span></h3>
                <div id="ks-rooms"></div>
                <hr>
                <button id="ks-reset" class="btn btn-primary" style="width:100%">Přeskládat</button>
                <label style="display:flex;gap:.35rem;align-items:center;margin-top:.6rem;font-size:.82rem;"><input type="checkbox" id="ks-graf" checked> zobrazit ukotvení</label>
            </div>

            <div class="ks-canvas-wrap">
                <div class="ks-bar"><span id="ks-stav" class="ks-stav"></span></div>
                <canvas id="ks-canvas"></canvas>
                <div class="ks-legend"><strong>Ukotvení</strong> (čára): úchop u konce = <em>přetáhni cíl</em> na jinou místnost nebo na stěnu (roh); <strong>×</strong> uprostřed = smazat; <strong>volný bod ve středu místnosti</strong> = přetáhni pro nové ukotvení. Zelená = drží, červená = nesplněno. Tělo místnosti táhni pro přeskládání.</div>
            </div>
        </div>
    </div>

    <script>
    (function () {
        const cv = document.getElementById('ks-canvas');
        const ctx = cv.getContext('2d');
        const PAD = 18, MAXW = 640, MAXH = 460;
        const eq = (p, q) => Math.abs(p - q) < 1e-6;

        const cfg = { shape: 'obdelnik', size: 110, customDim: false, dimW: 0, dimH: 0, zadveri: true, chodba: true, kuchyn: false, technicka: false, spiz: false, loznice: 2, detske: 1, koupelny: 1 };
        const pctStore = {};

        let ROOMS = [], IDX = {};
        let W = 12, H = 8, PX = 50, VOID = -1, USABLE = 110;
        let pt = [], layout = null, dirty = true, PP = [];
        let anchors = [];       // {from, target:{type:'room',id}|{type:'wall',x,y}}
        let voidAnchor = null;  // {x,y} bod na stěně pro výřez
        let drag = null, curPos = null, clickStart = null, moved = false;
        const mx = m => PAD + m * PX;
        const nm = id => ROOMS[IDX[id]] ? ROOMS[IDX[id]].nazev : id;

        // ── Program ──────────────────────────────────────────────────
        function buildProgram(P) {
            const r = [];
            const add = (id, nazev, dp, barva, min, asp) => r.push({ id, nazev, dp, barva, min, asp, pct: pctStore[id] != null ? pctStore[id] : dp });
            if (P.zadveri) add('zadveri', 'Zádveří', 4, '#c9d7e8', 1.1, 3.0);
            if (P.chodba) add('chodba', 'Chodba', 9, '#e6e0d2', 1.1, 99);
            if (P.kuchyn) { add('obyvak', 'Obývák', 22, '#f2d7a8', 3.0, 1.8); add('kuchyn', 'Kuchyň', 9, '#f2c98a', 2.0, 2.0); }
            else add('obyvak', 'Obývák+kuchyň', 28, '#f2d7a8', 3.0, 1.8);
            for (let i = 0; i < P.loznice; i++) add('loznice' + i, 'Ložnice' + (P.loznice > 1 ? ' ' + (i + 1) : ''), 14, '#cfe3cf', 2.4, 2.0);
            for (let i = 0; i < P.detske; i++) add('pokoj' + i, 'Pokoj' + (P.detske > 1 ? ' ' + (i + 1) : ''), 11, '#d7e8cf', 2.4, 2.0);
            for (let i = 0; i < P.koupelny; i++) add('koupelna' + i, 'Koupelna' + (P.koupelny > 1 ? ' ' + (i + 1) : ''), 6, '#b9dfe6', 1.6, 2.5);
            add('wc', 'WC', 2, '#b9dfe6', 0.9, 2.5);
            if (P.technicka) add('technicka', 'Technická', 5, '#e0dedc', 1.5, 2.5);
            if (P.spiz) add('spiz', 'Spíž', 3, '#efe6d0', 1.2, 3.0);

            const maVyrez = (P.shape === 'L' || P.shape === 'U');
            // rozměry: buď z návrhu (m² + tvar), nebo přesně zadané uživatelem
            if (P.customDim && P.dimW >= 3 && P.dimH >= 3) {
                W = P.dimW; H = P.dimH;
                USABLE = maVyrez ? (W * H) / 1.18 : W * H;   // odečti výřez (18 % využitelné)
                P.size = Math.round(USABLE);
            } else {
                USABLE = P.size;
                const bA = maVyrez ? USABLE * 1.18 : USABLE;
                if (P.shape === 'ctverec') { W = H = Math.sqrt(bA); } else { W = Math.sqrt(bA * 1.5); H = bA / W; }
                P.dimW = W; P.dimH = H;
            }
            const sp = r.reduce((s, x) => s + x.pct, 0) || 1;
            r.forEach(x => x.area = x.pct / sp * USABLE);
            if (maVyrez) r.push({ id: '_void', nazev: 'mimo dům', pct: 0, area: USABLE * 0.18, barva: null, min: 0.5, asp: 99, mimo: true });

            ROOMS = r; IDX = {}; ROOMS.forEach((x, i) => IDX[x.id] = i);
            VOID = IDX['_void'] != null ? IDX['_void'] : -1;

            const zc = { obyvak: [W * 0.25, H * 0.55], chodba: [W * 0.5, H * 0.5], zadveri: [W * 0.5, H * 0.12], kuchyn: [W * 0.32, H * 0.85] };
            let ni = 0;
            ROOMS.forEach(x => {
                if (zc[x.id]) x.base = zc[x.id].slice();
                else if (x.mimo) x.base = [W * 0.85, H * 0.12];
                else { const cols = 3; x.base = [W * (0.55 + (ni % cols) * 0.18), H * (0.25 + Math.floor(ni / cols) * 0.28)]; ni++; }
                x.base[0] = Math.max(0.5, Math.min(W - 0.5, x.base[0])); x.base[1] = Math.max(0.5, Math.min(H - 0.5, x.base[1]));
            });
            PX = Math.min(MAXW / W, MAXH / H);
            cv.width = W * PX + 2 * PAD; cv.height = H * PX + 2 * PAD;
        }
        function normalizeAreas() { const real = ROOMS.filter(x => !x.mimo), s = real.reduce((a, x) => a + x.pct, 0) || 1; real.forEach(x => x.area = x.pct / s * USABLE); }
        function sumPct() { return Math.round(ROOMS.filter(x => !x.mimo).reduce((a, x) => a + x.pct, 0)); }

        // výchozí cíl ukotvení pro danou místnost (použije se JEN pro nově přidané)
        function defaultTargetFor(id) {
            const hub = cfg.chodba ? 'chodba' : 'obyvak';
            if (id === 'obyvak') return null;
            if (id === 'chodba' || id === 'kuchyn') return 'obyvak';
            if (id === 'spiz') return cfg.kuchyn ? 'kuchyn' : 'obyvak';
            if (id === 'zadveri' || id === 'wc' || id === 'technicka' || id.startsWith('koupelna') || id.startsWith('loznice') || id.startsWith('pokoj')) return hub;
            return null;
        }
        // zachovej existující ukotvení; přidej výchozí jen pro NOVÉ místnosti; smaž visící
        function reconcileAnchors(prevIds) {
            anchors = anchors.filter(a => IDX[a.from] != null && (a.target.type === 'wall' || IDX[a.target.id] != null));
            ROOMS.forEach(x => {
                if (x.mimo || prevIds.has(x.id)) return;      // jen nové místnosti
                const t = defaultTargetFor(x.id);
                if (t && IDX[t] != null && t !== x.id) anchors.push({ from: x.id, target: { type: 'room', id: t } });
            });
        }
        function reconcileVoidAnchor() {
            if (VOID < 0) { voidAnchor = null; return; }
            if (!voidAnchor) voidAnchor = (cfg.shape === 'U') ? { x: W * 0.5, y: 0 } : { x: W, y: 0 };
            else voidAnchor = snapBoundary(voidAnchor.x, voidAnchor.y);
        }

        function renderControls() {
            const pin = id => (IDX[id] != null) ? '<span class="ks-pctwrap"><input type="number" class="ks-pctin" step="1" min="1" data-pct="' + id + '" value="' + Math.round(ROOMS[IDX[id]].pct) + '"> %</span>' : '';
            const rowCheck = (tog, label, roomId) => '<div class="ks-mroom"><label><input type="checkbox" data-toggle="' + tog + '"' + (cfg[tog] ? ' checked' : '') + '> ' + label + '</label>' + (cfg[tog] ? pin(roomId) : '') + '</div>';
            const rowFixed = (roomId, label) => '<div class="ks-mroom"><span>' + label + '</span>' + pin(roomId) + '</div>';
            const rowCount = (cntKey, label, pref) => {
                let h = '<div class="ks-mroom" style="justify-content:flex-start;gap:.5rem"><label>' + label + '</label><input type="number" class="ks-cnt" data-count="' + cntKey + '" min="0" max="5" value="' + cfg[cntKey] + '"></div>';
                for (let i = 0; i < cfg[cntKey]; i++) { const id = pref + i; if (IDX[id] != null) h += '<div class="ks-sub"><span>• ' + ROOMS[IDX[id]].nazev + '</span>' + pin(id) + '</div>'; }
                return h;
            };
            let h = '';
            h += rowCheck('zadveri', 'Zádveří', 'zadveri');
            h += rowCheck('chodba', 'Chodba', 'chodba');
            h += rowFixed('obyvak', cfg.kuchyn ? 'Obývák' : 'Obývák+kuchyň');
            h += rowCheck('kuchyn', 'Kuchyň zvlášť', 'kuchyn');
            h += rowCount('loznice', 'Ložnice', 'loznice');
            h += rowCount('detske', 'Pokoje', 'pokoj');
            h += rowCount('koupelny', 'Koupelny', 'koupelna');
            h += rowFixed('wc', 'WC');
            h += rowCheck('technicka', 'Technická místnost', 'technicka');
            h += rowCheck('spiz', 'Spíž', 'spiz');
            h += '<div class="ks-mroom" style="border-top:1px solid var(--c-border);padding-top:.35rem;margin-top:.4rem;"><span>Součet</span><strong id="ks-pctsum">' + sumPct() + ' %</strong></div>';
            document.getElementById('ks-rooms').innerHTML = h;
        }

        function reset() { pt = ROOMS.map(x => ({ x: Math.max(0.2, Math.min(W - 0.2, x.base[0] + (Math.random() - 0.5) * 2)), y: Math.max(0.2, Math.min(H - 0.2, x.base[1] + (Math.random() - 0.5) * 2)) })); drag = null; dirty = true; }
        function syncSizeUI() {
            const s = document.getElementById('ks-size'); if (s) s.value = Math.max(60, Math.min(220, Math.round(cfg.size)));
            const sv = document.getElementById('ks-size-val'); if (sv) sv.textContent = Math.round(cfg.size) + ' m²';
            const dw = document.getElementById('ks-dimw'), dh = document.getElementById('ks-dimh');
            if (dw) dw.value = W.toFixed(1); if (dh) dh.value = H.toFixed(1);
        }
        function structuralRebuild() { const prev = new Set(ROOMS.map(x => x.id)); buildProgram(cfg); reconcileAnchors(prev); reconcileVoidAnchor(); renderControls(); syncSizeUI(); reset(); }
        function geomRebuild() { buildProgram(cfg); if (voidAnchor) voidAnchor = snapBoundary(voidAnchor.x, voidAnchor.y); renderControls(); syncSizeUI(); reset(); }

        // ── Slicing + řešič ──────────────────────────────────────────
        function genTree(list) {
            if (list.length === 1) return { leaf: list[0] };
            const xs = list.map(k => PP[k].x), ys = list.map(k => PP[k].y);
            const spx = Math.max(...xs) - Math.min(...xs), spy = Math.max(...ys) - Math.min(...ys);
            const axis = (spx * (0.7 + Math.random() * 0.6) >= spy * (0.7 + Math.random() * 0.6)) ? 0 : 1;
            const sorted = [...list].sort((a, b) => (axis === 0 ? PP[a].x - PP[b].x : PP[a].y - PP[b].y));
            const cut = 1 + Math.floor(Math.random() * (sorted.length - 1));
            return { axis, a: genTree(sorted.slice(0, cut)), b: genTree(sorted.slice(cut)) };
        }
        function areaOf(node) { return node.leaf != null ? ROOMS[node.leaf].area : areaOf(node.a) + areaOf(node.b); }
        function dim(node, x, y, w, h, out) {
            if (node.leaf != null) { out[node.leaf] = { x, y, w, h }; return; }
            const f = areaOf(node.a) / (areaOf(node.a) + areaOf(node.b));
            if (node.axis === 0) { dim(node.a, x, y, w * f, h, out); dim(node.b, x + w * f, y, w * (1 - f), h, out); }
            else { dim(node.a, x, y, w, h * f, out); dim(node.b, x, y + h * f, w, h * (1 - f), out); }
        }
        function touch(A, B) {
            if (!A || !B) return false;
            const yov = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
            const xov = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
            if ((eq(A.x + A.w, B.x) || eq(B.x + B.w, A.x)) && yov > 0.05) return true;
            if ((eq(A.y + A.h, B.y) || eq(B.y + B.h, A.y)) && xov > 0.05) return true;
            return false;
        }
        function inRect(r, x, y) { return r && x >= r.x - 1e-6 && x <= r.x + r.w + 1e-6 && y >= r.y - 1e-6 && y <= r.y + r.h + 1e-6; }
        function anchorOk(an, out) {
            const f = out[IDX[an.from]]; if (!f) return false;
            if (an.target.type === 'room') { const t = out[IDX[an.target.id]]; return t && touch(f, t); }
            return inRect(f, an.target.x, an.target.y);   // stěnový bod uvnitř/na místnosti
        }
        function voidOk(v) {
            if (VOID < 0 || !v) return true;
            if (voidAnchor) { const cs = [[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h]]; return cs.some(c => Math.hypot(c[0] - voidAnchor.x, c[1] - voidAnchor.y) < 0.4); }
            return true;
        }
        function skore(out) {
            let sat = 0;
            anchors.forEach(an => { if (anchorOk(an, out)) sat++; });
            let dimPen = 0, areaErr = 0;
            out.forEach((rr, k) => {
                if (!rr || ROOMS[k].mimo) return;
                const sh = Math.min(rr.w, rr.h), lo = Math.max(rr.w, rr.h);
                if (sh < ROOMS[k].min) dimPen += (ROOMS[k].min - sh) ** 2 * 10;
                const a = lo / sh; if (a > ROOMS[k].asp) dimPen += (a - ROOMS[k].asp) ** 2;
                areaErr += Math.abs(rr.w * rr.h - ROOMS[k].area);
            });
            let voidPen = 0;
            if (VOID >= 0) { const v = out[VOID]; if (!voidOk(v)) voidPen = 15; if (voidAnchor && v) { const cs = [[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h]]; voidPen += Math.min(...cs.map(c => Math.hypot(c[0] - voidAnchor.x, c[1] - voidAnchor.y))); } }
            return { sat, val: sat * 1e6 - dimPen * 1e3 - voidPen * 800 - areaErr };
        }
        function solve(N) {
            let best = null, bv = -Infinity;
            const all = ROOMS.map((_, k) => k);
            for (let t = 0; t < N; t++) {
                PP = pt.map(p => ({ x: p.x + (Math.random() - 0.5) * 3.5, y: p.y + (Math.random() - 0.5) * 3.5 }));
                const out = []; dim(genTree(all), 0, 0, W, H, out);
                const sc = skore(out);
                if (sc.val > bv) { bv = sc.val; best = out; }
            }
            layout = best;
        }

        // ── Geometrie ukotvení (v metrech) ───────────────────────────
        const cxr = r => r.x + r.w / 2, cyr = r => r.y + r.h / 2;
        function anchorGeom(an) {
            const f = layout[IDX[an.from]]; if (!f) return null;
            const fc = { x: cxr(f), y: cyr(f) };
            let tc;
            if (an.target.type === 'room') { const t = layout[IDX[an.target.id]]; if (!t) return null; tc = { x: cxr(t), y: cyr(t) }; }
            else tc = { x: an.target.x, y: an.target.y };
            return { fc, tc, handle: { x: fc.x + (tc.x - fc.x) * 0.74, y: fc.y + (tc.y - fc.y) * 0.74 }, mid: { x: (fc.x + tc.x) / 2, y: (fc.y + tc.y) / 2 } };
        }
        function roomAt(x, y) { if (!layout) return -1; return layout.findIndex((r, k) => r && !ROOMS[k].mimo && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h); }
        function snapBoundary(x, y) {
            x = Math.max(0, Math.min(W, x)); y = Math.max(0, Math.min(H, y));
            const d = [y, H - y, x, W - x], m = Math.min(...d);
            if (m === d[0]) y = 0; else if (m === d[1]) y = H; else if (m === d[2]) x = 0; else x = W;
            return { x, y };
        }
        function dropTarget(x, y) {
            const nearB = Math.min(x, W - x, y, H - y) < 0.55;
            const k = roomAt(x, y);
            if (k >= 0 && !nearB) return { type: 'room', id: ROOMS[k].id };
            return Object.assign({ type: 'wall' }, snapBoundary(x, y));
        }

        // ── Vykreslení ───────────────────────────────────────────────
        const grafEl = document.getElementById('ks-graf');
        function kresli() {
            if (dirty) { solve(drag && drag.type === 'room' ? 4500 : Math.min(60000, 12000 + ROOMS.length * 3500)); dirty = false; }
            if (!layout) return;
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#4a453c';
            layout.forEach((r, k) => { if (!r || ROOMS[k].mimo) return; ctx.fillStyle = ROOMS[k].barva; ctx.fillRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX); ctx.strokeRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX); });
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.strokeRect(mx(0), mx(0), W * PX, H * PX);

            if (VOID >= 0 && layout[VOID]) {
                const v = layout[VOID];
                ctx.save(); ctx.beginPath(); ctx.rect(mx(v.x), mx(v.y), v.w * PX, v.h * PX); ctx.clip();
                ctx.fillStyle = '#ececec'; ctx.fillRect(mx(v.x), mx(v.y), v.w * PX, v.h * PX);
                ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 1; ctx.beginPath();
                for (let d = 0; d < (v.w + v.h) * PX; d += 12) { ctx.moveTo(mx(v.x) + d, mx(v.y)); ctx.lineTo(mx(v.x), mx(v.y) + d); }
                ctx.stroke(); ctx.restore();
                ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.beginPath();
                if (!eq(v.x, 0)) { ctx.moveTo(mx(v.x), mx(v.y)); ctx.lineTo(mx(v.x), mx(v.y + v.h)); }
                if (!eq(v.x + v.w, W)) { ctx.moveTo(mx(v.x + v.w), mx(v.y)); ctx.lineTo(mx(v.x + v.w), mx(v.y + v.h)); }
                if (!eq(v.y, 0)) { ctx.moveTo(mx(v.x), mx(v.y)); ctx.lineTo(mx(v.x + v.w), mx(v.y)); }
                if (!eq(v.y + v.h, H)) { ctx.moveTo(mx(v.x), mx(v.y + v.h)); ctx.lineTo(mx(v.x + v.w), mx(v.y + v.h)); }
                ctx.stroke();
            }

            // popisky
            ctx.textAlign = 'center';
            layout.forEach((r, k) => {
                if (!r) return;
                if (ROOMS[k].mimo) { ctx.fillStyle = '#9a9a9a'; ctx.font = 'italic 11px sans-serif'; ctx.fillText('mimo dům', mx(cxr(r)), mx(cyr(r)) + 4); return; }
                const sh = Math.min(r.w, r.h), tenke = sh < ROOMS[k].min - 0.01;
                ctx.fillStyle = tenke ? '#b02020' : '#2a2a2a';
                ctx.font = '600 12px sans-serif'; ctx.fillText(ROOMS[k].nazev, mx(cxr(r)), mx(cyr(r)) - 5);
                ctx.font = '11px sans-serif'; ctx.fillText((r.w * r.h).toFixed(1) + ' m² · ' + sh.toFixed(1) + ' m' + (tenke ? ' ⚠' : ''), mx(cxr(r)), mx(cyr(r)) + 9);
            });

            // ukotvení
            if (grafEl.checked) {
                anchors.forEach(an => {
                    const g = anchorGeom(an); if (!g) return;
                    const ok = anchorOk(an, layout);
                    ctx.strokeStyle = ok ? 'rgba(30,140,60,.9)' : 'rgba(200,40,40,.95)';
                    ctx.lineWidth = ok ? 2 : 3; ctx.setLineDash(ok ? [] : [5, 4]);
                    ctx.beginPath(); ctx.moveTo(mx(g.fc.x), mx(g.fc.y)); ctx.lineTo(mx(g.tc.x), mx(g.tc.y)); ctx.stroke(); ctx.setLineDash([]);
                    // úchop cíle
                    ctx.fillStyle = ok ? '#1e8c3c' : '#c82828'; ctx.beginPath(); ctx.arc(mx(g.handle.x), mx(g.handle.y), 5, 0, 7); ctx.fill();
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                    // × smazat
                    ctx.strokeStyle = '#888'; ctx.lineWidth = 1.6; const s = 3.2;
                    ctx.beginPath(); ctx.moveTo(mx(g.mid.x) - s, mx(g.mid.y) - s); ctx.lineTo(mx(g.mid.x) + s, mx(g.mid.y) + s); ctx.moveTo(mx(g.mid.x) + s, mx(g.mid.y) - s); ctx.lineTo(mx(g.mid.x) - s, mx(g.mid.y) + s); ctx.stroke();
                });
                // volné body ve středu místností
                layout.forEach((r, k) => { if (!r || ROOMS[k].mimo) return; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx(cxr(r)), mx(cyr(r)), 4, 0, 7); ctx.fill(); ctx.stroke(); });
                // ukotvení výřezu
                if (VOID >= 0 && voidAnchor && layout[VOID]) {
                    const v = layout[VOID];
                    ctx.strokeStyle = 'rgba(120,120,120,.9)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(mx(cxr(v)), mx(cyr(v))); ctx.lineTo(mx(voidAnchor.x), mx(voidAnchor.y)); ctx.stroke(); ctx.setLineDash([]);
                    ctx.fillStyle = '#666'; ctx.beginPath(); ctx.arc(mx(voidAnchor.x), mx(voidAnchor.y), 5, 0, 7); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
                }
                // guma při tažení
                if (drag && (drag.type === 'anchorEnd' || drag.type === 'newAnchor' || drag.type === 'voidAnchor') && curPos) {
                    ctx.strokeStyle = 'rgba(217,119,6,.9)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(mx(drag.src.x), mx(drag.src.y)); ctx.lineTo(mx(curPos.x), mx(curPos.y)); ctx.stroke(); ctx.setLineDash([]);
                }
            }

            const bad = anchors.filter(an => !anchorOk(an, layout)).length;
            const el = document.getElementById('ks-stav');
            el.textContent = 'ukotvení: ' + (anchors.length - bad) + '/' + anchors.length + (bad ? ' · nesplněno: ' + bad : ' ✓');
            el.className = 'ks-stav ' + (bad ? 'bad' : 'ok');
        }
        function smycka() { kresli(); requestAnimationFrame(smycka); }

        // ── Interakce ────────────────────────────────────────────────
        function pos(e) {
            const rect = cv.getBoundingClientRect(), sx = cv.width / rect.width;
            return { x: ((e.clientX - rect.left) * sx - PAD) / PX, y: ((e.clientY - rect.top) * sx - PAD) / PX };
        }
        const near = (a, x, y, r) => a && Math.hypot(a.x - x, a.y - y) < r;
        cv.addEventListener('mousedown', e => {
            const p = pos(e); curPos = p; clickStart = p; moved = false;
            // 1) úchop cíle ukotvení / × (mazání až na puštění)
            for (let i = 0; i < anchors.length; i++) {
                const g = anchorGeom(anchors[i]); if (!g) continue;
                if (near(g.handle, p.x, p.y, 0.4)) { drag = { type: 'anchorEnd', i, src: g.fc }; return; }
                if (near(g.mid, p.x, p.y, 0.22)) { drag = { type: 'del', i }; return; }
            }
            // 2) ukotvení výřezu
            if (VOID >= 0 && voidAnchor && near(voidAnchor, p.x, p.y, 0.4)) { const v = layout[VOID]; drag = { type: 'voidAnchor', src: { x: cxr(v), y: cyr(v) } }; return; }
            // 3) volný bod (střed místnosti) → nové ukotvení
            const k = roomAt(p.x, p.y);
            if (k >= 0 && near({ x: cxr(layout[k]), y: cyr(layout[k]) }, p.x, p.y, 0.4)) { drag = { type: 'newAnchor', from: ROOMS[k].id, src: { x: cxr(layout[k]), y: cyr(layout[k]) } }; return; }
            // 4) tělo místnosti → přeskládat
            if (k >= 0) { drag = { type: 'room', k }; }
        });
        cv.addEventListener('mousemove', e => {
            if (!drag) return; const p = pos(e); curPos = p;
            if (clickStart && Math.hypot(p.x - clickStart.x, p.y - clickStart.y) > 0.25) moved = true;
            if (drag.type === 'room') { pt[drag.k].x = Math.max(0.1, Math.min(W - 0.1, p.x)); pt[drag.k].y = Math.max(0.1, Math.min(H - 0.1, p.y)); dirty = true; }
        });
        window.addEventListener('mouseup', () => {
            if (!drag) return; const p = curPos;
            if (drag.type === 'del') { const g = anchorGeom(anchors[drag.i]); if (!moved && g && near(g.mid, p.x, p.y, 0.35)) { anchors.splice(drag.i, 1); dirty = true; } }
            else if (drag.type === 'anchorEnd') { const t = dropTarget(p.x, p.y); if (!(t.type === 'room' && t.id === anchors[drag.i].from)) { anchors[drag.i].target = t; dirty = true; } }
            else if (drag.type === 'newAnchor') { const t = dropTarget(p.x, p.y); if (!(t.type === 'room' && t.id === drag.from)) { anchors.push({ from: drag.from, target: t }); dirty = true; } }
            else if (drag.type === 'voidAnchor') { voidAnchor = snapBoundary(p.x, p.y); dirty = true; }
            drag = null;
        });

        // ovládání
        document.getElementById('ks-shapes').addEventListener('click', e => { const b = e.target.closest('.ks-shape'); if (!b) return; document.querySelectorAll('.ks-shape').forEach(x => x.classList.remove('active')); b.classList.add('active'); cfg.shape = b.dataset.shape; structuralRebuild(); });
        document.getElementById('ks-size').addEventListener('input', e => { cfg.customDim = false; cfg.size = +e.target.value; geomRebuild(); });
        document.getElementById('ks-dimw').addEventListener('change', e => { cfg.customDim = true; cfg.dimW = Math.max(3, +e.target.value || 3); geomRebuild(); });
        document.getElementById('ks-dimh').addEventListener('change', e => { cfg.customDim = true; cfg.dimH = Math.max(3, +e.target.value || 3); geomRebuild(); });
        const roomsBox = document.getElementById('ks-rooms');
        roomsBox.addEventListener('change', e => {
            const t = e.target;
            if (t.dataset.toggle) { cfg[t.dataset.toggle] = t.checked; structuralRebuild(); }
            else if (t.dataset.count) { const key = t.dataset.count, mn = key === 'koupelny' ? 1 : 0; cfg[key] = Math.max(mn, Math.min(5, +t.value || 0)); structuralRebuild(); }
        });
        roomsBox.addEventListener('input', e => {
            const t = e.target; if (!t.dataset.pct) return;
            const id = t.dataset.pct, v = Math.max(0.5, +t.value || 0.5); pctStore[id] = v; if (IDX[id] != null) ROOMS[IDX[id]].pct = v;
            normalizeAreas(); const el = document.getElementById('ks-pctsum'); if (el) el.textContent = sumPct() + ' %'; dirty = true;
        });
        document.getElementById('ks-reset').addEventListener('click', reset);

        structuralRebuild();
        smycka();
    })();
    </script>
</x-layouts.app>
