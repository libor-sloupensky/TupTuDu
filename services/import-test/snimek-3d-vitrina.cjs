/**
 * Snímek 3D náhledu konceptu pro titulní stránku (public/img/vitrina/dum-3d.png, 788 × 740 px).
 *
 * Otevře koncept, přepne do 3D, postaví kameru nad dům, dopočítá přiblížení
 * z promítnutých bodů půdorysu (dům může být natočený) a vyřízne snímek
 * bez pomocných nápisů. Ukázkový dům je „Klemov reference" (lokální id 51).
 *
 * Spuštění: node services/import-test/snimek-3d-vitrina.cjs <id konceptu> <výstup.png> [azimut°=40] [výška kamery=32]
 *           V3_URL=http://127.0.0.1:8003 (výchozí 8002)
 */
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const [,, id, vystup, uhelArg, vyskaArg] = process.argv;
const SIRKA = 788, VYSKA = 740;

if (!id || !vystup) {
    console.error('Použití: node snimek-3d-vitrina.cjs <id konceptu> <výstup.png> [azimut°] [výška kamery]');
    process.exit(1);
}

(async () => {
    const p = await otevriProhlizec({ sirka: 1900, vyska: 1150 });
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)}; document.querySelector('form').submit(); true`);
        await pauza(1500);
        await p.jdiNa(`${ZAKLAD}/masterteam/koncept-v3?id=${id}`);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor');
        await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); return true; })()`);
        await pauza(1500);
        const info = await p.vyhodnot(`(() => {
            const d = ${D}; const _3d = window._kk3d;
            // Skrýt pomocné nápisy, ať je snímek čistý
            document.querySelectorAll('.kk-3d-help, .kk-coords').forEach(e => e.style.display = 'none');
            const PX = d.engine.PX_PER_M;
            // Body půdorysu v podlaze a ve výšce stěn — podle nich se dům centruje i přibližuje
            const body = [];
            for (const n of d.engine.nodes.values()) { body.push(new THREE.Vector3(n.x / PX, 0, n.y / PX)); body.push(new THREE.Vector3(n.x / PX, 2.8, n.y / PX)); }
            const box = new THREE.Box3().setFromPoints(body);
            const c = box.getCenter(new THREE.Vector3());
            const uhel = (${uhelArg || 40}) * Math.PI / 180, dist = 40, vy = ${vyskaArg || 32};
            _3d.controls.target.set(c.x, 1.0, c.z);
            _3d.camera.position.set(c.x + Math.cos(uhel) * dist, vy, c.z + Math.sin(uhel) * dist);
            _3d.camera.zoom = 1; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
            const cont = document.getElementById('kk-3d-container').getBoundingClientRect();
            const promitni = () => {
                let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
                for (const b of body) { const v = b.clone().project(_3d.camera); const sx = (v.x + 1) / 2 * cont.width, sy = (1 - v.y) / 2 * cont.height;
                    minX = Math.min(minX, sx); maxX = Math.max(maxX, sx); minY = Math.min(minY, sy); maxY = Math.max(maxY, sy); }
                return { minX, maxX, minY, maxY };
            };
            // Přiblížení na 86 % výřezu; po změně zoomu promítnout znovu a dorovnat
            for (let kolo = 0; kolo < 3; kolo++) {
                const r = promitni();
                _3d.camera.zoom *= Math.min(${SIRKA} * 0.86 / (r.maxX - r.minX), ${VYSKA} * 0.86 / (r.maxY - r.minY));
                _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
            }
            const r = promitni();
            const tx = (r.minX + r.maxX) / 2, ty = (r.minY + r.maxY) / 2;
            // Výřez nesmí přesáhnout plochu 3D (nad ní je lišta nástrojů)
            const x = Math.min(Math.max(cont.left + tx - ${SIRKA} / 2, cont.left), cont.right - ${SIRKA});
            const y = Math.min(Math.max(cont.top + ty - ${VYSKA} / 2, cont.top), cont.bottom - ${VYSKA});
            return { x: Math.round(x), y: Math.round(y), zoom: +_3d.camera.zoom.toFixed(3), dum: [Math.round(r.maxX - r.minX), Math.round(r.maxY - r.minY)] };
        })()`);
        await pauza(700);
        const { data } = await p.cmd('Page.captureScreenshot', { format: 'png', clip: { x: info.x, y: info.y, width: SIRKA, height: VYSKA, scale: 1 } });
        fs.writeFileSync(vystup, Buffer.from(data, 'base64'));
        console.log('uloženo', vystup, JSON.stringify(info));
        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        if (vazne.length) console.log('chyby v konzoli:', vazne.slice(0, 5).map(c => c.text));
    } finally { await p.zavri(); }
})().catch(e => { console.error(e); process.exit(2); });
