/**
 * Ověření průvodce importem (fáze F1) v reálném prohlížeči:
 * přihlášení → nový koncept → nahrání PDF → výběr strany → měřítko → vložení podkladu.
 *
 * Spuštění (běžící lokální server):
 *   node services/import-test/test-podklad.js <cesta-k-pdf> [vystupni-slozka]
 */
const fs = require('fs');
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8000';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';

async function main() {
    const pdf = process.argv[2];
    const vystup = process.argv[3] || path.join(__dirname, 'vystup');
    if (!pdf || !fs.existsSync(pdf)) {
        console.error('Zadejte cestu k PDF s půdorysem.');
        process.exit(1);
    }
    fs.mkdirSync(vystup, { recursive: true });

    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1' });
    const krok = async (popis, fn) => {
        process.stdout.write(popis.padEnd(42));
        try { await fn(); console.log('OK'); }
        catch (e) { console.log('CHYBA — ' + e.message); throw e; }
    };

    try {
        await krok('přihlášení', async () => {
            await p.jdiNa(ZAKLAD + '/login');
            await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
                document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
                document.querySelector('form').submit(); true`);
            await pauza(1500);
            await p.cekej(`location.pathname.startsWith('/masterteam')`, 15000, 'přihlášení');
        });

        await krok('otevření Konceptu V3', async () => {
            await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
            await p.cekej(`!!(window.Alpine && document.querySelector('[x-data]') && Alpine.$data(document.querySelector('[x-data]')))`, 15000, 'Alpine komponenta');
        });

        // Alpine komponenta (pro čtení stavu i volání metod)
        const stav = (vyraz) => p.vyhodnot(`(() => { const d = Alpine.$data(document.querySelector('[x-data]')); return JSON.parse(JSON.stringify(${vyraz} ?? null)); })()`);

        await krok('nový koncept', async () => {
            const maId = await stav('!!d.projektId');
            if (maId) return;
            await p.vyhodnot(`(async () => { const d = Alpine.$data(document.querySelector('[x-data]'));
                const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
                    headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
                    body: JSON.stringify({ nazev: 'Test importu' }) });
                const j = await r.json(); location.href = j.redirect; })()`);
            await pauza(2500);
            await p.cekej(`location.search.includes('id=')`, 15000, 'přesměrování na koncept');
            await p.cekej(`!!(window.Alpine && document.querySelector('[x-data]') && Alpine.$data(document.querySelector('[x-data]')))`, 15000, 'Alpine po přesměrování');
        });

        await krok('otevření průvodce', async () => {
            await p.vyhodnot(`Alpine.$data(document.querySelector('[x-data]')).impOtevri(); true`);
            await p.cekej(`Alpine.$data(document.querySelector('[x-data]')).impKrok === 'soubor'`, 5000, 'krok soubor');
        });

        await krok('nahrání výkresu', async () => {
            await p.vlozSoubor('input[type=file][accept*="pdf"]', pdf);
            await p.cekej(`['strana','meritko'].includes(Alpine.$data(document.querySelector('[x-data]')).impKrok)`, 40000, 'zpracování souboru');
        });

        const krokPoNahrani = await stav('d.impKrok');
        if (krokPoNahrani === 'strana') {
            await krok('výběr strany s půdorysem', async () => {
                await p.snimek(path.join(vystup, '1-strany.png'));
                await p.vyhodnot(`Alpine.$data(document.querySelector('[x-data]')).impVyberStranu(1); true`);
                await p.cekej(`Alpine.$data(document.querySelector('[x-data]')).impKrok === 'meritko'`, 40000, 'příprava strany');
            });
        }

        await krok('měřítko a náhled', async () => {
            await p.cekej(`!!Alpine.$data(document.querySelector('[x-data]')).impStranaData?.obrazek`, 20000, 'obrázek strany');
            await pauza(1200);
            await p.snimek(path.join(vystup, '2-meritko.png'));
        });

        // měřítko se vždy měří ve výkresu — nastavíme dva body a známý rozměr
        await p.vyhodnot(`(() => { const d = Alpine.$data(document.querySelector('[x-data]'));
            d.impKalibBody = [{ x: 100, y: 100 }, { x: 100 + 1000 / (0.0254 / d.impStranaData.dpi * 50), y: 100 }];
            d.impKalibMm = 1000; return true; })()`);
        const info = await stav(`({ rozmer: d.impRozmerM(), platne: d.impMeritkoPlatne() })`);
        console.log('   po změření: rozměr výkresu', info.rozmer ? info.rozmer.sirka.toFixed(1) + ' × ' + info.rozmer.vyska.toFixed(1) + ' m' : '—');

        await krok('vložení podkladu do editoru', async () => {
            await p.vyhodnot(`Alpine.$data(document.querySelector('[x-data]')).impVloz(); true`);
            await p.cekej(`!!Alpine.$data(document.querySelector('[x-data]')).podklad`, 10000, 'podklad ve stavu');
            await p.cekej(`!!Alpine.$data(document.querySelector('[x-data]')).renderer?.stavPodkladu()`, 10000, 'podklad v rendereru');
            await pauza(2500);
            await p.snimek(path.join(vystup, '3-editor.png'));
        });

        const podklad = await stav('d.podklad');
        console.log('   podklad:', podklad.sirkaM.toFixed(1), '×', podklad.vyskaM.toFixed(1), 'm,',
            'm/px =', podklad.metryNaPx.toFixed(5));

        await krok('uložení a znovunačtení stránky', async () => {
            await pauza(1500);
            await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3?id=' + await stav('d.projektId'));
            await p.cekej(`!!(window.Alpine && document.querySelector('[x-data]') && Alpine.$data(document.querySelector('[x-data]')))`, 15000, 'Alpine po reloadu');
            await p.cekej(`!!Alpine.$data(document.querySelector('[x-data]')).podklad`, 15000, 'podklad po reloadu');
            await pauza(2500);
            await p.snimek(path.join(vystup, '4-po-reloadu.png'));
        });

        const chyby = p.chyby.filter(t => !/favicon|mapy\.cz|api\.mapy/i.test(t));
        if (p.spatneOdpovedi.length) {
            console.log('\nHTTP chyby:\n  ' + [...new Set(p.spatneOdpovedi)].join('\n  '));
        }
        console.log(chyby.length ? '\nChyby v konzoli:\n  ' + chyby.slice(0, 5).join('\n  ') : '\nŽádné chyby v konzoli.');
        console.log('Snímky:', vystup);
    } finally {
        await p.zavri();
    }
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
