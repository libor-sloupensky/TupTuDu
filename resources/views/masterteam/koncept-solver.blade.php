<x-layouts.app title="Koncept solver — TupTuDu">
    <style>
        .ks-wrap { padding: 1.5rem 2rem; max-width: 1000px; margin: 0 auto; }
        .ks-bar { display: flex; gap: 1rem; align-items: center; margin: .5rem 0 1rem; flex-wrap: wrap; }
        #ks-stage { border: 1px solid var(--c-border); border-radius: 10px; background: var(--c-surface); display: inline-block; }
        .ks-legend { font-size: .85rem; color: var(--c-text-secondary); margin-top: .5rem; }
    </style>

    <div class="ks-wrap">
        <h1>Koncept solver — balonky (v1)</h1>
        <p class="muted">Místnosti jako balonky (velikost ≈ plocha). Provázky = povinné sousednosti (táhnou k sobě), balonky se nepřekrývají a drží uvnitř pozemku. <strong>Chyť místnost a přetáhni</strong> — zbytek se přeskládá.</p>

        <div class="ks-bar">
            <button id="ks-reset" class="btn btn-primary">Přeskládat (náhodně)</button>
            <span id="ks-info" class="muted" style="font-size:.85rem;"></span>
        </div>

        <div id="ks-stage"></div>
        <div class="ks-legend">Pozemek 12 × 8 m. v1 pravidla: sousednost (provázky) · nepřekrývání · uvnitř pozemku · velikost ≈ plocha. (Narovnání na obdélníky, orientace a nábytek přidáme dál.)</div>
    </div>

    <script src="/js/konva-9.min.js"></script>
    <script>
    (function () {
        // ── Program (napevno – dům 3+kk) ─────────────────────────────
        const FOOTPRINT = { w: 12, h: 8 }; // metry
        const ROOMS = [
            { id: 'zadveri',  nazev: 'Zádveří',          area: 5,  barva: '#c9d7e8' },
            { id: 'chodba',   nazev: 'Chodba',           area: 8,  barva: '#d7d2c8' },
            { id: 'obyvak',   nazev: 'Obývák + kuchyň',  area: 32, barva: '#f0d9b8' },
            { id: 'loznice1', nazev: 'Ložnice rodičů',   area: 14, barva: '#cfe3cf' },
            { id: 'loznice2', nazev: 'Ložnice',          area: 12, barva: '#cfe3cf' },
            { id: 'loznice3', nazev: 'Dětský pokoj',     area: 11, barva: '#cfe3cf' },
            { id: 'koupelna', nazev: 'Koupelna',         area: 6,  barva: '#bfe0e6' },
            { id: 'wc',       nazev: 'WC',               area: 2,  barva: '#bfe0e6' },
        ];
        // Povinné sousednosti (provázky). true = tvrdé (silné).
        const EDGES = [
            ['zadveri', 'chodba', true],
            ['chodba', 'obyvak', true],
            ['chodba', 'loznice1', true],
            ['chodba', 'loznice2', true],
            ['chodba', 'loznice3', true],
            ['chodba', 'koupelna', true],
            ['koupelna', 'wc', true],
        ];

        // ── Nastavení plátna ─────────────────────────────────────────
        const PX = 52, PAD = 24;
        const W = FOOTPRINT.w, H = FOOTPRINT.h;
        const stageW = W * PX + 2 * PAD, stageH = H * PX + 2 * PAD;
        const mx = m => PAD + m * PX; // metry → px

        const stage = new Konva.Stage({ container: 'ks-stage', width: stageW, height: stageH });
        const podklad = new Konva.Layer(), spojeLayer = new Konva.Layer(), roomLayer = new Konva.Layer();
        stage.add(podklad); stage.add(spojeLayer); stage.add(roomLayer);

        // Pozemek
        podklad.add(new Konva.Rect({ x: PAD, y: PAD, width: W * PX, height: H * PX, stroke: '#8a8578', strokeWidth: 2, fill: '#faf8f4' }));
        podklad.draw();

        // ── Stav balonků ─────────────────────────────────────────────
        const uzel = {}; // id → {x,y (m), vx,vy, r (m), pinned, grp}
        ROOMS.forEach(r => {
            uzel[r.id] = { x: 0, y: 0, vx: 0, vy: 0, r: Math.sqrt(r.area / Math.PI), pinned: false, def: r };
        });

        // Konva skupiny (kruh + popisek), draggable
        ROOMS.forEach(r => {
            const u = uzel[r.id];
            const grp = new Konva.Group({ draggable: true });
            const circle = new Konva.Circle({ radius: u.r * PX, fill: r.barva, stroke: '#6b6355', strokeWidth: 1.5, opacity: 0.92 });
            const txt = new Konva.Text({ text: r.nazev + '\n' + r.area + ' m²', fontSize: 12, fontStyle: '600',
                fill: '#2a2a2a', align: 'center', width: u.r * PX * 2, offsetX: u.r * PX, offsetY: 8 });
            grp.add(circle); grp.add(txt);
            grp.on('dragstart', () => { u.pinned = true; });
            grp.on('dragend', () => { u.pinned = false; });
            u.grp = grp;
            roomLayer.add(grp);
        });

        // Spojnice (provázky)
        const cary = EDGES.map(([a, b, hard]) => {
            const l = new Konva.Line({ points: [0, 0, 0, 0], stroke: hard ? '#b8896b' : '#c9c4ba', strokeWidth: hard ? 2 : 1, dash: hard ? [] : [4, 4] });
            spojeLayer.add(l);
            return { a, b, l };
        });

        function nahodneRozmisti() {
            ROOMS.forEach(r => {
                const u = uzel[r.id];
                u.x = u.r + Math.random() * (W - 2 * u.r);
                u.y = u.r + Math.random() * (H - 2 * u.r);
                u.vx = u.vy = 0; u.pinned = false;
            });
        }
        nahodneRozmisti();

        // ── Fyzika ───────────────────────────────────────────────────
        const K_SPRING_HARD = 0.10, K_SPRING_SOFT = 0.04, K_REP = 0.9, K_CONTAIN = 0.8, K_GRAV = 0.004, DAMP = 0.86, DT = 0.5;

        function krok() {
            const fx = {}, fy = {};
            ROOMS.forEach(r => { fx[r.id] = 0; fy[r.id] = 0; });

            // střed pozemku – slabá gravitace (kompaktnost)
            ROOMS.forEach(r => {
                const u = uzel[r.id];
                fx[r.id] += (W / 2 - u.x) * K_GRAV;
                fy[r.id] += (H / 2 - u.y) * K_GRAV;
            });

            // odpuzování (nepřekrývat) – všechny páry
            for (let i = 0; i < ROOMS.length; i++) for (let j = i + 1; j < ROOMS.length; j++) {
                const a = uzel[ROOMS[i].id], b = uzel[ROOMS[j].id];
                let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
                const min = a.r + b.r;
                if (d < min) {
                    const f = (min - d) * K_REP, ux = dx / d, uy = dy / d;
                    fx[ROOMS[i].id] -= ux * f; fy[ROOMS[i].id] -= uy * f;
                    fx[ROOMS[j].id] += ux * f; fy[ROOMS[j].id] += uy * f;
                }
            }

            // pružiny (sousednosti) – táhnout, aby se dotýkaly
            EDGES.forEach(([a, b, hard]) => {
                const ua = uzel[a], ub = uzel[b];
                let dx = ub.x - ua.x, dy = ub.y - ua.y, d = Math.hypot(dx, dy) || 0.001;
                const d0 = ua.r + ub.r; // dotyk
                const k = hard ? K_SPRING_HARD : K_SPRING_SOFT;
                const f = (d - d0) * k, ux = dx / d, uy = dy / d;
                fx[a] += ux * f; fy[a] += uy * f;
                fx[b] -= ux * f; fy[b] -= uy * f;
            });

            // integrace + udržet v pozemku
            ROOMS.forEach(r => {
                const u = uzel[r.id];
                if (u.pinned) { // pozici bere z tažené skupiny
                    u.x = (u.grp.x() - PAD) / PX; u.y = (u.grp.y() - PAD) / PX;
                    u.vx = u.vy = 0;
                    return;
                }
                u.vx = (u.vx + fx[r.id] * DT) * DAMP;
                u.vy = (u.vy + fy[r.id] * DT) * DAMP;
                u.x += u.vx * DT; u.y += u.vy * DT;
                // containment
                u.x = Math.max(u.r, Math.min(W - u.r, u.x));
                u.y = Math.max(u.r, Math.min(H - u.r, u.y));
            });
        }

        function vykresli() {
            ROOMS.forEach(r => { const u = uzel[r.id]; if (!u.pinned) u.grp.position({ x: mx(u.x), y: mx(u.y) }); });
            cary.forEach(c => { const a = uzel[c.a], b = uzel[c.b]; c.l.points([mx(a.x), mx(a.y), mx(b.x), mx(b.y)]); });
            roomLayer.batchDraw(); spojeLayer.batchDraw();
        }

        function smycka() { for (let s = 0; s < 2; s++) krok(); vykresli(); requestAnimationFrame(smycka); }
        smycka();

        document.getElementById('ks-reset').addEventListener('click', nahodneRozmisti);
        document.getElementById('ks-info').textContent = ROOMS.length + ' místností · ' + EDGES.length + ' vazeb';
    })();
    </script>
</x-layouts.app>
