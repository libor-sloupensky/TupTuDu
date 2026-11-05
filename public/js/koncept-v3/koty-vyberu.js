/**
 * Kóty u vybrané stěny nebo otvoru (Koncept V3).
 *
 * Stěna: světlá vzdálenost k rovnoběžným stěnám, které ohraničují stejný prostor.
 * Prostor se pozná z rastru (mistnosti.js) podle štítku těsně za lícem stěny; oddělovač
 * místností prostor nedělí, je to jen čára (Klemov: W18 vidí přes něj až na W12).
 * Otvor: od ostění po přilehlou stěnu, na každé straně stěny zvlášť. Měří se přesně
 * po polygonech stěn, rastr říká jen to, která strana je exteriér.
 * Číslo a tužtička se kreslí na plátno a kliká se na ně přes kotaVBode.
 */
(function () {
    const MAX_ODCHYLKA = Math.sin(3 * Math.PI / 180);   // rovnoběžná = do 3°
    const STEJNE_PX = 0.4;                               // do 5 mm jde o tutéž hodnotu

    function osaSteny(engine, wall) {
        const a = engine.nodes.get(wall.nodeA), b = engine.nodes.get(wall.nodeB);
        if (!a || !b) return null;
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        if (L < 1) return null;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
        return { a, b, L, ux, uy, nx: -uy, ny: ux, tl: (wall.tloustka || 0) * engine.PX_PER_M };
    }

    /** Štítky místností na jedné straně stěny, vzorkováno podél celého líce. */
    function mistnostiNaStrane(rastr, o, strana, povolene) {
        const R = window.MistnostiRastr;
        const odstup = o.tl / 2 + 3 * rastr.krok;
        const vysledek = new Set();
        const kroku = Math.max(4, Math.ceil(o.L / (rastr.krok * 4)));
        for (let i = 0; i <= kroku; i++) {
            const s = o.L * i / kroku;
            const st = R.stitekVBode(rastr, o.a.x + o.ux * s + o.nx * strana * odstup, o.a.y + o.uy * s + o.ny * strana * odstup);
            if (povolene.has(st)) vysledek.add(st);
        }
        return vysledek;
    }

    /** Světlá vzdálenost (px) stěny `w` od rovnoběžné stěny `cil`; záporná, když se překrývají. */
    function vzdalenostSten(engine, w, cil) {
        const o = osaSteny(engine, w), c = osaSteny(engine, cil);
        if (!o || !c) return null;
        const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2;
        const off = (mx - o.a.x) * o.nx + (my - o.a.y) * o.ny;
        return Math.abs(off) - o.tl / 2 - c.tl / 2;
    }

    function proStenu(engine, rastr, wallId) {
        const w = engine.walls.get(wallId);
        const o = w && osaSteny(engine, w);
        if (!o || !rastr) return [];
        const povolene = new Set(rastr.komponenty.map(k => k.stitek));
        const strany = new Map([[1, mistnostiNaStrane(rastr, o, 1, povolene)], [-1, mistnostiNaStrane(rastr, o, -1, povolene)]]);
        const nalezene = new Map();
        for (const other of engine.walls.values()) {
            if (other.id === wallId) continue;
            const c = osaSteny(engine, other);
            if (!c || Math.abs(o.ux * c.uy - o.uy * c.ux) > MAX_ODCHYLKA) continue;
            const mx = (c.a.x + c.b.x) / 2, my = (c.a.y + c.b.y) / 2;
            const off = (mx - o.a.x) * o.nx + (my - o.a.y) * o.ny;
            const strana = off >= 0 ? 1 : -1;
            const d = Math.abs(off) - o.tl / 2 - c.tl / 2;
            if (d < 1) continue;
            const nase = strany.get(strana);
            if (!nase.size) continue;
            // Líc cílové stěny obrácený k nám musí ležet ve stejné místnosti
            const pro = { ...c, nx: o.nx, ny: o.ny };
            const tamti = mistnostiNaStrane(rastr, pro, -strana, povolene);
            if (![...tamti].some(s => nase.has(s))) continue;
            // Místo kóty: uprostřed společného úseku; bez něj u bližšího konce stěny
            const s1 = (c.a.x - o.a.x) * o.ux + (c.a.y - o.a.y) * o.uy;
            const s2 = (c.b.x - o.a.x) * o.ux + (c.b.y - o.a.y) * o.uy;
            const od = Math.max(0, Math.min(s1, s2)), po = Math.min(o.L, Math.max(s1, s2));
            const prekryv = po > od;
            const s = prekryv ? (od + po) / 2 : (Math.min(s1, s2) > o.L ? o.L : 0);
            // Stěna rozdělená na díly v jedné přímce se počítá jednou
            const klic = strana + ':' + Math.round(d / 2);
            const dosud = nalezene.get(klic);
            const delka = Math.max(0, po - od);
            if (dosud && dosud.delka >= delka) continue;
            // Číslo leží vedle čáry, na straně ke středu stěny
            const kStredu = s <= o.L / 2 ? 1 : -1;
            nalezene.set(klic, { typ: 'stena', stena: wallId, cil: other.id, strana, d, s, delka, prekryv, nx: o.nx, ny: o.ny, bok: { x: o.ux * kStredu, y: o.uy * kStredu } });
        }
        return [...nalezene.values()].map(k => {
            const start = { x: o.a.x + o.ux * k.s + o.nx * k.strana * o.tl / 2, y: o.a.y + o.uy * k.s + o.ny * k.strana * o.tl / 2 };
            return { ...k, ux: o.nx * k.strana, uy: o.ny * k.strana, start };
        });
    }

    function bodVPolygonu(p, poly) {
        let uvnitr = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const a = poly[i], b = poly[j];
            if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) uvnitr = !uvnitr;
        }
        return uvnitr;
    }

    /** Nejbližší průsečík polopřímky s obrysem polygonu (vzdálenost, nebo Infinity). */
    function paprsekPolygon(p, sx, sy, poly, minT = 0) {
        let nej = Infinity;
        for (let i = 0; i < poly.length; i++) {
            const a = poly[i], b = poly[(i + 1) % poly.length];
            const ex = b.x - a.x, ey = b.y - a.y;
            const det = sx * ey - sy * ex;
            if (Math.abs(det) < 1e-9) continue;
            const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / det;
            const v = ((a.x - p.x) * sy - (a.y - p.y) * sx) / det;
            if (t > minT && t < nej && v >= 0 && v <= 1) nej = t;
        }
        return nej;
    }

    /** Vzdálenost od ostění podél líce: k první stěně před lícem, nejdál po konec zdiva za lícem. */
    function odOsteni(engine, wallId, o, sStart, smer, strana, polygony) {
        const EPS = 0.5;
        const na = (s, off) => ({ x: o.a.x + o.ux * s + o.nx * off, y: o.a.y + o.uy * s + o.ny * off });
        const sx = o.ux * smer, sy = o.uy * smer;
        // Před lícem: první cizí stěna
        const pred = na(sStart, strana * (o.tl / 2 + EPS));
        let d1 = Infinity;
        for (const [id, poly] of polygony) {
            if (id !== wallId) d1 = Math.min(d1, paprsekPolygon(pred, sx, sy, poly));
        }
        // Za lícem: zdivo se sleduje přes spoje, dokud neskončí (vnější roh)
        const off = strana * (o.tl / 2 - EPS);
        let ujeto = 0;
        for (let krok = 0; krok < 24; krok++) {
            const bod = na(sStart + smer * (ujeto + 0.3), off);
            let dalsi = null;
            for (const poly of polygony.values()) {
                if (!bodVPolygonu(bod, poly)) continue;
                const t = paprsekPolygon(bod, sx, sy, poly);
                if (t !== Infinity && (dalsi === null || t > dalsi)) dalsi = t;
            }
            if (dalsi === null) break;
            ujeto += 0.3 + dalsi;
        }
        return Math.min(d1, ujeto);
    }

    function proOtvor(engine, rastr, openingId) {
        const op = engine.openings.get(openingId);
        const w = op && engine.walls.get(op.wallId);
        const o = w && osaSteny(engine, w);
        if (!o) return [];
        const R = window.MistnostiRastr;
        const PX = engine.PX_PER_M;
        const polygony = new Map();
        for (const id of engine.walls.keys()) {
            const poly = engine.getWallPolygon(id);
            if (poly && poly.length >= 3) polygony.set(id, poly);
        }
        const hrany = [{ smer: -1, s: op.pozice * PX }, { smer: 1, s: (op.pozice + op.sirka) * PX }];
        const vysledek = [];
        const sStred = (op.pozice + op.sirka / 2) * PX;
        const ven = (strana) => {
            if (!rastr) return false;
            const q = o.tl / 2 + 3 * rastr.krok;
            return R.stitekVBode(rastr, o.a.x + o.ux * sStred + o.nx * strana * q, o.a.y + o.uy * sStred + o.ny * strana * q) === 1;
        };
        for (const { smer, s } of hrany) {
            const dvojice = [1, -1].map(strana => ({ strana, vnejsi: ven(strana), d: odOsteni(engine, op.wallId, o, s, smer, strana, polygony) }));
            // Stejná vzdálenost z obou stran stačí jednou, přednost má vnější líc
            const stejne = Math.abs(dvojice[0].d - dvojice[1].d) <= STEJNE_PX;
            const vyber = stejne ? [dvojice.find(x => x.vnejsi) || dvojice[0]] : dvojice;
            for (const k of vyber) {
                vysledek.push({
                    typ: 'otvor', otvor: openingId, strana: k.strana, smer, vnejsi: k.vnejsi, d: k.d,
                    ux: o.ux * smer, uy: o.uy * smer, nx: o.nx * k.strana, ny: o.ny * k.strana, bok: { x: o.nx * k.strana, y: o.ny * k.strana },
                    start: { x: o.a.x + o.ux * s + o.nx * k.strana * o.tl / 2, y: o.a.y + o.uy * s + o.ny * k.strana * o.tl / 2 },
                });
            }
        }
        return vysledek;
    }

    /** Text kóty v cm: celé číslo, jen u opravdu necelé hodnoty desetina. */
    function textKoty(dPx, PX) {
        const cm = dPx / PX * 100;
        const cele = Math.round(cm);
        if (Math.abs(cm - cele) < 0.2) return String(cele);
        return cm.toFixed(1).replace('.', ',');
    }

    const TUZKA = 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z';

    /** Vykreslí kóty výběru do vlastní vrstvy; za tahu se neukazují. */
    function kresli(r) {
        const vrstva = r.kotyVyberuLayer;
        if (!vrstva) return;
        vrstva.destroyChildren();
        r._kotyVyberu = [];
        const e = r.engine;
        const steny = r.selectedWalls, otvory = r.selectedOpenings;
        const jedinaStena = steny.size === 1 && otvory.size === 0;
        const jedinyOtvor = otvory.size === 1 && steny.size === 0;
        if ((!jedinaStena && !jedinyOtvor) || (r.jeTah && r.jeTah())) { vrstva.batchDraw(); return; }

        const podpis = e.geoPodpis();
        // Rastr se po změně kresby počítá až po stisku myši, aby výběr a začátek tahu nezdržel
        if (r._kotyRastrPodpis !== podpis) {
            clearTimeout(r._kotyCasovac);
            const dopocitej = () => {
                if (r.jeTah && r.jeTah()) return;   // po puštění se kóty vykreslí znovu
                if (r.jeStisk && r.jeStisk()) { r._kotyCasovac = setTimeout(dopocitej, 120); return; }   // z kliku může být ještě tah
                r._kotyRastr = window.MistnostiRastr?.spocitej(e, { bezOddelovacu: true }) || null;
                r._kotyRastrPodpis = e.geoPodpis();
                kresli(r);
            };
            r._kotyCasovac = setTimeout(dopocitej, 120);
            vrstva.batchDraw();
            return;
        }
        const rastr = r._kotyRastr;
        const koty = jedinaStena ? proStenu(e, rastr, [...steny][0]) : proOtvor(e, rastr, [...otvory][0]);
        const scale = r.stage.scaleX() || 1;
        const v = (px) => px / scale;
        const css = getComputedStyle(document.documentElement);
        const primary = css.getPropertyValue('--c-primary').trim();
        const text = css.getPropertyValue('--c-primary-text').trim() || primary;
        const povrch = css.getPropertyValue('--c-surface').trim() || '#fff';
        const rot = -(r.stage.rotation() || 0);

        // Kóty na stejné straně stěny se podél ní rozestoupí, ať se čísla nepřekrývají
        if (jedinaStena) {
            for (const strana of [1, -1]) {
                const naStrane = koty.filter(k => k.strana === strana).sort((a, b) => a.s - b.s);
                for (let i = 1; i < naStrane.length; i++) {
                    const min = naStrane[i - 1].s + v(110);
                    if (naStrane[i].s < min) {
                        const posun = min - naStrane[i].s;
                        const smer = { x: naStrane[i].ux === 0 ? 0 : -naStrane[i].uy * strana, y: naStrane[i].ux * strana };
                        naStrane[i].start = { x: naStrane[i].start.x - smer.x * posun, y: naStrane[i].start.y - smer.y * posun };
                        naStrane[i].s = min;
                    }
                }
            }
        }

        for (const k of koty) {
            const delka = k.d;
            // Otvor: kóta běží podél stěny, odsazená od líce. Stěna: kolmo od líce.
            const odsaz = k.typ === 'otvor' ? v(k.vnejsi ? 24 : 20) : 0;
            const ax = k.start.x + (k.nx || 0) * (k.typ === 'otvor' ? odsaz : 0);
            const ay = k.start.y + (k.ny || 0) * (k.typ === 'otvor' ? odsaz : 0);
            const bx = ax + k.ux * delka, by = ay + k.uy * delka;
            const ptak = { stroke: primary, strokeWidth: 1, strokeScaleEnabled: false, listening: false };
            vrstva.add(new Konva.Line({ points: [ax, ay, bx, by], ...ptak }));
            const kx = -k.uy, ky = k.ux, zn = v(5);
            for (const [x, y] of [[ax, ay], [bx, by]]) vrstva.add(new Konva.Line({ points: [x - kx * zn, y - ky * zn, x + kx * zn, y + ky * zn], ...ptak }));
            if (k.typ === 'otvor') vrstva.add(new Konva.Line({ points: [k.start.x, k.start.y, ax, ay], ...ptak, dash: [v(2), v(3)] }));

            // Číslo blízko výběru, s odstupem; u krátké kóty uprostřed
            const odstup = Math.min(v(k.typ === 'otvor' ? 48 : 40), Math.max(delka / 2, v(1)));
            const popis = textKoty(delka, e.PX_PER_M);
            const t = new Konva.Text({ text: popis, fontSize: 12, fontFamily: 'Nunito, system-ui, sans-serif', fontStyle: '700', fill: text, listening: false });
            const w = t.width() + 28, h = 20;
            // Štítek zůstává na obrazovce vzpřímený: mimo čáru ho posune jeho rozměr ve směru odsazení
            const uhel = (r.stage.rotation() || 0) * Math.PI / 180;
            const bokX = k.bok.x * Math.cos(uhel) - k.bok.y * Math.sin(uhel), bokY = k.bok.x * Math.sin(uhel) + k.bok.y * Math.cos(uhel);
            const mimo = v(Math.abs(bokX) * w / 2 + Math.abs(bokY) * h / 2 + 5);
            const sx = ax + k.ux * odstup + k.bok.x * mimo, sy = ay + k.uy * odstup + k.bok.y * mimo;
            const g = new Konva.Group({ x: sx, y: sy, rotation: rot, scaleX: 1 / scale, scaleY: 1 / scale, listening: false });
            g.add(new Konva.Rect({ x: -w / 2, y: -h / 2, width: w, height: h, fill: povrch, stroke: primary, strokeWidth: 1, cornerRadius: 4, listening: false }));
            t.position({ x: -w / 2 + 6, y: -t.height() / 2 });
            g.add(t);
            g.add(new Konva.Path({ data: TUZKA, x: w / 2 - 17, y: -6, scaleX: 0.5, scaleY: 0.5, stroke: primary, strokeWidth: 2, lineCap: 'round', lineJoin: 'round', listening: false }));
            vrstva.add(g);
            r._kotyVyberu.push({ ...k, a: { x: ax, y: ay }, b: { x: bx, y: by }, stitek: { x: sx, y: sy }, w, h, hodnotaCm: Math.round(delka / e.PX_PER_M * 1000) / 10 });
        }
        vrstva.batchDraw();
    }

    /** Kóta pod bodem v souřadnicích kontejneru plátna. */
    function kotaVBode(r, x, y) {
        const t = r.stage.getAbsoluteTransform();
        for (const k of (r._kotyVyberu || [])) {
            const p = t.point(k.stitek);
            if (Math.abs(x - p.x) <= k.w / 2 && Math.abs(y - p.y) <= k.h / 2) return k;
        }
        return null;
    }

    window.KotyVyberu = { proStenu, proOtvor, kresli, kotaVBode, vzdalenostSten, paprsekPolygon, text: textKoty };
})();
