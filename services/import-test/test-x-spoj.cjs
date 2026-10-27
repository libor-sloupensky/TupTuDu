/**
 * Křížení (X): konec stěny nesmí přeskočit na druhý líc hostitele.
 *
 * Když z každé strany hostitele visí jedna příčka, dělí jejich konce jen
 * tloušťka zdi — u 14cm příčky 11 px, tedy míň než dosah magnetu uzlů (16 px).
 * Puštěný konec se proto sloučil s uzlem na protějším líci a příčka skončila
 * na druhé straně zdi (hlášeno na Kováčové, W106).
 *
 * Spuštění: node services/import-test/test-x-spoj.cjs
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
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1300, vyska: 900 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);

    const naObraz = (x, y) => p.vyhodnot(`(() => { const d = ${DATA};
        const r = d.stage.container().getBoundingClientRect();
        const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x}, y: ${y} });
        return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);

    const tahni = async (zX, zY, naX, naY) => {
        const od = await naObraz(zX, zY);
        const kam = await naObraz(naX, naY);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: od.x, y: od.y, button: 'none' });
        await pauza(120);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: od.x, y: od.y, button: 'left', clickCount: 1 });
        for (let i = 1; i <= 6; i++) {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', buttons: 1, button: 'left',
                x: Math.round(od.x + (kam.x - od.x) * i / 6), y: Math.round(od.y + (kam.y - od.y) * i / 6) });
            await pauza(70);
        }
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: kam.x, y: kam.y, button: 'left', clickCount: 1 });
        await pauza(450);
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
            body: JSON.stringify({ nazev: 'ClaudeTest X spoj ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA})`, 15000, 'Alpine po přesměrování');

        // Líc 14cm zdi leží při 80 px/m jen 5,6 px od osy — odtud ta čísla.
        const pulHost = await stav(`0.14 * d.engine.PX_PER_M / 2`);
        const osa = 400;
        const licNahore = osa - pulHost, licDole = osa + pulHost;

        console.log('\n1) Křížení — konec nesmí přeskočit přes zeď');
        const ids = await p.vyhodnot(`(() => { const d = ${DATA}; const e = d.engine;
            e.walls.clear(); e.nodes.clear(); e.openings.clear();
            const host = e.addWall(200, ${osa}, 800, ${osa}, 0.14);
            const b = e.addWall(500, 600, 500, ${licDole}, 0.10);
            b.doConstraint = { host: host.id, t: 0.5 };
            const a = e.addWall(500, 150, 500, 360, 0.10);
            d.nastroj = 'vyber'; d.renderer.render(); d.fitView(); d.renderer.render();
            return { host: host.id, a: a.id, b: b.id }; })()`);

        await tahni(500, 360, 500, licNahore);
        const po = await stav(`(() => {
            const a = d.engine.walls.get('${ids.a}');
            const b = d.engine.walls.get('${ids.b}');
            const ua = a && d.engine.nodes.get(a.nodeB);
            const ub = b && d.engine.nodes.get(b.nodeB);
            return { y: ua ? Math.round(ua.y * 100) / 100 : null,
                     sdileny: !!(ua && ub && ua.id === ub.id) }; })()`);
        kontrola('konec zůstal nad osou hostitele', po.y !== null && po.y < osa + 0.5,
            'y = ' + po.y + ' (osa ' + osa + ')');
        kontrola('neslil se s uzlem na protějším líci', po.sdileny === false);

        console.log('\n2) Běžné připojení (na druhé straně nic) se nerozbilo');
        await p.vyhodnot(`(() => { const d = ${DATA}; const e = d.engine;
            e.walls.clear(); e.nodes.clear();
            e.addWall(200, ${osa}, 800, ${osa}, 0.14);
            e.addWall(500, 150, 500, 360, 0.10);
            d.renderer.render(); d.fitView(); d.renderer.render(); return true; })()`);
        await tahni(500, 360, 500, licNahore);
        const po2 = await stav(`(() => {
            const a = [...d.engine.walls.values()].find(w => w.tloustka === 0.10);
            const u = a && d.engine.nodes.get(a.nodeB);
            return { y: u ? Math.round(u.y * 100) / 100 : null,
                     vazba: a && a.doConstraint ? a.doConstraint.host : null,
                     stenSdilenych: a ? d.engine.getNodeWalls(a.nodeB).length : 0 }; })()`);
        kontrola('konec dosedl na hostitele', po2.y !== null && Math.abs(po2.y - osa) < 8,
            'y = ' + po2.y);
        kontrola('vzniklo napojení (vazba nebo sdílený uzel)',
            !!po2.vazba || po2.stenSdilenych > 1,
            'vazba ' + po2.vazba + ', stěn v uzlu ' + po2.stenSdilenych);

        console.log('\n3) Slučování rohů dvou volných konců funguje dál');
        await p.vyhodnot(`(() => { const d = ${DATA}; const e = d.engine;
            e.walls.clear(); e.nodes.clear();
            e.addWall(200, 200, 500, 200, 0.10);
            e.addWall(500, 500, 500, 240, 0.10);
            d.renderer.render(); d.fitView(); d.renderer.render(); return true; })()`);
        await tahni(500, 240, 500, 200);
        const po3 = await stav(`(() => {
            const sviss = [...d.engine.walls.values()].find(w => {
                const a = d.engine.nodes.get(w.nodeA), b = d.engine.nodes.get(w.nodeB);
                return Math.abs(a.x - b.x) < Math.abs(a.y - b.y); });
            return sviss ? d.engine.getNodeWalls(sviss.nodeB).length : 0; })()`);
        kontrola('roh se sloučil (v uzlu jsou dvě stěny)', po3 >= 2, po3 + ' stěn v uzlu');

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
