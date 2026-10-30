/**
 * Šikmá stěna napojená na okraj jde po líci dorazit až do rohu — okraj
 * jejího zkoseného čela lícuje s koncem líce. Dřív ji zastavila pevná mez
 * 2 % délky hostitele (Klemov W64 na W3: chybělo 6 cm).
 *
 * Spuštění: node services/import-test/test-napojeni-roh-ui.cjs
 */
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const tahni = async (od, kam, kroku = 14) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: od.x, y: od.y, button: 'none' });
        await pauza(80);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: od.x, y: od.y, button: 'left', clickCount: 1, buttons: 1 });
        for (let i = 1; i <= kroku; i++) {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', button: 'left', buttons: 1,
                x: Math.round(od.x + (kam.x - od.x) * i / kroku), y: Math.round(od.y + (kam.y - od.y) * i / kroku) });
            await pauza(35);
        }
        await pauza(200);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: kam.x, y: kam.y, button: 'left', clickCount: 1 });
        await pauza(400);
    };

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(1500);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 15000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest napojení do rohu ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');

        // Roh do L: hostitel vodorovně (0,0)→(800,0), soused nahoru. Spodní líc
        // hostitele je tedy vnější a v rohu přesahuje uzel o půl tloušťky (12 px).
        const id = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine;
            const host = e.addWall(0, 0, 800, 0, 0.3);
            const soused = e.addWall(0, 0, 0, -400, 0.3);
            soused.nodeA = host.nodeA; e._cleanOrphanNodes();
            const dite = e.addWall(250, 380, 400, 60, 0.3);
            d.renderer.render(); const st = d.stage; const s = 1.6; st.scale({ x: s, y: s });
            st.position({ x: st.width() / 2 - 180 * s, y: st.height() / 2 - 90 * s }); d.zoom = s;
            d.renderer.renderGrid(); d.renderer.render();
            return { host: host.id, dite: dite.id, uzel: dite.nodeB }; })()`);

        console.log('\n1) Napojení šikmé stěny na vnější líc');
        await tahni(await naObr(400, 60), await naObr(400, 20));
        const vazba = await p.vyhodnot(`JSON.stringify(${D}.engine.walls.get('${id.dite}').doConstraint)`);
        kontrola('stěna je napojená na hostitele', vazba && vazba.includes(id.host), vazba);

        console.log('\n2) Tažení po líci až za roh');
        const u = await p.vyhodnot(`(() => { const n = ${D}.engine.nodes.get('${id.uzel}'); return { x: n.x, y: n.y }; })()`);
        await tahni(await naObr(u.x, u.y), await naObr(-150, 14), 24);
        const stav = await p.vyhodnot(`(() => { const d = ${D}, e = d.engine;
            const n = e.nodes.get('${id.uzel}'); const poly = e.getWallPolygon('${id.dite}');
            const lic = e.getWallPolygon('${id.host}');
            return { uzel: { x: n.x, y: n.y }, vazba: JSON.parse(JSON.stringify(e.walls.get('${id.dite}').doConstraint ?? null)),
                     celo: poly.map(b => ({ x: b.x, y: b.y })), rohLice: lic.map(b => ({ x: b.x, y: b.y })) }; })()`);
        // body čela, které leží na líci (y = 12)
        const naLici = stav.celo.filter(b => Math.abs(b.y - 12) < 0.5).map(b => b.x);
        const rohX = Math.min(...stav.rohLice.filter(b => Math.abs(b.y - 12) < 0.5).map(b => b.x));
        kontrola('uzel zůstal na líci', Math.abs(stav.uzel.y - 12) < 0.5, 'y = ' + stav.uzel.y.toFixed(2));
        kontrola('vazba drží', stav.vazba && stav.vazba.host === id.host, JSON.stringify(stav.vazba));
        kontrola('okraj čela lícuje s rohem líce', naLici.length === 2 && Math.abs(Math.min(...naLici) - rohX) < 0.5,
            'čelo od x = ' + Math.min(...naLici).toFixed(2) + ', roh líce x = ' + rohX.toFixed(2));
        kontrola('dál než stará mez 2 % (x = 16)', stav.uzel.x < 16 - 1, 'uzel x = ' + stav.uzel.x.toFixed(2));
        await p.snimek(path.join(vystup, 'napojeni-roh.png'));

        console.log('\n3) Posun hostitele dítě neodsune');
        await p.vyhodnot(`(() => { const d = ${D}, e = d.engine; e.syncTChildrenT('${id.host}'); return true; })()`);
        const t = await p.vyhodnot(`${D}.engine.walls.get('${id.dite}').doConstraint.t`);
        kontrola('uložené t odpovídá poloze uzlu', Math.abs(t * 800 - stav.uzel.x) < 0.5, 't·L = ' + (t * 800).toFixed(2));

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'napojeni-roh-chyba.png')).catch(() => {});
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
