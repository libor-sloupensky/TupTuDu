/**
 * Výroba katalogu objektů: stáhne modely podle polozky.json, zmenší je pro web, změří, udělá náhled
 * a půdorysnou značku a zapíše public/katalog/katalog.json. Viz modules/katalog.md.
 *
 * Spuštění: node services/katalog/sestav.cjs [--cache=složka] [--znovu] [--starsi=datum] [--nahledy] [--jen=regex] [--vlaken=4]
 * Hotové modely se přeskakují, --znovu je udělá znovu, --nahledy překreslí jen náhledy a značky. --starsi udělá znovu jen
 * modely starší než datum a náhledy starší než model, takže přerušená výroba naváže. Vyžaduje Chrome a npx.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { execFile } = require('child_process');
const { otevriProhlizec } = require('../import-test/prohlizec.cjs');

const volby = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const KOREN = path.resolve(__dirname, '../..');
const PUBLIC = path.join(KOREN, 'public');
const VYSTUP = path.join(PUBLIC, 'katalog');
const CACHE = volby.cache || path.join(os.tmpdir(), 'tuptudu-katalog');
const TRANSFORM = volby.transform || null;
const VLAKEN = Number(volby.vlaken) || 4;
const STARSI = volby.starsi ? new Date(volby.starsi) : null;
const OBNOVA = 20;
const MAX_TROJUHELNIKU = 60000;
const UA = { 'User-Agent': 'TupTuDu-katalog/1.0' };

// Výroba běží hodiny na notebooku, na kterém se dál pracuje. Prioritu zdědí i Chrome a komprese.
os.setPriority(os.constants.priority.PRIORITY_BELOW_NORMAL);
const ABO = 'https://amazon-berkeley-objects.s3.amazonaws.com/3dmodels/original';

const ZDROJE = {
    abo: { nazev: 'Amazon Berkeley Objects', autor: 'Amazon.com', licence: 'CC BY 4.0', odkaz: 'https://amazon-berkeley-objects.s3.amazonaws.com/index.html', licenceOdkaz: 'https://creativecommons.org/licenses/by/4.0/', upraveno: true },
    polyhaven: { nazev: 'Poly Haven', autor: 'Poly Haven', licence: 'CC0', odkaz: 'https://polyhaven.com/models', licenceOdkaz: 'https://creativecommons.org/publicdomain/zero/1.0/', upraveno: true },
};

async function stahni(url, cil) {
    if (fs.existsSync(cil) && fs.statSync(cil).size > 0) return;
    fs.mkdirSync(path.dirname(cil), { recursive: true });
    const r = await fetch(url, { headers: UA });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    fs.writeFileSync(cil, Buffer.from(await r.arrayBuffer()));
}

async function zdrojovySoubor(p) {
    if (p.zdroj === 'abo') {
        const cil = path.join(CACHE, 'abo', p.orig + '.glb');
        await stahni(`${ABO}/${p.orig.slice(-1)}/${p.orig}.glb`, cil);
        return cil;
    }
    const j = await (await fetch('https://api.polyhaven.com/files/' + p.orig, { headers: UA })).json();
    const g = j.gltf['1k'].gltf;
    const slozka = path.join(CACHE, 'polyhaven', p.orig);
    await stahni(g.url, path.join(slozka, path.basename(g.url)));
    for (const [rel, inf] of Object.entries(g.include || {})) await stahni(inf.url, path.join(slozka, rel));
    return path.join(slozka, path.basename(g.url));
}

const spust = (prikaz, argumenty) => new Promise((ok, chyba) => {
    execFile(prikaz, argumenty, { maxBuffer: 1 << 24, shell: process.platform === 'win32' }, (e, _o, err) => (e ? chyba(new Error(String(err || e.message).slice(0, 400))) : ok()));
});

const trojuhelniku = (soubor) => {
    const b = fs.readFileSync(soubor);
    const j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString('utf8'));
    let n = 0;
    for (const m of j.meshes || []) for (const p of m.primitives) n += j.accessors[p.indices ?? p.attributes.POSITION].count / 3;
    return n;
};

// Bez zjednodušení: bere modelům zkosené hrany a stínování se pak rozlévá přes celou plochu, bílá skříň vypadá jako z chromu.
// Paměť prohlížeče dělají hlavně textury: 1024 px bralo 32 MB na kus a 40 kusů shodilo notebook, 512 px bere 10 MB a zblízka vypadá skoro stejně.
// Jen extrémně husté kusy se zjednoduší, nejdřív mírně. Šest jídelních židlí po 170 tisících by grafiku zadusilo.
async function zmensi(vstup, vystup) {
    fs.mkdirSync(path.dirname(vystup), { recursive: true });
    const q = (s) => (process.platform === 'win32' ? `"${s}"` : s);
    const optimalizuj = (zjednoduseni) => {
        const a = ['optimize', q(vstup), q(vystup), '--compress', 'meshopt', '--texture-compress', 'webp', '--texture-size', '512', '--instance', 'false', ...zjednoduseni];
        return TRANSFORM ? spust(q(TRANSFORM), a) : spust('npx', ['--yes', '@gltf-transform/cli@4', ...a]);
    };
    await optimalizuj(['--simplify', 'false']);
    for (const presnost of ['0.0001', '0.001']) {
        if (trojuhelniku(vystup) > MAX_TROJUHELNIKU) await optimalizuj(['--simplify', 'true', '--simplify-error', presnost]);
    }
}

async function poVlaknech(polozky, n, prace) {
    let i = 0;
    await Promise.all(Array.from({ length: n }, async () => {
        while (i < polozky.length) { const p = polozky[i++]; await prace(p); }
    }));
}

const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png' };
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
    const zadani = JSON.parse(fs.readFileSync(path.join(__dirname, 'polozky.json'), 'utf8'));
    const filtr = volby.jen ? new RegExp(volby.jen) : null;
    const vyber = zadani.polozky.filter(p => !filtr || filtr.test(p.id));
    const cesta = (slozka, p, pripona) => path.join(VYSTUP, slozka, p.id + pripona);

    console.log(`Zmenšuji ${vyber.length} modelů, ${VLAKEN} vlákna`);
    const chyby = [];
    let hotovo = 0;
    await poVlaknech(vyber, VLAKEN, async (p) => {
        const cil = cesta('modely', p, '.glb');
        try {
            if (volby.znovu || !fs.existsSync(cil) || (STARSI && fs.statSync(cil).mtime < STARSI)) await zmensi(await zdrojovySoubor(p), cil);
            console.log(`  ${++hotovo}/${vyber.length} ${p.id} ${(fs.statSync(cil).size / 1e6).toFixed(2)} MB`);
        } catch (e) { chyby.push(p.id + ': ' + e.message); console.log('  CHYBA', p.id, e.message); }
    });

    const predchozi = fs.existsSync(path.join(VYSTUP, 'katalog.json')) ? JSON.parse(fs.readFileSync(path.join(VYSTUP, 'katalog.json'), 'utf8')) : { polozky: [] };
    const stare = new Map(predchozi.polozky.map(p => [p.id, p]));
    const vysledky = new Map();
    // Do katalogu jde všechno, co má hotové soubory, pořadí podle zadání
    const zapisKatalog = () => {
        const polozky = [];
        for (const pol of zadani.polozky) {
            if (!fs.existsSync(cesta('modely', pol, '.glb'))) continue;
            const r = vysledky.get(pol.id) || stare.get(pol.id);
            if (!r) continue;
            polozky.push({ id: pol.id, nazev: pol.nazev, kategorie: pol.kategorie, zdroj: pol.zdroj, orig: pol.orig, sirka: r.sirka, hloubka: r.hloubka, vyska: r.vyska, uroven: pol.uroven ?? 0, plosek: r.plosek });
        }
        fs.writeFileSync(path.join(VYSTUP, 'katalog.json'), JSON.stringify({ verze: 1, zdroje: ZDROJE, kategorie: zadani.kategorie, polozky }, null, 1));
        return polozky;
    };
    const nahledPlati = (pol) => {
        const nahled = cesta('nahledy', pol, '.webp'), znacka = cesta('pudorys', pol, '.webp');
        if (!fs.existsSync(nahled) || !fs.existsSync(znacka)) return false;
        return !STARSI || fs.statSync(nahled).mtime >= fs.statSync(cesta('modely', pol, '.glb')).mtime;
    };
    const srv = await server();
    const p = await otevriProhlizec({ sirka: 900, vyska: 700 });
    // Stránka si načtené modely drží (Katalog3d), proto se po pár kusech obnoví, jinak by při stovkách došla paměť.
    // Průběžný zápis katalogu: po pádu se hotové náhledy nepočítají znovu.
    let obnov = 0, odObnovy = 0;
    const obnovStranku = async () => {
        odObnovy = 0;
        await p.jdiNa(`http://127.0.0.1:${srv.address().port}/nahled.html?obnova=${++obnov}`);
        await p.cekej('typeof window.vyrob==="function"', 30000, 'stránka náhledů');
    };
    let polozky = [];
    try {
        await obnovStranku();
        for (const pol of vyber) {
            if (!fs.existsSync(cesta('modely', pol, '.glb'))) continue;
            if (!volby.znovu && !volby.nahledy && stare.has(pol.id) && nahledPlati(pol)) continue;
            if (odObnovy++ >= OBNOVA) { zapisKatalog(); await obnovStranku(); }
            let v;
            try {
                await p.vyhodnot(`(window.vyrob(${JSON.stringify(pol.id)}), 1)`);
                await p.cekej('window.hotovo===true', 120000, pol.id);
                v = JSON.parse(await p.vyhodnot('JSON.stringify(window.vysledek)'));
            } catch (e) { v = { chyba: e.message }; await obnovStranku(); }
            if (v.chyba) { chyby.push(pol.id + ': ' + v.chyba.slice(0, 300)); console.log('  CHYBA', pol.id, v.chyba.slice(0, 200)); continue; }
            for (const [slozka, data, pripona] of [['nahledy', v.nahled, '.webp'], ['pudorys', v.znacka, '.webp']]) {
                fs.mkdirSync(path.join(VYSTUP, slozka), { recursive: true });
                fs.writeFileSync(cesta(slozka, pol, pripona), Buffer.from(data.split(',')[1], 'base64'));
            }
            vysledky.set(pol.id, { sirka: v.sirka, hloubka: v.hloubka, vyska: v.vyska, plosek: v.plosek });
            console.log(`  náhled ${pol.id} ${v.sirka}×${v.hloubka}×${v.vyska} m, ${v.plosek} plošek`);
        }
    } finally {
        polozky = zapisKatalog();
        await p.zavri();
        srv.close();
    }

    const velikost = polozky.reduce((s, x) => s + fs.statSync(cesta('modely', x, '.glb')).size, 0);
    console.log(`\nKatalog: ${polozky.length} kusů, modely ${(velikost / 1e6).toFixed(1)} MB`);
    if (chyby.length) { console.log('Chyby:\n' + chyby.join('\n')); process.exit(1); }
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
