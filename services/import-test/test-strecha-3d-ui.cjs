/**
 * Střecha ve 3D: deska s tloušťkou, podbití, čelo, žlaby, hřebenáče, krytiny z textur a jejich volba
 * v panelu, plochá střecha s atikou a přenos krytiny do sdíleného odkazu. Ukládá snímky k prohlídce.
 *
 * Spuštění: node services/import-test/test-strecha-3d-ui.cjs [složka snímků]
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

// Kamera na dům: azimut ve stupních od +x, výška a vzdálenost v metrech, cíl ve výšce cilY
const KAMERA = `
const kamera = (azimut, vyska, vzdal, cilY = 2.5, posun = [0, 0]) => {
    const d = ${D}, _3d = window._kk3d, PX = d.engine.PX_PER_M;
    const xs = [...d.engine.nodes.values()].map(n => n.x / PX), zs = [...d.engine.nodes.values()].map(n => n.y / PX);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2 + posun[0], cz = (Math.min(...zs) + Math.max(...zs)) / 2 + posun[1];
    const u = azimut * Math.PI / 180;
    _3d.controls.target.set(cx, cilY, cz);
    _3d.camera.position.set(cx + Math.cos(u) * vzdal, vyska, cz + Math.sin(u) * vzdal);
    _3d.camera.zoom = 1; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.camera.updateMatrixWorld();
    return true;
};
// Hotovo, až mají všechny materiály krytiny dotažené textury
const texturyHotove = () => {
    let vse = true, pocet = 0;
    window._kk3d.dumSkupina.traverse(o => {
        const m = o.material;
        if (!m || !m.userData?.krytinaVzhled) return;
        pocet++;
        for (const t of [m.map, m.normalMap, m.aoMap]) if (!t || !t.image) vse = false;
    });
    return pocet > 0 && vse;
};
const casti = () => {
    const vysledek = {};
    for (const o of window._kk3d.dumSkupina.children) {
        for (const k of ['krytina', 'podbiti', 'celo', 'zlab', 'hrebenac']) if (o.userData[k]) vysledek[k] = (vysledek[k] || 0) + 1;
    }
    return vysledek;
};
`;

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'strecha-3d');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const snimek3d = async (jmeno) => {
        await pauza(600);
        const r = await p.vyhodnot(`(() => { const c = document.getElementById('kk-3d-container').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; })()`);
        const { data } = await p.cmd('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
        fs.writeFileSync(path.join(vystup, jmeno), Buffer.from(data, 'base64'));
    };
    const cekejTextury = () => p.cekej(`(() => { ${KAMERA} return texturyHotove(); })()`, 30000, 'textury krytiny');
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
            body: JSON.stringify({ nazev: 'ClaudeTest strecha 3D ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům se sedlovou střechou ve 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.4, 'obvodova');
            e.addWall(10*X, 0, 10*X, 7*X, 0.4, 'obvodova');
            const w3 = e.addWall(10*X, 7*X, 0, 7*X, 0.4, 'obvodova');
            e.addWall(0, 7*X, 0, 0, 0.4, 'obvodova');
            e.addOpening(w1.id, 2, 1.2, 'okno', { presnaSirka: true });
            e.addOpening(w1.id, 6, 1.2, 'okno', { presnaSirka: true });
            e.addOpening(w3.id, 7, 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++;
            d.strechaVytvor();
            await d.prepni3d(); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await cekejTextury();
        const c1 = await p.vyhodnot(`(() => { ${KAMERA} return casti(); })()`);
        kontrola('krytina, podbití, čelo, žlab a hřebenáč ve scéně', c1.krytina && c1.podbiti && c1.celo && c1.zlab && c1.hrebenac, JSON.stringify(c1));
        const tl = await p.vyhodnot(`(() => {
            const T = window.THREE, dum = window._kk3d.dumSkupina;
            const vrch = dum.children.find(o => o.userData.krytina), spod = dum.children.find(o => o.userData.podbiti);
            const a = new T.Box3().setFromObject(vrch), b = new T.Box3().setFromObject(spod);
            return { vrch: +a.max.y.toFixed(3), spod: +b.max.y.toFixed(3), T: +${D}._tloustkaStrechy().toFixed(3) };
        })()`);
        kontrola('vrch krytiny je o tloušťku desky nad podbitím', Math.abs(tl.vrch - tl.spod - tl.T) < 0.01, JSON.stringify(tl));
        const mat = await p.vyhodnot(`(() => { const m = window._kk3d.dumSkupina.children.find(o => o.userData.krytina).material;
            return { vzhled: m.userData.krytinaVzhled, normal: !!m.normalMap, ao: !!m.aoMap, barva: '#' + m.color.getHexString() }; })()`);
        kontrola('nová střecha má červenou pálenou tašku z textury', mat.vzhled === 'taska-cervena' && mat.normal && mat.ao && mat.barva === '#ffffff', JSON.stringify(mat));
        await p.vyhodnot(`(() => { ${KAMERA} document.querySelectorAll('.kk-3d-help, .kk-coords').forEach(e => e.style.display = 'none'); return kamera(55, 9, 19, 2.6); })()`);
        await snimek3d('01-sedlova-celek.png');
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(30, 3.2, 6.5, 2.9, [4, 3]); })()`);
        await snimek3d('02-sedlova-okap-zblizka.png');
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(-40, 2.3, 4.5, 2.8, [5.35, -4.2]); })()`);
        await snimek3d('03-roh-okapu.png');
        const okraj = await p.vyhodnot(`(() => { const d = ${D}, dum = window._kk3d.dumSkupina;
            const barva = (k) => { const o = dum.children.find(x => x.userData[k]); return o ? '#' + o.material.color.getHexString() : null; };
            return { podbiti: barva('podbiti'), fasada: d.engine.dum.barvy.fasada.toLowerCase(), celo: barva('celo'), zlab: barva('zlab'), hrebenac: barva('hrebenac'),
                krytina: window.Krytiny3d.podleId('taska-cervena').hex }; })()`);
        kontrola('podbití v barvě fasády, čelo a žlab tmavší odstín krytiny, hřebenáč v barvě krytiny',
            okraj.podbiti === okraj.fasada && okraj.celo === okraj.zlab && okraj.hrebenac === okraj.krytina && okraj.celo !== okraj.krytina, JSON.stringify(okraj));

        console.log('\n2) Panel: vzhledy u tašek, barva u plechu');
        await p.vyhodnot(`(() => { const d = ${D}; d.podlaziUprava = 'strecha'; d._selectionTick++; return true; })()`);
        await pauza(500);
        const panel = await p.vyhodnot(`(() => { const t = document.querySelectorAll('[data-vzhledy-krytiny] [data-vzhled]');
            return { pocet: t.length, ocekavano: window.Krytiny3d.typu('taska').length, aktivni: document.querySelector('[data-vzhledy-krytiny] .kk-aktivni')?.dataset.vzhled, barva: !!document.querySelector('[data-uprava=strecha] [data-barva-symbol]') }; })()`);
        kontrola('pálená taška nabízí vzhledy, ne volnou barvu', panel.pocet === panel.ocekavano && panel.aktivni === 'taska-cervena' && !panel.barva, JSON.stringify(panel));
        await p.klik('[data-vzhledy-krytiny] [data-vzhled="taska-cerna-lisejnik"]');
        await pauza(800);
        await cekejTextury();
        const po = await p.vyhodnot(`(() => { const d = ${D}; const m = window._kk3d.dumSkupina.children.find(o => o.userData.krytina).material;
            return { barva: d.engine.dum.strecha.barva, vzhled: m.userData.krytinaVzhled, ocekavana: window.Krytiny3d.podleId('taska-cerna-lisejnik').hex }; })()`);
        kontrola('klik na vzorek změní vzhled ve 3D', po.vzhled === 'taska-cerna-lisejnik' && po.barva === po.ocekavana, JSON.stringify(po));
        await p.vyhodnot(`(async () => { const d = ${D}; await d.undo(); await new Promise(r => setTimeout(r, 600)); return true; })()`);
        const zpet = await p.vyhodnot(`${D}.engine.dum.strecha.barva`);
        kontrola('Zpět vrátí původní vzhled', zpet !== po.barva, zpet);
        await p.vyhodnot(`(() => { ${D}.setStrecha('krytina', 'falc'); return true; })()`);
        await pauza(500);
        const plech = await p.vyhodnot(`(() => ({ vzhledy: document.querySelectorAll('[data-vzhledy-krytiny] [data-vzhled]').length, barva: !!document.querySelector('[data-uprava=strecha] [data-barva-symbol]') }))()`);
        kontrola('falcovaný plech má volbu barvy místo vzhledů', plech.vzhledy === 0 && plech.barva, JSON.stringify(plech));
        await p.vyhodnot(`(() => { ${D}.setStrecha('barva', '#3f4347'); ${D}.setStrecha('krytina', 'taska'); return true; })()`);
        const stara = await p.vyhodnot(`(() => ({ barva: ${D}.engine.dum.strecha.barva, cerna: window.Krytiny3d.podleId('taska-cerna').hex }))()`);
        kontrola('antracit z plechu se u tašky srovná na nejbližší vzhled (černá)', stara.barva === stara.cerna, JSON.stringify(stara));

        console.log('\n3) Všechny typy krytin, snímky');
        const typy = ['taska', 'betonova', 'bobrovka', 'sindel', 'bridlice', 'falc', 'trapez', 'vlnity'];
        for (const typ of typy) {
            const vzhledy = await p.vyhodnot(`window.Krytiny3d.typu(${JSON.stringify(typ)}).map(v => [v.id, v.hex, !!v.prebarvit])`);
            for (const [id, hex, prebarvit] of vzhledy) {
                await p.vyhodnot(`(() => { const d = ${D}; d.setStrecha('krytina', ${JSON.stringify(typ)}); d.setStrecha('barva', ${JSON.stringify(prebarvit ? '#7a2e24' : hex)}); return true; })()`);
                await pauza(700);
                await cekejTextury();
                const v = await p.vyhodnot(`window._kk3d.dumSkupina.children.find(o => o.userData.krytina).material.userData.krytinaVzhled`);
                kontrola(`${typ}: vzhled ${id}`, v === id, v);
                await p.vyhodnot(`(() => { ${KAMERA} return kamera(55, 9, 19, 2.6); })()`);
                await snimek3d(`10-${id}.png`);
            }
        }

        console.log('\n4) Valbová střecha: nároží s hřebenáči');
        await p.vyhodnot(`(async () => { const d = ${D}; d.setStrecha('krytina', 'betonova'); d.setStrecha('barva', window.Krytiny3d.podleId('betonova-cihlova').hex);
            d.setStrecha('typ', 'valbova'); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await cekejTextury();
        const c4 = await p.vyhodnot(`(() => { ${KAMERA} return casti(); })()`);
        const hreb = await p.vyhodnot(`(() => { const o = window._kk3d.dumSkupina.children.find(o => o.userData.hrebenac); return o ? o.geometry.getAttribute('position').count : 0; })()`);
        // Hřeben + 4 nároží = 5 půlválců po 8 dílech × 2 trojúhelníky × 3 vrcholy
        kontrola('valbová má hřebenáč na hřebeni i na čtyřech nárožích', hreb === 5 * 8 * 2 * 3, 'vrcholů ' + hreb + ' ' + JSON.stringify(c4));
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(40, 10, 19, 2.6); })()`);
        await snimek3d('20-valbova.png');

        console.log('\n5) Plochá střecha s atikou');
        await p.vyhodnot(`(async () => { const d = ${D}; d.setStrecha('typ', 'plocha'); d.setStrecha('barva', '#3b3f44'); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await cekejTextury();
        const plocha = await p.vyhodnot(`(() => { const dum = window._kk3d.dumSkupina;
            const k = dum.children.find(o => o.userData.krytina);
            return { vzhled: k?.material.userData.krytinaVzhled, barva: k ? '#' + k.material.color.getHexString() : null, desek: dum.children.filter(o => o.userData.strecha).length }; })()`);
        kontrola('plochá střecha má asfaltový pás ve zvolené barvě a atiku', plocha.vzhled === 'asfaltovy-pas' && plocha.barva === '#3b3f44' && plocha.desek >= 3, JSON.stringify(plocha));
        await p.vyhodnot(`(() => { ${KAMERA} return kamera(40, 9, 17, 2.6); })()`);
        await snimek3d('30-plocha.png');

        console.log('\n6) Sdílený odkaz nese vzhled krytiny');
        await p.vyhodnot(`(async () => { const d = ${D}; d.setStrecha('typ', 'sedlova'); d.setStrecha('krytina', 'taska'); d.setStrecha('barva', window.Krytiny3d.podleId('taska-zvetrala').hex); await new Promise(r => setTimeout(r, 800)); return true; })()`);
        await cekejTextury();
        const model = await p.vyhodnot(`(() => { const m = ${D}._zapecModel(); return m.materialy.filter(x => x.krytina).map(x => x.krytina); })()`);
        kontrola('pečený model má krytinu jako vzhled', model.includes('taska-zvetrala'), JSON.stringify(model));

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
