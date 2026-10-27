/**
 * Historie jako časová osa: Ctrl+Z / Ctrl+Shift+Z i klik v panelu Historie
 * chodí po týchž krocích, nová úprava zahodí vrácené kroky a ukazatel přežije
 * obnovení stránky. Krok nese i polohu podkladu (dům posunutý i s podkladem).
 *
 * Spuštění: node services/import-test/test-historie-ui.cjs
 */
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const DATA = `Alpine.$data(document.querySelector('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1500, vyska: 950 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);
    const klavesa = async (key, { shift = false } = {}) => {
        const modifiers = 2 | (shift ? 8 : 0);   // Ctrl (+ Shift)
        const code = 'Key' + key.toUpperCase();
        const vk = key.toUpperCase().charCodeAt(0);
        // klik do prázdného plátna by měnil výběr — fokus stačí dát dokumentu
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key, code, modifiers, windowsVirtualKeyCode: vk });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: vk });
        await pauza(250);
    };
    const pozice = () => stav('d.historiePozice');
    const sten = () => stav('d.engine.walls.size');

    try {
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
            body: JSON.stringify({ nazev: 'ClaudeTest historie ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA} && ${DATA}.engine)`, 15000, 'Alpine po přesměrování');
        await proved(`d.panelOpen.historie = true`);

        console.log('\n1) Tři úpravy = tři kroky za výchozím');
        kontrola('nový koncept má výchozí krok', (await stav('d.historie.length')) === 1 && (await pozice()) === 0);
        for (const [i, popis] of ['Stěna A', 'Stěna B', 'Stěna C'].entries()) {
            await proved(`d.engine.addWall(0, ${i * 200}, 600, ${i * 200}, 0.3); d.renderer.render(); d.autoSave('${popis}')`);
        }
        kontrola('4 kroky, stojím na posledním', (await stav('d.historie.length')) === 4 && (await pozice()) === 3,
            JSON.stringify(await stav('d.historie.map(k => k.popis)')));
        await proved(`d.autoSave('Nic se nezměnilo')`);
        kontrola('autoSave bez změny kresby krok nepřidá', (await stav('d.historie.length')) === 4);

        console.log('\n2) Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y');
        await klavesa('z');
        kontrola('Ctrl+Z: o krok zpět', (await pozice()) === 2 && (await sten()) === 2);
        await klavesa('z');
        kontrola('Ctrl+Z: další krok zpět', (await pozice()) === 1 && (await sten()) === 1);
        await klavesa('z', { shift: true });
        kontrola('Ctrl+Shift+Z: o krok vpřed', (await pozice()) === 2 && (await sten()) === 2);
        await klavesa('y');
        kontrola('Ctrl+Y: o krok vpřed', (await pozice()) === 3 && (await sten()) === 3);
        await klavesa('z', { shift: true });
        kontrola('Vpřed na konci nic neudělá', (await pozice()) === 3);

        console.log('\n3) Panel Historie ukazuje polohu');
        await klavesa('z');
        const radky = await p.vyhodnot(`[...document.querySelectorAll('[data-krok]')].map(el => ({
            popis: el.innerText.split('\\n')[0], aktualni: el.className.includes('bg-primary/10'),
            preskrtnuto: !!el.querySelector('.line-through') }))`);
        kontrola('nejnovější krok je přeškrtnutý (vrácený)', radky[0]?.preskrtnuto && radky[0]?.popis === 'Stěna C', JSON.stringify(radky[0]));
        kontrola('aktuální krok je zvýrazněný', radky[1]?.aktualni && radky[1]?.popis === 'Stěna B', JSON.stringify(radky[1]));
        await p.snimek(path.join(vystup, 'historie-1-panel.png'));

        console.log('\n4) Klik v panelu = skok na krok');
        const bodZacatek = await p.vyhodnot(`(() => { const el = [...document.querySelectorAll('[data-krok]')].pop();
            el.scrollIntoView({ block: 'nearest' }); const r = el.getBoundingClientRect();
            return { x: Math.round(r.left + 20), y: Math.round(r.top + r.height / 2) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: bodZacatek.x, y: bodZacatek.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bodZacatek.x, y: bodZacatek.y, button: 'left', clickCount: 1 });
        await pauza(300);
        kontrola('klik na „Začátek“ vrátí prázdnou kresbu', (await pozice()) === 0 && (await sten()) === 0);
        await klavesa('z', { shift: true });
        kontrola('a Vpřed jde z něj dál', (await pozice()) === 1 && (await sten()) === 1);

        console.log('\n5) Nová úprava zahodí vrácené kroky');
        await proved(`d.engine.addWall(0, 900, 600, 900, 0.3); d.renderer.render(); d.autoSave('Stěna D')`);
        const popisy = await stav('d.historie.map(k => k.popis)');
        kontrola('za krokem „Stěna A“ je jen „Stěna D“', JSON.stringify(popisy) === JSON.stringify(['Začátek', 'Stěna A', 'Stěna D']),
            JSON.stringify(popisy));

        console.log('\n6) Obnovení stránky — historie i ukazatel ze serveru');
        await klavesa('z');
        await pauza(2800);
        const pred = { popisy: await stav('d.historie.map(k => k.popis)'), ids: await stav('d.historie.map(k => k.id)'), pozice: await pozice() };
        await p.vyhodnot('location.reload(); true');
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA} && ${DATA}.engine)`, 15000, 'po obnovení');
        kontrola('stejné kroky', JSON.stringify(await stav('d.historie.map(k => k.id)')) === JSON.stringify(pred.ids),
            JSON.stringify(await stav('d.historie.map(k => k.popis)')));
        kontrola('stojím na stejném kroku', (await pozice()) === pred.pozice && (await sten()) === 1,
            `pozice ${await pozice()}, stěn ${await sten()}`);
        await klavesa('z', { shift: true });
        kontrola('Vpřed funguje i po obnovení', (await pozice()) === 2 && (await sten()) === 2);

        console.log('\n7) Krok nese polohu podkladu');
        await p.vyhodnot(`(async () => { const d = ${DATA}; await d.impNactiDrive(); return true; })()`);
        const vykres = await stav('d.impDrive[0]');
        await proved(`d.podklad = { url: _kkInitData.routes.podkladNahled.replace(':otisk', '${vykres.otisk}').replace(':strana', 1),
            otisk: '${vykres.otisk}', strana: 1, sirkaM: 12, vyskaM: 9, stredX: 0, stredY: 0, uhel: 0, pruhlednost: 0.5, zobrazeni: 'pod' };
            d.renderer.nactiPodklad(d.podklad); d.podkladUloz()`);
        await p.cekej(`!!${DATA}.renderer._podkladImg`, 10000, 'podklad');
        // posun celého domu i s podkladem — stejně jako tažení (větev všech stěn)
        await proved(`d.engine.pushUndo();
            for (const n of d.engine.nodes.values()) { n.x += 100; n.y += 40; }
            d.podkladPosun(100, 40); d.renderer.render(); d.podkladUloz(); d.autoSave('Posun stěny')`);
        kontrola('podklad posunutý', (await stav('d.podklad.stredX')) === 100);
        await pauza(2800);
        await p.vyhodnot('location.reload(); true');
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA} && ${DATA}.renderer?._podkladImg)`, 15000, 'podklad po obnovení');
        await klavesa('z');
        kontrola('Zpět po obnovení vrátí podklad', (await stav('d.podklad.stredX')) === 0 && (await stav('d.renderer._podkladImg.x()')) === 0,
            `stredX ${await stav('d.podklad.stredX')}`);
        await klavesa('z', { shift: true });
        kontrola('Vpřed ho zase posune', (await stav('d.podklad.stredX')) === 100);

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0,
            chyby.slice(0, 3).map(c => c.text + ' ' + (c.url || '')).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'historie-chyba.png')).catch(() => {});
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
