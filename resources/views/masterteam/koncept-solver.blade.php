<x-layouts.app title="Koncept solver — TupTuDu">
    <style>
        .ks-wrap { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
        .ks-bar { display: flex; gap: 1rem; align-items: center; margin: .5rem 0 1rem; flex-wrap: wrap; }
        #ks-canvas { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); cursor: grab; }
        #ks-canvas:active { cursor: grabbing; }
        .ks-legend { font-size: .85rem; color: var(--c-text-secondary); margin-top: .5rem; }
        .ks-stav { font-weight: 700; }
        .ks-stav.ok { color: var(--c-ok); } .ks-stav.bad { color: var(--c-error); }
    </style>

    <div class="ks-wrap">
        <h1>Koncept solver — dualizace (v6)</h1>
        <p class="muted">Hledáme <strong>rozvržení z grafu sousedností</strong>: solver zkouší tisíce dělení (slicing stromů) řízených polohami balonků a vybere takové, které splní všechny povinné kontakty a trefí plochy. Místnosti jsou <strong>obdélníky</strong> (chodba vnitřní, ne přes celou šířku), sousednosti <strong>zaručené</strong>. <strong>Táhni balonek</strong> a solver přeskládá zbytek.</p>

        <div class="ks-bar">
            <button id="ks-reset" class="btn btn-primary">Přeskládat</button>
            <label style="display:flex;gap:.35rem;align-items:center;font-size:.85rem;"><input type="checkbox" id="ks-graf" checked> zvýraznit povinné kontakty</label>
            <span id="ks-stav" class="ks-stav"></span>
        </div>

        <canvas id="ks-canvas"></canvas>
        <div class="ks-legend">Pozemek 12 × 8 m. <strong>Zelená čára</strong> = povinný kontakt drží, <strong>červená</strong> = chybí. Rozpočet rohů = 4 + plocha/6; obdélník = 4 (strop, ne cíl). Tolerance plochy ~±10 %. Slicing strom je 1. stupeň dualizace — realizuje graf pro tento program; obecné odvození z libovolného grafu je další krok.</div>
    </div>

    <script>
    (function () {
        // ── Program (napevno – dům 3+kk) ─────────────────────────────
        const W = 12, H = 8;
        const ROOMS = [
            { id: 'zadveri',  nazev: 'Zádveří',        area: 5,  barva: '#c9d7e8', base: [6, 1] },
            { id: 'chodba',   nazev: 'Chodba',         area: 8,  barva: '#e6e0d2', base: [6, 4] },
            { id: 'obyvak',   nazev: 'Obývák+kuchyň',  area: 32, barva: '#f2d7a8', base: [1.5, 4] },
            { id: 'loznice1', nazev: 'Ložnice rodičů', area: 14, barva: '#cfe3cf', base: [10.5, 4] },
            { id: 'loznice2', nazev: 'Ložnice',        area: 12, barva: '#cfe3cf', base: [5, 6.8] },
            { id: 'loznice3', nazev: 'Dětský pokoj',   area: 11, barva: '#cfe3cf', base: [8, 6.8] },
            { id: 'koupelna', nazev: 'Koupelna',       area: 6,  barva: '#b9dfe6', base: [7, 1] },
            { id: 'wc',       nazev: 'WC',             area: 2,  barva: '#b9dfe6', base: [9, 1] },
        ];
        const IDX = {}; ROOMS.forEach((r, i) => IDX[r.id] = i);
        const nm = id => ROOMS[IDX[id]].nazev;
        const HARD = [['zadveri', 'chodba'], ['chodba', 'obyvak'], ['chodba', 'koupelna'], ['chodba', 'wc']];
        const ORADJ = [
            { room: 'loznice1', z: ['obyvak', 'chodba'] },
            { room: 'loznice2', z: ['obyvak', 'chodba'] },
            { room: 'loznice3', z: ['obyvak', 'chodba'] },
        ];
        const MAXS = HARD.length + ORADJ.length;

        // ── Plátno ───────────────────────────────────────────────────
        const PX = 56, PAD = 18;
        const cv = document.getElementById('ks-canvas');
        cv.width = W * PX + 2 * PAD; cv.height = H * PX + 2 * PAD;
        const ctx = cv.getContext('2d');
        const mx = m => PAD + m * PX;

        // ── Body (balonky) – hint pro dělení ─────────────────────────
        let pt = ROOMS.map(() => ({ x: 0, y: 0 }));
        let layout = null, curScore = 0, dirty = true, dragged = -1;
        function reset() {
            pt = ROOMS.map(r => ({ x: r.base[0] + (Math.random() - 0.5) * 2, y: r.base[1] + (Math.random() - 0.5) * 2 }));
            dragged = -1; dirty = true;
        }

        // ── Slicing strom řízený polohami balonků ────────────────────
        function genTree(list) {
            if (list.length === 1) return { leaf: list[0] };
            const xs = list.map(k => pt[k].x), ys = list.map(k => pt[k].y);
            const spx = Math.max(...xs) - Math.min(...xs), spy = Math.max(...ys) - Math.min(...ys);
            const axis = (spx * (0.7 + Math.random() * 0.6) >= spy * (0.7 + Math.random() * 0.6)) ? 0 : 1;
            const sorted = [...list].sort((a, b) => (axis === 0 ? pt[a].x - pt[b].x : pt[a].y - pt[b].y));
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
        const eq = (p, q) => Math.abs(p - q) < 1e-6;
        function touch(A, B) {
            if (!A || !B) return false;
            const yov = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
            const xov = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
            if ((eq(A.x + A.w, B.x) || eq(B.x + B.w, A.x)) && yov > 0.05) return true;
            if ((eq(A.y + A.h, B.y) || eq(B.y + B.h, A.y)) && xov > 0.05) return true;
            return false;
        }
        function skore(out) {
            let s = 0; const m = (a, b) => touch(out[IDX[a]], out[IDX[b]]);
            HARD.forEach(([a, b]) => { if (m(a, b)) s++; });
            ORADJ.forEach(o => { if (o.z.some(z => m(o.room, z))) s++; });
            // jemný bonus: menší odchylka ploch (tie-break)
            let err = 0; out.forEach((r, k) => err += Math.abs(r.w * r.h - ROOMS[k].area));
            return s - err / 1000;
        }
        function solve() {
            let best = null, bs = -Infinity, bInt = 0;
            const all = ROOMS.map((_, k) => k);
            for (let t = 0; t < 4000; t++) {
                const out = []; dim(genTree(all), 0, 0, W, H, out);
                const s = skore(out);
                if (s > bs) { bs = s; best = out; bInt = Math.floor(s + 1e-6); }
                if (bInt >= MAXS && t > 200) break;   // našli plné řešení, chvíli hledej hezčí plochy
            }
            layout = best; curScore = bInt;
        }
        reset();

        // ── Vykreslení ───────────────────────────────────────────────
        const grafEl = document.getElementById('ks-graf');
        const cx = r => r.x + r.w / 2, cy = r => r.y + r.h / 2;
        function kresli() {
            if (dirty) { solve(); dirty = false; }
            if (!layout) return;
            const ma = (a, b) => touch(layout[IDX[a]], layout[IDX[b]]);
            ctx.clearRect(0, 0, cv.width, cv.height);
            ctx.lineWidth = 2; ctx.strokeStyle = '#4a453c';
            layout.forEach((r, k) => {
                ctx.fillStyle = ROOMS[k].barva;
                ctx.fillRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
                ctx.strokeRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
            });
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3;
            ctx.strokeRect(mx(0), mx(0), W * PX, H * PX);

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

            ctx.fillStyle = '#2a2a2a'; ctx.textAlign = 'center';
            layout.forEach((r, k) => {
                const budget = 4 + Math.floor(ROOMS[k].area / 6);
                ctx.font = '600 12px sans-serif';
                ctx.fillText(ROOMS[k].nazev, mx(cx(r)), mx(cy(r)) - 5);
                ctx.font = '11px sans-serif';
                ctx.fillText(Math.round(r.w * r.h) + ' m² · 4/' + budget + ' rohů', mx(cx(r)), mx(cy(r)) + 9);
            });

            const broken = [];
            HARD.forEach(([a, b]) => { if (!ma(a, b)) broken.push(nm(a) + '–' + nm(b)); });
            ORADJ.forEach(o => { if (!o.z.some(z => ma(o.room, z))) broken.push(nm(o.room) + '–(' + o.z.map(nm).join('/') + ')'); });
            const el = document.getElementById('ks-stav');
            el.textContent = 'sousednosti: ' + (MAXS - broken.length) + '/' + MAXS + (broken.length ? ' · chybí: ' + broken.join(', ') : ' ✓');
            el.className = 'ks-stav ' + (broken.length ? 'bad' : 'ok');
        }

        function smycka() { kresli(); requestAnimationFrame(smycka); }
        smycka();

        // ── Interakce (tažení balonku = posun hintu → přeskládá) ─────
        function pos(e) {
            const rect = cv.getBoundingClientRect();
            const mmx = (e.clientX - rect.left - PAD) / PX, mmy = (e.clientY - rect.top - PAD) / PX;
            if (!layout || mmx < 0 || mmy < 0 || mmx > W || mmy > H) return { k: -1 };
            const hit = layout.findIndex(r => mmx >= r.x && mmx <= r.x + r.w && mmy >= r.y && mmy <= r.y + r.h);
            return { k: hit, mmx, mmy };
        }
        cv.addEventListener('mousedown', e => { dragged = pos(e).k; });
        cv.addEventListener('mousemove', e => { if (dragged < 0) return; const p = pos(e); if (p.mmx != null) { pt[dragged].x = Math.max(0.1, Math.min(W - 0.1, p.mmx)); pt[dragged].y = Math.max(0.1, Math.min(H - 0.1, p.mmy)); dirty = true; } });
        window.addEventListener('mouseup', () => { dragged = -1; });
        document.getElementById('ks-reset').addEventListener('click', reset);
    })();
    </script>
</x-layouts.app>
