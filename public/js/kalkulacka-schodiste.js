/**
 * Veřejná kalkulačka schodiště (článek Výpočet schodiště, modules/blog.md).
 *
 * Záměrně samostatný kód, veřejná stránka nesmí načítat nic z js/koncept-v3. Počítá stejně jako schody
 * v editoru (DumGeo.schodyGeo a castiSchodu v koncept-v3/dum.js): počet výšek z cílové výšky stupně,
 * nášlap ze vztahu 2h + b = 630 mm omezený na 220 až 320 mm, u L a U s odpočívadlem uprostřed.
 * Shodu hlídá services/import-test/test-kalkulacka-schodiste.cjs. Texty jsou v šabloně
 * clanky/bloky/kalkulacka-schodiste, tady se jen dosazují čísla a kreslí nákres.
 *
 * Délky v metrech.
 */
(function (koren) {
    const VYCHOZI = { vyska: 2.9, tvar: 'prime', sirka: 0.9, cilova: 0.175 };
    // Doporučení v Česku (ČSN 73 4130 jen doporučuje, modules/stavebni-parametry.md); verze pro jinou zemi je
    // přepíše parametry bloku (data-limity)
    const LIMITY = { vyskaMin: 0.15, vyskaMax: 0.18, krokMin: 0.6, krokMax: 0.65, sirkaMin: 0.9 };
    const omez = (x, a, b) => Math.min(b, Math.max(a, x));

    /** Stupně v půdorysu: obdélníky {x, y, w, h, podesta} v m, nástup v [0, 0], první rameno ve směru x. */
    function pudorys(n, b, sir, tvar) {
        const obdelniky = [];
        const rameno = (pocet, poloha) => { for (let i = 0; i < pocet; i++) obdelniky.push(poloha(i)); };
        let casti;
        if (tvar === 'L') {
            const F = Math.max(1, n - 2);
            const t1 = Math.max(1, Math.floor(F / 2)), t2 = F - t1;
            const L1 = t1 * b;
            rameno(t1, (i) => ({ x: i * b, y: 0, w: b, h: sir }));
            obdelniky.push({ x: L1, y: 0, w: sir, h: sir, podesta: true });
            rameno(t2, (i) => ({ x: L1, y: sir + i * b, w: sir, h: b }));
            casti = [t1, t2];
        } else if (tvar === 'U') {
            const F = Math.max(1, n - 2);
            const t1 = Math.max(1, Math.floor(F / 2)), t3 = F - t1;
            const L1 = t1 * b;
            rameno(t1, (i) => ({ x: i * b, y: 0, w: b, h: sir }));
            obdelniky.push({ x: L1, y: 0, w: sir, h: 2 * sir, podesta: true });
            rameno(t3, (i) => ({ x: L1 - (i + 1) * b, y: sir, w: b, h: sir }));
            casti = [t1, t3];   // jedno široké odpočívadlo přes obě ramena (editor: prostřední část 0)
        } else {
            rameno(n - 1, (i) => ({ x: i * b, y: 0, w: b, h: sir }));
            casti = [n - 1];
        }
        const x0 = Math.min(...obdelniky.map((o) => o.x)), y0 = Math.min(...obdelniky.map((o) => o.y));
        const x1 = Math.max(...obdelniky.map((o) => o.x + o.w)), y1 = Math.max(...obdelniky.map((o) => o.y + o.h));
        return { obdelniky, casti, minX: x0, minY: y0, delka: x1 - x0, sirka: y1 - y0 };
    }

    function spocitej(vstup, limity) {
        const v = { ...VYCHOZI, ...(vstup || {}) };
        const L = { ...LIMITY, ...(limity || {}) };
        const H = v.vyska;
        const n = Math.max(2, Math.round(H / (v.cilova || 0.175)));
        const h = H / n;
        const b = omez(0.63 - 2 * h, 0.22, 0.32);
        const p = pudorys(n, b, v.sirka, v.tvar);
        // Vodorovné úseky po výstupní čáře: nášlapy a odpočívadlo (počítá se jako jeden stupeň, editor stejně)
        const useky = p.casti.flatMap((c, i) => [...(i > 0 ? [v.sirka] : []), ...Array(c).fill(b)]).filter((x) => x > 0);
        return {
            useky,
            n, h, b, sirka: v.sirka, tvar: v.tvar, H,
            krok: 2 * h + b,
            sklon: Math.atan(h / b) * 180 / Math.PI,
            naslapu: p.casti.reduce((s, c) => s + c, 0),
            pudorys: p,
            vyskaOk: h >= L.vyskaMin - 1e-9 && h <= L.vyskaMax + 1e-9,
            krokOk: 2 * h + b >= L.krokMin - 1e-9 && 2 * h + b <= L.krokMax + 1e-9,
            sirkaOk: v.sirka >= L.sirkaMin - 1e-9,
        };
    }

    const SVG = 'http://www.w3.org/2000/svg';
    const prvek = (nazev, atributy, rodic) => {
        const e = document.createElementNS(SVG, nazev);
        Object.entries(atributy).forEach(([k, hodnota]) => e.setAttribute(k, hodnota));
        rodic?.appendChild(e);
        return e;
    };

    /** Bokorys: rozvinuté schodiště, všechny stupně za sebou, v měřítku. */
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

    /** Půdorys: stupně a odpočívadlo v měřítku, šipka nástupu. */
    function kresliPudorys(svg, r, popisky) {
        svg.replaceChildren();
        const p = r.pudorys;
        const sirkaObr = 420, vyskaObr = 320, okraj = 30;
        const m = Math.min((sirkaObr - 2 * okraj) / p.delka, (vyskaObr - 2 * okraj) / p.sirka);
        const ox = (sirkaObr - p.delka * m) / 2 - p.minX * m, oy = (vyskaObr - p.sirka * m) / 2 - p.minY * m;
        p.obdelniky.forEach((o) => prvek('rect', {
            class: o.podesta ? 'tt-schody-podesta' : 'tt-schody-stupen',
            x: ox + o.x * m, y: oy + o.y * m, width: o.w * m, height: o.h * m,
        }, svg));
        const sipka = prvek('text', { class: 'tt-schody-text', x: ox + 4, y: oy + r.sirka * m / 2 + 7 }, svg);
        sipka.textContent = '↑';
        sipka.setAttribute('transform', `rotate(90 ${ox + 10} ${oy + r.sirka * m / 2})`);
        const t = prvek('text', { class: 'tt-schody-text', x: sirkaObr / 2, y: vyskaObr - 4, 'text-anchor': 'middle' }, svg);
        t.textContent = popisky.pudorys;
    }

    function pripoj(blok) {
        const jazyk = document.documentElement.lang || 'cs';
        const cislo = (x, des = 0) => new Intl.NumberFormat(jazyk, { minimumFractionDigits: des, maximumFractionDigits: des }).format(x);
        const zapis = (klic, text) => blok.querySelectorAll(`[data-v="${klic}"]`).forEach((e) => { e.textContent = text; });
        const stav = (klic, ok) => blok.querySelectorAll(`[data-stav="${klic}"]`).forEach((e) => { e.dataset.ok = ok ? '1' : '0'; });
        const hodnota = (pole) => {
            const x = parseFloat(String(pole.value).replace(',', '.'));
            const meritko = parseFloat(pole.dataset.meritko || '1');
            if (!Number.isFinite(x)) return VYCHOZI[pole.dataset.pole];
            return omez(x, parseFloat(pole.min), parseFloat(pole.max)) * meritko;
        };

        let limity = {};
        try { limity = JSON.parse(blok.dataset.limity || '{}'); } catch { /* výchozí limity */ }
        const prepocet = () => {
            const vstup = {};
            blok.querySelectorAll('[data-pole]').forEach((pole) => {
                vstup[pole.dataset.pole] = pole.tagName === 'SELECT' ? pole.value : hodnota(pole);
            });
            const r = spocitej(vstup, limity);
            const mm = (x) => cislo(x * 1000);
            zapis('n', cislo(r.n));
            zapis('h', mm(r.h));
            zapis('b', mm(r.b));
            zapis('krok', mm(r.krok));
            zapis('sklon', cislo(r.sklon));
            zapis('naslapu', cislo(r.naslapu));
            zapis('pudorys', `${cislo(r.pudorys.delka, 2)} × ${cislo(r.pudorys.sirka, 2)}`);
            stav('vyska', r.vyskaOk);
            stav('krok', r.krokOk);
            stav('sirka', r.sirkaOk);
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
        blok.addEventListener('change', priZmene);
        blok.addEventListener('submit', (e) => e.preventDefault());
        prepocet();
    }

    const Kalkulacka = { VYCHOZI, LIMITY, spocitej };
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
