/**
 * Automatické kóty půdorysu (Koncept V3), přepínač Kóty.
 *
 * Aby plán nebyl přeplácaný, drží se to stavebního výkresu: čísla leží mimo dům a uvnitř
 * je jen rozměr místnosti u jejího názvu.
 * - Řetězce kolem domu: otvory a pilíře na každé fasádě, úseky jen u zalomené fasády,
 *   celkový rozměr jednou na směr. Co by se opakovalo, se nekreslí.
 * - Co se při daném přiblížení nevejde, zmizí; podrobná řada dřív než celkový rozměr.
 * Osy se berou z převažujícího směru stěn, takže to platí i pro natočený dům.
 * Kóty vybrané stěny a otvoru řeší koty-vyberu.js, délku rozpracované stěny renderKoty.
 */
(function () {
    // V Node slovník není, tam zůstává česká čárka
    const cislo = (x, d) => (typeof prelozCislo === 'function' ? prelozCislo(x, d) : x.toFixed(d).replace('.', ','));
    const MAX_ODCHYLKA = Math.sin(3 * Math.PI / 180);   // rovnoběžná = do 3°
    const STEJNA_HLOUBKA_M = 0.05;                      // menší odskok fasády není zalomení
    const MIN_USEK_M = 0.08;                            // kratší úsek se přidá k sousednímu
    const PRVNI_RADA = 34, DALSI_RADA = 20, NAD_CAROU = 7, ZNACKA = 4;   // px na obrazovce
    const SIRKA_ZNAKU = 0.58;                           // šířka číslice vůči velikosti písma

    // Pohled na dům z každé strany. Hloubka roste směrem od pozorovatele.
    const STRANY = [
        { klic: 'minV', osa: 'u', napric: 'v', znam: 1 },
        { klic: 'maxV', osa: 'u', napric: 'v', znam: -1 },
        { klic: 'minU', osa: 'v', napric: 'u', znam: 1 },
        { klic: 'maxU', osa: 'v', napric: 'u', znam: -1 },
    ];

    function osyDomu(engine) {
        let c = 0, s = 0;
        for (const w of engine.walls.values()) {
            const a = engine.nodes.get(w.nodeA), b = engine.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const L = Math.hypot(b.x - a.x, b.y - a.y), u = Math.atan2(b.y - a.y, b.x - a.x);
            c += L * Math.cos(4 * u);
            s += L * Math.sin(4 * u);
        }
        if (!c && !s) return null;
        const uhel = Math.atan2(s, c) / 4, ux = Math.cos(uhel), uy = Math.sin(uhel);
        return {
            uhel, ux, uy,
            naOsy: (p) => ({ u: p.x * ux + p.y * uy, v: -p.x * uy + p.y * ux }),
            zOs: (u, v) => ({ x: u * ux - v * uy, y: u * uy + v * ux }),
        };
    }

    /** Úseky viditelné z dané strany: pro každý kus délky stěna nejblíž pozorovateli. */
    function pohled(boxy, tolHloubka, minDelka) {
        const body = [...new Set(boxy.flatMap(b => [b.a, b.b]))].sort((x, y) => x - y);
        const useky = [];
        const stejne = (h1, h2) => (h1 === null || h2 === null) ? h1 === h2 : Math.abs(h1 - h2) <= tolHloubka;
        for (let i = 0; i + 1 < body.length; i++) {
            const x0 = body[i], x1 = body[i + 1];
            if (x1 - x0 < 0.01) continue;
            const stred = (x0 + x1) / 2;
            let h = null;
            for (const b of boxy) if (b.a <= stred && b.b >= stred && (h === null || b.h < h)) h = b.h;
            const posledni = useky[useky.length - 1];
            if (posledni && stejne(posledni.h, h)) posledni.b = x1;
            else useky.push({ a: x0, b: x1, h });
        }
        for (let i = 0; i < useky.length && useky.length > 1;) {
            if (useky[i].b - useky[i].a >= minDelka) { i++; continue; }
            if (i > 0) useky[i - 1].b = useky[i].b;
            else useky[1].a = useky[0].a;
            useky.splice(i, 1);
        }
        return useky;
    }

    const serad = (pole) => {
        const s = [...pole].sort((x, y) => x - y);
        return s.filter((x, i) => i === 0 || x - s[i - 1] > 0.5);
    };

    /** Geometrie řetězců v osách domu; nezávisí na přiblížení. */
    function spocitej(engine) {
        const osy = osyDomu(engine);
        if (!osy) return null;
        const PX = engine.PX_PER_M;
        const steny = [];
        const meze = { u: [Infinity, -Infinity], v: [Infinity, -Infinity] };
        for (const w of engine.walls.values()) {
            const a = engine.nodes.get(w.nodeA), b = engine.nodes.get(w.nodeB);
            const poly = engine.getWallPolygon(w.id);
            if (!a || !b || !poly || poly.length < 3) continue;
            const q = poly.map(osy.naOsy);
            const box = { u: [Math.min(...q.map(p => p.u)), Math.max(...q.map(p => p.u))], v: [Math.min(...q.map(p => p.v)), Math.max(...q.map(p => p.v))] };
            for (const k of ['u', 'v']) {
                meze[k][0] = Math.min(meze[k][0], box[k][0]);
                meze[k][1] = Math.max(meze[k][1], box[k][1]);
            }
            const A = osy.naOsy(a), B = osy.naOsy(b);
            const L = Math.hypot(B.u - A.u, B.v - A.v) || 1;
            const smer = Math.abs(B.v - A.v) / L <= MAX_ODCHYLKA ? 'u' : (Math.abs(B.u - A.u) / L <= MAX_ODCHYLKA ? 'v' : null);
            steny.push({ id: w.id, box, smer, A, du: (B.u - A.u) / L, dv: (B.v - A.v) / L });
        }
        if (!steny.length) return null;
        const hloubka = (s, st) => st.znam > 0 ? s.box[st.napric][0] : -s.box[st.napric][1];
        const tol = STEJNA_HLOUBKA_M * PX;

        const strany = STRANY.map((st) => {
            const boxy = steny.filter(s => s.smer).map(s => ({ a: s.box[st.osa][0], b: s.box[st.osa][1], h: hloubka(s, st) }));
            const useky = pohled(boxy, tol, MIN_USEK_M * PX);
            const plne = useky.filter(x => x.h !== null);
            const rady = [];

            const otvory = [];
            for (const op of engine.openings.values()) {
                const s = steny.find(x => x.id === op.wallId);
                if (!s || s.smer !== st.osa) continue;
                const smer = st.osa === 'u' ? s.du : s.dv, zacatek = s.A[st.osa];
                const x1 = zacatek + smer * op.pozice * PX, x2 = zacatek + smer * (op.pozice + op.sirka) * PX;
                const stred = (x1 + x2) / 2;
                const h = hloubka(s, st);
                if (plne.some(u => stred >= u.a && stred <= u.b && Math.abs(u.h - h) <= tol)) otvory.push(x1, x2);
            }
            if (plne.length && otvory.length) {
                rady.push({ druh: 'otvory', body: serad([...plne.flatMap(u => [u.a, u.b]), ...otvory]) });
            }
            if (useky.length > 1) {
                const body = serad(useky.flatMap(u => [u.a, u.b]));
                if (body.length > 2) rady.push({ druh: 'useky', body });
            }
            rady.push({ druh: 'celkem', body: [meze[st.osa][0], meze[st.osa][1]] });
            return { ...st, hrana: meze[st.napric][st.znam > 0 ? 0 : 1], rady };
        });
        return { osy, strany };
    }

    function otisk(engine) {
        const o = [];
        for (const op of engine.openings.values()) o.push(op.wallId, op.pozice, op.sirka);
        return engine.geoPodpis() + '#' + o.join('|');
    }

    function zCache(r) {
        const klic = otisk(r.engine);
        if (r._retezceKlic !== klic) {
            r._retezce = spocitej(r.engine);
            r._retezceKlic = klic;
        }
        return r._retezce;
    }

    /** Přidá řetězce do `skupina` a vrátí, co se opravdu nakreslilo (pro testy). */
    function kresli(r, skupina) {
        const data = zCache(r);
        const nakresleno = [];
        if (!data) return nakresleno;
        const { osy, strany } = data;
        const PX = r.engine.PX_PER_M;
        // Stálá velikost na obrazovce: řetězce leží mimo dům, přes místnosti nepřerostou,
        // a při oddálení místo zmenšování ubývají (viz vejde)
        const meritko = r.stage.scaleX() || 1;
        const v = (px) => px / meritko;
        const pismo = v(11);
        const css = getComputedStyle(document.documentElement);
        const barva = css.getPropertyValue('--c-text-secondary').trim() || '#6b7280';
        const natoceni = r.stage.rotation() || 0;
        const cary = [];

        // Celkový rozměr stačí jednou na směr: na té straně, která je na obrazovce nahoře nebo vlevo
        const rad = natoceni * Math.PI / 180;
        const nahoreVlevo = (st) => {
            const ven = st.osa === 'u' ? osy.zOs(0, -st.znam) : osy.zOs(-st.znam, 0);
            return ven.x * Math.cos(rad) - ven.y * Math.sin(rad) + ven.x * Math.sin(rad) + ven.y * Math.cos(rad);
        };
        const proCelkem = {};
        for (const st of strany) {
            if (!proCelkem[st.osa] || nahoreVlevo(st) < nahoreVlevo(proCelkem[st.osa])) proCelkem[st.osa] = st;
        }

        for (const st of strany) {
            // Vodorovně zleva, svisle zdola nahoru, nikdy vzhůru nohama
            let uhelTextu = osy.uhel * 180 / Math.PI + (st.osa === 'v' ? 90 : 0) + natoceni;
            while (uhelTextu > 85) uhelTextu -= 180;
            while (uhelTextu <= -95) uhelTextu += 180;
            uhelTextu -= natoceni;

            const rady = st.rady.filter(rada => rada.druh !== 'celkem' || proCelkem[st.osa] === st).map((rada) => {
                const useky = [];
                for (let i = 0; i + 1 < rada.body.length; i++) {
                    const a = rada.body[i], b = rada.body[i + 1];
                    const text = String(Math.round((b - a) / PX * 100));
                    useky.push({ a, b, text, vejde: b - a > text.length * pismo * SIRKA_ZNAKU + v(6) });
                }
                return { ...rada, useky };
            }).filter(rada => rada.druh === 'celkem'
                ? rada.useky[0].vejde
                : rada.useky.filter(u => u.vejde).length * 2 >= rada.useky.length);

            let odstup = v(PRVNI_RADA);
            for (const rada of rady) {
                const t = st.hrana - st.znam * odstup;
                const bod = (x, k = t) => st.osa === 'u' ? osy.zOs(x, k) : osy.zOs(k, x);
                const zac = bod(rada.body[0]), kon = bod(rada.body[rada.body.length - 1]);
                cary.push([zac.x, zac.y, kon.x, kon.y]);
                const z = v(ZNACKA);
                for (const x of rada.body) {
                    const p = bod(x - z, t + z), q = bod(x + z, t - z);
                    cary.push([p.x, p.y, q.x, q.y]);
                }
                for (const u of rada.useky) {
                    if (!u.vejde) continue;
                    const s = bod((u.a + u.b) / 2, t - st.znam * v(NAD_CAROU));
                    const text = new Konva.Text({
                        x: s.x, y: s.y, text: u.text, fontSize: pismo, fontFamily: 'Rubik, system-ui, sans-serif', fontStyle: '500',
                        fill: barva, rotation: uhelTextu, listening: false, perfectDrawEnabled: false,
                    });
                    text.offsetX(text.width() / 2);
                    text.offsetY(text.height() / 2);
                    skupina.add(text);
                }
                nakresleno.push({ strana: st.klic, druh: rada.druh, cm: rada.useky.map(u => Number(u.text)), cisla: rada.useky.filter(u => u.vejde).length });
                odstup += v(DALSI_RADA);
            }
        }
        skupina.add(new Konva.Shape({
            sceneFunc: (c, tvar) => {
                c.beginPath();
                for (const [x1, y1, x2, y2] of cary) { c.moveTo(x1, y1); c.lineTo(x2, y2); }
                c.strokeShape(tvar);
            },
            stroke: barva, strokeWidth: 1, strokeScaleEnabled: false, opacity: 0.75, listening: false, perfectDrawEnabled: false,
        }));
        return nakresleno;
    }

    /**
     * Světlý rozměr obdélníkové místnosti z bodu uprostřed k nejbližším překážkám.
     * Místnost jiného tvaru (plocha nesedí na součin) vrátí null: jedno číslo by lhalo.
     */
    function rozmerMistnosti(r, komponenta) {
        const data = zCache(r);
        const paprsek = window.KotyVyberu?.paprsekPolygon;
        if (!data || !paprsek) return null;
        const e = r.engine, PX = e.PX_PER_M;
        if (r._prekazkyKlic !== r._retezceKlic) {
            r._prekazky = [...e.walls.keys()].map(id => e.getWallPolygon(id)).filter(p => p && p.length >= 3);
            for (const o of e.oddelovace.values()) r._prekazky.push([e.bodKonceOddelovace(o.a), e.bodKonceOddelovace(o.b)]);
            r._prekazkyKlic = r._retezceKlic;
        }
        const { ux, uy, uhel } = data.osy;
        const k = (sx, sy) => {
            let nej = Infinity;
            for (const poly of r._prekazky) nej = Math.min(nej, paprsek(komponenta.stred, sx, sy, poly));
            return nej;
        };
        const du = k(ux, uy) + k(-ux, -uy), dv = k(-uy, ux) + k(uy, -ux);
        if (!isFinite(du) || !isFinite(dv)) return null;
        const plocha = du * dv / (PX * PX);
        if (Math.abs(plocha - komponenta.plocha_m2) > Math.max(0.04 * komponenta.plocha_m2, 0.1)) return null;
        const m = (d) => cislo(d / PX, 2);
        // Šířka × výška tak, jak místnost leží na obrazovce
        const naSirku = Math.abs(Math.cos(uhel + (r.stage.rotation() || 0) * Math.PI / 180)) >= Math.SQRT1_2;
        return { text: naSirku ? m(du) + ' × ' + m(dv) + ' m' : m(dv) + ' × ' + m(du) + ' m', du, dv };
    }

    window.KotyRetezce = { spocitej, kresli, rozmerMistnosti };
})();
