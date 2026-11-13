/**
 * Líce domu ve 3D (Libor 12. 11. 2026, Klemov kopie ze severu): u přístavku na fasádě nesmí zůstat bílý pruh,
 * ostění okna vedle přístavku je fasádou, milimetrový rozdíl líců dvou podlaží nedělá tmavou čáru (lem desky)
 * a dveře mají kliku. Ukládá snímky k prohlídce.
 *
 * Spuštění: node services/import-test/test-lice-3d-ui.cjs [složka snímků]
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

// Plocha a její materiál v bodě paprsku (scéna v metrech, y nad ±0 domu)
const ZASAH = `(od, smer) => { const _3d = window._kk3d, y0 = _3d.wallGroup.position.y; const ray = new THREE.Raycaster(new THREE.Vector3(od[0], od[1] + y0, od[2]), new THREE.Vector3(...smer).normalize());
    const vid = (o) => { for (; o; o = o.parent) if (!o.visible) return false; return true; };
    const h = ray.intersectObject(_3d.wallGroup, true).find(z => vid(z.object)); if (!h) return null;
    const m = [].concat(h.object.material)[h.face.materialIndex ?? 0] || [].concat(h.object.material)[0];
    return { klic: m.userData?.barva || null, barva: m.color.getHexString(), bod: [h.point.x, h.point.y - y0, h.point.z].map(v => +v.toFixed(3)) }; }`;

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'lice-3d');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const snimek3d = async (jmeno) => {
        await pauza(700);
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
            body: JSON.stringify({ nazev: 'ClaudeTest lice 3D ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům 10 × 8 m, na severu přístavek 4 × 3 m, okno vedle něj, dveře na jihu');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const sever = e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); const jih = e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            e.addWall(6*X, 0, 6*X, -3*X, 0.3, 'obvodova'); e.addWall(6*X, -3*X, 10*X, -3*X, 0.3, 'obvodova'); e.addWall(10*X, -3*X, 10*X, 0, 0.3, 'obvodova');
            const s = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y) < 1 && Math.abs(b.y) < 1 && Math.min(a.x, b.x) < 1; });
            const a = e.nodes.get(s.nodeA); e.addOpening(s.id, Math.abs(3 * X - a.x) / X - (a.x > 4 * X ? 2 : 0), 2, 'okno', { presnaSirka: true });
            const j = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.y - 8 * X) < 1 && Math.abs(b.y - 8 * X) < 1; });
            const aj = e.nodes.get(j.nodeA); e.addOpening(j.id, Math.abs(2 * X - aj.x) / X - (aj.x > 5 * X ? 0.9 : 0), 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Dům');
            await d.prepni3d(); await new Promise(r => setTimeout(r, 1200)); return true; })()`);
        const okno = await p.vyhodnot(`(() => { const o = [...${D}.engine.openings.values()].find(o => o.typ === 'okno'); return { pozice: o.pozice, sirka: o.sirka }; })()`);

        console.log('\n2) Fasáda u přístavku a ostění okna');
        // Severní líc zdi je v z = −0,15; přístavek má západní zeď v x = 6 (líc 5,85). Těsně vedle ní musí být fasáda.
        const uPristavku = [];
        for (const x of [5.7, 5.75, 5.8, 5.83]) uPristavku.push(await p.vyhodnot(`(${ZASAH})([${x}, 1.5, -2], [0, 0, 1])`));
        kontrola('líc zdi těsně vedle přístavku je fasáda (dřív bílý pruh)', uPristavku.every(z => z && z.klic === 'fasada' && Math.abs(z.bod[2] + 0.15) < 0.01), JSON.stringify(uPristavku));
        // Ostění: okno x 3–5, paprsek otvorem podél zdi ve vnější půlce narazí na východní ostění v x = 5
        const osteni = await p.vyhodnot(`(${ZASAH})([4, 1.5, -0.08], [1, 0, 0])`);
        kontrola('vnější půlka ostění u přístavku je fasáda (dřív bílá)', osteni && osteni.klic === 'fasada' && Math.abs(osteni.bod[0] - 5) < 0.02, JSON.stringify(osteni));
        const vnitrniOsteni = await p.vyhodnot(`(${ZASAH})([4, 1.5, 0.08], [1, 0, 0])`);
        kontrola('vnitřní půlka ostění zůstává bílá', vnitrniOsteni && vnitrniOsteni.klic !== 'fasada' && vnitrniOsteni.barva === 'ffffff', JSON.stringify(vnitrniOsteni));
        const vPristavku = await p.vyhodnot(`(${ZASAH})([8, 1.5, -1.5], [0, 0, 1])`);
        kontrola('líc zdi uvnitř přístavku je bílý', vPristavku && vPristavku.klic !== 'fasada', JSON.stringify(vPristavku));
        await p.vyhodnot(`(() => { const _3d = window._kk3d; _3d.controls.target.set(5, 1.5, 0); _3d.camera.position.set(-4, 7, -16); _3d.camera.zoom = 2.2; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.kresliDo = performance.now() + 800; return true; })()`);
        await snimek3d('01-pristavek.png');

        console.log('\n3) Kliky');
        const kliky = await p.vyhodnot(`(() => { const _3d = window._kk3d, g = _3d.podlaziSkupiny.get('P1'); const m = []; g.traverse(o => { if (o.userData?.klika && o.material.metalness > 0.5) m.push(o); });   // jen stříbrné kliky dveří, okno má svou
            const b = new THREE.Box3(); m.forEach(o => b.expandByObject(o)); const y0 = _3d.wallGroup.position.y;
            return { pocet: m.length, kov: m[0]?.material.metalness, vyska: +((b.min.y + b.max.y) / 2 - y0).toFixed(2), x: [+b.min.x.toFixed(2), +b.max.x.toFixed(2)], z: [+b.min.z.toFixed(2), +b.max.z.toFixed(2)] }; })()`);
        // Dveře x 2,0–2,9 na jižní zdi (z = 8): klika na obou stranách u jedné hrany, kolem výšky 1 m
        kontrola('dveře mají stříbrnou kliku na obou stranách křídla u volné hrany', kliky.pocet === 6 && kliky.kov > 0.5 && kliky.vyska > 0.9 && kliky.vyska < 1.1
            && kliky.x[0] > 1.95 && kliky.x[1] < 2.95 && (kliky.x[0] > 2.5 || kliky.x[1] < 2.4) && kliky.z[0] < 7.95 && kliky.z[1] > 8.05, JSON.stringify(kliky));
        await p.vyhodnot(`(() => { const _3d = window._kk3d; _3d.controls.target.set(2.45, 1.0, 8); _3d.camera.position.set(4, 3, 20); _3d.camera.zoom = 9; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.kresliDo = performance.now() + 800; return true; })()`);
        await snimek3d('02-klika.png');

        console.log('\n4) Patro o 2 cm uvnitř: bez tmavé čáry na rozhraní podlaží');
        await p.vyhodnot(`(async () => { const d = ${D}; d.podlaziKopie = true; d.pridatPodlazi('nahoru'); await new Promise(r => setTimeout(r, 500));
            const e = d.engine, X = e.PX_PER_M;
            // Západní zeď patra o 2 cm dovnitř (Klemov má 2–7 mm; víc, ať je římsa bez lemu v testu jistě vidět)
            const z = [...e.walls.values()].find(w => { const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB); return Math.abs(a.x) < 1 && Math.abs(b.x) < 1; });
            for (const id of [z.nodeA, z.nodeB]) e.nodes.get(id).x += 0.02 * X;
            d.renderer.render(); d._poZmeneDomu('Posun'); await new Promise(r => setTimeout(r, 1200)); d.naPodlazi('P1'); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        const lemy = await p.vyhodnot(`(() => { let n = 0, vodorovne = true; window._kk3d.dumSkupina.children.forEach(o => { if (!o.userData?.lemDesky) return; n++; const nr = o.geometry.getAttribute('normal'); for (let i = 0; i < nr.count; i++) if (Math.abs(nr.getY(i)) > 1e-6) vodorovne = false; }); return { n, vodorovne }; })()`);
        kontrola('desky mají lem s vodorovnou normálou', lemy.n >= 4 && lemy.vodorovne, JSON.stringify(lemy));
        // Pohled ze západu šikmo shora na západní fasádu, bez omítky; sloupec pixelů přes rozhraní podlaží nesmí mít tmavou čáru
        const MER_CARY = (bezLemu) => `(async () => { const _3d = window._kk3d, r = _3d.renderer, gl = r.getContext(), d = ${D}; window.Povrchy3d.silaOmitky(0);
            d.skryte3d = []; d.zobrazStrechu3d = false; d._nastavViditelnost3d();
            _3d.controls.target.set(0, 3, 4); _3d.camera.position.set(-20, 12, 6); _3d.camera.zoom = 3; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
            _3d.dumSkupina.children.forEach(o => { if (o.userData?.lemDesky) o.visible = !${bezLemu}; });
            r.render(_3d.scene, _3d.camera); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
            const y0 = _3d.wallGroup.position.y, kota = d.engine.kotaPodlazi('P2');
            const vysledky = [];
            for (const z of [1, 2, 3, 4, 5, 6, 7]) { const v = new THREE.Vector3(-0.15, y0 + kota, z).project(_3d.camera); const px = Math.round((v.x + 1) / 2 * W), py = Math.round((v.y + 1) / 2 * H);
                const b = new Uint8Array(1 * 31 * 4); gl.readPixels(px, py - 15, 1, 31, gl.RGBA, gl.UNSIGNED_BYTE, b);
                const jas = []; for (let i = 0; i < 31; i++) jas.push(b[i * 4] * 0.3 + b[i * 4 + 1] * 0.59 + b[i * 4 + 2] * 0.11);
                const med = [...jas].sort((a, c) => a - c)[15]; vysledky.push(Math.round(Math.max(...jas.map(j => Math.abs(j - med))))); }
            _3d.dumSkupina.children.forEach(o => { if (o.userData?.lemDesky) o.visible = true; });
            window.Povrchy3d.silaOmitky(1); return vysledky; })()`;
        const bez = await p.vyhodnot(MER_CARY(true));
        const cara = await p.vyhodnot(MER_CARY(false));
        kontrola('měření čáru pozná: bez lemu je na rozhraní vidět', bez.some(v => v > 6), JSON.stringify(bez));
        kontrola('na rozhraní podlaží není tmavá čára (odchylka jasu ve sloupci do 6)', cara.every(v => v <= 6), JSON.stringify(cara));
        await p.vyhodnot(`(() => { window._kk3d.kresliDo = performance.now() + 800; return true; })()`);
        await snimek3d('03-rozhrani.png');

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
