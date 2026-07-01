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
        <h1>Koncept solver — dláždění (v2)</h1>
        <p class="muted">Místnosti jako „balonky" tlačící na sebe: vyplní pozemek, sdílí rovné stěny (nulová mezera). Povinné sousednosti se drží, ložnice se přichytí na <strong>obývák NEBO chodbu</strong>, zádveří ke stěně. <strong>Chyť místnost tažením</strong> a přesuň — zbytek se přeskládá.</p>

        <div class="ks-bar">
            <button id="ks-reset" class="btn btn-primary">Přeskládat (náhodně)</button>
            <span id="ks-stav" class="ks-stav"></span>
        </div>

        <canvas id="ks-canvas"></canvas>
        <div class="ks-legend">Pozemek 12 × 8 m · rastr 0,25 m. Vážený Voronoi (power diagram): váha místnosti roste, dokud netrefí svou plochu. Stěny jsou zatím schodovité (rastr) — narovnání na hladké obdélníky je další krok.</div>
    </div>

    <script>
    (function () {
        // ── Program (napevno – dům 3+kk) ─────────────────────────────
        const FOOT = { w: 12, h: 8 };
        const ROOMS = [
            { id: 'zadveri',  nazev: 'Zádveří',         area: 5,  barva: '#c9d7e8' },
            { id: 'chodba',   nazev: 'Chodba',          area: 8,  barva: '#e6e0d2' },
            { id: 'obyvak',   nazev: 'Obývák+kuchyň',   area: 32, barva: '#f2d7a8' },
            { id: 'loznice1', nazev: 'Ložnice rodičů',  area: 14, barva: '#cfe3cf' },
            { id: 'loznice2', nazev: 'Ložnice',         area: 12, barva: '#cfe3cf' },
            { id: 'loznice3', nazev: 'Dětský pokoj',    area: 11, barva: '#cfe3cf' },
            { id: 'koupelna', nazev: 'Koupelna',        area: 6,  barva: '#b9dfe6' },
            { id: 'wc',       nazev: 'WC',              area: 2,  barva: '#b9dfe6' },
        ];
        const IDX = {}; ROOMS.forEach((r, i) => IDX[r.id] = i);

        // Pevné povinné sousednosti (musí sdílet stěnu)
        const HARD = [['zadveri', 'chodba'], ['chodba', 'obyvak'], ['chodba', 'koupelna'], ['chodba', 'wc']];
        // "NEBO" sousednosti – místnost se přichytí k NEJBLIŽŠÍ z možností
        const ORADJ = [
            { room: 'loznice1', z: ['obyvak', 'chodba'] },
            { room: 'loznice2', z: ['obyvak', 'chodba'] },
            { room: 'loznice3', z: ['obyvak', 'chodba'] },
        ];
        // Musí být u obvodové stěny (vstup zvenku). Když není zádveří → chodba.
        const NA_STENE = ROOMS.some(r => r.id === 'zadveri') ? ['zadveri'] : ['chodba'];

        // ── Rastr + plátno ───────────────────────────────────────────
        const COLS = 48, ROWS = 32;
        const CELL = FOOT.w / COLS;              // 0.25 m
        const CELLA = CELL * CELL;               // plocha buňky
        const PX = 56, PAD = 18;
        const cv = document.getElementById('ks-canvas');
        cv.width = FOOT.w * PX + 2 * PAD; cv.height = FOOT.h * PX + 2 * PAD;
        const ctx = cv.getContext('2d');
        const mx = m => PAD + m * PX;

        // ── Body (sites) ─────────────────────────────────────────────
        let site = ROOMS.map(r => ({ x: 0, y: 0, w: 0, area: 0, cx: 0, cy: 0 }));
        let assign = new Int16Array(COLS * ROWS);
        let dragged = -1;

        function reset() {
            site = ROOMS.map(() => ({ x: Math.random() * FOOT.w, y: Math.random() * FOOT.h, w: 0, area: 0, cx: 0, cy: 0 }));
            dragged = -1;
        }
        reset();

        // Přiřazení buněk nejbližšímu bodu (power distance = d² − váha)
        function prirad() {
            const cnt = new Float64Array(ROOMS.length), sx = new Float64Array(ROOMS.length), sy = new Float64Array(ROOMS.length);
            for (let j = 0; j < ROWS; j++) {
                const py = (j + 0.5) * CELL;
                for (let i = 0; i < COLS; i++) {
                    const px = (i + 0.5) * CELL;
                    let best = 0, bestv = Infinity;
                    for (let k = 0; k < site.length; k++) {
                        const dx = px - site[k].x, dy = py - site[k].y;
                        const v = dx * dx + dy * dy - site[k].w;
                        if (v < bestv) { bestv = v; best = k; }
                    }
                    assign[j * COLS + i] = best;
                    cnt[best]++; sx[best] += px; sy[best] += py;
                }
            }
            for (let k = 0; k < site.length; k++) {
                site[k].area = cnt[k] * CELLA;
                site[k].cx = cnt[k] ? sx[k] / cnt[k] : site[k].x;
                site[k].cy = cnt[k] ? sy[k] / cnt[k] : site[k].y;
            }
        }

        function krok() {
            prirad();
            // 1) váhy → trefit plochu (kapacitně omezený Voronoi)
            let wsum = 0;
            for (let k = 0; k < site.length; k++) {
                site[k].w += 0.06 * (ROOMS[k].area - site[k].area);
                wsum += site[k].w;
            }
            const wmean = wsum / site.length;
            for (let k = 0; k < site.length; k++) site[k].w -= wmean; // normalizace

            // 2) cílová pozice = těžiště buněk (Lloyd → kompaktní tvary)
            const tx = site.map(s => s.cx), ty = site.map(s => s.cy);

            // 3) přitažlivosti (sousednosti) – posun cílů
            const pull = (aId, bId, f) => {
                const a = IDX[aId], b = IDX[bId];
                tx[a] += (site[b].x - site[a].x) * f; ty[a] += (site[b].y - site[a].y) * f;
                tx[b] += (site[a].x - site[b].x) * f; ty[b] += (site[a].y - site[b].y) * f;
            };
            HARD.forEach(([a, b]) => pull(a, b, 0.10));
            ORADJ.forEach(o => {
                const r = IDX[o.room];
                // najdi nejbližší z možností → přitáhni jen k ní
                let best = null, bd = Infinity;
                o.z.forEach(opt => { const k = IDX[opt]; const d = (site[k].x - site[r].x) ** 2 + (site[k].y - site[r].y) ** 2; if (d < bd) { bd = d; best = k; } });
                if (best != null) { tx[r] += (site[best].x - site[r].x) * 0.08; ty[r] += (site[best].y - site[r].y) * 0.08; }
            });
            // 4) na stěnu (vstup) – přitáhni k nejbližšímu okraji (v1: horní/severní preferovaně)
            NA_STENE.forEach(id => { const k = IDX[id]; ty[k] += (0 - site[k].y) * 0.10; });

            // 5) posun bodů k cílům (mimo tažený)
            for (let k = 0; k < site.length; k++) {
                if (k === dragged) continue;
                site[k].x += (tx[k] - site[k].x) * 0.30;
                site[k].y += (ty[k] - site[k].y) * 0.30;
                site[k].x = Math.max(0.05, Math.min(FOOT.w - 0.05, site[k].x));
                site[k].y = Math.max(0.05, Math.min(FOOT.h - 0.05, site[k].y));
            }
        }

        // ── Vykreslení + detekce sousednosti ─────────────────────────
        function kresli() {
            ctx.clearRect(0, 0, cv.width, cv.height);
            // výplně
            for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                ctx.fillStyle = ROOMS[assign[j * COLS + i]].barva;
                ctx.fillRect(mx(i * CELL), mx(j * CELL), CELL * PX + 1, CELL * PX + 1);
            }
            // stěny (hranice mezi různými místnostmi) + detekce sousedů
            const soused = new Set();
            ctx.strokeStyle = '#4a453c'; ctx.lineWidth = 1.5; ctx.beginPath();
            for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                const r = assign[j * COLS + i];
                if (i + 1 < COLS) { const r2 = assign[j * COLS + i + 1]; if (r2 !== r) { ctx.moveTo(mx((i + 1) * CELL), mx(j * CELL)); ctx.lineTo(mx((i + 1) * CELL), mx((j + 1) * CELL)); soused.add(r < r2 ? r + '-' + r2 : r2 + '-' + r); } }
                if (j + 1 < ROWS) { const r2 = assign[(j + 1) * COLS + i]; if (r2 !== r) { ctx.moveTo(mx(i * CELL), mx((j + 1) * CELL)); ctx.lineTo(mx((i + 1) * CELL), mx((j + 1) * CELL)); soused.add(r < r2 ? r + '-' + r2 : r2 + '-' + r); } }
            }
            ctx.stroke();
            // obvod
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.5;
            ctx.strokeRect(mx(0), mx(0), FOOT.w * PX, FOOT.h * PX);
            // popisky
            ctx.fillStyle = '#2a2a2a'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
            ROOMS.forEach((r, k) => { ctx.fillText(r.nazev, mx(site[k].cx), mx(site[k].cy) - 4); ctx.fillText(Math.round(site[k].area) + ' m²', mx(site[k].cx), mx(site[k].cy) + 10); });

            // stav sousedností
            const má = (a, b) => soused.has(IDX[a] < IDX[b] ? IDX[a] + '-' + IDX[b] : IDX[b] + '-' + IDX[a]);
            let ok = 0, cel = 0;
            HARD.forEach(([a, b]) => { cel++; if (má(a, b)) ok++; });
            ORADJ.forEach(o => { cel++; if (o.z.some(opt => má(o.room, opt))) ok++; });
            const el = document.getElementById('ks-stav');
            el.textContent = 'sousednosti: ' + ok + '/' + cel + (ok === cel ? ' ✓' : '');
            el.className = 'ks-stav ' + (ok === cel ? 'ok' : 'bad');
        }

        function smycka() { krok(); kresli(); requestAnimationFrame(smycka); }
        smycka();

        // ── Interakce (tažení místnosti = posun jejího bodu) ─────────
        function mistnostNaPozici(e) {
            const rect = cv.getBoundingClientRect();
            const mmx = (e.clientX - rect.left - PAD) / PX, mmy = (e.clientY - rect.top - PAD) / PX;
            if (mmx < 0 || mmy < 0 || mmx > FOOT.w || mmy > FOOT.h) return { r: -1 };
            const i = Math.min(COLS - 1, Math.max(0, Math.floor(mmx / CELL))), j = Math.min(ROWS - 1, Math.max(0, Math.floor(mmy / CELL)));
            return { r: assign[j * COLS + i], mmx, mmy };
        }
        cv.addEventListener('mousedown', e => { const p = mistnostNaPozici(e); dragged = p.r; });
        cv.addEventListener('mousemove', e => { if (dragged < 0) return; const p = mistnostNaPozici(e); if (p.r >= 0) { site[dragged].x = p.mmx; site[dragged].y = p.mmy; } });
        window.addEventListener('mouseup', () => { dragged = -1; });
        document.getElementById('ks-reset').addEventListener('click', reset);
    })();
    </script>
</x-layouts.app>
