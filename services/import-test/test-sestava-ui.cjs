/**
 * Nábytková sestava (modules/sestavy.md): kuchyňská linka klikem na stěnu, automatické vybavení podle okna,
 * panel s nákresem, úprava a přesun skříňky (panel i tah myší v půdorysu), tah za konec, Zpět, rameno do L,
 * vestavěná skříň se zrcadlem, seznam objektů, 3D, sdílený odkaz, uložení a obnovení.
 *
 * Spuštění: node services/import-test/test-sestava-ui.cjs [složka snímků]
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
    const obr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const PX = d.engine.PX_PER_M; const t = d.stage.getAbsoluteTransform().copy().point({x:${x}*PX,y:${y}*PX});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const pohyb = async (b, drzi) => { await p.cmd('Input.dispatchMouseEvent', drzi ? { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1 } : { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(30); };
    const stisk = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
    const pust = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    const klik = async (b) => { await pohyb(b); await stisk(b); await pust(b); await pauza(300); };
    const tah = async (od, kam) => { await pohyb(od); await stisk(od); await pauza(40); for (let i = 1; i <= 12; i++) await pohyb({ x: od.x + (kam.x - od.x) * i / 12, y: od.y + (kam.y - od.y) * i / 12 }, true); await pust(kam); await pauza(350); };
    const pole = (sel, hod) => p.vyhodnot(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n) return false; n.value = ${JSON.stringify(String(hod))}; n.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    const sestava = (id) => p.vyhodnot(`(() => { const d = ${D}; const s = (d.engine.dum.sestavy || []).find(x => x.id === ${JSON.stringify(id)}); if (!s) return null;
        const r = window.SestavyGeo.ramenaSestavy(s); const sl = (s.ramena || []).map(a => a.sloupce.map(c => ({ sirka: c.sirka, skladba: c.skladba, celo: c.spodni?.celo, vDesce: c.spodni?.vDesce, vysoka: c.vysoka?.celo, horni: c.horni?.celo, upraveno: !!c.upraveno })));
        return { ...JSON.parse(JSON.stringify(s)), delky: r.map(x => x.L), sl, soucty: sl.map(a => a.reduce((x, c) => x + c.sirka, 0)) }; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest sestava ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Místnost 5 × 4 m: okno v horní stěně (parapet 1,1 m), dveře dole vlevo');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const b = [[0,0],[5,0],[5,4],[0,4]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            const steny = [...e.walls.values()];
            const najdi = (y) => steny.find(w => { const a = e.nodes.get(w.nodeA), c = e.nodes.get(w.nodeB); return Math.abs(a.y - y * X) < 1 && Math.abs(c.y - y * X) < 1; });
            const horni = najdi(0), dolni = najdi(4);
            const a = e.nodes.get(horni.nodeA);
            // Okno středem 3,4 m od levého líce, tedy pozice od uzlu A podle směru stěny
            const odA = a.x < 1 ? 2.8 : 5 - 2.8 - 1.2;
            e.addOpening(horni.id, odA, 1.2, 'okno', { presnaSirka: true, parapet: 1.1 });
            const a2 = e.nodes.get(dolni.nodeA);
            e.addOpening(dolni.id, a2.x < 1 ? 0.4 : 5 - 0.4 - 0.9, 0.9, 'dvere', { presnaSirka: true });
            // Panel na plátně vlevo nahoře, půdorys vpravo od něj: panel sestavy s nákresem je vysoký a nesmí krýt úchyty
            d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 6, y: 6 }; d.fitView(); d.stage.scale({ x: 0.65, y: 0.65 }); d.stage.position({ x: 440, y: 120 });
            d.renderer.render(); d.autoSave('Místnost'); return true; })()`);
        await pauza(800);

        console.log('\n2) Křesílko: přepínač Nábytek | Nábytková sestava, dlaždice Kuchyňská linka');
        await p.vyhodnot(`(async () => { const d = ${D}; if (!d.panelOpen.katalog) await d.prepniKatalog(); return true; })()`);
        await pauza(500);
        const rezim = await p.vyhodnot(`(() => { const b = document.querySelector('[data-katalog-rezim="sestava"]'); b?.click(); return !!b; })()`);
        await pauza(300);
        const dlazdice = await p.vyhodnot(`(() => { const b = document.querySelector('[data-sestava-druh="kuchyn"]'); b?.click(); return { je: !!b, skrin: !!document.querySelector('[data-sestava-druh="skrin"]') }; })()`);
        await pauza(300);
        let st = await p.vyhodnot(`(() => { const d = ${D}; return { nastroj: d.nastroj, druh: d.sestavaDruh, rezim: d.katalogRezim, napoveda: document.querySelector('[data-sestava-nastroj]')?.innerText || '' }; })()`);
        kontrola('přepínač a obě dlaždice jsou v panelu, dlaždice zapne nástroj s nápovědou', rezim && dlazdice.je && dlazdice.skrin && st.nastroj === 'sestava' && st.druh === 'kuchyn' && st.napoveda.length > 20, JSON.stringify(st));

        console.log('\n3) Klik k horní stěně: linka po celém volném úseku (4,7 m mezi líci)');
        await pohyb(await obr(2.5, 0.6));
        const nahled = await p.vyhodnot(`!!${D}._sestavaNahled`);
        kontrola('pod kurzorem je náhled linky', nahled);
        await klik(await obr(2.5, 0.6));
        let k = await sestava('K1');
        kontrola('vznikla kuchyně K1 dlouhá 4,7 m, skříňky dávají přesně délku', k && blizko(k.delky[0], 4.7, 0.03) && blizko(k.soucty[0], k.delky[0], 0.002), JSON.stringify(k && { delky: k.delky, soucty: k.soucty }));
        const typy = k ? k.sl[0].map(c => c.skladba === 'vysoka' ? c.vysoka : (c.vDesce && c.vDesce !== 'nic' ? c.vDesce : c.celo || c.skladba)) : [];
        console.log('      rozvržení: ' + typy.join(' | '));
        const iDrez = typy.indexOf('drez'), iVarna = typy.indexOf('varna'), iLed = typy.indexOf('lednice'), iMycka = typy.indexOf('mycka');
        kontrola('vybavená: lednice na kraji, dřez, myčka vedle dřezu, varná deska aspoň o skříňku dál', iLed === 0 || iLed === typy.length - 1, JSON.stringify(typy));
        // Střed okna je 3,4 m od osy levé stěny, linka začíná na jejím líci (0,15 m)
        kontrola('dřez pod oknem (střed okna 3,25 m od začátku linky)', iDrez >= 0 && (() => { let t = 0; for (let i = 0; i < iDrez; i++) t += k.sl[0][i].sirka; return t <= 3.25 && t + k.sl[0][iDrez].sirka >= 3.25; })(), JSON.stringify({ iDrez }));
        kontrola('myčka hned vedle dřezu, varná deska ob skříňku', Math.abs(iMycka - iDrez) === 1 && Math.abs(iVarna - iDrez) >= 2, JSON.stringify({ iDrez, iMycka, iVarna }));
        // Hodnoty z inspektoru přes JSON: Alpine je vrací jako proxy, ta by se do testu přenesla prázdná
        st = await p.vyhodnot(`(() => { const d = ${D}; const rv = d._sestavaRozvrh(d.engine.dum.sestavy[0]); return { kind: d.inspector?.kind, nastroj: d.nastroj, nakres: document.querySelectorAll('[data-panel-sestavy] svg [data-sloupec]').length, sloupcu: rv.sloupce.length, podOknem: rv.sloupce.filter(c => c.podOknem).length, tvaru: d.renderer.schodyLayer.find(n => n.getAttr('_sestavaId') === 'K1').length, varovani: JSON.parse(JSON.stringify(d.inspector?.varovani || [])) }; })()`);
        kontrola('vybraná, panel s nákresem všech skříněk, nástroj zpět na výběr', st.kind === 'sestava' && st.nastroj === 'vyber' && st.nakres === st.sloupcu && st.sloupcu >= 7, JSON.stringify(st));
        kontrola('pod oknem horní skříňka není, v půdorysu tvary sestavy, bez varování', st.podOknem >= 1 && st.tvaru >= st.sloupcu && (st.varovani || []).length === 0, JSON.stringify(st));
        const objekty = await p.vyhodnot(`${D}.engine.getObjectList().filter(o => o.type === 'sestava').map(o => o.id + ' ' + o.nazev)`);
        kontrola('v seznamu objektů je K1 Kuchyňská linka', objekty.length === 1 && objekty[0] === 'K1 Kuchyňská linka', JSON.stringify(objekty));
        await p.snimek(path.join(vystup, 'sestava-1-kuchyn.png'));

        console.log('\n4) Skříňka z nákresu: šířka 80 cm, ostatní se dorovnají; posun doprava');
        await p.vyhodnot(`(() => { const d = ${D}; d.sestavaVyberSloupec('0:1'); return true; })()`);
        await pauza(250);
        const panelSl = await p.vyhodnot(`!!document.querySelector('[data-sestava-sloupec-panel]')`);
        await pole('[data-sestava-sloupec="sirka"]', 80);
        await pauza(250);
        k = await sestava('K1');
        kontrola('panel skříňky je vidět, šířka 80 cm platí a součet drží délku', panelSl && blizko(k.sl[0][1].sirka, 0.8, 0.001) && k.sl[0][1].upraveno && blizko(k.soucty[0], k.delky[0], 0.002), JSON.stringify(k.sl[0].map(c => c.sirka)));
        const predPosunem = k.sl[0].map(c => c.sirka);
        await p.vyhodnot(`(() => { document.querySelector('[data-sestava-vpravo]').click(); return true; })()`);
        await pauza(250);
        k = await sestava('K1');
        kontrola('posun doprava prohodí skříňky, výběr jde se skříňkou', blizko(k.sl[0][2].sirka, 0.8, 0.001) && blizko(k.sl[0][1].sirka, predPosunem[2], 0.001) && (await p.vyhodnot(`${D}.sestavaSloupecKlic`)) === '0:2', JSON.stringify(k.sl[0].map(c => c.sirka)));

        console.log('\n5) Tah skříňky myší v půdorysu na začátek linky');
        const t0 = k.sl[0].slice(0, 2).reduce((a, c) => a + c.sirka, 0) + 0.4;
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.render(); return true; })()`);
        await tah(await obr(0.15 + t0, 0.45), await obr(0.17, 0.45));
        k = await sestava('K1');
        kontrola('80cm skříňka je teď první, součet sedí', blizko(k.sl[0][0].sirka, 0.8, 0.001) && blizko(k.soucty[0], k.delky[0], 0.002), JSON.stringify(k.sl[0].map(c => c.sirka)));

        console.log('\n6) Tah za pravý konec o metr kratší, Zpět vrátí');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.selectedSestavy.add('K1'); d.sestavaSloupecKlic = null; d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(250);
        await tah(await obr(4.85, 0.45), await obr(3.85, 0.45));
        k = await sestava('K1');
        kontrola('linka je 3,7 m a skříňky ji vyplní', blizko(k.delky[0], 3.7, 0.03) && blizko(k.soucty[0], k.delky[0], 0.002), JSON.stringify({ delky: k.delky, soucty: k.soucty }));
        await p.vyhodnot(`(() => { ${D}.undo(); return true; })()`);
        await pauza(300);
        k = await sestava('K1');
        kontrola('Zpět vrátí 4,7 m', blizko(k.delky[0], 4.7, 0.03), JSON.stringify(k.delky));

        console.log('\n7) Rameno vpravo do L (podél pravé stěny)');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.selectedSestavy.add('K1'); d.sestavaSloupecKlic = null; d.sestavaZalozka = 'rozmery'; d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(300);
        const tlacitkoL = await p.vyhodnot(`(() => { const b = document.querySelector('[data-sestava-rameno="vpravo"]'); const videt = !!b && b.offsetParent !== null; b?.click(); return videt; })()`);
        await pauza(300);
        k = await sestava('K1');
        kontrola('tlačítko přidá rameno: tři body, roh, obě ramena vyplněná', tlacitkoL && k.body.length === 3 && k.rohy.length === 1 && k.soucty.every((x, i) => blizko(x, k.delky[i] - 0.9, 0.003)), JSON.stringify({ delky: k.delky, soucty: k.soucty }));
        st = await p.vyhodnot(`(() => { const d = ${D}; const rv = d._sestavaRozvrh(d.engine.dum.sestavy[0]); return { desky: rv.desky.length, roh: JSON.parse(JSON.stringify(d.inspector?.roh || null)) }; })()`);
        kontrola('pracovní deska jde přes roh, v panelu je volba rohu', st.desky >= 2 && st.roh && st.roh.spodni === 'L', JSON.stringify(st));
        await p.snimek(path.join(vystup, 'sestava-2-L.png'));

        console.log('\n8) Vestavěná skříň vpravo od dveří u dolní stěny');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); document.querySelector('[data-sestava-druh="skrin"]')?.click(); return true; })()`);
        await pauza(300);
        await pohyb(await obr(2.4, 3.5));
        await klik(await obr(2.4, 3.5));
        const b = await sestava('B1');
        // Dveře končí na x 1,3 m (+5 cm na zárubeň), rameno kuchyně u pravé stěny začíná na x 4,23 m
        kontrola('skříň B1 vede od dveří k rameni kuchyně a do něj nevjede (2,87 m)', b && b.druh === 'skrin' && blizko(b.delky[0], 2.87, 0.05), JSON.stringify(b && b.delky));
        await p.vyhodnot(`(() => { const d = ${D}; d.sestavaZalozka = 'skrinky'; d.sestavaVyberDvere(0); return true; })()`);
        await pauza(250);
        await pole('[data-sestava-dvere-povrch]', 'stribrne');
        await pauza(250);
        await p.vyhodnot(`(() => { document.querySelector('[data-sestava-dvere-druh="otocne"]')?.click(); return true; })()`);
        await pauza(250);
        const b2 = await sestava('B1');
        kontrola('první dveře zrcadlové, dveře otočné', b2.zrcadla?.[0] === 'stribrne' && b2.dvere === 'otocne', JSON.stringify({ zrcadla: b2.zrcadla, dvere: b2.dvere }));

        console.log('\n9) 3D a sdílený odkaz');
        await p.vyhodnot(`(async () => { const d = ${D}; if (!d.rezim3d) await d.prepni3d(); return true; })()`);
        await pauza(4000);
        st = await p.vyhodnot(`(() => { const _3d = window._kk3d; const sk = _3d.sestavySkupina; const meshe = sk ? sk.children.map(g => g.children.length) : [];
            const d = ${D}; const model = d._zapecModel(); return { skupin: sk ? sk.children.length : 0, meshe, trojuhelniku: model.meshe.reduce((a, m) => a + atob(m.pozice).length / 36, 0) }; })()`);
        kontrola('obě sestavy jsou ve 3D, každá z několika materiálů', st.skupin === 2 && st.meshe.every(n => n >= 3), JSON.stringify(st));
        await p.vyhodnot(`(() => { const _3d = window._kk3d; const c = new THREE.Vector3(2.5, 1, 1.5); _3d.controls.target.copy(c); _3d.camera.position.set(2.5, 3.2, 6.5); _3d.camera.zoom = 2.2; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
        await pauza(1500);
        await p.snimek(path.join(vystup, 'sestava-3-3d.png'));
        await p.vyhodnot(`(() => { ${D}.prepni2d(); return true; })()`);
        await pauza(800);

        console.log('\n10) Uložení a obnovení stránky');
        await p.vyhodnot(`(async () => { const d = ${D}; await d.ulozit(); return true; })()`);
        await pauza(2500);
        const pred = await p.vyhodnot(`JSON.stringify(${D}.engine.dum.sestavy)`);
        await p.vyhodnot('location.reload(); true');
        await pauza(3500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor po obnovení');
        const po = await p.vyhodnot(`JSON.stringify(${D}.engine.dum.sestavy)`);
        kontrola('sestavy se uložily beze změny', pred === po && JSON.parse(po).length === 2, `${pred.length} / ${po.length}`);

        console.log('\n11) Smazání skříně ze seznamu objektů');
        await p.vyhodnot(`(() => { ${D}.smazatObjekt('B1'); return true; })()`);
        await pauza(300);
        const zbyva = await p.vyhodnot(`${D}.engine.dum.sestavy.map(s => s.id)`);
        kontrola('zůstala jen kuchyně', JSON.stringify(zbyva) === '["K1"]', JSON.stringify(zbyva));

        const chybyKonzole = p.chyby.filter(t => !/favicon|ERR_|net::/.test(t));
        kontrola('konzole bez chyb', chybyKonzole.length === 0, chybyKonzole.slice(0, 5).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
