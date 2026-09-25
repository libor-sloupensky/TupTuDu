/**
 * Otvory (dveře, okna) NESMÍ přerušit zeď — zeď pod nimi pokračuje.
 *
 * Test hledá v hotové sadě stěn dvojice, které leží na jedné ose, mají
 * podobnou tloušťku a dělí je jen mezera velikosti otvoru. Každá taková
 * dvojice = zeď zbytečně useknutá v otvoru.
 *
 * Spuštění:
 *   node services/import-test/test-otvory.cjs <svg> [měřítko]
 */
const fs = require('fs');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');

const A = nactiAnalyzu();

/** Obálka domu místo obkreslení uživatelem (viz test-pasy.cjs). */
function odhadniObrys(usecky, mnb) {
    const vsechny = A.stenyZVyplni(usecky, { metryNaBod: mnb });
    const zv = vsechny.filter(o => o.tloustka >= 0.1 && Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * mnb >= 1.5);
    if (zv.length < 4) return null;
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
    return [[kvantil(px, .01), kvantil(py, .01)], [kvantil(px, .99), kvantil(py, .01)],
            [kvantil(px, .99), kvantil(py, .99)], [kvantil(px, .01), kvantil(py, .99)]];
}

/** Dvojice stěn na jedné ose, které dělí jen mezera velikosti otvoru. */
function najdiPreruseni(steny, mnb, maxMezeraM = 3.2) {
    const nalezy = [];
    for (let i = 0; i < steny.length; i++) {
        for (let j = i + 1; j < steny.length; j++) {
            const a = steny[i], b = steny[j];
            if (Math.abs(a.tloustka - b.tloustka) > 0.08) continue;

            let rozdil = Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
            if (rozdil > 3 * Math.PI / 180) continue;

            const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
            const L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;
            // musí ležet na téže ose (do poloviny tloušťky)
            const odsazeni = Math.max(
                Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny),
                Math.abs((b.x2 - a.x1) * nx + (b.y2 - a.y1) * ny));
            if (odsazeni > (a.tloustka / mnb) / 2) continue;

            const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / L;
            const bt1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
            const bt2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
            const mezera = bt1 > L ? bt1 - L : (bt2 < 0 ? -bt2 : 0);
            if (mezera <= 0 || mezera * mnb > maxMezeraM) continue;

            nalezy.push({ i, j, mezeraM: mezera * mnb, tl: a.tloustka });
        }
    }
    return nalezy;
}

const svgSoubor = process.argv[2];
const meritko = parseFloat(process.argv[3] || '50');
const mnb = 0.0003528 * meritko;
if (!svgSoubor || !fs.existsSync(svgSoubor)) { console.error('Zadejte cestu k SVG.'); process.exit(1); }

const svg = fs.readFileSync(svgSoubor, 'utf8');
const usecky = A.extrahujUsecky(svg);
const obrys = odhadniObrys(usecky, mnb);
if (!obrys) { console.error('obrys se nepodařilo odhadnout'); process.exit(1); }

const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys, maxVariant: 3 });
let celkem = 0;
for (const [n, v] of varianty.entries()) {
    const p = najdiPreruseni(v.osy, mnb);
    celkem += p.length;
    console.log(`${n + 1}. ${v.styl.slice(0, 34).padEnd(36)} stěn=${String(v.osy.length).padStart(3)}`
        + ` | přerušeno v otvoru: ${p.length}`
        + (p.length ? '  mezery: ' + p.map(x => x.mezeraM.toFixed(2) + ' m').join(', ') : ''));
}
console.log(celkem === 0 ? 'OK — žádná zeď neusekne v otvoru' : `CELKEM ${celkem} přerušení`);
