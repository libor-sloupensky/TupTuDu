/**
 * Vyřízne z výkresu okolí každého referenčního otvoru a označí, jestli ho
 * automat našel. Slouží k tomu, aby šlo na vlastní oči porovnat nalezené
 * s nenalezenými — z čísel není poznat, čím se liší kresba.
 *
 * Spuštění:
 *   node services/import-test/vyrez-otvoru.cjs <png> <popis.json> <reference.json> <svg> <výstup.png> [typ]
 */
const fs = require('fs');
const path = require('path');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const A = nactiAnalyzu();
const [pngSoubor, popisSoubor, refSoubor, svgSoubor, vystup, typFiltr] = process.argv.slice(2);
if (!vystup) { console.error('Zadejte: <png> <popis.json> <reference.json> <svg> <výstup.png> [typ]'); process.exit(1); }

const ref = JSON.parse(fs.readFileSync(refSoubor, 'utf8'));
const popis = JSON.parse(fs.readFileSync(popisSoubor, 'utf8'));
const st = popis.strany[Object.keys(popis.strany)[0]];
const [k1, k2] = st.kalibBody;
const mnb = (st.kalibMm / 1000) / Math.hypot(k2[0] - k1[0], k2[1] - k1[1]);

const pk = ref.podklad;

// Rozlišení PNG se NEHÁDÁ — odvodí se z jeho skutečné šířky proti šířce
// stránky v bodech (viewBox SVG). Obrázek vyrobený jiným DPI než podklad
// v aplikaci by jinak posunul všechny výřezy vedle.
function sirkaPng(soubor) {
    const b = fs.readFileSync(soubor);
    return { sirka: b.readUInt32BE(16), vyska: b.readUInt32BE(20) };
}
const svgHlavicka = fs.readFileSync(svgSoubor, 'utf8').slice(0, 2000);
const vb = svgHlavicka.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const rozmerPng = sirkaPng(pngSoubor);
const pxNaBod = rozmerPng.sirka / vb[2];

// podklad v editoru je vycentrovaný obrázek o rozměru sirkaM × vyskaM
const sirkaPodkladu = pk.sirkaM / pk.metryNaPx, vyskaPodkladu = pk.vyskaM / pk.metryNaPx;
const pxNaBodPodkladu = sirkaPodkladu / vb[2];
const naBody = (x, y) => ({
    x: ((x - pk.stredX) / pk.metryNaPx + sirkaPodkladu / 2) / pxNaBodPodkladu,
    y: ((pk.stredY - y) / pk.metryNaPx + vyskaPodkladu / 2) / pxNaBodPodkladu,
});

// referenční otvory → střed v bodech PDF
const steny = new Map(ref.steny.map(w => [w.id, w]));
const refOtvory = [];
for (const o of ref.otvory || []) {
    const w = steny.get(o.stena || o.wallId);
    if (!w) continue;
    const dx = w.do[0] - w.od[0], dy = w.do[1] - w.od[1];
    const L = Math.hypot(dx, dy) || 1;
    const t = (o.pozice + o.sirka / 2) / L;
    const stred = naBody(w.od[0] + dx * t, w.od[1] + dy * t);
    refOtvory.push({ ...stred, sirka: o.sirka, typ: o.typ });
}

// co automat našel
const svg = fs.readFileSync(svgSoubor, 'utf8');
const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys: st.obrys, maxVariant: 1 });
const nalezene = varianty[0].otvory || [];
const jeNalezen = (o) => nalezene.some(n => Math.hypot(n.x - o.x, n.y - o.y) * mnb < 0.45);

const vybrane = refOtvory.filter(o => !typFiltr || (typFiltr === 'dvere' ? o.typ !== 'okno' : o.typ === 'okno'));
vybrane.forEach(o => { o.nalezen = jeNalezen(o); });
console.log(`otvorů k zobrazení: ${vybrane.length} (nalezených ${vybrane.filter(o => o.nalezen).length},`
    + ` nenalezených ${vybrane.filter(o => !o.nalezen).length})`);

// Výřez: otvor + rezerva na oblouk. Oblouk má poloměr ~ šířka otvoru,
// takže okolo se nechává 1,15× šířka na každou stranu.
const png = 'data:image/png;base64,' + fs.readFileSync(pngSoubor).toString('base64');
const DLAZDICE = 260;
const dlazdice = vybrane.map((o, i) => {
    const polomerM = o.sirka * 1.15 + 0.25;
    const polomerPx = polomerM / mnb * pxNaBod;
    const meritko = DLAZDICE / (polomerPx * 2);
    const stredPx = { x: o.x * pxNaBod, y: o.y * pxNaBod };
    return { i, o, polomerPx, meritko, stredPx };
});

const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;background:#fff;font:12px system-ui}
.m{display:flex;flex-wrap:wrap;gap:6px;padding:6px}
.d{width:${DLAZDICE}px}
.o{position:relative;width:${DLAZDICE}px;height:${DLAZDICE}px;overflow:hidden;border:2px solid}
.ok{border-color:#16a34a}.ne{border-color:#dc2626}
.p{font-weight:600;padding:2px 0}
.ok .x,.p.ok{color:#16a34a}.p.ne{color:#dc2626}
img{position:absolute;transform-origin:0 0}
.k{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-5px 0 0 -5px;border-radius:50%;background:rgba(220,0,0,.75)}
</style><div class="m">
${dlazdice.map(d => `<div class="d">
  <div class="p ${d.o.nalezen ? 'ok' : 'ne'}">${d.i + 1}. ${d.o.typ} ${(d.o.sirka * 100).toFixed(0)} cm — ${d.o.nalezen ? 'NAŠEL' : 'NENAŠEL'}</div>
  <div class="o ${d.o.nalezen ? 'ok' : 'ne'}">
    <img src="${png}" style="left:0;top:0;transform:scale(${d.meritko}) translate(${-(d.stredPx.x - d.polomerPx)}px, ${-(d.stredPx.y - d.polomerPx)}px)">
    <div class="k"></div>
  </div></div>`).join('')}
</div>`;

const htmlSoubor = vystup.replace(/\.png$/, '.html');
fs.writeFileSync(htmlSoubor, html);

(async () => {
    const sloupcu = Math.min(5, vybrane.length);
    const radku = Math.ceil(vybrane.length / sloupcu);
    const p = await otevriProhlizec({ sirka: sloupcu * (DLAZDICE + 8) + 30, vyska: radku * (DLAZDICE + 30) + 40 });
    try {
        await p.jdiNa('file:///' + path.resolve(htmlSoubor).replace(/\\/g, '/'));
        await pauza(2000);
        await p.snimek(vystup);
        console.log('výřezy:', vystup);
    } finally { await p.zavri(); }
})();
