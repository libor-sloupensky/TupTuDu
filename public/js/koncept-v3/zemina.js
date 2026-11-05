/**
 * Základy a bilance zeminy, čistý výpočet bez kresby.
 *
 * Dům se dělí na části podle nejnižšího podlaží, které v daném místě stojí (podsklepená část
 * a část bez sklepu). Výkop se počítá po buňkách mřížky: hloubka buňky je největší hloubka, kterou
 * si vyžádá některá část, takže jáma sklepu přirozeně zasahuje i pod sousední nepodsklepenou část.
 * Kde se terén nevejde na úroveň podlahy, vzniká potřeba násypu a přebytek se o ni zmenší.
 *
 * Souřadnice: metry v orientaci plátna (x, y dolů), výšky v metrech vůči ±0 terénu domu.
 */
(function (koren) {
    // Hodnoty a jejich podklady: modules/zemina.md
    const VYCHOZI = {
        odkop: 0.8,        // pracovní prostor kolem domu
        sirkaPasu: 0.5,
        spara: 1.0,        // základová spára pod terénem
        skladba: 0.45,     // tloušťka základu: od podlahy po spodek konstrukce
        ornice: 0.25,
        svah: 0.5,         // vodorovně na 1 m výšky
        nakypreni: 1.25,
    };
    const NAD_TERENEM = 0.3;       // výchozí výška podlahy 1.NP nad terénem
    const SVISLE_DO = 0.8;         // do této hloubky se výkop svahovat nemusí
    const NABEH_SVAHU = 0.4;       // o tolik hlouběji už má svah plnou šířku
    const VYSKA_PASU_POD_SKLEPEM = 0.5;
    const KROK = 0.1;
    const DOSAH_MAX = 40;          // pojistka proti nesmyslně širokému svahu

    function bodVObrysu(x, y, obrys) {
        let uvnitr = false;
        for (let i = 0, j = obrys.length - 1; i < obrys.length; j = i++) {
            const a = obrys[i], b = obrys[j];
            if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) uvnitr = !uvnitr;
        }
        return uvnitr;
    }

    function vzdalenostOdUsecky(x, y, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const d2 = dx * dx + dy * dy;
        const t = d2 > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / d2)) : 0;
        return Math.hypot(x - a.x - t * dx, y - a.y - t * dy);
    }

    function vzdalenostOdObrysu(x, y, obrys) {
        if (bodVObrysu(x, y, obrys)) return 0;
        let m = Infinity;
        for (let i = 0; i < obrys.length; i++) {
            m = Math.min(m, vzdalenostOdUsecky(x, y, obrys[i], obrys[(i + 1) % obrys.length]));
        }
        return m;
    }

    let posledniMrizka = null;

    /**
     * Mřížka terénu z výškových bodů, jediný terén pro výpočet i 3D: vážený průměr tří nejbližších
     * bodů ve vrcholech po 2 m. Sdílené trojúhelníky zaručí, že výkop přesně sedí na zobrazený terén.
     * @param {Array} body [[lat, lon, výška]]
     * @param {{lat, lon}} stred
     * @returns {{minX, minY, sirka, vyska, sloupcu, radku, vysky: Float32Array, minH, nejblizsi: Function}}
     */
    function mrizkaTerenu(body, stred) {
        if (posledniMrizka?.body === body && posledniMrizka.lat === stred.lat && posledniMrizka.lon === stred.lon) return posledniMrizka.mrizka;
        const M = 111320, cosLat = Math.cos(stred.lat * Math.PI / 180), P = 4, OKRAJ = 20, KROK_MRIZKY = 2;
        const prihradky = new Map();
        const vsechny = [];
        let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, minH = Infinity;
        for (const b of body) {
            const q = { x: (b[1] - stred.lon) * M * cosLat, y: -(b[0] - stred.lat) * M, h: b[2] || 0 };
            const k = Math.floor(q.x / P) + ':' + Math.floor(q.y / P);
            if (!prihradky.has(k)) prihradky.set(k, []);
            prihradky.get(k).push(q);
            vsechny.push(q);
            x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); minH = Math.min(minH, q.h);
        }
        const nejblizsi = (x, y) => {
            const cx = Math.floor(x / P), cy = Math.floor(y / P);
            for (let r = 1; r <= 4; r++) {
                const kand = [];
                for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
                    const s = prihradky.get((cx + i) + ':' + (cy + j));
                    if (s) kand.push(...s);
                }
                if (kand.length >= 3) return kand;
            }
            return vsechny;   // daleko od parcely
        };
        const minX = x0 - OKRAJ, minY = y0 - OKRAJ, sirka = x1 - x0 + 2 * OKRAJ, vyska = y1 - y0 + 2 * OKRAJ;
        const sloupcu = Math.max(2, Math.ceil(sirka / KROK_MRIZKY) + 1), radku = Math.max(2, Math.ceil(vyska / KROK_MRIZKY) + 1);
        const vysky = new Float32Array(sloupcu * radku);
        for (let r = 0; r < radku; r++) {
            for (let s = 0; s < sloupcu; s++) {
                const x = minX + s * sirka / (sloupcu - 1), y = minY + r * vyska / (radku - 1);
                const d = nejblizsi(x, y).map(p => ({ h: p.h, d: Math.hypot(p.x - x, p.y - y) })).sort((a, b) => a.d - b.d).slice(0, 3);
                if (d[0].d < 0.5) { vysky[r * sloupcu + s] = d[0].h; continue; }
                let w = 0, soucet = 0;
                for (const q of d) { const u = 1 / (q.d * q.d + 0.01); w += u; soucet += q.h * u; }
                vysky[r * sloupcu + s] = soucet / w;
            }
        }
        const mrizka = { minX, minY, sirka, vyska, sloupcu, radku, vysky, minH, nejblizsi };
        posledniMrizka = { body, lat: stred.lat, lon: stred.lon, mrizka };
        return mrizka;
    }

    /**
     * Terén jako funkce po trojúhelnících mřížky, stejných jako ve 3D.
     * @returns {Function|null} (x, y) => výška m n.m., navíc .odhad(x, y) = bod leží mimo změřená data
     */
    function terenZProfilu(body, stred) {
        if (!body || !body.length || !stred) return null;
        const { minX, minY, sirka, vyska, sloupcu, radku, vysky, nejblizsi } = mrizkaTerenu(body, stred);
        const kx = sirka / (sloupcu - 1), ky = vyska / (radku - 1);
        const fn = (x, y) => {
            const fs = Math.max(0, Math.min(sloupcu - 1.001, (x - minX) / kx)), fr = Math.max(0, Math.min(radku - 1.001, (y - minY) / ky));
            const s = Math.floor(fs), r = Math.floor(fr), a = fs - s, b = fr - r;
            const v = (i, j) => vysky[j * sloupcu + i];
            return a + b <= 1
                ? v(s, r) + a * (v(s + 1, r) - v(s, r)) + b * (v(s, r + 1) - v(s, r))
                : v(s + 1, r + 1) + (1 - a) * (v(s, r + 1) - v(s + 1, r + 1)) + (1 - b) * (v(s + 1, r) - v(s + 1, r + 1));
        };
        // Vzdálenost k bodům se pamatuje po půl metru, ptá se na ni každá buňka výkopu
        const pamet = new Map();
        fn.odhad = (x, y) => {
            const k = Math.round(x * 2) + ':' + Math.round(y * 2);
            if (!pamet.has(k)) pamet.set(k, Math.min(...nejblizsi(x, y).map(p => Math.hypot(p.x - x, p.y - y))) > 3);
            return pamet.get(k);
        };
        return fn;
    }

    /** 70. percentil terénu pod obdélníkem: ±0 terénu domu, od kterého se měří kóta 1.NP. */
    function nulaTerenu(obrys, teren) {
        const xs = obrys.map(b => b.x), ys = obrys.map(b => b.y);
        const v = [];
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += 1) {
            for (let y = Math.min(...ys); y <= Math.max(...ys); y += 1) v.push(teren(x, y));
        }
        if (!v.length) return teren(xs[0], ys[0]);
        v.sort((a, b) => a - b);
        return v[Math.min(v.length - 1, Math.floor(v.length * 0.7))];
    }

    /** Části domu, dosah výpočtu a hloubka výkopu v bodě: společný základ bilance i jámy. */
    function pripravVykop(casti, teren, P) {
        const tn = teren || (() => 0);
        const seznam = casti.filter(c => c.obrys && c.obrys.length >= 3).map(c => ({
            ...c, dno: c.kota - P.skladba, kope: c.typ !== 'stavajici',
            plocha: 0, vykopek: 0, ryhy: 0, delkaPasu: 0, bezZakladu: 0,
        }));
        const kopajici = seznam.filter(c => c.kope);
        // Část, jejíž spodek tu na zem nedosáhne, nemá základ: nekope se pod ní ani kolem ní
        const dosahne = (c, t) => c.dno <= t;
        if (!seznam.length) return { tn, seznam, kopajici, dosahne };

        // Dosah výpočtu: obrys, pracovní prostor a nejhlubší svah
        const body = seznam.flatMap(c => c.obrys);
        const xs = body.map(b => b.x), ys = body.map(b => b.y);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        let hlMax = 0;
        for (let x = x0; x <= x1 + 1; x += 2) for (let y = y0; y <= y1 + 1; y += 2) {
            for (const c of kopajici) hlMax = Math.max(hlMax, tn(x, y) - c.dno);
        }
        const dosah = Math.min(DOSAH_MAX, P.odkop + hlMax * P.svah + 2);

        /** Hloubka výkopu v bodě a část, která ji určila. */
        const hloubka = (x, y, t, stojiNa) => {
            if (stojiNa && !stojiNa.kope) return { D: 0, cast: stojiNa };
            let D = 0, cast = null, zona = false;
            for (const c of kopajici) {
                if (!dosahne(c, t)) continue;
                const d = vzdalenostOdObrysu(x, y, c.obrys);
                const hl = t - c.dno;
                let h = 0;
                if (d <= P.odkop) { h = Math.max(0, hl); zona = true; }
                else if (hl > SVISLE_DO) {
                    // Svah se rozbíhá plynule, jinak by se na svažitém terénu hrana výkopu lámala tam, kde hloubka přejde 0,8 m
                    const sirka = hl * Math.max(P.svah, 0.01) * Math.min(1, (hl - SVISLE_DO) / NABEH_SVAHU);
                    h = Math.max(0, hl * (1 - (d - P.odkop) / sirka));
                }
                if (h > D || (!cast && d === 0)) { D = Math.max(D, h); cast = c; }
            }
            if (zona || D > 0) D = Math.max(D, P.ornice);
            return { D, cast: cast || kopajici[0] };
        };
        const castVBode = (x, y) => seznam.find(c => bodVObrysu(x, y, c.obrys)) || null;
        return { tn, seznam, kopajici, dosahne, x0, x1, y0, y1, dosah, hloubka, castVBode };
    }

    /** Dno rýhy pasu pod stěnou části v místě s terénem t. */
    function dnoRyhy(c, t, P) {
        return Math.min(t - P.spara, c.dno - (c.kota < -0.01 ? VYSKA_PASU_POD_SKLEPEM : 0));
    }

    /**
     * Tvar výkopu pro zobrazení: hloubky ve vrcholech mřížky, včetně rýh pasů. Stejná čísla jako bilance.
     * Mřížka může být natočená podle stěn domu (uhel v radiánech), hrany výkopu pak nejsou zubaté.
     * Vrchol (s, r) leží v u = u0 + s·krok, v = v0 + r·krok; x = u·cos − v·sin, y = u·sin + v·cos.
     * @returns {{u0, v0, krok, cos, sin, sloupcu, radku, hloubky: Float32Array, teren: Float32Array}|null}
     */
    function jama(casti, teren, nastaveni, uhel = 0) {
        const P = { ...VYCHOZI, ...(nastaveni || {}) };
        const { tn, seznam, kopajici, dosahne, dosah, hloubka, castVBode } = pripravVykop(casti, teren, P);
        if (!kopajici.length) return null;
        const cos = Math.cos(uhel), sin = Math.sin(uhel);
        const naU = (x, y) => x * cos + y * sin, naV = (x, y) => -x * sin + y * cos;
        // Výkop je od obrysu nejdál o dosah, proto stačí obálka obrysů v natočených osách
        const obrysy = seznam.flatMap(c => c.obrys);
        const us = obrysy.map(b => naU(b.x, b.y)), vs = obrysy.map(b => naV(b.x, b.y));
        const u0 = Math.min(...us) - dosah, v0 = Math.min(...vs) - dosah;
        const sloupcu = Math.ceil((Math.max(...us) + dosah - u0) / KROK) + 1, radku = Math.ceil((Math.max(...vs) + dosah - v0) / KROK) + 1;
        const bodX = (s, r) => (u0 + s * KROK) * cos - (v0 + r * KROK) * sin;
        const bodY = (s, r) => (u0 + s * KROK) * sin + (v0 + r * KROK) * cos;
        const hloubky = new Float32Array(sloupcu * radku), tereny = new Float32Array(sloupcu * radku);
        for (let r = 0; r < radku; r++) {
            for (let s = 0; s < sloupcu; s++) {
                const x = bodX(s, r), y = bodY(s, r), t = tn(x, y);
                tereny[r * sloupcu + s] = t;
                hloubky[r * sloupcu + s] = hloubka(x, y, t, castVBode(x, y)).D;
            }
        }
        const pul = P.sirkaPasu / 2;
        for (const c of kopajici) {
            if (c.typ !== 'pasy') continue;
            for (const w of c.steny || []) {
                const ua = naU(w.a.x, w.a.y), ub = naU(w.b.x, w.b.y), va = naV(w.a.x, w.a.y), vb = naV(w.b.x, w.b.y);
                const s0 = Math.max(0, Math.floor((Math.min(ua, ub) - pul - u0) / KROK)), s1 = Math.min(sloupcu - 1, Math.ceil((Math.max(ua, ub) + pul - u0) / KROK));
                const r0 = Math.max(0, Math.floor((Math.min(va, vb) - pul - v0) / KROK)), r1 = Math.min(radku - 1, Math.ceil((Math.max(va, vb) + pul - v0) / KROK));
                for (let r = r0; r <= r1; r++) {
                    for (let s = s0; s <= s1; s++) {
                        if (vzdalenostOdUsecky(bodX(s, r), bodY(s, r), w.a, w.b) > pul) continue;
                        const i = r * sloupcu + s;
                        if (!dosahne(c, tereny[i])) continue;
                        const dno = dnoRyhy(c, tereny[i], P);
                        if (tereny[i] - hloubky[i] > dno) hloubky[i] = tereny[i] - dno;
                    }
                }
            }
        }
        return { u0, v0, krok: KROK, cos, sin, sloupcu, radku, hloubky, teren: tereny };
    }

    /**
     * @param {Array} casti zdola nahoru: { id, nazev, obrys:[{x,y}], kota, typ: pasy|deska|stavajici, steny:[{a,b}] }
     * @param {Function|null} teren (x, y) => výška vůči ±0 terénu, null = rovina
     * @param {Object} nastaveni přepisy VYCHOZI
     */
    function spocitej(casti, teren, nastaveni) {
        const P = { ...VYCHOZI, ...(nastaveni || {}) };
        const { tn, seznam, kopajici, dosahne, x0, x1, y0, y1, dosah, hloubka, castVBode } = pripravVykop(casti, teren, P);
        const vysledek = {
            casti: seznam, ornice: { vykopano: 0, zpet: 0, prebytek: 0, prebytekNakypreny: 0 },
            vykopek: { vykopano: 0, zpet: 0, prebytek: 0, prebytekNakypreny: 0, ryhy: 0 },
            hromada: 0, mimoData: 0, bezZakladu: 0,
        };
        if (!seznam.length) return vysledek;

        const plochaBunky = KROK * KROK;
        let ornice = 0, vykopek = 0, zpetO = 0, zpetV = 0, mimo = 0, celkem = 0;
        for (let x = x0 - dosah + KROK / 2; x < x1 + dosah; x += KROK) {
            for (let y = y0 - dosah + KROK / 2; y < y1 + dosah; y += KROK) {
                const stojiNa = castVBode(x, y);
                const t = tn(x, y);
                if (stojiNa) stojiNa.plocha += plochaBunky;
                const naZemi = stojiNa && dosahne(stojiNa, t);
                if (stojiNa?.kope && !naZemi) {
                    stojiNa.bezZakladu += plochaBunky;
                    vysledek.bezZakladu += plochaBunky;
                }
                if (!kopajici.length) continue;
                const { D, cast } = hloubka(x, y, t, stojiNa);
                if (D <= 0) continue;
                const o = Math.min(D, P.ornice), v = D - o;
                ornice += o * plochaBunky;
                vykopek += v * plochaBunky;
                if (cast) cast.vykopek += v * plochaBunky;
                celkem += plochaBunky;
                if (teren && teren.odhad && teren.odhad(x, y)) mimo += plochaBunky;
                if (naZemi) {
                    // Pod domem se dosype po spodek konstrukce, ornice se pod dům nevrací
                    zpetV += Math.max(0, stojiNa.dno - (t - D)) * plochaBunky;
                } else {
                    zpetV += v * plochaBunky;
                    zpetO += o * plochaBunky;
                }
            }
        }

        // Rýhy pasů: beton vyplní celou rýhu, proto jde všechna zemina z nich do přebytku
        let ryhy = 0;
        for (const c of kopajici) {
            if (c.typ !== 'pasy') continue;
            for (const s of c.steny || []) {
                const L = Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y);
                const n = Math.max(1, Math.ceil(L / KROK));
                for (let i = 0; i < n; i++) {
                    const x = s.a.x + (s.b.x - s.a.x) * (i + 0.5) / n, y = s.a.y + (s.b.y - s.a.y) * (i + 0.5) / n;
                    const t = tn(x, y);
                    if (!dosahne(c, t)) continue;
                    const r = (t - hloubka(x, y, t, null).D) - dnoRyhy(c, t, P);
                    if (r > 0) {
                        const objem = r * P.sirkaPasu * L / n;
                        ryhy += objem;
                        c.ryhy += objem;
                        c.vykopek += objem;
                        c.delkaPasu += L / n;
                    }
                }
            }
        }
        vykopek += ryhy;

        const zapis = (cil, vykopano, zpet) => {
            cil.vykopano = vykopano;
            cil.zpet = zpet;
            cil.prebytek = vykopano - zpet;
            cil.prebytekNakypreny = (vykopano - zpet) * P.nakypreni;
        };
        zapis(vysledek.ornice, ornice, zpetO);
        zapis(vysledek.vykopek, vykopek, zpetV);
        vysledek.vykopek.ryhy = ryhy;
        vysledek.hromada = (ornice + vykopek) * P.nakypreni;
        vysledek.mimoData = celkem > 0 ? mimo / celkem : 0;
        return vysledek;
    }

    const Zemina = { VYCHOZI, NAD_TERENEM, spocitej, jama, mrizkaTerenu, terenZProfilu, nulaTerenu, bodVObrysu };
    if (typeof window !== 'undefined') window.Zemina = Zemina;
    if (typeof module !== 'undefined' && module.exports) module.exports = Zemina;
})(this);
