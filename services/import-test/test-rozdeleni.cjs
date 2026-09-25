/**
 * Důkazní obrázky k výběru stěn podle rozdělení domu na místnosti.
 *
 * Ukáže vedle sebe: kandidáty (dvojice líců), přijaté stěny a nalezené
 * místnosti. Slouží k posouzení, jestli má postup smysl — ne k automatice.
 *
 * Spuštění:
 *   node services/import-test/test-rozdeleni.cjs <svg> <png> <měřítko> [výstup.png]
 */
const fs = require('fs');
const path = require('path');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const A = nactiAnalyzu();

/** Náhrada za obkreslení uživatelem — obálka stěn nalezených bez obrysu. */
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
    const vystup = vystupArg || svgSoubor.replace(/\.svg$/, '-rozdeleni.png');

    const svg = fs.readFileSync(svgSoubor, 'utf8');
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const vyrez = { x: vb[2] * 0.05, y: vb[3] * 0.05, sirka: vb[2] * 0.65, vyska: vb[3] * 0.85 };

    const obrys = odhadniObrys(svg, mnb, vyrez);
    if (!obrys) { console.error('obrys se nepodařilo odhadnout'); process.exit(1); }

    // 1) kandidáti: všechny dvojice líců uvnitř obrysu
    let usecky = A.extrahujUsecky(svg);
    usecky = usecky.filter(u =>
        u.x1 >= vyrez.x && u.y1 >= vyrez.y && u.x2 <= vyrez.x + vyrez.sirka && u.y2 <= vyrez.y + vyrez.vyska);
    const obvod = A.obvodoveSteny(obrys, usecky, { metryNaBod: mnb });
    usecky = A.orezObrysem(usecky, obrys, 0.1 / mnb);

    const syrove = A.osySten(usecky, { metryNaBod: mnb });
    const kandidati = A.vycistiOsy(syrove, { metryNaBod: mnb, jenNejvetsiSit: false }, obvod);
    console.log(`kandidátů: ${kandidati.length} (ze ${syrove.length} syrových)`);

    // 2) výběr podle rozdělení
    const t0 = Date.now();
    const vysledek = A.vyberPodleRozdeleni(kandidati, obvod, obrys, { metryNaBod: mnb });
    console.log(`shluky tlouštěk: ${vysledek.shluky.map(s => Math.round(s * 100) + ' cm').join(', ')}`);
    console.log(`přijato stěn: ${vysledek.steny.length}, místností: ${vysledek.mistnosti.length}`
        + `, čas ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    console.log('plochy místností: '
        + vysledek.mistnosti.map(m => m.plochaM2.toFixed(1)).sort((a, b) => b - a).join(', ') + ' m²');

    // 3) obrázky
    const sirkaPanelu = 760;
    const k = sirkaPanelu / (obrys[1][0] - obrys[0][0] + 80);
    const posunX = -(obrys[0][0] - 40) * k, posunY = -(obrys[0][1] - 40) * k;
    const vyskaPanelu = Math.round((obrys[2][1] - obrys[1][1] + 80) * k);
    const png = 'data:image/png;base64,' + fs.readFileSync(pngSoubor).toString('base64');
    const pngMeritko = k * (vb[2] / vb[2]);

    const data = {
        kandidati: kandidati.map(o => [o.x1, o.y1, o.x2, o.y2, o.tloustka]),
        prijate: vysledek.steny.map(o => [o.x1, o.y1, o.x2, o.y2, o.tloustka]),
        obvod: obvod.map(o => [o.x1, o.y1, o.x2, o.y2, o.tloustka]),
        rastr: {
            sirka: vysledek.rastr.sirka, vyska: vysledek.rastr.vyska,
            krok: vysledek.rastr.krok, minX: vysledek.rastr.minX, minY: vysledek.rastr.minY,
            bunky: Array.from(vysledek.rastr.bunky),
        },
    };

    const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;font:13px system-ui;background:#fff}
.panel{position:relative;padding:20px 6px 6px}
.popis{position:absolute;top:2px;left:8px;font-weight:600}
img{position:absolute;width:${vb[2] * k}px;height:${vb[3] * k}px;opacity:.28}
.ram{position:relative;width:${sirkaPanelu}px;height:${vyskaPanelu}px;overflow:hidden}
canvas{position:absolute;left:0;top:0}</style>
<div style="display:flex">
  <div class="panel"><div class="popis">1. kandidáti (${kandidati.length})</div>
    <div class="ram"><img src="${png}" style="left:${posunX}px;top:${posunY}px"><canvas id="c1" width="${sirkaPanelu}" height="${vyskaPanelu}"></canvas></div></div>
  <div class="panel"><div class="popis">2. přijaté stěny (${vysledek.steny.length})</div>
    <div class="ram"><img src="${png}" style="left:${posunX}px;top:${posunY}px"><canvas id="c2" width="${sirkaPanelu}" height="${vyskaPanelu}"></canvas></div></div>
  <div class="panel"><div class="popis">3. místnosti (${vysledek.mistnosti.length})</div>
    <div class="ram"><img src="${png}" style="left:${posunX}px;top:${posunY}px"><canvas id="c3" width="${sirkaPanelu}" height="${vyskaPanelu}"></canvas></div></div>
</div>
<script>
const d = ${JSON.stringify(data)};
const k = ${k}, px = ${posunX}, py = ${posunY};
const bod = (x, y) => [x * k + px, y * k + py];
function cary(ctx, pole, barva, sila) {
  for (const [x1, y1, x2, y2, tl] of pole) {
    ctx.strokeStyle = barva; ctx.lineWidth = sila ?? Math.max(1.5, tl * 9 * k);
    const a = bod(x1, y1), b = bod(x2, y2);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  }
}
const c1 = document.getElementById('c1').getContext('2d');
cary(c1, d.kandidati, 'rgba(0,90,220,.75)');
cary(c1, d.obvod, 'rgba(0,150,60,.95)');

const c2 = document.getElementById('c2').getContext('2d');
cary(c2, d.prijate, 'rgba(200,0,0,.9)');
cary(c2, d.obvod, 'rgba(0,150,60,.95)');

// místnosti z rastru (barevně)
const c3 = document.getElementById('c3').getContext('2d');
const r = d.rastr;
const stav = new Int32Array(r.sirka * r.vyska).fill(-1);
let cislo = 0;
const barvy = ['#ffadad','#ffd6a5','#fdffb6','#caffbf','#9bf6ff','#a0c4ff','#bdb2ff','#ffc6ff','#f1c0e8','#b9fbc0'];
for (let s = 0; s < r.bunky.length; s++) {
  if (r.bunky[s] !== 0 || stav[s] !== -1) continue;
  const fronta = [s]; stav[s] = cislo; const bunky = [];
  while (fronta.length) {
    const i = fronta.pop(); bunky.push(i);
    const x = i % r.sirka, y = (i / r.sirka) | 0;
    for (const n of [x > 0 ? i-1 : -1, x < r.sirka-1 ? i+1 : -1, y > 0 ? i-r.sirka : -1, y < r.vyska-1 ? i+r.sirka : -1]) {
      if (n < 0 || r.bunky[n] !== 0 || stav[n] !== -1) continue;
      stav[n] = cislo; fronta.push(n);
    }
  }
  if (bunky.length * (r.krok * k) * (r.krok * k) > 30) {
    c3.fillStyle = barvy[cislo % barvy.length];
    for (const i of bunky) {
      const x = i % r.sirka, y = (i / r.sirka) | 0;
      const a = bod(r.minX + x * r.krok, r.minY + y * r.krok);
      c3.fillRect(a[0], a[1], Math.ceil(r.krok * k) + 1, Math.ceil(r.krok * k) + 1);
    }
  }
  cislo++;
}
cary(c3, d.prijate, 'rgba(120,120,120,.9)');
cary(c3, d.obvod, 'rgba(0,120,50,.95)');
</script>`;

    const htmlSoubor = vystup.replace(/\.png$/, '.html');
    fs.writeFileSync(htmlSoubor, html);
    const p = await otevriProhlizec({ sirka: sirkaPanelu * 3 + 60, vyska: vyskaPanelu + 60 });
    try {
        await p.jdiNa('file:///' + path.resolve(htmlSoubor).replace(/\\/g, '/'));
        await pauza(1500);
        await p.snimek(vystup);
        console.log('náhled:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('SELHALO:', e.message); process.exit(1); });
