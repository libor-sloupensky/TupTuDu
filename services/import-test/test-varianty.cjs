/**
 * Ověření rozpoznávání stěn (fáze F3) na skutečných výkresech.
 *
 * Analýza běží v prohlížeči — stejně jako v aplikaci, včetně čtení inkoustu
 * z obrázku stránky. Výsledkem je mřížka náhledů: co která varianta našla.
 *
 * Spuštění:
 *   node services/import-test/test-varianty.cjs <svg> <png> <měřítko> [výstup.png]
 */
const fs = require('fs');
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

async function main() {
    const [svgSoubor, pngSoubor, meritkoArg, vystupArg] = process.argv.slice(2);
    if (!svgSoubor || !pngSoubor) {
        console.error('Zadejte: <svg> <png> <měřítko> [výstup.png]');
        process.exit(1);
    }
    const meritko = parseFloat(meritkoArg || '100');
    const metryNaBod = 0.0003528 * meritko;
    const vystup = vystupArg || svgSoubor.replace(/\.svg$/, '-varianty.png');

    const svg = fs.readFileSync(svgSoubor, 'utf8');
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const analyza = fs.readFileSync(path.join(__dirname, '../../public/js/koncept-v3/import-analyza.js'), 'utf8');

    const sirkaPanelu = 700;
    const meritkoPanelu = sirkaPanelu / vb[2];
    const vyskaPanelu = Math.round(vb[3] * meritkoPanelu);

    const html = `<!doctype html><meta charset="utf-8">
<style>body{margin:0;font:12px system-ui;background:#fff}
.mriz{display:grid;grid-template-columns:repeat(2,${sirkaPanelu}px)}
.panel{position:relative;padding:18px 4px 4px}
.popis{position:absolute;top:2px;left:6px;font-weight:600}
.podklad{position:absolute;width:${sirkaPanelu}px;height:${vyskaPanelu}px;opacity:.3}
canvas.kresba{position:relative}
#log{padding:6px;color:#b00;white-space:pre}</style>
<div id="mriz" class="mriz"></div><pre id="log"></pre>
<script src="/analyza.js"></script>
<script>
window.vysledek = null;
window.onerror = (m, s, l) => { document.getElementById('log').textContent += 'CHYBA: ' + m + ' @' + l + '\\n'; };

async function spust() {
  const svg = await (await fetch('/kresba.svg')).text();
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = '/kresba.png'; });

  // vzorkování inkoustu: obrázek stránky do canvasu, souřadnice v bodech PDF
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const pixely = ctx.getImageData(0, 0, c.width, c.height).data;
  const pxNaBod = c.width / ${vb[2]};
  const vzorekInkoustu = (x, y) => {
    const px = Math.round(x * pxNaBod), py = Math.round(y * pxNaBod);
    if (px < 0 || py < 0 || px >= c.width || py >= c.height) return null;
    const i = (py * c.width + px) * 4;
    return 1 - Math.min(pixely[i], pixely[i + 1], pixely[i + 2]) / 255;
  };

  const t0 = performance.now();
  const r = ImportAnalyza.navrhniVarianty(svg, { metryNaBod: ${metryNaBod}, maxVariant: 4, vzorekInkoustu });
  const cas = (performance.now() - t0) / 1000;

  const mriz = document.getElementById('mriz');
  r.varianty.forEach((v, i) => {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.innerHTML = '<div class="popis">' + (i + 1) + '. ' + v.styl.slice(0, 40) + ' · ' + v.osy.length
      + ' os · ' + v.delka.toFixed(0) + ' m · skóre ' + v.skore.toFixed(2) + '</div>'
      + '<img class="podklad" src="/kresba.png">';
    const plátno = document.createElement('canvas');
    plátno.className = 'kresba';
    plátno.width = ${sirkaPanelu}; plátno.height = ${vyskaPanelu};
    panel.appendChild(plátno);
    mriz.appendChild(panel);
    const g = plátno.getContext('2d');
    const m = ${meritkoPanelu};
    for (const o of v.osy) {
      g.strokeStyle = o.tloustka > 0.35 ? 'rgba(200,0,0,.95)' : (o.tloustka > 0.2 ? 'rgba(255,130,0,.95)' : 'rgba(0,120,255,.95)');
      g.lineWidth = Math.max(1.2, o.tloustka * 10 * m);
      g.beginPath(); g.moveTo(o.x1 * m, o.y1 * m); g.lineTo(o.x2 * m, o.y2 * m); g.stroke();
    }
  });

  window.vysledek = {
    cas, usecek: r.usecekCelkem,
    varianty: r.varianty.map(v => ({
      styl: v.styl, os: v.osy.length, syrovych: v.syrovych, delka: v.delka, skore: v.skore,
      napojenost: v.napojenost, typicke: v.typicke, pravouhle: v.pravouhle, plocha: v.plocha,
      tloustky: (() => { const h = new Map(); v.osy.forEach(o => { const k = Math.round(o.tloustka * 100 / 5) * 5; h.set(k, (h.get(k) || 0) + 1); });
        return [...h.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, b]) => a + 'cm×' + b).join(' '); })(),
    })),
  };
}
spust();
</script>`;

    // malý statický server (soubory musí být ze stejného původu kvůli čtení pixelů)
    const http = require('http');
    const server = http.createServer((req, res) => {
        const cesta = req.url.split('?')[0];
        const posli = (typ, data) => { res.writeHead(200, { 'Content-Type': typ }); res.end(data); };
        if (cesta === '/') return posli('text/html; charset=utf-8', html);
        if (cesta === '/analyza.js') return posli('application/javascript; charset=utf-8', analyza);
        if (cesta === '/kresba.svg') return posli('image/svg+xml', svg);
        if (cesta === '/kresba.png') return posli('image/png', fs.readFileSync(pngSoubor));
        res.writeHead(404); res.end();
    });
    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const p = await otevriProhlizec({ sirka: sirkaPanelu * 2 + 30, vyska: vyskaPanelu * 2 + 80 });
    try {
        await p.jdiNa(`http://127.0.0.1:${port}/`);
        await p.cekej('!!window.vysledek', 180000, 'dokončení analýzy');
        const v = await p.vyhodnot('JSON.parse(JSON.stringify(window.vysledek))');

        console.log(`úseček: ${v.usecek}, variant: ${v.varianty.length}, čas: ${v.cas.toFixed(1)} s`);
        v.varianty.forEach((x, i) => {
            console.log(`  ${i + 1}. ${x.styl.slice(0, 38).padEnd(40)} os=${String(x.os).padStart(4)}`
                + ` (syrových ${String(x.syrovych).padStart(4)}) délka=${x.delka.toFixed(0).padStart(4)}m`
                + ` napoj=${(x.napojenost * 100).toFixed(0).padStart(3)}% typ.tl=${(x.typicke * 100).toFixed(0).padStart(3)}%`
                + ` skóre=${x.skore.toFixed(3)} | ${x.tloustky}`);
        });

        const chyby = await p.vyhodnot('document.getElementById("log").textContent');
        if (chyby.trim()) console.log('CHYBY:\n' + chyby);

        await pauza(500);
        await p.snimek(vystup);
        console.log('náhled:', vystup);
    } finally {
        await p.zavri();
        server.close();
    }
}

main().catch(e => { console.error('SELHALO:', e.message); process.exit(1); });
