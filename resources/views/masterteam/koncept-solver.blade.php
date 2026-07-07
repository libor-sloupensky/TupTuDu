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
            ROOMS.forEach(x => x.cap = x.mimo ? 1 : (x.id === 'chodba' ? 3 : 2));   // max. počet kostek místnosti

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

        // ── Sloty (místnost = 1..cap kostek) + řešič ─────────────────
        let SLOTS = [];
        // které místnosti mají porušené ukotvení + kam se natáhnout (cíl)
        function brokenInfo(lf) {
            const info = [];
            anchors.forEach(an => {
                if (anchorOk(an, lf)) return;
                const fk = IDX[an.from]; if (fk == null || ROOMS[fk].cap <= 1 || ROOMS[fk].mimo) return;
                let tp = null;
                if (an.target.type === 'room') { const tb = boxesIn(lf, IDX[an.target.id]); if (tb.length) { let big = tb[0]; tb.forEach(r => { if (r.w * r.h > big.w * big.h) big = r; }); tp = { x: big.x + big.w / 2, y: big.y + big.h / 2 }; } }
                else tp = { x: an.target.x, y: an.target.y };
                if (tp) info.push({ room: fk, tp });
            });
            return info;
        }
        function buildSlots(problem) {
            const slots = ROOMS.map((r, i) => ({ room: i, area: r.area, p: [pt[i].x, pt[i].y] }));
            if (problem && problem.length && Math.random() < 0.6) {
                // cílené: rozděl problémovou místnost a natáhni 2. kostku k nesplněnému cíli
                const pr = problem[(Math.random() * problem.length) | 0], s = slots[pr.room];
                s.area /= 2;
                slots.push({ room: pr.room, area: s.area, p: [s.p[0] + (pr.tp.x - s.p[0]) * 0.45 + (Math.random() - 0.5) * 1.5, s.p[1] + (pr.tp.y - s.p[1]) * 0.45 + (Math.random() - 0.5) * 1.5] });
            } else {
                const nExtra = Math.random() < 0.6 ? 0 : (Math.random() < 0.75 ? 1 : 2);   // preference: většinou žádná kostka navíc
                for (let e = 0; e < nExtra; e++) {
                    const cnt = {}; slots.forEach(s => cnt[s.room] = (cnt[s.room] || 0) + 1);
                    const cand = slots.filter(s => !ROOMS[s.room].mimo && ROOMS[s.room].cap > cnt[s.room] && s.area > 6);
                    if (!cand.length) break;
                    const s = cand[(Math.random() * cand.length) | 0]; s.area /= 2;
                    slots.push({ room: s.room, area: s.area, p: [s.p[0] + (Math.random() - 0.5) * 3, s.p[1] + (Math.random() - 0.5) * 3] });
                }
            }
            return slots;
        }
        function genTree(list) {
            if (list.length === 1) return { leaf: list[0] };
            const xs = list.map(k => PP[k].x), ys = list.map(k => PP[k].y);
            const spx = Math.max(...xs) - Math.min(...xs), spy = Math.max(...ys) - Math.min(...ys);
            const axis = (spx * (0.7 + Math.random() * 0.6) >= spy * (0.7 + Math.random() * 0.6)) ? 0 : 1;
            const sorted = [...list].sort((a, b) => (axis === 0 ? PP[a].x - PP[b].x : PP[a].y - PP[b].y));
            const cut = 1 + Math.floor(Math.random() * (sorted.length - 1));
            return { axis, a: genTree(sorted.slice(0, cut)), b: genTree(sorted.slice(cut)) };
        }
        function areaOf(node) { return node.leaf != null ? SLOTS[node.leaf].area : areaOf(node.a) + areaOf(node.b); }
        function dim(node, x, y, w, h, out) {
            if (node.leaf != null) { out.push({ x, y, w, h, room: SLOTS[node.leaf].room }); return; }
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
        const boxesIn = (lf, k) => lf.filter(l => l.room === k);
        const boxesK = k => layout ? boxesIn(layout, k) : [];
        function roomCenter(k) { const b = boxesK(k); if (!b.length) return null; let big = b[0]; b.forEach(r => { if (r.w * r.h > big.w * big.h) big = r; }); return { x: big.x + big.w / 2, y: big.y + big.h / 2 }; }
        function roomArea(k) { return boxesK(k).reduce((s, r) => s + r.w * r.h, 0); }
        function connected(bx) { if (bx.length <= 1) return true; const seen = new Set([0]), st = [0]; while (st.length) { const j = st.pop(); for (let k = 0; k < bx.length; k++) if (!seen.has(k) && touch(bx[j], bx[k])) { seen.add(k); st.push(k); } } return seen.size === bx.length; }
        function anchorOk(an, lf) {
            const fb = boxesIn(lf, IDX[an.from]); if (!fb.length) return false;
            if (an.target.type === 'room') { const tb = boxesIn(lf, IDX[an.target.id]); return tb.length > 0 && fb.some(a => tb.some(b => touch(a, b))); }
            return fb.some(r => inRect(r, an.target.x, an.target.y));
        }
        function voidOk(v) {
            if (VOID < 0 || !v) return true;
            if (voidAnchor) { const cs = [[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h]]; return cs.some(c => Math.hypot(c[0] - voidAnchor.x, c[1] - voidAnchor.y) < 0.4); }
            return true;
        }
        function evalLeaves(lf) {
            const g = {}; lf.forEach(l => { (g[l.room] = g[l.room] || []).push(l); });
            for (let i = 0; i < ROOMS.length; i++) { const b = g[i]; if (!b) return null; if (b.length > ROOMS[i].cap) return null; if (!connected(b)) return null; }
            let sat = 0; anchors.forEach(an => { if (anchorOk(an, lf)) sat++; });
            let dimPen = 0, areaErr = 0, boxPen = 0;
            for (let i = 0; i < ROOMS.length; i++) {
                if (ROOMS[i].mimo) continue;
                const b = g[i]; boxPen += b.length - 1;
                areaErr += Math.abs(b.reduce((s, r) => s + r.w * r.h, 0) - ROOMS[i].area);
                b.forEach(r => { const sh = Math.min(r.w, r.h), lo = Math.max(r.w, r.h); if (sh < ROOMS[i].min) dimPen += (ROOMS[i].min - sh) ** 2 * 10; const a = lo / sh; if (a > ROOMS[i].asp) dimPen += (a - ROOMS[i].asp) ** 2; });
            }
            let voidPen = 0;
            if (VOID >= 0) { const v = g[VOID][0]; if (!voidOk(v)) voidPen = 15; if (voidAnchor && v) { const cs = [[v.x, v.y], [v.x + v.w, v.y], [v.x, v.y + v.h], [v.x + v.w, v.y + v.h]]; voidPen += Math.min(...cs.map(c => Math.hypot(c[0] - voidAnchor.x, c[1] - voidAnchor.y))); } }
            return { sat, val: sat * 1e6 - boxPen * 1500 - dimPen * 1e3 - voidPen * 800 - areaErr };   // boxPen = preference obdélníků
        }
        function solve(N) {
            let best = null, bv = -Infinity, problem = [];
            for (let t = 0; t < N; t++) {
                SLOTS = buildSlots(problem);
                PP = SLOTS.map(s => ({ x: s.p[0] + (Math.random() - 0.5) * 3.5, y: s.p[1] + (Math.random() - 0.5) * 3.5 }));
                const out = []; dim(genTree(SLOTS.map((_, k) => k)), 0, 0, W, H, out);
                const ev = evalLeaves(out);
                if (ev && ev.val > bv) { bv = ev.val; best = out; problem = brokenInfo(out); }   // zaměř hledání na porušená ukotvení
            }
            if (best) layout = best;
        }

        // ── Geometrie ukotvení (v metrech) ───────────────────────────
        const cxr = r => r.x + r.w / 2, cyr = r => r.y + r.h / 2;
        function anchorGeom(an) {
            const fc = roomCenter(IDX[an.from]); if (!fc) return null;
            let tc;
            if (an.target.type === 'room') { tc = roomCenter(IDX[an.target.id]); if (!tc) return null; }
            else tc = { x: an.target.x, y: an.target.y };
            return { fc, tc, handle: { x: fc.x + (tc.x - fc.x) * 0.74, y: fc.y + (tc.y - fc.y) * 0.74 }, mid: { x: (fc.x + tc.x) / 2, y: (fc.y + tc.y) / 2 } };
        }
        function roomAt(x, y) { if (!layout) return -1; for (const l of layout) { if (!ROOMS[l.room].mimo && x >= l.x && x <= l.x + l.w && y >= l.y && y <= l.y + l.h) return l.room; } return -1; }
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
            if (dirty) { solve(drag && drag.type === 'room' ? 5000 : Math.min(70000, 14000 + ROOMS.length * 4000)); dirty = false; }
            if (!layout || !layout.length) return;
            ctx.clearRect(0, 0, cv.width, cv.height);
            // výplně kostek (stejná barva = sjednocení místnosti)
            layout.forEach(l => { if (ROOMS[l.room].mimo) return; ctx.fillStyle = ROOMS[l.room].barva; ctx.fillRect(mx(l.x), mx(l.y), l.w * PX, l.h * PX); });
            // výřez (mimo dům) šrafovaně
            const vb = VOID >= 0 ? boxesK(VOID)[0] : null;
            if (vb) {
                ctx.save(); ctx.beginPath(); ctx.rect(mx(vb.x), mx(vb.y), vb.w * PX, vb.h * PX); ctx.clip();
                ctx.fillStyle = '#ececec'; ctx.fillRect(mx(vb.x), mx(vb.y), vb.w * PX, vb.h * PX);
                ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 1; ctx.beginPath();
                for (let d = 0; d < (vb.w + vb.h) * PX; d += 12) { ctx.moveTo(mx(vb.x) + d, mx(vb.y)); ctx.lineTo(mx(vb.x), mx(vb.y) + d); }
                ctx.stroke(); ctx.restore();
            }
            // hrany mezi kostkami: různé místnosti = zeď; stejná místnost = čárkovaný spoj (diagnostika)
            for (let i = 0; i < layout.length; i++) for (let j = i + 1; j < layout.length; j++) {
                const A = layout[i], B = layout[j];
                let seg = null;
                if (eq(A.x + A.w, B.x) || eq(B.x + B.w, A.x)) { const x = eq(A.x + A.w, B.x) ? A.x + A.w : B.x + B.w, y0 = Math.max(A.y, B.y), y1 = Math.min(A.y + A.h, B.y + B.h); if (y1 - y0 > 0.05) seg = [x, y0, x, y1]; }
                else if (eq(A.y + A.h, B.y) || eq(B.y + B.h, A.y)) { const y = eq(A.y + A.h, B.y) ? A.y + A.h : B.y + B.h, x0 = Math.max(A.x, B.x), x1 = Math.min(A.x + A.w, B.x + B.w); if (x1 - x0 > 0.05) seg = [x0, y, x1, y]; }
                if (!seg) continue;
                if (A.room === B.room) { if (ROOMS[A.room].mimo) continue; ctx.strokeStyle = 'rgba(200,60,60,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); }
                else { ctx.strokeStyle = '#4a453c'; ctx.lineWidth = 2; ctx.setLineDash([]); }
                ctx.beginPath(); ctx.moveTo(mx(seg[0]), mx(seg[1])); ctx.lineTo(mx(seg[2]), mx(seg[3])); ctx.stroke();
            }
            ctx.setLineDash([]);
            // obvod domu
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3; ctx.strokeRect(mx(0), mx(0), W * PX, H * PX);

            // popisky (jeden na místnost)
            ctx.textAlign = 'center';
            ROOMS.forEach((room, k) => {
                const c = roomCenter(k); if (!c) return;
                if (room.mimo) { ctx.fillStyle = '#9a9a9a'; ctx.font = 'italic 11px sans-serif'; ctx.fillText('mimo dům', mx(c.x), mx(c.y) + 4); return; }
                const b = boxesK(k), A = roomArea(k), sh = Math.min(...b.map(r => Math.min(r.w, r.h))), tenke = sh < room.min - 0.01;
                ctx.fillStyle = tenke ? '#b02020' : '#2a2a2a';
                ctx.font = '600 12px sans-serif'; ctx.fillText(room.nazev + (b.length > 1 ? ' (L)' : ''), mx(c.x), mx(c.y) - 5);
                ctx.font = '11px sans-serif'; ctx.fillText(A.toFixed(1) + ' m² · ' + sh.toFixed(1) + ' m' + (tenke ? ' ⚠' : ''), mx(c.x), mx(c.y) + 9);
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
                ROOMS.forEach((room, k) => { if (room.mimo) return; const c = roomCenter(k); if (!c) return; ctx.fillStyle = '#fff'; ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(mx(c.x), mx(c.y), 4, 0, 7); ctx.fill(); ctx.stroke(); });
                // ukotvení výřezu
                if (VOID >= 0 && voidAnchor && vb) {
                    ctx.strokeStyle = 'rgba(120,120,120,.9)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(mx(cxr(vb)), mx(cyr(vb))); ctx.lineTo(mx(voidAnchor.x), mx(voidAnchor.y)); ctx.stroke(); ctx.setLineDash([]);
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
            if (VOID >= 0 && voidAnchor && near(voidAnchor, p.x, p.y, 0.4)) { const v = boxesK(VOID)[0]; if (v) { drag = { type: 'voidAnchor', src: { x: cxr(v), y: cyr(v) } }; return; } }
            // 3) volný bod (střed místnosti) → nové ukotvení
            const k = roomAt(p.x, p.y);
            const c = k >= 0 ? roomCenter(k) : null;
            if (c && near(c, p.x, p.y, 0.4)) { drag = { type: 'newAnchor', from: ROOMS[k].id, src: c }; return; }
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
