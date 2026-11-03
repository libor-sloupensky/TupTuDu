/**
 * Stěna v patře a stěna pod ní: magnet při tažení celé stěny (osa, líc, odtržení, Alt),
 * náhled, převzetí typu a tloušťky u nově nakreslené stěny.
 *
 * Spuštění: node services/import-test/test-magnet-patro-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
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
const blizko = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const PX = 80;
    const m = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x * PX},y:${y * PX}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const pohyb = async (b, drzi) => { await p.cmd('Input.dispatchMouseEvent', drzi ? { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1 } : { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(30); };
    const stisk = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
    const pust = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    // Plynulý tah po krocích s držením tlačítka
    const tahni = async (od, kam) => { for (let i = 1; i <= 8; i++) await pohyb({ x: od.x + (kam.x - od.x) * i / 8, y: od.y + (kam.y - od.y) * i / 8 }, true); };
    const klik = async (b) => { await pohyb(b); await stisk(b); await pust(b); await pauza(250); };
    const stav = (id) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = e.walls.get(${JSON.stringify(id)}); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return { ax: a.x / 80, ay: a.y / 80, bx: b.x / 80, by: b.y / 80, nahled: !!d._snapPreview?.line, typ: w.typ, t: w.tloustka }; })()`);

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest magnet ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Přízemí a prázdné patro');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            e.addWall(5*X, 0, 5*X, 8*X, 0.25, 'nosna'); e.addWall(5*X, 4*X, 10*X, 4*X, 0.1, 'pricka');
            d.podlaziKopie = false; d.pridatPodlazi('nahoru'); d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 0, y: 620 }; d.stage.scale({ x: 0.66, y: 0.66 }); d.stage.position({ x: 100, y: 60 }); d.zoom = 0.66; d.renderer.poZmeneZoomu(); d.renderer.render(); d.autoSave('Dům'); return e.dum.aktivni; })()`);
        await pauza(1500);

        console.log('\n2) Tah celé stěny');
        const svisla = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const w = e.addWall(6.5*X, 1*X, 6.5*X, 7*X, 0.1, 'pricka'); d.renderer.render(); d.autoSave('Příčka'); return w.id; })()`);
        await pauza(1200);
        const start = await m(6.5, 4);
        await pohyb(start); await stisk(start); await pauza(50);
        // Tah začne až prvním pohybem a ten se do posunu nepočítá: stěna je o něj vedle kurzoru
        const prvni = { x: start.x - 6, y: start.y };
        await pohyb(prvni, true);
        const vedle = 6 / (0.66 * PX);
        const uOsy = await m(5.015 - vedle, 4);
        await tahni(prvni, uOsy);
        const naOse = await stav(svisla);
        kontrola('u spodní nosné se přichytí přesně na její osu a ukáže náhled', blizko(naOse.ax, 5, 0.002) && blizko(naOse.bx, 5, 0.002) && naOse.nahled, JSON.stringify(naOse));
        await p.snimek(path.join(vystup, 'magnet-osa.png'));
        const uLice = await m(5.10 - vedle, 4);
        await tahni(uOsy, uLice);
        const naLici = await stav(svisla);
        kontrola('u líce se tenčí stěna srovná s lícem stěny dole (5 + 7,5 cm)', blizko(naLici.ax, 5.075, 0.002), JSON.stringify(naLici));
        const dal = await m(6.2 - vedle, 4);
        await tahni(uLice, dal);
        const volne = await stav(svisla);
        kontrola('dál od stěny se odtrhne, jde s myší a náhled zmizí', blizko(volne.ax, 6.2, 0.03) && !volne.nahled, JSON.stringify(volne));
        const zpetKOse = await m(5.015 - vedle, 4);
        await p.vyhodnot(`(() => { ${D}._altDrzen = true; return true; })()`);
        await tahni(dal, zpetKOse);
        const sAltem = await stav(svisla);
        await p.vyhodnot(`(() => { ${D}._altDrzen = false; return true; })()`);
        kontrola('s Altem se nechytá', Math.abs(sAltem.ax - 5) > 0.005 && !sAltem.nahled, JSON.stringify(sAltem));
        await pust(zpetKOse);
        await pauza(300);

        const vodorovna = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.renderer.clearSelection(); const w = e.addWall(6*X, 2.5*X, 9*X, 2.5*X, 0.1, 'pricka'); d.renderer.render(); d.autoSave('Příčka 2'); return w.id; })()`);
        await pauza(1200);
        const s2 = await m(7.5, 2.5), k2 = await m(7.5, 3.97);
        await pohyb(s2); await stisk(s2); await pauza(50);
        await tahni(s2, k2);
        const naPricce = await stav(vodorovna);
        kontrola('chytá se i na příčku pod sebou', blizko(naPricce.ay, 4, 0.002) && naPricce.nahled, JSON.stringify(naPricce));
        await pust(k2);
        await pauza(300);
        const posunX = await stav(vodorovna);
        kontrola('po puštění zůstává na místě a náhled je pryč', blizko(posunX.ay, 4, 0.002) && !posunX.nahled, JSON.stringify(posunX));

        console.log('\n3) Kreslení: převzetí typu a tloušťky');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.nastroj = 'stena'; d.stenaTyp = 'nosna'; d.tloustkaSteny = 0.2; return true; })()`);
        await pauza(200);
        const a = await m(1, 8.02), b = await m(4, 7.98);
        await klik(a);
        for (let i = 1; i <= 8; i++) await pohyb({ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 });
        const zaKresleni = await p.vyhodnot(`!!${D}._snapPreview?.line`);
        await klik(b);
        const nova = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = [...e.walls.values()].find(x => Math.abs(e.nodes.get(x.nodeA).y / 80 - 8) < 0.05 && Math.abs(e.nodes.get(x.nodeB).y / 80 - 8) < 0.05); return w ? { id: w.id, typ: w.typ, t: w.tloustka, ay: e.nodes.get(w.nodeA).y / 80, by: e.nodes.get(w.nodeB).y / 80, hlaska: d.dumZprava } : null; })()`);
        kontrola('zeď nakreslená nosnou 20 cm na obvodové převezme obvodovou 30 cm a řekne to', nova && nova.typ === 'obvodova' && blizko(nova.t, 0.3, 1e-6) && blizko(nova.ay, 8, 0.002) && blizko(nova.by, 8, 0.002) && /převzala/.test(nova.hlaska), JSON.stringify(nova));
        kontrola('během kreslení je vidět osa stěny dole', zaKresleni);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await pauza(250);
        const tenci = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; d.nastroj = 'vyber'; d.renderer.setSelection([${JSON.stringify(nova?.id)}]); d.setWallTloustka(0.2, true); await new Promise(r => setTimeout(r, 300)); d.renderer.render(); return e.walls.get(${JSON.stringify(nova?.id)}).tloustka; })()`);
        kontrola('tenčí se dá nastavit vědomě a zůstane', blizko(tenci, 0.2, 1e-6), String(tenci));

        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.nastroj = 'stena'; d.stenaTyp = 'nosna'; d.tloustkaSteny = 0.2; return true; })()`);
        await pauza(200);
        const c = await m(1, 2), e2 = await m(4, 2);
        await klik(c);
        for (let i = 1; i <= 8; i++) await pohyb({ x: c.x + (e2.x - c.x) * i / 8, y: c.y });
        await klik(e2);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await pauza(250);
        const mimo = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = [...e.walls.values()].find(x => Math.abs(e.nodes.get(x.nodeA).y / 80 - 2) < 0.05 && Math.abs(e.nodes.get(x.nodeB).y / 80 - 2) < 0.05); return w ? { typ: w.typ, t: w.tloustka } : null; })()`);
        kontrola('zeď mimo stěnu dole si typ a tloušťku nechá', mimo && mimo.typ === 'nosna' && blizko(mimo.t, 0.2, 1e-6), JSON.stringify(mimo));

        // Stěna z bodu 2 stojí poblíž a měla by přednost před magnetem na spodní podlaží
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.engine.removeWall(${JSON.stringify(svisla)}); d.renderer.render(); d.nastroj = 'stena'; d.stenaTyp = 'pricka'; d.tloustkaSteny = 0.1; return true; })()`);
        await pauza(200);
        const f = await m(5.02, 5), g = await m(4.98, 7);
        await klik(f);
        for (let i = 1; i <= 8; i++) await pohyb({ x: f.x + (g.x - f.x) * i / 8, y: f.y + (g.y - f.y) * i / 8 });
        await klik(g);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27 });
        await pauza(250);
        const nadNosnou = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = [...e.walls.values()].find(x => Math.abs(e.nodes.get(x.nodeA).x / 80 - 5) < 0.01 && Math.abs(e.nodes.get(x.nodeB).x / 80 - 5) < 0.01); return w ? { typ: w.typ, t: w.tloustka } : null; })()`);
        kontrola('příčka nakreslená na ose nosné zůstane příčkou', nadNosnou && nadNosnou.typ === 'pricka' && blizko(nadNosnou.t, 0.1, 1e-6), JSON.stringify(nadNosnou));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
