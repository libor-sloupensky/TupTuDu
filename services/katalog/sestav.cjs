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
    // Koupelna a WC ze Sweet Home 3D (Libor 11. 11. 2026). Jen sady CC0 a CC BY, ne Contributions a další pod Free Art License.
    // Blend Swap má u každého kusu jiného autora: dílo, autor a odkaz jsou u kusu v polozky.json a stránka autorů je vypíše.
    'bs-cc0': { nazev: 'Sweet Home 3D – Blend Swap CC0', autor: 'Blend Swap', licence: 'CC0', odkaz: 'https://www.sweethome3d.com/freeModels.jsp', licenceOdkaz: 'https://creativecommons.org/publicdomain/zero/1.0/', upraveno: true },
    'bs-ccby': { nazev: 'Sweet Home 3D – Blend Swap CC BY', autor: 'Blend Swap', licence: 'CC BY 3.0', odkaz: 'https://www.sweethome3d.com/freeModels.jsp', licenceOdkaz: 'https://creativecommons.org/licenses/by/3.0/', upraveno: true },
    scopia: { nazev: 'Sweet Home 3D – Scopia', autor: 'Space Mushrooms, Scopia Visual Interfaces Systems, s.l. (scopia.es)', licence: 'CC BY 3.0', odkaz: 'https://www.sweethome3d.com/freeModels.jsp', licenceOdkaz: 'https://creativecommons.org/licenses/by/3.0/', upraveno: true },
};
const SH3D = new Set(['bs-cc0', 'bs-ccby', 'scopia']);
const SH3D_URL = 'https://www.sweethome3d.com/wp-content/themes/sweet-home-3d/theme/assets/models';
const sh3dGlb = (p) => path.join(CACHE, 'sh3d', p.orig + '.glb');
// Vlastní kusy z generátoru (generuj.html): sprchové kouty, závěsné WC a bidet. Autor je TupTuDu, na stránku autorů nejdou,
// proto zdroj 'tuptudu' v ZDROJE není. orig = klíč kusu v generátoru, parametry = rozměry. Cache podle id, parametry se liší.
const vlastniGlb = (p) => path.join(CACHE, 'tuptudu', p.id + '.glb');

async function stahni(url, cil, hlavicky = UA) {
    if (fs.existsSync(cil) && fs.statSync(cil).size > 0) return;
    fs.mkdirSync(path.dirname(cil), { recursive: true });
    const r = await fetch(url, { headers: hlavicky });
    if (!r.ok) throw new Error(r.status + ' ' + url);
    fs.writeFileSync(cil, Buffer.from(await r.arrayBuffer()));
}

async function zdrojovySoubor(p) {
    // Kus ze Sweet Home 3D převedl do GLB už pripravSh3d
    if (p.zdroj === 'tuptudu') {
        if (!fs.existsSync(vlastniGlb(p))) throw new Error('chybí vygenerovaný model ' + vlastniGlb(p));
        return vlastniGlb(p);
    }
    if (SH3D.has(p.zdroj)) {
        if (!fs.existsSync(sh3dGlb(p))) throw new Error('chybí převedený model ' + sh3dGlb(p));
        return sh3dGlb(p);
    }
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

const TYPY = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.obj': 'text/plain', '.mtl': 'text/plain' };

/**
 * Kusy ze Sweet Home 3D: stáhne zip kusu, rozbalí ho a v prohlížeči převede OBJ + MTL na GLB v metrech s našimi
 * materiály (prevod.html). Výsledek zůstane v cache, dál jde stejnou cestou jako ostatní modely.
 */
/** Vlastní kusy: generuj.html je sestaví z parametrů v zadání. Generátor se mění častěji než zdroj, --znovu je vždy přegeneruje. */
async function pripravVlastni(polozky, port) {
    const k = polozky.filter(p => p.zdroj === 'tuptudu' && (volby.znovu || !fs.existsSync(vlastniGlb(p))));
    if (!k.length) return;
    console.log(`Generuji ${k.length} vlastních kusů`);
    fs.mkdirSync(path.join(CACHE, 'tuptudu'), { recursive: true });
    const prohl = await otevriProhlizec({ sirka: 400, vyska: 300 });
    try {
        await prohl.jdiNa(`http://127.0.0.1:${port}/generuj.html`);
        await prohl.cekej('typeof window.generuj==="function"', 30000, 'generátor');
        for (const p of k) {
            await prohl.vyhodnot(`(window.generuj(${JSON.stringify(p.orig)}, ${JSON.stringify(p.parametry || {})}), 1)`);
            await prohl.cekej('window.hotovo===true', 60000, p.id);
            const v = JSON.parse(await prohl.vyhodnot('JSON.stringify(window.vysledek)'));
            if (v.chyba) { console.log('  CHYBA generátoru', p.id, v.chyba.slice(0, 300)); continue; }
            fs.writeFileSync(vlastniGlb(p), Buffer.from(v.glb, 'base64'));
            console.log(`  ${p.id} ${v.rozmery.join(' × ')} m`);
        }
    } finally { await prohl.zavri(); }
}

async function pripravSh3d(polozky, port) {
    const k = polozky.filter(p => SH3D.has(p.zdroj) && (volby.znovu || !fs.existsSync(sh3dGlb(p))));
    if (!k.length) return;
    console.log(`Převádím ${k.length} kusů ze Sweet Home 3D`);
    const q = (s) => (process.platform === 'win32' ? `"${s}"` : s);
    const prohl = await otevriProhlizec({ sirka: 400, vyska: 300 });
    try {
        await prohl.jdiNa(`http://127.0.0.1:${port}/prevod.html`);
        await prohl.cekej('typeof window.preved==="function"', 30000, 'převodní stránka');
        for (const p of k) try {
            const slozka = path.join(CACHE, 'sh3d', p.orig);
            await stahni(`${SH3D_URL}/${p.orig}.zip`, slozka + '.zip', { 'User-Agent': 'Wget/1.21' });
            if (!fs.existsSync(slozka)) {
                fs.mkdirSync(slozka, { recursive: true });
                // Windows: systémový tar (bsdtar) umí zip, tar z Gitu ne
                if (process.platform === 'win32') await spust(q(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe')), ['-xf', q(slozka + '.zip'), '-C', q(slozka)]);
                else await spust('unzip', ['-o', '-q', slozka + '.zip', '-d', slozka]);
            }
            const soubory = fs.readdirSync(slozka, { recursive: true }).map(String);
            const obj = soubory.find(s => s.toLowerCase().endsWith('.obj'));
            if (!obj) throw new Error('v zipu není OBJ: ' + p.orig);
            const objCesta = path.join(slozka, obj);
            const mtl = (fs.readFileSync(objCesta, 'utf8').match(/^mtllib\s+(.+)$/m) || [])[1]?.trim() || null;
            const url = '/sh3d/' + path.relative(path.join(CACHE, 'sh3d'), path.dirname(objCesta)).split(path.sep).map(encodeURIComponent).join('/');
            await prohl.vyhodnot(`(window.preved(${JSON.stringify(url)}, ${JSON.stringify(path.basename(obj))}, ${JSON.stringify(mtl)}, ${JSON.stringify({ otoc: p.otoc || 0, materialy: p.materialy || null })}), 1)`);
            await prohl.cekej('window.hotovo===true', 120000, p.id);
            const v = JSON.parse(await prohl.vyhodnot('JSON.stringify(window.vysledek)'));
            if (v.chyba) throw new Error(p.id + ': ' + v.chyba.slice(0, 300));
            fs.writeFileSync(sh3dGlb(p), Buffer.from(v.glb, 'base64'));
            console.log(`  ${p.id} ${v.rozmery.join(' × ')} m, materiály ${JSON.stringify(v.materialy)}${v.bezObrazku.length ? ', bez textury ' + v.bezObrazku.join(', ') : ''}`);
        } catch (e) {
            // Chyba jednoho kusu nezastaví dávku, kus bez modelu pak nahlásí zmenšení
            console.log('  CHYBA převodu', p.id, String(e.message).slice(0, 300));
            await prohl.jdiNa(`http://127.0.0.1:${port}/prevod.html`);
            await prohl.cekej('typeof window.preved==="function"', 30000, 'převodní stránka');
        }
    } finally { await prohl.zavri(); }
}
function server() {
    return new Promise((ok) => {
        const s = http.createServer((q, r) => {
            const u = decodeURIComponent(q.url.split('?')[0]);
            const f = u === '/nahled.html' || u === '/prevod.html' || u === '/generuj.html' ? path.join(__dirname, u)
                : u.startsWith('/three-ex/') ? path.join(__dirname, 'three', u.slice(10))
                : u.startsWith('/sh3d/') ? path.join(CACHE, 'sh3d', u.slice(6))
                : path.join(PUBLIC, u);
            if (!f.startsWith(PUBLIC) && !f.startsWith(__dirname) && !f.startsWith(path.join(CACHE, 'sh3d'))) { r.writeHead(403); return r.end(); }
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

    const srv = await server();
    await pripravSh3d(vyber, srv.address().port);
    await pripravVlastni(vyber, srv.address().port);
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
            polozky.push({ id: pol.id, nazev: pol.nazev, kategorie: pol.kategorie, zdroj: pol.zdroj, orig: pol.orig, sirka: r.sirka, hloubka: r.hloubka, vyska: r.vyska, uroven: pol.uroven ?? 0, plosek: r.plosek, ...(pol.autor ? { autor: pol.autor, dilo: pol.dilo, odkaz: pol.odkaz } : {}), ...(stare.get(pol.id)?.maska ? { maska: stare.get(pol.id).maska } : {}) });
        }
        fs.writeFileSync(path.join(VYSTUP, 'katalog.json'), JSON.stringify({ verze: 1, zdroje: ZDROJE, kategorie: zadani.kategorie, polozky }, null, 1));
        return polozky;
    };
    const nahledPlati = (pol) => {
        const nahled = cesta('nahledy', pol, '.webp'), znacka = cesta('pudorys', pol, '.webp');
        if (!fs.existsSync(nahled) || !fs.existsSync(znacka)) return false;
        return !STARSI || fs.statSync(nahled).mtime >= fs.statSync(cesta('modely', pol, '.glb')).mtime;
    };
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
