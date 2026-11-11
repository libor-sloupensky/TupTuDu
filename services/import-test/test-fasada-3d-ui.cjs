/**
 * Fasáda, skla a pohled ve 3D (povrchy-3d.js): omítka na všem v barvě fasády bez změny průměrné barvy,
 * skla s odrazem okolí podle úhlu pohledu, kamera skoro vodorovně, ale ne pod terén, a přenos do
 * sdíleného odkazu. Ukládá snímky k prohlídce.
 *
 * Spuštění: node services/import-test/test-fasada-3d-ui.cjs [složka snímků]
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

// Kamera na dům: azimut ve stupních od +x, sklon od svislice (polar) ve stupních, cíl ve výšce cilY, přiblížení
const KAMERA = `
const kamera = (azimut, polar, cilY = 2, zoom = 1, posun = [0, 0]) => {
    const d = ${D}, _3d = window._kk3d, PX = d.engine.PX_PER_M;
    const xs = [...d.engine.nodes.values()].map(n => n.x / PX), zs = [...d.engine.nodes.values()].map(n => n.y / PX);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2 + posun[0], cz = (Math.min(...zs) + Math.max(...zs)) / 2 + posun[1];
    const u = azimut * Math.PI / 180, f = polar * Math.PI / 180, r = 30;
    _3d.controls.target.set(cx, cilY, cz);
    _3d.camera.position.set(cx + Math.sin(f) * Math.cos(u) * r, cilY + Math.cos(f) * r, cz + Math.sin(f) * Math.sin(u) * r);
    _3d.camera.zoom = zoom; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
    _3d.kresliDo = performance.now() + 500;
    return true;
};
`;

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'fasada-3d');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const snimek3d = async (jmeno) => {
        await pauza(700);
        const r = await p.vyhodnot(`(() => { const c = document.getElementById('kk-3d-container').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; })()`);
        const { data } = await p.cmd('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
        fs.writeFileSync(path.join(vystup, jmeno), Buffer.from(data, 'base64'));
    };
    // Průměrná barva čtverce uprostřed plátna (vykresleno znovu, ať nečekáme na smyčku)
    const stredPlatna = (pul = 6) => p.vyhodnot(`(() => { const _3d = window._kk3d, r = _3d.renderer, gl = r.getContext();
        r.render(_3d.scene, _3d.camera);
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, n = ${pul} * 2, b = new Uint8Array(n * n * 4);
        gl.readPixels(Math.floor(W / 2) - ${pul}, Math.floor(H / 2) - ${pul}, n, n, gl.RGBA, gl.UNSIGNED_BYTE, b);
        const s = [0, 0, 0]; for (let i = 0; i < n * n; i++) for (let k = 0; k < 3; k++) s[k] += b[i * 4 + k];
        return s.map(v => Math.round(v / (n * n))); })()`);
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
            body: JSON.stringify({ nazev: 'ClaudeTest fasada 3D ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům s okny, bílá fasáda, střecha');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.4, 'obvodova');
            const w2 = e.addWall(10*X, 0, 10*X, 7*X, 0.4, 'obvodova');
            const w3 = e.addWall(10*X, 7*X, 0, 7*X, 0.4, 'obvodova');
            e.addWall(0, 7*X, 0, 0, 0.4, 'obvodova');
            for (const x of [1.5, 4.5, 7.5]) e.addOpening(w3.id, x, 1.5, 'okno', { presnaSirka: true });
            e.addOpening(w2.id, 2.5, 1.5, 'okno', { presnaSirka: true });
            e.addOpening(w1.id, 5, 1.0, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++;
            d.strechaVytvor();
            d.engine.dum.barvy.fasada = '#f2f0eb';
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await p.cekej(`window.Povrchy3d.stav().omitka === 1 && !!window.Povrchy3d.stav().odrazy`, 30000, 'omítka a odrazy');
        const fas = await p.vyhodnot(`(() => { let fasada = 0, sOmitkou = 0, skel = 0, fyzikalni = 0, sOdrazy = 0;
            const odrazy = window.Povrchy3d.stav().odrazy;
            window._kk3d.wallGroup.traverse(o => { for (const m of [].concat(o.material || [])) {
                if (m.userData?.barva === 'fasada') { fasada++; if (m.userData.omitka) sOmitkou++; }
                if (m.userData?.sklo) { skel++; if (m.isMeshPhysicalMaterial) fyzikalni++; if (m.envMap === odrazy) sOdrazy++; }
            } });
            return { fasada, sOmitkou, skel, fyzikalni, sOdrazy }; })()`);
        kontrola('všechno v barvě fasády má omítku', fas.fasada > 0 && fas.sOmitkou === fas.fasada, JSON.stringify(fas));
        kontrola('skla jsou fyzikální materiál s odrazem okolí domu', fas.skel > 0 && fas.fyzikalni === fas.skel && fas.sOdrazy === fas.skel, JSON.stringify(fas));

        console.log('\n2) Omítka nemění průměrnou barvu fasády');
        // Pohled kolmo na jižní stěnu (z = 7 m, okna jsou na ní), střed plátna mezi okny
        await p.vyhodnot(`(() => { ${KAMERA} document.querySelectorAll('.kk-3d-help, .kk-coords').forEach(e => e.style.display = 'none'); return kamera(90, 89, 1.2, 4, [-1, 0]); })()`);
        await pauza(500);
        const sOmitkou = await stredPlatna(40);
        // Síla omítky na nulu jen pro měření (sdílená uniforma)
        const bezOmitky = await p.vyhodnot(`(() => { const _3d = window._kk3d; let u = null;
            _3d.wallGroup.traverse(o => { for (const x of [].concat(o.material || [])) if (x.userData?.omitka && !u) { const pr = _3d.renderer.properties.get(x); u = pr?.uniforms?.tuOmSila; } });
            if (!u) return null; u.value = 0; const r = _3d.renderer, gl = r.getContext(); r.render(_3d.scene, _3d.camera);
            const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, n = 80, b = new Uint8Array(n * n * 4);
            gl.readPixels(Math.floor(W / 2) - 40, Math.floor(H / 2) - 40, n, n, gl.RGBA, gl.UNSIGNED_BYTE, b);
            u.value = 1; const s = [0, 0, 0]; for (let i = 0; i < n * n; i++) for (let k = 0; k < 3; k++) s[k] += b[i * 4 + k];
            return s.map(v => Math.round(v / (n * n))); })()`);
        const rozdil = bezOmitky ? Math.max(...sOmitkou.map((v, i) => Math.abs(v - bezOmitky[i]))) : 999;
        kontrola('průměrná barva stěny s omítkou a bez ní se liší nejvýš o 3 odstíny', rozdil <= 3, JSON.stringify({ sOmitkou, bezOmitky }));
        await snimek3d('01-fasada-zblizka.png');
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(70, 80, 2, 9, [2.5, 3.4]); })()`);
        await snimek3d('02-fasada-detail-okna.png');

        console.log('\n3) Odraz ve skle podle úhlu pohledu');
        // Sklo okna na jižní stěně nejblíž středu domu, cíl kamery je střed jeho skla
        const cil = await p.vyhodnot(`(() => { const T = window.THREE; let nej = null;
            window._kk3d.wallGroup.traverse(o => { if (!o.isMesh || !o.material?.userData?.sklo) return;
                const c = new T.Box3().setFromObject(o).getCenter(new T.Vector3());
                if (c.z > 6.5 && (!nej || Math.abs(c.x - 5) < Math.abs(nej.x - 5))) nej = c; });
            return nej && [nej.x, nej.y, nej.z]; })()`);
        const skloZ = async (azimut, polar) => {
            await p.vyhodnot(`(() => { const _3d = window._kk3d, [x, y, z] = ${JSON.stringify(cil)}, u = ${azimut} * Math.PI / 180, f = ${polar} * Math.PI / 180;
                _3d.controls.target.set(x, y, z); _3d.camera.position.set(x + Math.sin(f) * Math.cos(u) * 30, y + Math.cos(f) * 30, z + Math.sin(f) * Math.sin(u) * 30);
                _3d.camera.zoom = 9; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld(); return true; })()`);
            await pauza(300);
            return stredPlatna(3);
        };
        const kolmo = await skloZ(90, 88);
        const shora = await skloZ(90, 45);
        const sikmo = await skloZ(45, 86);
        const vzd = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));
        kontrola('sklo vypadá jinak zepředu, shora a šikmo (odráží okolí podle pohledu)', vzd(kolmo, shora) > 8 && vzd(kolmo, sikmo) > 8, JSON.stringify({ kolmo, shora, sikmo }));
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(60, 75, 2, 1.6); })()`);
        await snimek3d('03-okna-shora.png');
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(120, 87, 2, 1.6); })()`);
        await snimek3d('04-okna-zdola.png');

        console.log('\n4) Kamera skoro vodorovně, ne pod terén');
        const mez = await p.vyhodnot(`(() => ({ max: window._kk3d.controls.maxPolarAngle * 180 / Math.PI }))()`);
        kontrola('nejnižší pohled je níž než dřív (85,7°), ale nad vodorovnou rovinou', mez.max > 86 && mez.max < 90, mez.max.toFixed(2) + '°');
        await p.vyhodnot(`(() => { ${KAMERA} kamera(60, 120, 2, 1.6); window._kk3d.controls.update(); return true; })()`);
        await pauza(300);
        const poOmezeni = await p.vyhodnot(`(() => { const _3d = window._kk3d; const s = new THREE.Spherical().setFromVector3(_3d.camera.position.clone().sub(_3d.controls.target)); return s.phi * 180 / Math.PI; })()`);
        kontrola('pohled zespodu se zastaví na mezi', poOmezeni <= mez.max + 0.01, poOmezeni.toFixed(2) + '°');
        await snimek3d('05-nejnizsi-pohled.png');
        const sklep = await p.vyhodnot(`(async () => { const d = ${D}; d.podlaziKopie = true; d.pridatPodlazi('sklep'); await new Promise(r => setTimeout(r, 1500)); d._build3d(); await new Promise(r => setTimeout(r, 300));
            return window._kk3d.controls.maxPolarAngle * 180 / Math.PI; })()`);
        kontrola('se sklepem je nejnižší pohled o něco výš (terén musí zakrýt hlubší stavbu)', sklep < mez.max && sklep >= 85.7, sklep.toFixed(2) + '° proti ' + mez.max.toFixed(2) + '°');

        console.log('\n5) Sdílený odkaz nese sklo a omítku');
        const model = await p.vyhodnot(`(() => { const m = ${D}._zapecModel(); return [...new Set(m.materialy.map(x => x.povrch).filter(Boolean))]; })()`);
        kontrola('pečený model má povrch sklo i omítka', model.includes('sklo') && model.includes('omitka'), JSON.stringify(model));
        await p.vyhodnot(`(async () => { const d = ${D}; d.prepni2d?.(); d.rezim3d = false; document.querySelector('[data-sekce-export]').open = true;
            await new Promise(r => setTimeout(r, 500)); document.querySelector('[data-sdileni=vytvorit]').click(); return true; })()`);
        await p.cekej(`!!(${D}.sdileni && ${D}.sdileni.aktivni)`, 40000, 'odkaz');
        const adresa = await p.vyhodnot(`${D}.sdileni.url`);
        await p.jdiNa(adresa);
        await p.cekej(`!!window.__sdileniScena && window.Povrchy3d.stav().omitka === 1 && !!window.Povrchy3d.stav().odrazy`, 30000, 'prohlížeč s omítkou a odrazy');
        const prohlizec = await p.vyhodnot(`(() => { const sc = window.__sdileniScena, odrazy = window.Povrchy3d.stav().odrazy; let skel = 0, sOdrazy = 0, omitky = 0;
            sc.scene.traverse(o => { for (const m of [].concat(o.material || [])) { if (m.userData?.sklo) { skel++; if (m.envMap === odrazy) sOdrazy++; } if (m.userData?.omitka) omitky++; } });
            sc.renderer.render(sc.scene, sc.camera); return { skel, sOdrazy, omitky }; })()`);
        kontrola('prohlížeč odkazu má skla s odrazem okolí a omítku', prohlizec.skel > 0 && prohlizec.sOdrazy === prohlizec.skel && prohlizec.omitky > 0, JSON.stringify(prohlizec));
        await pauza(500);
        await p.snimek(path.join(vystup, '06-odkaz.png'));

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
