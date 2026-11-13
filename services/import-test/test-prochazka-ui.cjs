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
    // Drží klávesu, dokud neplatí podmínka (nejvýš limit ms) a pak ještě chvíli: krok se počítá z času mezi
    // snímky, při zatíženém počítači pevná doba nestačila
    const drzDokud = async (kod, podminka, limit = 8000, navic = 300) => {
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keydown', { code: '${kod}', key: '${kod}', bubbles: true })); true`);
        try { await p.cekej(podminka, limit, kod); } catch { /* vyhodnotí kontrola */ }
        await pauza(navic);
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keyup', { code: '${kod}', key: '${kod}', bubbles: true })); true`);
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
        const poLeve = s;
        await drz('ArrowRight', 500);
        s = await stav();
        // Jen směr: o kolik, záleží na rychlosti snímků (při zatíženém počítači se pevná doba nedala porovnat)
        kontrola('šipka vpravo otočí doprava', s.smer < poLeve.smer - 0.2 && blizko(s.x, poLeve.x, 0.01), `${poLeve.smer.toFixed(2)} → ${s.smer.toFixed(2)}`);
        // Tah myší: levé i pravé tlačítko otáčí stejně, pravé bez kontextové nabídky (Libor 13. 11. 2026)
        const tahMysi = async (tlacitko) => {
            const r = await p.vyhodnot(`(() => { const b = window._kk3d.renderer.domElement.getBoundingClientRect(); window._kontextNabidka = null;
                window.addEventListener('contextmenu', (e) => { window._kontextNabidka = e.defaultPrevented; }, { once: true }); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
            const maska = tlacitko === 'left' ? 1 : 2;
            const pred = await stav();
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: tlacitko, buttons: maska, clickCount: 1 });
            for (let i = 1; i <= 6; i++) await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x + i * 20, y: r.y, button: tlacitko, buttons: maska });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x + 120, y: r.y, button: tlacitko, buttons: 0, clickCount: 1 });
            await pauza(300);
            const po = await stav();
            return { otoceni: +(po.smer - pred.smer).toFixed(3), posun: +Math.hypot(po.x - pred.x, po.z - pred.z).toFixed(3), nabidka: await p.vyhodnot('window._kontextNabidka') };
        };
        const tahL = await tahMysi('left'), tahP = await tahMysi('right');
        kontrola('tah levým tlačítkem otočí pohledem na místě', Math.abs(tahL.otoceni) > 0.1 && tahL.posun < 0.01, JSON.stringify(tahL));
        kontrola('tah pravým tlačítkem otočí stejně jako levým', blizko(tahP.otoceni, tahL.otoceni, 0.01) && tahP.posun < 0.01, JSON.stringify(tahP));
        kontrola('pravé tlačítko neotevře kontextovou nabídku prohlížeče', tahP.nabidka !== false, JSON.stringify(tahP.nabidka));
        await drzDokud('KeyQ', 'window._kk3d.prochazka.stav().oko <= 0.1001', 8000, 500);
        s = await stav();
        kontrola('Q: oko klesá a u země se zastaví na 10 cm', blizko(s.oko, 0.1, 0.001) && !s.podZemi, JSON.stringify(s));
        await snimek3d('02-oko-u-zeme.png');
        await drzDokud('KeyQ', 'window._kk3d.prochazka.stav().oko < -0.6', 8000, 100);
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
        // Drží W, dokud nedojde za schody: krok se počítá z času mezi snímky, při zatíženém počítači
        // (testy víc sezení) jde pomaleji a pevná doba nestačila
        await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'KeyW', bubbles: true })); true`);
        try { await p.cekej(`window._kk3d.prochazka.stav().x > 6.5`, 15000, 'za schody'); } finally {
            await p.vyhodnot(`window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'KeyW', bubbles: true })); true`);
        }
        await pauza(600);
        s = await stav();
        kontrola('po schodech vyjde do patra', s.patro === 'P2' && s.y > kotaP2 - 0.05 && s.y < kotaP2 + 0.1 && s.x > 6, JSON.stringify({ s, kotaP2 }));
        await snimek3d('05-po-schodech.png');
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 6, z: 5, yOd: ${kotaP2} + 0.5, smer: Math.PI, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(300);
        await drz('KeyW', 1400, true);
        await pauza(700);
        s = await stav();
        kontrola('z patra ven přes zeď: spadne na zem', s.z > 8.5 && blizko(s.y, 0, 0.03), JSON.stringify(s));

        console.log('\n5b) Dům se posune a dům na svahu (vzorový projekt 12. 11.: panáček skončil pod podlahou i terénem)');
        await p.vyhodnot(`(() => { const o = window._kk3d.prochazka; o.zapni({ x: 7, z: 5, yOd: ${uvod.y0} + 0.5, smer: 0, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(400);
        // Jako dotažení výšek terénu po startu procházky: celý dům o 3 m výš
        await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d; _3d.wallGroup.position.y += 3; _3d.wallGroup.updateMatrixWorld(true); d._prochazkaPoStavbe(); return true; })()`);
        await pauza(600);
        s = await stav();
        kontrola('dům se posunul o 3 m nahoru: panáček jde s ním a stojí na podlaze', blizko(s.y, uvod.y0 + 3 + 0.025, 0.05) && s.patro === 'P1', JSON.stringify(s));
        await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d; _3d.wallGroup.position.y -= 3; _3d.wallGroup.updateMatrixWorld(true); d._prochazkaPoStavbe(); return true; })()`);
        await pauza(600);
        s = await stav();
        kontrola('a zpátky dolů s ním', blizko(s.y, uvod.y0 + 0.025, 0.05), JSON.stringify(s));
        // Přízemí 1,2 m nad terénem: zvenku po zemi do domu, panáček vystoupí na podlahu (dřív zůstal pod ní)
        await p.vyhodnot(`(async () => { const d = ${D}; d.engine.dum.posunVysky = 1.2; d._build3d(); await new Promise(r => setTimeout(r, 300));
            const o = window._kk3d.prochazka; o.zapni({ x: 5, z: 11, yOd: 0.5, smer: 0, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(400);
        const venku = await stav();
        await drzDokud('KeyW', 'window._kk3d.prochazka.stav().z < 7', 12000, 200);
        await pauza(600);
        s = await stav();
        const kotaP1 = await p.vyhodnot(`window._kk3d.wallGroup.position.y + ${D}.engine.kotaPodlazi('P1')`);
        kontrola('z terénu 1,2 m pod podlahou dojde do domu a stojí na podlaze, ne pod ní', blizko(venku.y, 0, 0.03) && s.z < 7.5 && blizko(s.y, kotaP1 + 0.025, 0.05), JSON.stringify({ venku: venku.y, s, kotaP1 }));
        await snimek3d('05b-dum-nad-terenem.png');
        await p.vyhodnot(`(async () => { const d = ${D}; d.engine.dum.posunVysky = 0; d._build3d(); await new Promise(r => setTimeout(r, 300)); return true; })()`);

        console.log('\n5c) Strop pod šikmou střechou a podlaha pod dveřmi');
        const STROP = `(() => { const d = ${D}, _3d = window._kk3d; const m = _3d.dumSkupina.children.filter(o => o.userData?.stropPod === 'P2' && !o.userData.lemDesky);
            const b = m.length ? new THREE.Box3().setFromObject(m[0]) : null; return { pocet: m.length, od: b ? +(b.min.y - _3d.wallGroup.position.y).toFixed(3) : null, do: b ? +(b.max.y - _3d.wallGroup.position.y).toFixed(3) : null,
            sirka: b ? +(b.max.x - b.min.x).toFixed(3) : null, svetla: d.engine.svetlaVyska(d.engine.podlaziPodleId('P2')), kota: d.engine.kotaPodlazi('P2'), panel: JSON.parse(JSON.stringify({ moz: d.strechaPanel.stropMozny, strop: d.strechaPanel.strop })) }; })()`;
        let strop = await p.vyhodnot(STROP);
        kontrola('pod šikmou střechou je výchozí strop ve světlé výšce horního podlaží, o 2 cm užší než dům (boky ve zdech)',
            strop.pocet === 1 && blizko(strop.od, strop.kota + strop.svetla, 0.01) && strop.sirka < 10.3 - 0.03 && strop.panel.moz && strop.panel.strop, JSON.stringify(strop));
        await p.vyhodnot(`(async () => { const d = ${D}; d.setStrecha('strop', false); await new Promise(r => setTimeout(r, 600)); return true; })()`);
        strop = await p.vyhodnot(STROP);
        kontrola('volba Strop vypnutá: strop zmizí (otevřený krov)', strop.pocet === 0 && !strop.panel.strop, JSON.stringify(strop));
        const ulozeno = await p.vyhodnot(`${D}.engine.dum.strecha.strop`);
        await p.vyhodnot(`(async () => { const d = ${D}; d.setStrecha('strop', true); await new Promise(r => setTimeout(r, 600)); return true; })()`);
        strop = await p.vyhodnot(STROP);
        kontrola('zapnutím se strop vrátí a v datech nic nezůstane', ulozeno === false && strop.pocet === 1 && (await p.vyhodnot(`${D}.engine.dum.strecha.strop === undefined`)), JSON.stringify({ ulozeno, strop }));
        // Podlaha pod vchodovými dveřmi: na ose zdi i kousek před vnějším lícem leží dekor podlahy (0,025), ne holá deska
        // Obdélníky dekoru podlahy (po 6 vrcholech ve výšce 0,025) pokrývají bod na ose zdi i u vnějšího líce?
        const podDvermi = await p.vyhodnot(`(() => { const g = window._kk3d.podlaziSkupiny.get('P1'); const obd = [];
            g.traverse(o => { const poz = o.isMesh && o.geometry.type === 'BufferGeometry' ? o.geometry.getAttribute('position') : null; if (!poz || poz.count % 6) return;
                for (let i = 0; i < poz.count; i += 6) { const xs = [], ys = [], zs = []; for (let j = i; j < i + 6; j++) { xs.push(poz.getX(j)); ys.push(poz.getY(j)); zs.push(poz.getZ(j)); }
                    if (Math.max(...ys) - Math.min(...ys) < 1e-4 && Math.abs(ys[0] - 0.025) < 0.002) obd.push([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]); } });
            const kryje = (x, z) => obd.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d);
            return { obdelniku: obd.length, osa: kryje(${dvere.x}, 8.0), uLice: kryje(${dvere.x}, 8.13), mimoDvere: kryje(${dvere.x} + 2, 8.0) }; })()`);
        kontrola('pod vchodovými dveřmi je podlaha přes celou tloušťku zdi (bez zubů), mimo dveře ve zdi ne', podDvermi.osa && podDvermi.uLice && !podDvermi.mimoDvere, JSON.stringify(podDvermi));
        // Okno až k podlaze (parapet 0, vzorový dům O46–O48) má podlahu ve zdi taky, okno s parapetem ne
        await p.vyhodnot(`(async () => { const d = ${D}; d.naPodlazi('P1'); const e = d.engine, X = e.PX_PER_M;
            const vychod = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.x - 10 * X) < 1 && Math.abs(b.x - 10 * X) < 1; });
            const a = e.nodes.get(vychod.nodeA), od = (z) => Math.abs(z * X - a.y) / X;
            e.addOpening(vychod.id, Math.min(od(2), od(3.2)), 1.2, 'okno', { presnaSirka: true, parapet: 0, vyska: 2.3 });
            e.addOpening(vychod.id, Math.min(od(5), od(6.2)), 1.2, 'okno', { presnaSirka: true });
            d.renderer.render(); d._build3d(); await new Promise(r => setTimeout(r, 400)); return true; })()`);
        const podOknem = await p.vyhodnot(`(() => { const g = window._kk3d.podlaziSkupiny.get('P1'); const obd = [];
            g.traverse(o => { const poz = o.isMesh && o.geometry.type === 'BufferGeometry' ? o.geometry.getAttribute('position') : null; if (!poz || poz.count % 6) return;
                for (let i = 0; i < poz.count; i += 6) { const xs = [], ys = [], zs = []; for (let j = i; j < i + 6; j++) { xs.push(poz.getX(j)); ys.push(poz.getY(j)); zs.push(poz.getZ(j)); }
                    if (Math.max(...ys) - Math.min(...ys) < 1e-4 && Math.abs(ys[0] - 0.025) < 0.002) obd.push([Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]); } });
            const kryje = (x, z) => obd.some(([a, b, c, d]) => x >= a && x <= b && z >= c && z <= d);
            return { kPodlaze: kryje(10.0, 2.6) && kryje(10.13, 2.6), sParapetem: kryje(10.0, 5.6) }; })()`);
        kontrola('pod oknem až k podlaze je podlaha přes celou zeď, pod oknem s parapetem ne', podOknem.kPodlaze && !podOknem.sParapetem, JSON.stringify(podOknem));
        // Strop má barvu vnitřních stěn
        const barvaStropu = await p.vyhodnot(`(() => { const _3d = window._kk3d; const m = _3d.dumSkupina.children.find(o => o.userData?.stropPod === 'P1' && !o.userData.lemDesky);
            let stena = null; _3d.podlaziSkupiny.get('P1').traverse(o => { for (const x of [].concat(o.material || [])) if (!stena && x.side === THREE.DoubleSide && !x.userData?.barva && x.color?.getHexString() === 'ffffff') stena = x.color.getHexString(); });
            return { strop: m ? [].concat(m.material)[0].color.getHexString() : null, stena }; })()`);
        kontrola('spodek stropní desky má barvu vnitřních stěn (bílá), dřív šedobéžová', barvaStropu.strop === 'ffffff' && barvaStropu.stena === 'ffffff', JSON.stringify(barvaStropu));

        console.log('\n5d) Lampa od oka uvnitř a vyhlazení hran');
        // Roh v přízemí pod patrem: obě stěny dřív stejně světlé, s lampou se liší
        await p.vyhodnot(`(() => { window._kk3d.prochazka.zapni({ x: 3, z: 3, yOd: 0.5, smer: Math.PI / 4, sklon: 0, oko: 1.6 }); return true; })()`);
        await pauza(1500);
        const roh = await p.vyhodnot(`(() => { const _3d = window._kk3d, r = _3d.renderer, gl = r.getContext(); r.render(_3d.scene, _3d.prochazka.kamera);
            const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const vzorek = (fx) => { const n = 10, b = new Uint8Array(n * n * 4); gl.readPixels(Math.floor(W * fx) - 5, Math.floor(H * 0.5) - 5, n, n, gl.RGBA, gl.UNSIGNED_BYTE, b); let s = 0; for (let i = 0; i < n * n; i++) s += b[i * 4]; return Math.round(s / (n * n)); };
            return { leva: vzorek(0.3), prava: vzorek(0.7), lampa: _3d.prochazka.stav().lampa }; })()`);
        kontrola('uvnitř svítí lampa a dvě stěny rohu mají různý jas (dřív stejný)', roh.lampa > 0.25 && Math.abs(roh.leva - roh.prava) >= 12, JSON.stringify(roh));
        await snimek3d('05d-roh.png');
        await p.vyhodnot(`(() => { window._kk3d.prochazka.zapni({ x: 5, z: 14, yOd: 0.5, smer: 0, sklon: 0, oko: 1.6 }); return true; })()`);
        try { await p.cekej('window._kk3d.prochazka.stav().lampa === 0', 8000, 'lampa zhasne'); } catch { /* vyhodnotí kontrola */ }
        s = await stav();
        kontrola('venku lampa nesvítí', s.lampa === 0, JSON.stringify(s));
        // Vyhlazení: smyčka kreslí přes Svetlo3d.kresli, obraz se liší jen na hranách a barvy zůstanou
        const fxaa = await p.vyhodnot(`(() => { const _3d = window._kk3d, r = _3d.renderer, gl = r.getContext(), W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
            const cti = () => { const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
            r.render(_3d.scene, _3d.prochazka.kamera); const a = cti(); window.Svetlo3d.kresli(r, _3d.scene, _3d.prochazka.kamera); const b = cti();
            let soucet = 0, zmen = 0; for (let i = 0; i < a.length; i += 4) { const d = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); soucet += d; if (d > 12) zmen++; }
            const puv = window.Svetlo3d.kresli; let volani = 0; window.Svetlo3d.kresli = function () { volani++; return puv.apply(this, arguments); };
            _3d.kresliDo = performance.now() + 400;
            return new Promise(ok => setTimeout(() => { window.Svetlo3d.kresli = puv; ok({ prumer: +(soucet / (a.length / 4) / 3).toFixed(3), zmen, volani }); }, 500)); })()`);
        kontrola('vyhlazení hran: smyčka kreslí s ním, mění jen hrany a barvy nechá', fxaa.volani > 0 && fxaa.zmen > 50 && fxaa.prumer < 1, JSON.stringify(fxaa));

        console.log('\n5e) Kliky oken a otevírání dveří a oken (Libor 13. 11. 2026)');
        // Okna ve východní zdi (x = 10, část 5c): klika jen zevnitř (x < 10), barvou rámu uvnitř
        const klikyOken = await p.vyhodnot(`(() => { const d = ${D}, e = d.engine; const out = [];
            for (const g of d._prochazkaKridla()) { const u = g.userData.kridlo, op = e.openings.get(u.otvor); if (!op || op.typ !== 'okno') continue;
                const kliky = []; g.traverse(o => { if (o.userData?.klika) kliky.push(o); });
                const b = new THREE.Box3(); kliky.forEach(o => b.expandByObject(o));
                out.push({ otvor: u.otvor, kusu: kliky.length, barva: kliky[0]?.material.userData.barva, x: [+b.min.x.toFixed(3), +b.max.x.toFixed(3)], vyska: +((b.min.y + b.max.y) / 2 - window._kk3d.wallGroup.position.y).toFixed(2) }); }
            return out; })()`);
        kontrola('otvíravá okna mají kliku zevnitř v barvě rámu uvnitř, okno k podlaze ve výšce kliky dveří', klikyOken.length >= 2 && klikyOken.every(k => k.kusu === 3 && k.barva === 'oknoDovnitr' && k.x[1] < 10 && k.x[0] > 9.7)
            && klikyOken.some(k => k.vyska > 0.95 && k.vyska < 1.1) && klikyOken.some(k => k.vyska > 1.3), JSON.stringify(klikyOken));
        // Před dveřmi zvenku: najetí na kliku ukáže ikonu, klik otevře, druhý klik zavře
        await p.vyhodnot(`(() => { window._kk3d.prochazka.zapni({ x: ${dvere.x}, z: 9.6, yOd: 0.5, smer: 0, sklon: -0.3, oko: 1.6 }); return true; })()`);
        await pauza(800);
        const naKliku = await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d, k = _3d.prochazka.kamera, r = _3d.renderer.domElement.getBoundingClientRect();
            const u = d._prochazkaUchopy().find(x => d.engine.openings.get(x.id.split(':')[1])?.typ === 'dvere'); if (!u) return null;
            const b = u.body.reduce((a, c) => (c.z > a.z ? c : a)); const v = b.clone().project(k);
            return { id: u.id, x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height }; })()`);
        const klik = async (b) => {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
            await pauza(200);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        };
        const kridlo = () => `(() => { const d = ${D}; const g = d._prochazkaKridla().find(g => d._idKridla(g.userData.kridlo) === '${naKliku.id}'); return g ? { rot: +g.rotation.y.toFixed(3), uhel: +g.userData.kridlo.uhel.toFixed(3) } : null; })()`;
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: naKliku.x, y: naKliku.y });
        await pauza(400);
        const ikona = await p.vyhodnot(`(() => { const z = document.querySelector('[data-pr-uchop]'); return { videt: !z.hidden, ikona: z.dataset.ikona, kurzor: window._kk3d.renderer.domElement.style.cursor }; })()`);
        kontrola('najetí na kliku dveří ukáže ikonu otevření a ruku', ikona.videt && ikona.ikona === 'otevrit' && ikona.kurzor === 'pointer', JSON.stringify(ikona));
        await klik(naKliku);
        await pauza(1300);
        let dvereStav = await p.vyhodnot(kridlo());
        kontrola('klik dveře otevře (otočí kolem pantů na stranu z půdorysu)', dvereStav && Math.abs(dvereStav.rot - dvereStav.uhel) < 0.01 && Math.abs(dvereStav.uhel) > 1.3, JSON.stringify(dvereStav));
        await snimek3d('05e-dvere-otevrene.png');
        const uchopPoOtevreni = await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d, k = _3d.prochazka.kamera, r = _3d.renderer.domElement.getBoundingClientRect();
            const u = d._prochazkaUchopy().find(x => x.id === '${naKliku.id}'); const b = u.body.reduce((a, c) => (c.z > a.z ? c : a)); const v = b.clone().project(k);
            return { x: r.left + (v.x + 1) / 2 * r.width, y: r.top + (1 - v.y) / 2 * r.height, otevreno: u.otevreno }; })()`);
        await klik(uchopPoOtevreni);
        await pauza(1300);
        dvereStav = await p.vyhodnot(kridlo());
        kontrola('druhý klik je zavře', uchopPoOtevreni.otevreno && dvereStav && Math.abs(dvereStav.rot) < 0.01, JSON.stringify({ uchopPoOtevreni, dvereStav }));
        // Okno se otevře dovnitř do místnosti (klika jde od zdi do domu)
        const okno = await p.vyhodnot(`(async () => { const d = ${D}; const u = d._prochazkaUchopy().find(x => d.engine.openings.get(x.id.split(':')[1])?.typ === 'okno');
            const pred = u.body[0].x; d._prochazkaPrepniKridlo(u.id); await new Promise(r => setTimeout(r, 1200));
            const po = d._prochazkaUchopy().find(x => x.id === u.id); return { pred: +pred.toFixed(2), po: +po.body[0].x.toFixed(2), otevreno: po.otevreno }; })()`);
        kontrola('okno se otevře do boku dovnitř', okno.otevreno && okno.po < okno.pred - 0.3, JSON.stringify(okno));

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
        const zavrena = await p.vyhodnot(`${D}._prochazkaKridla().every(g => Math.abs(g.rotation.y) < 1e-6)`);
        kontrola('po konci procházky jsou dveře i okna zavřené', zavrena);
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
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 90000, 'editor po obnovení');
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
