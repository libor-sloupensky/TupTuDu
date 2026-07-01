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
        <h1>Koncept solver — dláždění (v3)</h1>
        <p class="muted">Místnosti jako „balonky" tlačící na sebe: vyplní pozemek, sdílí rovné stěny (nulová mezera). Povinné sousednosti se drží zpětnou vazbou, ložnice se přichytí na <strong>obývák NEBO chodbu</strong>, zádveří ke stěně. <strong>Chyť místnost tažením</strong> a přesuň — zbytek se přeskládá.</p>

        <div class="ks-bar">
            <button id="ks-reset" class="btn btn-primary">Přeskládat</button>
            <label style="display:flex;gap:.35rem;align-items:center;font-size:.85rem;"><input type="checkbox" id="ks-graf" checked> zvýraznit povinné kontakty</label>
            <span id="ks-stav" class="ks-stav"></span>
        </div>

        <canvas id="ks-canvas"></canvas>
        <div class="ks-legend">Pozemek 12 × 8 m · rastr 0,25 m. Vážený Voronoi: váha místnosti roste, dokud netrefí plochu. <strong>Zelená čára</strong> = povinný kontakt drží, <strong>červená</strong> = chybí. Stěny se vyhlazují (většinové hlasování rastru) — hrubé narovnání na obdélníky je až další krok.</div>
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
        const nm = id => ROOMS[IDX[id]].nazev;

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

        // Topologicky rozumný start (chodba uprostřed, sousedé kolem) – ne čistě náhodně.
        const BASE = {
            chodba: [6, 4], obyvak: [3, 4.5], zadveri: [6, 1], koupelna: [8.5, 2.5], wc: [9, 5],
            loznice1: [3, 1.5], loznice2: [10, 2], loznice3: [10, 6.5],
        };

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
        let assign = new Int16Array(COLS * ROWS);   // syrové přiřazení (plochy, síly)
        let disp = new Int16Array(COLS * ROWS);     // vyhlazené (kresba)
        let sous = new Set();                        // aktuální sousednosti
        let dragged = -1;

        function reset() {
            site = ROOMS.map(r => {
                const b = BASE[r.id] || [6, 4];
                const jx = (Math.random() - 0.5) * 1.2, jy = (Math.random() - 0.5) * 1.2;
                return { x: b[0] + jx, y: b[1] + jy, w: 0, area: 0, cx: b[0], cy: b[1] };
            });
            dragged = -1;
        }
        reset();

        const kkey = (a, b) => a < b ? a + '-' + b : b + '-' + a;
        const ma = (aId, bId) => sous.has(kkey(IDX[aId], IDX[bId]));   // dotýkají se místnosti?

        // Detekce sousedností z rastru
        function detekuj(g) {
            const s = new Set();
            for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                const r = g[j * COLS + i];
                if (i + 1 < COLS) { const r2 = g[j * COLS + i + 1]; if (r2 !== r) s.add(kkey(r, r2)); }
                if (j + 1 < ROWS) { const r2 = g[(j + 1) * COLS + i]; if (r2 !== r) s.add(kkey(r, r2)); }
            }
            return s;
        }

        // Vyhlazení rastru: buňka převezme štítek, který má většina 4-sousedů (sežere zuby)
        function vyhlad(src) {
            let g = src.slice();
            for (let pass = 0; pass < 2; pass++) {
                const n = g.slice();
                for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                    const cur = g[j * COLS + i], cnt = {};
                    if (i > 0) cnt[g[j * COLS + i - 1]] = (cnt[g[j * COLS + i - 1]] || 0) + 1;
                    if (i + 1 < COLS) cnt[g[j * COLS + i + 1]] = (cnt[g[j * COLS + i + 1]] || 0) + 1;
                    if (j > 0) cnt[g[(j - 1) * COLS + i]] = (cnt[g[(j - 1) * COLS + i]] || 0) + 1;
                    if (j + 1 < ROWS) cnt[g[(j + 1) * COLS + i]] = (cnt[g[(j + 1) * COLS + i]] || 0) + 1;
                    let bl = cur, bc = 0;
                    for (const l in cnt) if (cnt[l] > bc) { bc = cnt[l]; bl = +l; }
                    if (bl !== cur && bc >= 3) n[j * COLS + i] = bl;  // jen výrazná většina
                }
                g = n;
            }
            return g;
        }

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
            sous = detekuj(assign);   // změř reálné sousednosti PŘED silami → zpětná vazba

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

            // 3) přitažlivosti se ZPĚTNOU VAZBOU: rozpojený povinný pár tahá silně, držící jen slabě
            const pull = (aId, bId, f) => {
                const a = IDX[aId], b = IDX[bId];
                tx[a] += (site[b].x - site[a].x) * f; ty[a] += (site[b].y - site[a].y) * f;
                tx[b] += (site[a].x - site[b].x) * f; ty[b] += (site[a].y - site[b].y) * f;
            };
            HARD.forEach(([a, b]) => pull(a, b, ma(a, b) ? 0.04 : 0.30));
            ORADJ.forEach(o => {
                if (o.z.some(opt => ma(o.room, opt))) return;   // už se něčeho drží → nech být
                const r = IDX[o.room];
                let best = null, bd = Infinity;
                o.z.forEach(opt => { const k = IDX[opt]; const d = (site[k].x - site[r].x) ** 2 + (site[k].y - site[r].y) ** 2; if (d < bd) { bd = d; best = k; } });
                if (best != null) { tx[r] += (site[best].x - site[r].x) * 0.26; ty[r] += (site[best].y - site[r].y) * 0.26; }
            });
            // 4) na stěnu (vstup) – přitáhni k nejbližšímu vodorovnému okraji
            NA_STENE.forEach(id => { const k = IDX[id]; const cil = site[k].y < FOOT.h / 2 ? 0 : FOOT.h; ty[k] += (cil - site[k].y) * 0.12; });

            // 5) posun bodů k cílům (mimo tažený)
            for (let k = 0; k < site.length; k++) {
                if (k === dragged) continue;
                site[k].x += (tx[k] - site[k].x) * 0.30;
                site[k].y += (ty[k] - site[k].y) * 0.30;
                site[k].x = Math.max(0.05, Math.min(FOOT.w - 0.05, site[k].x));
                site[k].y = Math.max(0.05, Math.min(FOOT.h - 0.05, site[k].y));
            }
        }

        // ── Vykreslení ───────────────────────────────────────────────
        const grafEl = document.getElementById('ks-graf');
        function kresli() {
            disp = vyhlad(assign);
            ctx.clearRect(0, 0, cv.width, cv.height);
            // výplně (z vyhlazeného rastru)
            for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                ctx.fillStyle = ROOMS[disp[j * COLS + i]].barva;
                ctx.fillRect(mx(i * CELL), mx(j * CELL), CELL * PX + 1, CELL * PX + 1);
            }
            // stěny (hranice mezi různými místnostmi)
            ctx.strokeStyle = '#4a453c'; ctx.lineWidth = 1.5; ctx.beginPath();
            for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
                const r = disp[j * COLS + i];
                if (i + 1 < COLS && disp[j * COLS + i + 1] !== r) { ctx.moveTo(mx((i + 1) * CELL), mx(j * CELL)); ctx.lineTo(mx((i + 1) * CELL), mx((j + 1) * CELL)); }
                if (j + 1 < ROWS && disp[(j + 1) * COLS + i] !== r) { ctx.moveTo(mx(i * CELL), mx((j + 1) * CELL)); ctx.lineTo(mx((i + 1) * CELL), mx((j + 1) * CELL)); }
            }
            ctx.stroke();
            // obvod
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 2.5;
            ctx.strokeRect(mx(0), mx(0), FOOT.w * PX, FOOT.h * PX);

            // graf povinných kontaktů (zelená = drží, červená = chybí)
            if (grafEl.checked) {
                const cara = (aId, bId, ok) => {
                    ctx.strokeStyle = ok ? 'rgba(30,140,60,.85)' : 'rgba(200,40,40,.9)';
                    ctx.lineWidth = ok ? 2 : 3; ctx.setLineDash(ok ? [] : [5, 4]); ctx.beginPath();
                    ctx.moveTo(mx(site[IDX[aId]].cx), mx(site[IDX[aId]].cy));
                    ctx.lineTo(mx(site[IDX[bId]].cx), mx(site[IDX[bId]].cy)); ctx.stroke();
                };
                HARD.forEach(([a, b]) => cara(a, b, ma(a, b)));
                ORADJ.forEach(o => { const t = o.z.find(opt => ma(o.room, opt)) || o.z[0]; cara(o.room, t, o.z.some(opt => ma(o.room, opt))); });
                ctx.setLineDash([]);
            }

            // popisky
            ctx.fillStyle = '#2a2a2a'; ctx.font = '600 12px sans-serif'; ctx.textAlign = 'center';
            ROOMS.forEach((r, k) => { ctx.fillText(r.nazev, mx(site[k].cx), mx(site[k].cy) - 4); ctx.fillText(Math.round(site[k].area) + ' m²', mx(site[k].cx), mx(site[k].cy) + 10); });

            // stav sousedností + výpis chybějících
            const broken = [];
            HARD.forEach(([a, b]) => { if (!ma(a, b)) broken.push(nm(a) + '–' + nm(b)); });
            ORADJ.forEach(o => { if (!o.z.some(opt => ma(o.room, opt))) broken.push(nm(o.room) + '–(' + o.z.map(nm).join('/') + ')'); });
            const cel = HARD.length + ORADJ.length, ok = cel - broken.length;
            const el = document.getElementById('ks-stav');
            el.textContent = 'sousednosti: ' + ok + '/' + cel + (broken.length ? ' · chybí: ' + broken.join(', ') : ' ✓');
            el.className = 'ks-stav ' + (broken.length ? 'bad' : 'ok');
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
