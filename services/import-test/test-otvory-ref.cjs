/**
 * Rozpoznané otvory proti RUČNÍ REFERENCI od uživatele.
 *
 * Spuštění:
 *   node services/import-test/test-otvory-ref.cjs <svg> <popis.json> <reference.json>
 */
const fs = require('fs');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');
const A = nactiAnalyzu();

const [svgSoubor, popisSoubor, referenceSoubor] = process.argv.slice(2);
if (!svgSoubor || !popisSoubor || !referenceSoubor) { console.error('Zadejte: <svg> <popis.json> <reference.json>'); process.exit(1); }

const ref = JSON.parse(fs.readFileSync(referenceSoubor, 'utf8'));
const popis = JSON.parse(fs.readFileSync(popisSoubor, 'utf8'));
const strana = popis.strany[Object.keys(popis.strany)[0]];
const [k1, k2] = strana.kalibBody;
const mnb = (strana.kalibMm / 1000) / Math.hypot(k2[0] - k1[0], k2[1] - k1[1]);

const pk = ref.podklad, dpi = 150;
const sirkaPx = pk.sirkaM / pk.metryNaPx, vyskaPx = pk.vyskaM / pk.metryNaPx;
const naMetry = (bx, by) => ({
    x: pk.stredX + (bx * dpi / 72 - sirkaPx / 2) * pk.metryNaPx,
    y: pk.stredY - (by * dpi / 72 - vyskaPx / 2) * pk.metryNaPx,
});

// referenční otvory → střed v metrech editoru
const steny = new Map(ref.steny.map(w => [w.id, w]));
const refOtvory = [];
for (const o of ref.otvory || []) {
    const w = steny.get(o.stena || o.wallId);
    if (!w) continue;
    const dx = w.do[0] - w.od[0], dy = w.do[1] - w.od[1];
    const L = Math.hypot(dx, dy) || 1;
    const t = (o.pozice + o.sirka / 2) / L;      // pozice je levý okraj
    refOtvory.push({ x: w.od[0] + dx * t, y: w.od[1] + dy * t, sirka: o.sirka, typ: o.typ });
}

const svg = fs.readFileSync(svgSoubor, 'utf8');
const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys: strana.obrys, maxVariant: 1 });
const v = varianty[0];
const nalezene = (v.otvory || []).map(o => {
    const s = naMetry(o.x, o.y);
    return { x: s.x, y: s.y, sirka: o.sirka, typ: o.typ, oblouk: o.oblouk };
});

const TOL = 0.45;   // otvor se považuje za týž, když je střed do 45 cm
const paruj = (a, b) => b.findIndex(x => !x._pouzit && Math.hypot(x.x - a.x, x.y - a.y) < TOL);

let sedi = 0, spatnyTyp = 0, rozdilySirek = [];
for (const r of refOtvory) {
    const i = paruj(r, nalezene);
    if (i < 0) continue;
    nalezene[i]._pouzit = true;
    r._trefen = true;
    sedi++;
    if (nalezene[i].typ !== r.typ) spatnyTyp++;
    rozdilySirek.push(Math.abs(nalezene[i].sirka - r.sirka));
}
const navic = nalezene.filter(n => !n._pouzit).length;
const prumer = rozdilySirek.length ? rozdilySirek.reduce((a, b) => a + b, 0) / rozdilySirek.length : 0;

console.log(`${pk.nazev}`);
console.log(`  reference: ${refOtvory.length} otvorů `
    + `(${refOtvory.filter(o => o.typ === 'okno').length} oken, ${refOtvory.filter(o => o.typ !== 'okno').length} dveří)`);
console.log(`  rozpoznáno: ${nalezene.length} `
    + `(${nalezene.filter(o => o.typ === 'okno').length} oken, ${nalezene.filter(o => o.typ !== 'okno').length} dveří`
    + `, z toho ${nalezene.filter(o => o.oblouk).length} podle oblouku)`);
console.log(`  trefeno ${sedi}/${refOtvory.length} · navíc ${navic}`
    + ` · špatný typ ${spatnyTyp} · průměrná chyba šířky ${(prumer * 100).toFixed(0)} cm`);

// ── podle typu: křídlové dveře se kreslí jinak než okna, míchat je nemá smysl
for (const [popisek, filtr] of [['dveře', o => o.typ !== 'okno'], ['okna', o => o.typ === 'okno']]) {
    const skupina = refOtvory.filter(filtr);
    const trefene = skupina.filter(r => r._trefen).length;
    const sirky = skupina.map(o => Math.round(o.sirka * 100)).sort((a, b) => a - b);
    console.log(`    ${popisek.padEnd(6)} ${String(trefene).padStart(2)}/${String(skupina.length).padStart(2)}`
        + ` (${skupina.length ? Math.round(trefene / skupina.length * 100) : 0} %)`
        + `  šířky: ${[...new Set(sirky)].join(', ')} cm`);
}
