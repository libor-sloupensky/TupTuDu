/**
 * Sloučení stěn v prohlížeči: madlo se nabídne nad uzlem, skutečný klik
 * myší ho spustí a stěny se spojí.
 *
 * Node test (test-spoj-sten.cjs) hlídá geometrii, tenhle to, že se k ní
 * uživatel vůbec doklikne — madlo musí být vidět a trefitelné.
 *
 * Spuštění: node services/import-test/test-spoj-ui.cjs
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
            body: JSON.stringify({ nazev: 'ClaudeTest sloučení ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');

        // Stěna rozdělená v polovině + příčka do T, jako po odpojení příčky.
        console.log('\n1) Příprava: rozdělená stěna + napojená příčka');
        const ids = await p.vyhodnot(`(() => { const d = ${DATA}; const e = d.engine;
            e.walls.clear(); e.nodes.clear(); e.openings.clear();
            const w = e.addWall(0, 0, 1000, 0, 0.3);
            const n = e.addNode(500, 0);
            const w2 = e.splitWall(w.id, 0.5, n.id);
            const pr = e.addWall(250, 400, 250, 0, 0.15);
            pr.doConstraint = { host: w.id, t: 0.5 };
            d.nastroj = 'vyber';   // nástroj se pamatuje v localStorage — jiný test mohl nechat Stěnu
            d.renderer.render(); d.fitView(); d.renderer.render();
            return { uzel: n.id, w1: w.id, w2, pricka: pr.id, volny: pr.nodeA }; })()`);
        kontrola('vznikly tři stěny', (await stav('d.engine.walls.size')) === 3);

        console.log('\n2) Madlo se nabídne až po výběru uzlu');
        kontrola('bez výběru není madlo',
            (await stav(`d.renderer.selectionLayer.find('.spojMadlo').length`)) === 0);

        // Skutečný klik na bod spoje — tak se k madlu dostane uživatel.
        const uzelBod = await p.vyhodnot(`(() => { const d = ${DATA};
            const n = d.engine.nodes.get('${ids.uzel}');
            const t = d.stage.getAbsoluteTransform().copy().point({ x: n.x, y: n.y });
            const r = d.stage.container().getBoundingClientRect();
            return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: uzelBod.x, y: uzelBod.y, button: 'none' });
        await pauza(120);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: uzelBod.x, y: uzelBod.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: uzelBod.x, y: uzelBod.y, button: 'left', clickCount: 1 });
        await pauza(400);

        kontrola('klik na bod spoje uzel vybral',
            (await stav(`[...d.renderer.selectedNodes][0]`)) === ids.uzel);
        kontrola('po kliku na bod je madlo vidět',
            (await stav(`d.renderer.selectionLayer.find('.spojMadlo').length`)) === 1);

        const volnyPred = await stav(`(() => { const n = d.engine.nodes.get('${ids.volny}'); return { x: n.x, y: n.y }; })()`);
        await p.snimek(path.join(vystup, 'spoj-1-madlo.png'));

        console.log('\n3) Skutečný klik myší na madlo');
        const bod = await p.vyhodnot(`(() => { const d = ${DATA};
            const madlo = d.renderer.selectionLayer.findOne('.spojMadlo');
            const abs = madlo.getAbsolutePosition();
            const r = d.stage.container().getBoundingClientRect();
            return { x: Math.round(r.left + abs.x), y: Math.round(r.top + abs.y) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bod.x, y: bod.y, button: 'none' });
        await pauza(120);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: bod.x, y: bod.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bod.x, y: bod.y, button: 'left', clickCount: 1 });
        await pauza(600);

        kontrola('ze dvou půlek je jedna stěna', (await stav('d.engine.walls.size')) === 2,
            'stěn: ' + await stav('d.engine.walls.size'));
        kontrola('uzel spoje zmizel', !(await stav(`!!d.engine.nodes.get('${ids.uzel}')`)));
        kontrola('madlo po sloučení zmizelo',
            (await stav(`d.renderer.selectionLayer.find('.spojMadlo').length`)) === 0);

        const volnyPo = await stav(`(() => { const n = d.engine.nodes.get('${ids.volny}'); return { x: n.x, y: n.y }; })()`);
        kontrola('volný konec příčky se nehnul',
            Math.abs(volnyPred.x - volnyPo.x) < 0.01 && Math.abs(volnyPred.y - volnyPo.y) < 0.01,
            `${volnyPred.x},${volnyPred.y} → ${volnyPo.x},${volnyPo.y}`);
        kontrola('příčka drží napojení na sloučenou stěnu',
            (await stav(`d.engine.walls.get('${ids.pricka}')?.doConstraint?.host`)) === ids.w1);

        await p.snimek(path.join(vystup, 'spoj-2-po-slouceni.png'));

        console.log('\n4) Zpět (Ctrl+Z) vrátí spoj');
        await proved('d.engine.undo(); d.renderer.render()');
        await pauza(300);
        kontrola('stěny jsou zase tři', (await stav('d.engine.walls.size')) === 3);

        // Text hlášky je u síťových chyb vždy stejný, rozliší je až URL —
        // filtrovat se proto musí podle detailu, ne podle textu.
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
