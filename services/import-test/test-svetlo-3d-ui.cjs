/**
 * Světlo a barvy ve 3D: barva na obrazovce proti vzorku, textura, stín, přepočet stínů jen po změně
 * a jedna vykreslovací smyčka. Hodnoty čte přímo z vykreslené plochy.
 *
 * Spuštění: node services/import-test/test-svetlo-3d-ui.cjs [složka snímků]
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

// Vykreslí sondu: čtverec dané barvy s normálou podél osy, přímo proti kameře, a vrátí prostřední pixel
const SONDA = `
const sonda = (hex, normala, moznosti = {}) => {
    const _3d = window._kk3d, THREE = window.THREE;
    const n = new THREE.Vector3(...normala).normalize();
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: moznosti.drsnost ?? 0.85, map: moznosti.mapa || null });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), mat);
    const st = new THREE.Vector3(500, 500, 500);
    m.position.copy(st); m.lookAt(st.clone().add(n));
    _3d.scene.add(m);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
    cam.position.copy(st).addScaledVector(n, 10);
    cam.up.set(0, 1, 0); if (Math.abs(n.y) > 0.9) cam.up.set(0, 0, 1);
    cam.lookAt(st); cam.updateMatrixWorld();
    const r = _3d.renderer, gl = r.getContext();
    r.render(_3d.scene, cam);
    const b = new Uint8Array(4);
    gl.readPixels(Math.floor(gl.drawingBufferWidth / 2), Math.floor(gl.drawingBufferHeight / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b);
    _3d.scene.remove(m); m.geometry.dispose(); mat.dispose();
    return [b[0], b[1], b[2]];
};
const zHexu = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
`;

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'svetlo-3d');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
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
            body: JSON.stringify({ nazev: 'ClaudeTest svetlo ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům ve 3D a nastavení');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.4, 'obvodova');
            e.addWall(10*X, 0, 10*X, 7*X, 0.4, 'obvodova');
            const w3 = e.addWall(10*X, 7*X, 0, 7*X, 0.4, 'obvodova');
            e.addWall(0, 7*X, 0, 0, 0.4, 'obvodova');
            const w5 = e.addWall(5*X, 0, 5*X, 7*X, 0.15, 'pricka');
            e.addOpening(w1.id, 2, 1.2, 'okno', { presnaSirka: true });
            e.addOpening(w3.id, 7, 0.9, 'dvere', { presnaSirka: true });
            e.addOpening(w5.id, 3, 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++;
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        const nast = await p.vyhodnot(`(() => { const _3d = window._kk3d, T = window.THREE; let ambient = 0;
            _3d.scene.traverse(o => { if (o.isAmbientLight) ambient++; });
            return { vystup: _3d.renderer.outputEncoding === T.sRGBEncoding, tonovani: _3d.renderer.toneMapping === T.CustomToneMapping,
                prostredi: !!_3d.scene.environment, stiny: _3d.renderer.shadowMap.enabled, naPozadani: _3d.renderer.shadowMap.autoUpdate === false, ambient }; })()`);
        kontrola('správný převod barev, odrazy prostředí, stíny na pozadání', nast.vystup && nast.tonovani && nast.prostredi && nast.stiny && nast.naPozadani && nast.ambient === 0, JSON.stringify(nast));

        console.log('\n2) Barva na obrazovce proti vzorku');
        const barvy = await p.vyhodnot(`(() => { ${SONDA}
            const vzorky = ['#808080', '#b5533c', '#3a6ea5', '#d6d3d1', '#7a8b5c'];
            const smery = { nahoru: [0, 1, 0], jih: [0, 0, 1], zapad: [-1, 0, 0], sever: [0, 0, -1], vychod: [1, 0, 0] };
            const vysl = {};
            for (const [nazev, n] of Object.entries(smery)) {
                vysl[nazev] = vzorky.map(h => { const o = zHexu(h), s = sonda(h, n); return { h, s, pomer: s.map((v, i) => +(v / o[i]).toFixed(3)) }; });
            }
            vysl.bila = sonda('#ffffff', [0, 1, 0]);
            vysl.bilaSten = sonda('#ffffff', [0, 0, 1]);
            vysl.tmava = sonda('#293133', [0, 1, 0]);
            return vysl; })()`);
        const pomery = (x) => x.flatMap(r => r.pomer);
        const rozsah = (a) => `${Math.min(...a).toFixed(2)}–${Math.max(...a).toFixed(2)}`;
        const nahoru = pomery(barvy.nahoru);
        kontrola('vodorovná plocha v jednom pásmu se vzorkem', Math.min(...nahoru) >= 0.97 && Math.max(...nahoru) <= 1.14, rozsah(nahoru));
        for (const [n, popis] of [['jih', 'stěna k jihu'], ['zapad', 'stěna k západu']]) {
            const a = pomery(barvy[n]);
            kontrola(`${popis} na slunci`, Math.min(...a) >= 0.82 && Math.max(...a) <= 1, rozsah(a));
        }
        for (const [n, popis] of [['sever', 'stěna k severu'], ['vychod', 'stěna k východu']]) {
            const a = pomery(barvy[n]);
            kontrola(`${popis} je tmavší, ale ne černá`, Math.min(...a) >= 0.7 && Math.max(...a) <= 0.86, rozsah(a));
        }
        const odstin = barvy.nahoru.concat(barvy.jih, barvy.sever).map(r => Math.max(...r.pomer) - Math.min(...r.pomer));
        kontrola('odstín se nemění', Math.max(...odstin) <= 0.1, 'největší rozdíl mezi kanály ' + Math.max(...odstin).toFixed(3));
        kontrola('bílá se nepřepálí a stěna od ní jde poznat', barvy.bila[0] >= 240 && barvy.bilaSten[0] < barvy.bila[0] - 8, `vodorovně ${barvy.bila}, stěna ${barvy.bilaSten}`);
        kontrola('tmavá barva zůstane tmavá', barvy.tmava.every(v => v < 95), String(barvy.tmava));

        console.log('\n3) Textura');
        const tex = await p.vyhodnot(`(() => { ${SONDA}
            const T = window.THREE;
            const cv = document.createElement('canvas'); cv.width = cv.height = 16;
            const g = cv.getContext('2d'); g.fillStyle = '#b5533c'; g.fillRect(0, 0, 16, 16);
            const t = new T.CanvasTexture(cv); t.encoding = T.sRGBEncoding;
            const s = sonda('#ffffff', [0, 1, 0], { mapa: t }), b = sonda('#b5533c', [0, 1, 0]);
            return { s, b }; })()`);
        kontrola('textura má stejnou barvu jako plná barva a není černá', tex.s.every((v, i) => Math.abs(v - tex.b[i]) <= 3), `textura ${tex.s}, barva ${tex.b}`);

        console.log('\n4) Stín');
        const stin = await p.vyhodnot(`(() => { ${SONDA}
            const _3d = window._kk3d, T = window.THREE, r = _3d.renderer, gl = r.getContext();
            const skupina = new T.Group(); skupina.position.set(500, 0, 500);
            const zem = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshStandardMaterial({ color: '#808080', roughness: 0.9 }));
            zem.rotation.x = -Math.PI / 2; skupina.add(zem);
            const kvadr = new T.Mesh(new T.BoxGeometry(2, 3, 2), new T.MeshStandardMaterial({ color: '#808080' })); kvadr.position.y = 1.5; skupina.add(kvadr);
            _3d.scene.add(skupina); skupina.updateMatrixWorld(true);
            window.Svetlo3d.stinyObjektu(skupina); window.Svetlo3d.usadSlunce(_3d.slunce, skupina); window.Svetlo3d.prekresliStiny(r);
            const cam = new T.OrthographicCamera(-6, 6, 6, -6, 0.1, 100); cam.position.set(500, 40, 500); cam.up.set(0, 0, -1); cam.lookAt(500, 0, 500); cam.updateMatrixWorld();
            const bod = (x, z) => { const v = new T.Vector3(500 + x, 0, 500 + z).project(cam); const b = new Uint8Array(4);
                gl.readPixels(Math.round((v.x + 1) / 2 * gl.drawingBufferWidth), Math.round((v.y + 1) / 2 * gl.drawingBufferHeight), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); return b[0]; };
            r.render(_3d.scene, cam);
            // Slunce svítí z jihozápadu (-x, +z), stín leží na severovýchodě kvádru
            const vysl = { stin: bod(1.6, -1.6), slunce: bod(-3, 3), poNastaveni: r.shadowMap.needsUpdate };
            _3d.scene.remove(skupina);
            return vysl; })()`);
        kontrola('stín padá na správnou stranu a není černý', stin.stin < stin.slunce * 0.9 && stin.stin > stin.slunce * 0.6, `stín ${stin.stin}, slunce ${stin.slunce}`);
        kontrola('po vykreslení se stíny znovu nepřepočítávají', stin.poNastaveni === false);

        console.log('\n5) Přestavba a jedna smyčka');
        const smycka = await p.vyhodnot(`(async () => { const d = ${D}, _3d = window._kk3d, r = _3d.renderer;
            d._build3d(); d._build3d(); d._build3d();
            const poStavbe = r.shadowMap.needsUpdate;
            d.zobrazStrechu3d = d.zobrazStrechu3d;
            let kresleni = 0; const puvodni = r.render.bind(r); r.render = (...a) => { kresleni++; return puvodni(...a); };
            const snimku = 30; for (let i = 0; i < snimku; i++) await new Promise(q => requestAnimationFrame(q));
            r.render = puvodni;
            r.shadowMap.needsUpdate = false; d._nastavViditelnost3d();
            return { poStavbe, kresleni, snimku, poViditelnosti: r.shadowMap.needsUpdate }; })()`);
        kontrola('přestavba si vyžádá nové stíny', smycka.poStavbe === true);
        kontrola('změna viditelnosti si vyžádá nové stíny', smycka.poViditelnosti === true);
        kontrola('po třech přestavbách se kreslí jednou za snímek', smycka.kresleni <= smycka.snimku + 2, `${smycka.kresleni} kreslení na ${smycka.snimku} snímků`);

        await pauza(500);
        await p.vyhodnot(`(() => { const d = ${D}; d.zoom = 0.5; const k = window._kk3d.camera; k.zoom = 0.5; k.updateProjectionMatrix(); return true; })()`);
        await pauza(500);
        await p.snimek(path.join(vystup, 'dum-3d.png'));
        await p.vyhodnot(`(async () => { const d = ${D}; d.pridatPodlazi('nahoru'); d.strechaVytvor(); d.naPodlazi('P1'); d._build3d(); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await p.snimek(path.join(vystup, 'dum-3d-strecha.png'));

        console.log('\n6) Skutečný dům: stěna, bok desky a střecha si nesmí stínit samy');
        // Oboustranný materiál obrácenou normálu ve světle schová, stín se ale podle ní odsadí do zdi.
        // Sonda z bodu 2 to nezachytí, proto se tu měří opravdové stěny na všech stranách.
        const dum = await p.vyhodnot(`(() => { const d = ${D}, _3d = window._kk3d, T = window.THREE, r = _3d.renderer, gl = r.getContext();
            d.skryte3d = []; d._nastavViditelnost3d();
            for (const m of (() => { const a = []; _3d.scene.traverse(o => { if (o.isMesh) a.push(...[].concat(o.material)); }); return a; })()) if (m.userData?.barva === 'fasada') m.color.set('#e8cfa8');
            const obal = new T.Box3(); for (const g of _3d.podlaziSkupiny.values()) obal.expandByObject(g);
            const st = obal.getCenter(new T.Vector3());
            const deska = _3d.dumSkupina.children.find(o => o.userData.stropPod);
            const pas = new T.Box3().setFromObject(deska);
            const kota = d.engine.kotaPodlazi(d.engine.dum.podlazi[d.engine.dum.podlazi.length - 1].id);
            const okap = kota + d._strechaVypocet().zOkapMin;
            r.shadowMap.needsUpdate = true;
            const vys = {};
            // Stranou od otvorů: dveře a okno jsou v jižní a severní stěně u x = 2–3 m
            for (const [nazev, n, x, z] of [['jih', [0, 0, 1], 2.5, 0], ['zapad', [-1, 0, 0], 0, -1], ['sever', [0, 0, -1], 2.5, 0], ['vychod', [1, 0, 0], 0, 1]]) {
                const k = new T.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
                k.position.set(st.x + n[0] * 40, st.y, st.z + n[2] * 40); k.up.set(0, 1, 0); k.lookAt(st); k.updateMatrixWorld(); k.updateProjectionMatrix();
                r.render(_3d.scene, k);
                const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
                const blok = (y0, y1) => {
                    const a = new T.Vector3(st.x + x, y0, st.z + z).project(k), b = new T.Vector3(st.x + x, y1, st.z + z).project(k);
                    const py = Math.round((a.y + 1) / 2 * H), vyska = Math.max(1, Math.round((b.y + 1) / 2 * H) - py), sirka = 40;
                    const px = Math.round((a.x + 1) / 2 * W - sirka / 2), buf = new Uint8Array(sirka * vyska * 4);
                    gl.readPixels(px, py, sirka, vyska, gl.RGBA, gl.UNSIGNED_BYTE, buf);
                    let s = 0, s2 = 0; const m = sirka * vyska;
                    for (let i = 0; i < m; i++) { s += buf[i * 4]; s2 += buf[i * 4] * buf[i * 4]; }
                    const prum = s / m;
                    return { R: +prum.toFixed(1), std: +Math.sqrt(Math.max(0, s2 / m - prum * prum)).toFixed(2) };
                };
                vys[nazev] = { dole: blok(obal.min.y + 1, obal.min.y + 2), pas: blok(pas.min.y + 0.04, pas.max.y - 0.04), nahore: blok(pas.max.y + 0.5, pas.max.y + 1.2), podOkapem: blok(okap - 0.8, okap - 0.6) };
            }
            return vys; })()`);
        for (const [n, x] of Object.entries(dum)) {
            kontrola(`${n}: stěna má barvu boku desky`, Math.abs(x.dole.R - x.pas.R) <= 2 && Math.abs(x.nahore.R - x.pas.R) <= 2, `dole ${x.dole.R}, pás ${x.pas.R}, nahoře ${x.nahore.R}`);
            kontrola(`${n}: stěna bez šikmého vzoru z vlastního stínu`, x.dole.std <= 1 && x.nahore.std <= 1, `odchylka ${x.dole.std}, ${x.nahore.std}`);
        }
        kontrola('stěny na slunci jsou světlejší než ve stínu', dum.jih.dole.R > dum.sever.dole.R * 1.1 && dum.zapad.dole.R > dum.vychod.dole.R * 1.05, `jih ${dum.jih.dole.R}, sever ${dum.sever.dole.R}, západ ${dum.zapad.dole.R}, východ ${dum.vychod.dole.R}`);
        kontrola('okap dál vrhá stín na jižní stěnu, tmavý jako stěna ve stínu', Math.abs(dum.jih.podOkapem.R - dum.sever.dole.R) <= 3 && dum.jih.podOkapem.std <= 1, `pod okapem ${dum.jih.podOkapem.R}, ve stínu ${dum.sever.dole.R}, na slunci ${dum.jih.dole.R}`);

        const normaly = await p.vyhodnot(`(() => { const d = ${D}, T = window.THREE, mat = new T.MeshStandardMaterial();
            const dlouhy = [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 4, z: 0.2 }, { x: 0, z: 0.2 }];
            const platek = [{ x: 0, z: 0 }, { x: 0.2, z: 0 }, { x: 0.2, z: 0.2 }, { x: 0, z: 0.2 }];
            const zkus = (stavba, poly) => { const g = new T.Group(); stavba(g, poly);
                const P = g.children[0].geometry.attributes.position, N = g.children[0].geometry.attributes.normal, c = new T.Vector3();
                for (let i = 0; i < P.count; i++) c.add(new T.Vector3().fromBufferAttribute(P, i));
                c.divideScalar(P.count);
                let dovnitr = 0;
                for (let j = 0; j < P.count; j += 3) {
                    const t = new T.Vector3().fromBufferAttribute(P, j).add(new T.Vector3().fromBufferAttribute(P, j + 1)).add(new T.Vector3().fromBufferAttribute(P, j + 2)).divideScalar(3);
                    if (t.sub(c).dot(new T.Vector3().fromBufferAttribute(N, j)) <= 0) dovnitr++;
                }
                return dovnitr; };
            const strany = (g, poly) => d._hranolStrany(g, poly, 0, 2.5, mat, mat, () => true);
            const podStrechou = (g, poly) => d._hranolPodStrechou(g, poly, 0, 2.5, mat, mat, () => true, () => 2);
            return [zkus(strany, dlouhy), zkus(strany, [...dlouhy].reverse()), zkus(podStrechou, platek), zkus(podStrechou, [...platek].reverse())]; })()`);
        kontrola('hranol stěny má normály ven při obou směrech obrysu', normaly.every(n => n === 0), 'dovnitř ' + normaly.join(', '));

        for (const typ of ['sedlova', 'valbova', 'pultova']) {
            const krytina = await p.vyhodnot(`(async () => { const d = ${D}, _3d = window._kk3d, T = window.THREE, r = _3d.renderer, gl = r.getContext();
                d.engine.dum.strecha.typ = ${JSON.stringify(typ)}; d._build3d(); await new Promise(q => setTimeout(q, 300));
                const obal = new T.Box3(); for (const g of _3d.podlaziSkupiny.values()) obal.expandByObject(g);
                const st = obal.getCenter(new T.Vector3());
                const k = new T.OrthographicCamera(-12, 12, 12, -12, 0.1, 200);
                k.position.set(st.x, 60, st.z + 0.01); k.up.set(0, 0, -1); k.lookAt(st); k.updateMatrixWorld(); k.updateProjectionMatrix();
                const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight;
                const plochy = []; let nahoru = 0, dolu = 0;
                _3d.dumSkupina.traverse(o => { if (!o.isMesh || !o.userData.krytina) return; plochy.push(o);
                    const N = o.geometry.attributes.normal; for (let j = 0; j < N.count; j += 3) { if (N.getY(j) > 0) nahoru++; else dolu++; } });
                const kresli = () => { r.shadowMap.needsUpdate = true; r.render(_3d.scene, k); const b = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, b); return b; };
                const prepni = (ano) => { for (const o of plochy) { o.receiveShadow = ano; for (const m of [].concat(o.material)) m.needsUpdate = true; } };
                const se = kresli(); prepni(false); const bez = kresli(); prepni(true);
                let n = 0, tmavsi = 0;
                for (let i = 0; i < W * H; i++) { const R = bez[i * 4]; if (R < bez[i * 4 + 1] * 1.3 || R < bez[i * 4 + 2] * 1.3) continue; n++; if (se[i * 4] < R - 4) tmavsi++; }
                return { nahoru, dolu, n, podil: +(tmavsi / Math.max(1, n)).toFixed(3) }; })()`);
            kontrola(`${typ}: střecha hledí nahoru a nestíní si sama`, krytina.dolu === 0 && krytina.n > 1000 && krytina.podil <= 0.05, JSON.stringify(krytina));
        }

        const chybyStranky = (p.chyby || []).filter(c => !/favicon|404/.test(String(c)));
        kontrola('žádná chyba shaderu ani stránky', chybyStranky.length === 0, chybyStranky.slice(0, 3).join(' | ').slice(0, 300));
    } catch (e) {
        chyb++;
        console.log('   CHYBA běhu:', e.message);
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\nCHYB: ${chyb}` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
})();
