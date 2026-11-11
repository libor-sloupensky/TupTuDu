/**
 * Oddělovač místnosti (volba v nástroji Stěna).
 *
 *   - dvě kliknutí: konce se chytí na líc stěny (ne na osu, ne na roh), řetězí se, Esc ukončí
 *   - volný konec: úhel 90° vůči stěně, na které oddělovač začíná
 *   - posun hostitelské stěny: konec na líci jede s ní (oddělovač se zkrátí),
 *     oddělovač s volným koncem se sveze celý; nic neblokuje posun
 *   - stlačení pod 10 cm mezi dvěma stěnami → oddělovač zmizí, Zpět ho vrátí
 *   - uložení, obnovení stránky, výběr kliknutím, panel, smazání klávesou
 *
 * Spuštění: node services/import-test/test-oddelovac-ui.cjs [složka snímků]
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
const blizko = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const pohyb = async (b) => { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(80); };
    const klik = async (b) => {
        await pohyb(b);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(250);
    };
    const klavesa = async (key, code) => {
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: key === 'Escape' ? 27 : 46 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: key === 'Escape' ? 27 : 46 });
        await pauza(200);
    };
    const stav = () => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const PX = e.PX_PER_M;
        return [...e.oddelovace.values()].map(o => { const a = e.bodKonceOddelovace(o.a), b = e.bodKonceOddelovace(o.b);
            return { id: o.id, a: [+(a.x/PX).toFixed(3), +(a.y/PX).toFixed(3), o.a.host ? o.a.host.stena + ':' + o.a.host.strana : 'volny'],
                     b: [+(b.x/PX).toFixed(3), +(b.y/PX).toFixed(3), o.b.host ? o.b.host.stena + ':' + o.b.host.strana : 'volny'],
                     delka: +(e.delkaOddelovace(o)/PX).toFixed(3) }; }); })()`);

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 15000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest oddělovač ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Dům 10 × 7 m, pohled 1:1');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const PX = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*PX, 0, 0.4, 'obvodova');
            const w2 = e.addWall(10*PX, 0, 10*PX, 7*PX, 0.4, 'obvodova');
            const w3 = e.addWall(10*PX, 7*PX, 0, 7*PX, 0.4, 'obvodova');
            const w4 = e.addWall(0, 7*PX, 0, 0, 0.4, 'obvodova');
            const st = d.stage; st.scale({ x: 1, y: 1 }); d.zoom = 1;
            st.position({ x: st.width() / 2 - 5*PX, y: st.height() / 2 - 3.5*PX });
            d.renderer.poZmeneZoomu(); d.renderer.render();
            d.nastroj = 'stena'; d.stenaTyp = 'oddelovac';
            return { w1: w1.id, w2: w2.id, w3: w3.id, w4: w4.id }; })()`);
        kontrola('stěny založeny, nástroj Stěna s volbou Oddělovač', !!ids.w1);
        const PX = 80;

        console.log('\n2) Kreslení: líc horní a dolní stěny, řetězení, Esc');
        // Klik 7 cm pod osou horní stěny (líc je v +20 cm) a 2,5 m od levého kraje → chytí se na líc (0.2 m)
        await klik(await naObr(2.5 * PX, 0.07 * PX));
        let s = await stav();
        const start = await p.vyhodnot(`(() => { const d = ${D}; const o = d._oddelovacStart; return o ? { x: +(o.bod.x/80).toFixed(3), y: +(o.bod.y/80).toFixed(3), host: o.host && o.host.stena + ':' + o.host.strana } : null; })()`);
        kontrola('první klik: začátek na vnitřním líci horní stěny (y = 0,20 m), ne na ose', start && blizko(start.y, 0.2, 0.001) && blizko(start.x, 2.5, 0.01) && start.host === ids.w1 + ':1', JSON.stringify(start));
        // 10 cm vedle svislice: úhel 90° vyhraje, bod sklouzne po líci dolní stěny na x = 2,50
        await pohyb(await naObr(2.6 * PX, 6.9 * PX));
        const stitek = await p.vyhodnot(`(() => { const d = ${D}; const l = d._oddelovacStitekNode; return l ? l.getText().text() : null; })()`);
        kontrola('náhled ukazuje štítek úhlu 90°', stitek === '90°', JSON.stringify(stitek));
        const osa = await p.vyhodnot(`(() => { const d = ${D}; return d._osaUhlu ? { od: [+(d._osaUhlu.od.x/80).toFixed(2), +(d._osaUhlu.od.y/80).toFixed(2)], k: [+(d._osaUhlu.k.x/80).toFixed(2), +(d._osaUhlu.k.y/80).toFixed(2)] } : null; })()`);
        kontrola('vodicí osa zachyceného úhlu je nastavená (jako u stěny)', osa && osa.od[0] === 2.5 && osa.k[0] === 2.5, JSON.stringify(osa));
        const uRohu = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const u = e.najdiUchytOddelovace(9.85 * 80, 0.26 * 80, 15); return u ? { typ: u.typ, stena: u.host.stena, t: +u.host.t.toFixed(3), bod: [+(u.bod.x/80).toFixed(2), +(u.bod.y/80).toFixed(2)] } : null; })()`);
        await p.snimek(path.join(vystup, 'oddelovac-nahled-uhel.png'));
        kontrola('u rohu se konec chytí na líc (dřív konce stěn vynechány)', uRohu && uRohu.typ === 'stena' && uRohu.bod[0] === 9.8, JSON.stringify(uRohu));
        await klik(await naObr(2.6 * PX, 6.9 * PX));
        s = await stav();
        kontrola('druhý klik 10 cm vedle: konec kolmo na líci dolní stěny (x = 2,50, y = 6,80), délka 6,60 m', s.length === 1 && blizko(s[0].b[0], 2.5, 0.001) && blizko(s[0].b[1], 6.8, 0.001) && s[0].b[2] === ids.w3 + ':1' && blizko(s[0].delka, 6.6, 0.001), JSON.stringify(s));
        const retez = await p.vyhodnot(`(() => { const d = ${D}; return !!d._oddelovacStart; })()`);
        kontrola('po dokončení navazuje další oddělovač od konce', retez);
        await klavesa('Escape', 'Escape');
        const poEsc = await p.vyhodnot(`(() => { const d = ${D}; return { start: !!d._oddelovacStart, nahled: !!d._oddelovacNahled }; })()`);
        kontrola('Esc řetězení ukončí a smaže náhled', !poEsc.start && !poEsc.nahled, JSON.stringify(poEsc));

        console.log('\n3) Volný konec s úhlem 90°');
        await klik(await naObr(7 * PX, 0.1 * PX));
        await klik(await naObr(7.04 * PX, 3 * PX));   // 3 cm mimo svislici → dorovná na 90°
        await klavesa('Escape', 'Escape');
        s = await stav();
        const o2 = s.find(o => o.a[2] === ids.w1 + ':1' && o.b[2] === 'volny');
        kontrola('druhý oddělovač: začátek na líci, volný konec srovnaný kolmo (x = 7,00)', o2 && blizko(o2.b[0], 7, 0.001) && blizko(o2.b[1], 3, 0.05), JSON.stringify(o2));
        // Začátek na vnějším líci těsně za rohem (t < 0 díky pokosu) nesmí po založení poskočit
        const zaRohem = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const u = e.najdiUchytOddelovace(-0.1 * 80, -0.22 * 80, 15); if (!u) return null;
            const pred = { x: u.bod.x / 80, y: u.bod.y / 80, t: u.host.t }; const o = e.addOddelovac({ x: u.bod.x, y: u.bod.y, host: u.host }, { x: -0.1 * 80, y: -1.5 * 80 });
            const a = e.bodKonceOddelovace(o.a); const po = { x: a.x / 80, y: a.y / 80, t: o.a.host.t }; e.removeOddelovac(o.id); return { pred, po, skok: Math.hypot(a.x - u.bod.x, a.y - u.bod.y) }; })()`);
        kontrola('začátek za rohem (t < 0) po založení nepo skočí', zaRohem && zaRohem.pred.t < 0 && zaRohem.skok < 0.01, JSON.stringify(zaRohem));
        await p.snimek(path.join(vystup, 'oddelovac-2d.png'));

        console.log('\n4) Posun horní stěny o 0,5 m dolů tažením');
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.renderer.clearSelection(); return true; })()`);
        const odkud = await naObr(1 * PX, 0), kam = await naObr(1 * PX, 0.5 * PX);
        await pohyb(odkud);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: odkud.x, y: odkud.y, button: 'left', clickCount: 1, buttons: 1 });
        for (let i = 1; i <= 6; i++) await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: odkud.x, y: odkud.y + (kam.y - odkud.y) * i / 6, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: kam.x, y: kam.y, button: 'left', clickCount: 1 });
        await pauza(400);
        const w1y = await p.vyhodnot(`(() => { const d = ${D}; const w = d.engine.walls.get(${JSON.stringify(ids.w1)}); return +(d.engine.nodes.get(w.nodeA).y / 80).toFixed(3); })()`);
        s = await stav();
        const o1 = s.find(o => o.b[2] === ids.w3 + ':1');
        const o2b = s.find(o => o.b[2] === 'volny');
        kontrola('stěna se posunula (oddělovače ji nezastavily)', w1y >= 0.3 && w1y <= 0.55, 'y = ' + w1y);
        const delkaOcek = 6.8 - (w1y + 0.2);
        kontrola('oddělovač mezi stěnami: konec jede s lícem, délka se zkrátila na 6,10 m', o1 && blizko(o1.a[1], w1y + 0.2, 0.01) && blizko(o1.delka, 6.8 - (w1y + 0.2), 0.01), JSON.stringify(o1));
        kontrola('oddělovač s volným koncem se svezl celý (3,00 m, konec na y = 3,50)', o2b && blizko(o2b.delka, 2.8, 0.05) && blizko(o2b.b[1], 3 + w1y, 0.05), JSON.stringify(o2b));

        console.log('\n5) Stlačení pod 10 cm a Zpět');
        const stlaceni = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; e.pushUndo();
            const w = e.walls.get(${JSON.stringify(ids.w3)}); const nA = e.nodes.get(w.nodeA); const posun = (6.8 - 0.05) * 80 - (nA.y - 0.2 * 80) ; // dolní líc na 5 cm od horního
            const cil = (${w1y} + 0.2 + 0.05) * 80 + 0.2 * 80; const dy = cil - nA.y; e.moveWall(w.id, 0, dy); e.propagateTChildren(w.id, 0, dy); const zmena = e.uklidOddelovace();
            const po = e.oddelovace.size; e.undo(); d.renderer.render(); return { zmena, po, zpet: e.oddelovace.size }; })()`);
        kontrola('dolní stěna přiražená na 5 cm: oddělovač mezi stěnami zmizí, volný zůstane; Zpět vrátí', stlaceni.zmena && stlaceni.po === 1 && stlaceni.zpet === 2, JSON.stringify(stlaceni));

        console.log('\n6) Uložení a obnovení');
        const json = await p.vyhodnot(`(() => { const d = ${D}; const j = d.engine.toJSON(); return j.oddelovace.map(o => ({ a: o.a.host ? o.a.host.stena : 'volny', b: o.b.host ? o.b.host.stena : 'volny' })); })()`);
        kontrola('toJSON nese oddělovače i vazby na stěny', json.length === 2 && json.every(o => o.a === ids.w1), JSON.stringify(json));
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(1500);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 15000, 'editor po obnovení');
        s = await stav();
        kontrola('po obnovení: 2 oddělovače, vazby drží, délky sedí', s.length === 2 && s.some(o => o.b[2] === ids.w3 + ':1' && blizko(o.delka, delkaOcek, 0.02)) && s.some(o => o.b[2] === 'volny'), JSON.stringify(s));

        console.log('\n7) Výběr kliknutím, panel a smazání klávesou');
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); return true; })()`);
        await pauza(200);
        await klik(await naObr(2.5 * PX, 4 * PX));
        const vyber = await p.vyhodnot(`(() => { const d = ${D}; const i = d.inspector; return { pocet: d.renderer.selectedOddelovace.size, kind: i && i.kind, delka: i && i.delka && +i.delka.toFixed(2), panel: document.getElementById('kk-panel-otvoru').offsetParent !== null }; })()`);
        kontrola('klik na čáru vybere oddělovač, panel ukáže délku', vyber.pocet === 1 && vyber.kind === 'oddelovac' && blizko(vyber.delka, delkaOcek, 0.02) && vyber.panel, JSON.stringify(vyber));
        const ruzne = await p.vyhodnot(`(async () => { const d = ${D}; d.renderer.setSelection([${JSON.stringify(ids.w1)}]); d._selectionTick++; await new Promise(r => setTimeout(r, 250));
            const jedna = [...document.querySelectorAll('#kk-panel-otvoru select option')].map(o => o.textContent.trim());
            d.renderer.setSelection([${JSON.stringify(ids.w1)}, ${JSON.stringify(ids.w2)}]); d.engine.walls.get(${JSON.stringify(ids.w2)}).typ = 'nosna'; d._selectionTick++; await new Promise(r => setTimeout(r, 250));
            const dve = [...document.querySelectorAll('#kk-panel-otvoru select option')].map(o => o.textContent.trim());
            d.engine.walls.get(${JSON.stringify(ids.w2)}).typ = 'obvodova'; return { jedna, dve }; })()`);
        kontrola('„Různé" v typu stěny jen při výběru stěn různých typů', !ruzne.jedna.includes('Různé') && ruzne.dve.includes('Různé'), JSON.stringify(ruzne));
        await p.snimek(path.join(vystup, 'oddelovac-vyber.png'));
        console.log('\n8) Tažení celku a konce');
        const tah = async (od, kam) => {
            await pohyb(od);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: od.x, y: od.y, button: 'left', clickCount: 1, buttons: 1 });
            for (let i = 1; i <= 6; i++) await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: od.x + (kam.x - od.x) * i / 6, y: od.y + (kam.y - od.y) * i / 6, button: 'left', buttons: 1 });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: kam.x, y: kam.y, button: 'left', clickCount: 1 });
            await pauza(400);
        };
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.renderer.render(); return true; })()`);
        await tah(await naObr(2.5 * PX, 4 * PX), await naObr(3.5 * PX, 4.3 * PX));   // za čáru: celek vodorovně, konce kloužou po lících
        s = await stav();
        const celek = s.find(o => o.b[2] === ids.w3 + ':1');
        // Prvních 5 px tahu je práh rozjezdu, takže posun vyjde o kousek menší než 1 m
        kontrola('tah za čáru posune celý oddělovač (x ≈ 3,3–3,5), konce zůstávají na lících', celek && celek.a[0] > 3.2 && celek.a[0] <= 3.55 && blizko(celek.b[0], celek.a[0], 0.01) && blizko(celek.b[1], 6.8, 0.001) && celek.a[2] === ids.w1 + ':1', JSON.stringify(celek));
        const x0 = celek ? celek.a[0] : 3.5;
        await tah(await naObr(x0 * PX, 6.8 * PX), await naObr((x0 + 1.3) * PX, 6.72 * PX));   // za dolní konec: jen konec, chytí se na líc dolní stěny (úhel 12° se nedorovná)
        s = await stav();
        const konec = s.find(o => o.b[2] === ids.w3 + ':1');
        kontrola('tah za konec posune jen konec (na líci dolní stěny, o ≈ 1,2 m doprava), začátek zůstal', konec && konec.b[0] > x0 + 0.9 && konec.b[0] <= x0 + 1.35 && blizko(konec.b[1], 6.8, 0.001) && blizko(konec.a[0], x0, 0.01), JSON.stringify(konec));
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.undo(); d.engine.undo(); d.renderer.render(); return true; })()`);
        s = await stav();
        kontrola('Zpět dvakrát vrátí oba tahy', s.some(o => o.b[2] === ids.w3 + ':1' && blizko(o.a[0], 2.5, 0.01) && blizko(o.b[0], 2.5, 0.01)), JSON.stringify(s));
        // Celek na doraz: horní stěna je kratší (po T-napojení?) — zkrátíme ji ručně, dolní nechme: oddělovač se musí zastavit celý
        const doraz = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const PX = 80; const o = [...e.oddelovace.values()].find(x => x.b.host && x.b.host.stena === ${JSON.stringify(ids.w3)});
            e.pushUndo(); const pred = { a: e.bodKonceOddelovace(o.a).x / PX, b: e.bodKonceOddelovace(o.b).x / PX };
            for (let i = 0; i < 40; i++) e.posunOddelovac(o, -0.1 * PX, 0.02 * PX);   // 4 m doleva po kouscích, s kolmou složkou
            const a = e.bodKonceOddelovace(o.a), b = e.bodKonceOddelovace(o.b); const po = { a: +(a.x / PX).toFixed(3), b: +(b.x / PX).toFixed(3), ay: +(a.y / PX).toFixed(3), by: +(b.y / PX).toFixed(3) };
            e.undo(); d.renderer.render(); return { pred, po }; })()`);
        kontrola('celek na doraz: oba konce se zastaví na kraji líce (x = 0,20) a zůstanou nad sebou, kolmá složka se zahodí', doraz.po.a === doraz.po.b && doraz.po.a <= 0.21 && doraz.po.a >= 0.19 && blizko(doraz.po.by, 6.8, 0.001), JSON.stringify(doraz));
        const prizoomu = await p.vyhodnot(`(() => { const d = ${D}; const st = d.stage; st.scale({ x: 0.25, y: 0.25 }); d.zoom = 0.25; d.renderer.poZmeneZoomu();
            const tecky = d.renderer._oddelovacShapes.filter(sh => sh.className === 'Circle' && !sh.listening()).map(c => c.radius() * 0.25);
            st.scale({ x: 1, y: 1 }); d.zoom = 1; d.renderer.poZmeneZoomu(); return tecky; })()`);
        kontrola('po oddálení mají tečky konců pořád 3 px na obrazovce', prizoomu.length > 0 && prizoomu.every(r => Math.abs(r - 3) < 0.01), JSON.stringify(prizoomu));

        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.renderer.render(); return true; })()`);
        // Plátno po změně zoomu a výběru překreslí zásahovou vrstvu až v dalším snímku: počkat, až bod opravdu trefí oddělovač
        await p.cekej(`(() => { const d = ${D}; const n = d.stage.getIntersection(d.stage.getAbsoluteTransform().copy().point({ x: 2.5 * ${PX}, y: 4 * ${PX} })); return n && d.renderer.hitTest(n)?.type === 'oddelovac'; })()`, 5000, 'oddělovač na plátně');
        await klik(await naObr(2.5 * PX, 4 * PX));   // znovu vybrat oddělovač (kontrola „Různé" vybírala stěny)
        const vyberPredDelete = await p.vyhodnot(`(() => { const r = ${D}.renderer; return { oddelovace: r.selectedOddelovace.size, steny: r.selectedWalls.size, mistnosti: r.selectedMistnosti.size }; })()`);
        // Mazání se potvrzuje oknem prohlížeče (potvrditSmazani), test ho odsouhlasí
        await p.vyhodnot('window.confirm = () => true; true');
        await klavesa('Delete', 'Delete');
        s = await stav();
        kontrola('Delete smaže vybraný oddělovač', s.length === 1 && s[0].b[2] === 'volny', JSON.stringify({ s, vyberPredDelete }));

        console.log('\n9) Nastavení magnetu');
        const magnet = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const tl = document.getElementById('kk-magnet-tl'); const panel = document.getElementById('kk-magnet-panel');
            const plny = d._dosahMagnetu(15); d.magnetSila = 50; const polovicni = d._dosahMagnetu(15);
            d.magnetSila = 0; const bez = d._bezMagnetu({ evt: { altKey: false } }); const uchytVyp = d._oddelovacUchyt({ x: 2.5 * 80, y: 0.07 * 80 }, { evt: { altKey: false } });
            d.magnetSila = 100; const uchytZap = d._oddelovacUchyt({ x: 2.5 * 80, y: 0.07 * 80 }, { evt: { altKey: false } });
            d._oddelovacStart = { bod: uchytZap.bod, host: uchytZap.host }; const sUhlem = d._oddelovacUchyt({ x: 2.6 * 80, y: 3 * 80 }, { evt: { altKey: false } });
            d.magnetUhly = false; const bezUhlu = d._oddelovacUchyt({ x: 2.6 * 80, y: 3 * 80 }, { evt: { altKey: false } }); d.magnetUhly = true; d._oddelovacZrus();
            tl.click(); await new Promise(r => setTimeout(r, 200)); const otevreno = panel.offsetParent !== null && /Síla přichytávání/.test(panel.innerText); tl.click();
            d.ulozitNastaveni(); const ulozeno = JSON.parse(localStorage.getItem('kv3_state') || '{}');
            return { plny, polovicni, bez, uchytVyp: !!uchytVyp.uchyt, uchytZap: !!uchytZap.uchyt, sUhlem: sUhlem.uhel, bezUhlu: bezUhlu.uhel, otevreno, aktivni: tl.classList.contains('kk-tl-aktivni'), ulozeno: ulozeno.magnetSila }; })()`);
        kontrola('síla: 50 % = poloviční dosah, 0 % = magnet vypnutý (konec se nechytí), 100 % chytí', Math.abs(magnet.polovicni - magnet.plny / 2) < 0.01 && magnet.bez && !magnet.uchytVyp && magnet.uchytZap, JSON.stringify(magnet));
        await p.vyhodnot(`(() => { document.getElementById('kk-magnet-tl').click(); return true; })()`);
        await pauza(250);
        await p.snimek(path.join(vystup, 'magnet-panel.png'));
        await p.vyhodnot(`(() => { ${D}.magnetPanel = false; return true; })()`);
        kontrola('úhly jdou vypnout; panel s nastavením se otevře z tlačítka v liště, tlačítko je zvýrazněné a nastavení se ukládá', magnet.sUhlem !== null && magnet.bezUhlu === null && magnet.otevreno && magnet.aktivni && magnet.ulozeno === 100, JSON.stringify(magnet));

        console.log('\n10) Magnety společné se stěnou');
        await klavesa('Escape', 'Escape');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; for (const id of [...e.oddelovace.keys()]) e.removeOddelovac(id); d.nastroj = 'stena'; d.stenaTyp = 'oddelovac'; d.renderer.render(); return true; })()`);
        // První úsek šikmo, ani jeden směr neleží na rastru domu
        const S = { x: 3 * PX, y: 2 * PX }, uhel = 20 * Math.PI / 180;
        const K = { x: S.x + 2.5 * PX * Math.cos(uhel), y: S.y + 2.5 * PX * Math.sin(uhel) };
        await p.vyhodnot(`(() => { const d = ${D}; d.magnetUhly = false; d.magnetVoditka = false; return true; })()`);
        await klik(await naObr(S.x, S.y));
        await klik(await naObr(K.x, K.y));
        await p.vyhodnot(`(() => { const d = ${D}; d.magnetUhly = true; d.magnetVoditka = true; return true; })()`);
        const retezStart = await p.vyhodnot(`(() => { const o = ${D}._oddelovacStart; return o ? [o.bod.x, o.bod.y] : null; })()`);
        kontrola('po šikmém úseku řetěz pokračuje z jeho konce', retezStart && Math.hypot(retezStart[0] - K.x, retezStart[1] - K.y) < 6, JSON.stringify(retezStart));
        const zacatek = { x: retezStart[0], y: retezStart[1] };
        const prvni = await stav();
        const dir = Math.atan2(prvni[0].b[1] - prvni[0].a[1], prvni[0].b[0] - prvni[0].a[0]);
        // O 2° mimo kolmici na předchozí úsek
        const mimo = dir + (90 + 2) * Math.PI / 180;
        await pohyb(await naObr(zacatek.x + 1.6 * PX * Math.cos(mimo), zacatek.y + 1.6 * PX * Math.sin(mimo)));
        const kolmo = await p.vyhodnot(`(() => { const d = ${D}; const b = d._oddelovacNahled.points(); const s = d._oddelovacStitekNode; return { uhel: Math.atan2(b[3] - b[1], b[2] - b[0]) * 180 / Math.PI, stitek: s ? s.getText().text() : null, osa: !!d._osaUhlu, ref: d._magnet && d._magnet.reference, }; })()`);
        const odKolmice = Math.abs(((kolmo.uhel - dir * 180 / Math.PI + 540) % 360) - 180);
        kontrola('další úsek se chytí na 90° k předchozímu oddělovači, i když je šikmý', Math.abs(odKolmice - 90) < 0.01 && kolmo.stitek === '90°' && kolmo.osa, JSON.stringify({ odKolmice, ...kolmo }));
        await klik(await naObr(zacatek.x + 1.6 * PX * Math.cos(mimo), zacatek.y + 1.6 * PX * Math.sin(mimo)));
        s = await stav();
        const uhelDruheho = Math.atan2(s[1].b[1] - s[1].a[1], s[1].b[0] - s[1].a[0]);
        const uhelPrvniho = Math.atan2(s[0].b[1] - s[0].a[1], s[0].b[0] - s[0].a[0]);
        kontrola('uložený úsek je opravdu kolmý', s.length === 2 && Math.abs(Math.abs(Math.sin(uhelDruheho - uhelPrvniho)) - 1) < 1e-4, JSON.stringify(s));
        await klavesa('Escape', 'Escape');
        // Tolerance a seznam úhlů jsou společné se stěnou
        const stejne = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = 80; const opory = [{ bod: { x: 300, y: 300 }, reference: [{ uhel: 10, stena: 'x' }], domu: false }]; const zaTolerance = d._magnetUhluZ(opory, { x: 300 + 100 * Math.cos((10 + 30 + 2.5) * Math.PI / 180), y: 300 + 100 * Math.sin((10 + 30 + 2.5) * Math.PI / 180) }); const mimoTol = d._magnetUhluZ(opory, { x: 300 + 100 * Math.cos((10 + 30 + 4) * Math.PI / 180), y: 300 + 100 * Math.sin((10 + 30 + 4) * Math.PI / 180) }); return { uhel30: zaTolerance && zaTolerance.odReference, mimoTol }; })()`);
        kontrola('i 30° ze společného seznamu úhlů, tolerance 3°', stejne.uhel30 === 30 && stejne.mimoTol === null, JSON.stringify(stejne));
        // Vodítko: konec druhého oddělovače dává přímku, další začátek se na ni srovná
        const vod = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const o = [...e.oddelovace.values()][1]; const b = e.bodKonceOddelovace(o.b); d._oddelovacStart = null; const cary = d._voditka(null).filter(g => g.uzel === o.id + ':b'); const g = cary[1]; const cil = { x: b.x + g.d.x * 60 + g.d.y * 3, y: b.y + g.d.y * 60 - g.d.x * 3 }; const u = d._oddelovacUchyt(cil, { evt: { altKey: false } }); const odCary = Math.abs((u.bod.x - g.p.x) * g.d.y - (u.bod.y - g.p.y) * g.d.x); return { voditka: u.voditka ? u.voditka.length : 0, odCary, zadal: [cil.x, cil.y] }; })()`);
        kontrola('volný bod se srovná na vodítko od konce jiného oddělovače', vod.voditka > 0 && vod.odCary < 0.01, JSON.stringify(vod));
        const soubeh = await p.vyhodnot(`(() => { const d = ${D}; const zdroj = d._magnetKonce.toString() + d._oddelovacUchyt.toString(); return { spolecny: /_magnetKonce/.test(d._oddelovacUchyt.toString()), stena: /_magnetUhluZ/.test(d._magnetUhlu.toString()) }; })()`);
        kontrola('oddělovač jde přes společný výpočet', soubeh.spolecny && soubeh.stena, JSON.stringify(soubeh));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli (404 jen vypsat)', vazne.length === 0, vazne.slice(0, 3).map(c => c.text).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
