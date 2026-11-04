/**
 * Nula otvoru: okna a dveře se měří od podlahy místnosti. Zvýšená a snížená místnost,
 * otvor mezi místnostmi, přenos na vyšší podlaží, ořez stěnou, panel, Zpět.
 *
 * Spuštění: node services/import-test/test-nula-otvoru-ui.cjs [složka snímků]
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
const blizko = (a, b, tol = 0.002) => typeof a === 'number' && Math.abs(a - b) <= tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    // Spodek a vrch rámu otvoru ve scéně nad kótou jeho podlaží
    const vysky = () => p.vyhodnot(`(() => { const d = ${D}; const _3d = window._kk3d; const THREE = window.THREE; const out = {}; const y0 = _3d.wallGroup.position.y;
        for (const [id, g] of _3d.podlaziSkupiny) { for (const skupina of g.children) { if (!skupina.isGroup) continue; const b = new THREE.Box3().setFromObject(skupina); const c = b.getCenter(new THREE.Vector3()); const kota = g.position.y;
            const klic = id + ':' + Math.round(c.x * 10) / 10 + ':' + Math.round(c.z * 10) / 10; out[klic] = [+(b.min.y - y0 - kota).toFixed(3), +(b.max.y - y0 - kota).toFixed(3)]; } }
        return out; })()`);
    const cekej3d = () => pauza(400);
    // Průměrná barva kolem bodu scény, jak ji opravdu vykreslí prohlížeč
    const BARVA_BODU = `(sc, x, y, z) => { sc.renderer.render(sc.scene, sc.camera); const c = sc.renderer.domElement; const v = new THREE.Vector3(x, y, z).project(sc.camera); const px = (v.x + 1) / 2 * c.width, py = (1 - v.y) / 2 * c.height; const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d'); g.drawImage(c, 0, 0); const d = g.getImageData(Math.round(px) - 6, Math.round(py) - 6, 13, 13).data; let r = 0, gr = 0, b = 0; const n = d.length / 4; for (let i = 0; i < d.length; i += 4) { r += d[i]; gr += d[i + 1]; b += d[i + 2]; } return [Math.round(r / n), Math.round(gr / n), Math.round(b / n)]; }`;
    const POHLED_SHORA = `const _3d = window._kk3d; _3d.camera.position.set(4, 30, 4.01); _3d.controls.target.set(4, 0, 4); _3d.camera.zoom = 0.4; _3d.camera.updateProjectionMatrix(); _3d.controls.update();`;

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
            body: JSON.stringify({ nazev: 'ClaudeTest nula otvoru ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům: levá místnost, pravá místnost, okna a dveře, patro');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const s = e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); const j = e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            const stred = e.addWall(5*X, 0, 5*X, 8*X, 0.15, 'pricka');
            d.podlaziKopie = true; d.pridatPodlazi('nahoru');
            const s2 = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y) < 1 && Math.abs(b.y) < 1; });
            e.addOpening(s2.id, 1.4, 1.2, 'okno', { presnaSirka: true });
            d.renderer.render(); d.naPodlazi('P1');
            const naStene = (fn) => [...e.walls.values()].find(w => fn(e.nodes.get(w.nodeA), e.nodes.get(w.nodeB)));
            const sever = (x) => naStene((a, b) => Math.abs(a.y) < 1 && Math.abs(b.y) < 1 && Math.min(a.x, b.x) < x * X && Math.max(a.x, b.x) > x * X);
            const jih = (x) => naStene((a, b) => Math.abs(a.y - 8 * X) < 1 && Math.abs(b.y - 8 * X) < 1 && Math.min(a.x, b.x) < x * X && Math.max(a.x, b.x) > x * X);
            const pos = (w, x) => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(x * X - a.x) / X; };
            const w1 = sever(2); e.addOpening(w1.id, pos(w1, 1.4), 1.2, 'okno', { presnaSirka: true });
            const w2 = sever(7); e.addOpening(w2.id, pos(w2, 6.4), 1.2, 'okno', { presnaSirka: true });
            const w3 = jih(2); e.addOpening(w3.id, pos(w3, 2.45), 0.9, 'dvere', { presnaSirka: true });
            const w4 = jih(7); e.addOpening(w4.id, pos(w4, 7.45), 0.9, 'dvere', { presnaSirka: true });
            e.addOpening(stred.id, 3.55, 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 700, y: 6 }; d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(1500);
        const stena = await p.vyhodnot(`(() => { const d = ${D}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; return m.id; })()`);
        await p.vyhodnot(`(async () => { const d = ${D}; await d.prepni3d(); await new Promise(r => setTimeout(r, 600)); return true; })()`);
        let v = await vysky();
        const najdi = (o, id, x, z) => { const k = Object.keys(o).find(n => { const [i, a, b] = n.split(':'); return i === id && Math.abs(a - x) < 0.3 && Math.abs(b - z) < 0.3; }); return k ? o[k] : null; };
        const okL = () => najdi(v, 'P1', 2, 0), okP = () => najdi(v, 'P1', 7, 0), dvL = () => najdi(v, 'P1', 2, 8), dvP = () => najdi(v, 'P1', 7, 8), dvS = () => najdi(v, 'P1', 5, 4), okH = () => najdi(v, 'P2', 2, 0);
        kontrola('bez zvýšení okna od 90 cm, dveře od podlaží', blizko(okL()?.[0], 0.9) && blizko(okP()?.[0], 0.9) && blizko(dvL()?.[0], 0) && blizko(dvS()?.[0], 0) && blizko(okH()?.[0], 0.9), JSON.stringify({ okL: okL(), okP: okP(), dvL: dvL(), dvS: dvS(), okH: okH(), klice: Object.keys(v) }));

        console.log('\n2) Zvýšená levá místnost o 30 cm');
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('typ', 'zvysena'); d.setMistnostUroven('dh', 0.3); return true; })()`);
        await cekej3d();
        v = await vysky();
        kontrola('okno a vchodové dveře zvýšené místnosti jdou nahoru o stejnou výšku', blizko(okL()?.[0], 1.2) && blizko(okL()?.[1], 2.4) && blizko(dvL()?.[0], 0.3) && blizko(dvL()?.[1], 2.4), JSON.stringify({ okL: okL(), dvL: dvL() }));
        kontrola('pravá místnost beze změny, scéna se přestavěla bez přepnutí', blizko(okP()?.[0], 0.9) && blizko(dvP()?.[0], 0), JSON.stringify({ okP: okP(), dvP: dvP() }));
        kontrola('dveře mezi místnostmi od vyšší podlahy', blizko(dvS()?.[0], 0.3), JSON.stringify(dvS()));
        kontrola('přenesené zvýšení platí i pro okno v patře', blizko(okH()?.[0], 1.2), JSON.stringify(okH()));
        const ulozene = await p.vyhodnot(`(() => { const e = ${D}.engine; return [...e.openings.values()].map(o => ({ typ: o.typ, parapet: o.parapet ?? null, vyska: o.vyska ?? null })); })()`);
        kontrola('zadané hodnoty otvorů se nemění, posouvá se jen nula', ulozene.every(o => o.parapet === null && o.vyska === null), JSON.stringify(ulozene));
        await p.vyhodnot(`(() => { const d = ${D}; d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); const _3d = window._kk3d; _3d.camera.position.set(-6, 14, 22); _3d.controls.target.set(4, 1, 4); _3d.camera.zoom = 1.4; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
        await pauza(500);
        await p.snimek(path.join(vystup, 'nula-zvysena.png'));

        console.log('\n2b) Dekor na zvýšené podlaze');
        const PODLAHY = `(id) => { const _3d = window._kk3d; const g = _3d.podlaziSkupiny.get(id); return g.children.filter(o => o.isMesh && o.geometry.getAttribute('uv') && !Array.isArray(o.material)).map(o => { const b = new THREE.Box3(); o.geometry.computeBoundingBox(); return { y: +o.geometry.boundingBox.min.y.toFixed(3), x: [+o.geometry.boundingBox.min.x.toFixed(1), +o.geometry.boundingBox.max.x.toFixed(1)], z: [+o.geometry.boundingBox.min.z.toFixed(1), +o.geometry.boundingBox.max.z.toFixed(1)], mistnost: o.userData.podlaha || null, textura: !!o.material.map, barva: '#' + o.material.color.getHexString() }; }); }`;
        await p.vyhodnot(`(() => { const d = ${D}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d.setMistnostPodlaha({ dekor: 'prkna' }); return true; })()`);
        await cekej3d();
        const dekor = await p.vyhodnot(`(() => { const d = ${D}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); const f = ${PODLAHY}; const vse = f('P1'); return { vlastni: vse.filter(x => x.mistnost === m.id), ostatni: vse.filter(x => x.mistnost !== m.id), patro: f('P2') }; })()`);
        kontrola('dekor zvýšené místnosti je ve výšce zvýšení a vidět nad deskou (deska končí na 0,30)', dekor.vlastni.length === 1 && blizko(dekor.vlastni[0].y, 0.325) && dekor.vlastni[0].textura, JSON.stringify(dekor.vlastni));
        kontrola('podlaha vedlejší místnosti zůstává dole', dekor.ostatni.length > 0 && dekor.ostatni.every(x => blizko(x.y, 0.025)), JSON.stringify(dekor.ostatni));
        kontrola('v patře se podlaha nad přeneseným zvýšením zvedne, zbytek ne', dekor.patro.some(x => blizko(x.y, 0.325) && x.x[1] < 5.2) && dekor.patro.some(x => blizko(x.y, 0.025) && x.x[1] > 6), JSON.stringify(dekor.patro));
        await p.vyhodnot(`(() => { const d = ${D}; d.nahledBarvy3d('podlaha:' + d.engine.mistnosti.find(m => m.kotva.x < 400).id, '#112233'); return true; })()`);
        const nahled = await p.vyhodnot(`(() => { const d = ${D}; const f = ${PODLAHY}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); const b = f('P1').find(x => x.mistnost === m.id).barva; d._nastavBarvy3d(); return b; })()`);
        kontrola('náhled barvy podlahy platí i na zvýšené', nahled === '#112233', nahled);
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const m = e.mistnosti.find(m => m.kotva.x < 400); e.dum.schodiste.push({ id: 'S1', odPodlazi: 'P1', doPodlazi: 'P2', tvar: 'prime', x: 1, y: -3, uhel: 0, sirka: 1, strana: 1 }); d._poZmeneDomu('Schody'); return true; })()`);
        await cekej3d();
        const nadSchody = await p.vyhodnot(`(() => { const d = ${D}; const f = ${PODLAHY}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); return f('P1').filter(x => x.mistnost === m.id); })()`);
        kontrola('kudy vedou schody, tam dekor není nahoře, ale dole', nadSchody.some(x => blizko(x.y, 0.025)) && nadSchody.some(x => blizko(x.y, 0.325)), JSON.stringify(nadSchody));
        await p.snimek(path.join(vystup, 'dekor-zvysena.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.dum.schodiste = []; d._poZmeneDomu('Bez schodů'); return true; })()`);
        await cekej3d();

        console.log('\n3) Vypnutý přenos, snížená místnost, ořez, Zpět');
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('prenos', false); return true; })()`);
        await cekej3d();
        v = await vysky();
        kontrola('bez přenosu okno v patře zůstává od podlaží', blizko(okH()?.[0], 0.9) && blizko(okL()?.[0], 1.2), JSON.stringify({ okH: okH(), okL: okL() }));
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('prenos', true); d.setMistnostUroven('typ', 'snizena'); d.setMistnostUroven('dh', 0.2); return true; })()`);
        await cekej3d();
        v = await vysky();
        kontrola('snížená: okno i vchodové dveře klesnou, venek se nepočítá', blizko(okL()?.[0], 0.7) && blizko(dvL()?.[0], -0.2), JSON.stringify({ okL: okL(), dvL: dvL() }));
        kontrola('snížená: dveře mezi místnostmi od vyšší podlahy, tedy beze změny', blizko(dvS()?.[0], 0), JSON.stringify(dvS()));
        // Paprsek skrz viditelnou scénu: co je první v cestě
        const PAPRSEK = `(ox, oy, oz, dx, dy, dz) => { const _3d = window._kk3d; _3d.wallGroup.updateMatrixWorld(true); const r = new THREE.Raycaster(new THREE.Vector3(ox, oy, oz), new THREE.Vector3(dx, dy, dz)); const videt = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; }; const h = r.intersectObject(_3d.wallGroup, true).find(x => videt(x.object)); return h ? { x: +h.point.x.toFixed(3), y: +(h.point.y - _3d.wallGroup.position.y).toFixed(3), z: +h.point.z.toFixed(3), vOtvoru: !!(h.object.parent && h.object.parent.isGroup && !h.object.parent.userData.podlazi && h.object.parent !== _3d.dumSkupina) } : null; }`;
        const dira = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; const y = window._kk3d.wallGroup.position.y; const desky = window._kk3d.dumSkupina.children.filter(o => o.geometry?.parameters?.shapes?.holes?.length).length;
            return { stred: f(2.5, y + 10, 4, 0, -1, 0), uSteny: f(0.17, y + 10, 4, 0, -1, 0), uPricky: f(4.91, y + 10, 4, 0, -1, 0), vedle: f(7.5, y + 10, 4, 0, -1, 0), desky,
                kVnejsiZdi: f(2.5, y - 0.1, 4, -1, 0, 0), kPricce: f(2.5, y - 0.1, 4, 1, 0, 0), podOknem: f(2, y - 0.1, 4, 0, 0, -1), kDverim: f(2, y - 0.1, 4, 0, 0, 1) }; })()`);
        kontrola('snížená podlaha leží dole i s dekorem, bez okraje u zdí, vedlejší místnost nahoře', blizko(dira.stred?.y, -0.175) && blizko(dira.uSteny?.y, -0.175) && blizko(dira.uPricky?.y, -0.175) && blizko(dira.vedle?.y, 0.025), JSON.stringify(dira));
        kontrola('pod úrovní podlaží je kolem snížené místnosti zeď, žádná mezera', blizko(dira.kVnejsiZdi?.x, 0.15, 0.03) && blizko(dira.kPricce?.x, 4.925, 0.03) && blizko(dira.podOknem?.z, 0.15, 0.03), JSON.stringify({ a: dira.kVnejsiZdi, b: dira.kPricce, c: dira.podOknem }));
        kontrola('vchodové dveře jdou až na sníženou podlahu, stěna jim nepřekáží', dira.kDverim?.vOtvoru && dira.kDverim.z > 7.9, JSON.stringify(dira.kDverim));
        const barvy = await p.vyhodnot(`(async () => { const d = ${D}; d.setMistnostPodlaha({ dekor: 'hladka', barva: '#884422' }); await new Promise(r => setTimeout(r, 400)); ${POHLED_SHORA} const f = ${BARVA_BODU}; const sc = { renderer: _3d.renderer, scene: _3d.scene, camera: _3d.camera }; const y0 = _3d.wallGroup.position.y; const out = { podlaha: f(sc, 2.5, y0 - 0.175, 4), venku: f(sc, 10.8, 0, 4) }; d.setMistnostPodlaha({ dekor: 'prkna', barva: null }); return out; })()`);
        kontrola('na obrazovce je opravdu snížená podlaha, ne zem nad ní; venku zem zůstává', barvy.podlaha[0] > barvy.podlaha[1] + 30 && barvy.venku[1] > barvy.venku[0], JSON.stringify(barvy));
        await p.vyhodnot(`(() => { const d = ${D}; const _3d = window._kk3d; _3d.camera.position.set(-6, 14, 22); _3d.controls.target.set(4, 0.5, 4); _3d.camera.zoom = 1.4; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); d.setMistnostPodlaha({ dekor: 'dlazba30' }); return true; })()`);
        await cekej3d();
        await p.snimek(path.join(vystup, 'snizena-3d.png'));
        const schodyDolu = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; d.schodkyNaPlochu(e.dum.plochy[0].id); await new Promise(r => setTimeout(r, 500)); const s = e.dum.schodiste[e.dum.schodiste.length - 1]; const meshe = window._kk3d.dumSkupina.children.filter(o => o.userData.schody === s.id); const b = new THREE.Box3(); meshe.forEach(m => b.expandByObject(m)); const y0 = window._kk3d.wallGroup.position.y; const out = { meshu: meshe.length, min: +(b.min.y - y0).toFixed(3), max: +(b.max.y - y0).toFixed(3), plocha: s.plocha }; e.dum.schodiste = e.dum.schodiste.filter(x => x !== s); d.renderer.setSelection([], [], [], [], [], [], [e.mistnosti.find(m => m.kotva.x < 400).id]); d._poZmeneDomu('Bez schodů'); return out; })()`);
        kontrola('schody ze snížené místnosti začínají na její podlaze a nepřesáhnou podlaží', schodyDolu.meshu > 0 && blizko(schodyDolu.min, -0.2, 0.01) && schodyDolu.max <= 0.001, JSON.stringify(schodyDolu));
        await cekej3d();
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('typ', 'zvysena'); d.setMistnostUroven('dh', 1.0); return true; })()`);
        await cekej3d();
        v = await vysky();
        const strop = await p.vyhodnot(`${D}.engine.svetlaVyska(${D}.engine.podlaziPodleId('P1'))`);
        kontrola('vysoké zvýšení: otvor nepřeroste stěnu', okL() && okL()[1] <= strop + 0.001 && blizko(okL()[0], 1.9), JSON.stringify({ okL: okL(), strop }));

        const panel = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const cek = () => new Promise(r => setTimeout(r, 250)); d.setMistnostUroven('dh', 0.3); await cek(); const vyber = (fn) => { const o = [...e.openings.values()].find(fn); d.renderer.setSelection([], [], [o.id]); d._selectionTick++; return o; };
            const naX = (o) => { const w = e.walls.get(o.wallId), a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); const L = Math.hypot(b.x - a.x, b.y - a.y); return (a.x + (b.x - a.x) / L * (o.pozice + o.sirka / 2) * 80) / 80; };
            vyber(o => o.typ === 'okno' && naX(o) < 4); await cek(); const leve = document.querySelector('[data-nula-otvoru]')?.innerText; const hodnota = d.inspector.nulaOtvoru;
            vyber(o => o.typ === 'okno' && naX(o) > 6); await cek(); const prave = document.querySelector('[data-nula-otvoru]')?.innerText ?? null;
            d.renderer.clearSelection(); d._selectionTick++; return { leve, prave, hodnota }; })()`);
        kontrola('panel okna řekne, od čeho se měří; v běžné místnosti nic', /\+30 cm/.test(panel.leve || '') && panel.prave === null && blizko(panel.hodnota, 0.3), JSON.stringify(panel));
        await p.vyhodnot(`(() => { const d = ${D}; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d.setMistnostUroven('typ', 'bezna'); d.renderer.clearSelection(); return true; })()`);
        await cekej3d();
        v = await vysky();
        const bezDiry = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; const y = window._kk3d.wallGroup.position.y; return { desky: window._kk3d.dumSkupina.children.filter(o => o.geometry?.parameters?.shapes?.holes?.length).length, stred: f(2.5, y + 10, 4, 0, -1, 0) }; })()`);
        kontrola('běžná podlaha zase bez díry v desce', bezDiry.desky === 0 && blizko(bezDiry.stred?.y, 0.025), JSON.stringify(bezDiry));
        kontrola('běžná podlaha vrátí otvory na podlaží', blizko(okL()?.[0], 0.9) && blizko(dvS()?.[0], 0) && blizko(okH()?.[0], 0.9), JSON.stringify({ okL: okL(), dvS: dvS(), okH: okH() }));
        void stena;

        console.log('\n4) Snížená místnost na odkazu');
        const odkaz = await p.vyhodnot(`(async () => { const d = ${D}; d.nastroj = 'vyber'; const m = d.engine.mistnosti.find(m => m.kotva.x < 400); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d.setMistnostUroven('typ', 'snizena'); d.setMistnostUroven('dh', 0.2); d.setMistnostPodlaha({ dekor: 'hladka', barva: '#884422' }); await new Promise(r => setTimeout(r, 400)); const model = await d._ve3d(async () => d._zapecModel()); await d.sdileniUloz(); return { url: d.sdileni.url, diry: model.diry.length, cesta: new URL(d.sdileni.url).pathname }; })()`);
        kontrola('model nese díru pro sníženou místnost', odkaz.diry === 1, JSON.stringify(odkaz.diry));
        const urlEditoru = await p.vyhodnot('location.href');
        await p.jdiNa(ZAKLAD + odkaz.cesta);
        await p.cekej(`!!window.__sdileniScena`, 20000, 'prohlížeč odkazu');
        await pauza(500);
        const naOdkazu = await p.vyhodnot(`(() => { const sc = window.__sdileniScena; for (const id of ['strecha', 'P2']) { if (sc.skupiny.get(id)) sc.skupiny.get(id).visible = false; } sc.camera.position.set(4, 30, 4.01); sc.camera.lookAt(4, 0, 4); sc.camera.updateMatrixWorld(); sc.camera.updateProjectionMatrix(); const f = ${BARVA_BODU}; return { podlaha: f(sc, 2.5, -0.175, 4), venku: f(sc, 14, -0.16, 4) }; })()`);
        kontrola('i na odkazu je vidět snížená podlaha, ne zem', naOdkazu.podlaha[0] > naOdkazu.podlaha[1] + 30 && naOdkazu.venku[1] > naOdkazu.venku[0], JSON.stringify(naOdkazu));
        await p.jdiNa(urlEditoru);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor');
        await p.vyhodnot(`(async () => { const d = ${D}; const c = window.confirm; window.confirm = () => true; await d.nactiSdileni(); await d.sdileniVypni(); window.confirm = c; return true; })()`);

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));

        // Úklid: testovací koncept po sobě smazat
        await p.vyhodnot(`(async () => { const d = ${D}; await fetch(_kkInitData.routes.indexK + '/' + d.projektId, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' } }); return true; })()`);
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
