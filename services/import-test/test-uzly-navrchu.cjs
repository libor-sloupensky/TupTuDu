/**
 * Bod spoje musí být nad otvory i nábytkem — opticky i pro klikání.
 *
 * Posuvné dveře mají pouzdro, které přesahuje přes konec stěny, a kreslí se
 * (stejně jako nábytek) v překryvné vrstvě NAD stěnami. Dokud uzly seděly
 * ve vrstvě stěn, překryly je a na bod spoje se nedalo kliknout.
 *
 * Spuštění: node services/import-test/test-uzly-navrchu.cjs
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
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1200, vyska: 900 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);

    /** Co leží navrchu na daném místě plátna. */
    const navrchu = (x, y) => p.vyhodnot(`(() => { const d = ${DATA};
        const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x}, y: ${y} });
        const shape = d.stage.getIntersection({ x: t.x, y: t.y });
        if (!shape) return 'nic';
        return d.renderer.hitTest(shape).type; })()`);

    const klikNa = async (x, y) => {
        const b = await p.vyhodnot(`(() => { const d = ${DATA};
            const r = d.stage.container().getBoundingClientRect();
            const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x}, y: ${y} });
            return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'none' });
        await pauza(100);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(300);
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
            body: JSON.stringify({ nazev: 'ClaudeTest uzlu nad otvory ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');

        console.log('\n1) Posuvné dveře přes bod spoje');
        await proved(`const e = d.engine; e.walls.clear(); e.nodes.clear(); e.openings.clear(); e.vybaveni = [];
            const svisla = e.addWall(600, 150, 600, 750, 0.45);
            const vodorovna = e.addWall(150, 400, 600, 400, 0.15);
            vodorovna.doConstraint = { host: svisla.id, t: (400 - 150) / 600 };
            e.addOpening(vodorovna.id, 3.3, 1.2, 'dvere', { smer: 'posuvne', strana: 'out' });
            d.renderer.render(); d.fitView(); d.renderer.render()`);

        kontrola('na bodu spoje je navrchu uzel', (await navrchu(600, 400)) === 'node',
            await navrchu(600, 400));

        await klikNa(600, 400);
        const vybrano = await stav(`[...d.renderer.selectedNodes]`);
        kontrola('klik bod spoje vybral', vybrano.length === 1, JSON.stringify(vybrano));

        console.log('\n2) Nábytek přes bod spoje');
        await proved(`d.renderer.clearSelection();
            d.engine.vybaveni = [{ id: 'V900', typ: 'Generic', stred: [6.0, -4.0],
                sirka: 1.2, hloubka: 1.2, uhel: 0, tvar: 'rect',
                polygon: [[5.4,-3.4],[6.6,-3.4],[6.6,-4.6],[5.4,-4.6]] }];
            d.renderer.showVybaveni = true; d.renderer.render()`);
        kontrola('nábytek se vykreslil', (await stav('d.engine.vybaveni.length')) === 1);
        kontrola('na bodu spoje je pořád navrchu uzel', (await navrchu(600, 400)) === 'node',
            await navrchu(600, 400));

        await klikNa(600, 400);
        const vybrano2 = await stav(`[...d.renderer.selectedNodes]`);
        kontrola('klik přes nábytek vybral uzel', vybrano2.length === 1, JSON.stringify(vybrano2));

        console.log('\n3) Vypnutí objektů skryje i body spojů');
        await proved(`d.showObjekty = false; d.toggleObjekty()`);
        await pauza(200);
        kontrola('vrstva uzlů je skrytá', (await stav('d.renderer.nodeLayer.visible()')) === false);
        await proved(`d.showObjekty = true; d.toggleObjekty()`);
        await pauza(200);
        kontrola('po zapnutí je zase vidět', (await stav('d.renderer.nodeLayer.visible()')) === true);

        await p.snimek(path.join(vystup, 'uzly-nad-otvory.png'));

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
