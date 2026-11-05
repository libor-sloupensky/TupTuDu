/**
 * Obrázek do článku o zemině: výkop pod dům 12 × 10 m na svahu 10 % ve 3D, z editoru.
 * Dá se pustit znovu, když se změní vzhled 3D. Založí koncept s prefixem ClaudeTest a na konci ho smaže.
 *
 * Spuštění: node services/clanky/snimky-zemina.cjs [V3_URL=http://127.0.0.1:8002]
 * Výstup: public/img/clanky/kolik-zeminy-z-vykopu/vykop-svah.webp a .jpg (náhled při sdílení)
 */
const fs = require('fs');
const path = require('path');
const { otevriProhlizec, pauza } = require('../import-test/prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const VYSTUP = path.join(__dirname, '../../public/img/clanky/kolik-zeminy-z-vykopu');
const SIRKA = 1200, VYSKA = 700;

(async () => {
    fs.mkdirSync(VYSTUP, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    let id = null;
    const js = (t) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; ${t} })()`);
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.cekej(`!!document.querySelector('input[name=password]')`, 20000, 'login');
        await p.vyhodnot(`(() => { document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); return true; })()`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 30000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' },
            body: JSON.stringify({ nazev: 'ClaudeTest snímek článku zemina' }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 30000, 'editor');
        id = await p.vyhodnot(`new URLSearchParams(location.search).get('id') || location.pathname.split('/').pop()`);

        // Dům 12 × 10 m, nosná stěna uprostřed. Svah 10 % ve směru x, parcela a výšky jen vymyšlené, žádné skutečné místo.
        await js(`e.addWall(0, 0, 12*X, 0, 0.3, 'obvodova'); e.addWall(12*X, 0, 12*X, 10*X, 0.3, 'obvodova'); e.addWall(12*X, 10*X, 0, 10*X, 0.3, 'obvodova'); e.addWall(0, 10*X, 0, 0, 0.3, 'obvodova');
            e.addWall(6*X, 0, 6*X, 10*X, 0.2, 'nosna'); d.renderer.render(); d.autoSave('Stěny'); d._selectionTick++; return true;`);
        await pauza(1000);
        await js(`d.katastrParcely = [{ cislo: 'ukázka', label: 'ukázka', polygon_wgs84: [[50 - 0.00025, 15 - 0.00035], [50 + 0.00035, 15 - 0.00035], [50 + 0.00035, 15 + 0.0005], [50 - 0.00025, 15 + 0.0005]] }];
            d._zalozZaklady();
            const o = []; const M = 111320, c = Math.cos(50 * Math.PI / 180);
            for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) o.push([50 + j * 2 / M, 15 + i * 2 / (M * c), 400 + i * 0.2]);
            d.renderer._fixedWgsCenter = { lat: 50, lon: 15 }; d.vyskovyProfil = { body: o, vyska_min: 392, vyska_max: 408, vyskovy_rozdil: 16 }; return true;`);
        await pauza(500);

        // Dům zapustit tak, aby všude dosáhl na zem
        const kota = await js(`for (let k = 30; k >= -300; k -= 5) { d.setNadTerenem(k / 100); if ((d.zemina?.bezZakladu ?? 1) < 0.5) return { k, bez: d.zemina.bezZakladu, vykop: d.zemina.vykopek.vykopano }; } return null;`);
        console.log('kóta a výkop:', JSON.stringify(kota));

        await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1500)); return true; })()`);
        await js(`d.seznamPodlazi.forEach(x => { if (x.viditelne3d) d.naPodlazi(x.id); }); return true;`);
        await pauza(1200);
        const vidna = await js(`const _3d = window._kk3d; document.querySelectorAll('.kk-3d-help, .kk-coords').forEach(x => x.style.display = 'none');
            const y0 = _3d.wallGroup.position.y - 0.6;
            _3d.controls.target.set(6, y0, 5);
            _3d.camera.position.set(6 - 26, y0 + 24, 5 + 30);
            _3d.camera.zoom = 1; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
            // Přiblížení tak, aby se okolí výkopu vešlo do výřezu ${SIRKA} × ${VYSKA}
            let maxX = 0, maxY = 0;
            for (const [x, z] of [[-2.5, -2.5], [14.5, -2.5], [14.5, 12.5], [-2.5, 12.5]]) {
                const q = new THREE.Vector3(x, y0, z).project(_3d.camera);
                maxX = Math.max(maxX, Math.abs(q.x)); maxY = Math.max(maxY, Math.abs(q.y));
            }
            const cv = _3d.renderer.domElement, pomer = (cv.width / cv.height) / (${SIRKA} / ${VYSKA});
            _3d.camera.zoom = Math.min(0.95 / maxX, 0.95 * Math.min(1, pomer) / maxY);
            _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
            return { jama: !!_3d.jama?.visible, zap: _3d.jamaUniformy?.uJamaZap.value, zoom: _3d.camera.zoom };`);
        console.log('jáma:', JSON.stringify(vidna));
        await pauza(800);

        // Výřez ze snímku scény v poměru obrázku v článku
        const data = await js(`const cv = d._snimekScény(); const pomer = ${SIRKA} / ${VYSKA}; let w = cv.width, h = Math.round(w / pomer);
            if (h > cv.height) { h = cv.height; w = Math.round(h * pomer); }
            const v = document.createElement('canvas'); v.width = ${SIRKA}; v.height = ${VYSKA};
            v.getContext('2d').drawImage(cv, (cv.width - w) / 2, (cv.height - h) / 2, w, h, 0, 0, ${SIRKA}, ${VYSKA});
            return { webp: v.toDataURL('image/webp', 0.82), jpg: v.toDataURL('image/jpeg', 0.85), zdroj: [cv.width, cv.height] };`);
        const zapis = (nazev, url) => {
            const soubor = path.join(VYSTUP, nazev);
            fs.writeFileSync(soubor, Buffer.from(url.split(',')[1], 'base64'));
            console.log(nazev, Math.round(fs.statSync(soubor).size / 1024), 'kB');
        };
        zapis('vykop-svah.webp', data.webp);
        zapis('vykop-svah.jpg', data.jpg);
        console.log('zdroj', data.zdroj.join(' × '));
    } finally {
        if (id) {
            const smazano = await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.smazat.replace(':id', ${JSON.stringify(id)}), { method: 'DELETE',
                headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, 'Accept': 'application/json' } }); return r.status; })()`).catch((e) => 'chyba ' + e.message);
            console.log('smazání konceptu', id, smazano);
        }
        await p.zavri();
    }
})().catch((e) => { console.error(e); process.exit(1); });
