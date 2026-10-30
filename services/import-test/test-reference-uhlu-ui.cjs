/**
 * Magnet úhlů se vztahuje k rastru domu, ne k obrazovce, a ukáže, k čemu zacvakl.
 *
 *   - natočený dům (−58° jako Klemov): stěna zacvakne na 45° k osám DOMU
 *     a ukáže čárkovanou osu s popiskem „45° k osám domu"
 *   - úhel 135° k obrazovce (Klemov W60) už nezacvakne — s domem nesouvisí
 *   - stěna z rohu domu zacvakne k sousední stěně: obrys stěny + vlnka po ní
 *   - prázdný výkres: referencí je vodorovná osa obrazovky
 *
 * Spuštění: node services/import-test/test-reference-uhlu-ui.cjs
 */
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const THETA = -58;   // natočení domu ve stupních (souřadnice plátna, y dolů)

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const rad = (deg) => deg * Math.PI / 180;

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
    // Natočený obdélník 600 × 400 px (7,5 × 5 m) kolem (0, 0) jako uzavřený dům
    const dum = (theta) => p.vyhodnot(`(() => { const d = ${D}, e = d.engine;
        for (const id of [...e.walls.keys()]) e.removeWall(id); e._cleanOrphanNodes?.();
        const c = Math.cos(${rad(theta)}), s = Math.sin(${rad(theta)});
        const r = [[-300, -200], [300, -200], [300, 200], [-300, 200]].map(([x, y]) => [x * c - y * s, x * s + y * c]);
        const st = r.map((a, i) => e.addWall(a[0], a[1], r[(i + 1) % 4][0], r[(i + 1) % 4][1], 0.3));
        st.forEach((w, i) => { st[(i + 1) % 4].nodeA = w.nodeB; }); e._cleanOrphanNodes();
        d.stage.scale({ x: 0.55, y: 0.55 }); d.zoom = 0.55;
        d.stage.position({ x: d.stage.width() / 2, y: d.stage.height() / 2 });
        d.renderer.poZmeneZoomu(); d.renderer.render(); d.nastroj = 'vyber'; d.nastroj = 'stena';
        return { steny: st.map(w => w.id), roh: { id: st[0].nodeB, x: e.nodes.get(st[0].nodeB).x, y: e.nodes.get(st[0].nodeB).y } }; })()`);
    const smerTazene = () => p.vyhodnot(`(() => { const d = ${D}, e = d.engine; const n = e.nodes.get(d.draggingNodeId);
        const w = e.getNodeWalls(d.draggingNodeId)[0]; const o = e.nodes.get(w.nodeA === n.id ? w.nodeB : w.nodeA);
        return Math.atan2(n.y - o.y, n.x - o.x) * 180 / Math.PI; })()`);
    const stav = () => p.vyhodnot(`(() => { const d = ${D};
        const popisky = d.stage.find('Label').map(l => l.getText().text());
        return JSON.parse(JSON.stringify({ reference: d._magnet ? d._magnet.reference : null, klic: d._magnetKlic, popisky,
            vlnka: d._kurzorLayer.find('Line').length })); })()`);
    // Úsek z bodu `od` pod úhlem `deg` (deg s odchylkou), délka L
    const kresli = async (od, deg, L = 260) => {
        await pohyb(await naObr(od.x, od.y));
        await klik(await naObr(od.x, od.y));
        await pohyb(await naObr(od.x + Math.cos(rad(deg)) * L / 2, od.y + Math.sin(rad(deg)) * L / 2));
        await pohyb(await naObr(od.x + Math.cos(rad(deg)) * L, od.y + Math.sin(rad(deg)) * L));
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
            body: JSON.stringify({ nazev: 'ClaudeTest reference úhlu ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');

        console.log('\n1) Natočený dům: 45° k osám domu');
        await dum(THETA);
        const start = { x: 0, y: 520 };              // volné místo pod domem (mimo dosah jeho stěn)
        await kresli(start, THETA + 45 + 1.2);
        let smer = await smerTazene();
        let s = await stav();
        kontrola('stěna zacvakla na 45° k domu', Math.abs(smer - (THETA + 45)) < 0.01, smer.toFixed(3) + '°');
        kontrola('reference je osa domu', s.reference && s.reference.osa && s.reference.osa.domu === true, JSON.stringify(s.reference));
        kontrola('popisek „45° k osám domu"', s.popisky.includes('45° k osám domu'), JSON.stringify(s.popisky));
        await p.snimek(path.join(vystup, 'reference-osa.png'));

        console.log('\n2) Klemov W60: 135° k obrazovce nezacvakne');
        await pohyb(await naObr(start.x + Math.cos(rad(-134)) * 200, start.y + Math.sin(rad(-134)) * 200));
        smer = await smerTazene();
        s = await stav();
        kontrola('stěna zůstala pod myší (−134°, myš po celých px)', Math.abs(smer + 134) < 0.5, smer.toFixed(3) + '°');
        kontrola('žádný úhlový magnet', !/uhel/.test(s.klic), s.klic);
        await esc();

        console.log('\n3) Z rohu domu: reference je sousední stěna');
        const d2 = await dum(THETA);
        // ven z rohu v prodloužení st[0] (180° k ní, 90° k st[1]), 1,5° vedle
        await kresli(d2.roh, THETA - 1.5, 200);
        s = await stav();
        kontrola('reference je jedna ze stěn rohu', s.reference && [d2.steny[0], d2.steny[1]].includes(s.reference.stena), JSON.stringify(s.reference));
        await pauza(30);
        kontrola('po stěně běží vlnka', s.vlnka >= 1, s.vlnka + ' čar ve vrstvě kurzoru');
        const obrys = await p.vyhodnot(`(() => { const d = ${D}; const b = getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim();
            return d.stage.getLayers().some(l => l.find('Line').some(x => x.closed() && x.stroke() === b)); })()`);
        kontrola('referenční stěna má obrys v barvě značky', obrys);
        await p.snimek(path.join(vystup, 'reference-stena.png'));
        await esc();

        console.log('\n4) Prázdný výkres: vodorovná osa obrazovky');
        await p.vyhodnot(`(() => { const d = ${D}, e = d.engine; for (const id of [...e.walls.keys()]) e.removeWall(id); e._cleanOrphanNodes?.(); d.renderer.render(); return 1; })()`);
        await kresli({ x: -200, y: 0 }, 0.8);
        smer = await smerTazene();
        s = await stav();
        kontrola('první stěna zacvakla vodorovně', Math.abs(smer) < 0.01, smer.toFixed(3) + '°');
        kontrola('reference je osa obrazovky (ne domu)', s.reference && s.reference.osa && s.reference.osa.domu === false, JSON.stringify(s.reference));
        await esc();

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'reference-chyba.png')).catch(() => {});
    } finally {
        // nástroj se pamatuje v localStorage — nenechat Stěnu dalším testům
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.ulozitNastaveni?.(); return 1; })()`).catch(() => {});
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
