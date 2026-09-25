/**
 * Ověření prohlížeče v průvodci importem (posun, zoom, magnety, kalibrace, výřez).
 *
 * Spuštění:
 *   node services/import-test/test-prohlizec.cjs <cesta-k-pdf> [výstupní-složka]
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
    const stav = (vyraz) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${vyraz} ?? null)); })()`);
    const proved = (vyraz) => p.vyhodnot(`(() => { const d = ${DATA}; ${vyraz}; return true; })()`);
    const krok = async (popis, fn) => {
        process.stdout.write(popis.padEnd(44));
        try { await fn(); console.log('OK'); } catch (e) { console.log('CHYBA — ' + e.message); throw e; }
    };

    /** Klikne do prohlížeče na dané místo (v px obrázku) přes skutečné události myši. */
    const klikDoVykresu = async (x, y) => {
        const bod = await p.vyhodnot(`(() => { const d = ${DATA};
            const vp = d.$refs.pzViewport.getBoundingClientRect();
            return { x: Math.round(vp.left + ${x} * d.pzZoom + d.pzPanX), y: Math.round(vp.top + ${y} * d.pzZoom + d.pzPanY) };
        })()`);
        if (!Number.isFinite(bod.x) || !Number.isFinite(bod.y)) throw new Error('špatné souřadnice: ' + JSON.stringify(bod));
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bod.x, y: bod.y, button: 'none' });
        await pauza(150);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: bod.x, y: bod.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bod.x, y: bod.y, button: 'left', clickCount: 1 });
        await pauza(250);
        return bod;
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
            if (!await stav('d.projektId')) {
                await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
                    headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
                    body: JSON.stringify({ nazev: 'Test prohlížeče' }) }); const j = await r.json(); location.href = j.redirect; })()`);
                await pauza(2500);
                await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');
            }
        });

        await krok('nahrání výkresu a příprava strany', async () => {
            await proved('d.impOtevri()');
            await p.vlozSoubor('input[type=file][accept*="pdf"]', pdf);
            await p.cekej(`${DATA}.impKrok === 'meritko'`, 60000, 'krok měřítko');
            await p.cekej(`${DATA}.pzSirka > 0`, 20000, 'načtení obrázku');
        });

        const info = await stav(`({ sirka: d.pzSirka, vyska: d.pzVyska, zoom: d.pzZoom })`);
        console.log(`   obrázek ${info.sirka}×${info.vyska} px, zoom ${(info.zoom * 100).toFixed(0)} %`);

        await krok('načtení magnetů z vektorů', async () => {
            await p.cekej(`${DATA}.pzMagnetuPocet > 0`, 90000, 'magnety');
        });
        console.log('   magnetů (koncových bodů):', await stav('d.pzMagnetuPocet'));

        await krok('zoom kolečkem ke kurzoru', async () => {
            const pred = await stav('d.pzZoom');
            await p.vyhodnot(`(() => { const d = ${DATA}; const vp = d.$refs.pzViewport.getBoundingClientRect();
                d.pzKolecko({ preventDefault(){}, clientX: vp.left + 300, clientY: vp.top + 200, deltaY: -100 }); return true; })()`);
            const po = await stav('d.pzZoom');
            if (!(po > pred * 1.1)) throw new Error(`zoom se nezměnil (${pred} → ${po})`);
        });

        await krok('magnet chytne konec čáry', async () => {
            // najít magnetický bod uprostřed výkresu a mířit 3 px vedle něj
            const test = await p.vyhodnot(`(() => { const d = ${DATA};
                // osamocený bod uprostřed výkresu (aby magnet neměl na výběr bližší)
                const vnitrni = d._pzBody.filter(b => b.x > d.pzSirka * 0.2 && b.x < d.pzSirka * 0.8
                    && b.y > d.pzVyska * 0.2 && b.y < d.pzVyska * 0.8);
                const b = vnitrni.find(b => !d._pzBody.some(o => o !== b && Math.hypot(o.x - b.x, o.y - b.y) < 60));
                if (!b) return null;
                const odsazeni = 3 / d.pzZoom;      // 3 px na obrazovce vedle
                const s = d.pzNajdiMagnet({ x: b.x + odsazeni, y: b.y + odsazeni });
                return s ? { druh: s.druh, odchylka: Math.hypot(s.x - b.x, s.y - b.y), odsazeni } : null; })()`);
            if (!test) throw new Error('magnet nechytil');
            // u konce čáry se smí chytit i sama čára (stejné pravidlo jako v kalkuliu) —
            // musí ale sedět na kresbě, ne někde vedle
            if (test.odchylka > test.odsazeni * 1.5) {
                throw new Error('magnet chytil něco daleko (' + test.odchylka.toFixed(1) + ' px)');
            }
            console.log('   magnet:', test.druh, '· odchylka od konce čáry', test.odchylka.toFixed(1), 'px');
        });

        await krok('kalibrace dvěma kliky', async () => {
            await proved(`d.impKalibZnovu(); d.pzNaSirku()`);
            await pauza(300);
            // body musí být právě vidět v okně prohlížeče, jinak klik mine
            const body = await p.vyhodnot(`(() => { const d = ${DATA};
                const vp = d.$refs.pzViewport.getBoundingClientRect();
                const vidi = (b) => {
                    const x = b.x * d.pzZoom + d.pzPanX, y = b.y * d.pzZoom + d.pzPanY;
                    return x > 40 && y > 40 && x < vp.width - 40 && y < vp.height - 40;
                };
                const viditelne = d._pzBody.filter(vidi);
                const a = viditelne[0];
                if (!a) return null;
                const b = viditelne.find(x => Math.hypot(x.x - a.x, x.y - a.y) > 150 / d.pzZoom);
                // JSON — jinak se z Alpine proxy přenesou prázdné objekty
                return b ? JSON.parse(JSON.stringify([{ x: a.x, y: a.y }, { x: b.x, y: b.y }])) : null; })()`);
            if (!body) throw new Error('nenašel jsem dva viditelné body');
            await klikDoVykresu(body[0].x, body[0].y);
            const poPrvnim = await stav('d.impKalibBody.length');
            if (poPrvnim !== 1) throw new Error('první klik se nezapsal (bodů: ' + poPrvnim + ')');
            await klikDoVykresu(body[1].x, body[1].y);
            await p.cekej(`${DATA}.impKalibBody.length === 2`, 8000, 'dva body kalibrace');
            await proved('d.impKalibMm = 5000');   // uživatel vyplní rozměr
            const r = await stav('d.impRozmerM()');
            if (!r) throw new Error('měřítko se nespočítalo');
            console.log(`   po kalibraci (5 m mezi body): výkres ${r.sirka.toFixed(1)} × ${r.vyska.toFixed(1)} m`);
        });

        await krok('výřez tažením', async () => {
            await proved(`d.pzNastroj = 'vyrez'`);
            const oblast = await p.vyhodnot(`(() => { const d = ${DATA}; const vp = d.$refs.pzViewport.getBoundingClientRect();
                const n = (x, y) => ({ x: vp.left + x * d.pzZoom + d.pzPanX, y: vp.top + y * d.pzZoom + d.pzPanY });
                return { a: n(d.pzSirka * 0.1, d.pzVyska * 0.1), b: n(d.pzSirka * 0.7, d.pzVyska * 0.7) }; })()`);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: Math.round(oblast.a.x), y: Math.round(oblast.a.y), button: 'left', clickCount: 1 });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: Math.round(oblast.b.x), y: Math.round(oblast.b.y), button: 'left' });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: Math.round(oblast.b.x), y: Math.round(oblast.b.y), button: 'left', clickCount: 1 });
            await pauza(300);
            const v = await stav('d.pzVyrez');
            if (!v || v.sirka < 20) throw new Error('výřez nevznikl');
            console.log('   výřez:', Math.round(v.sirka), '×', Math.round(v.vyska), 'px →', await stav('d.pzVyrezPopis()'));
            await p.snimek(path.join(vystup, 'prohlizec.png'));
        });

        await krok('Esc ruší akci, ne okno', async () => {
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
            await pauza(300);
            if (!await stav('d.impOtevren')) throw new Error('Esc zavřel celé okno');
            if (await stav('d.impKalibBody.length')) throw new Error('Esc nezrušil měření');
            // druhý Esc smaže výřez
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
            await pauza(300);
            if (await stav('d.pzVyrez')) throw new Error('Esc nezrušil výřez');
            if (!await stav('d.impOtevren')) throw new Error('Esc zavřel okno');
            // obnovit pro další krok
            await proved(`const mmNaPx = 0.0254 / d.impStranaData.dpi * 50 * 1000;
                d.impKalibBody = [{ x: 200, y: 200 }, { x: 200 + 1000 / mmNaPx, y: 200 }]; d.impKalibMm = 1000;
                d.pzVyrez = { x: d.pzSirka * 0.1, y: d.pzVyska * 0.1, sirka: d.pzSirka * 0.6, vyska: d.pzVyska * 0.6 }`);
        });

        await krok('vložení podkladu i s výřezem', async () => {
            await proved('d.impVloz()');
            await p.cekej(`!!${DATA}.podklad`, 10000, 'podklad');
            await pauza(2000);
            await p.snimek(path.join(vystup, 'editor.png'));
            const podklad = await stav('d.podklad');
            if (!podklad.vyrez) throw new Error('výřez se neuložil do podkladu');
            console.log('   podklad:', podklad.sirkaM.toFixed(1), '×', podklad.vyskaM.toFixed(1), 'm, výřez uložen');
        });

        const chyby = p.chyby.filter(t => !/favicon|mapy/i.test(t));
        console.log(chyby.length ? '\nChyby v konzoli:\n  ' + chyby.slice(0, 5).join('\n  ') : '\nŽádné chyby v konzoli.');
        console.log('Snímky:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
