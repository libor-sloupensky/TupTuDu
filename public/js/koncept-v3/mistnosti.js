/**
 * Místnosti rastrem (Koncept V3).
 *
 * Stěny a oddělovače místností se vykreslí do neviditelné bitmapy s krokem
 * `res` metru (výchozí 2 cm), volné buňky se spojí záplavou. Každá uzavřená
 * oblast uvnitř domu je místnost, plocha = počet buněk × res². Oblast dotýkající
 * se okraje bitmapy je exteriér. Žádné průsečíky polygonů ani téměř rovnoběžné
 * hrany — proto rastr (rozhodnutí s Liborem 1. 11. 2026; přesná síť ploch ze
 * stěn byla dřív neúnosně složitá).
 *
 * Výstup: mřížka štítků (Int32Array: 0 = stěna/oddělovač, 1 = exteriér, 2+ =
 * místnost) + seznam komponent se středem a plochou. Výplň pod vrstvou stěn
 * kreslí renderer z téže mřížky, schodovité okraje schová stěna.
 */
(function () {
    const MIN_PLOCHA_M2 = 0.3;   // menší kapsy (spáry u spojů stěn) nejsou místnosti

    /**
     * @param {StavebniEngine} engine
     * @param {{res?: number}} nast  res = krok rastru v metrech
     * @returns {null|{x0,y0,krok,w,h,stitky:Int32Array,komponenty:Array}}
     */
    function spocitej(engine, nast = {}) {
        if (!engine || engine.walls.size === 0 || typeof document === 'undefined') return null;
        const PX = engine.PX_PER_M;
        const res = nast.res || 0.02;
        const krok = res * PX;                       // kreslicí px na jednu buňku

        // Obálka všech bodů s okrajem 3 buňky (okraj = exteriér)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const bod = (p) => { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; };
        for (const n of engine.nodes.values()) bod(n);
        for (const o of engine.oddelovace.values()) { bod(engine.bodKonceOddelovace(o.a)); bod(engine.bodKonceOddelovace(o.b)); }
        if (!isFinite(minX)) return null;
        const okraj = 3 * krok + 0.5 * PX;           // + půl metru pro tloušťky stěn
        const x0 = minX - okraj, y0 = minY - okraj;
        const w = Math.ceil((maxX - minX + 2 * okraj) / krok);
        const h = Math.ceil((maxY - minY + 2 * okraj) / krok);
        if (w < 4 || h < 4 || w * h > 6e6) return null;  // nad 6 mil. buněk (např. 50 × 50 m při 2 cm) raději nic

        // Rastr: bílá volno, černá překážka
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d', { willReadFrequently: true });
        g.fillStyle = '#fff';
        g.fillRect(0, 0, w, h);
        g.fillStyle = '#000';
        g.strokeStyle = '#000';
        for (const wall of engine.walls.values()) {
            const poly = engine.getWallPolygon(wall.id);
            if (!poly || poly.length < 3) continue;
            g.beginPath();
            poly.forEach((p, i) => { const x = (p.x - x0) / krok, y = (p.y - y0) / krok; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
            g.closePath();
            g.fill();
        }
        g.lineWidth = 1;   // jedna buňka — oddělovač nemá tloušťku, ať neubírá plochu
        g.lineCap = 'square';
        for (const o of engine.oddelovace.values()) {
            const a = engine.bodKonceOddelovace(o.a), b = engine.bodKonceOddelovace(o.b);
            g.beginPath();
            g.moveTo((a.x - x0) / krok, (a.y - y0) / krok);
            g.lineTo((b.x - x0) / krok, (b.y - y0) / krok);
            g.stroke();
        }
        const data = g.getImageData(0, 0, w, h).data;

        // Štítky: 0 = překážka, 1 = exteriér, 2+ = místnosti
        const stitky = new Int32Array(w * h);
        const volno = new Uint8Array(w * h);
        for (let i = 0; i < w * h; i++) volno[i] = data[i * 4] > 127 ? 1 : 0;
        const zasobnik = new Int32Array(w * h);
        const zaplav = (start, stitek) => {
            let n = 0, pocet = 0, sx = 0, sy = 0;
            zasobnik[n++] = start;
            stitky[start] = stitek;
            while (n > 0) {
                const i = zasobnik[--n];
                pocet++;
                const x = i % w, y = (i - x) / w;
                sx += x; sy += y;
                if (x > 0 && volno[i - 1] && !stitky[i - 1]) { stitky[i - 1] = stitek; zasobnik[n++] = i - 1; }
                if (x < w - 1 && volno[i + 1] && !stitky[i + 1]) { stitky[i + 1] = stitek; zasobnik[n++] = i + 1; }
                if (y > 0 && volno[i - w] && !stitky[i - w]) { stitky[i - w] = stitek; zasobnik[n++] = i - w; }
                if (y < h - 1 && volno[i + w] && !stitky[i + w]) { stitky[i + w] = stitek; zasobnik[n++] = i + w; }
            }
            return { pocet, sx, sy };
        };
        // Exteriér: vše dosažitelné z okraje
        for (let x = 0; x < w; x++) { for (const y of [0, h - 1]) { const i = y * w + x; if (volno[i] && !stitky[i]) zaplav(i, 1); } }
        for (let y = 0; y < h; y++) { for (const x of [0, w - 1]) { const i = y * w + x; if (volno[i] && !stitky[i]) zaplav(i, 1); } }

        const komponenty = [];
        let dalsi = 2;
        const plochaBunky = res * res;
        for (let i = 0; i < w * h; i++) {
            if (!volno[i] || stitky[i]) continue;
            const stitek = dalsi++;
            const v = zaplav(i, stitek);
            const plocha = v.pocet * plochaBunky;
            if (plocha < MIN_PLOCHA_M2) continue;   // kapsa, ne místnost (štítek zůstává, jen se nevede)
            // Střed: těžiště; u tvaru do L může ležet mimo → vezme se nejbližší buňka komponenty
            let cx = v.sx / v.pocet, cy = v.sy / v.pocet;
            const ci = Math.round(cy) * w + Math.round(cx);
            if (stitky[ci] !== stitek) {
                let nejD = Infinity, nej = i;
                for (let j = 0; j < w * h; j++) {
                    if (stitky[j] !== stitek) continue;
                    const jx = j % w, jy = (j - jx) / w;
                    const d = (jx - cx) * (jx - cx) + (jy - cy) * (jy - cy);
                    if (d < nejD) { nejD = d; nej = j; }
                }
                cx = nej % w; cy = (nej - cx) / w;
            }
            komponenty.push({
                stitek,
                plocha_m2: Math.round(plocha * 100) / 100,
                stred: { x: x0 + (cx + 0.5) * krok, y: y0 + (cy + 0.5) * krok },
            });
        }
        return { x0, y0, krok, w, h, stitky, komponenty };
    }

    /** Štítek buňky v kreslicích souřadnicích (0 mimo rastr). */
    function stitekVBode(vysledek, x, y) {
        if (!vysledek) return 0;
        const cx = Math.floor((x - vysledek.x0) / vysledek.krok), cy = Math.floor((y - vysledek.y0) / vysledek.krok);
        if (cx < 0 || cy < 0 || cx >= vysledek.w || cy >= vysledek.h) return 0;
        return vysledek.stitky[cy * vysledek.w + cx];
    }

    /** Výplň místností do průhledné bitmapy: barva podle štítku (hex → RGBA), zbytek průhledný. */
    function obrazVyplne(vysledek, barvaStitku) {
        const { w, h, stitky } = vysledek;
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        const img = g.createImageData(w, h);
        const d = img.data;
        const rgb = new Map();
        for (let i = 0; i < w * h; i++) {
            const s = stitky[i];
            if (s < 2) continue;
            let c = rgb.get(s);
            if (c === undefined) {
                const hex = barvaStitku(s);
                c = hex ? [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)] : null;
                rgb.set(s, c);
            }
            if (!c) continue;
            d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
        }
        g.putImageData(img, 0, 0);
        return cv;
    }

    window.MistnostiRastr = { spocitej, stitekVBode, obrazVyplne, MIN_PLOCHA_M2 };
})();
