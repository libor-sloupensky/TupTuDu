/**
 * Nástroj Stěna: značka kurzoru, bliknutí magnetu, Alt a zvýraznění úhlu.
 *
 *   - značka stojí pod myší, na magnetu skočí tam, kam bod padne (zelená)
 *   - nové zachycení magnetu blikne (rozbíhající se kroužek)
 *   - Alt magnet vypne: bod zůstane pod myší, úhel se nedorovná
 *   - zacvaknutý úhel (90°) má číslo ve štítku, volný úhel ne
 *
 * Spuštění: node services/import-test/test-magnet-kurzor-ui.cjs
 */
const path = require('path');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const ALT = 1;   // CDP modifikátor

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
    const pohyb = async (bod, modifiers = 0) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bod.x, y: bod.y, modifiers });
        await pauza(60);
    };
    const klik = async (bod, modifiers = 0) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: bod.x, y: bod.y, button: 'left', clickCount: 1, buttons: 1, modifiers });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bod.x, y: bod.y, button: 'left', clickCount: 1, modifiers });
        await pauza(250);
    };
    const alt = (dolu) => p.cmd('Input.dispatchKeyEvent', { type: dolu ? 'rawKeyDown' : 'keyUp', key: 'Alt', code: 'AltLeft',
        windowsVirtualKeyCode: 18, modifiers: dolu ? ALT : 0 });
    // Stav značky, magnetu a úhlů na plátně
    const stav = () => p.vyhodnot(`(() => { const d = ${D}; const z = d._kurzorZnacka;
        const stitky = d.stage.find('Label').filter(l => /°$/.test(l.getText?.()?.text?.() || ''));
        const uhly = d.stage.find('Text').filter(t => /°$/.test(t.text()) && !(t.getParent() instanceof Konva.Label));
        return { znacka: z && z.visible() ? { x: +z.x().toFixed(2), y: +z.y().toFixed(2), zelena: z.fill() === getComputedStyle(document.documentElement).getPropertyValue('--c-primary').trim() } : null,
                 klic: d._magnetKlic, kruhy: d._kurzorLayer.getChildren().length - 1,
                 stitky: stitky.map(l => l.getText().text()), uhly: uhly.map(t => t.text()) }; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest magnet a kurzor ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');

        // Vodorovná stěna (0,0)→(400,0); pohled 1:1 kolem (300, 150)
        const id = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine;
            const w = e.addWall(0, 0, 400, 0, 0.3);
            const st = d.stage; st.scale({ x: 1, y: 1 }); d.zoom = 1;
            st.position({ x: st.width() / 2 - 300, y: st.height() / 2 - 150 });
            d.renderer.poZmeneZoomu(); d.renderer.render(); d.nastroj = 'stena';
            return { stena: w.id, uzel: w.nodeB }; })()`);
        await pauza(300);

        console.log('\n1) Značka kurzoru');
        await pohyb(await naObr(250, 200));
        let s = await stav();
        kontrola('volně: šedá značka pod myší', s.znacka && !s.znacka.zelena && Math.abs(s.znacka.x - 250) < 1.5 && Math.abs(s.znacka.y - 200) < 1.5, JSON.stringify(s.znacka));
        await pohyb(await naObr(408, 6));
        s = await stav();
        kontrola('u konce stěny: oranžová (barva značky), skočí na uzel', s.znacka && s.znacka.zelena && Math.abs(s.znacka.x - 400) < 0.5 && Math.abs(s.znacka.y) < 0.5, JSON.stringify(s.znacka));
        kontrola('zachycení bliklo', s.kruhy >= 1, s.kruhy + ' kroužků');
        await pauza(900);
        await pohyb(await naObr(406, 5));
        s = await stav();
        kontrola('týž cíl znovu neblikne', s.kruhy === 0, s.kruhy + ' kroužků');

        console.log('\n2) Alt vypne magnet');
        await alt(true);
        await pauza(120);
        s = await stav();
        kontrola('stisk Altu bez pohybu: značka zešedne a je pod myší', s.znacka && !s.znacka.zelena && Math.abs(s.znacka.x - 406) < 1.5, JSON.stringify(s.znacka));
        await alt(false);
        await pauza(120);
        s = await stav();
        kontrola('puštění Altu: magnet zase drží', s.znacka && s.znacka.zelena, JSON.stringify(s.znacka));

        console.log('\n3) Kreslení: zacvaknutý pravý úhel');
        await klik(await naObr(406, 5));             // začátek na konci stěny
        await pohyb(await naObr(403, 150));
        await pohyb(await naObr(404, 300));          // 0,8° od svislé
        s = await stav();
        const uzelKonce = await p.vyhodnot(`(() => { const d = ${D}; const n = d.engine.nodes.get(d.draggingNodeId); return n ? { x: n.x, y: n.y } : null; })()`);
        kontrola('konec zacvakl na svislou (x = 400)', uzelKonce && Math.abs(uzelKonce.x - 400) < 0.01, JSON.stringify(uzelKonce));
        kontrola('úhel 90° má štítek', s.stitky.includes('90°'), JSON.stringify(s));
        kontrola('značka na konci stěny je v barvě značky', s.znacka && s.znacka.zelena && Math.abs(s.znacka.x - 400) < 0.01, JSON.stringify(s.znacka));

        console.log('\n4) Kreslení s Altem: úhel se nedorovná');
        await pohyb(await naObr(404, 300), ALT);
        s = await stav();
        const volny = await p.vyhodnot(`(() => { const d = ${D}; const n = d.engine.nodes.get(d.draggingNodeId); return { x: n.x, y: n.y }; })()`);
        kontrola('konec zůstal pod myší (x = 404)', Math.abs(volny.x - 404) < 1.5, JSON.stringify(volny));
        kontrola('bez štítku, úhel jen číslem', !s.stitky.length && s.uhly.some(u => u !== '90°'), JSON.stringify(s));
        kontrola('značka šedá', s.znacka && !s.znacka.zelena, JSON.stringify(s.znacka));
        await klik(await naObr(404, 300), ALT);      // dokončit úsek s Altem
        const vysledek = await p.vyhodnot(`(() => { const d = ${D}, e = d.engine;
            const nova = [...e.walls.values()].find(w => w.id !== '${id.stena}');
            const a = e.nodes.get(nova.nodeA), b = e.nodes.get(nova.nodeB);
            return { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y }, sdilenyStart: nova.nodeA === '${id.uzel}' }; })()`);
        kontrola('s Altem se úsek po puštění nesrovnal', Math.abs(vysledek.b.x - 404) < 1.5, JSON.stringify(vysledek));
        kontrola('začátek je napojený na konec stěny', vysledek.sdilenyStart, JSON.stringify(vysledek));
        await p.snimek(path.join(vystup, 'magnet-kurzor.png'));

        await p.cmd('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await pauza(200);
        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'magnet-kurzor-chyba.png')).catch(() => {});
    } finally {
        // nástroj se pamatuje v localStorage — nenechat Stěnu dalším testům
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.ulozitNastaveni?.(); return 1; })()`).catch(() => {});
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
