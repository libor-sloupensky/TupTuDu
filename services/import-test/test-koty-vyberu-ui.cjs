/**
 * Kóty u vybrané stěny a otvoru: které se ukážou, přepsání číslem, pravidla posunu, Zpět.
 * Reference Klemov se jen čte, přepisuje se její dočasná kopie v testovacím konceptu.
 *
 * Spuštění: node services/import-test/test-koty-vyberu-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
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
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await pauza(40);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(300);
    };
    const klavesa = async (key, kod) => {
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key, code: key, windowsVirtualKeyCode: kod, nativeVirtualKeyCode: kod });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key, code: key, windowsVirtualKeyCode: kod, nativeVirtualKeyCode: kod });
    };
    const PX = 80;
    const m = (x, y) => naObr(x * PX, y * PX);
    // Klik na číslo kóty skutečnou myší a zápis hodnoty do pole
    const prepis = async (i, hodnota) => {
        const s = await p.vyhodnot(`(() => { const d = ${D}; const k = d.renderer._kotyVyberu[${i}]; const t = d.stage.getAbsoluteTransform().copy().point(k.stitek); const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
        await klik(s);
        await p.vyhodnot(`(() => { const el = document.querySelector('[data-kota-pole] input'); el.value = ${JSON.stringify(String(hodnota))}; return document.activeElement === el; })()`);
        await klavesa('Enter', 13);
        await pauza(500);
    };
    const koty = () => p.vyhodnot(`${D}.renderer._kotyVyberu.map(k => ({ typ: k.typ, cil: k.cil, strana: k.strana, smer: k.smer, vnejsi: k.vnejsi, cm: k.hodnotaCm }))`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest koty ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Pravoúhlý dům: příčka svisle, T-konce na obvodu');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova');
            const w2 = e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova');
            const w3 = e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova');
            const w4 = e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++;
            return { w1: w1.id, w2: w2.id, w3: w3.id, w4: w4.id }; })()`);
        await pauza(300);
        // Příčka s volnými konci jde tažením posouvat v obou směrech
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; e.addWall(4*X, 1*X, 4*X, 7*X, 0.1, 'pricka'); d.renderer.render(); d.autoSave('Příčka'); return true; })()`);
        await pauza(1500);
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.renderer.clearSelection(); d._selectionTick++; return true; })()`);
        await pauza(200);
        const pricka = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = [...e.walls.values()].find(w => w.typ === 'pricka'); return { id: w.id, od: !!w.odConstraint, do: !!w.doConstraint, x: e.nodes.get(w.nodeA).x / 80, n: e.walls.size }; })()`);
        await klik(await m(4, 4));
        let k = await koty();
        kontrola('klik na příčku: dvě kóty, k levé a pravé obvodové', k.length === 2 && k.every(x => x.typ === 'stena'), JSON.stringify({ pricka, k }));
        const sVice = k.reduce((a, b) => (a.cm > b.cm ? a : b));
        const iVice = k.indexOf(sVice);
        kontrola('hodnoty jsou světlé: vlevo 400−15−5, vpravo 600−15−5', k.some(x => blizko(x.cm, 380, 0.5)) && k.some(x => blizko(x.cm, 580, 0.5)), JSON.stringify(k));
        await p.snimek(path.join(vystup, 'koty-stena.png'));

        console.log('\n2) Přepsání kóty: stěna se posune přesně, vazby a Zpět fungují');
        const krok0 = await p.vyhodnot(`${D}.engine.undoStack?.length ?? ${D}.historie.length`);
        await prepis(iVice, 500);
        k = await koty();
        const po = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = [...e.walls.values()].find(w => w.typ === 'pricka'); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return { xA: a.x/80, xB: b.x/80, yA: a.y/80, yB: b.y/80, vybrana: d.renderer.selectedWalls.has(w.id), pole: !!d.kotaEdit }; })()`);
        kontrola('po zadání 500 je kóta 500 a druhá strana dopočítaná', k.some(x => blizko(x.cm, 500, 0.2)) && k.some(x => blizko(x.cm, 460, 0.5)), JSON.stringify(k));
        kontrola('stěna zůstala svislá, stejně dlouhá a vybraná', blizko(po.xA, po.xB, 0.002) && po.vybrana && !po.pole && blizko(Math.abs(po.yA - po.yB), 6, 0.01), JSON.stringify(po));
        await p.vyhodnot(`(() => { ${D}.undo(); return true; })()`);
        await pauza(500);
        const zpet = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = [...e.walls.values()].find(w => w.typ === 'pricka'); return e.nodes.get(w.nodeA).x / 80; })()`);
        kontrola('Zpět vrátí stěnu', blizko(zpet, pricka.x, 0.01), String(zpet));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d._selectionTick++; return true; })()`);
        await klik(await m(zpet, 4));
        k = await koty();
        const iMene = k.indexOf(k.reduce((a, b) => (a.cm < b.cm ? a : b)));
        await prepis(iMene, 5000);
        const zaZdi = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = [...e.walls.values()].find(w => w.typ === 'pricka'); return { x: e.nodes.get(w.nodeA).x / 80, hlaska: d.dumZprava }; })()`);
        kontrola('nesmyslně velká hodnota stěnu nepřežene přes sousední stěnu, přijde hláška', zaZdi.x < 10 && /Dál stěna nejde/.test(zaZdi.hlaska), JSON.stringify(zaZdi));
        await p.vyhodnot(`(() => { ${D}.undo(); return true; })()`);
        await pauza(400);

        console.log('\n3) Otvor: na obvodové stěně s příčkou se vnitřní a vnější vzdálenost liší');
        const otvor = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const op = e.addOpening(${JSON.stringify(ids.w1)}, 1, 1.2, 'okno', { presnaSirka: true }); d.panelOtvoruPoz = { x: 240, y: 560 }; d.renderer.clearSelection(); d.fitView(); d.renderer.render(); return { id: op.id, wall: op.wallId, poz: op.pozice }; })()`);
        await pauza(300);
        const naOkno = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const op = e.openings.get(${JSON.stringify(otvor.id)}); const w = e.walls.get(op.wallId); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); const L = Math.hypot(b.x-a.x,b.y-a.y); const s = (op.pozice + op.sirka/2)*80; return { x: (a.x + (b.x-a.x)/L*s)/80, y: (a.y + (b.y-a.y)/L*s)/80, stena: w.id, n: [...e.walls.keys()].length }; })()`);
        await klik(await m(naOkno.x, naOkno.y));
        k = await koty();
        const vnejsi = k.filter(x => x.vnejsi), vnitrni = k.filter(x => !x.vnejsi);
        kontrola('okno: čtyři kóty, dvě vnější a dvě vnitřní', k.length === 4 && vnejsi.length === 2 && vnitrni.length === 2, JSON.stringify({ k, naOkno }));
        await p.snimek(path.join(vystup, 'koty-otvor.png'));
        const mimoCaru = await p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy(); return d.renderer._kotyVyberu.map(k => { const s = t.point(k.stitek), a = t.point(k.a), b = t.point(k.b); const uvnitr = (q) => Math.abs(q.x - s.x) <= k.w / 2 && Math.abs(q.y - s.y) <= k.h / 2; let naCare = false; for (let i = 0; i <= 40; i++) { if (uvnitr({ x: a.x + (b.x - a.x) * i / 40, y: a.y + (b.y - a.y) * i / 40 })) naCare = true; } return naCare; }); })()`);
        kontrola('číslo kóty neleží na čáře, začátek i konec zůstávají vidět', mimoCaru.length === 4 && mimoCaru.every(x => !x), JSON.stringify(mimoCaru));
        const opPred = await p.vyhodnot(`${D}.engine.openings.get(${JSON.stringify(otvor.id)}).pozice`);
        const iV = k.findIndex(x => !x.vnejsi && x.smer === -1);
        const hodn = Math.round(k[iV].cm + 30);
        await prepis(iV, hodn);
        const k3 = await koty();
        const opPo = await p.vyhodnot(`${D}.engine.openings.get(${JSON.stringify(otvor.id)}).pozice`);
        kontrola('přepsání vnitřní kóty posune otvor přesně o rozdíl', blizko(opPo - opPred, 0.3, 0.005) && k3.some(x => !x.vnejsi && x.smer === -1 && blizko(x.cm, hodn, 0.2)), JSON.stringify({ opPred, opPo, k3 }));

        console.log('\n4) Klemov: reference se jen čte, přepisuje se dočasná kopie');
        const urlTest = await p.vyhodnot('location.href');
        const upravenoPred = execSync(`php artisan tinker --execute="echo DB::table('koncepty_v3')->where('id',51)->value('upraveno');"`, { encoding: 'utf8' }).trim();
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3?id=51');
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'Klemov');
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 0, y: 600 }; d.fitView(); d.renderer.setSelection(['W18']); d._selectionTick++; return true; })()`);
        await pauza(500);
        const w18 = await p.vyhodnot(`${D}.renderer._kotyVyberu.map(k => ({ cil: k.cil, strana: k.strana, cm: k.hodnotaCm }))`);
        const cile = w18.map(x => x.cil).sort();
        kontrola('W18 má kóty k W12, W9 a W5', ['W12', 'W5', 'W9'].every(c => cile.includes(c)) && cile.length === 3, JSON.stringify(w18));
        await pauza(200);
        await p.snimek(path.join(vystup, 'koty-klemov-w18.png'));
        const okna = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const op = [...e.openings.values()].find(o => o.typ === 'okno' && e.walls.get(o.wallId)?.typ === 'obvodova'); d.renderer.setSelection([], [], [op.id]); return { id: op.id, stena: op.wallId, k: d.renderer._kotyVyberu.map(k => ({ vnejsi: k.vnejsi, smer: k.smer, cm: k.hodnotaCm })) }; })()`);
        kontrola('okno v Klemově má kóty na obě strany', okna.k.some(x => x.smer === 1) && okna.k.some(x => x.smer === -1), JSON.stringify(okna));
        await pauza(200);
        await p.snimek(path.join(vystup, 'koty-klemov-okno.png'));
        await p.vyhodnot(`(() => { sessionStorage.setItem('kopieKlemov', JSON.stringify(${D}.engine.toJSON())); return true; })()`);
        await p.jdiNa(urlTest);
        await pauza(2000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'test');
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.fromJSON(JSON.parse(sessionStorage.getItem('kopieKlemov'))); d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 0, y: 600 }; d.renderer.clearSelection(); d.fitView(); d.renderer.render(); d.autoSave('Kopie'); return true; })()`);
        await pauza(1500);
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection(['W18']); d._selectionTick++; return true; })()`);
        await pauza(500);
        const naW5 = await p.vyhodnot(`${D}.renderer._kotyVyberu.findIndex(k => k.cil === 'W5')`);
        const cilW5 = Math.round(w18.find(x => x.cil === 'W5').cm) - 40;
        const w18Pred = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = e.walls.get('W18'); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return { dx: b.x - a.x, dy: b.y - a.y, od: !!w.odConstraint, do: !!w.doConstraint }; })()`);
        await prepis(naW5, cilW5);
        const w18Po = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = e.walls.get('W18'); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return { k: d.renderer._kotyVyberu.map(k => ({ cil: k.cil, cm: k.hodnotaCm })), hlaska: d.dumZprava, odchylka: Math.abs((b.x - a.x) * ${w18Pred.dy} - (b.y - a.y) * ${w18Pred.dx}) / Math.hypot(${w18Pred.dx}, ${w18Pred.dy}) / Math.hypot(b.x - a.x, b.y - a.y) }; })()`);
        kontrola('W18 s vazbami na hostitele: přesná hodnota k W5, zůstane rovnoběžná', w18Pred.od && w18Pred.do && w18Po.k.some(x => x.cil === 'W5' && blizko(x.cm, cilW5, 0.3)) && w18Po.odchylka < 0.01, JSON.stringify({ w18Pred, cilW5, w18Po }));
        await p.snimek(path.join(vystup, 'koty-kopie-po-prepisu.png'));
        const reference = execSync(`php artisan tinker --execute="echo DB::table('koncepty_v3')->where('id',51)->value('upraveno');"`, { encoding: 'utf8' }).trim();
        kontrola('reference Klemov se nezměnila', reference === upravenoPred, reference);

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
