/**
 * Masky potahu pro přebarvení kusů (modules/katalog.md, Přebarvování). Pro každý kus vybraných kategorií spočítá,
 * které texely textury patří hlavní ploše, a stejnou masku pohledem shora pro značku v půdorysu. Do katalog.json
 * zapíše `maska: [L, a, b]`, medián barvy potahu. Kus, kde maska pokrývá málo, barvy nedostane.
 *
 * Spuštění: node services/katalog/masky.cjs [--kat=pohovky,kresla,zidle] [--jen=regex]
 * Potom: node services/katalog/s3.cjs nahraj
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { otevriProhlizec } = require('../import-test/prohlizec.cjs');

os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
const volby = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const PUBLIC = path.resolve(__dirname, '../../public');
const KATALOG = path.join(PUBLIC, 'katalog');
// Postele ne: největší plochou jsou lůžkoviny, přebarvila by se matrace místo čalounění
const KATEGORIE = (volby.kat || 'pohovky,kresla,zidle').split(',');
const PODIL = 0.3;   // maska musí krýt aspoň třetinu povrchu
const OBNOVA = 20;
const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp' };

function server() {
    return new Promise((ok) => {
        const s = http.createServer((q, r) => {
            const u = decodeURIComponent(q.url.split('?')[0]);
            const f = u === '/nahled.html' ? path.join(__dirname, 'nahled.html') : path.join(PUBLIC, u);
            if (!f.startsWith(PUBLIC) && !f.startsWith(__dirname)) { r.writeHead(403); return r.end(); }
            if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
            r.writeHead(200, { 'Content-Type': TYPY[path.extname(f)] || 'application/octet-stream' });
            fs.createReadStream(f).pipe(r);
        });
        s.listen(0, '127.0.0.1', () => ok(s));
    });
}

(async () => {
    const soubor = path.join(KATALOG, 'katalog.json');
    const katalog = JSON.parse(fs.readFileSync(soubor, 'utf8'));
    const filtr = volby.jen ? new RegExp(volby.jen) : null;
    const vyber = katalog.polozky.filter(p => KATEGORIE.includes(p.kategorie) && (!filtr || filtr.test(p.id)));
    for (const slozka of ['masky', 'masky-pudorys']) fs.mkdirSync(path.join(KATALOG, slozka), { recursive: true });
    console.log(`Masky pro ${vyber.length} kusů`);
    const srv = await server();
    const p = await otevriProhlizec({ sirka: 900, vyska: 700 });
    const url = `http://127.0.0.1:${srv.address().port}/nahled.html`;
    let hotovo = 0, bez = 0, odObnovy = OBNOVA;
    try {
        for (const pol of vyber) {
            if (odObnovy++ >= OBNOVA) {
                odObnovy = 1;
                await p.jdiNa(url + '?o=' + hotovo);
                await p.cekej('typeof window.maska==="function"', 30000, 'stránka');
            }
            await p.vyhodnot(`(window.maska(${JSON.stringify(pol.id)}), 1)`);
            await p.cekej('window.hotovo===true', 120000, pol.id);
            const v = JSON.parse(await p.vyhodnot('JSON.stringify(window.vysledek)'));
            const ok = !v.chyba && !v.bez && v.podil >= PODIL;
            if (ok) {
                fs.writeFileSync(path.join(KATALOG, 'masky', pol.id + '.webp'), Buffer.from(v.maska.split(',')[1], 'base64'));
                fs.writeFileSync(path.join(KATALOG, 'masky-pudorys', pol.id + '.webp'), Buffer.from(v.maskaZnacky.split(',')[1], 'base64'));
                pol.maska = v.lab;
            } else {
                delete pol.maska;
                bez++;
                for (const slozka of ['masky', 'masky-pudorys']) fs.rmSync(path.join(KATALOG, slozka, pol.id + '.webp'), { force: true });
            }
            console.log(`  ${++hotovo}/${vyber.length} ${pol.id} ${ok ? 'potah ' + Math.round(v.podil * 100) + ' %, Lab ' + v.lab.join(' ') : 'bez barev: ' + (v.chyba || v.bez || 'potah ' + Math.round(v.podil * 100) + ' %').slice(0, 120)}`);
            if (hotovo % OBNOVA === 0) fs.writeFileSync(soubor, JSON.stringify(katalog, null, 1));
        }
    } finally {
        fs.writeFileSync(soubor, JSON.stringify(katalog, null, 1));
        await p.zavri();
        srv.close();
    }
    console.log(`\nHotovo: ${hotovo - bez} kusů s barvami, ${bez} bez`);
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
