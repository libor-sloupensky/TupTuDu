<x-layouts.app title="Koncept solver — TupTuDu">
    <style>
        .ks-wrap { padding: 1.5rem 2rem; max-width: 1100px; margin: 0 auto; }
        .ks-layout { display: flex; gap: 1.25rem; align-items: flex-start; flex-wrap: wrap; }
        .ks-controls { width: 240px; flex: 0 0 240px; font-size: .9rem; }
        .ks-controls h3 { margin: .6rem 0 .5rem; font-size: .95rem; }
        .ks-controls h3:first-child { margin-top: 0; }
        .ks-shapes { display: flex; gap: .4rem; margin-bottom: .8rem; }
        .ks-shape { flex: 1; padding: .45rem 0; border: 1px solid var(--c-border); border-radius: 8px; background: var(--c-surface); cursor: pointer; text-align: center; font-weight: 700; line-height: 1.1; }
        .ks-shape small { display: block; font-size: .62rem; font-weight: 500; opacity: .8; }
        .ks-shape.active { background: var(--c-primary, #d97706); color: #fff; border-color: transparent; }
        .ks-row { display: flex; justify-content: space-between; align-items: center; margin: .4rem 0; gap: .5rem; }
        .ks-row input[type=number] { width: 3.4rem; padding: .2rem .3rem; }
        .ks-row input[type=range] { flex: 1; }
        .ks-controls hr { border: none; border-top: 1px solid var(--c-border); margin: .8rem 0; }
        .ks-canvas-wrap { flex: 1; min-width: 360px; }
        .ks-bar { display: flex; gap: 1rem; align-items: center; margin: 0 0 .8rem; flex-wrap: wrap; }
        #ks-canvas { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); cursor: grab; max-width: 100%; }
        #ks-canvas:active { cursor: grabbing; }
        .ks-legend { font-size: .82rem; color: var(--c-text-secondary); margin-top: .5rem; }
        .ks-stav { font-weight: 700; font-size: .9rem; }
        .ks-stav.ok { color: var(--c-ok); } .ks-stav.bad { color: var(--c-error); }
    </style>

    <div class="ks-wrap">
        <h1>Koncept solver (v8)</h1>

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

                <hr>
                <h3>Místnosti</h3>
                <div class="ks-row"><label title="Dle ČSN 73 4301 má mít hlavní vstup do rodinného domu zádveří."><input type="checkbox" id="ks-zadveri" checked> Zádveří</label></div>
                <div class="ks-row"><label><input type="checkbox" id="ks-kuchyn"> Kuchyň zvlášť</label></div>
                <div class="ks-row"><label><input type="checkbox" id="ks-technicka"> Technická místnost</label></div>
                <div class="ks-row"><label><input type="checkbox" id="ks-spiz"> Spíž</label></div>
                <div class="ks-row"><label>Ložnice</label><input type="number" id="ks-loznice" min="0" max="5" value="2"></div>
                <div class="ks-row"><label>Pokoje</label><input type="number" id="ks-detske" min="0" max="5" value="1"></div>
                <div class="ks-row"><label>Koupelny</label><input type="number" id="ks-koupelny" min="1" max="3" value="1"></div>

                <hr>
                <h3>Velikosti (% domu)</h3>
                <div id="ks-rooms"></div>
                <div class="ks-row" style="border-top:1px solid var(--c-border);padding-top:.35rem;margin-top:.35rem;"><label>Součet</label><strong id="ks-pctsum">—</strong></div>

                <hr>
                <button id="ks-reset" class="btn btn-primary" style="width:100%">Přeskládat</button>
                <label style="display:flex;gap:.35rem;align-items:center;margin-top:.6rem;font-size:.82rem;"><input type="checkbox" id="ks-graf" checked> zvýraznit povinné kontakty</label>
            </div>

            <div class="ks-canvas-wrap">
                <div class="ks-bar"><span id="ks-stav" class="ks-stav"></span></div>
                <canvas id="ks-canvas"></canvas>
                <div class="ks-legend"><strong>Zelená čára</strong> = povinný kontakt drží, <strong>červená</strong> = chybí. U místnosti plocha + <strong>kratší strana</strong>; <span style="color:#b02020">⚠</span> = pod min. šířkou (WC 0,9 · koupelna 1,6 · chodba/zádveří 1,1 · obytné 2,4 m). Šrafovaně = mimo dům (výřez u L/U). Solver hledá dispozici z grafu sousedností; místnosti jsou obdélníky.</div>
            </div>
        </div>
    </div>

    <script>
    (function () {
        const cv = document.getElementById('ks-canvas');
        const ctx = cv.getContext('2d');
        const PAD = 18, MAXW = 640, MAXH = 460;
        const eq = (p, q) => Math.abs(p - q) < 1e-6;

        // stav (přebudováván z ovládání)
        let ROOMS = [], IDX = {}, HARD = [], ORADJ = [], MAXS = 0;
        let W = 12, H = 8, PX = 50, VOID = -1, curShape = 'obdelnik';
        let pt = [], layout = null, dirty = true, dragged = -1;
        let USABLE = 110;                 // využitelná plocha domu (m²) = velikost
        const pctStore = {};              // uživatelské úpravy % (id → %)
        const mx = m => PAD + m * PX;
        const nm = id => ROOMS[IDX[id]].nazev;

        // ── Sestavení programu z parametrů ───────────────────────────
        function readParams() {
            return {
                shape: document.querySelector('.ks-shape.active').dataset.shape,
                size: +document.getElementById('ks-size').value,
                zadveri: document.getElementById('ks-zadveri').checked,
                kuchynZvlast: document.getElementById('ks-kuchyn').checked,
                technicka: document.getElementById('ks-technicka').checked,
                spiz: document.getElementById('ks-spiz').checked,
                loznice: +document.getElementById('ks-loznice').value,
                detske: +document.getElementById('ks-detske').value,
                koupelny: +document.getElementById('ks-koupelny').value,
            };
        }
        // normalizace: plochy z uživatelských % (váhy) na využitelnou plochu domu
        function normalizeAreas() {
            const real = ROOMS.filter(x => !x.mimo), s = real.reduce((a, x) => a + x.pct, 0) || 1;
            real.forEach(x => x.area = x.pct / s * USABLE);
        }
        function buildProgram(P) {
            curShape = P.shape;
            const r = [];
            // dp = výchozí % domu; skutečné % = uživatelská úprava z pctStore, jinak dp
            const add = (id, nazev, dp, barva, min, asp, zona) => r.push({ id, nazev, dp, barva, min, asp, zona, pct: pctStore[id] != null ? pctStore[id] : dp });
            if (P.zadveri) add('zadveri', 'Zádveří', 4, '#c9d7e8', 1.1, 3.0, 'vstup');
            add('chodba', 'Chodba', 9, '#e6e0d2', 1.1, 99, 'jadro');
            if (P.kuchynZvlast) { add('obyvak', 'Obývák', 22, '#f2d7a8', 3.0, 1.8, 'den'); add('kuchyn', 'Kuchyň', 9, '#f2c98a', 2.0, 2.0, 'den'); }
            else add('obyvak', 'Obývák+kuchyň', 28, '#f2d7a8', 3.0, 1.8, 'den');
            for (let i = 0; i < P.loznice; i++) add('loznice' + i, 'Ložnice' + (P.loznice > 1 ? ' ' + (i + 1) : ''), 14, '#cfe3cf', 2.4, 2.0, 'noc');
            for (let i = 0; i < P.detske; i++) add('pokoj' + i, 'Pokoj' + (P.detske > 1 ? ' ' + (i + 1) : ''), 11, '#d7e8cf', 2.4, 2.0, 'noc');
            for (let i = 0; i < P.koupelny; i++) add('koupelna' + i, 'Koupelna' + (P.koupelny > 1 ? ' ' + (i + 1) : ''), 6, '#b9dfe6', 1.6, 2.5, 'mokra');
            add('wc', 'WC', 2.5, '#b9dfe6', 0.9, 2.5, 'mokra');
            if (P.technicka) add('technicka', 'Technická', 5, '#e0dedc', 1.5, 2.5, 'mokra');
            if (P.spiz) add('spiz', 'Spíž', 3, '#efe6d0', 1.2, 3.0, 'den');

            USABLE = P.size;
            const sumPct = r.reduce((s, x) => s + x.pct, 0) || 1;
            r.forEach(x => x.area = x.pct / sumPct * USABLE);

            // výřez (mimo dům) pro L/U → nepravoúhlý obrys
            const maVyrez = (P.shape === 'L' || P.shape === 'U');
            let boundingArea = USABLE;
            if (maVyrez) { const voidA = USABLE * 0.18; boundingArea = USABLE + voidA; r.push({ id: '_void', nazev: 'mimo dům', pct: 0, area: voidA, barva: null, min: 0.5, asp: 99, mimo: true, zona: 'roh' }); }

            if (P.shape === 'ctverec') { W = H = Math.sqrt(boundingArea); }
            else { W = Math.sqrt(boundingArea * 1.5); H = boundingArea / W; }

            ROOMS = r; IDX = {}; ROOMS.forEach((x, i) => IDX[x.id] = i);
            VOID = IDX['_void'] != null ? IDX['_void'] : -1;

            // adjacence (odvozené z aktuální skladby)
            HARD = [['chodba', 'obyvak'], ['chodba', 'wc']];
            if (P.zadveri) HARD.push(['zadveri', 'chodba']);
            if (P.kuchynZvlast) HARD.push(['obyvak', 'kuchyn']);
            for (let i = 0; i < P.koupelny; i++) HARD.push(['chodba', 'koupelna' + i]);
            if (P.technicka) HARD.push(['chodba', 'technicka']);
            if (P.spiz) HARD.push([P.kuchynZvlast ? 'kuchyn' : 'obyvak', 'spiz']);
            ORADJ = [];
            for (let i = 0; i < P.loznice; i++) ORADJ.push({ room: 'loznice' + i, z: ['obyvak', 'chodba'] });
            for (let i = 0; i < P.detske; i++) ORADJ.push({ room: 'pokoj' + i, z: ['obyvak', 'chodba'] });
            MAXS = HARD.length + ORADJ.length;

            // zónové základní polohy (hint pro dělení): denní vlevo, noční vpravo, mokrá cluster
            const zc = { jadro: [W * 0.5, H * 0.5], den: [W * 0.25, H * 0.6], vstup: [W * 0.5, H * 0.12], mokra: [W * 0.82, H * 0.2], noc: [W * 0.7, H * 0.8], roh: [W * 0.85, H * 0.12] };
            const zi = {};
            ROOMS.forEach(x => {
                const c = zc[x.zona] || [W / 2, H / 2], k = (zi[x.zona] = (zi[x.zona] || 0) + 1);
                x.base = [Math.max(0.5, Math.min(W - 0.5, c[0] + ((k % 3) - 1) * 1.6)), Math.max(0.5, Math.min(H - 0.5, c[1] + Math.floor(k / 3) * 1.6))];
            });

            PX = Math.min(MAXW / W, MAXH / H);
            cv.width = W * PX + 2 * PAD; cv.height = H * PX + 2 * PAD;
        }

        // vykreslení seznamu místností s editovatelnými % v panelu
        function renderRoomList() {
            const box = document.getElementById('ks-rooms'); box.innerHTML = '';
            ROOMS.forEach(x => {
                if (x.mimo) return;
                const row = document.createElement('div'); row.className = 'ks-row';
                row.innerHTML = '<label>' + x.nazev + '</label><input type="number" step="0.5" min="1" data-id="' + x.id + '" value="' + x.pct.toFixed(1) + '" style="width:3.6rem">';
                box.appendChild(row);
            });
            updatePctSum();
        }
        function updatePctSum() {
            const s = ROOMS.filter(x => !x.mimo).reduce((a, x) => a + x.pct, 0);
            document.getElementById('ks-pctsum').textContent = Math.round(s) + ' %';
        }

        function reset() {
            pt = ROOMS.map(x => ({ x: Math.max(0.2, Math.min(W - 0.2, x.base[0] + (Math.random() - 0.5) * 2)), y: Math.max(0.2, Math.min(H - 0.2, x.base[1] + (Math.random() - 0.5) * 2)) }));
            dragged = -1; dirty = true;
        }
        function rebuild() { buildProgram(readParams()); renderRoomList(); reset(); }

        // ── Slicing strom (PP = polohy pro daný pokus, s jitterem) ────
        let PP = [];
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
        function voidOk(v) {
            if (VOID < 0 || !v) return true;
            if (curShape === 'L') return (((eq(v.x, 0) || eq(v.x + v.w, W)) ? 1 : 0) + ((eq(v.y, 0) || eq(v.y + v.h, H)) ? 1 : 0)) >= 2;
            if (curShape === 'U') return (eq(v.y, 0) || eq(v.y + v.h, H)) && v.x > 0.15 && v.x + v.w < W - 0.15;
            return true;
        }
        function skore(out) {
            let adj = 0; const m = (a, b) => touch(out[IDX[a]], out[IDX[b]]);
            HARD.forEach(([a, b]) => { if (m(a, b)) adj++; });
            ORADJ.forEach(o => { if (o.z.some(z => m(o.room, z))) adj++; });
            let dimPen = 0, areaErr = 0;
            out.forEach((rr, k) => {
                if (ROOMS[k].mimo) return;
                const sh = Math.min(rr.w, rr.h), lo = Math.max(rr.w, rr.h);
                if (sh < ROOMS[k].min) dimPen += (ROOMS[k].min - sh) ** 2 * 10;
                const a = lo / sh; if (a > ROOMS[k].asp) dimPen += (a - ROOMS[k].asp) ** 2;
                areaErr += Math.abs(rr.w * rr.h - ROOMS[k].area);
            });
            if (VOID >= 0 && !voidOk(out[VOID])) dimPen += 20;
            return { adj, val: adj * 1e6 - dimPen * 1e3 - areaErr };
        }
        function solve(N) {
            let best = null, bv = -Infinity;
            const all = ROOMS.map((_, k) => k);
            for (let t = 0; t < N; t++) {
                PP = pt.map(p => ({ x: p.x + (Math.random() - 0.5) * 3.5, y: p.y + (Math.random() - 0.5) * 3.5 }));  // jitter → víc variant
                const out = []; dim(genTree(all), 0, 0, W, H, out);
                const sc = skore(out);
                if (sc.val > bv) { bv = sc.val; best = out; }
            }
            layout = best;
        }

        // ── Vykreslení ───────────────────────────────────────────────
        const grafEl = document.getElementById('ks-graf');
        const cx = r => r.x + r.w / 2, cy = r => r.y + r.h / 2;
        function kresli() {
            if (dirty) { solve(dragged >= 0 ? 4000 : 24000); dirty = false; }
            if (!layout) return;
            const ma = (a, b) => touch(layout[IDX[a]], layout[IDX[b]]);
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#4a453c';
            layout.forEach((r, k) => {
                if (ROOMS[k].mimo) return;
                ctx.fillStyle = ROOMS[k].barva;
                ctx.fillRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
                ctx.strokeRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
            });
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3;
            ctx.strokeRect(mx(0), mx(0), W * PX, H * PX);

            // výřez „mimo dům"
            if (VOID >= 0) {
                const v = layout[VOID];
                ctx.save();
                ctx.beginPath(); ctx.rect(mx(v.x), mx(v.y), v.w * PX, v.h * PX); ctx.clip();
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

            if (grafEl.checked) {
                const cara = (aId, bId, ok) => {
                    ctx.strokeStyle = ok ? 'rgba(30,140,60,.85)' : 'rgba(200,40,40,.9)';
                    ctx.lineWidth = ok ? 2 : 3; ctx.setLineDash(ok ? [] : [5, 4]); ctx.beginPath();
                    ctx.moveTo(mx(cx(layout[IDX[aId]])), mx(cy(layout[IDX[aId]])));
                    ctx.lineTo(mx(cx(layout[IDX[bId]])), mx(cy(layout[IDX[bId]]))); ctx.stroke();
                };
                HARD.forEach(([a, b]) => cara(a, b, ma(a, b)));
                ORADJ.forEach(o => { const t = o.z.find(z => ma(o.room, z)) || o.z[0]; cara(o.room, t, o.z.some(z => ma(o.room, z))); });
                ctx.setLineDash([]);
            }

            ctx.textAlign = 'center';
            layout.forEach((r, k) => {
                if (ROOMS[k].mimo) { ctx.fillStyle = '#9a9a9a'; ctx.font = 'italic 11px sans-serif'; ctx.fillText('mimo dům', mx(cx(r)), mx(cy(r)) + 4); return; }
                const sh = Math.min(r.w, r.h), tenke = sh < ROOMS[k].min - 0.01;
                ctx.fillStyle = tenke ? '#b02020' : '#2a2a2a';
                ctx.font = '600 12px sans-serif';
                ctx.fillText(ROOMS[k].nazev, mx(cx(r)), mx(cy(r)) - 5);
                ctx.font = '11px sans-serif';
                ctx.fillText(Math.round(r.w * r.h) + ' m² · ' + sh.toFixed(1) + ' m' + (tenke ? ' ⚠' : ''), mx(cx(r)), mx(cy(r)) + 9);
            });

            const broken = [];
            HARD.forEach(([a, b]) => { if (!ma(a, b)) broken.push(nm(a) + '–' + nm(b)); });
            ORADJ.forEach(o => { if (!o.z.some(z => ma(o.room, z))) broken.push(nm(o.room) + '–(' + o.z.map(nm).join('/') + ')'); });
            const el = document.getElementById('ks-stav');
            el.textContent = 'sousednosti: ' + (MAXS - broken.length) + '/' + MAXS + (broken.length ? ' · chybí: ' + broken.join(', ') : ' ✓');
            el.className = 'ks-stav ' + (broken.length ? 'bad' : 'ok');
        }
        function smycka() { kresli(); requestAnimationFrame(smycka); }

        // ── Interakce ────────────────────────────────────────────────
        function pos(e) {
            const rect = cv.getBoundingClientRect();
            const sx = cv.width / rect.width;
            const mmx = ((e.clientX - rect.left) * sx - PAD) / PX, mmy = ((e.clientY - rect.top) * sx - PAD) / PX;
            if (!layout || mmx < 0 || mmy < 0 || mmx > W || mmy > H) return { k: -1 };
            const hit = layout.findIndex(r => mmx >= r.x && mmx <= r.x + r.w && mmy >= r.y && mmy <= r.y + r.h);
            return { k: hit, mmx, mmy };
        }
        cv.addEventListener('mousedown', e => { dragged = pos(e).k; });
        cv.addEventListener('mousemove', e => { if (dragged < 0) return; const p = pos(e); if (p.mmx != null) { pt[dragged].x = Math.max(0.1, Math.min(W - 0.1, p.mmx)); pt[dragged].y = Math.max(0.1, Math.min(H - 0.1, p.mmy)); dirty = true; } });
        window.addEventListener('mouseup', () => { if (dragged >= 0) { dragged = -1; dirty = true; } });

        // ovládání
        document.getElementById('ks-shapes').addEventListener('click', e => {
            const b = e.target.closest('.ks-shape'); if (!b) return;
            document.querySelectorAll('.ks-shape').forEach(x => x.classList.remove('active'));
            b.classList.add('active'); rebuild();
        });
        document.getElementById('ks-size').addEventListener('input', e => { document.getElementById('ks-size-val').textContent = e.target.value + ' m²'; rebuild(); });
        ['ks-zadveri', 'ks-kuchyn', 'ks-technicka', 'ks-spiz', 'ks-loznice', 'ks-detske', 'ks-koupelny'].forEach(id => document.getElementById(id).addEventListener('change', rebuild));
        // úprava % místnosti → přepočítat plochy (bez přestavby seznamu)
        document.getElementById('ks-rooms').addEventListener('input', e => {
            const inp = e.target.closest('input[data-id]'); if (!inp) return;
            const id = inp.dataset.id, v = Math.max(0.5, +inp.value || 0.5);
            pctStore[id] = v; const k = IDX[id]; if (k != null) ROOMS[k].pct = v;
            normalizeAreas(); updatePctSum(); dirty = true;
        });
        document.getElementById('ks-reset').addEventListener('click', reset);

        rebuild();
        smycka();
    })();
    </script>
</x-layouts.app>
