/**
 * MĚŘENÍ IMPORTU — jeden příkaz, jedna tabulka, zamčená baseline.
 *
 * Projde všechny reference v services/import-test/reference (vyveze je
 * `php artisan koncept-v3:export-referenci`) a u každé změří, jak si
 * rozpoznávání vede proti ručně nakreslené pravdě.
 *
 * Bez téhle smyčky nejde poznat, jestli změna pomohla, nebo se jen posunulo,
 * s čím se porovnává — a ladění se stává náhodnou chůzí.
 *
 * Spuštění:
 *   node services/import-test/mereni.cjs              # změří a porovná s baseline
 *   node services/import-test/mereni.cjs --zamkni     # uloží současný stav jako baseline
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');

const A = nactiAnalyzu();
const KOREN = path.resolve(__dirname, '../..');
const REFERENCE = path.join(__dirname, 'reference');
const CACHE = path.join(__dirname, '.cache');
const BASELINE = path.join(__dirname, 'baseline.json');
const PODKLADY = path.join(KOREN, 'storage/app/private/koncept-v3-podklady');
const POPPLER = process.env.KONCEPT_POPPLER || 'C:/Users/HP/tools/poppler-bin';

const zamkni = process.argv.includes('--zamkni');

/** SVG strany výkresu; vyrobí se jednou a drží v cache. */
function svgVykresu(otisk, strana) {
    fs.mkdirSync(CACHE, { recursive: true });
    const cil = path.join(CACHE, otisk + '-' + strana + '.svg');
    if (fs.existsSync(cil)) return fs.readFileSync(cil, 'utf8');

    let pdf = null;
    for (const uzivatel of fs.readdirSync(PODKLADY)) {
        const kandidat = path.join(PODKLADY, uzivatel, otisk + '.pdf');
        if (fs.existsSync(kandidat)) { pdf = kandidat; break; }
    }
    if (!pdf) return null;

    execFileSync(path.join(POPPLER, 'pdftocairo.exe'),
        ['-svg', '-f', String(strana), '-l', String(strana), pdf, cil], { stdio: 'pipe' });
    return fs.readFileSync(cil, 'utf8');
}

/** Jaká část stěny `a` leží na některé stěně ze sady. */
function pokryti(a, sada, tolerance) {
    tolerance = tolerance || 0.30;
    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
    const L = Math.hypot(dx, dy);
    if (!L) return 0;
    const kroku = Math.max(6, Math.round(L / 0.1));
    let trefy = 0;
    for (let i = 0; i < kroku; i++) {
        const t = (i + 0.5) / kroku;
        const px = a.x1 + dx * t, py = a.y1 + dy * t;
        const sedi = sada.some(b => {
            let r = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (r > Math.PI / 2) r = Math.PI - r;
            if (r > 10 * Math.PI / 180) return false;
            const bdx = b.x2 - b.x1, bdy = b.y2 - b.y1;
            const bL2 = bdx * bdx + bdy * bdy || 1;
            let u = ((px - b.x1) * bdx + (py - b.y1) * bdy) / bL2;
            if (u < -0.02 || u > 1.02) return false;
            u = Math.max(0, Math.min(1, u));
            return Math.hypot(b.x1 + bdx * u - px, b.y1 + bdy * u - py) < tolerance;
        });
        if (sedi) trefy++;
    }
    return trefy / kroku;
}

/** Otvory se párují NEJBLIŽŠÍM protějškem, ne prvním volným. */
function parujOtvory(referencni, nalezene, tolerance) {
    tolerance = tolerance || 0.45;
    const dvojice = [];
    for (let i = 0; i < referencni.length; i++) {
        for (let j = 0; j < nalezene.length; j++) {
            const d = Math.hypot(referencni[i].x - nalezene[j].x, referencni[i].y - nalezene[j].y);
            if (d < tolerance) dvojice.push({ i, j, d });
        }
    }
    dvojice.sort((a, b) => a.d - b.d);
    const refPouzite = new Set(), nalPouzite = new Set(), pary = [];
    for (const p of dvojice) {
        if (refPouzite.has(p.i) || nalPouzite.has(p.j)) continue;
        refPouzite.add(p.i); nalPouzite.add(p.j);
        pary.push(p);
    }
    return { pary, refPouzite, nalPouzite };
}

function zmerReferenci(soubor) {
    const ref = JSON.parse(fs.readFileSync(soubor, 'utf8'));
    const pk = ref.podklad;
    const strana = pk.strana || 1;
    const svg = svgVykresu(pk.otisk, strana);
    if (!svg) return { nazev: ref.nazev, chyba: 'PDF k výkresu se nenašlo' };

    const dpi = 150;
    const sirkaPx = pk.sirkaM / pk.metryNaPx, vyskaPx = pk.vyskaM / pk.metryNaPx;
    const vb = svg.match(/viewBox="([^"]+)"/);
    const sirkaBodu = vb ? parseFloat(vb[1].split(/\s+/)[2]) : sirkaPx * 72 / dpi;
    const mnb = pk.sirkaM / sirkaBodu;
    const naMetry = (bx, by) => ({
        x: pk.stredX + (bx * dpi / 72 - sirkaPx / 2) * pk.metryNaPx,
        y: pk.stredY - (by * dpi / 72 - vyskaPx / 2) * pk.metryNaPx,
    });

    let obrys = null;
    for (const uzivatel of fs.readdirSync(PODKLADY)) {
        const popis = path.join(PODKLADY, uzivatel, pk.otisk + '.json');
        if (!fs.existsSync(popis)) continue;
        const j = JSON.parse(fs.readFileSync(popis, 'utf8'));
        const s = (j.strany || {})[String(strana)];
        if (s && s.obrys) obrys = s.obrys;
    }

    const usecky = A.extrahujUsecky(svg);
    // spodní kontrola: přečetl jsem z výkresu vůbec něco?
    if (usecky.length < 200) {
        return { nazev: ref.nazev, chyba: 'z výkresu se přečetlo jen ' + usecky.length + ' úseček' };
    }

    const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys, maxVariant: 4 });
    if (!varianty.length) return { nazev: ref.nazev, chyba: 'žádná varianta' };

    const refSteny = ref.steny.map(w => ({
        x1: w.od[0], y1: w.od[1], x2: w.do[0], y2: w.do[1], tloustka: w.tloustka,
    }));
    const steny = new Map(ref.steny.map(w => [w.id, w]));
    const refOtvory = [];
    for (const o of ref.otvory || []) {
        const w = steny.get(o.stena || o.wallId);
        if (!w) continue;
        const dx = w.do[0] - w.od[0], dy = w.do[1] - w.od[1];
        const L = Math.hypot(dx, dy) || 1;
        const t = (o.pozice + o.sirka / 2) / L;
        refOtvory.push({ x: w.od[0] + dx * t, y: w.od[1] + dy * t, sirka: o.sirka, typ: o.typ });
    }

    // měří se KAŽDÁ varianta — ať je vidět i to, co bychom mohli mít
    const zmerene = varianty.map(v => {
        const nalSteny = v.osy.map(o => {
            const a = naMetry(o.x1, o.y1), b = naMetry(o.x2, o.y2);
            return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, tloustka: o.tloustka };
        });
        const nalOtvory = (v.otvory || []).map(o => {
            const s = naMetry(o.x, o.y);
            return { x: s.x, y: s.y, sirka: o.sirka, typ: o.typ };
        });

        const trefene = refSteny.filter(r => pokryti(r, nalSteny) >= 0.6);
        const navicSteny = nalSteny.filter(n => pokryti(n, refSteny) < 0.6).length;
        const p = parujOtvory(refOtvory, nalOtvory);

        const chybyTl = trefene.map(r => {
            const nej = nalSteny.map(n => ({ n, p: pokryti(r, [n]) })).sort((a, b) => b.p - a.p)[0];
            return nej && nej.p >= 0.4 ? Math.abs(nej.n.tloustka - r.tloustka) : null;
        }).filter(x => x !== null);

        let dveri = 0, dveriCelkem = 0, oken = 0, okenCelkem = 0;
        refOtvory.forEach((o, i) => {
            const je = p.refPouzite.has(i);
            if (o.typ === 'okno') { okenCelkem++; if (je) oken++; }
            else { dveriCelkem++; if (je) dveri++; }
        });

        return {
            styl: v.styl,
            sten: nalSteny.length,
            stenNasel: trefene.length,
            stenNavic: navicSteny,
            chybaTl: chybyTl.length ? chybyTl.reduce((a, b) => a + b, 0) / chybyTl.length : 0,
            otvoru: nalOtvory.length,
            otvoruNasel: p.pary.length,
            otvoruNavic: nalOtvory.length - p.nalPouzite.size,
            dveri, dveriCelkem, oken, okenCelkem,
        };
    });

    // top-1 = co dostane uživatel; nejlepší = strop dnešního rozpoznávání
    const skore = (z) => z.stenNasel / Math.max(1, refSteny.length) - z.stenNavic * 0.01;
    const nejlepsi = zmerene.reduce((a, b) => (skore(b) > skore(a) ? b : a));

    return {
        nazev: ref.nazev,
        refSten: refSteny.length,
        refOtvoru: refOtvory.length,
        usecek: usecky.length,
        krivek: (usecky.krivky || []).length,
        top1: zmerene[0],
        nejlepsi,
        variant: zmerene.length,
    };
}

if (!fs.existsSync(REFERENCE)) {
    console.error('Reference nejsou. Spusť: php artisan koncept-v3:export-referenci');
    process.exit(1);
}
const soubory = fs.readdirSync(REFERENCE).filter(f => f.endsWith('.json')).sort();
if (!soubory.length) {
    console.error('Ve složce reference nic není. Spusť: php artisan koncept-v3:export-referenci');
    process.exit(1);
}

const vysledky = soubory.map(f => zmerReferenci(path.join(REFERENCE, f)));
const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null;

const rozdil = (ted, drive) => {
    if (drive === undefined || drive === null) return '';
    const d = ted - drive;
    if (Math.abs(d) < 0.05) return '';
    return (d > 0 ? '+' : '') + (Math.abs(d) < 1 ? d.toFixed(1) : String(Math.round(d)));
};

console.log('');
console.log('výkres        |  stěny        navíc   chyba tl | otvory        navíc | dveře  okna | varianta');
console.log('--------------+--------------------------------+---------------------+-------------+---------');
for (const v of vysledky) {
    if (v.chyba) { console.log(v.nazev.padEnd(13) + ' | CHYBA: ' + v.chyba); continue; }
    const z = baseline && baseline[v.nazev] ? baseline[v.nazev].top1 : null;
    const t = v.top1;
    console.log(
        v.nazev.slice(0, 13).padEnd(13) + ' | '
        + (String(t.stenNasel) + '/' + v.refSten).padStart(6) + rozdil(t.stenNasel, z && z.stenNasel).padStart(4) + '  '
        + String(t.stenNavic).padStart(3) + rozdil(t.stenNavic, z && z.stenNavic).padStart(4) + '  '
        + (t.chybaTl * 100).toFixed(1).padStart(5) + 'cm' + rozdil(t.chybaTl * 100, z ? z.chybaTl * 100 : null).padStart(5) + ' | '
        + (String(t.otvoruNasel) + '/' + v.refOtvoru).padStart(6) + rozdil(t.otvoruNasel, z && z.otvoruNasel).padStart(4) + '  '
        + String(t.otvoruNavic).padStart(3) + rozdil(t.otvoruNavic, z && z.otvoruNavic).padStart(4) + ' | '
        + (String(t.dveri) + '/' + t.dveriCelkem).padStart(5) + ' '
        + (String(t.oken) + '/' + t.okenCelkem).padStart(5) + ' | '
        + t.styl.slice(0, 30));
}
console.log('');
for (const v of vysledky) {
    if (v.chyba) continue;
    console.log(v.nazev.slice(0, 13).padEnd(13) + ' · přečteno ' + v.usecek + ' úseček a ' + v.krivek + ' křivek'
        + ' · variant ' + v.variant
        + (v.nejlepsi.styl !== v.top1.styl
            ? ' · NEJLEPŠÍ by byla "' + v.nejlepsi.styl.slice(0, 30) + '" ('
              + v.nejlepsi.stenNasel + '/' + v.refSten + ' stěn, '
              + v.nejlepsi.otvoruNasel + '/' + v.refOtvoru + ' otvorů)'
            : ' · nabízená varianta je zároveň nejlepší'));
}

if (zamkni) {
    const novy = {};
    for (const v of vysledky) {
        if (!v.chyba) novy[v.nazev] = { top1: v.top1, refSten: v.refSten, refOtvoru: v.refOtvoru };
    }
    fs.writeFileSync(BASELINE, JSON.stringify(novy, null, 2));
    console.log('\nBaseline zamčená do ' + path.relative(KOREN, BASELINE));
} else if (!baseline) {
    console.log('\n(baseline zatím není — zamkni ji: node services/import-test/mereni.cjs --zamkni)');
}
