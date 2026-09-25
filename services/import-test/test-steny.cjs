/**
 * Ověření celé cesty: výkres → výřez → rozpoznání stěn → převzetí do editoru.
 *
 * Spuštění:
 *   node services/import-test/test-steny.cjs <cesta-k-pdf> [výstupní-složka]
 */
const fs = require('fs');
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const DATA = `Alpine.$data(document.querySelector('[x-data]'))`;

async function main() {
    const pdf = process.argv[2];
    const vystup = process.argv[3] || path.join(__dirname, 'vystup');
    if (!pdf || !fs.existsSync(pdf)) { console.error('Zadejte cestu k PDF.'); process.exit(1); }
    fs.mkdirSync(vystup, { recursive: true });

    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1700, vyska: 1050 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);
    const krok = async (popis, fn) => {
        process.stdout.write(popis.padEnd(44));
        try { await fn(); console.log('OK'); } catch (e) { console.log('CHYBA — ' + e.message); throw e; }
    };

    try {
        await krok('přihlášení a nový koncept', async () => {
            await p.jdiNa(ZAKLAD + '/login');
            await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
                document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
                document.querySelector('form').submit(); true`);
            await pauza(1500);
            await p.cekej(`location.pathname.startsWith('/masterteam')`, 15000, 'přihlášení');
            await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
            await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine');
            await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
                headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
                body: JSON.stringify({ nazev: 'Test rozpoznání ' + new Date().toISOString().slice(11,19) }) });
                const j = await r.json(); location.href = j.redirect; })()`);
            await pauza(2500);
            await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');
        });

        await krok('nahrání výkresu', async () => {
            await proved('d.impOtevri()');
            await p.vlozSoubor('input[type=file][accept*="pdf"]', pdf);
            await p.cekej(`${DATA}.impKrok === 'meritko'`, 60000, 'krok měřítko');
            await p.cekej(`${DATA}.pzSirka > 0`, 20000, 'obrázek');
        });

        await krok('výřez kolem půdorysu', async () => {
            // hrubý výřez podle vektorů: obálka nejdelších čar bez okrajů listu
            await proved(`d.pzVyrez = { x: d.pzSirka * 0.06, y: d.pzVyska * 0.06,
                sirka: d.pzSirka * 0.62, vyska: d.pzVyska * 0.82 }`);
        });

        await krok('změření známého rozměru', async () => {
            // uživatel měřítko vždy změří — simulace 1 m na výkresu 1:50
            await proved(`const mmNaPx = 0.0254 / d.impStranaData.dpi * 50 * 1000;
                d.impKalibBody = [{ x: 200, y: 200 }, { x: 200 + 1000 / mmNaPx, y: 200 }];
                d.impKalibMm = 1000`);
            if (!await stav('d.impZmereno()')) throw new Error('měření se nezapsalo');
        });

        await krok('rozpoznání stěn', async () => {
            await proved('d.impRozpoznat()');
            await p.cekej(`['hotovo','chyba'].includes(${DATA}.impStav)`, 180000, 'dokončení rozpoznání');
            const stavR = await stav('d.impStav');
            if (stavR !== 'hotovo') throw new Error(await stav('d.impChyba'));
        });

        const varianty = await stav('d.impVarianty.map(v => ({ styl: v.styl, os: v.osy.length, delka: v.delka, skore: v.skore }))');
        console.log('   nalezeno variant:', varianty.length, '· čas', (await stav('d.impCas')).toFixed(1), 's');
        varianty.forEach((v, i) => console.log(`     ${i + 1}. ${v.styl.slice(0, 36).padEnd(38)} ${String(v.os).padStart(4)} stěn, ${v.delka.toFixed(0)} m, skóre ${v.skore.toFixed(2)}`));

        await pauza(1500);
        await p.snimek(path.join(vystup, 'varianty.png'));

        await krok('převzetí varianty do editoru', async () => {
            await proved('d.impPrevezmiSteny()');
            await p.cekej(`${DATA}.engine.walls.size > 0`, 15000, 'stěny v enginu');
            await pauza(2500);
            await p.snimek(path.join(vystup, 'editor-steny.png'));
        });

        const vysledek = await p.vyhodnot(`(() => { const d = ${DATA};
            const j = d.engine.toJSON();
            const tl = {}; j.steny.forEach(s => { const k = Math.round(s.tloustka * 100); tl[k] = (tl[k] || 0) + 1; });
            const xs = j.steny.flatMap(s => [s.od[0], s.do[0]]), ys = j.steny.flatMap(s => [s.od[1], s.do[1]]);
            return { sten: j.steny.length, uzlu: d.engine.nodes.size,
                delka: j.steny.reduce((s, x) => s + Math.hypot(x.do[0]-x.od[0], x.do[1]-x.od[1]), 0),
                sirka: Math.max(...xs) - Math.min(...xs), vyska: Math.max(...ys) - Math.min(...ys),
                tloustky: Object.entries(tl).sort((a,b) => b[1]-a[1]).slice(0,4).map(([a,b]) => a + 'cm×' + b).join(' ') }; })()`);
        console.log(`   v editoru: ${vysledek.sten} stěn, ${vysledek.uzlu} uzlů, rozměr ${vysledek.sirka.toFixed(1)} × ${vysledek.vyska.toFixed(1)} m`);
        console.log(`   tloušťky: ${vysledek.tloustky}`);

        await krok('uložení a znovunačtení', async () => {
            const id = await stav('d.projektId');
            await pauza(1500);
            await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3?id=' + id);
            await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine');
            await p.cekej(`${DATA}.engine.walls.size > 0`, 15000, 'stěny po reloadu');
            // engine při načtení dělí stěny v T-napojeních → počet se může lišit,
            // porovnává se proto celková délka
            const delkaPo = await p.vyhodnot(`(() => { const j = ${DATA}.engine.toJSON();
                return j.steny.reduce((s, x) => s + Math.hypot(x.do[0]-x.od[0], x.do[1]-x.od[1]), 0); })()`);
            if (Math.abs(delkaPo - vysledek.delka) > vysledek.delka * 0.02) {
                throw new Error(`po reloadu jiná délka stěn: ${delkaPo.toFixed(1)} vs ${vysledek.delka.toFixed(1)} m`);
            }
            await pauza(2000);
            await p.snimek(path.join(vystup, 'po-reloadu.png'));
        });

        const chyby = p.chyby.filter(t => !/favicon|mapy/i.test(t));
        console.log(chyby.length ? '\nChyby v konzoli:\n  ' + chyby.slice(0, 5).join('\n  ') : '\nŽádné chyby v konzoli.');
        console.log('Snímky:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
