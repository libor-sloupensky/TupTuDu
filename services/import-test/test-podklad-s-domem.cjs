/**
 * Podklad jede s celým domem: když uživatel chytí VŠECHNY stěny a posune
 * nebo otočí je (umístění domu na parcelu), posune/otočí se i podklad.
 * Při úpravě jen části stěn podklad stojí. Zpět i Esc vrací obojí.
 *
 * Spuštění: node services/import-test/test-podklad-s-domem.cjs
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
const blizko = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    const p = await otevriProhlizec({ viditelny: process.env.V3_VIDITELNY === '1', sirka: 1500, vyska: 950 });
    const stav = (v) => p.vyhodnot(`(() => { const d = ${DATA}; return JSON.parse(JSON.stringify(${v} ?? null)); })()`);
    const proved = (v) => p.vyhodnot(`(() => { const d = ${DATA}; ${v}; return true; })()`);

    // bod plátna → bod obrazovky
    const naObrazovku = (x, y) => p.vyhodnot(`(() => { const d = ${DATA};
        const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x}, y: ${y} });
        const r = d.stage.container().getBoundingClientRect();
        return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const mys = (type, b) => p.cmd('Input.dispatchMouseEvent', {
        type, x: b.x, y: b.y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: 1,
        buttons: type === 'mouseReleased' ? 0 : 1,
    });
    // tažení s mezikroky (drag se aktivuje až po 5 px)
    const tahni = async (od, kam, { pustit = true } = {}) => {
        await mys('mouseMoved', od); await pauza(80);
        await mys('mousePressed', od); await pauza(80);
        for (let i = 1; i <= 8; i++) {
            const b = { x: Math.round(od.x + (kam.x - od.x) * i / 8), y: Math.round(od.y + (kam.y - od.y) * i / 8) };
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1 });
            await pauza(40);
        }
        if (pustit) { await mys('mouseReleased', kam); await pauza(400); }
    };
    const podklad = () => stav(`({ x: d.podklad.stredX || 0, y: d.podklad.stredY || 0, u: d.podklad.uhel || 0,
        imgX: d.renderer._podkladImg.x(), imgY: d.renderer._podkladImg.y(), imgU: d.renderer._podkladImg.rotation() })`);
    const uzel = (id) => stav(`(() => { const n = d.engine.nodes.get('${id}'); return { x: n.x, y: n.y }; })()`);
    const vyberVse = () => proved(`d.renderer.setSelection([...d.engine.walls.keys()]); d.renderer.render()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest podklad s domem ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA} && ${DATA}.engine)`, 15000, 'Alpine po přesměrování');

        console.log('\n1) Příprava: obdélník 4 stěn + podklad (dříve nahraný výkres)');
        const ids = await p.vyhodnot(`(() => { const d = ${DATA}; const e = d.engine;
            e.walls.clear(); e.nodes.clear(); e.openings.clear();
            const a = e.addWall(-400, -300, 400, -300, 0.3);
            const b = e.addWall(400, -300, 400, 300, 0.3);
            const c = e.addWall(400, 300, -400, 300, 0.3);
            const f = e.addWall(-400, 300, -400, -300, 0.3);
            d.renderer.render(); d.fitView(); d.renderer.render();
            return { a: a.id, b: b.id, roh: a.nodeA }; })()`);
        kontrola('vznikly čtyři stěny', (await stav('d.engine.walls.size')) === 4);

        await p.vyhodnot(`(async () => { const d = ${DATA}; await d.impNactiDrive(); return true; })()`);
        const vykres = await stav('d.impDrive[0]');
        if (!vykres) throw new Error('Žádný dříve nahraný výkres — není z čeho udělat podklad.');
        await proved(`d.podklad = { url: _kkInitData.routes.podkladNahled.replace(':otisk', '${vykres.otisk}').replace(':strana', 1),
            otisk: '${vykres.otisk}', strana: 1, sirkaM: 12, vyskaM: 9, stredX: 0, stredY: 0, uhel: 0,
            pruhlednost: 0.5, zobrazeni: 'pod' };
            d.renderer.nactiPodklad(d.podklad); d.podkladUloz()`);
        await p.cekej(`!!${DATA}.renderer._podkladImg`, 10000, 'obrázek podkladu');
        await p.snimek(path.join(vystup, 'podklad-dum-1-vychozi.png'));

        console.log('\n2) Posun jedné stěny — podklad stojí');
        await proved(`d.renderer.setSelection(['${ids.b}']); d.renderer.render()`);
        let od = await naObrazovku(400, 0);
        await tahni(od, { x: od.x + 40, y: od.y });
        let pk = await podklad();
        kontrola('podklad se nehnul', blizko(pk.x, 0) && blizko(pk.y, 0) && blizko(pk.u, 0), JSON.stringify(pk));
        await proved('d.engine.undo(); d.renderer.render()');

        console.log('\n3) Posun celého domu — podklad jede s ním');
        await vyberVse();
        const rohPred = await uzel(ids.roh);
        od = await naObrazovku(0, -300);
        await tahni(od, { x: od.x + 120, y: od.y + 60 });
        const rohPo = await uzel(ids.roh);
        pk = await podklad();
        const dx = rohPo.x - rohPred.x, dy = rohPo.y - rohPred.y;
        kontrola('dům se posunul', Math.hypot(dx, dy) > 50, `dx=${dx.toFixed(1)} dy=${dy.toFixed(1)}`);
        kontrola('podklad se posunul o totéž', blizko(pk.x, dx) && blizko(pk.y, dy),
            `podklad ${pk.x.toFixed(2)},${pk.y.toFixed(2)}`);
        kontrola('obrázek na plátně sedí se stavem', blizko(pk.imgX, pk.x) && blizko(pk.imgY, pk.y));
        await p.snimek(path.join(vystup, 'podklad-dum-2-posun.png'));

        console.log('\n4) Otočení celého domu — podklad se otočí kolem stejného středu');
        await vyberVse();
        const pred = await podklad();
        const rohPredRot = await uzel(ids.roh);
        const madlo = await p.vyhodnot(`(() => { const d = ${DATA};
            const c = d.renderer.selectionLayer.findOne(n => n.getAttr('_rotateHandle'));
            const abs = c.getAbsolutePosition(); const r = d.stage.container().getBoundingClientRect();
            const bb = d._rotateBbox();
            return { x: Math.round(r.left + abs.x), y: Math.round(r.top + abs.y), cx: bb.cx, cy: bb.cy }; })()`);
        const stred = await naObrazovku(madlo.cx, madlo.cy);
        // madlo otočit o čtvrt kruhu kolem středu (po směru hodinových ručiček)
        const rx = madlo.x - stred.x, ry = madlo.y - stred.y;
        await tahni(madlo, { x: Math.round(stred.x - ry), y: Math.round(stred.y + rx) });
        const delta = await stav('d._rotateDelta');
        const rohPoRot = await uzel(ids.roh);
        pk = await podklad();
        // kontrola: roh i střed podkladu se otočily stejnou transformací
        const ocek = (bod) => {
            const cos = Math.cos(delta), sin = Math.sin(delta);
            const x = bod.x - madlo.cx, y = bod.y - madlo.cy;
            return { x: madlo.cx + x * cos - y * sin, y: madlo.cy + x * sin + y * cos };
        };
        const uhelDomu = Math.atan2(rohPoRot.y - madlo.cy, rohPoRot.x - madlo.cx)
            - Math.atan2(rohPredRot.y - madlo.cy, rohPredRot.x - madlo.cx);
        const uhelDomuDeg = ((uhelDomu * 180 / Math.PI) + 540) % 360 - 180;
        const ocekStred = ocek({ x: pred.x, y: pred.y });
        kontrola('dům se otočil', Math.abs(uhelDomuDeg) > 30, uhelDomuDeg.toFixed(1) + '°');
        kontrola('úhel podkladu = úhel domu', blizko(pk.u - pred.u, uhelDomuDeg, 0.05),
            `podklad ${(pk.u - pred.u).toFixed(2)}°, dům ${uhelDomuDeg.toFixed(2)}°`);
        kontrola('střed podkladu se otočil kolem stejného bodu', blizko(pk.x, ocekStred.x, 0.05) && blizko(pk.y, ocekStred.y, 0.05),
            `${pk.x.toFixed(2)},${pk.y.toFixed(2)} vs ${ocekStred.x.toFixed(2)},${ocekStred.y.toFixed(2)}`);
        kontrola('obrázek na plátně je otočený', blizko(pk.imgU, pk.u));
        await p.snimek(path.join(vystup, 'podklad-dum-3-otoceni.png'));

        console.log('\n5) Uložení — po obnovení stránky je podklad tam, kde byl');
        await pauza(2800);   // autosave kresby běží po 2 s
        const ulozeny = await podklad();
        await p.vyhodnot('location.reload(); true');
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${DATA} && ${DATA}.renderer?._podkladImg)`, 15000, 'podklad po obnovení');
        pk = await podklad();
        kontrola('poloha i úhel podkladu přežily obnovení',
            blizko(pk.x, ulozeny.x) && blizko(pk.y, ulozeny.y) && blizko(pk.u, ulozeny.u), JSON.stringify(pk));
        const rohReload = await uzel(ids.roh);
        kontrola('dům je po obnovení na stejném místě', blizko(rohReload.x, rohPoRot.x, 0.05) && blizko(rohReload.y, rohPoRot.y, 0.05));

        console.log('\n6) Esc uprostřed tažení vrátí dům i podklad');
        await vyberVse();
        const predEsc = await podklad();
        const rohPredEsc = await uzel(ids.roh);
        // Bod na stěně, který leží na plátně — ne pod panelem vlastností výběru.
        await proved('d.fitView(); d.renderer.render()');
        await pauza(200);
        const naStene = await p.vyhodnot(`(() => { const d = ${DATA};
            const tr = d.stage.getAbsoluteTransform().copy(), r = d.stage.container().getBoundingClientRect();
            for (const w of d.engine.walls.values()) {
                const a = d.engine.nodes.get(w.nodeA), b = d.engine.nodes.get(w.nodeB);
                for (const t of [0.5, 0.3, 0.7]) {
                    const bod = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
                    const s = tr.point(bod);
                    if (document.elementFromPoint(r.left + s.x, r.top + s.y)?.tagName === 'CANVAS') return bod;
                }
            }
            return null; })()`);
        if (!naStene) throw new Error('Žádná stěna není na plátně volně k uchopení.');
        od = await naObrazovku(naStene.x, naStene.y);
        await tahni(od, { x: od.x + 90, y: od.y - 40 }, { pustit: false });
        kontrola('během tažení se podklad hýbe', !blizko((await podklad()).x, predEsc.x));
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await pauza(200);
        await mys('mouseReleased', { x: od.x + 90, y: od.y - 40 });
        await pauza(400);
        pk = await podklad();
        const rohPoEsc = await uzel(ids.roh);
        kontrola('podklad je zpět', blizko(pk.x, predEsc.x) && blizko(pk.y, predEsc.y) && blizko(pk.imgX, predEsc.x),
            JSON.stringify(pk));
        kontrola('dům je zpět', blizko(rohPoEsc.x, rohPredEsc.x) && blizko(rohPoEsc.y, rohPredEsc.y));

        console.log('\n7) Zpět (Ctrl+Z) vrátí dům i podklad');
        await vyberVse();
        od = await naObrazovku(naStene.x, naStene.y);
        await tahni(od, { x: od.x - 70, y: od.y + 30 });
        kontrola('posun proběhl', !blizko((await podklad()).x, predEsc.x));
        await proved('d.undo()');
        await pauza(300);
        pk = await podklad();
        kontrola('podklad je po Zpět na původním místě', blizko(pk.x, predEsc.x) && blizko(pk.y, predEsc.y) && blizko(pk.imgX, predEsc.x),
            JSON.stringify(pk));
        kontrola('dům je po Zpět na původním místě', blizko((await uzel(ids.roh)).x, rohPredEsc.x));

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0,
            chyby.slice(0, 3).map(c => c.text + ' ' + (c.url || '')).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'podklad-dum-chyba.png')).catch(() => {});
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
