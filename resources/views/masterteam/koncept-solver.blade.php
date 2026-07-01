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
        <h1>Koncept solver — obdélníky (v5)</h1>
        <p class="muted">Balonky (body) řídí <strong>topologii</strong> — kdo je nad/pod chodbou a v jakém pořadí. Kreslí se ale <strong>skutečné obdélníky</strong>: chodba je vodorovná páteř přes celou šířku, pokoje v pásech nad/pod ní. Každý pokoj je obdélník (4 rohy) a dotýká se chodby → povinné sousednosti drží konstrukcí. <strong>Chyť pokoj tažením</strong> a přesuň nad/pod chodbu.</p>

        <div class="ks-bar">
            <button id="ks-reset" class="btn btn-primary">Přeskládat</button>
            <label style="display:flex;gap:.35rem;align-items:center;font-size:.85rem;"><input type="checkbox" id="ks-graf" checked> zvýraznit povinné kontakty</label>
            <span id="ks-stav" class="ks-stav"></span>
        </div>

        <canvas id="ks-canvas"></canvas>
        <div class="ks-legend">Pozemek 12 × 8 m. <strong>Zelená čára</strong> = povinný kontakt drží, <strong>červená</strong> = chybí. Rozpočet rohů = 4 + plocha/6; obdélník = 4 (vždy splněno). Chodba absorbuje případnou vůli v ploše (může být širší). Vodorovná páteř je záměrné zjednodušení v1 — svislá / do L přijdou později.</div>
    </div>

    <script>
    (function () {
        // ── Program (napevno – dům 3+kk) ─────────────────────────────
        const FOOT = { w: 12, h: 8 }, W = FOOT.w, H = FOOT.h;
        const ROOMS = [
            { id: 'zadveri',  nazev: 'Zádveří',        area: 5,  barva: '#c9d7e8' },
            { id: 'chodba',   nazev: 'Chodba',         area: 8,  barva: '#e6e0d2' },
            { id: 'obyvak',   nazev: 'Obývák+kuchyň',  area: 32, barva: '#f2d7a8' },
            { id: 'loznice1', nazev: 'Ložnice rodičů', area: 14, barva: '#cfe3cf' },
            { id: 'loznice2', nazev: 'Ložnice',        area: 12, barva: '#cfe3cf' },
            { id: 'loznice3', nazev: 'Dětský pokoj',   area: 11, barva: '#cfe3cf' },
            { id: 'koupelna', nazev: 'Koupelna',       area: 6,  barva: '#b9dfe6' },
            { id: 'wc',       nazev: 'WC',             area: 2,  barva: '#b9dfe6' },
        ];
        const IDX = {}; ROOMS.forEach((r, i) => IDX[r.id] = i);
        const nm = id => ROOMS[IDX[id]].nazev;
        const CORRIDOR = 'chodba';
        const CI = IDX[CORRIDOR];

        // Povinné sousednosti (drží konstrukcí páteře, ale kontrolujeme a kreslíme je)
        const HARD = [['zadveri', 'chodba'], ['chodba', 'obyvak'], ['chodba', 'koupelna'], ['chodba', 'wc']];
        const ORADJ = [
            { room: 'loznice1', z: ['obyvak', 'chodba'] },
            { room: 'loznice2', z: ['obyvak', 'chodba'] },
            { room: 'loznice3', z: ['obyvak', 'chodba'] },
        ];

        // ── Plátno ───────────────────────────────────────────────────
        const PX = 56, PAD = 18;
        const cv = document.getElementById('ks-canvas');
        cv.width = W * PX + 2 * PAD; cv.height = H * PX + 2 * PAD;
        const ctx = cv.getContext('2d');
        const mx = m => PAD + m * PX;

        // ── Body (balonky) – řídí uspořádání ─────────────────────────
        const BASE = {
            chodba: [6, 4], obyvak: [3, 5.5], zadveri: [1.5, 1.5], koupelna: [8.5, 1.5],
            wc: [10.5, 1.5], loznice1: [5, 1.5], loznice2: [6, 6.5], loznice3: [9.5, 6.5],
        };
        let pt = ROOMS.map(() => ({ x: 0, y: 0 }));
        let dragged = -1;
        function reset() {
            pt = ROOMS.map(r => { const b = BASE[r.id] || [6, 4]; return { x: b[0] + (Math.random() - 0.5) * 1.6, y: b[1] + (Math.random() - 0.5) * 1.6 }; });
            dragged = -1;
        }
        reset();

        // ── Lehká fyzika bodů (jen aby se to hezky usadilo) ──────────
        function krok() {
            const fx = pt.map(() => 0), fy = pt.map(() => 0);
            // odpuzování všech dvojic
            for (let i = 0; i < pt.length; i++) for (let j = i + 1; j < pt.length; j++) {
                let dx = pt[i].x - pt[j].x, dy = pt[i].y - pt[j].y; let d = Math.hypot(dx, dy) || 0.01;
                if (d < 3) { const f = (3 - d) / d * 0.02; fx[i] += dx * f; fy[i] += dy * f; fx[j] -= dx * f; fy[j] -= dy * f; }
            }
            // pružiny povinných sousedností (přitahují na vzdálenost ~2,5)
            const spring = (a, b, k) => { let dx = pt[b].x - pt[a].x, dy = pt[b].y - pt[a].y; let d = Math.hypot(dx, dy) || 0.01; const f = (d - 2.5) / d * k; fx[a] += dx * f; fy[a] += dy * f; fx[b] -= dx * f; fy[b] -= dy * f; };
            HARD.forEach(([a, b]) => spring(IDX[a], IDX[b], 0.03));
            ORADJ.forEach(o => { let best = null, bd = Infinity; o.z.forEach(opt => { const k = IDX[opt]; const dd = (pt[k].x - pt[IDX[o.room]].x) ** 2 + (pt[k].y - pt[IDX[o.room]].y) ** 2; if (dd < bd) { bd = dd; best = k; } }); if (best != null) spring(IDX[o.room], best, 0.03); });
            // chodba do svislého středu; zádveří k levému kraji
            fy[CI] += (H / 2 - pt[CI].y) * 0.06;
            if (IDX.zadveri != null) fx[IDX.zadveri] += (1.5 - pt[IDX.zadveri].x) * 0.04;
            // integrace
            for (let k = 0; k < pt.length; k++) {
                if (k === dragged) continue;
                pt[k].x = Math.max(0.1, Math.min(W - 0.1, pt[k].x + fx[k]));
                pt[k].y = Math.max(0.1, Math.min(H - 0.1, pt[k].y + fy[k]));
            }
        }

        // ── Rozvržení: chodba = vodorovná páteř, pokoje v pásech ─────
        let rects = [];
        function layout() {
            const cy = pt[CI].y;
            const others = ROOMS.map((_, k) => k).filter(k => k !== CI);
            const area = k => ROOMS[k].area;
            const top = others.filter(k => pt[k].y < cy).sort((a, b) => pt[a].x - pt[b].x);
            const bot = others.filter(k => pt[k].y >= cy).sort((a, b) => pt[a].x - pt[b].x);
            const Atop = top.reduce((s, k) => s + area(k), 0), Abot = bot.reduce((s, k) => s + area(k), 0);
            let Htop = Atop / W, Hbot = Abot / W, hc = H - Htop - Hbot;
            if (hc < 0.6) { const sc = (H - 0.6) / (Htop + Hbot || 1); Htop *= sc; Hbot *= sc; hc = 0.6; } // chodba min 0,6 m

            rects = new Array(ROOMS.length);
            let x = 0;
            top.forEach((k, i) => { let w = area(k) / (Htop || 1); rects[k] = { k, x, y: 0, w, h: Htop }; x += w; });
            if (top.length) rects[top[top.length - 1]].w = W - rects[top[top.length - 1]].x; // dorovnat na šířku
            rects[CI] = { k: CI, x: 0, y: Htop, w: W, h: hc };
            x = 0;
            bot.forEach((k, i) => { let w = area(k) / (Hbot || 1); rects[k] = { k, x, y: Htop + hc, w, h: Hbot }; x += w; });
            if (bot.length) rects[bot[bot.length - 1]].w = W - rects[bot[bot.length - 1]].x;
        }

        // dotyk dvou obdélníků (sdílená hrana s kladným překryvem)
        const eq = (p, q) => Math.abs(p - q) < 1e-6;
        function touch(A, B) {
            if (!A || !B) return false;
            const yov = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
            const xov = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
            if ((eq(A.x + A.w, B.x) || eq(B.x + B.w, A.x)) && yov > 0.05) return true;
            if ((eq(A.y + A.h, B.y) || eq(B.y + B.h, A.y)) && xov > 0.05) return true;
            return false;
        }
        const ma = (a, b) => touch(rects[IDX[a]], rects[IDX[b]]);

        // ── Vykreslení ───────────────────────────────────────────────
        const grafEl = document.getElementById('ks-graf');
        const cxr = r => r.x + r.w / 2, cyr = r => r.y + r.h / 2;
        function kresli() {
            layout();
            ctx.clearRect(0, 0, cv.width, cv.height);
            // výplně + stěny
            ctx.lineWidth = 2; ctx.strokeStyle = '#4a453c';
            rects.forEach(r => {
                ctx.fillStyle = ROOMS[r.k].barva;
                ctx.fillRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
                ctx.strokeRect(mx(r.x), mx(r.y), r.w * PX, r.h * PX);
            });
            // obvod
            ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = 3;
            ctx.strokeRect(mx(0), mx(0), W * PX, H * PX);

            // graf povinných kontaktů
            if (grafEl.checked) {
                const cara = (aId, bId, ok) => {
                    ctx.strokeStyle = ok ? 'rgba(30,140,60,.85)' : 'rgba(200,40,40,.9)';
                    ctx.lineWidth = ok ? 2 : 3; ctx.setLineDash(ok ? [] : [5, 4]); ctx.beginPath();
                    ctx.moveTo(mx(cxr(rects[IDX[aId]])), mx(cyr(rects[IDX[aId]])));
                    ctx.lineTo(mx(cxr(rects[IDX[bId]])), mx(cyr(rects[IDX[bId]]))); ctx.stroke();
                };
                HARD.forEach(([a, b]) => cara(a, b, ma(a, b)));
                ORADJ.forEach(o => { const t = o.z.find(opt => ma(o.room, opt)) || o.z[0]; cara(o.room, t, o.z.some(opt => ma(o.room, opt))); });
                ctx.setLineDash([]);
            }

            // popisky (název · plocha · rohy/rozpočet – vždy 4 rohy)
            ctx.fillStyle = '#2a2a2a'; ctx.textAlign = 'center';
            rects.forEach(r => {
                const budget = 4 + Math.floor(ROOMS[r.k].area / 6);
                ctx.font = '600 12px sans-serif';
                ctx.fillText(ROOMS[r.k].nazev, mx(cxr(r)), mx(cyr(r)) - 5);
                ctx.font = '11px sans-serif';
                ctx.fillText(Math.round(r.w * r.h) + ' m² · 4/' + budget + ' rohů', mx(cxr(r)), mx(cyr(r)) + 9);
            });

            // stav sousedností
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

        // ── Interakce (tažení pokoje = posun jeho bodu → přeskládá pásy) ──
        function bodNaPozici(e) {
            const rect = cv.getBoundingClientRect();
            const mmx = (e.clientX - rect.left - PAD) / PX, mmy = (e.clientY - rect.top - PAD) / PX;
            if (mmx < 0 || mmy < 0 || mmx > W || mmy > H) return { k: -1 };
            const hit = rects.find(r => mmx >= r.x && mmx <= r.x + r.w && mmy >= r.y && mmy <= r.y + r.h);
            return { k: hit ? hit.k : -1, mmx, mmy };
        }
        cv.addEventListener('mousedown', e => { dragged = bodNaPozici(e).k; });
        cv.addEventListener('mousemove', e => { if (dragged < 0) return; const p = bodNaPozici(e); if (p.k >= 0 || p.mmx != null) { pt[dragged].x = Math.max(0.1, Math.min(W - 0.1, p.mmx)); pt[dragged].y = Math.max(0.1, Math.min(H - 0.1, p.mmy)); } });
        window.addEventListener('mouseup', () => { dragged = -1; });
        document.getElementById('ks-reset').addEventListener('click', reset);
    })();
    </script>
</x-layouts.app>
