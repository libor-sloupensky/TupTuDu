/**
 * Veřejná kalkulačka schodiště (článek Výpočet schodiště, modules/blog.md).
 *
 * Záměrně samostatný kód, veřejná stránka nesmí načítat nic z js/koncept-v3. Přímé schody, do L, do U a do U
 * se dvěma odpočívadly staví stejně jako editor (DumGeo.schodyGeo a castiSchodu v koncept-v3/dum.js): počet výšek
 * z cílové výšky stupně, nášlap ze vztahu 2h + b = 630 mm omezený na 220 až 320 mm. Shodu hlídá
 * services/import-test/test-kalkulacka-schodiste.cjs.
 *
 * Vyhláška 146/2024 Sb., příloha 4 bod 2 žádá nášlap hlavního schodiště aspoň 300 mm, v rodinném domě 275 mm
 * (limit naslapMin). Když by při zaokrouhleném počtu výšek vyšel užší, kalkulačka přidá výšku: pro 3,05 m tedy
 * 18 výšek po 169 mm místo 17 po 179 mm s nášlapem 271 mm. Editor stejně (NASLAP_MIN_ZEME v dum.js, jen bez ruční
 * výšky stupně a nášlapu).
 *
 * Zabíhající stupně (do L a do U) a točité schody počítá pro editor stejný kód (proEditor, Libor 11. 11. 2026:
 * nejdřív doladit tady, pak přenést do projektu; přeneseno týž den). Pravidla pro zakřivená ramena:
 *  - výstupní čára (stupně na ní mají nášlap b jako přímé schody) je u ramene do 1,2 m 0,4 m od vnějšího okraje,
 *    tam vyhláška měří nášlap ramene do 1,1 m. Širší: třetina šířky od vnějšího okraje, nad 1,8 m polovina
 *    (výklad ČSN 73 4130, VUT a ČKAIT TS 02),
 *  - rameno širší než 1,1 m: vyhláška měří 0,3 m od vnitřního okraje, v rodinném domě aspoň 180 mm (zakrivMin),
 *  - zúžení na vnitřní hraně se rozloží rovnoměrně na tolik stupňů kolem zatáčky, aby vyšlo aspoň 150 mm (vnitřní
 *    hrana se dělí stejnoměrně, hrana stupně spojuje bod na vnitřní hraně s bodem na výstupní čáře),
 *  - točité: podchodná výška pod stupněm o otáčku výš aspoň 2 100 mm (ČSN, tloušťka stupně 50 mm je odhad).
 * Texty jsou v šabloně clanky/bloky/kalkulacka-schodiste, tady se jen dosazují čísla a kreslí nákres.
 *
 * Délky v metrech. Půdorys: první rameno ve směru x od nástupu v [0, 0], zatáčí se ke kladnému y.
 */
(function (koren) {
    const VYCHOZI = { vyska: 2.9, tvar: 'prime', sirka: 1.0, cilova: 0.175, prumer: 2.0, zatacka: 'osa' };   // šířka 1 m jako v editoru
    // Česko: naslapMin a zakrivMin z vyhlášky 146/2024 Sb. (příloha 4, rodinný dům), ostatní doporučuje ČSN 73 4130
    // (modules/stavebni-parametry.md). Verze pro jinou zemi je přepíše parametry bloku (data-limity), naslapMin 0
    // vypne přidávání výšek.
    const LIMITY = { vyskaMin: 0.15, vyskaMax: 0.18, krokMin: 0.6, krokMax: 0.65, sirkaMin: 0.9, rameno: 18, podchod: 2.1, naslapMin: 0.275, zakrivMin: 0.18 };
    const ZAKRIV_UZKE = 1.1;   // rameno do této šířky: nášlap se měří 0,4 m od vnějšího okraje, širší 0,3 m od vnitřního
    const OD_VNITRNIHO = 0.3;
    const TVARY = ['prime', 'L', 'Lz', 'U', 'U2', 'Uz', 'tocite'];
    const SLOUPEK = 0.12;      // průměr středového sloupku točitých schodů
    const TL_STUPNE = 0.05;    // tloušťka stupně, ubírá z podchodné výšky točitých schodů
    const CIL_UZKY = 0.15;     // zabíhající stupně: na kolik se nejvýš zúží, než se zúžení rozloží na další stupně
    const omez = (x, a, b) => Math.min(b, Math.max(a, x));
    const obd = (x, y, w, h, podesta) => ({ body: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], podesta: !!podesta });

    /** Vzdálenost výstupní čáry od vnějšího okraje zakřiveného ramene. */
    function odstupVystupni(sir) {
        if (sir <= 1.2 + 1e-9) return Math.min(0.4, sir / 2);
        if (sir <= 1.8 + 1e-9) return sir / 3;
        return sir / 2;
    }

    /** Stupně v částech (jako castiSchodu v editoru): odpočívadlo i poslední krok na podlahu se počítají mezi stupně. */
    function castiSchodu(n, tvar) {
        if (tvar === 'L') {
            const F = Math.max(1, n - 2), a = Math.max(1, Math.floor(F / 2));
            return [a, F - a];
        }
        if (tvar === 'U') {
            const F = Math.max(1, n - 2), a = Math.max(1, Math.floor(F / 2));
            return [a, F - a];   // jedno široké odpočívadlo přes obě ramena (editor: prostřední část 0)
        }
        if (tvar === 'U2') {
            // Krátké prostřední rameno mezi dvěma odpočívadly, zhruba čtvrtina stupňů
            const m = Math.max(1, Math.min(Math.round((n - 3) / 4), n - 5));
            const F = Math.max(1, n - 3) - m, a = Math.max(1, Math.floor(F / 2));
            return [a, m, F - a];
        }
        return [Math.max(1, n - 1)];
    }

    /** Přímé schody a lomené s odpočívadly. */
    function sOdpocivadly(n, b, sir, tvar) {
        const casti = castiSchodu(n, tvar);
        const polygony = [];
        const pul = sir / 2;
        let vystupni;
        if (tvar === 'L') {
            const [t1, t2] = casti, L1 = t1 * b;
            for (let i = 0; i < t1; i++) polygony.push(obd(i * b, 0, b, sir));
            polygony.push(obd(L1, 0, sir, sir, true));
            for (let i = 0; i < t2; i++) polygony.push(obd(L1, sir + i * b, sir, b));
            vystupni = [[0, pul], [L1 + pul, pul], [L1 + pul, sir + t2 * b]];
        } else if (tvar === 'U') {
            const [t1, t3] = casti, L1 = t1 * b;
            for (let i = 0; i < t1; i++) polygony.push(obd(i * b, 0, b, sir));
            polygony.push(obd(L1, 0, sir, 2 * sir, true));
            for (let i = 0; i < t3; i++) polygony.push(obd(L1 - (i + 1) * b, sir, b, sir));
            vystupni = [[0, pul], [L1 + pul, pul], [L1 + pul, sir + pul], [L1 - t3 * b, sir + pul]];
        } else if (tvar === 'U2') {
            const [t1, t2, t3] = casti, L1 = t1 * b, L2 = t2 * b;
            for (let i = 0; i < t1; i++) polygony.push(obd(i * b, 0, b, sir));
            polygony.push(obd(L1, 0, sir, sir, true));
            for (let i = 0; i < t2; i++) polygony.push(obd(L1, sir + i * b, sir, b));
            polygony.push(obd(L1, sir + L2, sir, sir, true));
            for (let i = 0; i < t3; i++) polygony.push(obd(L1 - (i + 1) * b, sir + L2, b, sir));
            vystupni = [[0, pul], [L1 + pul, pul], [L1 + pul, sir + L2 + pul], [L1 - t3 * b, sir + L2 + pul]];
        } else {
            for (let i = 0; i < casti[0]; i++) polygony.push(obd(i * b, 0, b, sir));
            vystupni = [[0, pul], [casti[0] * b, pul]];
        }
        return { polygony, casti, vystupni, ...obalka(polygony) };
    }

    function obalka(polygony) {
        const xs = polygony.flatMap((p) => p.body.map((q) => q[0])), ys = polygony.flatMap((p) => p.body.map((q) => q[1]));
        const minX = Math.min(...xs), minY = Math.min(...ys);
        return { minX, minY, delka: Math.max(...xs) - minX, sirka: Math.max(...ys) - minY };
    }

    /** Průsečík polopřímky P + t·D (t ≥ 1) s lomenou čarou; vrací bod a vzdálenost po čáře od jejího začátku. */
    function prusecik(P, D, cara) {
        let nej = null, delka = 0;
        for (let i = 0; i + 1 < cara.length; i++) {
            const A = cara[i], B = cara[i + 1];
            const ex = B[0] - A[0], ey = B[1] - A[1], seg = Math.hypot(ex, ey);
            const det = D[0] * -ey - D[1] * -ex;
            if (Math.abs(det) > 1e-12) {
                const rx = A[0] - P[0], ry = A[1] - P[1];
                const t = (rx * -ey - ry * -ex) / det;
                const u = (D[0] * ry - D[1] * rx) / det;
                if (t >= 1 - 1e-9 && u >= -1e-9 && u <= 1 + 1e-9 && (!nej || t < nej.t)) {
                    nej = { t, bod: [P[0] + D[0] * t, P[1] + D[1] * t], param: delka + omez(u, 0, 1) * seg };
                }
            }
            delka += seg;
        }
        return nej;
    }

    function vzdalenostOdUsecky(P, A, B) {
        const ex = B[0] - A[0], ey = B[1] - A[1], d2 = ex * ex + ey * ey || 1;
        const u = omez(((P[0] - A[0]) * ex + (P[1] - A[1]) * ey) / d2, 0, 1);
        return Math.hypot(P[0] - A[0] - ex * u, P[1] - A[1] - ey * u);
    }

    /**
     * Zabíhající stupně do L (čtvrtobrat) a do U (půlobrat), bez odpočívadla. Výstupní čára je v zatáčce oblouk kolem
     * vnitřního rohu. Vrací null, když se zatáčka do schodů nevejde (moc široké rameno na málo stupňů).
     * zatacka 'osa': stupně v zatáčce se sbíhají do osy zatáčky (vnitřního rohu), jak se běžně stavějí;
     * 'rozlozene': zúžení se rozloží rovnoměrně na stupně kolem zatáčky (vyrovnávané stupně, širší u vnitřní hrany).
     */
    function zabihajici(N, b, sir, tvar, zatacka) {
        const U = tvar === 'Uz';
        const d = odstupVystupni(sir), r = sir - d;
        const T = (U ? Math.PI : Math.PI / 2) * r;          // délka výstupní čáry v zatáčce
        const rovne = N * b - T;
        if (rovne < -1e-9) return null;
        const a1 = Math.max(0, rovne) / 2, a2 = a1;
        // Bod výstupní čáry a vnitřní hrany podle délky od nástupu
        const W = (s) => {
            if (s <= a1) return [s, d];
            if (s <= a1 + T) { const t = (s - a1) / r; return [a1 + r * Math.sin(t), sir - r * Math.cos(t)]; }
            const z = s - a1 - T;
            return U ? [a1 - z, sir + r] : [a1 + r, sir + z];
        };
        const I = (u) => (u <= a1 ? [u, sir] : U ? [a1 - (u - a1), sir] : [a1, sir + (u - a1)]);
        const vnejsi = U ? [[0, 0], [a1 + sir, 0], [a1 + sir, 2 * sir], [a1 - a2, 2 * sir]] : [[0, 0], [a1 + sir, 0], [a1 + sir, sir + a2]];
        const rohyVen = U ? [[a1 + sir, [a1 + sir, 0]], [a1 + 3 * sir, [a1 + sir, 2 * sir]]] : [[a1 + sir, [a1 + sir, 0]]];

        let u, m;
        let rovnych = Math.floor(a1 / b + 1e-9);   // kolik stupňů na začátku je kolmých (zbytek už zabíhá)
        if (zatacka === 'rozlozene') {
            // Zúžení na vnitřní hraně: m stupňů kolem zatáčky, každý tam má šířku c = b − T / m
            m = Math.min(N, Math.ceil(T / Math.max(1e-6, b - CIL_UZKY) - 1e-9));
            let iA;
            for (;;) {
                iA = omez(Math.round((a1 + T / 2) / b - m / 2), 0, N - m);
                if ((iA * b <= a1 + 1e-9 && (iA + m) * b >= a1 + T - 1e-9) || m >= N) break;
                m++;
            }
            rovnych = Math.min(rovnych, iA);
            const sA = iA * b, sB = (iA + m) * b, uA = sA, uB = sB - T;
            u = (s) => (s <= sA ? s : s >= sB ? s - T : uA + (s - sA) * (uB - uA) / (sB - sA));
        } else {
            // Kolem osy: v zatáčce vedou všechny hrany stupňů z vnitřního rohu
            u = (s) => (s <= a1 ? s : s >= a1 + T ? s - T : a1);
            m = Math.ceil((a1 + T) / b - 1e-9) - Math.floor(a1 / b + 1e-9);
        }

        const hrany = [];
        for (let k = 0; k <= N; k++) {
            const s = k * b, uk = u(s), Pi = I(uk), Pw = W(s);
            const o = prusecik(Pi, [Pw[0] - Pi[0], Pw[1] - Pi[1]], vnejsi);
            if (!o) return null;
            hrany.push({ u: uk, vnitrni: Pi, venku: o.bod, param: o.param });
        }
        const polygony = [];
        let nejuzsi = Infinity, poradi = true;
        for (let k = 0; k < N; k++) {
            const h0 = hrany[k], h1 = hrany[k + 1];
            const body = [];
            const pridej = (q) => { const z = body[body.length - 1]; if (!z || Math.hypot(z[0] - q[0], z[1] - q[1]) > 1e-9) body.push(q); };
            pridej(h0.vnitrni);
            if (h0.u < a1 - 1e-9 && h1.u > a1 + 1e-9) pridej([a1, sir]);
            pridej(h1.vnitrni); pridej(h1.venku);
            rohyVen.filter(([p]) => p > h0.param + 1e-9 && p < h1.param - 1e-9).reverse().forEach(([, bod]) => pridej(bod));
            pridej(h0.venku);
            polygony.push({ body });
            nejuzsi = Math.min(nejuzsi, h1.u - h0.u);
            if (h1.param <= h0.param + 1e-6) poradi = false;
        }
        // Nášlap 0,3 m od vnitřního okraje: bod na hraně stupně v té vzdálenosti od vnitřní hrany (půlením)
        const vnitrniCara = U ? [[0, sir], [a1, sir]] : [[0, sir], [a1, sir], [a1, sir + a2]];
        const odCary = (P) => Math.min(...vnitrniCara.slice(1).map((B, i) => vzdalenostOdUsecky(P, vnitrniCara[i], B)));
        const naCare = hrany.map((h) => {
            let lo = 0, hi = 1;
            const bod = (s) => [h.vnitrni[0] + (h.venku[0] - h.vnitrni[0]) * s, h.vnitrni[1] + (h.venku[1] - h.vnitrni[1]) * s];
            for (let i = 0; i < 40; i++) { const s = (lo + hi) / 2; if (odCary(bod(s)) < OD_VNITRNIHO) lo = s; else hi = s; }
            return bod((lo + hi) / 2);
        });
        const odVnitrniho = Math.min(...naCare.slice(1).map((P, k) => Math.hypot(P[0] - naCare[k][0], P[1] - naCare[k][1])));
        const vystupni = [];
        for (let i = 0; i <= 60; i++) vystupni.push(W(N * b * i / 60));
        return { polygony, casti: [N], vystupni, nejuzsi, odVnitrniho, zabihaStupnu: m, platne: poradi, hrany, a1, sir, U, rovnych, ...obalka(polygony) };
    }

    /** Točité (vřetenové) schody kolem sloupku, průměr D. Stupně nad první otáčkou jsou v půdorysu nad prvními. */
    function tocite(N, b, D) {
        const R = D / 2, r0 = SLOUPEK / 2, sir = R - r0;
        const rv = R - odstupVystupni(sir);
        const alfa = b / rv;
        const bod = (rho, fi) => [R + rho * Math.cos(fi), R + rho * Math.sin(fi)];
        const ZACATEK = Math.PI / 2;   // nástup dole uprostřed
        const polygony = [], hrany = [];
        for (let k = 0; k < N; k++) {
            const f0 = ZACATEK + k * alfa, f1 = f0 + alfa;
            const body = [bod(r0, f0), bod(r0, f1)];
            for (let j = 6; j >= 0; j--) body.push(bod(R, f0 + alfa * j / 6));
            polygony.push({ body, nad: (k + 0.5) * alfa > 2 * Math.PI });
            hrany.push({ vnitrni: bod(r0, f0), venku: bod(R, f0) });
        }
        const vystupni = [];
        const uhel = N * alfa;
        for (let i = 0; i <= 90; i++) vystupni.push(bod(rv, ZACATEK + uhel * i / 90));
        return {
            polygony, hrany, casti: [N], vystupni, kruh: { cx: R, cy: R, R, r0 }, sir, nejuzsi: null, odVnitrniho: alfa * (r0 + OD_VNITRNIHO),
            otacka: 2 * Math.PI / alfa, uhel: uhel * 180 / Math.PI, minX: 0, minY: 0, delka: D, sirka: D,
        };
    }

    /**
     * Zabíhající stupně do L a do U a točité schody pro editor (koncept-v3/dum.js, schodyGeo), stejný výpočet jako
     * kalkulačka. Souřadnice editoru v metrech: a podél chůze od přední hrany prvního stupně, c napříč, kladně ke straně
     * zatáčky, 0 uprostřed prvního stupně. Editor body jen natočí, zrcadlí stranou a převede na px.
     *   stupne: [{ body, celo }] – nášlap a podstupnice (pás tloušťky `tlPodstupnice` za přední hranou),
     *   obrys, otvorOd(z): obrys a obrys bez začátku do vzdálenosti z (otvor ve stropu nechá strop nad prvními stupni),
     *   rovnych: kolik stupňů na začátku je kolmých (jen ty mohou zůstat pod stropem), vystupni, nastup, uchop, delka.
     * null = zatáčka se do tolika stupňů nevejde.
     */
    function proEditor(tvar, N, b, { sirka = 1, prumer = 2, zatacka = 'osa', tlPodstupnice = 0.02 } = {}) {
        const spirala = tvar === 'tocite';
        const p = spirala ? tocite(N, b, prumer) : zabihajici(N, b, sirka, tvar === 'Uz' ? 'Uz' : 'Lz', zatacka);
        if (!p) return null;
        let T, obrys, otvorOd, nastup, uchop, rovnych;
        if (spirala) {
            const { R, r0 } = p.kruh, Y0 = R + (r0 + R) / 2, pul = (R - r0) / 2;
            T = ([x, y]) => [R - x, Y0 - y];
            obrys = Array.from({ length: 48 }, (_, i) => T([R + R * Math.cos(i * Math.PI / 24), R + R * Math.sin(i * Math.PI / 24)]));
            otvorOd = () => obrys;
            nastup = [[0, -pul], [0, pul]];
            uchop = [0, -pul - 0.35];
            rovnych = 0;
        } else {
            const { a1, sir, U } = p, pul = sir / 2;
            T = ([x, y]) => [x, y - pul];
            const od = (z) => (U ? [[z, 0], [a1 + sir, 0], [a1 + sir, 2 * sir], [0, 2 * sir], [0, sir], [z, sir]]
                : [[z, 0], [a1 + sir, 0], [a1 + sir, sir + a1], [a1, sir + a1], [a1, sir], [z, sir]]).map(T);
            obrys = U ? [[0, 0], [a1 + sir, 0], [a1 + sir, 2 * sir], [0, 2 * sir]].map(T) : od(0);
            otvorOd = (z) => (z > 1e-9 ? od(Math.min(z, a1)) : obrys);
            nastup = [[0, -pul], [0, pul]];
            uchop = [-0.45, 0];
            rovnych = p.rovnych;
        }
        // Podstupnice: pás za přední hranou stupně, na stranu nášlapu
        const stupne = p.polygony.map((o, k) => {
            const body = o.body.map(T);
            const I = T(p.hrany[k].vnitrni), O = T(p.hrany[k].venku);
            const tx = O[0] - I[0], ty = O[1] - I[1], dl = Math.hypot(tx, ty) || 1;
            let nx = -ty / dl, ny = tx / dl;
            const cx = body.reduce((s, q) => s + q[0], 0) / body.length, cy = body.reduce((s, q) => s + q[1], 0) / body.length;
            if ((cx - (I[0] + O[0]) / 2) * nx + (cy - (I[1] + O[1]) / 2) * ny < 0) { nx = -nx; ny = -ny; }
            const t = tlPodstupnice;
            return { body, celo: [I, O, [O[0] + nx * t, O[1] + ny * t], [I[0] + nx * t, I[1] + ny * t]], nad: !!o.nad };
        });
        return {
            stupne, obrys, otvorOd, rovnych, nastup, uchop, vystupni: p.vystupni.map(T), delka: N * b, casti: [N],
            sirka: spirala ? p.sir : sirka, nejuzsi: p.nejuzsi ?? null, odVnitrniho: p.odVnitrniho, otacka: p.otacka ?? null,
            uhel: p.uhel ?? null, kruh: p.kruh || null,
        };
    }

    function spocitej(vstup, limity) {
        const v = { ...VYCHOZI, ...(vstup || {}) };
        const L = { ...LIMITY, ...(limity || {}) };
        const tvar = TVARY.includes(v.tvar) ? v.tvar : 'prime';
        const H = v.vyska;
        let n = Math.max(2, Math.round(H / (v.cilova || 0.175)));
        const naslap = (k) => omez(0.63 - 2 * H / k, 0.22, 0.32);
        // Vyhláška: užší nášlap než naslapMin nejde, přidá se výška (stupně nižší, nášlap širší)
        while (L.naslapMin > 0 && naslap(n) < L.naslapMin - 1e-9 && n < 80) n++;
        const h = H / n;
        const b = naslap(n);
        let p = null, sirka = v.sirka, nelze = false;
        const zabiha = tvar === 'Lz' || tvar === 'Uz';
        if (tvar === 'tocite') {
            p = tocite(n - 1, b, v.prumer);
            sirka = p.sir;
        } else if (tvar === 'Lz' || tvar === 'Uz') {
            p = zabihajici(n - 1, b, v.sirka, tvar, v.zatacka);
            // Zatáčka se nevejde: nákres ukáže schody s odpočívadlem a výsledek upozorní
            if (!p) { nelze = true; p = sOdpocivadly(n, b, v.sirka, tvar === 'Lz' ? 'L' : 'U'); }
        } else {
            p = sOdpocivadly(n, b, v.sirka, tvar);
        }
        // Vodorovné úseky po výstupní čáře: nášlapy a odpočívadla (počítá se jako jeden stupeň, editor stejně)
        const useky = p.casti.flatMap((c, i) => [...(i > 0 ? [v.sirka] : []), ...Array(c).fill(b)]).filter((x) => x > 0);
        const rameno = Math.max(...p.casti) + 1;   // výšek v nejdelším rameni: jeho nášlapy a krok na odpočívadlo nebo podlahu
        const podchod = p.otacka ? p.otacka * h - TL_STUPNE : null;
        // Kolem osy se stupně sbíhají do bodu, nejužší místo je osa sama
        const nejuzsi = nelze || (zabiha && v.zatacka !== 'rozlozene') ? null : p.nejuzsi ?? null;
        // Zakřivená ramena: nášlap tam, kde ho měří vyhláška (do 1,1 m na výstupní čáře 0,4 m od vnějšího okraje)
        const zakrivene = !nelze && (tvar === 'Lz' || tvar === 'Uz' || tvar === 'tocite');
        const uzke = sirka <= ZAKRIV_UZKE + 1e-9;
        const merena = zakrivene ? (uzke ? b : p.odVnitrniho) : null;
        const merenaMez = uzke ? L.naslapMin : L.zakrivMin;
        return {
            useky,
            n, h, b, sirka, tvar, H, nelze,
            krok: 2 * h + b,
            sklon: Math.atan(h / b) * 180 / Math.PI,
            naslapu: p.casti.reduce((s, c) => s + c, 0),
            rameno,
            pudorys: p,
            nejuzsi,
            merena,
            otacka: p.otacka ?? null,
            podchod,
            vyskaOk: h >= L.vyskaMin - 1e-9 && h <= L.vyskaMax + 1e-9,
            krokOk: 2 * h + b >= L.krokMin - 1e-9 && 2 * h + b <= L.krokMax + 1e-9,
            sirkaOk: sirka >= L.sirkaMin - 1e-9,
            ramenoOk: rameno <= L.rameno,
            naslapOk: !(L.naslapMin > 0) || b >= L.naslapMin - 1e-9,
            merenaOk: merena === null || !(merenaMez > 0) || merena >= merenaMez - 1e-9,
            podchodOk: podchod === null || podchod >= L.podchod - 1e-9,
        };
    }

    const SVG = 'http://www.w3.org/2000/svg';
    const prvek = (nazev, atributy, rodic) => {
        const e = document.createElementNS(SVG, nazev);
        Object.entries(atributy).forEach(([k, hodnota]) => e.setAttribute(k, hodnota));
        rodic?.appendChild(e);
        return e;
    };

    /** Bokorys: rozvinuté schodiště po výstupní čáře, všechny stupně za sebou, v měřítku. */
    function kresliBokorys(svg, r, popisky) {
        svg.replaceChildren();
        const sirkaObr = 640, vyskaObr = 320, vlevo = 100, okraj = 40;
        const delka = r.useky.reduce((s, x) => s + x, 0);
        const m = Math.min((sirkaObr - vlevo - okraj) / delka, (vyskaObr - 2 * okraj) / r.H);
        const x0 = vlevo, y0 = vyskaObr - okraj;
        const X = (x) => x0 + x * m, Y = (y) => y0 - y * m;
        // Obrys stupňů: výška, nášlap, …, poslední výška na podlahu patra
        let body = `${X(0)},${Y(0)}`;
        let x = 0;
        r.useky.forEach((u, i) => { body += ` ${X(x)},${Y((i + 1) * r.h)} ${X(x + u)},${Y((i + 1) * r.h)}`; x += u; });
        body += ` ${X(delka)},${Y(r.H)} ${X(delka)},${Y(0)}`;
        prvek('line', { class: 'tt-schody-podlaha', x1: 0, y1: Y(0), x2: sirkaObr, y2: Y(0) }, svg);
        prvek('line', { class: 'tt-schody-podlaha', x1: X(delka), y1: Y(r.H), x2: sirkaObr, y2: Y(r.H) }, svg);
        prvek('polygon', { class: 'tt-schody-stupen', points: body }, svg);
        // Kóty: výška mezi podlažími vlevo, délka dole
        prvek('line', { class: 'tt-schody-kota', x1: X(0) - 12, y1: Y(0), x2: X(0) - 12, y2: Y(r.H) }, svg);
        const t1 = prvek('text', { class: 'tt-schody-text', x: X(0) - 20, y: (Y(0) + Y(r.H)) / 2 + 7, 'text-anchor': 'end' }, svg);
        t1.textContent = popisky.vyska;
        const t2 = prvek('text', { class: 'tt-schody-text', x: (X(0) + X(delka)) / 2, y: y0 + 28, 'text-anchor': 'middle' }, svg);
        t2.textContent = popisky.delka;
        const t3 = prvek('text', { class: 'tt-schody-text', x: X(0) + 8, y: Y(r.H) + 4 }, svg);
        t3.textContent = popisky.stupen;
    }

    /** Půdorys: stupně a odpočívadla v měřítku, výstupní čára s kroužkem na nástupu a šipkou na výstupu. */
    function kresliPudorys(svg, r, popisky) {
        svg.replaceChildren();
        const p = r.pudorys;
        const sirkaObr = 420, vyskaObr = 320, okraj = 30;
        const m = Math.min((sirkaObr - 2 * okraj) / p.delka, (vyskaObr - 2 * okraj - 10) / p.sirka);
        const ox = (sirkaObr - p.delka * m) / 2 - p.minX * m, oy = (vyskaObr - 10 - p.sirka * m) / 2 - p.minY * m;
        const B = (q) => [ox + q[0] * m, oy + q[1] * m];
        const body = (pole) => pole.map((q) => B(q).map((c) => c.toFixed(1)).join(',')).join(' ');
        if (p.kruh) prvek('circle', { class: 'tt-schody-obrys', cx: B([p.kruh.cx, 0])[0], cy: B([0, p.kruh.cy])[1], r: p.kruh.R * m }, svg);
        // Stupně nad první otáčkou točitých schodů jen obrysem, aby byly vidět ty pod nimi
        p.polygony.filter((o) => !o.nad).forEach((o) => prvek('polygon', { class: o.podesta ? 'tt-schody-podesta' : 'tt-schody-stupen', points: body(o.body) }, svg));
        p.polygony.filter((o) => o.nad).forEach((o) => prvek('polygon', { class: 'tt-schody-nad', points: body(o.body) }, svg));
        if (p.kruh) prvek('circle', { class: 'tt-schody-sloupek', cx: B([p.kruh.cx, 0])[0], cy: B([0, p.kruh.cy])[1], r: Math.max(3, p.kruh.r0 * m) }, svg);
        // Výstupní čára
        const v = p.vystupni.map(B);
        prvek('polyline', { class: 'tt-schody-vystupni', points: v.map((q) => q.map((c) => c.toFixed(1)).join(',')).join(' ') }, svg);
        prvek('circle', { class: 'tt-schody-vystupni-znacka', cx: v[0][0], cy: v[0][1], r: 5 }, svg);
        const [a, z] = [v[v.length - 2], v[v.length - 1]];
        const dl = Math.hypot(z[0] - a[0], z[1] - a[1]) || 1, ux = (z[0] - a[0]) / dl, uy = (z[1] - a[1]) / dl;
        prvek('polygon', { class: 'tt-schody-vystupni-znacka', points: `${z[0]},${z[1]} ${z[0] - 12 * ux - 6 * uy},${z[1] - 12 * uy + 6 * ux} ${z[0] - 12 * ux + 6 * uy},${z[1] - 12 * uy - 6 * ux}` }, svg);
        const t = prvek('text', { class: 'tt-schody-text', x: sirkaObr / 2, y: vyskaObr - 4, 'text-anchor': 'middle' }, svg);
        t.textContent = popisky.pudorys;
    }

    function pripoj(blok) {
        const jazyk = document.documentElement.lang || 'cs';
        const cislo = (x, des = 0) => new Intl.NumberFormat(jazyk, { minimumFractionDigits: des, maximumFractionDigits: des }).format(x);
        const zapis = (klic, text) => blok.querySelectorAll(`[data-v="${klic}"]`).forEach((e) => { e.textContent = text; });
        const stav = (klic, ok) => blok.querySelectorAll(`[data-stav="${klic}"]`).forEach((e) => { e.dataset.ok = ok ? '1' : '0'; });
        const cteni = (pole) => parseFloat(String(pole.value).replace(',', '.'));
        const hodnota = (pole) => {
            const x = cteni(pole);
            const meritko = parseFloat(pole.dataset.meritko || '1');
            if (!Number.isFinite(x)) return VYCHOZI[pole.dataset.pole];
            return omez(x, parseFloat(pole.min), parseFloat(pole.max)) * meritko;
        };

        let limity = {};
        try {
            limity = JSON.parse(blok.dataset.limity || '{}');
        } catch (e) {
            window.zalogujChybu?.(e, 'Kalkulačka schodiště: limity', { clanek: blok.dataset.clanek, limity: blok.dataset.limity });
        }
        const prepocet = () => {
            const vstup = {};
            blok.querySelectorAll('[data-pole]').forEach((pole) => {
                vstup[pole.dataset.pole] = pole.tagName === 'SELECT' ? pole.value : hodnota(pole);
            });
            const r = spocitej(vstup, limity);
            // Pole, řádky výsledku a doporučení jen pro některé tvary
            blok.querySelectorAll('[data-jen]').forEach((e) => { e.hidden = !e.dataset.jen.split(' ').includes(r.tvar); });
            blok.querySelectorAll('[data-nelze]').forEach((e) => { e.hidden = !r.nelze; });
            // Zatáčka se nevejde: nejužší místo ani nášlap v zatáčce nemá smysl ukazovat
            if (r.nelze) blok.querySelectorAll('[data-zatacka]').forEach((e) => { e.hidden = true; });
            if (r.nejuzsi === null) blok.querySelectorAll('[data-radek="nejuzsi"]').forEach((e) => { e.hidden = true; });
            const mm = (x) => cislo(x * 1000);
            zapis('n', cislo(r.n));
            zapis('h', mm(r.h));
            zapis('b', mm(r.b));
            zapis('krok', mm(r.krok));
            zapis('sklon', cislo(r.sklon));
            zapis('naslapu', cislo(r.naslapu));
            zapis('rameno', cislo(r.rameno));
            zapis('nejuzsi', r.nejuzsi === null ? '–' : mm(r.nejuzsi));
            zapis('merena', r.merena === null ? '–' : mm(r.merena));
            zapis('otacka', r.otacka === null ? '–' : cislo(r.otacka, 1));
            zapis('podchod', r.podchod === null ? '–' : cislo(r.podchod, 2));
            zapis('pudorys', `${cislo(r.pudorys.delka, 2)} × ${cislo(r.pudorys.sirka, 2)}`);
            stav('rameno', r.ramenoOk);
            stav('vyska', r.vyskaOk);
            stav('krok', r.krokOk);
            stav('sirka', r.sirkaOk);
            stav('naslap', r.naslapOk);
            stav('merena', r.merenaOk);
            stav('podchod', r.podchodOk);
            const d = blok.dataset;
            kresliBokorys(blok.querySelector('[data-nakres="bokorys"]'), r, {
                vyska: `${cislo(r.H, 2)} m`, delka: `${cislo(r.useky.reduce((s, u) => s + u, 0), 2)} m`, stupen: `${mm(r.h)} / ${mm(r.b)} mm`,
            });
            kresliPudorys(blok.querySelector('[data-nakres="pudorys"]'), r, {
                pudorys: (d.popisekPudorys || '').replace(':rozmer', `${cislo(r.pudorys.delka, 2)} × ${cislo(r.pudorys.sirka, 2)} m`),
            });
            return r;
        };

        let hlaseno = false;
        const priZmene = () => {
            prepocet();
            if (hlaseno) return;
            hlaseno = true;
            window.gtag?.('event', 'kalkulacka_pouzita', { kalkulacka: 'schodiste', clanek: blok.dataset.clanek || '' });
        };
        blok.addEventListener('input', priZmene);
        blok.addEventListener('change', (e) => {
            // Hodnota mimo rozsah pole se počítá s mezí, po odchodu z pole se mez ukáže i v něm
            const pole = e.target.closest?.('input[data-pole]');
            const x = pole ? cteni(pole) : NaN;
            if (Number.isFinite(x)) {
                const mez = omez(x, parseFloat(pole.min), parseFloat(pole.max));
                if (mez !== x) pole.value = String(mez);
            }
            priZmene();
        });
        blok.addEventListener('submit', (e) => e.preventDefault());
        prepocet();
    }

    const Kalkulacka = { VYCHOZI, LIMITY, TVARY, spocitej, castiSchodu, odstupVystupni, proEditor, TL_STUPNE, LIMITY_CZ: LIMITY };
    koren.KalkulackaSchodiste = Kalkulacka;
    if (typeof document !== 'undefined') {
        document.querySelectorAll('[data-kalkulacka="schodiste"]').forEach((blok) => {
            try {
                pripoj(blok);
            } catch (e) {
                window.zalogujChybu?.(e, 'Kalkulačka schodiště', { clanek: blok.dataset.clanek });
            }
        });
    }
})(typeof window !== 'undefined' ? window : globalThis);
