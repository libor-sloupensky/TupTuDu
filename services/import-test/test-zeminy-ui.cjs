/**
 * Základy a materiály v editoru: bez parcely nic, řádek Základy, blok Materiály, kóta = výška nad
 * terénem, části domu, Zpět, uložení, výšková data a stabilní výška domu ve 3D.
 *
 * Volitelně JSON skutečného domu s částečným sklepem (data konceptu), načte se jen do testovacího:
 * node services/import-test/test-zeminy-ui.cjs [složka snímků] [data.json]
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const PARCELA = `[{ cislo: 'test', label: 'test', polygon_wgs84: [[50, 15], [50.0005, 15], [50.0005, 15.0008], [50, 15.0008]] }]`;

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const blizko = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const js = (t) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; ${t} })()`);
    const stav = () => js(`const z = d.zemina; return {
        ma: d.maZaklady, kota: e.dum.posunVysky, zaklady: e.dum.zaklady,
        radek: !!document.querySelector('[data-radek=zaklady]'), blok: !!document.querySelector('[data-materialy]'),
        casti: z ? z.casti.map(c => ({ id: c.id, nazev: c.nazev, typ: c.typ, plocha: c.plocha, vykopek: c.vykopek, pasy: c.delkaPasu })) : [],
        vykopek: z && { ...z.vykopek }, ornice: z && { ...z.ornice }, hromada: z && z.hromada, mimo: z && z.mimoData,
        text: document.querySelector('[data-materialy]')?.innerText || '',
    };`);
    try {
        console.log('1) Přihlášení a nový koncept');
        await p.jdiNa(ZAKLAD + '/login');
        await p.cekej(`!!document.querySelector('input[name=password]')`, 20000, 'login');
        await p.vyhodnot(`(() => { const e = document.querySelector('input[name=email]') || document.querySelector('input[type=email]'); e.value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); return true; })()`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest zemina ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n2) Dům bez parcely: základy nejsou (byt)');
        await js(`e.addWall(0, 0, 12*X, 0, 0.3, 'obvodova'); e.addWall(12*X, 0, 12*X, 10*X, 0.3, 'obvodova'); e.addWall(12*X, 10*X, 0, 10*X, 0.3, 'obvodova'); e.addWall(0, 10*X, 0, 0, 0.3, 'obvodova');
            e.addWall(6*X, 0, 6*X, 10*X, 0.2, 'nosna'); d.renderer.render(); d.autoSave('Stěny'); d._selectionTick++; return true;`);
        await pauza(1500);
        let s = await stav();
        kontrola('bez parcely žádný řádek ani blok', !s.ma && !s.radek && !s.blok, JSON.stringify([s.ma, s.radek, s.blok]));
        kontrola('kóta 1.NP zůstává 0', s.kota === 0 && !s.zaklady);

        console.log('\n3) Parcela bez výškových dat: rovina na stávající ±0');
        await js(`d.katastrParcely = ${PARCELA}; d._zalozZaklady(); d.podlaziUprava = 'zaklady'; d.panelOpen.parcela = true; return true;`);
        await pauza(500);
        s = await stav();
        kontrola('objeví se řádek Základy a blok Materiály', s.ma && s.radek && s.blok);
        kontrola('výška nad terénem je výchozí kóta 0,30', blizko(s.kota, 0.3, 1e-6), String(s.kota));
        kontrola('jedna část pod 1.NP na pasech', s.casti.length === 1 && s.casti[0].typ === 'pasy', JSON.stringify(s.casti.map(c => c.typ)));
        const obrysX = 12.3 * 10.3;
        kontrola('plocha je obrys domu po líc', blizko(s.casti[0].plocha, obrysX, 3), s.casti[0].plocha.toFixed(1));
        kontrola('výkopek jen z rýh, 54 m pasů', blizko(s.casti[0].pasy, 54, 3) && s.vykopek.vykopano > 15 && s.vykopek.vykopano < 25, `${s.casti[0].pasy.toFixed(1)} m, ${s.vykopek.vykopano.toFixed(1)} m³`);
        const vPanelu = await p.vyhodnot(`!!document.querySelector('[data-zaklady-panel] [data-materialy]')`);
        kontrola('Materiály jsou v panelu Základů', vPanelu);
        const sbaleno = await p.vyhodnot(`[...document.querySelectorAll('[x-model=katastrCislo]')][0].closest('details').querySelector('.rounded.border details').open`);
        kontrola('detail parcely je po načtení sbalený', sbaleno === false);
        kontrola('blok ukazuje rostlý i nakypřený objem', /rostlý/.test(s.text) && /nakypřený/.test(s.text) && /Výkopek/.test(s.text) && /Ornice/.test(s.text), s.text.replace(/\s+/g, ' ').slice(0, 120));
        const rovina = await js(`return d.terenPopis`);
        kontrola('popis říká rovina', /rovina/.test(rovina), rovina);

        console.log('\n4) Nastavení v panelu');
        const pole = (klic, hodnota) => p.vyhodnot(`(() => { const i = document.querySelector('[data-zaklad=${klic}]'); i.value = ${hodnota}; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        const pred = s.vykopek.vykopano;
        await pole('sirkaPasu', 60);
        await pauza(300);
        s = await stav();
        kontrola('šířka pasu z pole změní výkop', s.vykopek.vykopano > pred + 2 && s.zaklady.sirkaPasu === 0.6, s.vykopek.vykopano.toFixed(1));
        await pole('nadTerenem', 50);
        await pauza(300);
        s = await stav();
        const kotaPole = await js(`return { kota: e.kotaPodlazi(d._podlazi1NP().id), posun: d.posunDomu }`);
        kontrola('výška nad terénem je kóta 1.NP', blizko(kotaPole.kota, 0.5, 1e-6) && blizko(kotaPole.posun, 0.5, 1e-6), JSON.stringify(kotaPole));
        await js(`d.undo?.(); return true;`);
        await pauza(300);
        const poZpet = await js(`return e.dum.posunVysky`);
        kontrola('Zpět vrátí výšku', blizko(poZpet, 0.3, 1e-6), String(poZpet));
        await js(`d.undo?.(); return true;`);
        await pauza(300);
        s = await stav();
        kontrola('Zpět vrátí i nastavení základů', !s.zaklady?.sirkaPasu && s.radek, JSON.stringify(s.zaklady));
        kontrola('krok z doby před parcelou neztratí výšku nad terénem', blizko(s.kota, 0.3, 1e-6), String(s.kota));
        await js(`d.podlaziUprava = 'zaklady'; return true;`);
        await pauza(300);
        await p.snimek(path.join(vystup, 'zemina-panel.png'));

        console.log('\n5) Typ základů');
        await p.vyhodnot(`(() => { const i = document.querySelector('[data-zaklad-typ=P1]'); i.value = 'stavajici'; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await pauza(300);
        s = await stav();
        kontrola('stávající stavba nic nekope', s.vykopek.vykopano === 0 && s.ornice.vykopano === 0 && s.radek);
        await p.vyhodnot(`(() => { const i = document.querySelector('[data-zaklad-typ=P1]'); i.value = 'deska'; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await pauza(300);
        s = await stav();
        kontrola('deska nemá rýhy', s.vykopek.ryhy === 0);
        await p.vyhodnot(`(() => { const i = document.querySelector('[data-zaklad-typ=P1]'); i.value = 'pasy'; i.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await pauza(300);

        console.log('\n6) Sklep a další patro');
        await js(`d.pridatPodlazi('sklep'); return true;`);
        await pauza(500);
        s = await stav();
        kontrola('přibude část pod sklepem, také na pasech', s.casti.length === 2 && s.casti[0].typ === 'pasy' && s.casti[1].plocha < 1, JSON.stringify(s.casti.map(c => [c.nazev, c.typ, Math.round(c.plocha)])));
        kontrola('výkopu výrazně přibude', s.vykopek.vykopano > 300, s.vykopek.vykopano.toFixed(0));
        await js(`d.naPodlazi(d._podlazi1NP().id); d.pridatPodlazi('nahoru'); return true;`);
        await pauza(500);
        const prvni = await stav();
        kontrola('patro nad 1.NP se do základů nepočítá', prvni.casti.length === 2, JSON.stringify(prvni.casti.map(c => c.nazev)));

        console.log('\n7) Výšková data a výška domu ve 3D');
        const body = await js(`const o = []; const M = 111320, c = Math.cos(50 * Math.PI / 180);
            for (let i = -40; i <= 40; i++) for (let j = -40; j <= 40; j++) o.push([50 + j * 2 / M, 15 + i * 2 / (M * c), 400 + i * 0.2]);
            d.renderer._fixedWgsCenter = { lat: 50, lon: 15 }; d.vyskovyProfil = { body: o, vyska_min: 392, vyska_max: 408, vyskovy_rozdil: 16 }; return o.length;`);
        await pauza(500);
        const t = await js(`return { popis: d.terenPopis, nula: d._terenDomu().nula, vyk: d.zemina.vykopek.vykopano }`);
        kontrola('terén z výškových dat v m n.m.', /m n\.m\./.test(t.popis) && t.nula > 400, `${body} bodů, ${t.popis}`);
        const y = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1500));
            const g = window._kk3d.wallGroup; const prvni = g.position.y; const min = window._kk3d.terrainMinH; const nula = d._terenDomu().nula;
            const dalsi = d.seznamPodlazi.find(p => !p.aktivni); d.naPodlazi(dalsi.id); d._build3d(); await new Promise(r => setTimeout(r, 400));
            return { prvni, druha: g.position.y, cil: nula - min }; })()`);
        kontrola('dům ve 3D stojí na ±0 terénu', blizko(y.prvni, y.cil, 0.01), JSON.stringify(y));
        kontrola('přepnutí podlaží s domem nehne', blizko(y.prvni, y.druha, 1e-6), JSON.stringify(y));
        await p.snimek(path.join(vystup, 'zemina-3d.png'));

        console.log('\n7b) Jáma po skrytí celého domu');
        // Barva pixelu nad bodem jámy i terénu: zemina jako díra, ne zelený terén přes ni
        const pixel = `const pixel = (x, y, z) => { const r = _3d.renderer; r.render(_3d.scene, _3d.camera); const v = new THREE.Vector3(x, y, z).project(_3d.camera); const g = r.getContext(); const b = new Uint8Array(4); g.readPixels(Math.round((v.x + 1) / 2 * g.drawingBufferWidth), Math.round((v.y + 1) / 2 * g.drawingBufferHeight), 1, 1, g.RGBA, g.UNSIGNED_BYTE, b); return [b[0], b[1], b[2]]; };`;
        await js(`d.skryte3d = []; d._nastavViditelnost3d(); d._selectionTick++; return true;`);
        await pauza(300);
        const jamaPred = await js(`const _3d = window._kk3d; const skryteVse = d.seznamPodlazi.every(x => !x.viditelne3d); return { zap: _3d.jamaUniformy?.uJamaZap.value, vidna: !!_3d.jama?.visible, skryteVse };`);
        kontrola('s viditelným domem jáma není a terén je celý', !jamaPred.skryteVse && jamaPred.zap === 0 && !jamaPred.vidna, JSON.stringify(jamaPred));
        await js(`d.seznamPodlazi.forEach(x => { if (x.viditelne3d) d.naPodlazi(x.id); }); return true;`);
        await pauza(800);
        const jamaVidet = await js(`const _3d = window._kk3d; const u = _3d.jamaUniformy; const m = _3d.jama; let min = Infinity;
            if (m) { const q = m.geometry.attributes.position; for (let i = 0; i < q.count; i++) min = Math.min(min, q.getY(i)); } ${pixel}
            const dno = _3d.wallGroup.position.y + e.kotyPodlazi().get(e.dum.podlazi.find(x => x.typ === 'sklep').id) - 0.45;
            const sx = 6, sz = 5; const yKolem = _3d.wallGroup.position.y + d._terenDomu().fn(10, -14);
            _3d.camera.position.set(sx + 8, 30, sz + 8); _3d.controls.target.set(sx, 0, sz); _3d.camera.zoom = 0.25; _3d.camera.updateProjectionMatrix(); _3d.controls.update();
            return { vidna: m.visible, zap: u.uJamaZap.value, min, dno, trojuhelniku: m.geometry.index.count / 3, mimoScenuDomu: m.parent === _3d.scene,
                barvaJamy: pixel(sx, dno, sz), barvaTerenu: pixel(10, yKolem, -14) };`);
        kontrola('po skrytí všech podlaží je jáma vidět a terén má díru', jamaVidet.vidna && jamaVidet.zap === 1 && jamaVidet.mimoScenuDomu, JSON.stringify([jamaVidet.vidna, jamaVidet.zap, jamaVidet.trojuhelniku]));
        kontrola('dno sklepu je pod úrovní desky, rýhy o pas níž', blizko(jamaVidet.min, jamaVidet.dno - 0.5, 0.2), `${jamaVidet.min.toFixed(2)} / ${jamaVidet.dno.toFixed(2)}`);
        const [jr, jg, jb] = jamaVidet.barvaJamy, [tr, tg, tb] = jamaVidet.barvaTerenu;
        kontrola('jáma má barvu zeminy, ne terénu', jr > jg + 8 && jg > jb && jr < 170, JSON.stringify(jamaVidet.barvaJamy));
        kontrola('terén kolem zůstal zelený', tg >= tr && tg > tb + 20, JSON.stringify(jamaVidet.barvaTerenu));
        await pauza(400);
        await p.snimek(path.join(vystup, 'zemina-jama.png'));
        const vykopPng = await js(`const cv = d._snimekScény(); const g = cv.getContext('2d'); const b = g.getImageData(Math.floor(cv.width / 2), Math.floor(cv.height / 2), 1, 1).data; return [b[0], b[1], b[2]];`);
        kontrola('3D PNG se skrytým domem zachytí výkop', vykopPng[0] > vykopPng[1] + 8 && vykopPng[1] > vykopPng[2], JSON.stringify(vykopPng));
        const jamaOdkop = await js(`const m0 = window._kk3d.jama.geometry.index.count; d.setZaklady('odkop', 2); return m0;`);
        await pauza(800);
        const jamaPoOdkopu = await js(`return window._kk3d.jama.geometry.index.count;`);
        kontrola('změna odkopu jámu hned přestaví', jamaPoOdkopu > jamaOdkop, `${jamaOdkop} → ${jamaPoOdkopu}`);
        await js(`d.undo?.(); return true;`);
        await pauza(500);
        const viditelne = (ids) => js(`d.skryte3d = e.dum.podlazi.map(x => x.id).filter(id => !${JSON.stringify(ids)}.includes(id)); d._nastavViditelnost3d(); d._selectionTick++; return { troj: window._kk3d.jama?.geometry.index.count / 3, zap: window._kk3d.jamaUniformy.uJamaZap.value, vidna: !!window._kk3d.jama?.visible };`);
        const idPodlazi = await js(`const np = d._podlazi1NP().id; return { np, sklep: e.dum.podlazi.find(x => x.typ === 'sklep').id, horni: e.dum.podlazi[e.dum.podlazi.findIndex(x => x.id === np) + 1].id };`);
        const vse = await viditelne([]);
        const horniVidet = await viditelne([idPodlazi.horni]);
        kontrola('vyšší patro může zůstat: jáma je stejná jako po skrytí všeho', horniVidet.zap === 1 && horniVidet.troj === vse.troj, JSON.stringify([vse, horniVidet]));
        await pauza(400);
        await p.snimek(path.join(vystup, 'zemina-jama-pod-patrem.png'));
        const jenSklep = await viditelne([idPodlazi.np, idPodlazi.horni]);
        kontrola('skrytý jen sklep: jáma pod ním, 1.NP zůstává', jenSklep.zap === 1 && jenSklep.vidna && jenSklep.troj > 1000, JSON.stringify(jenSklep));
        const jen1NP = await viditelne([idPodlazi.sklep, idPodlazi.horni]);
        kontrola('skryté jen 1.NP: má vlastní menší výkop', jen1NP.zap === 1 && jen1NP.troj > 1000 && jen1NP.troj !== jenSklep.troj, JSON.stringify(jen1NP));
        const zadnePodzemni = await viditelne([idPodlazi.sklep, idPodlazi.np]);
        kontrola('skryté jen patro nad terénem: terén je celý', zadnePodzemni.zap === 0 && !zadnePodzemni.vidna, JSON.stringify(zadnePodzemni));
        // Zemina uvnitř domu: 1.NP nízko, terén na vyšší straně je nad jeho podlahou, díváme se shora dovnitř
        await js(`d.setNadTerenem(0.1); d._selectionTick++; return true;`);
        await pauza(600);
        await js(`d.skryte3d = e.dum.podlazi.map(x => x.id).filter(id => id === ${JSON.stringify(idPodlazi.np)} || id === ${JSON.stringify(idPodlazi.sklep)}); d.skryte3d = e.dum.podlazi.map(x => x.id).filter(id => !d.skryte3d.includes(id)); d._nastavViditelnost3d(); d._selectionTick++; return true;`);
        await pauza(800);
        const vnitrek = await js(`const _3d = window._kk3d; ${pixel}
            const fn = d._terenDomu().fn, y0 = _3d.wallGroup.position.y, kota = e.kotaPodlazi(d._podlazi1NP().id);
            const body = []; for (let x = 0.6; x < 11.5; x += 0.7) for (let z = 0.6; z < 9.5; z += 0.7) if (fn(x, z) > kota + 0.05) body.push([x, z]);
            _3d.camera.position.set(6, 40, 5.01); _3d.controls.target.set(6, 0, 5); _3d.camera.zoom = 0.3; _3d.camera.updateProjectionMatrix(); _3d.controls.update();
            const zelenych = body.filter(([x, z]) => { const [r, g, b] = pixel(x, y0 + fn(x, z), z); return g > r + 3 && g > b + 20; }).length;
            const vne = pixel(-3, y0 + fn(-3, -4), -4);
            const [r2, g2, b2] = pixel(13.5, y0 + fn(13.5, -6), -6);
            return { nadPodlahou: body.length, zelenych, venku: [r2, g2, b2], zap: _3d.vnitrekUniformy.uVnitrekZap.value };`);
        kontrola('terén je místy nad podlahou 1.NP, jinak by test nic neříkal', vnitrek.nadPodlahou > 3, String(vnitrek.nadPodlahou));
        kontrola('uvnitř domu zemina není', vnitrek.zap === 1 && vnitrek.zelenych === 0, JSON.stringify(vnitrek));
        const [vr, vg, vb] = vnitrek.venku;
        kontrola('vně domu zemina zůstává', vg >= vr && vg > vb + 20, JSON.stringify(vnitrek.venku));
        await pauza(300);
        await p.snimek(path.join(vystup, 'zemina-vnitrek.png'));
        await js(`d.undo?.(); d.skryte3d = []; d._nastavViditelnost3d(); d._selectionTick++; return true;`);
        await pauza(300);
        const jamaZpet = await js(`const _3d = window._kk3d; return { zap: _3d.jamaUniformy.uJamaZap.value, vidna: _3d.jama.visible };`);
        kontrola('s viditelnými podlažími se terén zase zavře', jamaZpet.zap === 0 && !jamaZpet.vidna, JSON.stringify(jamaZpet));
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); d.rezim3d = false; return true; })()`);
        await pauza(400);

        console.log('\n8) Uložení');
        await p.vyhodnot(`(() => { const i = document.querySelector('[data-zaklad=odkop]'); if (i) { i.value = 120; i.dispatchEvent(new Event('change', { bubbles: true })); } else { ${D}.setZaklady('odkop', 1.2); } return true; })()`);
        await pauza(3500);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await pauza(1500);
        const ulozeno = await js(`return { odkop: e.dum.zaklady?.odkop, kota: e.dum.posunVysky }`);
        kontrola('nastavení i výška přežijí načtení', ulozeno.odkop === 1.2 && blizko(ulozeno.kota, 0.3, 1e-6), JSON.stringify(ulozeno));

        if (process.argv[3]) {
            console.log('\n8b) Stěny vedle sklepu leží na zemině');
        const nep = await js(`const sklep = e.dum.podlazi.find(x => x.typ === 'sklep').id, np = d._podlazi1NP().id;
            d.naPodlazi(sklep);
            for (const id of [...e.walls.keys()]) e.removeWall(id);
            e.addWall(0, 0, 6*X, 0, 0.3, 'obvodova'); e.addWall(6*X, 0, 6*X, 10*X, 0.3, 'obvodova'); e.addWall(6*X, 10*X, 0, 10*X, 0.3, 'obvodova'); e.addWall(0, 10*X, 0, 0, 0.3, 'obvodova');
            d.renderer.render();
            d.naPodlazi(np);
            const bezStredni = d.podepreniPodlazi(np).size;
            const w = e.addWall(3*X, 0, 3*X, 10*X, 0.2, 'nosna');
            const v = d.podepreniPodlazi(np);
            const horni = e.dum.podlazi[e.dum.podlazi.findIndex(x => x.id === np) + 1].id;
            d.naPodlazi(horni);
            const pp = d.podepreniPodlazi(horni);
            const pred = pp.size;
            e.addWall(14*X, 0, 14*X, 10*X, 0.3, 'nosna');
            const presah = d.podepreniPodlazi(horni).size;
            d.naPodlazi(np);
            return { bezStredni, po: v.size, delka: [...v.values()][0]?.delka, pred, presah };`);
        kontrola('stěny mimo sklep nejsou nepodepřené', nep.bezStredni === 0, JSON.stringify(nep));
        kontrola('nosná stěna nad vnitřkem sklepu nepodepřená zůstává', nep.po === 1 && nep.delka > 8, JSON.stringify(nep));
        kontrola('přesah vyššího patra nepodepřený zůstává', nep.presah > nep.pred, JSON.stringify(nep));

        console.log('\n8c) Dům zvednutý nad terén, prodloužení základu vypnuté');
        const zvednuty = await js(`const np = d._podlazi1NP().id; d.naPodlazi(np); d.katastrParcely = ${PARCELA}; d.vyskovyProfil = null; d._zalozZaklady(); d.setVolbuZakladu('prodlouzit', false); d.setNadTerenem(2); d._selectionTick++; return true;`).then(() => pauza(500)).then(() => js(`const np = d._podlazi1NP().id; const z = d.zemina; const v = d.podepreniPodlazi(np);
            return { popis: d.zakladyPopis, chybi: d.zakladyChybi, oznaceno: v.size, zakladChybi: [...v.values()].some(x => x.chybiZaklad), plocha: z.bezZakladu, casti: z.casti.map(c => [c.nazev, Math.round(c.vykopek), Math.round(c.bezZakladu)]) };`));
        kontrola('část vedle sklepu hlásí chybějící základ', /chybí základ/.test(zvednuty.popis) && /1\.NP/.test(zvednuty.chybi) && zvednuty.plocha > 20, JSON.stringify(zvednuty));
        kontrola('její stěny jsou šrafované jako bez základu', zvednuty.oznaceno > 0 && zvednuty.zakladChybi, JSON.stringify(zvednuty));
        const vyber = await js(`const np = d._podlazi1NP().id; const [id] = [...d.podepreniPodlazi(np)].find(([, x]) => x.chybiZaklad); d.renderer.setSelection([id]); d._selectionTick++; return { ...d.inspector.podepreni };`);
        kontrola('panel stěny říká chybí základ', vyber?.chybiZaklad === true, JSON.stringify(vyber));
        await pauza(300);
        await p.snimek(path.join(vystup, 'zemina-chybi-zaklad.png'));
        await js(`d.renderer.clearSelection(); d.setNadTerenem(0.3); d._selectionTick++; return true;`);
        await pauza(500);
        const zpetDolu = await js(`return { popis: d.zakladyPopis, oznaceno: [...d.podepreniPodlazi(d._podlazi1NP().id).values()].filter(x => x.chybiZaklad).length };`);
        kontrola('po snížení základ zase je', !/chybí/.test(zpetDolu.popis) && zpetDolu.oznaceno === 0, JSON.stringify(zpetDolu));

        console.log('\n8d) Základ prodloužený k zemi');
        kontrola('pod dům je výchozí výkopek', await js(`return d.zakladyHodnota('podDum') === 'vykopek';`));
        await js(`d.setVolbuZakladu('podDum', 'sterk'); d.setVolbuZakladu('prodlouzit', true); d.setNadTerenem(2); d.podlaziUprava = 'zaklady'; d._selectionTick++; return true;`);
        await pauza(500);
        const prodl = await js(`const np = d._podlazi1NP().id; return { popis: d.zakladyPopis, chybi: d.zakladyChybi, sraf: [...d.podepreniPodlazi(np).values()].filter(x => x.chybiZaklad).length,
            nad: d.zemina.zakladNadTerenem, napis: document.querySelector('[data-zaklad-nad-terenem]')?.innerText, sterk: d.zemina.sterk, material: document.querySelector('[data-material=sterk]')?.innerText,
            volba: document.querySelector('[data-zaklad-volba=prodlouzit]')?.checked, sklep: d.zemina.casti[0].vykopek };`);
        kontrola('výchozí je zapnuté: základ nechybí a stěny nejsou šrafované', prodl.volba === true && !/chybí/.test(prodl.popis) && prodl.chybi === '' && prodl.sraf === 0, JSON.stringify(prodl));
        kontrola('panel říká, o kolik základ vystupuje nad terén', blizko(prodl.nad, 1.55, 0.01) && /1,55 m/.test(prodl.napis || ''), prodl.napis);
        kontrola('Materiály ukazují štěrk pod dům', prodl.sterk > 10 && /Štěrk/.test(prodl.material || ''), prodl.material);
        const vykopkem = await js(`const a = d.zemina.vykopek.prebytek, s = d.zemina.sterk; d.setVolbuZakladu('podDum', 'vykopek'); const b = d.zemina; const r = { sterk: b.sterk, rozdil: a - b.vykopek.prebytek, s, vyber: document.querySelector('[data-zaklad-volba=podDum]')?.value }; return r;`);
        kontrola('volba výkopek: štěrk zmizí a přebytek se o něj zmenší', vykopkem.sterk === 0 && blizko(vykopkem.rozdil, vykopkem.s, 1), JSON.stringify(vykopkem));
        const zpetVolba = await js(`d.setVolbuZakladu('podDum', 'sterk'); const pred = e.dum.zaklady.podDum; d.undo(); return { pred, po: e.dum.zaklady.podDum };`);
        kontrola('volba je jeden krok Zpět', zpetVolba.pred === 'sterk' && zpetVolba.po === 'vykopek', JSON.stringify(zpetVolba));
        await js(`d.setVolbuZakladu('podDum', 'sterk'); return true;`);
        const deska = await js(`const id = d._podlazi1NP().id; const pred = d.zemina.casti.find(c => c.id === id).vykopek; d.setTypZakladu(id, 'deska'); d._selectionTick++; return { id, pred };`);
        await pauza(200);
        const poli = await js(`const n = (k) => { const x = document.querySelector('[data-zaklad=' + k + ']'); return x && x.getBoundingClientRect().width > 0 ? x.value : null; }; document.querySelector('[data-zaklady-panel] details').open = true; return { deska: n('skladbaDeska'), pasy: n('skladba') };`);
        kontrola('dům s pasy i deskou ukáže obě tloušťky, deska 70 cm', poli.deska === '70' && poli.pasy === '45', JSON.stringify(poli));
        await js(`d.setTypZakladu(${JSON.stringify(deska.id)}, 'pasy'); return true;`);
        const z3d = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1200));
            const m = window._kk3d.dumSkupina.children.filter(o => o.userData.zaklad);
            const obal = new THREE.Box3(); m.forEach(x => { x.geometry.computeBoundingBox(); obal.union(x.geometry.boundingBox); });
            const model = d._zapecModel(); const np = d._podlazi1NP().id;
            return { pocet: m.length, od: obal.min.y, do: obal.max.y, visible: m.every(x => x.visible), vModelu: model.meshe.some(k => k.skupina === np), np }; })()`);
        kontrola('ve 3D je pás od podlahy až pod terén', z3d.pocet > 0 && blizko(z3d.do, 2, 0.01) && blizko(z3d.od, -0.3, 0.01) && z3d.visible, JSON.stringify(z3d));
        await pauza(300);
        await p.snimek(path.join(vystup, 'zemina-zaklad-3d.png'));
        const vyp3d = await p.vyhodnot(`(async () => { const d = ${D}; d.setVolbuZakladu('prodlouzit', false); await new Promise(r => setTimeout(r, 300)); const n = window._kk3d.dumSkupina.children.filter(o => o.userData.zaklad).length; d.setVolbuZakladu('prodlouzit', true); await new Promise(r => setTimeout(r, 300)); return { vypnuto: n, zapnuto: window._kk3d.dumSkupina.children.filter(o => o.userData.zaklad).length }; })()`);
        kontrola('vypnutí a zapnutí překreslí 3D', vyp3d.vypnuto === 0 && vyp3d.zapnuto > 0, JSON.stringify(vyp3d));
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); d.rezim3d = false; d.setNadTerenem(0.3); d.podlaziUprava = null; d._selectionTick++; return true; })()`);
        await pauza(300);

        console.log('\n9) Skutečný dům s částečným sklepem');
            const data = fs.readFileSync(process.argv[3], 'utf8');
            await js(`e.fromJSON(${data}); d.renderer.render(); d.katastrParcely = ${PARCELA}; d.vyskovyProfil = null; d._zalozZaklady(); d.panelOpen.parcela = true; d.podlaziUprava = 'zaklady'; d._selectionTick++; return true;`);
            await pauza(1500);
            s = await stav();
            kontrola('dvě části: pod 1.PP a pod 1.NP, podkroví ne', s.casti.map(c => c.nazev).join() === '1.PP,1.NP', JSON.stringify(s.casti.map(c => [c.nazev, c.typ, Math.round(c.plocha), Math.round(c.vykopek), Math.round(c.pasy)])));
            kontrola('přebytek se sčítá z obou částí', s.casti[0].vykopek > 100 && s.casti[1].vykopek > 0, `vykopáno ${s.vykopek.vykopano.toFixed(0)}, zpět ${s.vykopek.zpet.toFixed(0)}, přebytek ${s.vykopek.prebytek.toFixed(0)} / ${s.vykopek.prebytekNakypreny.toFixed(0)}; ornice ${s.ornice.prebytek.toFixed(0)} / ${s.ornice.prebytekNakypreny.toFixed(0)}; hromada ${s.hromada.toFixed(0)}`);
            await p.vyhodnot(`(() => { const r = document.querySelector('[data-zaklady-panel]'); r && r.scrollIntoView({ block: 'center' }); return true; })()`);
            await pauza(300);
            await p.snimek(path.join(vystup, 'zemina-klemov-zaklady.png'));
            await p.vyhodnot(`(() => { document.querySelector('[data-zaklady-panel] details').open = true; const r = document.querySelector('[data-materialy]'); r && r.scrollIntoView({ block: 'center' }); return true; })()`);
            await pauza(300);
            await p.snimek(path.join(vystup, 'zemina-klemov-materialy.png'));
            const cas = await js(`d._zeminaCache = null; const a = performance.now(); d.zemina; return performance.now() - a;`);
            kontrola('přepočet nebrzdí editor (do 300 ms)', cas < 300, cas.toFixed(0) + ' ms');
            const podp = await js(`const np = d._podlazi1NP().id; const sklep = e.dum.podlazi.find(x => x.typ === 'sklep').id;
                const obrys = d._obrysPodlazi(sklep).map(h => h.a); const eng = e.enginePodlazi(np);
                d._podepreniCache = null; const v = d.podepreniPodlazi(np); const seznam = [];
                for (const [id, info] of v) { const w = eng.walls.get(id), a = eng.nodes.get(w.nodeA), b = eng.nodes.get(w.nodeB);
                    for (const [t0, t1] of info.useky) { const t = (t0 + t1) / 2; seznam.push({ stena: w.id, typ: w.typ, m: +((t1 - t0) * Math.hypot(b.x - a.x, b.y - a.y) / X).toFixed(1), nadSklepem: Zemina.bodVObrysu((a.x + (b.x - a.x) * t) / X, (a.y + (b.y - a.y) * t) / X, obrys) }); } }
                return seznam;`);
            console.log('   nepodepřené úseky 1.NP:', JSON.stringify(podp));
            kontrola('v 1.NP šrafuje jen úseky nad sklepem', podp.every(x => x.nadSklepem), JSON.stringify(podp.filter(x => !x.nadSklepem)));

            // Snímky k posouzení: dům a jáma na svažitém terénu
            const stredDomu = await js(`const n = [...e.enginePodlazi(d._podlazi1NP().id).nodes.values()]; const sx = n.reduce((s, q) => s + q.x, 0) / n.length / X, sy = n.reduce((s, q) => s + q.y, 0) / n.length / X;
                const o = []; const M = 111320, c = Math.cos(50 * Math.PI / 180);
                for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) { const x = sx + i * 2.5, y = sy + j * 2.5; o.push([50 - y / M, 15 + x / (M * c), 400 + i * 0.08 + Math.sin(j / 7) * 0.4]); }
                d.renderer._fixedWgsCenter = { lat: 50, lon: 15 }; d.vyskovyProfil = { body: o, vyska_min: 395, vyska_max: 405, vyskovy_rozdil: 10 }; return { sx, sy };`);
            await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); const _3d = window._kk3d; const s = ${JSON.stringify(stredDomu)}; _3d.controls.target.set(s.sx, 1, s.sy); _3d.camera.position.set(s.sx + 14, 18, s.sy + 16); _3d.camera.zoom = 0.45; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
            await pauza(1500);
            await p.snimek(path.join(vystup, 'zemina-klemov-dum-3d.png'));
            await js(`d.zobrazStrechu3d = false; d.seznamPodlazi.forEach(x => { if (x.viditelne3d) d.naPodlazi(x.id); }); d._nastavViditelnost3d(); return true;`);
            await pauza(1500);
            await p.snimek(path.join(vystup, 'zemina-klemov-jama.png'));
            const jk = await js(`const m = window._kk3d.jama; return { troj: m.geometry.index.count / 3, zap: window._kk3d.jamaUniformy.uJamaZap.value };`);
            kontrola('Klemov má jámu', jk.zap === 1 && jk.troj > 1000, JSON.stringify(jk));
        }

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
