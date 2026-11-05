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
     * @param {{res?: number, vyrezy?: Array, podLimitem?: Array, bezOddelovacu?: boolean}} nast  res = krok rastru v metrech;
     *        bezOddelovacu = prostor ohraničený jen stěnami (kuchyň a obývák s oddělovačem jsou jeden);
     *        vyrezy = polygony (px), které se do plochy nepočítají (galerie, prostupy);
     *        podLimitem = polygony (px) pod limitem výšky v podkroví — zapocitatelna_m2 je bez nich
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
        for (const o of nast.bezOddelovacu ? [] : engine.oddelovace.values()) {
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
        // Plochy s výřezy: druhá bitmapa, spočítat buňky po místnostech
        const vyrezy = nast.vyrezy || [], podLimitem = nast.podLimitem || [];
        if (komponenty.length && (vyrezy.length || podLimitem.length)) {
            const kresli = (polygony) => {
                const c2 = document.createElement('canvas');
                c2.width = w; c2.height = h;
                const g2 = c2.getContext('2d', { willReadFrequently: true });
                g2.fillStyle = '#000';
                for (const poly of polygony) {
                    g2.beginPath();
                    poly.forEach((p, i) => { const x = (p.x - x0) / krok, y = (p.y - y0) / krok; if (i === 0) g2.moveTo(x, y); else g2.lineTo(x, y); });
                    g2.closePath();
                    g2.fill();
                }
                return g2.getImageData(0, 0, w, h).data;
            };
            const dv = vyrezy.length ? kresli(vyrezy) : null;
            const dp = podLimitem.length ? kresli(podLimitem) : null;
            const vyr = new Map(), niz = new Map();
            for (let i = 0; i < w * h; i++) {
                const s = stitky[i];
                if (s < 2) continue;
                const jeVyrez = dv && dv[i * 4 + 3] > 127;
                if (jeVyrez) vyr.set(s, (vyr.get(s) || 0) + 1);
                else if (dp && dp[i * 4 + 3] > 127) niz.set(s, (niz.get(s) || 0) + 1);
            }
            for (const k of komponenty) {
                const celkem = k.plocha_m2;
                k.plocha_m2 = Math.round((celkem - (vyr.get(k.stitek) || 0) * plochaBunky) * 100) / 100;
                if (podLimitem.length) k.zapocitatelna_m2 = Math.round((k.plocha_m2 - (niz.get(k.stitek) || 0) * plochaBunky) * 100) / 100;
            }
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

    /**
     * Obrys jedné místnosti (komponenta se štítkem `stitek`) jako polygon v kreslicích px.
     * Jde po rozích buněk kolem vnější hranice (stejný postup jako obrys domu ve strecha.js)
     * a zjednoduší se na 1,6 buňky, takže rovné stěny dají rovné hrany. Díry uvnitř
     * místnosti (sloup) se do obrysu nepromítají. Slouží výškovým plochám (dum.js).
     */
    function obrysMistnosti(v, stitek) {
        const { w, h, stitky, x0, y0, krok } = v;
        const uvnitr = (x, y) => x >= 0 && y >= 0 && x < w && y < h && stitky[y * w + x] === stitek;
        let sx = -1, sy = -1;
        hledej: for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (uvnitr(x, y)) { sx = x; sy = y; break hledej; }
            }
        }
        if (sx < 0) return [];
        // Pohyb po rozích buněk; směr 0 = východ, 1 = jih, 2 = západ, 3 = sever (y dolů)
        const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
        const cesta = [];
        let x = sx, y = sy, s = 0, kroku = 0;
        const limit = 4 * (w + h) * 20;
        do {
            cesta.push({ x, y });
            let lx, ly, px, py;
            if (s === 0) { lx = x; ly = y - 1; px = x; py = y; }
            else if (s === 1) { lx = x; ly = y; px = x - 1; py = y; }
            else if (s === 2) { lx = x - 1; ly = y; px = x - 1; py = y - 1; }
            else { lx = x - 1; ly = y - 1; px = x; py = y - 1; }
            if (uvnitr(lx, ly)) s = (s + 3) % 4;
            else if (!uvnitr(px, py)) s = (s + 1) % 4;
            x += DX[s]; y += DY[s];
        } while ((x !== sx || y !== sy) && ++kroku < limit);
        return zjednodus(cesta.map(c => ({ x: x0 + c.x * krok, y: y0 + c.y * krok })), krok * 1.6);
    }

    /** Douglas-Peucker na uzavřené křivce. */
    function zjednodus(body, tol) {
        if (body.length < 4) return body;
        let dal = 0, ib = 0;
        for (let i = 1; i < body.length; i++) {
            const d = Math.hypot(body[i].x - body[0].x, body[i].y - body[0].y);
            if (d > dal) { dal = d; ib = i; }
        }
        const dp = (p) => {
            if (p.length < 3) return p;
            const a = p[0], b = p[p.length - 1];
            const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
            let m = -1, im = 0;
            for (let i = 1; i < p.length - 1; i++) {
                const d = Math.abs((p[i].x - a.x) * dy - (p[i].y - a.y) * dx) / L;
                if (d > m) { m = d; im = i; }
            }
            if (m <= tol) return [a, b];
            return dp(p.slice(0, im + 1)).slice(0, -1).concat(dp(p.slice(im)));
        };
        const c1 = dp(body.slice(0, ib + 1));
        const c2 = dp(body.slice(ib).concat([body[0]]));
        return c1.slice(0, -1).concat(c2.slice(0, -1));
    }

    window.MistnostiRastr = { spocitej, stitekVBode, obrazVyplne, obrysMistnosti, MIN_PLOCHA_M2 };
})();
