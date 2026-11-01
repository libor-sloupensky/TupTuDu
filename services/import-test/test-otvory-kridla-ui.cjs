/**
 * Otvory: křídla, výška a parapet — 2D značky, inspektor, uložení a 3D.
 *
 *   - sestavy křídel z předvoleb (okno OS, pevné+otevíravé+pevné, francouzské
 *     okno dveře+pevné, HS portál, dvoukřídlé dveře, posuvné do pouzdra, vrata)
 *   - 2D: okna mají trojúhelník otevírání, průchod nic, dveře oblouk
 *   - inspektor: předvolba, křídla, výška a parapet; změna šířky křídla
 *     přelije rozdíl do souseda; výška se vejde pod strop stěny
 *   - toJSON/fromJSON a uložení na server zachová křídla, výšku i parapet
 *   - 3D: stěny jsou rozřezané na díly, každý otvor má skupinu rám + křídla
 *     sedící na ose své stěny
 *
 * Spuštění: node services/import-test/test-otvory-kridla-ui.cjs [složka snímků]
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

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(1500);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 15000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest otvory křídla ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Dům 10 × 7 m s různými sestavami otvorů');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const PX = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*PX, 0, 0.4, 'obvodova');
            const w2 = e.addWall(10*PX, 0, 10*PX, 7*PX, 0.4, 'obvodova');
            const w3 = e.addWall(10*PX, 7*PX, 0, 7*PX, 0.4, 'obvodova');
            const w4 = e.addWall(0, 7*PX, 0, 0, 0.4, 'obvodova');
            const w5 = e.addWall(5*PX, 0, 5*PX, 7*PX, 0.15, 'pricka');
            const pred = (o, key) => { const pv = PREDVOLBY_KRIDEL[o.typ].find(x => x.key === key); o.kridla = kridlaZPredvolby(pv, o.sirka); o.smer = smerZKridel(o); return o; };
            const o = {};
            o.oknoOS = e.addOpening(w1.id, 1.0, 1.2, 'okno', { presnaSirka: true });           // odvozené: 1 křídlo OS
            o.oknoFOF = pred(e.addOpening(w1.id, 3.0, 2.4, 'okno', { presnaSirka: true }), 'fix_o_fix');
            o.oknoSkl = pred(e.addOpening(w1.id, 7.5, 1.0, 'okno', { presnaSirka: true }), 'sklopne');
            o.oknoSkl.parapet = 1.5; o.oknoSkl.vyska = 0.6;
            o.frDvere = pred(e.addOpening(w2.id, 1.5, 2.4, 'francouzske_okno', { presnaSirka: true }), 'o_fix');
            o.frHS = pred(e.addOpening(w2.id, 4.5, 2.2, 'francouzske_okno', { presnaSirka: true }), 'hs');
            o.dverePrave = e.addOpening(w3.id, 1.0, 1.0, 'dvere', { presnaSirka: true });
            o.dvere2 = pred(e.addOpening(w3.id, 3.0, 1.6, 'dvere', { presnaSirka: true }), 'dvoukridle');
            o.vrata = e.addOpening(w3.id, 6.0, 2.5, 'garazova_vrata', { presnaSirka: true });
            o.okno2 = e.addOpening(w4.id, 1.0, 1.5, 'okno', { presnaSirka: true });            // odvozené: 2 křídla
            o.posuvne = pred(e.addOpening(w4.id, 4.0, 0.9, 'dvere', { presnaSirka: true }), 'posuvne');
            o.vnitrni = e.addOpening(w5.id, 2.0, 0.8, 'dvere', { presnaSirka: true });
            o.pruchod = e.addOpening(w5.id, 4.5, 1.2, 'pruchod', { presnaSirka: true });
            d.fitView(); d.renderer.render();
            const out = {}; for (const k in o) out[k] = o[k].id; out.steny = e.walls.size; return out; })()`);
        kontrola('5 stěn a 12 otvorů', ids.steny === 5 && Object.keys(ids).length === 13, JSON.stringify(ids));

        const detaily = await p.vyhodnot(`(() => { const d = ${D}; const ids = ${JSON.stringify(ids)}; const out = {};
            for (const k in ids) { if (k === 'steny') continue;
                out[k] = { znacky: d.renderer.overlayLayer.find('._doorDetail_' + ids[k]).length,
                           kridla: kridlaOtvoru(d.engine.openings.get(ids[k])).map(x => x.otv + ':' + x.sirka).join(' ') }; }
            return out; })()`);
        kontrola('okno 1,2 m: 1 křídlo OS, trojúhelník + sklopná značka', detaily.oknoOS.kridla === 'pravy_sklopne:1.2' && detaily.oknoOS.znacky === 2, JSON.stringify(detaily.oknoOS));
        kontrola('okno 1,5 m: 2 křídla OS', detaily.okno2.kridla === 'levy_sklopne:0.75 pravy_sklopne:0.75' && detaily.okno2.znacky >= 5, JSON.stringify(detaily.okno2));
        kontrola('pevné + otevíravé + pevné: 2 příčle + 2 značky', detaily.oknoFOF.kridla === 'fix:0.72 pravy_sklopne:0.96 fix:0.72' && detaily.oknoFOF.znacky === 4, JSON.stringify(detaily.oknoFOF));
        kontrola('sklopné okno: jen sklopná značka', detaily.oknoSkl.znacky === 1, JSON.stringify(detaily.oknoSkl));
        kontrola('francouzské dveře + pevné: oblouk a křídlo + příčel', detaily.frDvere.kridla === 'levy:1.2 fix:1.2' && detaily.frDvere.znacky === 3, JSON.stringify(detaily.frDvere));
        kontrola('HS portál: příčel, křídlo a šipka', detaily.frHS.kridla === 'posuvne:1.1 fix:1.1' && detaily.frHS.znacky === 3, JSON.stringify(detaily.frHS));
        kontrola('dvoukřídlé dveře: 2 oblouky, 2 křídla, příčel', detaily.dvere2.znacky === 5, JSON.stringify(detaily.dvere2));
        kontrola('posuvné do pouzdra: křídlo, pouzdro, šipka', detaily.posuvne.znacky === 3, JSON.stringify(detaily.posuvne));
        kontrola('průchod: bez křídel a značek', detaily.pruchod.kridla === '' && detaily.pruchod.znacky === 0, JSON.stringify(detaily.pruchod));
        await p.snimek(path.join(vystup, 'otvory-kridla-2d.png'));

        console.log('\n2) Panel otvoru a inspektor');
        // Skutečné kliknutí doprostřed okna (přes trojúhelníky značek) musí okno vybrat
        const bodOkna = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.nastroj = 'vyber';
            const t = d.stage.getAbsoluteTransform().copy().point({ x: 1.6 * d.engine.PX_PER_M, y: 0 });
            const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bodOkna.x, y: bodOkna.y });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: bodOkna.x, y: bodOkna.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: bodOkna.x, y: bodOkna.y, button: 'left', clickCount: 1 });
        await pauza(400);
        const poKliku = await p.vyhodnot(`(() => { const d = ${D}; const znacky = d.renderer.overlayLayer.find('._doorDetail_' + ${JSON.stringify(ids.oknoOS)});
            const panel = document.getElementById('kk-panel-otvoru'); const pr = panel.getBoundingClientRect();
            const br = document.querySelector('[x-ref=tlOtvor]').getBoundingClientRect(); const wr = document.getElementById('kk-canvas-wrap').getBoundingClientRect();
            return { vybrano: [...d.renderer.selectedOpenings], znackyNeposlouchaji: znacky.length > 0 && znacky.every(s => !s.listening()), kind: d.inspector && d.inspector.kind,
                     viditelny: panel.offsetParent !== null, odsazeni: Math.round(pr.left - br.left), podListou: Math.round(pr.top - wr.top) }; })()`);
        kontrola('kliknutí doprostřed okna okno vybere (značky nechytají klik)', poKliku.vybrano.length === 1 && poKliku.vybrano[0] === ids.oknoOS && poKliku.znackyNeposlouchaji && poKliku.kind === 'opening', JSON.stringify(poKliku));
        kontrola('panel je vidět na plátně těsně pod tlačítkem Otvor', poKliku.viditelny && Math.abs(poKliku.odsazeni) <= 2 && poKliku.podListou <= 8, JSON.stringify(poKliku));
        const panelNovy = await p.vyhodnot(`(async () => { const d = ${D}; d.nastroj = 'otvor'; await new Promise(r => setTimeout(r, 250));
            const panel = document.getElementById('kk-panel-otvoru'); const text = panel.innerText.replace(/\\s+/g, ' ');
            return { viditelny: panel.offsetParent !== null, novy: /Nový otvor/.test(text), bezInspektoru: !/parapet/.test(text), vListe: !!document.querySelector('.kk-lista select[x-model=otvorTyp]') }; })()`);
        kontrola('nástroj Otvor: v panelu volby nového otvoru, v liště už nejsou', panelNovy.viditelny && panelNovy.novy && panelNovy.bezInspektoru && !panelNovy.vListe, JSON.stringify(panelNovy));
        await p.snimek(path.join(vystup, 'otvory-kridla-panel-novy.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; return true; })()`);
        const insp = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(${JSON.stringify(ids.oknoFOF)}); d._selectionTick++;
            const i = d.inspector; return { kind: i.kind, predvolba: i.predvolba, kridla: i.kridla.length, vyska: i.vyska, parapet: i.parapet, flip: i.canFlipStrana, predvolby: i.predvolby.length }; })()`);
        kontrola('vybrané okno: předvolba fix_o_fix, 3 křídla, výška 1,2, parapet 0,9', insp.predvolba === 'fix_o_fix' && insp.kridla === 3 && insp.vyska === 1.2 && insp.parapet === 0.9 && insp.flip && insp.predvolby === 8, JSON.stringify(insp));
        await pauza(300);
        await p.snimek(path.join(vystup, 'otvory-kridla-inspektor.png'));
        const poKridle = await p.vyhodnot(`(() => { const d = ${D}; d.setKridloSirka(0, 1.0); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return { kridla: o.kridla.map(k => k.sirka), sirka: o.sirka, predvolba: d.inspector.predvolba }; })()`);
        kontrola('šířka 1. křídla 100 cm → prostřední se zúžilo, otvor stejný', JSON.stringify(poKridle.kridla) === '[1,0.68,0.72]' && poKridle.sirka === 2.4 && poKridle.predvolba === 'fix_o_fix', JSON.stringify(poKridle));
        const poTypu = await p.vyhodnot(`(() => { const d = ${D}; d.setKridloTyp(0, 'levy_sklopne'); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return { otv: o.kridla[0].otv, predvolba: d.inspector.predvolba }; })()`);
        kontrola('typ 1. křídla změněn → vlastní sestava', poTypu.otv === 'levy_sklopne' && poTypu.predvolba === 'vlastni', JSON.stringify(poTypu));
        const poVysce = await p.vyhodnot(`(() => { const d = ${D}; d.setOpeningVyska(2.5); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            d.setOpeningParapet(0.5); return { vyska: o.vyska, parapet: o.parapet }; })()`);
        kontrola('výška 250 cm se vejde pod strop 2,8 m (parapet 0,9 → 1,9), parapet 50 cm', poVysce.vyska === 1.9 && poVysce.parapet === 0.5, JSON.stringify(poVysce));
        const poPredvolbe = await p.vyhodnot(`(() => { const d = ${D}; d.setOpeningPredvolba('dvoukridle'); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return { kridla: o.kridla.map(k => k.otv + ':' + k.sirka).join(' '), predvolba: d.inspector.predvolba }; })()`);
        kontrola('předvolba dvoukřídlé', poPredvolbe.kridla === 'levy_sklopne:1.2 pravy_sklopne:1.2' && poPredvolbe.predvolba === 'dvoukridle', JSON.stringify(poPredvolbe));
        const sirkaOtvoru = await p.vyhodnot(`(() => { const d = ${D}; d.setOpeningSirka(1.8); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return o.kridla.map(k => k.sirka); })()`);
        kontrola('šířka otvoru 180 cm přeškáluje křídla', JSON.stringify(sirkaOtvoru) === '[0.9,0.9]', JSON.stringify(sirkaOtvoru));
        const undo = await p.vyhodnot(`(() => { const d = ${D}; d.engine.undo(); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)}); d.renderer.render();
            return { sirka: o.sirka, kridla: o.kridla.map(k => k.sirka) }; })()`);
        kontrola('zpět vrátí šířku i křídla', undo.sirka === 2.4 && JSON.stringify(undo.kridla) === '[1.2,1.2]', JSON.stringify(undo));

        console.log('\n3) Uložení');
        const kolo = await p.vyhodnot(`(() => { const d = ${D}; const j = d.engine.toJSON(); const o = j.otvory.find(x => x.id === ${JSON.stringify(ids.oknoSkl)});
            const e2 = new StavebniEngine(); e2.fromJSON(JSON.parse(JSON.stringify(j))); const o2 = e2.openings.get(o.id);
            return { json: { vyska: o.vyska, parapet: o.parapet, kridla: o.kridla }, zpet: { vyska: o2.vyska, parapet: o2.parapet, kridla: o2.kridla },
                     bezKridel: j.otvory.find(x => x.id === ${JSON.stringify(ids.oknoOS)}).kridla === undefined }; })()`);
        kontrola('toJSON nese výšku, parapet a křídla; fromJSON je vrátí', JSON.stringify(kolo.json) === JSON.stringify(kolo.zpet) && kolo.json.vyska === 0.6 && kolo.json.parapet === 1.5 && kolo.json.kridla.length === 1, JSON.stringify(kolo));
        kontrola('odvozená křídla se neukládají', kolo.bezKridel);
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(1500);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.openings.size > 0)`, 15000, 'editor po obnovení');
        const poReloadu = await p.vyhodnot(`(() => { const d = ${D}; const o = d.engine.openings.get(${JSON.stringify(ids.frDvere)}); const s = d.engine.openings.get(${JSON.stringify(ids.oknoSkl)});
            return { kridla: o.kridla.map(k => k.otv + ':' + k.sirka).join(' '), vyska: s.vyska, parapet: s.parapet, pocet: d.engine.openings.size }; })()`);
        kontrola('po obnovení stránky sestava i výšky drží', poReloadu.kridla === 'levy:1.2 fix:1.2' && poReloadu.vyska === 0.6 && poReloadu.parapet === 1.5 && poReloadu.pocet === 12, JSON.stringify(poReloadu));

        console.log('\n4) 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); return true; })()`);
        await pauza(1500);
        const stav3d = await p.vyhodnot(`(() => { const d = ${D}; const g = window._kk3d.wallGroup; const e = d.engine; const PX = e.PX_PER_M;
            const steny = g.children.filter(c => c.isMesh).length;
            const skupiny = g.children.filter(c => c.isGroup);
            // Každá skupina otvoru musí ležet na ose některé stěny (do poloviny tloušťky) a uvnitř jejího rozsahu
            let naStene = 0;
            for (const s of skupiny) {
                const px = s.position.x, pz = s.position.z;
                for (const w of e.walls.values()) {
                    const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB);
                    const ax = a.x/PX, az = a.y/PX, bx = b.x/PX, bz = b.y/PX;
                    const L = Math.hypot(bx-ax, bz-az); const ux = (bx-ax)/L, uz = (bz-az)/L;
                    const t = (px-ax)*ux + (pz-az)*uz; const dist = Math.abs(-(px-ax)*uz + (pz-az)*ux);
                    if (t > 0 && t < L && dist < w.tloustka/2 + 0.01) { naStene++; break; }
                }
            }
            const box = new THREE.Box3().setFromObject(g);
            return { steny, skupiny: skupiny.length, naStene, min: [box.min.x, box.min.y, box.min.z].map(v => +v.toFixed(2)), max: [box.max.x, box.max.y, box.max.z].map(v => +v.toFixed(2)),
                     dily: skupiny.map(s => s.children.length) }; })()`);
        kontrola('stěny rozřezané na díly (víc než 5 těles)', stav3d.steny > 5, stav3d.steny + ' těles');
        kontrola('11 otvorů s výplní (průchod jen výřez)', stav3d.skupiny === 11, stav3d.skupiny + ' skupin');
        kontrola('každý otvor sedí na ose své stěny', stav3d.naStene === 11, stav3d.naStene + ' z ' + stav3d.skupiny);
        kontrola('dům 10 × 7 × 2,8 m v kladném Z jako terén', stav3d.min[1] === 0 && stav3d.max[1] === 2.8 && stav3d.min[2] >= -0.3 && stav3d.max[2] <= 7.3 && stav3d.max[0] <= 10.3, JSON.stringify([stav3d.min, stav3d.max]));
        await p.snimek(path.join(vystup, 'otvory-kridla-3d.png'));
        // Pohled zblízka na jižní stěnu (dveře, vrata)
        await p.vyhodnot(`(() => { const _3d = window._kk3d; _3d.controls.target.set(5, 1.2, 7); _3d.camera.position.set(7, 4, 16); _3d.camera.zoom = 2.2; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
        await pauza(600);
        await p.snimek(path.join(vystup, 'otvory-kridla-3d-detail.png'));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        if (p.chybyDetail.length) console.log('   konzole:\n     ' + p.chybyDetail.map(c => c.text.slice(0, 60) + ' @ ' + (c.url || '')).join('\n     '));
        kontrola('bez chyb v konzoli (404 jen vypsat)', vazne.length === 0, vazne.slice(0, 3).map(c => c.text).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
