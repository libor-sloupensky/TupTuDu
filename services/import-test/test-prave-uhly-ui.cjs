/**
 * Pravé úhly v prohlížeči: co vznikne skutečným kreslením myší.
 *
 * Node test (test-prave-uhly.cjs) hlídá samotný výpočet, tenhle to, že se
 * srovnání opravdu spustí po dokončené úpravě — a že uživatel nemusí nic dělat.
 *
 * Spuštění: node services/import-test/test-prave-uhly-ui.cjs
 */
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
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1500, vyska: 950 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);

    /** Odchylky všech stěn od pravého úhlu, ve stupních. */
    const odchylky = () => p.vyhodnot(`(() => { const d = ${DATA};
        return [...d.engine.walls.values()].map(w => {
            const a = d.engine.nodes.get(w.nodeA), b = d.engine.nodes.get(w.nodeB);
            const m = ((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) % 90 + 90) % 90;
            return Math.round(Math.min(m, 90 - m) * 1000) / 1000;
        }); })()`);

    const naObraz = (x, y) => p.vyhodnot(`(() => { const d = ${DATA};
        const b = d.stage.container().getBoundingClientRect();
        const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x}, y: ${y} });
        return { x: Math.round(b.left + t.x), y: Math.round(b.top + t.y) }; })()`);

    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'none' });
        await pauza(90);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(160);
    };

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
            body: JSON.stringify({ nazev: 'ClaudeTest pravých úhlů ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');

        console.log('\n1) Dvě svislé stěny, jedna o 0,1° mimo — jako po ručním kreslení');
        await proved(`const e = d.engine; e.walls.clear(); e.nodes.clear();
            e.addWall(300, 500, 300, 200, 0.3);
            const rad = (90 - 0.1) * Math.PI / 180;
            e.addWall(700, 500, 700 + Math.cos(rad) * -300, 500 - Math.sin(rad) * 300, 0.3);
            d.nastroj = 'stena'; d.renderer.render()`);
        const pred = await odchylky();
        kontrola('jedna stěna je křivá', Math.max(...pred) > 0.05, JSON.stringify(pred));

        console.log('\n2) Nakreslení vodorovné stěny mezi ně srovná i tu křivou');
        await klik(await naObraz(300, 200));
        const konec = await naObraz(700, 197);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: konec.x, y: konec.y, button: 'none' });
        await pauza(150);
        await klik(konec);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await pauza(400);

        const po = await odchylky();
        kontrola('všechny stěny jsou přesně v pravém úhlu', Math.max(...po) < 0.001, JSON.stringify(po));
        kontrola('vznikla třetí stěna', po.length === 3, po.length + ' stěn');

        console.log('\n3) Záměrně šikmá stěna se nesrovná');
        await proved(`d.engine.pushUndo(); d.engine.addWall(350, 250, 650, 420, 0.15); d.renderer.render()`);
        // dotáhnout libovolný uzel, aby se srovnání spustilo
        const uzel = await stav(`[...d.engine.nodes.values()][0].id`);
        await proved(`d.engine.srovnejPraveUhly(d.PRAVY_UHEL_TOLERANCE_DEG); d.renderer.render()`);
        const sikma = await p.vyhodnot(`(() => { const d = ${DATA};
            const w = [...d.engine.walls.values()].find(w => w.tloustka === 0.15);
            const a = d.engine.nodes.get(w.nodeA), b = d.engine.nodes.get(w.nodeB);
            const u = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
            return Math.round(u * 100) / 100; })()`);
        kontrola('šikmá stěna si drží svůj úhel', Math.abs(sikma - 29.54) < 1, sikma + '°');

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0,
            chyby.slice(0, 3).map(c => c.text + ' ' + (c.url || '')).join(' | '));
    } finally {
        await p.zavri();
    }

    console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
    process.exit(chyb === 0 ? 0 : 1);
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
