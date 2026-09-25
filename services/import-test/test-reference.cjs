/**
 * Porovnání automatického rozpoznání s RUČNÍ REFERENCÍ od uživatele.
 *
 * Reference = koncept, do kterého uživatel nakreslil stěny tak, jak mají být.
 * Test řekne, kolik stěn automat našel, kolik minul a kolik si vymyslel —
 * tedy něco, co jde porovnat se skutečností, ne jen vnitřní metriky.
 *
 * Spuštění:
 *   node services/import-test/test-reference.cjs <svg> <popis.json> <reference.json>
 */
const fs = require('fs');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');

const A = nactiAnalyzu();
const [svgSoubor, popisSoubor, referenceSoubor] = process.argv.slice(2);
if (!svgSoubor || !popisSoubor || !referenceSoubor) {
    console.error('Zadejte: <svg> <popis.json> <reference.json>');
    process.exit(1);
}

const ref = JSON.parse(fs.readFileSync(referenceSoubor, 'utf8'));
const popis = JSON.parse(fs.readFileSync(popisSoubor, 'utf8'));
const strana = popis.strany[Object.keys(popis.strany)[0]];
const [k1, k2] = strana.kalibBody;
const mnb = (strana.kalibMm / 1000) / Math.hypot(k2[0] - k1[0], k2[1] - k1[1]);

// převod bodů PDF → metry editoru (podklad je vycentrovaný obrázek)
const pk = ref.podklad;
const dpi = 150;
const sirkaPx = pk.sirkaM / pk.metryNaPx;
const vyskaPx = pk.vyskaM / pk.metryNaPx;
const naMetry = (bx, by) => {
    const px = bx * dpi / 72, py = by * dpi / 72;
    return {
        x: pk.stredX + (px - sirkaPx / 2) * pk.metryNaPx,
        y: pk.stredY - (py - vyskaPx / 2) * pk.metryNaPx,
    };
};

const referencni = ref.steny.map(w => ({
    x1: w.od[0], y1: w.od[1], x2: w.do[0], y2: w.do[1],
    tloustka: w.tloustka, typ: w.typ,
}));

const svg = fs.readFileSync(svgSoubor, 'utf8');
const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys: strana.obrys, maxVariant: 4 });

/** Jaká část stěny `a` leží na některé stěně ze sady `sada`? */
function pokryti(a, sada, tolerance = 0.30) {
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const L = Math.hypot(dx, dy);
    if (!L) return 0;
    const kroku = Math.max(6, Math.round(L / 0.1));
    let trefy = 0;
    for (let i = 0; i < kroku; i++) {
        const t = (i + 0.5) / kroku;
        const px = a.x1 + dx * t, py = a.y1 + dy * t;
        const sedi = sada.some(b => {
            let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
            if (rozdil > 10 * Math.PI / 180) return false;
            const bdx = b.x2 - b.x1, bdy = b.y2 - b.y1;
            const bL2 = bdx * bdx + bdy * bdy || 1;
            let u = ((px - b.x1) * bdx + (py - b.y1) * bdy) / bL2;
            if (u < -0.02 || u > 1.02) return false;
            u = Math.max(0, Math.min(1, u));
            return Math.hypot(b.x1 + bdx * u - px, b.y1 + bdy * u - py) < tolerance;
        });
        if (sedi) trefy++;
    }
    return trefy / kroku;
}

console.log(`reference: ${referencni.length} stěn `
    + `(${referencni.filter(w => w.typ === 'obvodova').length} obvodových, `
    + `${referencni.filter(w => w.typ !== 'obvodova').length} příček)\n`);

varianty.forEach((v, i) => {
    const nalezene = v.osy.map(o => {
        const a = naMetry(o.x1, o.y1), b = naMetry(o.x2, o.y2);
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, tloustka: o.tloustka };
    });

    const nasel = referencni.filter(r => pokryti(r, nalezene) >= 0.6);
    const minul = referencni.filter(r => pokryti(r, nalezene) < 0.6);
    const navic = nalezene.filter(n => pokryti(n, referencni) < 0.6);

    // rozdíl tloušťky u nalezených
    let rozdilyTl = [];
    for (const r of nasel) {
        const nej = nalezene
            .map(n => ({ n, p: pokryti(r, [n]) }))
            .sort((a, b) => b.p - a.p)[0];
        if (nej && nej.p >= 0.4) rozdilyTl.push(Math.abs(nej.n.tloustka - r.tloustka));
    }
    const prumerTl = rozdilyTl.length ? rozdilyTl.reduce((a, b) => a + b, 0) / rozdilyTl.length : 0;

    const roz = {};
    for (const n of nalezene) { const k = Math.round(n.tloustka * 100); roz[k] = (roz[k] || 0) + 1; }
    console.log(`${i + 1}. ${v.styl.slice(0, 32).padEnd(34)} stěn=${String(v.osy.length).padStart(3)}`
        + `  tloušťky: ${Object.keys(roz).sort((a, b) => a - b).map(k => k + 'cm×' + roz[k]).join(' ')}`);
    console.log(`     našel ${nasel.length}/${referencni.length} referenčních`
        + ` · minul ${minul.length}`
        + ` · navíc ${navic.length}`
        + ` · průměrná chyba tloušťky ${(prumerTl * 100).toFixed(1)} cm`);
    if (minul.length) {
        for (const m of minul) {
            const smer = Math.abs(m.x2 - m.x1) > Math.abs(m.y2 - m.y1) ? 'vodorovná' : 'svislá';
            console.log(`     MINUL ${m.typ === 'obvodova' ? 'obvod' : 'příčka'} ${Math.hypot(m.x2 - m.x1, m.y2 - m.y1).toFixed(2)} m`
                + ` tl ${(m.tloustka * 100).toFixed(0)} cm · ${smer}`
                + ` · [${m.x1.toFixed(2)}, ${m.y1.toFixed(2)}] → [${m.x2.toFixed(2)}, ${m.y2.toFixed(2)}]`
                + ` · pokrytí ${(pokryti(m, nalezene) * 100).toFixed(0)} %`);
        }
    }
});
