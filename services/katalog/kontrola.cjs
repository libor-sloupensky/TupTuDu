/**
 * Kontrola vyrobeného katalogu před nasazením, viz modules/katalog.md.
 * Změří náhledy a značky, porovná rozměry s rozsahem kategorie, najde stejné modely a volitelně udělá archy
 * náhledů k prohlédnutí očima. Automatickým kusům umí ověřit barvu v názvu proti obrázku.
 *
 * Spuštění: node services/katalog/kontrola.cjs [--archy] [--kat=pohovky] [--barvy] [--vystup=složka]
 * --barvy přepíše v polozky.json názvy kusů s auto: true, potom spusť sestav.cjs. Vyžaduje Chrome.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { otevriProhlizec } = require('../import-test/prohlizec.cjs');

const volby = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const KOREN = path.resolve(__dirname, '../..');
const PUBLIC = path.join(KOREN, 'public');
const VYSTUP = volby.vystup || path.join(os.tmpdir(), 'tuptudu-katalog-kontrola');
const SOUBOR = path.join(__dirname, 'polozky.json');
const NA_ARCH = 30;

// Rozumný největší půdorysný rozměr a výška podle kategorie v metrech
const ROZSAHY = {
    pohovky: { s: [1.1, 3.4], v: [0.5, 1.3] }, kresla: { s: [0.4, 1.6], v: [0.3, 1.4] }, zidle: { s: [0.28, 1.25], v: [0.35, 1.35] },
    stoly: { s: [0.6, 3.2], v: [0.55, 1.15] }, stolky: { s: [0.25, 1.9], v: [0.2, 1.0] }, postele: { s: [1.3, 2.9], v: [0.2, 2.5] },
    skrine: { s: [0.25, 3.0], v: [0.3, 2.6] }, police: { s: [0.2, 2.6], v: [0.3, 2.6] }, psaci: { s: [0.6, 2.4], v: [0.55, 1.9] },
    svitidla: { s: [0.1, 1.5], v: [0.15, 2.4] }, koberce: { s: [0.5, 5.0], v: [0.001, 0.08] }, obrazy: { s: [0.15, 2.2], v: [0.1, 2.0] },
    zrcadla: { s: [0.2, 2.0], v: [0.2, 2.3] }, rostliny: { s: [0.08, 1.6], v: [0.07, 2.6] },
};
const MAX_MB = 4;
const MAX_PLOSEK = 150000;

// U obrazů a zrcadel barva nic neřekne. U postelí a svítidel jde o rám a podstavec, ne o matraci a stínidlo.
const BEZ_BARVY = new Set(['obrazy', 'zrcadla']);
const BEZ_SVETLYCH = new Set(['postele', 'svitidla']);
// Popis ze zdroje platí, když ho obrázek podpoří aspoň tímto podílem. Novou barvu dává jen jasná převaha,
// hněď, šeď a béžová se pod světlem jinak spolehlivě nerozliší a chybné slovo je horší než žádné.
const POTVRZENO = 0.3;
const JISTE = 0.55;

const rodNazvu = (nazev) => {
    const hlava = nazev.split(/\sse?\s/)[0];
    if (/křeslo|jednolůžko|zrcadlo/i.test(hlava)) return 'é';
    if (/pohovka|židle|lavice|postel|komoda|skříň|skříňka|knihovna|police|lampa|váza|stolička/i.test(hlava)) return 'á';
    return 'ý';
};
const SKUPINA = { 'tmavě šed': 'šed', 'čern': 'šed', 'tmavě modr': 'modr' };
// Které odstíny na obrázku podporují slovo ze zdroje
const OPORA = {
    'čern': ['čern', 'tmavě šed'], 'tmavě šed': ['čern', 'tmavě šed', 'šed'], 'šed': ['tmavě šed', 'šed', 'bíl'], 'bíl': ['bíl', 'šed'],
    'béžov': ['béžov', 'bíl'], 'hněd': ['hněd', 'oranžov', 'červen'], 'dřevěn': ['hněd', 'béžov', 'žlut', 'oranžov'], 'červen': ['červen', 'růžov'],
    'modr': ['modr', 'tmavě modr'], 'tmavě modr': ['modr', 'tmavě modr', 'čern'], 'žlut': ['žlut', 'oranžov'], 'oranžov': ['oranžov', 'hněd'],
    'zelen': ['zelen'], 'růžov': ['růžov', 'červen'], 'fialov': ['fialov', 'růžov'],
};

/** Kmen barvy do názvu podle podílů odstínů. Null = bez přívlastku. */
function barvaNazvu(podily, kategorie, zdroj) {
    if (BEZ_BARVY.has(kategorie)) return null;
    const kusy = { ...podily };
    if (BEZ_SVETLYCH.has(kategorie)) { delete kusy['bíl']; delete kusy['šed']; }
    const celkem = Object.values(kusy).reduce((a, b) => a + b, 0);
    if (!celkem) return null;
    const opora = (OPORA[zdroj] || []).reduce((s, k) => s + (kusy[k] || 0), 0) / celkem;
    if (opora >= POTVRZENO) return zdroj;
    // Rám postele a podstavec lampy jsou na odhad moc malé, tam se nic nedoplňuje
    if (BEZ_SVETLYCH.has(kategorie)) return null;
    const skupiny = {};
    for (const [k, v] of Object.entries(kusy)) { const s = SKUPINA[k] || k; skupiny[s] = (skupiny[s] || 0) + v; }
    const [nej, podil] = Object.entries(skupiny).sort((a, b) => b[1] - a[1])[0];
    if (podil / celkem < JISTE) return null;
    return Object.entries(kusy).filter(([k]) => (SKUPINA[k] || k) === nej).sort((a, b) => b[1] - a[1])[0][0];
}

const server = () => new Promise((ok) => {
    const s = http.createServer((q, r) => {
        const u = decodeURIComponent(q.url.split('?')[0]);
        if (u === '/prazdna') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return r.end('<!doctype html><meta charset="utf-8"><body></body>'); }
        const f = path.join(PUBLIC, u);
        if (!f.startsWith(PUBLIC) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': f.endsWith('.webp') ? 'image/webp' : 'application/octet-stream' });
        fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => ok(s));
});

// Běží v prohlížeči: pokrytí, jas a podíly barev jednoho obrázku
const MERENI = `(async (ids) => {
    const nacti = (u) => new Promise((ok) => { const m = new Image(); m.onload = () => ok(m); m.onerror = () => ok(null); m.src = u; });
    const odstin = (r, g, b) => {
        const R = r / 255, G = g / 255, B = b / 255, max = Math.max(R, G, B), min = Math.min(R, G, B), L = (max + min) / 2, d = max - min;
        const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
        let H = 0;
        if (d) { H = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4; H = (H * 60 + 360) % 360; }
        if (L < 0.11) return 'čern';
        if (S < 0.13 || (S < 0.2 && L > 0.75)) {
            if (L > 0.72) return 'bíl';
            if (L > 0.42) return 'šed';
            return L < 0.2 ? 'čern' : 'tmavě šed';
        }
        if (H < 14 || H >= 345) { if (L > 0.72) return 'růžov'; return S < 0.38 ? 'hněd' : 'červen'; }
        if (H < 48) {
            if (S < 0.2 && L < 0.42) return L < 0.2 ? 'čern' : 'tmavě šed';
            if (L > 0.58) return 'béžov';
            return (S > 0.8 && L > 0.45) ? 'oranžov' : 'hněd';
        }
        if (H < 66) return S < 0.4 ? (L > 0.55 ? 'béžov' : 'hněd') : 'žlut';
        if (H < 170) return S < 0.17 ? 'šed' : 'zelen';
        if (H < 262) { if (S < 0.17) return 'šed'; return L < 0.27 ? 'tmavě modr' : 'modr'; }
        return S < 0.17 ? 'šed' : (L > 0.72 ? 'růžov' : 'fialov');
    };
    const mer = (m, barvy) => {
        if (!m) return null;
        const c = document.createElement('canvas'); c.width = m.naturalWidth; c.height = m.naturalHeight;
        const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(m, 0, 0);
        const d = g.getImageData(0, 0, c.width, c.height).data;
        let plne = 0, jas = 0; const pocty = {};
        for (let k = 0; k < d.length; k += 4) {
            if (d[k + 3] <= 20) continue;
            plne++; jas += (d[k] + d[k + 1] + d[k + 2]) / 3;
            if (barvy) { const b = odstin(d[k], d[k + 1], d[k + 2]); pocty[b] = (pocty[b] || 0) + 1; }
        }
        const podily = {};
        if (barvy) for (const [k, v] of Object.entries(pocty)) podily[k] = +(v / (plne || 1)).toFixed(3);
        return { pokryti: +(plne / (c.width * c.height)).toFixed(4), jas: +(plne ? jas / plne : 0).toFixed(1), podily };
    };
    const v = {};
    for (const id of ids) v[id] = { n: mer(await nacti('/katalog/nahledy/' + id + '.webp'), true), z: mer(await nacti('/katalog/pudorys/' + id + '.webp'), false) };
    return JSON.stringify(v);
})`;

(async () => {
    const katalog = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'katalog/katalog.json'), 'utf8'));
    const zadani = JSON.parse(fs.readFileSync(SOUBOR, 'utf8'));
    const zaznam = new Map(zadani.polozky.map(p => [p.id, p]));
    fs.mkdirSync(VYSTUP, { recursive: true });
    const srv = await server();
    const p = await otevriProhlizec({ sirka: 1500, vyska: 1040 });
    await p.cmd('Emulation.setDeviceMetricsOverride', { width: 1500, height: 1040, deviceScaleFactor: 1, mobile: false });
    await p.jdiNa(`http://127.0.0.1:${srv.address().port}/prazdna`);

    const mereni = {};
    const ids = katalog.polozky.map(x => x.id);
    for (let i = 0; i < ids.length; i += 40) Object.assign(mereni, JSON.parse(await p.vyhodnot(`${MERENI}(${JSON.stringify(ids.slice(i, i + 40))})`)));

    const nalezy = [];
    const hlas = (x, duvod) => nalezy.push(`${x.id.padEnd(18)} ${x.nazev.padEnd(32)} ${duvod}`);
    for (const x of katalog.polozky) {
        const m = mereni[x.id];
        const mb = fs.statSync(path.join(PUBLIC, 'katalog/modely', x.id + '.glb')).size / 1e6;
        const s = Math.max(x.sirka, x.hloubka);
        const r = ROZSAHY[x.kategorie];
        if (!m?.n) hlas(x, 'chybí nebo nejde načíst náhled');
        if (!m?.z) hlas(x, 'chybí nebo nejde načíst značka');
        if (m?.n && m.n.pokryti < 0.01) hlas(x, `prázdný náhled, pokrytí ${m.n.pokryti}`);
        if (m?.z && m.z.pokryti < 0.05) hlas(x, `skoro prázdná značka, pokrytí ${m.z.pokryti}`);
        if (r && (s < r.s[0] || s > r.s[1])) hlas(x, `půdorysný rozměr ${s} m mimo ${r.s.join('–')}`);
        if (r && (x.vyska < r.v[0] || x.vyska > r.v[1])) hlas(x, `výška ${x.vyska} m mimo ${r.v.join('–')}`);
        if (x.kategorie === 'pohovky' && x.hloubka > x.sirka) hlas(x, `hlubší než širší, ${x.sirka}×${x.hloubka}, asi otočený`);
        if (['obrazy', 'zrcadla'].includes(x.kategorie) && x.hloubka > Math.max(0.25, x.sirka * 0.5)) hlas(x, `není tenké: ${x.sirka}×${x.hloubka}×${x.vyska}`);
        if (mb > MAX_MB) hlas(x, `velký soubor ${mb.toFixed(1)} MB`);
        if (x.plosek > MAX_PLOSEK) hlas(x, `hodně plošek ${x.plosek}`);
    }

    // Stejný model pod jiným ID: shodné rozměry, plošky i barvy
    const skupiny = new Map();
    for (const x of katalog.polozky) {
        const b = Object.entries(mereni[x.id]?.n?.podily || {}).sort((a, c) => c[1] - a[1])[0]?.[0];
        const k = [x.sirka, x.hloubka, x.vyska, x.plosek, b].join('|');
        skupiny.set(k, [...(skupiny.get(k) || []), x.id]);
    }
    const shody = [...skupiny.values()].filter(g => g.length > 1);

    let zmenenych = 0;
    if (volby.barvy) {
        for (const x of katalog.polozky) {
            const z = zaznam.get(x.id);
            if (!z?.auto || !mereni[x.id]?.n) continue;
            const [zaklad, slovo] = z.nazev.split(', ');
            const kmen = barvaNazvu(mereni[x.id].n.podily, z.kategorie, slovo?.slice(0, -1));
            const novy = kmen ? `${zaklad}, ${kmen}${rodNazvu(zaklad)}` : zaklad;
            if (novy !== z.nazev) { z.nazev = novy; zmenenych++; }
        }
        fs.writeFileSync(SOUBOR, JSON.stringify(zadani, null, 1));
    }

    const velikost = (slozka) => fs.readdirSync(path.join(PUBLIC, 'katalog', slozka)).reduce((a, f) => a + fs.statSync(path.join(PUBLIC, 'katalog', slozka, f)).size, 0) / 1e6;
    console.log(`Kusů ${katalog.polozky.length}, modely ${velikost('modely').toFixed(1)} MB, náhledy ${velikost('nahledy').toFixed(1)} MB, značky ${velikost('pudorys').toFixed(1)} MB`);
    console.log('Kategorie: ' + zadani.kategorie.map(k => `${k.id} ${katalog.polozky.filter(x => x.kategorie === k.id).length}`).join(', '));
    console.log(`\nNálezů ${nalezy.length}:\n` + nalezy.join('\n'));
    if (shody.length) console.log(`\nStejný model (${shody.length}):\n` + shody.map(g => '  ' + g.join(', ')).join('\n'));
    if (volby.barvy) console.log(`\nZměněných názvů podle barvy: ${zmenenych}`);

    if (volby.archy) {
        const slozkaArchu = path.join(VYSTUP, 'archy');
        fs.mkdirSync(slozkaArchu, { recursive: true });
        const index = {};
        let cislo = 0;
        for (const kat of zadani.kategorie) {
            if (volby.kat && volby.kat !== kat.id) continue;
            const kusy = katalog.polozky.filter(x => x.kategorie === kat.id).map(x => ({ ...x, nazev: zaznam.get(x.id)?.nazev ?? x.nazev }));
            for (let i = 0; i < kusy.length; i += NA_ARCH) {
                const nazev = `${kat.id}-${String(i / NA_ARCH + 1).padStart(2, '0')}`;
                const karty = kusy.slice(i, i + NA_ARCH).map(x => { index[++cislo] = x.id; return `<div class="k"><img class="n" src="/katalog/nahledy/${x.id}.webp"><img class="z" src="/katalog/pudorys/${x.id}.webp">
                    <div class="t"><b>${cislo}</b> ${x.nazev}</div><div class="r">${x.sirka}×${x.hloubka}×${x.vyska} m</div></div>`; }).join('');
                await p.vyhodnot(`(async () => {
                    document.body.innerHTML = ${JSON.stringify(`<style>
                        body{margin:0;font:13px/1.25 Arial,sans-serif;background:#c9cdd2;color:#111}
                        h1{font-size:15px;margin:0;padding:5px 8px;background:#111;color:#fff}
                        .m{display:grid;grid-template-columns:repeat(6,1fr);gap:3px;padding:3px}
                        .k{position:relative;background:#e4e7ea;height:197px;overflow:hidden}
                        .n{width:100%;height:158px;object-fit:contain;display:block}
                        .z{position:absolute;right:2px;top:2px;width:56px;height:56px;object-fit:contain;background:#fff;border:1px solid #888}
                        .t{padding:0 4px;white-space:nowrap;overflow:hidden;font-size:12.5px}.r{padding:0 4px;color:#333;font-size:12px}
                    </style><h1>${kat.nazev} — arch ${i / NA_ARCH + 1} z ${Math.ceil(kusy.length / NA_ARCH)}</h1><div class="m">${karty}</div>`)};
                    await Promise.all([...document.images].map(m => m.complete ? 0 : new Promise(r => { m.onload = m.onerror = r; })));
                    return 1; })()`);
                await p.snimek(path.join(slozkaArchu, nazev + '.png'));
            }
        }
        fs.writeFileSync(path.join(VYSTUP, 'archy-index.json'), JSON.stringify(index));
        console.log(`\nArchy: ${slozkaArchu}`);
    }
    await p.zavri();
    srv.close();
    process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
