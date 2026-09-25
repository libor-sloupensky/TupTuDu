/**
 * Ověření rozpoznávání s obkresleným obrysem domu.
 *
 * Obrys (vnější líc obvodových stěn) v reálu nakreslí uživatel; tady se
 * pro test odvodí z kresby: vezme se obálka nejdelších čar uvnitř výřezu.
 *
 * Spuštění:
 *   node services/import-test/test-obrys.cjs <svg> <png> <měřítko> [výstup.png]
 */
const fs = require('fs');
const path = require('path');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const A = nactiAnalyzu();

/**
 * Náhrada za obkreslení uživatelem: obálka stěn nalezených bez obrysu.
 * V aplikaci obrys kreslí uživatel, tady jen potřebujeme realistický tvar.
 */
function odhadniObrys(svg, mnb, vyrez) {
    const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, vyrez, maxVariant: 1 });
    if (!varianty.length) return null;
    const osy = varianty[0].osy;
    const xs = osy.flatMap(o => [o.x1, o.x2]);
    const ys = osy.flatMap(o => [o.y1, o.y2]);
    return [
        [Math.min(...xs), Math.min(...ys)],
        [Math.max(...xs), Math.min(...ys)],
        [Math.max(...xs), Math.max(...ys)],
        [Math.min(...xs), Math.max(...ys)],
    ];
}

async function main() {
    const [svgSoubor, pngSoubor, meritkoArg, vystupArg] = process.argv.slice(2);
    const meritko = parseFloat(meritkoArg || '100');
    const mnb = 0.0003528 * meritko;
    const vystup = vystupArg || svgSoubor.replace(/\.svg$/, '-obrys.png');

    const svg = fs.readFileSync(svgSoubor, 'utf8');
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const vyrez = { x: vb[2] * 0.05, y: vb[3] * 0.05, sirka: vb[2] * 0.65, vyska: vb[3] * 0.85 };

    const obrys = odhadniObrys(svg, mnb, vyrez);
    if (!obrys) { console.error('Obrys se nepodařilo odhadnout.'); process.exit(1); }

    const sirkaM = (obrys[1][0] - obrys[0][0]) * mnb;
    const vyskaM = (obrys[2][1] - obrys[1][1]) * mnb;
    console.log(`obrys (test): ${sirkaM.toFixed(1)} × ${vyskaM.toFixed(1)} m`);

    const t0 = Date.now();
    const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, vyrez, obrys, maxVariant: 4 });
    console.log(`variant: ${varianty.length}, čas ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    varianty.forEach((v, i) => {
        const obvodovych = v.osy.filter(o => o.obvodova).length;
        console.log(`  ${i + 1}. ${v.styl.slice(0, 34).padEnd(36)} ${String(v.osy.length).padStart(4)} stěn`
            + ` (obvod ${obvodovych}, vnitřní ${v.osy.length - obvodovych}), ${v.delka.toFixed(0)} m, skóre ${v.skore.toFixed(2)}`);
    });

    // náhledy
    const sirkaPanelu = 700;
    const k = sirkaPanelu / vb[2];
    const vyskaPanelu = Math.round(vb[3] * k);
    const png = 'data:image/png;base64,' + fs.readFileSync(pngSoubor).toString('base64');
    const data = varianty.map((v, i) => ({
        popis: `${i + 1}. ${v.styl.slice(0, 30)} · ${v.osy.length} stěn · skóre ${v.skore.toFixed(2)}`,
        osy: v.osy.map(o => [o.x1, o.y1, o.x2, o.y2, o.tloustka, o.obvodova ? 1 : 0]),
    }));

    const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;font:12px system-ui;background:#fff}
.mriz{display:grid;grid-template-columns:repeat(2,${sirkaPanelu}px)}
.panel{position:relative;padding:18px 4px 4px}
.popis{position:absolute;top:2px;left:6px;font-weight:600}
img{position:absolute;width:${sirkaPanelu}px;height:${vyskaPanelu}px;opacity:.3}
canvas{position:relative}</style>
<div class="mriz">${data.map((d, i) => `<div class="panel"><div class="popis">${d.popis}</div>
<img src="${png}"><canvas id="c${i}" width="${sirkaPanelu}" height="${vyskaPanelu}"></canvas></div>`).join('')}</div>
<script>
const data = ${JSON.stringify(data)};
const k = ${k};
data.forEach((d, i) => {
  const g = document.getElementById('c' + i).getContext('2d');
  for (const [x1, y1, x2, y2, tl, obvod] of d.osy) {
    g.strokeStyle = obvod ? 'rgba(0,150,60,.95)' : (tl > 0.3 ? 'rgba(200,0,0,.9)' : 'rgba(0,120,255,.9)');
    g.lineWidth = Math.max(1.5, tl * 9 * k);
    g.beginPath(); g.moveTo(x1 * k, y1 * k); g.lineTo(x2 * k, y2 * k); g.stroke();
  }
});
</script>`;

    const htmlSoubor = vystup.replace(/\.png$/, '.html');
    fs.writeFileSync(htmlSoubor, html);
    const p = await otevriProhlizec({ sirka: sirkaPanelu * 2 + 30, vyska: vyskaPanelu * 2 + 60 });
    try {
        await p.jdiNa('file:///' + path.resolve(htmlSoubor).replace(/\\/g, '/'));
        await pauza(1200);
        await p.snimek(vystup);
        console.log('náhled:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('SELHALO:', e.message); process.exit(1); });
