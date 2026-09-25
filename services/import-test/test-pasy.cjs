/**
 * Diagnostika stěn jako PÁSŮ (2D objektů) — ukáže překryvy, rohy a úhly.
 *
 * Každá stěna se kreslí poloprůhledným pásem své tloušťky: kde se pásy
 * překrývají, je barva sytější — tam se stěny kupí na sebe.
 *
 * Spuštění:
 *   node services/import-test/test-pasy.cjs <svg> <png> <měřítko> [výstup.png]
 */
const fs = require('fs');
const path = require('path');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const A = nactiAnalyzu();

/** Náhrada obkreslení uživatelem — obálka stěn z vyplněných ploch. */
function odhadniObrys(usecky, mnb) {
    const vsechny = A.stenyZVyplni(usecky, { metryNaBod: mnb });
    // jen nosné tloušťky — pruhy ve výpisu překladů a v legendě jsou tenké
    const zv = vsechny.filter(o => o.tloustka >= 0.1 && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * mnb >= 1.5);
    if (zv.length < 4) return null;

    // Kvantil vážený délkou — legenda a výpis překladů vpravo jsou taky
    // vyplněné tvary, ale krátké, takže obálku neroztáhnou.
    const kvantil = (vyber, q) => {
        const body = [];
        for (const o of zv) {
            const delka = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
            body.push({ v: vyber(o, 1), delka }, { v: vyber(o, 2), delka });
        }
        body.sort((a, b) => a.v - b.v);
        const celkem = body.reduce((s, b) => s + b.delka, 0);
        let bezi = 0;
        for (const b of body) { bezi += b.delka; if (bezi >= celkem * q) return b.v; }
        return body[body.length - 1].v;
    };
    const px = (o, i) => i === 1 ? o.x1 : o.x2;
    const py = (o, i) => i === 1 ? o.y1 : o.y2;
    const x1 = kvantil(px, 0.01), x2 = kvantil(px, 0.99);
    const y1 = kvantil(py, 0.01), y2 = kvantil(py, 0.99);
    return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
}

/** Kolik procent délky stěn leží v překryvu s jinou stěnou. */
function merPrekryvy(steny, mnb) {
    let prekryvajicich = 0;
    for (let i = 0; i < steny.length; i++) {
        const a = steny[i];
        const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        let prekryv = false;

        for (let j = 0; j < steny.length && !prekryv; j++) {
            if (i === j) continue;
            const b = steny[j];
            let uhel = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (uhel > Math.PI / 2) uhel = Math.PI - uhel;
            if (uhel > 10 * Math.PI / 180) continue;           // kolmé stěny se křížit smí

            const odchylka = Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny) * mnb;
            if (odchylka > (a.tloustka + b.tloustka) / 2) continue;

            const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / (L * L);
            const t1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
            const t2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
            if (Math.min(t2, 1) - Math.max(t1, 0) > 0.15) prekryv = true;
        }
        if (prekryv) prekryvajicich++;
    }
    return prekryvajicich;
}

/** Kolik stěn má oba líce na skutečné čáře výkresu (do 3 cm). */
function merLice(steny, usecky, mnb) {
    const tolerance = 0.03 / mnb;
    const cary = usecky.filter(u => Math.hypot(u.x2 - u.x1, u.y2 - u.y1) * mnb > 0.3);
    let obaLice = 0, jedenLic = 0;

    for (const s of steny) {
        const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
        const L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        const polovina = (s.tloustka / mnb) / 2;

        const sedi = (odsazeni) => cary.some(c => {
            let rozdil = Math.abs(Math.atan2(c.y2 - c.y1, c.x2 - c.x1) - Math.atan2(dy, dx)) % Math.PI;
            if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
            if (rozdil > 3 * Math.PI / 180) return false;
            if (Math.abs((c.x1 - s.x1) * nx + (c.y1 - s.y1) * ny - odsazeni) > tolerance) return false;
            const t = (px, py) => ((px - s.x1) * dx + (py - s.y1) * dy) / (L * L);
            const t1 = Math.min(t(c.x1, c.y1), t(c.x2, c.y2));
            const t2 = Math.max(t(c.x1, c.y1), t(c.x2, c.y2));
            return Math.min(t2, 1) - Math.max(t1, 0) > 0.4;
        });

        const a = sedi(polovina), b = sedi(-polovina);
        if (a && b) obaLice++;
        else if (a || b) jedenLic++;
    }
    return { obaLice, jedenLic };
}

/** Odchylky od pravoúhlé soustavy. */
function merUhly(steny) {
    const zaklad = A.narovnej(steny, 0).length ? null : null;    // jen kvůli přehlednosti
    const uhly = steny.map(o => ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI) % 90 + 90) % 90);
    const odchylky = uhly.map(u => Math.min(u, 90 - u));
    const krive = odchylky.filter(o => o > 0.5).length;
    const nejhorsi = Math.max(...odchylky, 0);
    return { krive, nejhorsi };
}

async function main() {
    const [svgSoubor, pngSoubor, meritkoArg, popisArg, vystupArg] = process.argv.slice(2);
    const meritko = parseFloat(meritkoArg || '50');
    const mnb = 0.0003528 * meritko;
    const vystup = vystupArg || svgSoubor.replace(/\.svg$/, '-pasy.png');

    const svg = fs.readFileSync(svgSoubor, 'utf8');
    const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
    const usecky = A.extrahujUsecky(svg);

    // 4. argument = popisný JSON nahraného výkresu → vezme se SKUTEČNÝ obrys
    // a měřítko od uživatele místo odhadu (odhad měří něco jiného, než co vidí)
    let obrys = null, mnbSkut = mnb;
    if (popisArg && fs.existsSync(popisArg)) {
        const popis = JSON.parse(fs.readFileSync(popisArg, 'utf8'));
        const st = popis.strany[Object.keys(popis.strany)[0]];
        const [k1, k2] = st.kalibBody;
        mnbSkut = (st.kalibMm / 1000) / Math.hypot(k2[0] - k1[0], k2[1] - k1[1]);
        obrys = st.obrys;
        console.log(`obrys a měřítko z ${popis.nazev} (1:${Math.round(mnbSkut / 0.0003528)})`);
    } else {
        obrys = odhadniObrys(usecky, mnb);
    }
    if (!obrys) { console.error('obrys se nepodařilo odhadnout'); process.exit(1); }

    const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnbSkut, obrys, maxVariant: 1 });
    if (!varianty.length) { console.error('žádná varianta'); process.exit(1); }

    varianty.forEach((v, i) => {
        const p = merPrekryvy(v.osy, mnbSkut);
        const u = merUhly(v.osy);
        const l = merLice(v.osy, usecky, mnbSkut);
        console.log(`${i + 1}. ${v.styl.slice(0, 34).padEnd(36)} stěn=${String(v.osy.length).padStart(3)}`
            + ` délka=${v.delka.toFixed(0).padStart(3)}m | překrývá se ${p} stěn`
            + ` | mimo pravý úhel ${u.krive} (max ${u.nejhorsi.toFixed(1)}°)`
            + ` | líce na čáře: oba ${l.obaLice}, jeden ${l.jedenLic}`);
    });

    // obrázek: stěny jako poloprůhledné pásy
    const sirka = 1200;
    const xs = obrys.map(b => b[0]), ys = obrys.map(b => b[1]);
    const okraj = 30;
    const oblast = {
        x: Math.min(...xs) - okraj, y: Math.min(...ys) - okraj,
        sirka: Math.max(...xs) - Math.min(...xs) + okraj * 2,
        vyska: Math.max(...ys) - Math.min(...ys) + okraj * 2,
    };
    const k = sirka / oblast.sirka;
    const vyska = Math.round(oblast.vyska * k);
    const png = 'data:image/png;base64,' + fs.readFileSync(pngSoubor).toString('base64');

    const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;font:13px system-ui}.p{position:relative;padding:20px 4px 4px}
.t{position:absolute;top:2px;left:8px;font-weight:600}
.r{position:relative;width:${sirka}px;height:${vyska}px;overflow:hidden}
img{position:absolute;opacity:.35;width:${vb[2] * k}px;height:${vb[3] * k}px;left:${-oblast.x * k}px;top:${-oblast.y * k}px}
canvas{position:absolute;left:0;top:0}</style>
${varianty.map((v, i) => `<div class="p"><div class="t">${i + 1}. ${v.styl} — ${v.osy.length} stěn</div>
<div class="r"><img src="${png}"><canvas id="c${i}" width="${sirka}" height="${vyska}"></canvas></div></div>`).join('')}
<script>
const d = ${JSON.stringify(varianty.map(v => v.osy.map(o => [o.x1, o.y1, o.x2, o.y2, o.tloustka, o.obvodova ? 1 : 0])))};
const k = ${k}, ox = ${oblast.x}, oy = ${oblast.y}, mnb = ${mnbSkut};
d.forEach((osy, i) => {
  const g = document.getElementById('c' + i).getContext('2d');
  g.globalCompositeOperation = 'multiply';
  for (const [x1, y1, x2, y2, tl, obvod] of osy) {
    g.strokeStyle = obvod ? 'rgba(0,150,60,.45)' : 'rgba(210,0,0,.45)';
    g.lineWidth = (tl / mnb) * k;           // skutečná tloušťka
    g.beginPath();
    g.moveTo((x1 - ox) * k, (y1 - oy) * k);
    g.lineTo((x2 - ox) * k, (y2 - oy) * k);
    g.stroke();
  }
});
</script>`;

    const htmlSoubor = vystup.replace(/\.png$/, '.html');
    fs.writeFileSync(htmlSoubor, html);
    const p = await otevriProhlizec({ sirka: sirka + 40, vyska: vyska * varianty.length + 80 });
    try {
        await p.jdiNa('file:///' + path.resolve(htmlSoubor).split('\\').join('/'));
        await pauza(1500);
        await p.snimek(vystup);
        console.log('náhled:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('SELHALO:', e.message); process.exit(1); });
