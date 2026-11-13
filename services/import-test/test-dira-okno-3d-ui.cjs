/**
 * 3D kolem děr v deskách:
 *  - díra v podlaze patra má bok přes celou tloušťku stropu v barvě zdi (dřív se boky děr nekreslily),
 *  - nízká zídka na hraně díry navazuje na bok,
 *  - okno snížené místnosti pod úrovní podlaží: deska ustoupí, venku ho pod terénem kryje zem (světlík se nedělá),
 *  - okno patra klesající přes strop: ustoupí i stěna podlaží pod ním.
 *
 * Spuštění: node services/import-test/test-dira-okno-3d-ui.cjs [složka snímků]
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

// Barva bodu scény, jak ji opravdu vykreslí prohlížeč
const BARVA = `(x, y, z) => { const _3d = window._kk3d; _3d.renderer.render(_3d.scene, _3d.camera); const c = _3d.renderer.domElement; const v = new THREE.Vector3(x, y, z).project(_3d.camera); const px = (v.x + 1) / 2 * c.width, py = (1 - v.y) / 2 * c.height; const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const g = t.getContext('2d'); g.drawImage(c, 0, 0); const d = g.getImageData(Math.round(px) - 1, Math.round(py) - 1, 3, 3).data; return [d[16], d[17], d[18]]; }`;
// První neprůhledný objekt na paprsku
const PAPRSEK = `(od, smer, delka = 30) => { const _3d = window._kk3d; _3d.scene.updateMatrixWorld(true); const r = new THREE.Raycaster(new THREE.Vector3(...od), new THREE.Vector3(...smer).normalize(), 0.001, delka); const koren = _3d.wallGroup; const zasahy = r.intersectObject(koren, true).filter(z => { let o = z.object; while (o) { if (o.visible === false) return false; o = o.parent; } const m = Array.isArray(z.object.material) ? z.object.material[z.face.materialIndex] : z.object.material; return !m.transparent; }); const z = zasahy[0]; if (!z) return null; const m = Array.isArray(z.object.material) ? z.object.material[z.face.materialIndex] : z.object.material; return { d: +z.distance.toFixed(2), ud: z.object.userData, y: +z.point.y.toFixed(2), x: +z.point.x.toFixed(3), barva: m.color.getHexString() }; }`;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const pohled = async (x, y, z, tx, ty, tz, zoom) => { await p.vyhodnot(`(() => { const _3d = window._kk3d; _3d.camera.position.set(${x}, ${y}, ${z}); _3d.controls.target.set(${tx}, ${ty}, ${tz}); _3d.camera.zoom = ${zoom}; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`); await pauza(400); };
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
            body: JSON.stringify({ nazev: 'ClaudeTest díra a okno ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Díra v podlaze patra, ohraničená oddělovačem');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            d.renderer.render(); await new Promise(r => setTimeout(r, 300));
            d.podlaziKopie = true; d.pridatPodlazi('nahoru'); d.renderer.render(); await new Promise(r => setTimeout(r, 400));
            const u1 = e.najdiUchytOddelovace(6*X, 0.15*X, 0.5*X), u2 = e.najdiUchytOddelovace(6*X, 7.85*X, 0.5*X);
            e.addOddelovac({ x: u1.bod.x, y: u1.bod.y, host: u1.host }, { x: u2.bod.x, y: u2.bod.y, host: u2.host });
            d.renderer.render(); await new Promise(r => setTimeout(r, 400));
            const m = e.mistnosti.slice().sort((a, b) => b.kotva.x - a.kotva.x)[0];
            d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; d.setMistnostUroven('typ', 'bez_podlahy');
            d.naPodlazi('P1'); d.renderer.render(); await new Promise(r => setTimeout(r, 400));
            const m1 = e.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m1.id]); d.setMistnostPodlaha({ dekor: 'hladka', barva: '#cc2222' });
            d.renderer.clearSelection(); d.panelOtvoruPoz = { x: 500, y: 640 };
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); d.zobrazStrechu3d = false; d._nastavViditelnost3d();
            const _3d = window._kk3d; for (const [id, g] of _3d.podlaziSkupiny) g.traverse(o => { if (!o.isMesh || !o.geometry) return; o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; if (b.min.x > 9 || b.min.z > 7.5) o.visible = false; });
            return true; })()`);
        await pohled(26, 12, 22, 6, 3, 4, 3.4);
        const bok = await p.vyhodnot(`(() => { const f = ${BARVA}; const out = {}; for (const y of [3.03, 2.98, 2.92, 2.86, 2.82]) out[y] = f(6.02, y, 4); return out; })()`);
        const barvyBoku = Object.values(bok);
        kontrola('bok díry má přes celých 25 cm jednu barvu', barvyBoku.every(c => Math.abs(c[0] - barvyBoku[0][0]) < 3 && c[0] > 120), JSON.stringify(bok));
        const skrz = await p.vyhodnot(`(() => { const f = ${BARVA}; return { pod: f(6.02, 2.7, 4), nad: f(6.02, 3.1, 4) }; })()`);
        // Do 8 odstínů: obloha je z jedné strany jasnější (svetlo-3d.js, 13. 11. 2026) a bok a zeď mohou hledět na jiné strany
        kontrola('bok má stejný odstín jako bílá zeď pod deskou', Math.abs(skrz.pod[0] - barvyBoku[0][0]) < 8, JSON.stringify(skrz));
        await p.snimek(path.join(vystup, 'dira-bok.png'));
        const uvnitr = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; return f([8, 2.92, 4], [-1, 0, 0]); })()`);
        kontrola('paprsek z díry narazí na desku na její hraně, bok má barvu vnitřní zdi', uvnitr && Math.abs(uvnitr.d - 1.98) < 0.05 && uvnitr.ud.stropPod === 'P1' && uvnitr.barva === 'ffffff', JSON.stringify(uvnitr));

        console.log('\n2) Okno snížené místnosti v 1.NP pod úrovní podlaží');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.prepni2d(); await new Promise(r => setTimeout(r, 400));
            e.dum.plochy = e.dum.plochy.filter(a => a.typ !== 'bez_podlahy'); [...e.oddelovace.keys()].forEach(() => {}); d.naPodlazi('P1'); d.renderer.render(); await new Promise(r => setTimeout(r, 300));
            const w = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y) < 1 && Math.abs(b.y) < 1; });
            const a = e.nodes.get(w.nodeA); e.addOpening(w.id, Math.abs(1.4*X - a.x)/X, 1.2, 'okno', { presnaSirka: true }); d.renderer.render(); await new Promise(r => setTimeout(r, 300));
            const m = e.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; d.setMistnostUroven('typ', 'snizena'); d.setMistnostUroven('dh', 1.2);
            d.renderer.clearSelection();
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true; })()`);
        await pauza(400);
        const info = await p.vyhodnot(`(() => { const d = ${D}; return { otvory: d._otvoryPodUrovni().map(v => [v.od, v.do]), diry: d._dirySnizeni().length, svetliky: window._kk3d.dumSkupina.children.filter(o => o.userData.svetlik).length }; })()`);
        kontrola('okno od −0,30 m se pozná jako pod úrovní, díra je jen pro místnost, světlík žádný', info.otvory.length === 1 && Math.abs(info.otvory[0][0] + 0.3) < 0.01 && info.diry === 1 && info.svetliky === 0, JSON.stringify(info));
        const zevnitr = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; const out = {}; for (const y of [0.0, -0.05, -0.1, -0.15]) out[y] = f([2, y, 3], [0, 0, -1]); return out; })()`);
        kontrola('zevnitř skrz okno není deska v žádné výšce, cesta je volná', Object.values(zevnitr).every(z => z === null), JSON.stringify(zevnitr));
        const vedle = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; return f([4.5, -0.05, 3], [0, 0, -1]); })()`);
        kontrola('vedle okna deska i stěna zůstávají', vedle && vedle.d < 3, JSON.stringify(vedle));
        await pohled(-2, 6, -18, 2, 0, 0, 3);
        await p.snimek(path.join(vystup, 'okno-pod-terenem-zvenku.png'));
        const zem = await p.vyhodnot(`(() => { const f = ${BARVA}; const _3d = window._kk3d; _3d.camera.position.set(2, 30, -0.45); _3d.controls.target.set(2, 0, -0.46); _3d.camera.zoom = 2; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return { predOknem: f(2, 0, -0.5), vedle: f(3.5, 0, -0.5) }; })()`);
        const zelena = (c) => c[1] > c[0] + 2 && c[1] > c[2] + 2;
        kontrola('před oknem i vedle něj je země, jáma nevzniká', zelena(zem.predOknem) && zelena(zem.vedle), JSON.stringify(zem));
        await pohled(3, 7, 12, 2, 0, 0, 2.6);
        await p.snimek(path.join(vystup, 'okno-pod-terenem-zevnitr.png'));

        console.log('\n3) Okno patra klesá přes strop');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.prepni2d(); await new Promise(r => setTimeout(r, 300));
            e.dum.plochy = []; d.naPodlazi('P2'); d.renderer.render(); await new Promise(r => setTimeout(r, 400));
            const w = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y) < 1 && Math.abs(b.y) < 1; });
            const a = e.nodes.get(w.nodeA); e.addOpening(w.id, Math.abs(4.4*X - a.x)/X, 1.2, 'okno', { presnaSirka: true }); d.renderer.render(); await new Promise(r => setTimeout(r, 300));
            const m = e.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; d.setMistnostUroven('typ', 'snizena'); d.setMistnostUroven('dh', 1.5);
            d.renderer.clearSelection();
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); d.skryte3d = []; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true; })()`);
        await pauza(400);
        const patro = await p.vyhodnot(`(() => { const d = ${D}; return { otvory: d._otvoryPodUrovni().map(v => [v.podlazi, +v.od.toFixed(2)]) }; })()`);
        kontrola('okno patra sahá na 2,45 m', patro.otvory.length === 1 && patro.otvory[0][0] === 'P2' && Math.abs(patro.otvory[0][1] - 2.45) < 0.01, JSON.stringify(patro));
        const strop = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; return { deska: f([5, 2.92, 3], [0, 0, -1], 3.5), stenaDole: f([5, 2.65, 3], [0, 0, -1], 3.5), podOknem: f([5, 2.35, 3], [0, 0, -1], 3.5), vedle: f([8, 2.92, 3], [0, 0, -1], 3.5) }; })()`);
        kontrola('skrz strop i horní kus stěny spodního podlaží je volno, pod oknem stěna, vedle okna deska', !strop.deska && !strop.stenaDole && strop.podOknem && strop.vedle, JSON.stringify(strop));

        console.log('\n4) Nízká zídka na hraně díry v patře');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.prepni2d(); await new Promise(r => setTimeout(r, 300));
            e.dum.plochy = []; d.naPodlazi('P2'); d.renderer.render(); await new Promise(r => setTimeout(r, 300));
            for (const id of [...e.openings.keys()]) e.removeOpening(id);
            for (const id of [...e.oddelovace.keys()]) e.removeOddelovac(id);
            const w = e.addWall(7*X, 0, 7*X, 8*X, 0.15, 'pricka'); w.vyska = 1; d.renderer.render(); await new Promise(r => setTimeout(r, 400));
            const m = e.mistnosti.slice().sort((a, b) => b.kotva.x - a.kotva.x)[0];
            d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; d.setMistnostUroven('typ', 'bez_podlahy'); d.renderer.clearSelection();
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); d.skryte3d = []; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true; })()`);
        await pauza(400);
        const zidka = await p.vyhodnot(`(() => { const f = ${PAPRSEK}; return { zed: f([9, 3.5, 4], [-1, 0, 0]), bok: f([9, 2.92, 4], [-1, 0, 0]), podZidkou: f([9, 2.5, 4], [-1, 0, 0]) }; })()`);
        const prah = Math.abs((zidka.zed?.x ?? 99) - (zidka.bok?.x ?? -99));
        kontrola('líc zídky a bok díry leží v jedné rovině (do 3 cm) a mají stejnou barvu', prah < 0.03 && zidka.zed?.barva === zidka.bok?.barva, JSON.stringify({ prah: +prah.toFixed(3), zidka }));
        await pohled(26, 12, 22, 7, 3, 4, 3);
        await p.snimek(path.join(vystup, 'dira-zidka.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); return true; })()`);

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));

        // Úklid: testovací koncept po sobě smazat
        await p.vyhodnot(`(async () => { const d = ${D}; await fetch(_kkInitData.routes.indexK + '/' + d.projektId, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' } }); return true; })()`);
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
