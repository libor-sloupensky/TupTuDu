/**
 * Ověření cesty: výkres → měřítko → obkreslení obvodu → rozpoznání vnitřních stěn
 * → převzetí do editoru. Obvod se kreslí skutečnými kliky myši.
 *
 * Spuštění:
 *   node services/import-test/test-obvod-ui.cjs <cesta-k-pdf> [výstupní-složka]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

/**
 * Zapamatované měřítko a obvod výkresu se při testu PŘEPÍŠOU (test si kreslí
 * vlastní). U referenčních výkresů je to ale ruční práce uživatele a měření
 * se o ni opírá — proto se soubor na začátku zálohuje a na konci vrátí.
 *
 * @returns {function(): void} obnovení
 */
function ochranNastaveniVykresu(pdf) {
    const otisk = crypto.createHash('sha1').update(fs.readFileSync(pdf)).digest('hex');
    const slozka = path.resolve(__dirname, '../../storage/app/private/koncept-v3-podklady');
    if (!fs.existsSync(slozka)) return () => {};

    const zalohy = [];
    for (const uzivatel of fs.readdirSync(slozka)) {
        const soubor = path.join(slozka, uzivatel, otisk + '.json');
        if (fs.existsSync(soubor)) zalohy.push([soubor, fs.readFileSync(soubor)]);
    }

    return () => {
        for (const [soubor, obsah] of zalohy) fs.writeFileSync(soubor, obsah);
        if (zalohy.length) console.log('(zapamatované nastavení výkresu vráceno zpět)');
    };
}

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const DATA = `Alpine.$data(document.querySelector('[x-data]'))`;

async function main() {
    const pdf = process.argv[2];
    const vystup = process.argv[3] || path.join(__dirname, 'vystup');
    if (!pdf || !fs.existsSync(pdf)) { console.error('Zadejte cestu k PDF.'); process.exit(1); }
    fs.mkdirSync(vystup, { recursive: true });

    const obnovNastaveni = ochranNastaveniVykresu(pdf);
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1700, vyska: 1050 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);
    const krok = async (popis, fn) => {
        process.stdout.write(popis.padEnd(46));
        try { await fn(); console.log('OK'); } catch (e) { console.log('CHYBA — ' + e.message); throw e; }
    };

    /** Klik do prohlížeče na místo v px obrázku. */
    const klik = async (x, y) => {
        const b = await p.vyhodnot(`(() => { const d = ${DATA};
            const r = d.$refs.pzViewport.getBoundingClientRect();
            return { x: Math.round(r.left + ${x} * d.pzZoom + d.pzPanX), y: Math.round(r.top + ${y} * d.pzZoom + d.pzPanY) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'none' });
        await pauza(120);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(200);
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
                body: JSON.stringify({ nazev: 'Test obvodu ' + new Date().toISOString().slice(11,19) }) });
                const j = await r.json(); location.href = j.redirect; })()`);
            await pauza(2500);
            await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');
        });

        await krok('nahrání výkresu a změření', async () => {
            await proved('d.impOtevri()');
            await p.vlozSoubor('input[type=file][accept*="pdf"]', pdf);
            await p.cekej(`${DATA}.impKrok === 'meritko'`, 60000, 'krok měřítko');
            await p.cekej(`${DATA}.pzSirka > 0`, 20000, 'obrázek');
            // měřítko: 1 m při 1:50
            await proved(`const mmNaPx = 0.0254 / d.impStranaData.dpi * 50 * 1000;
                d.impKalibBody = [{ x: 200, y: 200 }, { x: 200 + 1000 / mmNaPx, y: 200 }];
                d.impKalibMm = 1000`);
            if (!await stav('d.impZmereno()')) throw new Error('měřítko se nenastavilo');
        });

        await krok('přechod na obkreslení obvodu', async () => {
            await proved('d.impNaObrys()');
            await p.cekej(`${DATA}.impKrok === 'obrys'`, 5000, 'krok obrys');
            if (await stav('d.pzNastroj') !== 'obrys') throw new Error('nenastavil se nástroj obrysu');
            // Výkres, který už se jednou obkresloval, si obrys pamatuje (podle
            // otisku souboru). Test kreslí vlastní, takže musí začít na čistém —
            // jinak kliky padnou do uzavřeného obrysu a nic neudělají.
            if (await stav('d.pzObrys.length')) await proved('d.pzObrys = []; d.pzObrysUzavren = false');
        });

        // rohy obdélníku v px obrázku — musí padnout do právě viditelné části,
        // jinak klik mine plátno (viditelnost závisí na velikosti okna)
        const rohy = await p.vyhodnot(`(() => { const d = ${DATA};
            // podíly se berou z výkresu, ne z okna — od chvíle, kdy se po
            // přechodu odzoomuje na celý výkres, kolem něj zbývají prázdné pruhy
            const naObr = (px, py) => ({ x: d.pzSirka * px, y: d.pzVyska * py });
            const a = naObr(0.20, 0.20);
            const b = naObr(0.75, 0.80);
            return JSON.parse(JSON.stringify([
                { x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y },
            ])); })()`);

        await krok('obkreslení obvodu kliky', async () => {
            for (const r of rohy) await klik(r.x, r.y);
            const pocet = await stav('d.pzObrys.length');
            if (pocet !== 4) throw new Error('zapsalo se ' + pocet + ' bodů místo 4');
            await klik(rohy[0].x, rohy[0].y);          // uzavřít kliknutím na první bod
            if (!await stav('d.pzObrysUzavren')) {
                // u velkých formátů může klik minout první bod → uzavřít tlačítkem
                await proved('d.pzObrysUzavri()');
            }
            if (!await stav('d.pzObrysUzavren')) throw new Error('obrys se neuzavřel');
            await pauza(400);
            await p.snimek(path.join(vystup, '1-obrys.png'));
        });
        console.log('   obvod:', await stav('d.pzObrys.length'), 'rohů, plocha',
            (await stav('d.pzObrysPlocha()')).toFixed(1), 'm²');

        await krok('rozpoznání vnitřních stěn', async () => {
            await proved('d.impRozpoznat()');
            await p.cekej(`['hotovo','chyba'].includes(${DATA}.impStav)`, 180000, 'rozpoznání');
            if (await stav('d.impStav') !== 'hotovo') throw new Error(await stav('d.impChyba'));
            await pauza(1500);
            await p.snimek(path.join(vystup, '2-varianty.png'));
        });

        const varianty = await stav(`d.impVarianty.map(v => ({ styl: v.styl, os: v.osy.length,
            obvod: v.osy.filter(o => o.obvodova).length, delka: v.delka, skore: v.skore }))`);
        varianty.forEach((v, i) => console.log(`     ${i + 1}. ${v.styl.slice(0, 32).padEnd(34)}`
            + ` ${String(v.os).padStart(3)} stěn (obvod ${v.obvod}), ${v.delka.toFixed(0)} m, skóre ${v.skore.toFixed(2)}`));

        await krok('převzetí do editoru', async () => {
            await proved('d.impPrevezmiSteny()');
            await p.cekej(`${DATA}.engine.walls.size > 0`, 15000, 'stěny');
            await pauza(2500);
            await p.snimek(path.join(vystup, '3-editor.png'));
        });

        const vysl = await p.vyhodnot(`(() => { const j = ${DATA}.engine.toJSON();
            const obvod = j.steny.filter(s => s.typ === 'obvodova');
            const xs = j.steny.flatMap(s => [s.od[0], s.do[0]]), ys = j.steny.flatMap(s => [s.od[1], s.do[1]]);
            const tl = {}; j.steny.forEach(x => { const k = Math.round(x.tloustka*100); tl[k] = (tl[k]||0)+1; });
            return { sten: j.steny.length, obvodovych: obvod.length,
                tloustky: Object.entries(tl).sort((a,b)=>b[1]-a[1]).map(([a,b]) => a+'cm×'+b).join(' '),
                tlObvodu: [...new Set(obvod.map(s => Math.round(s.tloustka * 100)))].join('/'),
                sirka: Math.max(...xs) - Math.min(...xs), vyska: Math.max(...ys) - Math.min(...ys) }; })()`);
        console.log(`   v editoru: ${vysl.sten} stěn (z toho ${vysl.obvodovych} obvodových, tl. ${vysl.tlObvodu} cm),`
            + ` rozměr ${vysl.sirka.toFixed(1)} × ${vysl.vyska.toFixed(1)} m`);
        console.log('   tloušťky v editoru:', vysl.tloustky);

        const chyby = p.chyby.filter(t => !/favicon|mapy/i.test(t));
        if (p.chybyDetail.length) console.log(JSON.stringify(p.chybyDetail.filter(c => !/favicon|mapy/.test(c.text)).slice(0, 4), null, 1));
        console.log(chyby.length ? '\nChyby v konzoli:\n  ' + chyby.slice(0, 5).join('\n  ') : '\nŽádné chyby v konzoli.');
        console.log('Snímky:', vystup);
    } finally {
        await p.zavri();
        obnovNastaveni();
    }
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
