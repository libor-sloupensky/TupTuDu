/**
 * Dům přes podlaží: přepínač, kopie stěn, magnet na spodní podlaží, podepření, posun
 * domu, schody, výškové plochy, střecha, podkroví, přehled ploch, 3D, uložení, Zpět.
 *
 * Spuštění: node services/import-test/test-dum-ui.cjs [složka snímků]
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
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const pohyb = async (b) => { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(40); };
    const klik = async (b) => {
        await pohyb(b);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(200);
    };
    const tah = async (od, kam) => {
        await pohyb(od);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: od.x, y: od.y, button: 'left', clickCount: 1, buttons: 1 });
        for (let i = 1; i <= 8; i++) await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: od.x + (kam.x - od.x) * i / 8, y: od.y + (kam.y - od.y) * i / 8, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: kam.x, y: kam.y, button: 'left', clickCount: 1 });
        await pauza(300);
    };
    const PX = 80;
    const m = (x, y) => naObr(x * PX, y * PX);

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
            body: JSON.stringify({ nazev: 'ClaudeTest dům ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Přízemí a přepínač podlaží');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.4, 'obvodova');
            const w2 = e.addWall(10*X, 0, 10*X, 7*X, 0.4, 'obvodova');
            const w3 = e.addWall(10*X, 7*X, 0, 7*X, 0.4, 'obvodova');
            const w4 = e.addWall(0, 7*X, 0, 0, 0.4, 'obvodova');
            const w5 = e.addWall(5*X, 0, 5*X, 7*X, 0.25, 'nosna');
            const w6 = e.addWall(5*X, 3.5*X, 10*X, 3.5*X, 0.1, 'pricka');
            e.addOpening(w1.id, 2, 1.2, 'okno', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++;
            return { w1: w1.id, w2: w2.id, w3: w3.id, w4: w4.id, w5: w5.id, w6: w6.id }; })()`);
        await pauza(400);
        const radky = () => p.vyhodnot(`[...document.querySelectorAll('#kk-podlazi-seznam .kk-podlazi-radek')].map(b => b.dataset.radek + (b.classList.contains('kk-aktivni') ? '*' : ''))`);
        let pill = await radky();
        kontrola('panel Podlaží a plochy: Střecha a 1.NP (aktivní), levá lišta není', JSON.stringify(pill) === JSON.stringify(['strecha', 'P1*']) && !(await p.vyhodnot(`!!document.getElementById('kk-podlazi')`)), JSON.stringify(pill));
        await p.vyhodnot(`(() => { document.getElementById('kk-pridat-podlazi').click(); return true; })()`);
        await pauza(200);
        let volby = await p.vyhodnot(`(() => { const d = ${D}; return { podlazi: d.engine.dum.podlazi.length, tlacitka: [...document.querySelectorAll('#kk-podlazi-seznam button.kk-btn')].map(b => b.innerText.trim()), upravy: document.querySelectorAll('.kk-podlazi-uprava').length }; })()`);
        kontrola('„Přidat podlaží" jen nabídne volby: nic nevzniklo a žádné pole k přejmenování', volby.podlazi === 1 && volby.upravy === 0 && volby.tlacitka.includes('Patro nahoře'), JSON.stringify(volby));

        console.log('\n2) Nové podlaží s kopií obvodových a nosných stěn');
        await p.vyhodnot(`(() => { [...document.querySelectorAll('#kk-podlazi-seznam button.kk-btn')].find(b => b.innerText.trim() === 'Patro nahoře').click(); return true; })()`);
        await pauza(400);
        pill = await radky();
        kontrola('nové patro je hned aktivní řádek nahoře, volby se zavřely', JSON.stringify(pill) === JSON.stringify(['strecha', 'P2*', 'P1']) && await p.vyhodnot(`${D}.podlaziPridat === false`), JSON.stringify(pill));
        let stav = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const typy = [...e.walls.values()].map(w => w.typ); const koty = [...e.kotyPodlazi().entries()];
            return { aktivni: e.aktivniPodlazi().nazev, typy, otvory: e.openings.size, koty, spodek: !!d.renderer._spodekObraz, svetla: e.svetlaVyska(), kroky: d.historie.length }; })()`);
        kontrola('2.NP aktivní, bez příčky a otvorů, s obvodovými a nosnou', stav.aktivni === '2.NP' && !stav.typy.includes('pricka') && stav.typy.includes('nosna') && stav.otvory === 0, JSON.stringify(stav));
        kontrola('kóty: 1.NP 0, 2.NP +3,05', blizko(stav.koty[1][1], 3.05, 1e-6), JSON.stringify(stav.koty));
        kontrola('spodní podlaží je jeden obrázek', stav.spodek);
        const vrstvy = await p.vyhodnot(`(() => { const r = ${D}.renderer; return { spodek: r.spodekLayer.getChildren().length, steny: r._wallShapes.size }; })()`);
        kontrola('spodní podlaží nemá na plátně tvary, jen 1 obrázek', vrstvy.spodek === 1, JSON.stringify(vrstvy));
        await p.snimek(path.join(vystup, 'dum-2np.png'));

        console.log('\n3) Přepínání a Zpět přes podlaží');
        // Tužka u 1.NP upravuje 1.NP, i když se stojí na 2.NP — a nepřepíná
        await p.vyhodnot(`(() => { document.querySelector('[data-upravit=P1]').click(); return true; })()`);
        await pauza(200);
        const upr = await p.vyhodnot(`(() => { const d = ${D}; const u = document.querySelector('[data-uprava=P1]'); const nazev = u && u.querySelector('input[type=text]').value; return { aktivni: d.engine.dum.aktivni, nazev, jinych: document.querySelectorAll('.kk-podlazi-uprava').length }; })()`);
        kontrola('tužka rozbalí úpravy toho řádku (1.NP) a nepřepne podlaží', upr.aktivni === 'P2' && upr.nazev === '1.NP' && upr.jinych === 1, JSON.stringify(upr));
        await p.vyhodnot(`(() => { document.querySelector('[data-upravit=P1]').click(); document.querySelector('.kk-podlazi-radek[data-radek=P1]').click(); return true; })()`);
        await pauza(300);
        stav = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; return { aktivni: e.aktivniPodlazi().nazev, pricka: [...e.walls.values()].some(w => w.typ === 'pricka'), otvory: e.openings.size, kroky: d.historie.length, sp: !!d.renderer._spodekObraz }; })()`);
        kontrola('1.NP má zpět příčku a okno, spodní obrázek zmizel', stav.aktivni === '1.NP' && stav.pricka && stav.otvory === 1 && !stav.sp, JSON.stringify(stav));
        const krokyPred = stav.kroky;
        await p.vyhodnot(`(() => { ${D}.naPodlazi('P2'); return true; })()`);
        await pauza(300);
        stav = await p.vyhodnot(`(() => ({ kroky: ${D}.historie.length }))()`);
        kontrola('přepnutí není krok historie (nespotřebuje limit úprav)', stav.kroky === krokyPred, JSON.stringify(stav));

        console.log('\n3b) Místnosti se počítají až po usazení stěny');
        const pocitadlo = await p.vyhodnot(`(() => { const R = window.MistnostiRastr; if (!R._puvodni) { R._puvodni = R.spocitej; R.spocitej = (...a) => { R._pocet = (R._pocet || 0) + 1; return R._puvodni(...a); }; } R._pocet = 0; const d = ${D}; d.nastroj = 'vyber'; d.fitView(); d.renderer.clearSelection(); d.renderer.render(); return true; })()`);
        await pauza(300);
        // Volná příčka uprostřed místnosti: jde táhnout a mění otisk geometrie
        const tazena = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const w = e.addWall(2 * X, 2 * X, 2 * X, 5 * X, 0.1, 'pricka'); d.renderer.render(); return { id: w.id, x: 2 * X, y: 3.5 * X }; })()`);
        await pauza(300);
        const tzOd = await naObr(tazena.x, tazena.y), tzKam = await naObr(tazena.x + 0.5 * PX, tazena.y);
        await p.vyhodnot(`(() => { window.MistnostiRastr._pocet = 0; return true; })()`);
        await pohyb(tzOd);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: tzOd.x, y: tzOd.y, button: 'left', clickCount: 1, buttons: 1 });
        for (let i = 1; i <= 10; i++) { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: tzOd.x + (tzKam.x - tzOd.x) * i / 10, y: tzOd.y, button: 'left', buttons: 1 }); await pauza(30); }
        const zaTahu = await p.vyhodnot(`window.MistnostiRastr._pocet`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: tzKam.x, y: tzOd.y, button: 'left', clickCount: 1 });
        await pauza(400);
        const poTahu = await p.vyhodnot(`window.MistnostiRastr._pocet`);
        const posunuta = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = e.walls.get(${JSON.stringify(tazena.id)}); const x = e.nodes.get(w.nodeA).x; e.removeWall(w.id); d.renderer.clearSelection(); d.renderer.render(); return x; })()`);
        kontrola('stěna jela, za tahu 0 přepočtů rastru, po puštění se dopočítá', posunuta > tazena.x + 20 && zaTahu === 0 && poTahu >= 1, JSON.stringify({ zaTahu, poTahu, posunuta }));
        await pauza(200);

        console.log('\n4) Magnet na spodní podlaží');
        const mg = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const w = [...e.walls.values()].find(w => w.typ === 'nosna'); if (!w) return null;
            const id = w.id; e.removeWall(id); d.renderer.render();
            const roh = e.snapPoint(5 * X + 4, 3, 15); const osa = e.snapPoint(5 * X + 4, 3 * X, 15); const volne = e.snapPoint(7 * X, 3 * X, 15);
            return { roh: [roh.x / X, roh.y / X, roh.magnetSpodek || !!roh.magnetNodeId], osa: [osa.x / X, osa.magnetSpodek], volne: volne.magnetSpodek || false }; })()`);
        kontrola('smazaná nosná nahoře: konec se chytí na osu spodní nosné stěny, mimo ni ne', mg && blizko(mg.osa[0], 5, 0.001) && mg.osa[1] === true && !mg.volne, JSON.stringify(mg));
        await p.vyhodnot(`(() => { const d = ${D}; d.fitView(); d.renderer.render(); d.nastroj = 'stena'; d.stenaTyp = 'nosna'; d.tloustkaSteny = 0.25; return true; })()`);
        await pauza(200);
        // Tah stěny: začátek 1,5 m od nosné dole, konec míří 3 cm vedle její osy (x = 5,00)
        const stZ = await m(7, 1.5), stK = await m(5.04, 1.5);
        await pohyb(stZ);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: stZ.x, y: stZ.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: stZ.x, y: stZ.y, button: 'left', clickCount: 1 });
        await pauza(150);
        for (let i = 1; i <= 5; i++) await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: stZ.x + (stK.x - stZ.x) * i / 5, y: stZ.y + (stK.y - stZ.y) * i / 5 });
        await pauza(150);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: stK.x, y: stK.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: stK.x, y: stK.y, button: 'left', clickCount: 1 });
        await pauza(250);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
        await pauza(200);
        const nakreslena = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.nastroj = 'vyber'; const w = [...e.walls.values()].filter(s => s.typ === 'nosna').pop(); if (!w) return null; const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); const id = w.id; const out = { a: [+(a.x / 80).toFixed(3), +(a.y / 80).toFixed(3)], b: [+(b.x / 80).toFixed(3), +(b.y / 80).toFixed(3)] }; e.removeWall(id); d.renderer.render(); return out; })()`);
        kontrola('kreslená stěna: konec se přichytí na osu nosné v podlaží pod (x = 5,00)', nakreslena && (blizko(nakreslena.a[0], 5, 0.005) || blizko(nakreslena.b[0], 5, 0.005)), JSON.stringify(nakreslena));

        console.log('\n5) Podepření nosných stěn');
        let nep = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const w = e.addWall(7.5 * X, 0, 7.5 * X, 7 * X, 0.25, 'nosna'); d.renderer.render(); d._selectionTick++;
            const v = d.podepreniPodlazi(e.dum.aktivni); return { id: w.id, pocet: v.size, delka: v.get(w.id)?.delka, seznam: d.seznamPodlazi.map(p => p.nepodeprene) }; })()`);
        kontrola('nová nosná bez podpory se označí a počet je u podlaží v přepínači', nep.pocet === 1 && nep.delka > 6 && nep.seznam[0] === 1, JSON.stringify(nep));
        const znaceni = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; r.render(); const v = r.stage.getLayers();
            const skupin = r.schodyLayer.getChildren().filter(n => n.getClassName() === 'Group' && n.clipFunc()).length;
            const cary = r.schodyLayer.getChildren().filter(n => n.getClassName() === 'Line' && (n.dash() || []).length).length;
            return { skupin, cary, spodekNadMistnostmi: v.indexOf(r.spodekLayer) > v.indexOf(r.mistnostiLayer), spodekPodStenami: v.indexOf(r.spodekLayer) < v.indexOf(r.wallLayer), obraz: r.spodekLayer.getChildren().length }; })()`);
        kontrola('nepodepřený úsek je šrafa, ne čárkovaná čára; podlaží níž je vidět přes výplň místností', znaceni.skupin >= 1 && znaceni.cary === 0 && znaceni.spodekNadMistnostmi && znaceni.spodekPodStenami && znaceni.obraz === 1, JSON.stringify(znaceni));
        let insp = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([${JSON.stringify(nep.id)}]); d._selectionTick++; const i = d.inspector; return { kind: i.kind, pod: i.podepreni ? { dole: i.podepreni.dole, delka: i.podepreni.delka } : null, auto: i.vyskaAuto }; })()`);
        kontrola('panel stěny hlásí nepodepření a výšku podle podlaží 2,80', insp.kind === 'wall' && insp.pod && insp.pod.dole === '1.NP' && blizko(insp.auto, 2.8, 1e-6), JSON.stringify(insp));
        await pauza(300);
        await p.snimek(path.join(vystup, 'dum-podepreni.png'));
        const zajisteni = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const r = d.renderer; const id = ${JSON.stringify(nep.id)}; r.setSelection([id]); d._selectionTick++;
            const srafy = () => { r.render(); return r.schodyLayer.getChildren().filter(n => n.getClassName() === 'Group' && n.clipFunc()).length; };
            const kroku = d.historie.length;
            d.stenaZajistena(true); d._selectionTick++;
            const po = { vsechny: d.podepreniPodlazi(e.dum.aktivni).size, problemy: d.nepodeprenePodlazi(e.dum.aktivni).size, seznam: d.seznamPodlazi.map(p => p.nepodeprene)[0], srafy: srafy(), panel: d.inspector.podepreni?.zajisteno, ulozeno: JSON.stringify(e.toJSON()).includes('"zajisteno"'), krok: d.historie.length - kroku };
            const w = e.walls.get(id), b = e.nodes.get(w.nodeB), X = e.PX_PER_M;
            const a = e.nodes.get(w.nodeA); a.x += 0.5 * X; b.x += 0.5 * X; const zmena = { problemy: d.nepodeprenePodlazi(e.dum.aktivni).size, srafy: srafy() };
            a.x -= 0.5 * X; b.x -= 0.5 * X; const zpet = d.nepodeprenePodlazi(e.dum.aktivni).size;
            d.stenaZajistena(false); d._selectionTick++;
            const zrus = { problemy: d.nepodeprenePodlazi(e.dum.aktivni).size, srafy: srafy(), panel: d.inspector.podepreni?.zajisteno };
            return { po, zmena, zpet, zrus }; })()`);
        kontrola('„Staticky zajištěno": šrafa a počet zmizí, uloží se jedním krokem, po posunu stěny se vrátí, jde zrušit', zajisteni.po.vsechny === 1 && zajisteni.po.problemy === 0 && zajisteni.po.seznam === 0 && zajisteni.po.srafy === 0 && zajisteni.po.panel === true && zajisteni.po.ulozeno && zajisteni.po.krok === 1 && zajisteni.zmena.problemy === 1 && zajisteni.zmena.srafy >= 1 && zajisteni.zpet === 0 && zajisteni.zrus.problemy === 1 && zajisteni.zrus.srafy >= 1 && zajisteni.zrus.panel === false, JSON.stringify(zajisteni));
        nep = await p.vyhodnot(`(() => { const d = ${D}; d.pridatPodperu(); const po = d.podepreniPodlazi(d.engine.dum.aktivni).size; const dole = d.engine.enginePodlazi('P1'); return { po, nosneDole: [...dole.walls.values()].filter(w => w.typ === 'nosna').length }; })()`);
        kontrola('„Přidat podpěru dolů": stěna vznikne v 1.NP, označení zmizí', nep.po === 0 && nep.nosneDole >= 2, JSON.stringify(nep));

        console.log('\n6) Výška stěny a konstrukční výška podlaží');
        const vys = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.setPodlazi('P1', 'vyska', 3.3); const kota = e.kotaPodlazi('P2'); d.setPodlazi('P2', 'kota', 3.5); const kota2 = e.kotaPodlazi('P2'); const dole = e.kotaPodlazi('P1'); d.kotaNaNulu(); const zpetKota = e.kotaPodlazi('P2');
            d.setWallVyska(2.2); const w = [...d.renderer.selectedWalls].map(id => e.walls.get(id))[0]; const v = e.vyskaSteny(w); d.setWallVyska(0); return { kota, kota2, dole, zpetKota, v, zpet: e.vyskaSteny(w) }; })()`);
        kontrola('kóta se dopočítá z výšky; přepsání posune celý dům, podlaží zůstanou na sobě a jde to vrátit; výška stěny vlastní i podle podlaží', blizko(vys.kota, 3.3, 1e-6) && blizko(vys.kota2, 3.5, 1e-6) && blizko(vys.dole, 0.2, 1e-6) && blizko(vys.zpetKota, 3.3, 1e-6) && blizko(vys.v, 2.2, 1e-6) && blizko(vys.zpet, 2.8, 1e-6), JSON.stringify(vys));

        console.log('\n7) Schodiště z 1.NP do 2.NP');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.naPodlazi('P1'); d.fitView(); d.renderer.render(); return true; })()`);
        await pauza(300);
        await p.vyhodnot(`(() => { ${D}.zacniSchody(); return true; })()`);
        await klik(await m(1, 1));
        await pohyb(await m(1, 3));
        await klik(await m(1.02, 4));
        let sch = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const s = e.dum.schodiste[0]; const g = s && window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); const i = d.inspector;
            return s && { id: s.id, od: s.odPodlazi, do: s.doPodlazi, uhel: +(s.uhel * 180 / Math.PI).toFixed(1), n: g.n, v: +g.v.toFixed(3), b: +g.b.toFixed(3), inspektor: i && i.kind, nastroj: d.nastroj, tvaru: d.renderer.schodyLayer.getChildren().length }; })()`);
        kontrola('schodiště vzniklo, směr dorovnaný na osu domu (90°), stupně spočítané z výšky 3,30 m', sch && sch.od === 'P1' && sch.do === 'P2' && blizko(sch.uhel, 90, 0.1) && sch.n === 19 && blizko(sch.v, 3.3 / 19, 0.001) && sch.inspektor === 'schodiste', JSON.stringify(sch));
        await pauza(200);
        await p.snimek(path.join(vystup, 'dum-schody-dole.png'));
        await tah(await m(1, 2), await m(1.5, 2));
        sch = await p.vyhodnot(`(() => { const s = ${D}.engine.dum.schodiste[0]; return { x: +s.x.toFixed(2), y: +s.y.toFixed(2) }; })()`);
        kontrola('schodiště jde přetáhnout', blizko(sch.x, 1.5, 0.1), JSON.stringify(sch));
        const L = await p.vyhodnot(`(() => { const d = ${D}; d.setSchody('tvar', 'L'); const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); return { body: g.obrys.length, stupne: g.stupne.length, podesta: g.stupne.some(u => u.podesta), pohodlne: g.pohodlne }; })()`);
        kontrola('schody do L mají podestu a obrys tvaru L', L.body === 6 && L.podesta && L.pohodlne, JSON.stringify(L));
        await p.vyhodnot(`(() => { const d = ${D}; d.setSchody('tvar', 'prime'); d.naPodlazi('P2'); return true; })()`);
        await pauza(300);
        const horni = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; const texty = r.schodyLayer.find('Text').map(t => t.text()); const masky = d._maskyPodlazi('P2'); return { texty, vyrezy: masky.vyrezy.length }; })()`);
        kontrola('na 2.NP je prostup se šipkou dolů a odečítá se z plochy', horni.texty.includes('↓ dolů') && horni.vyrezy === 1, JSON.stringify(horni));
        await p.snimek(path.join(vystup, 'dum-schody-nahore.png'));

        console.log('\n8) Úroveň podlahy místnosti (výšková plocha patří místnosti, bez kreslení)');
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P1'); return true; })()`);
        await pauza(300);
        // Místnost vpravo nahoře mezi nosnou (x = 5) a podpěrou z kroku 5 (x = 7,5): klik vybere místnost, panel nabídne úroveň podlahy
        await klik(await m(6.3, 1.8));
        let pl = await p.vyhodnot(`(() => { const d = ${D}; const i = d.inspector; return i && { kind: i.kind, typ: i.uroven && i.uroven.typ, plocha: i.plocha, ploch: d.engine.dum.plochy.length }; })()`);
        kontrola('klik do místnosti: panel místnosti, výchozí „v úrovni podlaží", bez záznamu plochy', pl && pl.kind === 'mistnost' && pl.typ === 'bezna' && pl.ploch === 0 && pl.plocha > 5, JSON.stringify(pl));
        pl = await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('typ', 'zvysena'); const a = d.engine.dum.plochy[0]; const i = d.inspector; const m = d._vybranaMistnost();
            return a && { typ: a.typ, dh: a.dh, body: a.body.length, mistnost: a.mistnost === m.id, kind: i && i.kind, utyp: i && i.uroven.typ, vyssi: i && i.uroven.vyssi.map(v => v.nazev), nastroj: d.nastroj }; })()`);
        kontrola('zvýšená: plocha s obrysem místnosti (4 rohy), +30 cm, přenos do 2.NP nabídnut, panel zůstává u místnosti', pl && pl.typ === 'zvysena' && blizko(pl.dh, 0.3, 1e-9) && pl.body === 4 && pl.mistnost && pl.kind === 'mistnost' && pl.utyp === 'zvysena' && JSON.stringify(pl.vyssi) === '["2.NP"]', JSON.stringify(pl));
        const dh = await p.vyhodnot(`(() => { const d = ${D}; return d._dhVBode({ x: 7 * 80, y: 2 * 80 }); })()`);
        kontrola('uvnitř místnosti je podlaha +0,30', blizko(dh, 0.3, 1e-6), String(dh));
        const prenos = await p.vyhodnot(`(() => { const d = ${D}; const na2 = d.plochyNaPodlazi('P2').length; d.prepniPrenos('P2'); const vyp = d.plochyNaPodlazi('P2').length; d.prepniPrenos('P2'); return { na2, vyp, zpet: d.plochyNaPodlazi('P2').length }; })()`);
        kontrola('zvýšení se přenáší do 2.NP, jde tam vypnout', prenos.na2 === 1 && prenos.vyp === 0 && prenos.zpet === 1, JSON.stringify(prenos));
        await p.snimek(path.join(vystup, 'dum-plocha.png'));
        const vyrez = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; const m = d._vybranaMistnost(); d.setMistnostUroven('typ', 'bez_podlahy'); r._mistnostiCache = null; r.render();
            const popisky = r.mistnostiLayer.find('Text').map(t => t.text()); return { po: r.plochaMistnosti(m.id), popisek: popisky.some(t => /bez podlahy/.test(t)), vyrezu: d._maskyPodlazi('P1').vyrezy.length }; })()`);
        kontrola('bez podlahy: plocha místnosti se nepočítá, popisek „bez podlahy", otvor v podlaze', vyrez.po !== null && vyrez.po < 0.2 && vyrez.popisek && vyrez.vyrezu === 1, JSON.stringify(vyrez));
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('typ', 'zvysena'); return true; })()`);
        const schodky = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.schodkyNaPlochu();
            const s = e.dum.schodiste[e.dum.schodiste.length - 1]; const i = d.inspector; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); const vyrezu = d._maskyPodlazi('P1').vyrezy.length;
            const out = { trasa: i.trasa, n: g.n, v: +g.v.toFixed(3), vyrezu, od: s.odPodlazi, do: s.doPodlazi }; d.smazatSchody(); return out; })()`);
        kontrola('krátké schody k podlaze: výška z plochy, v rámci podlaží, nic neprorážejí', /mezi úrovněmi/.test(schodky.trasa) && schodky.n === 2 && blizko(schodky.v, 0.15, 0.001) && schodky.vyrezu === 0 && schodky.od === 'P1' && schodky.do === 'P1', JSON.stringify(schodky));
        // Obrys sleduje místnost: posun příčky změní obrys plochy bez kreslení a vrácení ho vrátí
        const sleduje = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const a = e.dum.plochy[0]; const pred = JSON.stringify(a.body);
            const w = [...e.walls.values()].find(w => w.typ === 'pricka'); const n1 = e.nodes.get(w.nodeA), n2 = e.nodes.get(w.nodeB); n1.y += 40; n2.y += 40;
            d.renderer._mistnostiCache = null; d.renderer.render(); const po = JSON.stringify(a.body); n1.y -= 40; n2.y -= 40; d.renderer._mistnostiCache = null; d.renderer.render();
            return { zmena: pred !== po, zpet: JSON.stringify(a.body) === pred }; })()`);
        kontrola('obrys plochy sleduje místnost (posun příčky ho změní a vrácení vrátí)', sleduje.zmena && sleduje.zpet, JSON.stringify(sleduje));
        // Na 2.NP klik přes přenesenou plochu patří místnosti (jinak by ji nešlo vybrat a přejmenovat).
        // Panel místnosti vypíše zvýšení z 1.NP se Schody, schody vzniknou tam, přenos jde vypnout.
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.naPodlazi('P2'); return true; })()`);
        await pauza(400);
        await klik(await m(6.3, 1.8));
        await pauza(200);
        await p.snimek(path.join(vystup, 'dum-plocha-nahore.png'));
        const nahore = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const i = d.inspector; if (!i || i.kind !== 'mistnost') return { kind: i && i.kind };
            const z = i.prenesene[0]; if (!z) return { kind: i.kind, prenesene: 0 };
            const out = { kind: i.kind, prenesene: i.prenesene.length, domov: z.domov, zMistnosti: z.mistnost, dh: z.dh, uroven: i.uroven.typ, radek: document.getElementById('kk-panel-otvoru').innerText.includes('Zvýšená podlaha +30 cm z 1.NP'), bezZdvojeni: d.renderer.mistnostiLayer.find('Text').every(t => !t.text().includes('(z ')) };
            d.setMistnostNazev('Test nahoře'); out.nazev = d.inspector.nazev; d.setMistnostNazev(i.nazev);
            d.schodkyNaPlochu(z.id); const s = e.dum.schodiste[e.dum.schodiste.length - 1]; out.od = s.odPodlazi; out.do = s.doPodlazi; out.vyska = s.vyskaRucne;
            d.smazatSchody(); d.prepniPrenos('P2', z.id); out.vypnuto = d.plochyNaPodlazi('P2').length; d.prepniPrenos('P2', z.id); out.zpet = d.plochyNaPodlazi('P2').length; return out; })()`);
        kontrola('2.NP: klik přes přenesenou plochu vybere místnost a jde přejmenovat, panel vypíše zvýšení z 1.NP, schody vzniknou na 2.NP, přenos jde vypnout', nahore.kind === 'mistnost' && nahore.prenesene === 1 && nahore.domov === '1.NP' && nahore.zMistnosti && blizko(nahore.dh, 0.3, 1e-9) && nahore.uroven === 'bezna' && nahore.radek && nahore.bezZdvojeni && nahore.nazev === 'Test nahoře' && nahore.od === 'P2' && nahore.do === 'P2' && blizko(nahore.vyska, 0.3, 1e-9) && nahore.vypnuto === 0 && nahore.zpet === 1, JSON.stringify(nahore));
        // Kde pod plochou uzavřená místnost není (otevřená stěna), vybere se plocha sama a má vlastní panel
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.renderer.clearSelection();
            const w = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y) < 1 && Math.abs(b.y) < 1 && Math.min(a.x, b.x) < 6.3 * X && Math.max(a.x, b.x) > 6.3 * X; });
            e.pushUndo(); e.removeWall(w.id); d.renderer._mistnostiCache = null; d.renderer.render(); return true; })()`);
        await pauza(300);
        await klik(await m(6.3, 1.8));
        const bezMistnosti = await p.vyhodnot(`(() => { const d = ${D}; const i = d.inspector; const out = { kind: i && i.kind, domov: i && i.domov, dh: i && i.dh }; d.renderer.clearSelection(); d.engine.undo(); d.renderer.render(); return out; })()`);
        kontrola('bez uzavřené místnosti se vybere přenesená plocha s vlastním panelem', bezMistnosti.kind === 'plocha' && bezMistnosti.domov === '1.NP' && blizko(bezMistnosti.dh, 0.3, 1e-9), JSON.stringify(bezMistnosti));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.naPodlazi('P1'); return true; })()`);
        await pauza(300);

        console.log('\n8b) Schody k podlaze: leží přes hranici místnosti, podlaha jimi neprotéká');
        const geoPlochy = await p.vyhodnot(`(() => { const G = window.DumGeo; const A = [{x:0,y:0},{x:10,y:0},{x:10,y:10},{x:0,y:10}]; const C = [{x:4,y:4},{x:6,y:4},{x:6,y:6},{x:4,y:6}], P = [{x:8,y:4},{x:12,y:4},{x:12,y:6},{x:8,y:6}], V = [{x:13,y:4},{x:15,y:4},{x:15,y:6},{x:13,y:6}], Ven = [{x:-2,y:4},{x:0,y:4},{x:0,y:6},{x:-2,y:6}], Dov = [{x:0,y:4},{x:2,y:4},{x:2,y:6},{x:0,y:6}];
            const pl = (q) => Math.abs(q.reduce((s, a, i) => { const b = q[(i + 1) % q.length]; return s + a.x * b.y - b.x * a.y; }, 0)) / 2;
            return { uvnitrZbytek: G.odectiKonvexni(A, C).reduce((s, q) => s + pl(q), 0), presZbytek: G.odectiKonvexni(A, P).reduce((s, q) => s + pl(q), 0), mimoNull: G.odectiKonvexni(A, V) === null, pres: G.hraniceSchodu(P, A).dotek, venku: G.hraniceSchodu(V, A), uvnitr: G.hraniceSchodu(C, A), zvysVen: G.hraniceSchodu(Ven, A, 1).dotek, zvysDov: G.hraniceSchodu(Dov, A, 1), snizVen: G.hraniceSchodu(Ven, A, -1), snizDov: G.hraniceSchodu(Dov, A, -1).dotek, zvysUvnitr: G.hraniceSchodu(C, A, 1), presObe: [G.hraniceSchodu(P, A, 1).dotek, G.hraniceSchodu(P, A, -1).dotek], poOse: G.hraniceSchodu([{x:5,y:7},{x:7,y:7},{x:7,y:9},{x:5,y:9}], A, 1, { body: [{x:5,y:7},{x:5,y:9}], smer: {x:-1,y:0} }) }; })()`);
        kontrola('geometrie: odečtení schodů z desky a nejmenší posun k hranici', blizko(geoPlochy.uvnitrZbytek, 96, 1e-6) && blizko(geoPlochy.presZbytek, 96, 1e-6) && geoPlochy.mimoNull && geoPlochy.pres && !geoPlochy.venku.dotek && blizko(geoPlochy.venku.x, -3, 1e-6) && !geoPlochy.uvnitr.dotek && blizko(Math.hypot(geoPlochy.uvnitr.x, geoPlochy.uvnitr.y), 4, 1e-6), JSON.stringify(geoPlochy));
        kontrola('pravidlo strany: ke zvýšené celé venku ano, celé uvnitř ne; u snížené naopak; přes hranici vždy', geoPlochy.zvysVen && !geoPlochy.zvysDov.dotek && blizko(geoPlochy.zvysDov.x, -1, 1e-6) && !geoPlochy.snizVen.dotek && blizko(geoPlochy.snizVen.x, 1, 1e-6) && geoPlochy.snizDov && blizko(Math.hypot(geoPlochy.zvysUvnitr.x, geoPlochy.zvysUvnitr.y), 5, 1e-6) && geoPlochy.presObe[0] && geoPlochy.presObe[1] && blizko(geoPlochy.poOse.x, -6, 1e-6) && blizko(geoPlochy.poOse.y, 0, 1e-6), JSON.stringify(geoPlochy));
        const stavSchodu = (kod = '') => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const posledni = () => e.dum.schodiste[e.dum.schodiste.length - 1]; ${kod}; const s = posledni();
            const a = d._plochaSchodu(s); const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); const A = d._plochaPoly(a);
            const cx = g.obrys.reduce((v, q) => v + q.x, 0) / g.obrys.length / 80, cy = g.obrys.reduce((v, q) => v + q.y, 0) / g.obrys.length / 80;
            const sx = A.reduce((v, q) => v + q.x, 0) / A.length / 80, sy = A.reduce((v, q) => v + q.y, 0) / A.length / 80;
            return { vazba: s.plocha === a.id, dotek: window.DumGeo.hraniceSchodu(g.obrys, A, Math.sign(a.dh)).dotek, uvnitr: g.obrys.filter(q => window.DumGeo.bodVPolygonu(q, A)).length, vne: g.obrys.filter(q => !window.DumGeo.bodVPolygonu(q, A)).length, cx: +cx.toFixed(3), cy: +cy.toFixed(3), sx: +sx.toFixed(3), sy: +sy.toFixed(3), uhel: +(s.uhel * 180 / Math.PI).toFixed(1), H: +d._vyskaMeziPodlazimi(s).toFixed(3), kind: d.inspector && d.inspector.kind, horni: [+(s.x + Math.cos(s.uhel) * g.delka).toFixed(3), +(s.y - Math.sin(s.uhel) * g.delka).toFixed(3)], dh: d._plochaSchodu(s).dh }; })()`);
        await klik(await m(6.3, 1.8));
        let sp = await stavSchodu(`d.schodkyNaPlochu()`);
        kontrola('nové schody mají vazbu na plochu a leží na její hranici', sp.vazba && sp.dotek && sp.kind === 'schodiste', JSON.stringify(sp));
        // Směr od středu místnosti ke schodům, po hlavní ose: „ven" z místnosti, kolmo = podél hrany
        const ven = Math.abs(sp.cx - sp.sx) >= Math.abs(sp.cy - sp.sy) ? { x: Math.sign(sp.cx - sp.sx), y: 0 } : { x: 0, y: Math.sign(sp.cy - sp.sy) };
        const c0 = { x: sp.cx, y: sp.cy };
        await tah(await m(c0.x, c0.y), await m(c0.x + ven.x * 3, c0.y + ven.y * 3));
        sp = await stavSchodu();
        kontrola('tah 3 m od místnosti: schody zůstanou na hranici', sp.dotek && Math.hypot(sp.cx - c0.x, sp.cy - c0.y) < 0.2, JSON.stringify(sp));
        const c1 = { x: sp.cx, y: sp.cy };
        await tah(await m(c1.x, c1.y), await m(c1.x - ven.y * 0.5, c1.y + ven.x * 0.5));
        sp = await stavSchodu();
        kontrola('tah podél hrany: schody po hranici kloužou', sp.dotek && blizko(Math.hypot(sp.cx - c1.x, sp.cy - c1.y), 0.5, 0.15), JSON.stringify(sp));
        const c2 = { x: sp.cx, y: sp.cy };
        await tah(await m(c2.x, c2.y), await m(c2.x - ven.x * 1.2, c2.y - ven.y * 1.2));
        sp = await stavSchodu();
        kontrola('plné zapuštění: schody se zastaví nástupem přes hranici a nepřeskočí k jiné hraně', sp.dotek && sp.uvnitr >= 1 && sp.vne >= 1 && Math.abs((sp.cx - c2.x) * ven.y) + Math.abs((sp.cy - c2.y) * ven.x) < 0.05 && Math.hypot(sp.cx - c2.x, sp.cy - c2.y) < 0.35, JSON.stringify({ sp, c2 }));
        await p.snimek(path.join(vystup, 'dum-schody-hranice.png'));
        // Otáčení za kolečko: nezasekne se a schody hranici neopustí
        const uch = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const s = e.dum.schodiste[e.dum.schodiste.length - 1]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); const xs = g.obrys.map(q => q.x), ys = g.obrys.map(q => q.y); return { u: g.uchop, stred: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 } }; })()`);
        const otocU = (deg) => { const r = Math.hypot(uch.u.x - uch.stred.x, uch.u.y - uch.stred.y), a0 = Math.atan2(uch.u.y - uch.stred.y, uch.u.x - uch.stred.x), a = a0 + deg * Math.PI / 180; return naObr(uch.stred.x + r * Math.cos(a), uch.stred.y + r * Math.sin(a)); };
        const uhel0 = sp.uhel;
        await tah(await naObr(uch.u.x, uch.u.y), await otocU(90));
        sp = await stavSchodu();
        const otoceniKolem = Math.abs(((sp.uhel - uhel0) % 360 + 540) % 360 - 180);
        kontrola('otočení o 90° za kolečko: schody se otočí a zůstanou na hranici', sp.dotek && blizko(otoceniKolem, 90, 8), JSON.stringify({ sp, otoceniKolem }));
        sp = await stavSchodu(`const t = posledni(); d.renderer.setSelection([]); d.renderer.selectedSchody.add(t.id); d.setSchody('otoc'); d.setSchody('sirka', 1.6); t.x += 5; d._drzSchodyUPlochy(t)`);
        kontrola('panel (otočení, šířka) i odskok o 5 m: schody se vrátí na hranici', sp.dotek, JSON.stringify(sp));
        // Změna výšky drží horní konec, přepnutí na sníženou otočí schody kolem něj
        const predH = sp;
        sp = await stavSchodu(`d.renderer.setSelection([], [], [], [], [], [], [e.dum.plochy[0].mistnost]); d.setMistnostUroven('dh', 0.6)`);
        kontrola('výška podlahy 60 cm: schody ji převezmou a jsou dál na hranici', blizko(sp.H, 0.6, 1e-6) && sp.dotek, JSON.stringify({ pred: predH, po: sp }));
        const predT = sp;
        sp = await stavSchodu(`d.setMistnostUroven('typ', 'snizena')`);
        const obrat = Math.abs(((sp.uhel - predT.uhel) % 360 + 540) % 360 - 180);
        kontrola('snížená: schody se otočí o 180° a jsou dál na hranici', sp.dh < 0 && blizko(obrat, 180, 0.5) && sp.dotek, JSON.stringify({ pred: predT, po: sp, obrat }));
        sp = await stavSchodu(`d.setMistnostUroven('typ', 'zvysena')`);
        kontrola('zpět na zvýšenou: výška 60 cm, schody na hranici', blizko(sp.dh, 0.6, 1e-9) && sp.dotek, JSON.stringify(sp));
        // Ve 3D má deska pod schody díru: paprsek shora ji pod schody netrefí, vedle ano
        sp = await stavSchodu(`const t = posledni(); t.uhel = 0; t.sirka = 1; t.x = 4.95; t.y = -1.75; d._drzSchodyUPlochy(t); d.renderer.clearSelection(); d.renderer.render()`);
        kontrola('schody přes levou hranu místnosti', sp.dotek && sp.uvnitr === 2, JSON.stringify(sp));
        const prouzek = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const a = e.dum.plochy[0]; const t = e.dum.schodiste[e.dum.schodiste.length - 1]; const x0 = t.x, bx = Math.min(...a.body.map(b => b[0]));
            t.x = bx + 0.004; const dily = d._dilyDesky(a, 'P1'); t.x = x0; return { dilu: dily.length, predSchody: dily.some(q => window.DumGeo.bodVPolygonu({ x: bx + 0.002, y: 1.75 }, q)) }; })()`);
        kontrola('schody 4 mm od okraje: proužek desky před nimi nezůstane', prouzek.dilu >= 1 && !prouzek.predSchody, JSON.stringify(prouzek));
        const deska = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1200));
            const _3d = window._kk3d; const skup = _3d.dumSkupina; skup.updateMatrixWorld(true);
            const desky = skup.children.filter(o => o.userData.vyskovaDeska && o.userData.podlazi === 'P1'); const horni = skup.children.filter(o => o.userData.vyskovaDeska && o.userData.podlazi === 'P2');
            const ray = new THREE.Raycaster();
            const zasah = (kde, x, y) => { ray.set(skup.localToWorld(new THREE.Vector3(x, 8, y)), new THREE.Vector3(0, -1, 0)); return ray.intersectObjects(kde, false).length > 0; };
            const out = { dilu: desky.length, horni: horni.length, podSchody: zasah(desky, 5.3, 1.75), vedleSchodu: zasah(desky, 5.3, 2.8), dal: zasah(desky, 6.5, 1.75), nahorePodSchody: zasah(horni, 5.3, 1.75) };
            d.naPodlazi('P2'); await new Promise(r => setTimeout(r, 300)); return out; })()`);
        kontrola('3D: podlaha neprotéká schody (pod nimi díra, vedle deska); deska na 2.NP je celá', deska.dilu > 1 && !deska.podSchody && deska.vedleSchodu && deska.dal && deska.horni === 1 && deska.nahorePodSchody, JSON.stringify(deska));
        await p.snimek(path.join(vystup, 'dum-schody-deska-3d.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P2'); d.prepni2d(); d.rezim3d = false; return true; })()`);
        await pauza(400);
        // Podlaha zpět do úrovně podlaží: schody k ní nemají smysl, Zpět je vrátí
        const uklid = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.renderer.setSelection([], [], [], [], [], [], [e.dum.plochy[0].mistnost]); const pred = e.dum.schodiste.length; d.setMistnostUroven('typ', 'bezna'); const po = e.dum.schodiste.length, ploch = e.dum.plochy.length, zprava = d.dumZprava; d.renderer.clearSelection(); e.undo(); d.renderer.render(); return { pred, po, ploch, zprava, zpet: e.dum.schodiste.length, plochZpet: e.dum.plochy.length }; })()`);
        kontrola('úroveň podlaží: schody k podlaze zmizí, Zpět je vrátí', uklid.po === uklid.pred - 1 && uklid.ploch === 0 && /odstraněny/.test(uklid.zprava) && uklid.zpet === uklid.pred && uklid.plochZpet === 1, JSON.stringify(uklid));
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const s = e.dum.schodiste[e.dum.schodiste.length - 1]; d.renderer.setSelection([]); d.renderer.selectedSchody.add(s.id); d.smazatSchody(); d.renderer.setSelection([], [], [], [], [], [], [e.dum.plochy[0].mistnost]); d.setMistnostUroven('dh', 0.3); d.renderer.clearSelection(); return true; })()`);

        console.log('\n9) Přehled ploch po podlažích');
        const prehled = await p.vyhodnot(`(() => { const d = ${D}; const x = d.prehledPloch; return { radky: x.radky.map(r => [r.nazev, +r.plocha.toFixed(1), r.pocet]), celkem: +x.celkem.toFixed(1) }; })()`);
        kontrola('přehled: řádek na podlaží a součet', prehled.radky.length === 2 && blizko(prehled.celkem, prehled.radky[0][1] + prehled.radky[1][1], 0.11), JSON.stringify(prehled));

        console.log('\n10) Střecha po hranách');
        await p.vyhodnot(`(() => { const d = ${D}; d.prepniStrechu(); return true; })()`);
        await pauza(300);
        await pauza(150);
        let str = await p.vyhodnot(`(() => { const d = ${D}; const u = document.querySelector('[data-uprava=strecha]'); return { rezim: d.rezimStrecha, aktivni: d.engine.aktivniPodlazi().nazev, panel: !!u, nabidka: u ? /Vytvořit střechu/.test(u.textContent) : false, ma: !!d.strechaPanel.st }; })()`);
        kontrola('režim střechy na horním podlaží, panel v seznamu nabídne vytvoření', str.rezim && str.aktivni === '2.NP' && str.panel && str.nabidka && !str.ma, JSON.stringify(str));
        await p.vyhodnot(`(() => { ${D}.strechaVytvor(); return true; })()`);
        await pauza(300);
        str = await p.vyhodnot(`(() => { const d = ${D}; const v = d._strechaVypocet(); return { hran: v.hrany.length, typy: v.hrany.map(h => h.typ), klice: v.hrany.map(h => h.klic), zMax: +v.zMax.toFixed(2), zOkap: v.zOkap, plochy: v.plochy.length, stity: v.stity.length, hrebeny: v.hrebeny.length, delky: v.hrany.map(h => +Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y).toFixed(2)) }; })()`);
        kontrola('sedlová nad obdélníkem: 4 hrany dorovnané na líce, 2 okapy, 2 štíty, hřeben', str.hran === 4 && str.typy.filter(t => t === 'okap').length === 2 && str.plochy === 2 && str.stity === 2 && str.klice.every(k => k.includes(':')) && blizko(Math.max(...str.delky), 10.4, 0.02), JSON.stringify(str));
        await p.snimek(path.join(vystup, 'dum-strecha-2d.png'));
        const hranaKlik = await p.vyhodnot(`(() => { const d = ${D}; const v = d._strechaVypocet(); const h = v.hrany.find(x => x.typ === 'stit'); return { x: (h.a.x + h.b.x) / 2, y: (h.a.y + h.b.y) / 2, klic: h.klic }; })()`);
        await klik(await m(hranaKlik.x, hranaKlik.y));
        const vybrana = await p.vyhodnot(`(() => { const d = ${D}; const h = d.strechaPanel.hrana; return { hrana: d.strechaHrana, insp: h ? { typ: h.typ, klic: h.klic } : null }; })()`);
        kontrola('klik na hranu v půdorysu ji vybere', vybrana.hrana === hranaKlik.klic && vybrana.insp && vybrana.insp.typ === 'stit', JSON.stringify(vybrana));
        const valba = await p.vyhodnot(`(() => { const d = ${D}; d.setHranaStrechy(${JSON.stringify(hranaKlik.klic)}, { typ: 'okap' }); const v = d._strechaVypocet(); const a = { plochy: v.plochy.length, stity: v.stity.length }; d.setStrecha('typ', 'valbova'); const b = d._strechaVypocet(); const t = { plochy: b.plochy.length, sklon: d.engine.dum.strecha.sklon }; d.setStrecha('typ', 'pultova'); const c = d._strechaVypocet().plochy.length; d.setStrecha('typ', 'plocha'); const f = d._strechaVypocet().plocha; d.setStrecha('typ', 'sedlova'); return { a, t, c, f }; })()`);
        kontrola('přepnutí hrany na okap (polovalba) a předvolby valbová, pultová, plochá', valba.a.plochy === 3 && valba.a.stity === 1 && valba.t.plochy === 4 && valba.c === 1 && valba.f === true, JSON.stringify(valba));

        console.log('\n11) Podkroví: vodítka a započitatelná plocha');
        await p.vyhodnot(`(() => { const d = ${D}; d.rezimStrecha = false; d.pridatPodlazi('podkrovi'); d.engine.dum.strecha.sklon = 40; d.fitView(); d.renderer._mistnostiCache = null; d.renderer.render(); return true; })()`);
        await pauza(400);
        const pk = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const r = d.renderer; const st = d._strechaVypocet(); const mis = [...r._plochyMistnosti.values()]; const zap = [...r._plochyMistnostiZapocet.values()];
            return { nazev: e.aktivniPodlazi().nazev, zOkap: st.zOkap, popisky: r.plochyLayer.find('Text').map(t => t.text()), plocha: mis, zap, koty: [...e.kotyPodlazi().values()] }; })()`);
        kontrola('podkroví: okap 1,0 m nad podlahou, popisky 1,20 · 1,80 · 2,30 m', pk.nazev === 'Podkroví' && blizko(pk.zOkap, 1, 1e-6) && ['1,20 m', '1,80 m', '2,30 m'].every(t => pk.popisky.includes(t)), JSON.stringify(pk));
        // Okap 1,0 m na vnějším líci: uvnitř za 40cm stěnou je už přes 1,2 m. Se 40 cm okapem je rozdíl vidět.
        const pk2 = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; d.setStrecha('vyskaOkapu', 0.4); r._mistnostiCache = null; r.render(); return { plocha: [...r._plochyMistnosti.values()], zap: [...r._plochyMistnostiZapocet.values()] }; })()`);
        const soucetP = pk2.plocha.reduce((a, b) => a + b, 0), soucetZ = pk2.zap.reduce((a, b) => a + (b ?? 0), 0);
        kontrola('započitatelná plocha (nad 1,2 m) je menší než celková', soucetZ > 0 && soucetZ < soucetP, soucetZ.toFixed(1) + ' z ' + soucetP.toFixed(1));
        await p.snimek(path.join(vystup, 'dum-podkrovi.png'));

        console.log('\n12) Posun celého domu');
        const pred = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.naPodlazi('P2'); d.fitView(); d.renderer.render(); const X = 80;
            const w1 = e.enginePodlazi('P1').nodes.values().next().value; const s = e.dum.schodiste[0], a = e.dum.plochy[0];
            const c = (y) => y; return { p1x: w1.x, sx: s.x, ax: a.body[0][0], podlazi: e.dum.aktivni, kotva: e.mistnosti[0]?.kotva?.x }; })()`);
        await pauza(200);
        const beztah = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const id = e.dum.aktivni; const pred = d.podepreniPodlazi(id).size;
            d._domPosun = { dx: 0, dy: 0 }; for (const n of e.nodes.values()) n.x += 300; const za = d.podepreniPodlazi(id).size; for (const n of e.nodes.values()) n.x -= 300; d._domPosun = null;
            return { pred, za }; })()`);
        kontrola('za tahu celého domu se nepodepřené stěny nepřepočítávají', beztah.pred === beztah.za, JSON.stringify(beztah));
        await p.vyhodnot(`(() => { ${D}.posunoutDum(); return true; })()`);
        await pauza(200);
        const naStene = await p.vyhodnot(`(() => { const e = ${D}.engine; const w = [...e.walls.values()].find(w => w.typ === 'obvodova'); const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; })()`);
        const odkud = await naObr(naStene.x, naStene.y);
        const kam = await naObr(naStene.x + 1 * PX, naStene.y + 0.5 * PX);
        await tah(odkud, kam);
        const po = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w1 = e.enginePodlazi('P1').nodes.values().next().value; const s = e.dum.schodiste[0], a = e.dum.plochy[0]; return { p1x: w1.x, sx: s.x, ax: a.body[0][0], kotva: e.mistnosti[0]?.kotva?.x }; })()`);
        const dx = po.p1x - pred.p1x;
        kontrola('dům jede celý: 1.NP, schody i plocha o stejný posun', Math.abs(dx) > 30 && blizko(po.sx - pred.sx, dx / PX, 0.02) && blizko(po.ax - pred.ax, dx / PX, 0.02), JSON.stringify({ dx, pred, po }));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.engine.undo(); d.renderer.render(); return true; })()`);
        const zpet = await p.vyhodnot(`(() => { const e = ${D}.engine; const w1 = e.enginePodlazi('P1').nodes.values().next().value; return { p1x: w1.x, sx: e.dum.schodiste[0].x }; })()`);
        kontrola('Zpět vrátí celý dům', blizko(zpet.p1x, pred.p1x, 0.01) && blizko(zpet.sx, pred.sx, 1e-6), JSON.stringify(zpet));

        const otoceni = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = 80; const s = e.dum.schodiste[0];
            const n0 = { ...e.enginePodlazi('P1').nodes.values().next().value }; const s0 = { x: s.x, y: s.y, u: s.uhel };
            e.pushUndo(); d.domOtocKonec(100, 200, Math.PI / 2);
            const n1 = e.enginePodlazi('P1').nodes.values().next().value; const s1 = { x: s.x, y: s.y, u: s.uhel };
            const ocek = { x: 100 - (n0.y - 200), y: 200 + (n0.x - 100) };
            const vysl = { nx: +n1.x.toFixed(2), ny: +n1.y.toFixed(2), ocek, du: +(s1.u - s0.u).toFixed(4) }; e.undo(); d.renderer.render(); return vysl; })()`);
        kontrola('otočení domu přepočítá ostatní podlaží i schody', blizko(otoceni.nx, otoceni.ocek.x, 0.05) && blizko(otoceni.ny, otoceni.ocek.y, 0.05) && blizko(otoceni.du, Math.PI / 2, 1e-3), JSON.stringify(otoceni));

        console.log('\n13) 3D');
        const dd3 = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1500));
            const _3d = window._kk3d; const skup = [..._3d.podlaziSkupiny.entries()].map(([id, g]) => [id, +g.position.y.toFixed(2), g.children.length]);
            const dum = _3d.dumSkupina.children; const strecha = dum.filter(o => o.userData.strecha).length; const stropy = dum.filter(o => o.userData.stropPod).length;
            const box = new THREE.Box3().setFromObject(_3d.wallGroup); return { skup, strecha, stropy, schody: dum.filter(o => o.userData.podlazi === 'P1').length, y: [+box.min.y.toFixed(2), +box.max.y.toFixed(2)], gl: !!_3d.renderer }; })()`);
        kontrola('3D: 3 podlaží nad sebou po kótách, střecha, stropy, schody', dd3.skup.length === 3 && dd3.strecha >= 1 && dd3.stropy >= 2 && dd3.schody > 5 && dd3.y[1] > 6, JSON.stringify(dd3));
        const presah = await p.vyhodnot(`(() => { const d = ${D}; const _3d = window._kk3d; const g = _3d.dumSkupina.parent; const puvodni = d._obrysPodlazi;
            const dole = puvodni.call(d, 'P1').map(h => h.a); const xs = dole.map(b => b.x), ys = dole.map(b => b.y);
            const x0 = Math.min(...xs), x1 = Math.max(...xs) + 2, y0 = Math.min(...ys), y1 = Math.max(...ys);
            const roh = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
            d._obrysPodlazi = (id) => id === 'P2' ? roh.map((a, i) => ({ a, b: roh[(i + 1) % 4], klic: 'i' + i })) : puvodni.call(d, id);
            d._build3dDum(g);
            const skup = _3d.dumSkupina; skup.updateMatrixWorld(true);
            const kota = d.engine.kotyPodlazi().get('P2');
            const ray = new THREE.Raycaster(); const bod = (x, y) => { ray.set(skup.localToWorld(new THREE.Vector3(x, kota + 0.5, y)), new THREE.Vector3(0, -1, 0)); return ray.intersectObjects(skup.children.filter(o => o.userData.stropPod === 'P1'), false).length; };
            const vPresahu = bod(x1 - 1, (y0 + y1) / 2), mimo = bod(x1 + 1, (y0 + y1) / 2);
            d._obrysPodlazi = puvodni; d._build3dDum(g);
            return { vPresahu, mimo }; })()`);
        kontrola('patro přesahující přes podlaží pod ním má souvislou podlahu', presah.vPresahu >= 1 && presah.mimo === 0, JSON.stringify(presah));
        await p.vyhodnot(`(() => { const _3d = window._kk3d; const b = new THREE.Box3().setFromObject(_3d.wallGroup); const c = b.getCenter(new THREE.Vector3()); _3d.controls.target.copy(c); _3d.camera.position.set(c.x + 22, c.y + 18, c.z + 22); _3d.camera.zoom = 0.42; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
        await pauza(500);
        await p.snimek(path.join(vystup, 'dum-3d.png'));
        const skryti = await p.vyhodnot(`(async () => { const d = ${D}; const _3d = window._kk3d; const vid = () => [..._3d.podlaziSkupiny.entries()].filter(([, g]) => g.visible).map(([id]) => id);
            const strecha = () => _3d.dumSkupina.children.filter(o => o.userData.strecha).some(o => o.visible);
            const desky = () => _3d.dumSkupina.children.filter(o => !o.userData.strecha && o.visible).length;
            d.naPodlazi('P2'); const bezP2 = vid();
            d.naPodlazi('P1'); d.naPodlazi('P3'); d.prepniStrechu();
            const nic = { vid: vid(), strecha: strecha(), desky: desky() };
            d.naPodlazi('P1'); d.naPodlazi('P2'); d.naPodlazi('P3'); d.prepniStrechu();
            return { bezP2, nic, vse: vid().length, str: strecha() }; })()`);
        kontrola('ve 3D řádky vypínají podlaží jednotlivě; bez zvýraznění není vidět nic', skryti.bezP2.length === 2 && !skryti.bezP2.includes('P2') && skryti.nic.vid.length === 0 && !skryti.nic.strecha && skryti.nic.desky === 0 && skryti.vse === 3 && skryti.str, JSON.stringify(skryti));
        const ziva3d = await p.vyhodnot(`(async () => { const d = ${D}; const _3d = window._kk3d; const cek = () => new Promise(r => setTimeout(r, 120)); window.confirm = () => true;
            const puvodni = _3d.podlaziSkupiny.get('P2').position.y; const p1 = _3d.podlaziSkupiny.get('P1').position.y; const p3 = _3d.podlaziSkupiny.get('P3').position.y;
            d.setPodlazi('P2', 'kota', puvodni + 1); await cek(); const kota = _3d.podlaziSkupiny.get('P2').position.y - puvodni; const posun1 = _3d.podlaziSkupiny.get('P1').position.y - p1; const posun3 = _3d.podlaziSkupiny.get('P3').position.y - p3;
            d.kotaNaNulu(); await cek(); const auto = _3d.podlaziSkupiny.get('P2').position.y; const stejna = d.engine.dum.posunVysky;
            d.smazatPodlazi('P3'); await cek(); const poSmazani = [..._3d.podlaziSkupiny.keys()];
            d.undo(); await cek(); const poZpet = [..._3d.podlaziSkupiny.keys()];
            return { puvodni, kota, posun1, posun3, auto, stejna, poSmazani, poZpet }; })()`);
        kontrola('změna kóty posune ve 3D celý dům stejně a jde vrátit; smazané podlaží zmizí, Zpět ho vrátí', blizko(ziva3d.kota, 1, 1e-6) && blizko(ziva3d.posun1, 1, 1e-6) && blizko(ziva3d.posun3, 1, 1e-6) && blizko(ziva3d.auto, ziva3d.puvodni, 0.01) && ziva3d.stejna === 0 && ziva3d.poSmazani.length === 2 && ziva3d.poZpet.length === 3, JSON.stringify(ziva3d));
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P2'); d.naPodlazi('P3'); d.prepniStrechu(); return true; })()`);
        await pauza(400);
        await p.snimek(path.join(vystup, 'dum-3d-prizemi.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P2'); d.naPodlazi('P3'); d.prepniStrechu(); d.prepni2d(); d.rezim3d = false; return true; })()`);
        await pauza(500);

        const tuzka3d = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 150)); const tl = () => document.querySelector('[data-upravit=strecha]'); const panel = () => !!document.querySelector('[data-uprava=strecha]');
            d.rezim3d = true; await d.prepni3d(); await cek(); await new Promise(r => setTimeout(r, 500));
            const vysledek = []; for (let i = 0; i < 3; i++) { tl().click(); await cek(); vysledek.push(panel()); tl().click(); await cek(); vysledek.push(panel()); }
            tl().click(); await cek(); const skl = document.querySelector('[data-uprava=strecha] input[type=number]'); const puvodni = skl.value; skl.value = '20'; skl.dispatchEvent(new Event('change', { bubbles: true })); await cek(); await cek();
            const sklon = d.engine.dum.strecha.sklon; const v3d = d.rezim3d; const mesh = window._kk3d.dumSkupina.children.filter(o => o.userData.strecha).length;
            skl.value = puvodni; skl.dispatchEvent(new Event('change', { bubbles: true })); await cek(); tl().click(); await cek();
            d.prepni2d(); d.rezim3d = false; return { vysledek, sklon, v3d, mesh }; })()`);
        kontrola('tužka střechy otevírá panel opakovaně i ve 3D, úprava zůstává ve 3D', tuzka3d.vysledek.join() === 'true,false,true,false,true,false' && tuzka3d.sklon === 20 && tuzka3d.v3d && tuzka3d.mesh >= 1, JSON.stringify(tuzka3d));
        await pauza(500);

        const krytiny3d = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 200)); d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 500));
            const plochy = () => window._kk3d.dumSkupina.children.filter(o => o.userData.strecha && o.material.map);
            const st = d.engine.dum.strecha; const pred = { krytina: st.krytina, barva: st.barva };
            d.setStrecha('krytina', 'falc'); await cek(); const falc = plochy().map(o => [!!o.material.map, !!o.material.bumpMap, o.material.metalness, !!o.geometry.attributes.uv]);
            d.setStrecha('barva', '#3f4347'); await cek(); const hex = plochy()[0].material.color.getHexString();
            d.setStrecha('krytina', pred.krytina); d.setStrecha('barva', pred.barva); await cek();
            d.prepni2d(); d.rezim3d = false; return { falc, hex }; })()`);
        kontrola('typ krytiny dává reliéf a kov, barva se mění zvlášť', krytiny3d.falc.length >= 1 && krytiny3d.falc.every(f => f[0] && f[1] && f[2] > 0 && f[3]) && krytiny3d.hex === '3f4347', JSON.stringify(krytiny3d));
        await pauza(500);
        const hrana = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 150)); d.rezimStrecha = false; d.naPodlazi(d.engine.horniPodlazi().id); d.prepniUpravuStrechy(); await cek();
            const v = d._strechaVypocet(); const h = v.hrany.find(x => x.typ === 'okap'); d.strechaHrana = h.klic; d._selectionTick++; await cek();
            const pole = (k) => document.querySelector('[data-hrana=' + k + ']'); const zmen = async (k, x) => { const n = pole(k); n.value = x; n.dispatchEvent(new Event('change', { bubbles: true })); await cek(); };
            const nazvy = ['sklon', 'presah', 'vyskaOkapu'].map(k => !!pole(k));
            const popisekOkap = document.querySelector('[data-hrana-popisek=presah]')?.textContent; const hs = v.hrany.find(x => x.typ === 'stit'); let popisekStit = null; if (hs) { d.strechaHrana = hs.klic; d._selectionTick++; await cek(); popisekStit = document.querySelector('[data-hrana-popisek=presah]')?.textContent; d.strechaHrana = h.klic; d._selectionTick++; await cek(); }
            await zmen('presah', 150); await zmen('vyskaOkapu', 180); await zmen('sklon', 55);
            const zap = d.engine.dum.strecha.hrany[h.klic]; const vy = d._strechaVypocet(); const q = vy.hrany.find(x => x.klic === h.klic);
            const out = { nazvy, popisekOkap, popisekStit, presah: zap.presah, z: zap.vyskaOkapu, sklon: zap.sklon, min: vy.zOkapMin, hranaPresah: q.presah, tl: !!document.querySelector('[data-hrana-panel] button') };
            d.hranaJakoCelek(h.klic); await cek(); out.poVraceni = (d.engine.dum.strecha.hrany || {})[h.klic] || null; d.prepniUpravuStrechy(); d.rezimStrecha = false; d.strechaHrana = null; d.renderer.render(); return out; })()`);
        kontrola('hrana má vlastní sklon, přesah a výšku okapu, jde vrátit na celek', hrana.nazvy.every(Boolean) && hrana.popisekOkap === 'Přesah okapu' && (hrana.popisekStit === null || hrana.popisekStit === 'Přesah štítu') && blizko(hrana.presah, 1.5, 1e-6) && blizko(hrana.z, 1.8, 1e-6) && hrana.sklon === 55 && hrana.min <= 1.8 && hrana.poVraceni === null, JSON.stringify(hrana));
        const nastrojBarvy = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 150)); d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 400));
            d.podlaziUprava = 'strecha'; await cek(); const panel = document.querySelector('[data-uprava=strecha]');
            const sym = panel.querySelector('[data-barva-symbol]'); const pred = d.engine.dum.strecha.barva; const zavreno = !panel.querySelector('[data-barva-nastroj]');
            sym.click(); await cek(); const n = panel.querySelector('[data-barva-nastroj]'); const posledni = d.historie[d.historie.length - 1]; const kroku = () => d.historie.length - 1 - d.historie.indexOf(posledni);
            const jas = n.querySelector('[data-barva-posuvnik=l]'); const vzorek = () => getComputedStyle(n.querySelector('[data-barva-nova]')).backgroundColor;
            const v0 = vzorek(); jas.value = 70; jas.dispatchEvent(new Event('input', { bubbles: true })); await cek(); const v1 = vzorek();
            const mesh = window._kk3d.dumSkupina.children.find(o => o.userData.krytina); const zaTahu = { hex: '#' + mesh.material.color.getHexString(), zapis: d.engine.dum.strecha.barva, kroku: kroku() };
            const puvodniVzorek = getComputedStyle(n.querySelector('[data-barva-puvodni]')).backgroundColor;
            jas.dispatchEvent(new Event('change', { bubbles: true })); await cek(); await cek(); const poPusteni = { zapis: d.engine.dum.strecha.barva, kroku: kroku() };
            const ral = n.querySelector('[data-barva-ral]'); ral.value = '7016'; ral.dispatchEvent(new Event('change', { bubbles: true })); await cek(); await cek();
            const zRal = { zapis: d.engine.dum.strecha.barva, popis: panel.querySelector('[data-barva-symbol]').nextElementSibling.textContent };
            ral.value = '1234'; ral.dispatchEvent(new Event('change', { bubbles: true })); await cek(); const chyba = /nemáme/.test(n.textContent);
            const pouzite = panel.querySelectorAll('[data-barva-pouzite] button').length;
            d.setStrecha('barva', pred); await cek(); const zUndo = n.querySelector('[data-barva-nova]').style.background !== '';
            sym.click(); d.podlaziUprava = null; await cek(); d.prepni2d(); d.rezim3d = false;
            return { zavreno, v0, v1, zaTahu, puvodniVzorek, poPusteni, zRal, chyba, pouzite }; })()`);
        kontrola('nástroj na barvu: zavřený jen symbol, vzorek a 3D za tahu bez kroku, po puštění jeden krok, RAL, jinde použité', nastrojBarvy.zavreno && nastrojBarvy.v0 !== nastrojBarvy.v1 && nastrojBarvy.zaTahu.kroku === 0 && nastrojBarvy.zaTahu.hex !== nastrojBarvy.zaTahu.zapis && nastrojBarvy.puvodniVzorek === nastrojBarvy.v0 && nastrojBarvy.poPusteni.kroku === 1 && nastrojBarvy.poPusteni.zapis !== nastrojBarvy.zaTahu.zapis && nastrojBarvy.zRal.zapis === '#293133' && /7016/.test(nastrojBarvy.zRal.popis) && nastrojBarvy.chyba && nastrojBarvy.pouzite >= 1, JSON.stringify(nastrojBarvy));
        await pauza(400);
        const pridani3d = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 400)); document.querySelector('#kk-pridat-podlazi').click(); await new Promise(r => setTimeout(r, 200));
            const vidi = [...document.querySelectorAll('#kk-podlazi-seznam button')].filter(n => n.getBoundingClientRect().width > 0).map(n => n.textContent.trim()); document.querySelector('#kk-pridat-podlazi').click(); d.prepni2d(); d.rezim3d = false; return vidi.filter(t => ['Patro nahoře', 'Sklep'].includes(t)); })()`);
        kontrola('přidání podlaží je k dispozici i ve 3D', pridani3d.length === 2, JSON.stringify(pridani3d));
        const strih = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = 80; const dole = e.spodekAktivniho(); if (!dole) return { preskoceno: true };
            const w = [...dole.engine.walls.values()].find(s => s.typ === 'nosna' || s.typ === 'obvodova'); const n = dole.engine.nodes.get(w.nodeA);
            const a = e.addWall(n.x - 3 * X, n.y - 3 * X, n.x + 3 * X, n.y + 3 * X, 0.3, 'obvodova');
            const r = e.snapPoint(n.x, n.y, 12); const kand = !!e.findSnapCandidate(n.x, n.y, 12, null, true); const vysl = { spodek: !!r.magnetSpodek, kand }; e.removeWall(a.id); d.renderer.render(); return vysl; })()`);
        kontrola('stěna tohoto podlaží má přednost před magnetem na spodní podlaží', strih.preskoceno || (strih.kand && !strih.spodek), JSON.stringify(strih));
        await pauza(400);

        console.log('\n14) Uložení a obnovení');
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(2000);
        const predUl = await p.vyhodnot(`(() => { const e = ${D}.engine; return { podlazi: e.dum.podlazi.map(p => p.nazev), aktivni: e.dum.aktivni, schody: e.dum.schodiste.length, plochy: e.dum.plochy.length, strecha: e.dum.strecha?.typ, steny: e.walls.size }; })()`);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor po obnovení');
        await pauza(800);
        const poUl = await p.vyhodnot(`(() => { const e = ${D}.engine; return { podlazi: e.dum.podlazi.map(p => p.nazev), aktivni: e.dum.aktivni, schody: e.dum.schodiste.length, plochy: e.dum.plochy.length, strecha: e.dum.strecha?.typ, steny: e.walls.size }; })()`);
        kontrola('po obnovení: podlaží, schody, plochy, střecha a aktivní podlaží drží', JSON.stringify(predUl) === JSON.stringify(poUl), JSON.stringify(poUl));

        console.log('\n15) Plánek po podlažích: automatické srovnání, ruční usazení, posun plánku');
        const srovnani = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.naPodlazi('P2'); const X = 80;
            d.podklad = { url: '/neexistuje.png', sirkaM: 12, vyskaM: 9, stredX: 0, stredY: 0, uhel: 0, pruhlednost: 0.5 };
            // Kresba 2.NP uměle posunutá a otočená o 90°, jako by přišla z jiného výkresu
            const u = Math.PI / 2, c = Math.cos(u), s = Math.sin(u);
            for (const n of e.nodes.values()) { const x = n.x, y = n.y; n.x = x * c - y * s + 3 * X; n.y = x * s + y * c - 2 * X; }
            d.domSrovnejImport();
            let odchylka = 0; const dole = [...e.enginePodlazi('P1').nodes.values()];
            for (const n of e.nodes.values()) { const m = Math.min(...dole.map(q => Math.hypot(q.x - n.x, q.y - n.y))); odchylka = Math.max(odchylka, m); }
            return { odchylka: +odchylka.toFixed(2), zprava: d.dumZprava, podklad: [Math.round(d.podklad.stredX), Math.round(d.podklad.stredY), Math.round(d.podklad.uhel)] }; })()`);
        kontrola('automatické srovnání: otočené a posunuté stěny sednou na rohy 1.NP do 8 cm, podklad jede s nimi', srovnani.odchylka < 0.08 * PX && /srovnán/.test(srovnani.zprava), JSON.stringify(srovnani));
        await p.vyhodnot(`(() => { const d = ${D}; d.fitView(); d.renderer.render(); d.licoSeStenami = false; d.licoZacni(); return true; })()`);
        await pauza(200);
        for (const b of [[1, 1], [2, 1], [3, 1], [4, 1]]) await klik(await m(b[0], b[1]));
        const lico = await p.vyhodnot(`(() => { const d = ${D}; return { nastroj: d.nastroj, podklad: d.podklad ? [+(d.podklad.stredX).toFixed(0), +(d.podklad.uhel).toFixed(1)] : null, body: d.licoBody.length }; })()`);
        kontrola('ruční usazení dvěma body posune plánek a vrátí výběr', lico.nastroj === 'vyber' && lico.body === 0 && lico.podklad, JSON.stringify(lico));
        const ulozPodklad = await p.vyhodnot(`(() => { const d = ${D}; d._podkladZapis(d.podklad); const m = d.metadata; const naP2 = !!(m.podklady && m.podklady.P2); d.naPodlazi('P1'); const naP1 = d.podklad; d.naPodlazi('P2'); return { naP2, naP1: naP1 ? naP1.url : null, zpet: d.podklad ? d.podklad.url : null }; })()`);
        kontrola('plánek patří podlaží: na 1.NP není, po návratu na 2.NP je zpět', ulozPodklad.naP2 && !ulozPodklad.naP1 && /neexistuje/.test(ulozPodklad.zpet || ''), JSON.stringify(ulozPodklad));
        const posunPl = await p.vyhodnot(`(() => { const d = ${D}; const x0 = d.podklad.stredX; d.prepniPosunPodkladu(); return { x0, mod: d.posunPodkladu }; })()`);
        await tah(await m(4, 4), await m(5, 4));
        const poPosunu = await p.vyhodnot(`(() => { const d = ${D}; const x = d.podklad.stredX; d.prepniPosunPodkladu(); d.podklad = null; d._podkladZapis(null); d.renderer.smazPodklad(); return { x, mod: d.posunPodkladu }; })()`);
        kontrola('posun plánku hýbe jen plánkem', posunPl.mod && poPosunu.x - posunPl.x0 > 40 && !poPosunu.mod, JSON.stringify([posunPl, poPosunu]));

        console.log('\n16) Smazání podlaží a výkon zoomu');
        const sm = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const c = window.confirm; window.confirm = () => true; d.smazatPodlazi('P2'); window.confirm = c; return { podlazi: e.dum.podlazi.map(p => p.nazev), schody: e.dum.schodiste.length }; })()`);
        kontrola('smazání 2.NP odstraní i schody, co do něj vedou', !sm.podlazi.includes('2.NP') && sm.schody === 0, JSON.stringify(sm));
        const vykon = await p.vyhodnot(`(() => { const d = ${D}; const t = []; for (let i = 0; i < 20; i++) { const a = performance.now(); d.renderer.poZmeneZoomu(); t.push(performance.now() - a); } t.sort((x, y) => x - y); return +t[10].toFixed(1); })()`);
        kontrola('zoom nepočítá rastr ani nepřestavuje kresbu (medián do 15 ms)', vykon < 15, vykon + ' ms');

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
