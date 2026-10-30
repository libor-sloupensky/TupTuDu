/**
 * Kreslení stěny: začátek na stávající stěně (bod 4), jednotný dosah magnetu
 * (6a), vodítka zarovnání s jinými rohy (6c) a vodicí osa úhlu (6d).
 *
 * Spuštění: node services/import-test/test-voditka-ui.cjs
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
const blizko = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: +(r.left + t.x).toFixed(2), y: +(r.top + t.y).toFixed(2) }; })()`);
    const pohyb = async (b) => { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(60); };
    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(250);
    };
    const esc = async () => { await p.cmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await pauza(200); };
    // Čistý výkres a pohled: měřítko s, střed pohledu (cx, cy)
    const vycisti = (s, cx, cy, steny) => p.vyhodnot(`(() => { const d = ${D}, e = d.engine;
        for (const id of [...e.walls.keys()]) e.removeWall(id); e._cleanOrphanNodes?.();
        const ids = ${JSON.stringify(steny)}.map(w => e.addWall(w[0], w[1], w[2], w[3], 0.3).id);
        const st = d.stage; st.scale({ x: ${s}, y: ${s} }); d.zoom = ${s};
        st.position({ x: st.width() / 2 - ${cx} * ${s}, y: st.height() / 2 - ${cy} * ${s} });
        d.renderer.poZmeneZoomu(); d.renderer.render(); d.nastroj = 'vyber'; d.nastroj = 'stena'; return ids; })()`);
    const tazenyUzel = () => p.vyhodnot(`(() => { const d = ${D}; const n = d.engine.nodes.get(d.draggingNodeId); return n ? { x: n.x, y: n.y } : null; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest vodítka ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');

        console.log('\n1) Bod 4: začátek na líci stávající stěny');
        let [host] = await vycisti(1, 200, 150, [[0, 0, 400, 0]]);
        await pohyb(await naObr(200, 15));            // 3 px pod spodním lícem (y = 12)
        let st = await p.vyhodnot(`(() => { const d = ${D}; const sp = d._snapPreview;
            return { nahled: sp && sp.zacatek ? { x: sp.point.x, y: sp.point.y, rezim: sp.rezim, wall: sp.wall.id } : null, klic: d._magnetKlic,
                     znacka: d._kurzorZnacka && d._kurzorZnacka.visible() ? { x: d._kurzorZnacka.x(), y: d._kurzorZnacka.y() } : null }; })()`);
        kontrola('před klikem zelený náhled na líci', st.nahled && st.nahled.wall === host && st.nahled.rezim === 'okraj' && blizko(st.nahled.y, 12), JSON.stringify(st));
        kontrola('značka skočila na líc', st.znacka && blizko(st.znacka.y, 12) && blizko(st.znacka.x, 200, 0.6), JSON.stringify(st.znacka));
        await klik(await naObr(200, 15));
        await pohyb(await naObr(203, 150));
        await pohyb(await naObr(203, 300));           // 0,6° od kolmice
        const konec1 = await tazenyUzel();
        const uhly1 = await p.vyhodnot(`${D}.stage.find('Label').map(l => l.getText().text()).concat(${D}.stage.find('Text').map(t => t.text())).filter(t => /°$/.test(t))`);
        kontrola('konec zacvakl kolmo k hostiteli (x = 200)', konec1 && blizko(konec1.x, 200), JSON.stringify(konec1));
        kontrola('úhel k hostiteli je vidět už při kreslení', uhly1.includes('90°'), JSON.stringify(uhly1));
        await klik(await naObr(203, 300));
        await esc();
        let r = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = [...e.walls.values()].find(x => x.id !== '${host}');
            const a = e.nodes.get(w.nodeA); return { zacatek: { x: a.x, y: a.y }, vazba: w.odConstraint ? { ...w.odConstraint } : null, sten: e.walls.size }; })()`);
        kontrola('začátek je napojený na hostitele', r.vazba && r.vazba.host === host && blizko(r.vazba.t, 0.5, 0.005), JSON.stringify(r));
        kontrola('začátek leží přesně na líci', blizko(r.zacatek.y, 12) && blizko(r.zacatek.x, 200), JSON.stringify(r.zacatek));

        console.log('\n2) Bod 4: začátek na ose stěny = střih');
        [host] = await vycisti(1, 200, 150, [[0, 0, 400, 0]]);
        await pohyb(await naObr(200, 1));
        st = await p.vyhodnot(`(() => { const sp = ${D}._snapPreview; return sp && sp.zacatek ? sp.rezim : null; })()`);
        kontrola('náhled hlásí střih', st === 'strih', String(st));
        await klik(await naObr(200, 1));
        await pohyb(await naObr(200, -150)); await pohyb(await naObr(200, -300));
        await klik(await naObr(200, -300));
        await esc();
        r = await p.vyhodnot(`(() => { const e = ${D}.engine; const nova = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.x - b.x) < 1; });
            return { sten: e.walls.size, vUzlu: e.getNodeWalls(nova.nodeA).length, vazba: nova.odConstraint }; })()`);
        kontrola('hostitel je rozstřižený na dvě stěny, spoj má 3 stěny', r.sten === 3 && r.vUzlu === 3 && !r.vazba, JSON.stringify(r));

        console.log('\n3) Bod 4: Esc před dokončením nenechá zeď rozstřiženou');
        [host] = await vycisti(1, 200, 150, [[0, 0, 400, 0]]);
        await pohyb(await naObr(200, 1));
        await klik(await naObr(200, 1));
        await pohyb(await naObr(200, -150));
        await esc();
        r = await p.vyhodnot(`${D}.engine.walls.size`);
        kontrola('zůstala jen původní stěna', r === 1, r + ' stěn');

        console.log('\n4) 6a: dosah magnetu podle obrazovky');
        await vycisti(2, 400, 0, [[0, 0, 400, 0]]);
        await pohyb(await naObr(410, 0));             // 10 px výkresu = 20 px obrazovky
        r = await p.vyhodnot(`${D}._magnetKlic`);
        kontrola('přiblíženo 200 %: 20 px obrazovky od rohu už nechytá', r === '', JSON.stringify(r));
        await vycisti(0.5, 400, 0, [[0, 0, 400, 0]]);
        await pohyb(await naObr(420, 0));             // 20 px výkresu = 10 px obrazovky
        r = await p.vyhodnot(`${D}._magnetKlic`);
        kontrola('oddáleno 50 %: 10 px obrazovky od rohu chytá', /^uzel:/.test(r), JSON.stringify(r));
        await pohyb(await naObr(430, 0));             // 30 px výkresu — nad strop 0,3 m
        r = await p.vyhodnot(`${D}._magnetKlic`);
        kontrola('strop 0,3 m ve výkresu platí i oddáleně', r === '', JSON.stringify(r));

        console.log('\n5) 6c + 6d: konec stěny v linii s jiným rohem');
        // Svislá stěna x = 600 od y = -200 do 100; její roh (600, 100) dává vodítka
        await vycisti(1, 350, 200, [[600, -200, 600, 100]]);
        await pohyb(await naObr(0, 300));
        await klik(await naObr(0, 300));
        await pohyb(await naObr(300, 299));
        await pohyb(await naObr(596, 297));           // úhel 0,3° od vodorovné, 4 px od x = 600
        let k = await tazenyUzel();
        st = await p.vyhodnot(`(() => { const d = ${D}; return JSON.parse(JSON.stringify({ klic: d._magnetKlic, voditka: d._voditkaZobraz, osa: d._osaUhlu })); })()`);
        kontrola('konec drží vodorovnou (y = 300) a sedí v linii s rohem (x = 600)', k && blizko(k.x, 600) && blizko(k.y, 300), JSON.stringify(k));
        kontrola('vodítko vede od rohu (600, 100)', st.voditka && st.voditka.length === 1 && blizko(st.voditka[0].od.x, 600) && blizko(st.voditka[0].od.y, 100), JSON.stringify(st.voditka));
        kontrola('vodicí osa úhlu je zapnutá', st.osa && blizko(st.osa.od.y, 300) && blizko(st.osa.k.y, 300), JSON.stringify(st.osa));
        kontrola('magnet hlásí úhel i vodítko', /uhel/.test(st.klic) && /voditka/.test(st.klic), st.klic);
        await p.snimek(path.join(vystup, 'voditka.png'));

        console.log('\n6) 6c bez úhlu: průmět na vodítko');
        await pohyb(await naObr(597, 380));           // 7,6° — úhel nechytí, vodítko x = 600 ano
        k = await tazenyUzel();
        st = await p.vyhodnot(`(() => { const d = ${D}; return JSON.parse(JSON.stringify({ klic: d._magnetKlic, osa: d._osaUhlu })); })()`);
        kontrola('konec se srovnal na x = 600, y zůstalo', k && blizko(k.x, 600) && blizko(k.y, 380, 1), JSON.stringify(k));
        kontrola('bez úhlu není vodicí osa', !st.osa && !/uhel/.test(st.klic), JSON.stringify(st));
        await klik(await naObr(597, 380));
        await esc();

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'voditka-chyba.png')).catch(() => {});
    } finally {
        // nástroj se pamatuje v localStorage — nenechat Stěnu dalším testům
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.ulozitNastaveni?.(); return 1; })()`).catch(() => {});
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
