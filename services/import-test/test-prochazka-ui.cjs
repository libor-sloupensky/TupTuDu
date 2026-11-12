/**
 * Procházka okem panáčka (prochazka-3d.js, prochazka.js, Libor 12. 11. 2026): start před vchodem, chůze,
 * otáčení, zarážka oka u země a podzemí se skrytým terénem, dvojklik, výtah přes řádek podlaží, schody,
 * pád z patra, mapka, export z oka, návrat, panáček ve 2D a ve 3D, tažení z tlačítka, uložení k projektu
 * a procházka ve sdíleném odkazu. Ukládá snímky k prohlídce.
 *
 * Spuštění: node services/import-test/test-prochazka-ui.cjs [složka snímků]
 *           V3_URL=http://127.0.0.1:8017 (výchozí 8002)
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
const blizko = (a, b, tol = 0.05) => typeof a === 'number' && Math.abs(a - b) <= tol;

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'prochazka');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const stav = () => p.vyhodnot(`window._kk3d.prochazka.stav()`);
    // Klávesa držená po dobu ms (posluchač procházky je na window)
    const drz = async (kod, ms, shift = false) => {
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${kod}', key: '${kod}', shiftKey: ${shift}, bubbles: true })); true`);
        await pauza(ms);
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keyup', { code: '${kod}', key: '${kod}', shiftKey: false, bubbles: true })); true`);
        await pauza(150);
    };
    const snimek3d = async (jmeno) => {
        await pauza(400);
        const r = await p.vyhodnot(`(() => { const c = document.getElementById('kk-3d-container').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; })()`);
        const { data } = await p.cmd('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
        fs.writeFileSync(path.join(vystup, jmeno), Buffer.from(data, 'base64'));
    };
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
            body: JSON.stringify({ nazev: 'ClaudeTest prochazka ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům 10 × 8 m, vchod na jihu, patro, rovné schody, střecha');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            d.podlaziKopie = true; d.pridatPodlazi('nahoru'); d.renderer.render(); d.naPodlazi('P1');
            const jih = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y - 8 * X) < 1 && Math.abs(b.y - 8 * X) < 1; });
            const a = e.nodes.get(jih.nodeA);
            e.addOpening(jih.id, Math.abs(2.45 * X - a.x) / X - (a.x > 5 * X ? 0.9 : 0), 0.9, 'dvere', { presnaSirka: true });
            e.dum.schodiste.push({ id: 'S1', odPodlazi: 'P1', doPodlazi: 'P2', tvar: 'prime', x: 1, y: -3, uhel: 0, sirka: 1, strana: 1 });
            d._poZmeneDomu('Schody');
            d.strechaVytvor();
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(1500);
        const dvere = await p.vyhodnot(`(() => { const e = ${D}.engine; const X = e.PX_PER_M; const o = [...e.openings.values()].find(o => o.typ === 'dvere'); const w = e.walls.get(o.wallId); const A = e.nodes.get(w.nodeA), B = e.nodes.get(w.nodeB); const L = Math.hypot(B.x - A.x, B.y - A.y); const t = (o.pozice + o.sirka / 2) * X; return { x: (A.x + (B.x - A.x) / L * t) / X, z: (A.y + (B.y - A.y) / L * t) / X }; })()`);

        console.log('\n2) Tlačítko Procházka: panáček před vchodem, kamera okem, panel a mapka');
        await p.vyhodnot(`document.querySelector('[data-prochazka]').click(); true`);
        await p.cekej(`${D}.rezimProchazka && window._kk3d?.prochazka?.aktivni`, 20000, 'procházka');
        await pauza(800);
        let s = await stav();
        const uvod = await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d; const panel = document.querySelector('[data-prochazka-panel]');
            const kompas = [...document.querySelectorAll('svg')].find(x => x.closest('[x-show="!rezimProchazka"]'));
            return { persp: !!_3d.prochazka.kamera.isPerspectiveCamera, orbit: _3d.controls.enabled, panel: !!panel && panel.offsetParent !== null,
                kompas: kompas ? kompas.closest('[x-show]').offsetParent !== null : null, napoveda: document.querySelector('[data-prochazka-napoveda]').offsetParent !== null,
                kory: Object.fromEntries(d.engine.kotyPodlazi()), y0: _3d.wallGroup.position.y }; })()`);
        kontrola('kamera je perspektivní, OrbitControls vypnuté, panel a nápověda procházky vidět, kompas skrytý',
            uvod.persp && uvod.orbit === false && uvod.panel && uvod.napoveda && uvod.kompas === false, JSON.stringify(uvod));
        kontrola('panáček stojí 8 m před vchodovými dveřmi a dívá se na ně', blizko(s.x, dvere.x, 0.1) && blizko(s.z, dvere.z + 8, 0.1) && blizko(Math.cos(s.smer), 1, 0.01), JSON.stringify({ s, dvere }));
        kontrola('stojí na zemi, oko 1,6 m', blizko(s.y, 0, 0.02) && blizko(s.oko, 1.6, 0.001), JSON.stringify(s));
        await snimek3d('01-pred-vchodem.png');

        console.log('\n3) Chůze, otáčení, výška oka');
        let pred = s;
        await drz('KeyW', 1000);
        s = await stav();
        kontrola('W: za sekundu asi 2 m k domu', s.z < pred.z - 1.2 && s.z > pred.z - 2.8 && blizko(s.x, pred.x, 0.05), `${pred.z.toFixed(2)} → ${s.z.toFixed(2)}`);
        pred = s;
        await drz('KeyD', 500);
        s = await stav();
        kontrola('D: úkrok vpravo (na +x při pohledu na sever)', s.x > pred.x + 0.4 && blizko(s.z, pred.z, 0.05), `${pred.x.toFixed(2)} → ${s.x.toFixed(2)}`);
        pred = s;
        await drz('ArrowLeft', 500);
        s = await stav();
        kontrola('šipka vlevo otočí doleva na místě', s.smer > pred.smer + 0.4 && blizko(s.x, pred.x, 0.01), `${pred.smer.toFixed(2)} → ${s.smer.toFixed(2)}`);
        await drz('ArrowRight', 500);
        s = await stav();
        kontrola('šipka vpravo otočí zpátky', blizko(s.smer, pred.smer, 0.3), s.smer.toFixed(3));
        await drz('KeyQ', 1800);
        s = await stav();
        kontrola('Q: oko klesá a u země se zastaví na 10 cm', blizko(s.oko, 0.1, 0.001) && !s.podZemi, JSON.stringify(s));
        await snimek3d('02-oko-u-zeme.png');
        await drz('KeyQ', 1200);
        s = await stav();
        const pod = await p.vyhodnot(`({ d: ${D}.prochazkaPodZemi, zem: window._kk3d.ground.visible })`);
        kontrola('další stisk Q: oko pod zem, terén se sám skryje', s.oko < -0.5 && s.podZemi && pod.d && pod.zem === false, JSON.stringify({ oko: s.oko, pod }));
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; const st = o.stav(); o.zapni({ ...st, yOd: st.y + 0.5, sklon: 0.9 }); return true; })()`);
        await pauza(400);
        await snimek3d('03-zespodu.png');
        await drz('KeyE', 2000, true);
        s = await stav();
        const nad = await p.vyhodnot(`({ d: ${D}.prochazkaPodZemi, zem: window._kk3d.ground.visible, nastaveni: ${D}.zobrazTeren3d })`);
        kontrola('E se Shiftem: oko zpátky nad zem, terén se vrátí, přepínač Terén se nezměnil', s.oko > 1 && !s.podZemi && !nad.d && nad.zem && nad.nastaveni, JSON.stringify({ oko: s.oko, nad }));
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; const st = o.stav(); o.zapni({ ...st, yOd: st.y + 0.5, sklon: 0, oko: 1.6 }); return true; })()`);

        console.log('\n4) Dvojklik na zem: dojde tam');
        pred = await stav();
        await p.vyhodnot(`(() => { const c = window._kk3d.renderer.domElement, r = c.getBoundingClientRect();
            c.dispatchEvent(new MouseEvent('dblclick', { clientX: r.left + r.width / 2, clientY: r.top + r.height * 0.85, bubbles: true })); return true; })()`);
        await pauza(1800);
        s = await stav();
        kontrola('dvojklik pod obzor posune panáčka dopředu po zemi', s.z < pred.z - 0.8 && blizko(s.y, 0, 0.02), `${pred.z.toFixed(2)} → ${s.z.toFixed(2)}`);
        // Uvnitř čelem k jižní zdi (z = 8 m): paprsek pod obzorem projde zdí a dopadne na zem venku
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 5, z: 4, yOd: ${0.5}, smer: Math.PI, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(300);
        const presZed = await p.vyhodnot(`(() => { const c = window._kk3d.renderer.domElement, r = c.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height * 0.7;
            c.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', buttons: 0, clientX: x, clientY: y, bubbles: true }));
            return new Promise(ok => setTimeout(() => { const k = window._kk3d.scene.children.find(o => o.geometry?.type === 'RingGeometry');
                const vys = { videt: !!k?.visible, z: k?.position.z, polomer: k?.geometry.parameters.outerRadius, pres: k?.material.depthTest === false };
                c.dispatchEvent(new MouseEvent('dblclick', { clientX: x, clientY: y, bubbles: true })); ok(vys); }, 300)); })()`);
        kontrola('kroužek pod myší je malý, vidět přes zeď a leží za ní venku', presZed.videt && presZed.z > 8.3 && presZed.polomer < 0.2 && presZed.pres, JSON.stringify(presZed));
        await pauza(2500);
        s = await stav();
        kontrola('dvojklik přes zeď dovede panáčka ven na zem za ní', s.z > 8.3 && blizko(s.y, 0, 0.03), JSON.stringify(s));

        console.log('\n5) Výtah přes řádek podlaží, schody a pád z patra');
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 7, z: 5, yOd: ${uvod.y0} + 0.5, smer: 0, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(300);
        const vPrizemi = await stav();
        await p.vyhodnot(`${D}.naPodlazi('P2'); true`);
        await pauza(400);
        s = await stav();
        const kotaP2 = uvod.y0 + uvod.kory.P2;
        kontrola('uvnitř stojí na podlaze přízemí', vPrizemi.y > uvod.y0 - 0.05 && vPrizemi.y < uvod.y0 + 0.1 && vPrizemi.patro === 'P1', JSON.stringify(vPrizemi));
        kontrola('klik na řádek patra = výtah na stejné místo o patro výš', s.patro === 'P2' && s.y > kotaP2 - 0.05 && s.y < kotaP2 + 0.1 && blizko(s.x, 7, 0.01), JSON.stringify({ s, kotaP2 }));
        await snimek3d('04-patro.png');
        // Ke schodům v přízemí: začínají na x = 1 m, vedou po +x, šířka kolem z = 3 m
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 0.5, z: 3, yOd: ${uvod.y0} + 0.5, smer: -Math.PI / 2, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(300);
        await drz('KeyW', 3600);
        await pauza(500);
        s = await stav();
        kontrola('po schodech vyjde do patra', s.patro === 'P2' && s.y > kotaP2 - 0.05 && s.y < kotaP2 + 0.1 && s.x > 6, JSON.stringify({ s, kotaP2 }));
        await snimek3d('05-po-schodech.png');
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 6, z: 5, yOd: ${kotaP2} + 0.5, smer: Math.PI, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(300);
        await drz('KeyW', 1400, true);
        await pauza(700);
        s = await stav();
        kontrola('z patra ven přes zeď: spadne na zem', s.z > 8.5 && blizko(s.y, 0, 0.03), JSON.stringify(s));

        console.log('\n6) Mapka a export z oka');
        const mapka = await p.vyhodnot(`(() => { const c = document.querySelector('[data-pr-mapka]'); const g = c.getContext('2d'); const b = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < b.length; i += 4) if (b[i] > 0) n++;
            return { n, nazev: document.querySelector('[data-pr-nazev]').textContent, w: c.width }; })()`);
        kontrola('mapka je nakreslená a ukazuje podlaží, kde panáček stojí', mapka.n > 500 && mapka.nazev.length > 0, JSON.stringify(mapka));
        await p.vyhodnot(`(() => { const c = document.querySelector('[data-pr-mapka]'); const r = c.getBoundingClientRect();
            c.dispatchEvent(new PointerEvent('pointerdown', { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true })); return true; })()`);
        await pauza(400);
        s = await stav();
        kontrola('klik doprostřed mapky přenese panáčka k domu', s.x > -2 && s.x < 12 && s.z > -2 && s.z < 12, JSON.stringify(s));
        const exp = await p.vyhodnot(`(() => { const cv = ${D}._snimekScény(); return { w: cv.width, h: cv.height, postava: !!window._kk3d.panacek3d?.visible }; })()`);
        kontrola('export obrázku v procházce bere pohled oka', exp.w > 100 && exp.h > 100 && !exp.postava, JSON.stringify(exp));
        await snimek3d('06-mapka.png');
        // Pole Oko: hodnota platí ihned (jednotné chování polí editoru), písmena v poli panáčkem nehýbou
        pred = await stav();
        await p.cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
        await p.vyhodnot(`(() => { const n = document.querySelector('[data-pr-oko]'); n.focus(); n.select(); return document.activeElement === n; })()`);
        for (const z of '0.8') {
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', text: z, key: z, unmodifiedText: z });
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: z });
        }
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
        await pauza(400);
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'w', code: 'KeyW', windowsVirtualKeyCode: 87 });
        await pauza(550);
        s = await stav();
        const pole = await p.vyhodnot(`({ kurzor: document.activeElement === document.querySelector('[data-pr-oko]'), text: document.querySelector('[data-pr-oko]').value })`);
        kontrola('pole Oko: 0,8 platí bez odchodu z pole, kurzor zůstal, W při psaní nehne', blizko(s.oko, 0.8, 0.001) && pole.kurzor && blizko(s.x, pred.x, 0.001) && blizko(s.z, pred.z, 0.001), JSON.stringify({ oko: s.oko, pole }));
        await p.vyhodnot(`document.querySelector('[data-pr-oko]').blur(); true`);
        const vychozi = await p.vyhodnot(`(() => { const b = document.querySelector('[data-pr-oko-vychozi]'); const pred = b.disabled; b.click();
            return new Promise(ok => setTimeout(() => ok({ pred, po: b.disabled, oko: window._kk3d.prochazka.stav().oko, pole: document.querySelector('[data-pr-oko]').value, tip: b.title }), 300)); })()`);
        kontrola('tlačítko u pole Oko vrátí výchozí 1,6 m a pak zešedne', !vychozi.pred && vychozi.po && blizko(vychozi.oko, 1.6, 0.001) && vychozi.pole === '1.6' && vychozi.tip.length > 0, JSON.stringify(vychozi));

        console.log('\n6b) Rozložení: editor až dolů, plátno 3D přes celou plochu i na celé obrazovce, souřadnice jen ve 2D');
        const ROZMERY = `(() => { const w = document.getElementById('kk-canvas-wrap').getBoundingClientRect(), e = document.querySelector('.kk-editor').getBoundingClientRect();
            const t = document.querySelector('#kk-3d-container canvas').getBoundingClientRect(), k = document.querySelector('.kk-coords');
            return { okno: innerHeight, editorDole: Math.round(e.bottom), wrap: Math.round(w.height), gl: Math.round(t.height), glDole: Math.round(t.bottom), wrapDole: Math.round(w.bottom), souradnice: !!k.offsetParent, posuvnik: document.documentElement.scrollHeight > innerHeight + 1 }; })()`;
        let roz = await p.vyhodnot(ROZMERY);
        kontrola('editor sahá ke spodnímu okraji okna (nejvýš 12 px), stránka se neposouvá', roz.okno - roz.editorDole <= 12 && roz.okno - roz.editorDole >= 0 && !roz.posuvnik, JSON.stringify(roz));
        kontrola('plátno 3D vyplní plochu až dolů, souřadnice ve 3D nejsou', Math.abs(roz.gl - roz.wrap) <= 1 && Math.abs(roz.glDole - roz.wrapDole) <= 1 && !roz.souradnice, JSON.stringify(roz));
        await p.vyhodnot(`${D}.prepniFullscreen(); true`);
        await pauza(800);
        roz = await p.vyhodnot(ROZMERY);
        kontrola('na celé obrazovce plátno 3D vyplní celou plochu', Math.abs(roz.gl - roz.wrap) <= 1 && roz.editorDole === roz.okno, JSON.stringify(roz));
        await snimek3d('06b-cela-obrazovka.png');
        await p.vyhodnot(`${D}.prepniFullscreen(); true`);
        await pauza(800);
        roz = await p.vyhodnot(ROZMERY);
        kontrola('po návratu z celé obrazovky zase až dolů', Math.abs(roz.gl - roz.wrap) <= 1 && roz.okno - roz.editorDole <= 12, JSON.stringify(roz));

        console.log('\n7) Esc: zpátky do 2D, poloha uložená k projektu, panáček v půdorysu');
        const kompasPred = await p.vyhodnot(`${D}.kompasUhel`);
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })); true`);
        await pauza(800);
        const po = await p.vyhodnot(`(() => { const d = ${D}; const L = d.renderer.panacekLayer; return { rezim: d.rezimProchazka, r3d: d.rezim3d, panacek: JSON.parse(JSON.stringify(d.panacek)), kompas: d.kompasUhel, deti: L ? L.getChildren().length : -1, aktivni: window._kk3d.prochazka.aktivni }; })()`);
        kontrola('Esc vrátí do 2D, odkud procházka začala', !po.rezim && !po.r3d && !po.aktivni, JSON.stringify(po));
        kontrola('poloha panáčka je uložená (podlaží, výška nad podlahou, směr) a kompas se nezměnil', po.panacek && blizko(po.panacek.x, s.x, 0.01) && typeof po.panacek.dy === 'number' && po.kompas === kompasPred, JSON.stringify(po.panacek));
        kontrola('v půdorysu je panáček', po.deti === 1);
        const ve2d = await p.vyhodnot(`(() => { const w = document.getElementById('kk-canvas-wrap').getBoundingClientRect(), k = document.querySelector('#kk-container .konvajs-content').getBoundingClientRect();
            return { souradnice: !!document.querySelector('.kk-coords').offsetParent, wrap: Math.round(w.height), konva: Math.round(k.height) }; })()`);
        kontrola('ve 2D souřadnice zůstaly a půdorys vyplní plochu', ve2d.souradnice && Math.abs(ve2d.wrap - ve2d.konva) <= 1, JSON.stringify(ve2d));
        await p.snimek(path.join(vystup, '07-pudorys.png'));
        const tah = await p.vyhodnot(`(() => { const d = ${D}; const g = d.renderer.panacekLayer.getChildren()[0]; const X = d.engine.PX_PER_M;
            g.position({ x: 4 * X, y: 4 * X }); g.fire('dragend'); return JSON.parse(JSON.stringify(d.panacek)); })()`);
        kontrola('tahem v půdorysu se panáček přesune na aktivní podlaží', blizko(tah.x, 4, 0.01) && blizko(tah.z, 4, 0.01) && tah.podlazi === 'P1' && tah.dy === 0, JSON.stringify(tah));
        const exportSkryje = await p.vyhodnot(`(() => { const d = ${D}; const L = d.renderer.panacekLayer; let behem = null; const puv = L.visible.bind(L);
            const k = d._kresbyPodlazi(['P1']); return { platno: !!k[0].canvas, poExportu: L.visible() }; })()`);
        kontrola('export půdorysu panáčka nekreslí a po něm je zase vidět', exportSkryje.platno && exportSkryje.poExportu, JSON.stringify(exportSkryje));

        console.log('\n8) Přetažení panáčka z tlačítka do půdorysu');
        const cil = await p.vyhodnot(`(() => { const d = ${D}; const b = document.querySelector('[data-prochazka]').getBoundingClientRect(); const c = d.$refs.konvaContainer.getBoundingClientRect();
            const X = d.engine.PX_PER_M; const q = d.stage.getAbsoluteTransform().point({ x: 2 * X, y: 2 * X });
            return { bx: b.left + b.width / 2, by: b.top + b.height / 2, cx: c.left + q.x, cy: c.top + q.y }; })()`);
        await p.vyhodnot(`(() => { const b = document.querySelector('[data-prochazka]');
            b.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: ${cil.bx}, clientY: ${cil.by}, bubbles: true }));
            window.dispatchEvent(new PointerEvent('pointermove', { clientX: ${cil.bx} + 40, clientY: ${cil.by} + 60, bubbles: true }));
            window.dispatchEvent(new PointerEvent('pointermove', { clientX: ${cil.cx}, clientY: ${cil.cy}, bubbles: true }));
            window.dispatchEvent(new PointerEvent('pointerup', { button: 0, clientX: ${cil.cx}, clientY: ${cil.cy}, bubbles: true })); return true; })()`);
        await p.cekej(`${D}.rezimProchazka && window._kk3d.prochazka.aktivni`, 20000, 'procházka po přetažení');
        await pauza(500);
        s = await stav();
        kontrola('po puštění v půdorysu začne procházka na tom místě', blizko(s.x, 2, 0.05) && blizko(s.z, 2, 0.05) && s.patro === 'P1', JSON.stringify(s));
        await snimek3d('08-po-pretazeni.png');

        console.log('\n9) Tlačítko 3D: procházka skončí, ve 3D stojí postava');
        await p.vyhodnot(`[...document.querySelectorAll('.kk-skupina-dily button')].find(b => b.textContent.trim() === '3D').click(); true`);
        await pauza(800);
        const ve3d = await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d; const f = _3d.panacek3d; return { rezim: d.rezimProchazka, r3d: d.rezim3d, orbit: _3d.controls.enabled, postava: !!f?.visible, poloha: f ? [f.position.x, f.position.y, f.position.z] : null }; })()`);
        kontrola('3D: orbit zapnutý, postava stojí, kde panáček skončil', !ve3d.rezim && ve3d.r3d && ve3d.orbit && ve3d.postava && blizko(ve3d.poloha[0], s.x, 0.05) && blizko(ve3d.poloha[2], s.z, 0.05), JSON.stringify(ve3d));
        await p.vyhodnot(`(() => { const _3d = window._kk3d; _3d.camera.position.set(-4, 12, 18); _3d.controls.target.set(3, 1, 3); _3d.camera.zoom = 1.6; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); ${D}.zobrazStrechu3d = false; ${D}.skryte3d = ['P2']; ${D}._nastavViditelnost3d(); _3d.kresliDo = performance.now() + 500; return true; })()`);
        await snimek3d('09-postava-ve-3d.png');
        await p.vyhodnot(`${D}.zobrazStrechu3d = true; ${D}.skryte3d = []; ${D}._nastavViditelnost3d(); true`);

        console.log('\n10) Po obnovení stránky panáček zůstává');
        const ulozeny = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.panacek))`);
        await pauza(1600);   // ukládání katastru má prodlevu 1 s
        await p.vyhodnot(`location.reload(); true`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 40000, 'editor po obnovení');
        const nacteny = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.panacek))`);
        kontrola('poloha panáčka se načte z projektu', nacteny && blizko(nacteny.x, ulozeny.x, 0.001) && blizko(nacteny.z, ulozeny.z, 0.001) && nacteny.podlazi === ulozeny.podlazi, JSON.stringify({ ulozeny, nacteny }));

        console.log('\n11) Sdílený odkaz: Procházka vedle 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; if (d.rezim3d) { d.rezim3d = false; d.prepni2d(); } document.querySelector('[data-sekce-export]').open = true;
            await new Promise(r => setTimeout(r, 500)); document.querySelector('[data-sdileni=vytvorit]').click(); return true; })()`);
        await p.cekej(`!!(${D}.sdileni && ${D}.sdileni.aktivni)`, 40000, 'odkaz');
        const adresa = await p.vyhodnot(`${D}.sdileni.url`);
        await p.jdiNa(adresa);
        await p.cekej(`!!window.__sdileniScena?.ovladac`, 30000, 'prohlížeč');
        await p.vyhodnot(`document.querySelector('[data-pohled=prochazka]').click(); true`);
        await pauza(800);
        const odkaz = await p.vyhodnot(`(() => { const o = window.__sdileniScena.ovladac; const st = o.stav(); return { aktivni: o.aktivni, st, napoveda: document.querySelector('[data-sdileni-napoveda]').textContent,
            panel: document.querySelector('[data-prochazka-panel]').offsetParent !== null, patro: document.querySelector('[data-pr-nazev]').textContent }; })()`);
        kontrola('procházka v odkazu začne tam, kde autor panáčka nechal', odkaz.aktivni && blizko(odkaz.st.x, ulozeny.x, 0.01) && blizko(odkaz.st.z, ulozeny.z, 0.01) && odkaz.panel && odkaz.patro.length > 0, JSON.stringify(odkaz));
        const model = await p.vyhodnot(`(async () => { const m = await (await fetch(document.querySelector('[data-sdileni-plocha]').dataset.model)).json();
            const c = document.querySelector('[data-pr-mapka]'); const b = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < b.length; i += 4) if (b[i] > 0) n++;
            return { podlazi: (m.prochazka?.mapka?.podlazi || []).map(q => Object.keys(q).sort().join()), obrazek: (m.prochazka?.mapka?.podlazi || []).every(q => String(q.obrazek).startsWith('data:image/png')), pixelu: n }; })()`);
        kontrola('odkaz nese mapku jen jako obrázek (stěny a otvory jako data ne) a mapka se v něm vykreslí',
            model.podlazi.length === 2 && model.obrazek && model.podlazi.every(k => k === 'id,nazev,obal,obrazek,y') && model.pixelu > 500, JSON.stringify(model));
        pred = odkaz.st;
        await drz('KeyW', 500);   // do severní zdi jsou 2 m, ať zůstane uvnitř
        s = await p.vyhodnot(`window.__sdileniScena.ovladac.stav()`);
        kontrola('i v odkazu se chodí klávesami a stojí se na podlaze', Math.hypot(s.x - pred.x, s.z - pred.z) > 0.5 && Math.abs(s.y - pred.y) < 0.1, JSON.stringify({ pred, s }));
        await p.snimek(path.join(vystup, '10-odkaz-prochazka.png'));
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', bubbles: true })); true`);
        await pauza(400);
        const zpet = await p.vyhodnot(`({ aktivni: window.__sdileniScena.ovladac.aktivni, tlacitko: document.querySelector('[data-pohled="3d"]').getAttribute('aria-pressed') })`);
        kontrola('Esc v odkazu vrátí pohled 3D', !zpet.aktivni && zpet.tlacitko === 'true', JSON.stringify(zpet));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', !vazne.length, vazne.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA ' + e.message);
        try { await p.snimek(path.join(vystup, 'chyba.png')); } catch { /* nic */ }
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
})();
