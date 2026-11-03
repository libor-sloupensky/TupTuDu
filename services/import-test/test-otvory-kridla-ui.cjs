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
        await pauza(3000);
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
            const pred = (o, dily) => { o.kridla = dily.map(([sirka, otv, s]) => s ? { sirka, otv, sklopne: true } : { sirka, otv }); o.smer = smerZKridel(o); return o; };
            const o = {};
            o.oknoOS = e.addOpening(w1.id, 1.0, 1.2, 'okno', { presnaSirka: true });           // odvozené: 1 křídlo OS
            o.oknoFOF = pred(e.addOpening(w1.id, 3.0, 2.4, 'okno', { presnaSirka: true }), [[0.72, 'fix'], [0.96, 'pravy', true], [0.72, 'fix']]);
            o.oknoSkl = pred(e.addOpening(w1.id, 7.5, 1.0, 'okno', { presnaSirka: true }), [[1, 'fix', true]]);
            o.oknoSkl.parapet = 1.5; o.oknoSkl.vyska = 0.6;
            o.frDvere = pred(e.addOpening(w2.id, 1.5, 2.4, 'francouzske_okno', { presnaSirka: true }), [[1.2, 'levy', true], [1.2, 'fix']]);
            o.frHS = pred(e.addOpening(w2.id, 4.5, 2.2, 'francouzske_okno', { presnaSirka: true }), [[1.1, 'posuvne'], [1.1, 'fix']]);
            o.dverePrave = e.addOpening(w3.id, 1.0, 1.0, 'dvere', { presnaSirka: true });
            o.dvere2 = pred(e.addOpening(w3.id, 3.0, 1.6, 'dvere', { presnaSirka: true }), [[0.8, 'levy'], [0.8, 'pravy']]);
            o.vrata = e.addOpening(w3.id, 6.0, 2.5, 'garazova_vrata', { presnaSirka: true });
            o.okno2 = e.addOpening(w4.id, 1.0, 1.5, 'okno', { presnaSirka: true });            // odvozené: 2 křídla
            o.posuvne = pred(e.addOpening(w4.id, 4.0, 0.9, 'dvere', { presnaSirka: true }), [[0.9, 'posuvne']]);
            o.vnitrni = e.addOpening(w5.id, 2.0, 0.8, 'dvere', { presnaSirka: true });
            o.pruchod = e.addOpening(w5.id, 4.5, 1.2, 'pruchod', { presnaSirka: true });
            d.fitView(); d.renderer.render();
            const out = {}; for (const k in o) out[k] = o[k].id; out.steny = e.walls.size; return out; })()`);
        kontrola('5 stěn a 12 otvorů', ids.steny === 5 && Object.keys(ids).length === 13, JSON.stringify(ids));

        const detaily = await p.vyhodnot(`(() => { const d = ${D}; const ids = ${JSON.stringify(ids)}; const out = {};
            for (const k in ids) { if (k === 'steny') continue;
                out[k] = { znacky: d.renderer.overlayLayer.find('._doorDetail_' + ids[k]).length,
                           kridla: kridlaOtvoru(d.engine.openings.get(ids[k])).map(x => x.otv + (x.sklopne ? '+s' : '') + ':' + x.sirka).join(' ') }; }
            return out; })()`);
        kontrola('okno 1,2 m: 1 křídlo OS, trojúhelník + sklopná značka', detaily.oknoOS.kridla === 'pravy+s:1.2' && detaily.oknoOS.znacky === 2, JSON.stringify(detaily.oknoOS));
        kontrola('okno 1,5 m: 2 křídla OS', detaily.okno2.kridla === 'levy+s:0.75 pravy+s:0.75' && detaily.okno2.znacky >= 5, JSON.stringify(detaily.okno2));
        kontrola('pevné + otevíravé + pevné: 2 příčle + 2 značky', detaily.oknoFOF.kridla === 'fix:0.72 pravy+s:0.96 fix:0.72' && detaily.oknoFOF.znacky === 4, JSON.stringify(detaily.oknoFOF));
        kontrola('sklopné okno: jen sklopná značka', detaily.oknoSkl.znacky === 1, JSON.stringify(detaily.oknoSkl));
        kontrola('francouzské dveře + pevné: oblouk, křídlo, sklopná značka + příčel', detaily.frDvere.kridla === 'levy+s:1.2 fix:1.2' && detaily.frDvere.znacky === 4, JSON.stringify(detaily.frDvere));
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
            const wr = document.getElementById('kk-canvas-wrap').getBoundingClientRect();
            return { vybrano: [...d.renderer.selectedOpenings], znackyNeposlouchaji: znacky.length > 0 && znacky.every(s => !s.listening()), kind: d.inspector && d.inspector.kind,
                     viditelny: panel.offsetParent !== null, left: Math.round(pr.left - wr.left), top: Math.round(pr.top - wr.top) }; })()`);
        kontrola('kliknutí doprostřed okna okno vybere (značky nechytají klik)', poKliku.vybrano.length === 1 && poKliku.vybrano[0] === ids.oknoOS && poKliku.znackyNeposlouchaji && poKliku.kind === 'opening', JSON.stringify(poKliku));
        kontrola('panel je v levém horním rohu plátna s odsazením 6 px', poKliku.viditelny && poKliku.left === 6 && poKliku.top === 6, JSON.stringify(poKliku));

        // Tažení za úchop o (+200, +150) — pointer events vznikají z CDP myši
        const uchop = () => p.vyhodnot(`(() => { const r = document.querySelector('#kk-panel-otvoru .kk-panel-uchop').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
        let u = await uchop();
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: u.x, y: u.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: u.x + 100, y: u.y + 80, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: u.x + 200, y: u.y + 150, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: u.x + 200, y: u.y + 150, button: 'left', clickCount: 1 });
        await pauza(300);
        const stavPanelu = () => p.vyhodnot(`(() => { const d = ${D}; const pr = document.getElementById('kk-panel-otvoru').getBoundingClientRect(); const wr = document.getElementById('kk-canvas-wrap').getBoundingClientRect();
            const ulozeno = JSON.parse(localStorage.getItem('kv3_state') || '{}').panelOtvoruPoz || null;
            return { poz: d.panelOtvoruPoz, left: Math.round(pr.left - wr.left), top: Math.round(pr.top - wr.top), ulozeno }; })()`);
        const poTahu = await stavPanelu();
        kontrola('panel jde přetáhnout za úchop a poloha se uloží do nastavení', poTahu.left === 206 && poTahu.top === 156 && poTahu.ulozeno && poTahu.ulozeno.x === 206 && poTahu.ulozeno.y === 156, JSON.stringify(poTahu));
        await p.snimek(path.join(vystup, 'otvory-kridla-panel-pretazeny.png'));
        u = await uchop();
        for (const n of [1, 2]) {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: u.x, y: u.y, button: 'left', clickCount: n, buttons: 1 });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: u.x, y: u.y, button: 'left', clickCount: n });
        }
        await pauza(300);
        const poResetu = await stavPanelu();
        kontrola('dvojklik na úchop vrátí panel do rohu', poResetu.poz === null && poResetu.left === 6 && poResetu.top === 6 && poResetu.ulozeno === null, JSON.stringify(poResetu));
        const panelNovy = await p.vyhodnot(`(async () => { const d = ${D}; d.nastroj = 'otvor'; await new Promise(r => setTimeout(r, 250));
            const panel = document.getElementById('kk-panel-otvoru'); const text = panel.innerText.replace(/\\s+/g, ' ');
            return { viditelny: panel.offsetParent !== null, novy: /Nový otvor/.test(text), bezInspektoru: !/parapet/.test(text), vListe: !!document.querySelector('.kk-lista select[x-model=otvorTyp]') }; })()`);
        kontrola('nástroj Otvor: v panelu volby nového otvoru, v liště už nejsou', panelNovy.viditelny && panelNovy.novy && panelNovy.bezInspektoru && !panelNovy.vListe, JSON.stringify(panelNovy));
        await p.snimek(path.join(vystup, 'otvory-kridla-panel-novy.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.nastroj = 'vyber'; return true; })()`);
        const insp = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(${JSON.stringify(ids.oknoFOF)}); d._selectionTick++;
            const i = d.inspector; return { kind: i.kind, pocet: i.pocetKridel, kridla: i.kridla.length, vyska: i.vyska, parapety: i.kridla.map(k => k.parapet), flip: i.canFlipStrana, zrcadlit: i.canZrcadlit, volby: i.pocetVolby }; })()`);
        kontrola('vybrané okno: 3 díly, výška 1,2, parapet dílů 0,9, volby počtu 1–4', insp.pocet === 3 && insp.kridla === 3 && insp.vyska === 1.2 && JSON.stringify(Object.values(insp.parapety)) === '[0.9,0.9,0.9]' && JSON.stringify(Object.values(insp.volby)) === '[1,2,3,4]', JSON.stringify(insp));
        kontrola('okno: zrcadlit ano, dovnitř/ven ne (okno se otvírá vždy dovnitř)', insp.zrcadlit && !insp.flip, JSON.stringify(insp));
        const strany = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const ids = ${JSON.stringify(ids)};
            const dveře = e.openings.get(ids.dverePrave); const pred = dveře.strana; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(ids.oknoOS); d._selectionTick++; d.flipOpeningStrana();
            return { okna: ['oknoOS', 'oknoFOF', 'okno2', 'oknoSkl'].map(k => e.stranaOtvoru(e.openings.get(ids[k]))), oknoPoFlipu: e.openings.get(ids.oknoOS).strana,
                     dvereFlip: (() => { d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(ids.dverePrave); d._selectionTick++; d.flipOpeningStrana(); const po = dveře.strana; return pred !== po; })(),
                     dvereInsp: { flip: d.inspector.canFlipStrana, jeDvere: d.inspector.jeDvere, smer: d.inspector.dvereSmer, volby: d.inspector.dvereVolby.length } }; })()`);
        await pauza(300); // panel se překreslí až po ticku
        strany.dvereInsp.panel = await p.vyhodnot(`document.getElementById('kk-panel-otvoru').innerText.split(String.fromCharCode(10)).join(' ')`);
        kontrola('okna na všech čtyřech stěnách se otvírají dovnitř (k těžišti domu) a flip je u nich bez účinku', strany.okna.every(s => s === 'in') && strany.oknoPoFlipu === 'in', JSON.stringify(strany));
        kontrola('dveře: původní nástroj — směr Pravé, 5 voleb, dovnitř/ven jde přepnout, bez parapetu a dílů', strany.dvereFlip && strany.dvereInsp.flip && strany.dvereInsp.jeDvere && strany.dvereInsp.smer === 'pravy' && strany.dvereInsp.volby === 5 && /Dveře/.test(strany.dvereInsp.panel) && !/par:|dílů|skl\./.test(strany.dvereInsp.panel), JSON.stringify(strany.dvereInsp));
        const dvereSmery = await p.vyhodnot(`(() => { const d = ${D}; const o = d.engine.openings.get(${JSON.stringify(ids.dverePrave)}); const z = () => kridlaOtvoru(o).map(k => k.otv + ':' + k.sirka).join(' ');
            d.setDvereSmer('dvoukridle'); const dvou = { k: z(), smer: d.inspector.dvereSmer }; d.setDvereSmer('levy'); const leve = { k: z(), smer: d.inspector.dvereSmer };
            d.setDvereSmer('otvor'); const otvor = { k: z(), smer: d.inspector.dvereSmer, flip: d.inspector.canFlipStrana }; d.setDvereSmer('pravy'); return { dvou, leve, otvor, zpet: z() }; })()`);
        kontrola('směr dveří: dvoukřídlé 2× 0,5, levé, otvor bez křídla (flip skrytý), zpět pravé', dvereSmery.dvou.k === 'levy:0.5 pravy:0.5' && dvereSmery.dvou.smer === 'dvoukridle' && dvereSmery.leve.k === 'levy:1' && dvereSmery.otvor.k === '' && dvereSmery.otvor.smer === 'otvor' && !dvereSmery.otvor.flip && dvereSmery.zpet === 'pravy:1', JSON.stringify(dvereSmery));
        const zrc = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(${JSON.stringify(ids.frDvere)}); d._selectionTick++;
            d.zrcadlitOtvor(); const o = d.engine.openings.get(${JSON.stringify(ids.frDvere)}); const z = (k) => k.otv + (k.sklopne ? '+s' : '') + ':' + k.sirka; const po = o.kridla.map(z).join(' ');
            d.zrcadlitOtvor(); return { po, zpet: o.kridla.map(z).join(' ') }; })()`);
        kontrola('zrcadlení „dveře + pevné" → „pevné + dveře" (panty prohozené), druhé zrcadlení vrátí', zrc.po === 'fix:1.2 pravy+s:1.2' && zrc.zpet === 'levy+s:1.2 fix:1.2', JSON.stringify(zrc));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(${JSON.stringify(ids.oknoFOF)}); d._selectionTick++; return true; })()`);
        await pauza(300);
        await p.snimek(path.join(vystup, 'otvory-kridla-inspektor.png'));
        const poKridle = await p.vyhodnot(`(() => { const d = ${D}; d.setKridloSirka(0, 1.0); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return { kridla: o.kridla.map(k => k.sirka), sirka: o.sirka }; })()`);
        kontrola('šířka 1. křídla 100 cm → prostřední se zúžilo, otvor stejný', JSON.stringify(poKridle.kridla) === '[1,0.68,0.72]' && poKridle.sirka === 2.4, JSON.stringify(poKridle));
        const poTypu = await p.vyhodnot(`(() => { const d = ${D}; d.setKridloTyp(0, 'levy'); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            return { otv: o.kridla[0].otv }; })()`);
        kontrola('typ 1. křídla změněn na levé', poTypu.otv === 'levy', JSON.stringify(poTypu));
        const poVysce = await p.vyhodnot(`(() => { const d = ${D}; d.setOpeningVyska(2.5); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            d.setOpeningParapet(0.5); return { vyska: o.vyska, parapet: o.parapet }; })()`);
        kontrola('výška 250 cm se vejde pod strop 2,8 m (parapet 0,9 → 1,9), parapet 50 cm', poVysce.vyska === 1.9 && poVysce.parapet === 0.5, JSON.stringify(poVysce));
        const poPoctu = await p.vyhodnot(`(() => { const d = ${D}; const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)}); const z = (k) => k.otv + (k.sklopne ? '+s' : '') + ':' + k.sirka;
            d.setPocetKridel(4); const ctyri = o.kridla.map(z).join(' '); d.setPocetKridel(2); const dva = o.kridla.map(z).join(' ');
            d.setPocetKridel(1); const jeden = o.kridla.map(z).join(' '); d.setPocetKridel(2);
            return { ctyri, dva, jeden, zpet: o.kridla.map(z).join(' '), pocet: d.inspector.pocetKridel }; })()`);
        kontrola('počet dílů: 4 (nový díl = otevíravé pravé + skl.), 2 (zachované typy), 1, zpět 2 (samotné pravé → levé krajní)',
            poPoctu.ctyri === 'levy:0.6 pravy+s:0.6 fix:0.6 pravy+s:0.6' && poPoctu.dva === 'levy:1.2 pravy+s:1.2' && poPoctu.jeden === 'levy:2.4' && poPoctu.zpet === 'levy:1.2 pravy+s:1.2' && poPoctu.pocet === 2, JSON.stringify(poPoctu));
        const sklop = await p.vyhodnot(`(() => { const d = ${D}; d.setKridloSklopne(1, false); const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)});
            const bez = { sklopne: !!o.kridla[1].sklopne, kridlaInsp: d.inspector.kridla.map(k => k.sklopne) };
            d.setKridloSklopne(1, true); return { bez, zpet: { sklopne: !!o.kridla[1].sklopne, kridlaInsp: d.inspector.kridla.map(k => k.sklopne) } }; })()`);
        kontrola('zaškrtávátko sklopné: vypnout a zapnout u 2. dílu', !sklop.bez.sklopne && JSON.stringify(sklop.bez.kridlaInsp) === '[false,false]' && sklop.zpet.sklopne && JSON.stringify(sklop.zpet.kridlaInsp) === '[false,true]', JSON.stringify(sklop));
        const smery = await p.vyhodnot(`(() => { const f = window.smerPosunuKridla; const P = { otv: 'posuvne' }, F = { otv: 'fix' };
            return { pf: f([P, F], 0), fp: f([F, P], 1), pp: [f([P, P], 0), f([P, P], 1)], fppf: [f([F, P, P, F], 1), f([F, P, P, F], 2)], ppp: [f([P,P,P],0), f([P,P,P],1), f([P,P,P],2)] }; })()`);
        kontrola('směr posunu: ke středu; přes pevný díl jen když je po straně', smery.pf === 1 && smery.fp === -1 && JSON.stringify(smery.pp) === '[1,-1]' && JSON.stringify(smery.fppf) === '[-1,1]' && JSON.stringify(smery.ppp) === '[1,-1,-1]', JSON.stringify(smery));
        const stara = await p.vyhodnot(`(() => { const e = new StavebniEngine(); e.fromJSON({ steny: [{ id: 'W1', od: [0, 0], do: [5, 0], tloustka: 0.3, typ: 'obvodova' }],
            otvory: [{ id: 'O1', stena: 'W1', pozice: 1, sirka: 1.5, typ: 'okno', kridla: [{ sirka: 0.75, otv: 'levy_sklopne' }, { sirka: 0.75, otv: 'sklopne' }] }] });
            return e.openings.get('O1').kridla; })()`);
        kontrola('starší data: levy_sklopne → levé + sklopné, sklopne → pevné + sklopné', JSON.stringify(stara) === '[{"sirka":0.75,"otv":"levy","sklopne":true},{"sirka":0.75,"otv":"fix","sklopne":true}]', JSON.stringify(stara));
        // Parapet dílu: 2. díl dolů na podlahu → otvor (parapet 0,5, v 1,9) se nemění, díl nese vlastní 0 a sahá ke společné horní hraně
        const parDilu = await p.vyhodnot(`(() => { const d = ${D}; const o = d.engine.openings.get(${JSON.stringify(ids.oknoFOF)}); const vrsekPred = vrsekOtvoru(o);
            d.setKridloParapet(1, 0); const po = { parapet: o.parapet, vyska: o.vyska, vrsek: vrsekOtvoru(o), dily: o.kridla.map(k => k.parapet ?? null), insp: d.inspector.kridla.map(k => k.parapet),
                znacky: d.renderer.overlayLayer.find('._doorDetail_' + o.id).length, flip: d.inspector.canFlipStrana, strana: d.engine.stranaOtvoru(o), json: d.engine.toJSON().otvory.find(x => x.id === o.id).kridla.map(k => k.parapet ?? null) };
            // Parapet celého otvoru o 20 cm výš: výška zůstane, díl s vlastním parapetem jede s ním
            d.setOpeningParapet(0.7); const posun = { parapet: o.parapet, vyska: o.vyska, dily: o.kridla.map(k => k.parapet ?? null) };
            d.setOpeningParapet(0.5); d.setKridloParapet(1, 0.5); const zpet = { parapet: o.parapet, vyska: o.vyska, dily: o.kridla.map(k => k.parapet ?? null) };
            return { vrsekPred, po, posun, zpet }; })()`);
        kontrola('parapet 2. dílu 0: otvor zůstává 0,5 / 1,9, díl má vlastní 0, kreslí se jako dveře (flip povolen), uloží se',
            parDilu.po.parapet === 0.5 && parDilu.po.vyska === 1.9 && parDilu.po.vrsek === parDilu.vrsekPred && JSON.stringify(parDilu.po.dily) === '[null,0]' && JSON.stringify(Object.values(parDilu.po.insp)) === '[0.5,0]'
            && parDilu.po.znacky === 5 && parDilu.po.flip && JSON.stringify(parDilu.po.json) === '[null,0]', JSON.stringify(parDilu));
        kontrola('parapet otvoru 0,5 → 0,7 posune celek: výška 1,9 zůstává, vlastní parapet dílu 0 → 0,2; návrat na 0,5 a díl na 0,5 vlastní hodnotu zruší',
            parDilu.posun.parapet === 0.7 && parDilu.posun.vyska === 1.9 && JSON.stringify(parDilu.posun.dily) === '[null,0.2]' && parDilu.zpet.parapet === 0.5 && parDilu.zpet.vyska === 1.9 && JSON.stringify(parDilu.zpet.dily) === '[null,null]', JSON.stringify(parDilu));
        // Rozepsaná šířka + klik na plátno (mimo panel): hodnota se musí odevzdat dřív, než se změní výběr
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.clear(); d.renderer.selectedOpenings.add(${JSON.stringify(ids.oknoOS)}); d._selectionTick++; return true; })()`);
        await pauza(300); // panel se překreslí až po ticku — pole hledat až potom
        const vstup = await p.vyhodnot(`(() => { const d = ${D};
            const el = document.querySelector('#kk-panel-otvoru input[type=number]'); el.focus(); el.value = ''; // vymazat, vložení textu pak projde jako uživatelský vstup
            const r = d.stage.container().getBoundingClientRect(); const styl = getComputedStyle(document.querySelector('#kk-panel-otvoru label'));
            return { prazdno: { x: Math.round(r.left + r.width * 0.5), y: Math.round(r.top + r.height * 0.85) }, label: { vaha: styl.fontWeight, velikost: styl.fontSize }, aktivni: document.activeElement === el, hodnotaPred: el.value }; })()`);
        kontrola('popisek „skl." má běžnou váhu a 12 px jako ostatní text', (vstup.label.vaha === '400' || vstup.label.vaha === 'normal') && vstup.label.velikost === '12px', JSON.stringify(vstup.label));
        await p.cmd('Input.insertText', { text: '150' });
        const predKlikem = await p.vyhodnot(`(() => { const a = document.activeElement; return { tag: a && a.tagName, typ: a && a.type, hodnota: a && a.value, vPanelu: !!(a && a.closest && a.closest('#kk-panel-otvoru')) }; })()`);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: vstup.prazdno.x, y: vstup.prazdno.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: vstup.prazdno.x, y: vstup.prazdno.y, button: 'left', clickCount: 1 });
        await pauza(400);
        const poKlikuMimo = await p.vyhodnot(`(() => { const d = ${D}; return { sirka: d.engine.openings.get(${JSON.stringify(ids.oknoOS)}).sirka, vybrano: d.renderer.selectedOpenings.size }; })()`);
        kontrola('rozepsaná šířka 150 se uloží i při kliknutí mimo panel (výběr se pak zruší)', poKlikuMimo.sirka === 1.5 && poKlikuMimo.vybrano === 0, JSON.stringify(poKlikuMimo));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.selectedOpenings.add(${JSON.stringify(ids.oknoFOF)}); d._selectionTick++; return true; })()`);
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
            return { kridla: o.kridla.map(k => k.otv + (k.sklopne ? '+s' : '') + ':' + k.sirka).join(' '), vyska: s.vyska, parapet: s.parapet, pocet: d.engine.openings.size }; })()`);
        kontrola('po obnovení stránky sestava i výšky drží', poReloadu.kridla === 'levy+s:1.2 fix:1.2' && poReloadu.vyska === 0.6 && poReloadu.parapet === 1.5 && poReloadu.pocet === 12, JSON.stringify(poReloadu));

        console.log('\n4) 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); return true; })()`);
        await pauza(1500);
        const stav3d = await p.vyhodnot(`(() => { const d = ${D}; const g = window._kk3d.podlaziSkupiny.get('P1'); const e = d.engine; const PX = e.PX_PER_M;
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
        const ruznyParapet = await p.vyhodnot(`(async () => { const d = ${D}; const o = d.engine.openings.get(${JSON.stringify(ids.okno2)}); o.kridla = kridlaOtvoru(o).map(k => ({ ...k })); o.kridla[1].parapet = 0.2;
            const pred = window._kk3d.podlaziSkupiny.get('P1').children.filter(c => c.isMesh).length; d._build3d(); const po = window._kk3d.podlaziSkupiny.get('P1').children.filter(c => c.isMesh).length;
            const sk = window._kk3d.podlaziSkupiny.get('P1').children.filter(c => c.isGroup).find(g => Math.abs(g.position.x) < 0.3 && Math.abs(g.position.z - 5.25) < 0.3);
            const box = new THREE.Box3().setFromObject(sk);
            // Kusy stěny W4 (x ≈ 0) pod díly: parapetní kusy mají vršek 0,2 a 0,9 m
            const vrsky = window._kk3d.podlaziSkupiny.get('P1').children.filter(c => c.isMesh).map(m => new THREE.Box3().setFromObject(m)).filter(b => Math.abs(b.min.x) < 0.5 && b.max.x < 0.5 && b.min.z > 4 && b.max.z < 6.5).map(b => +b.max.y.toFixed(2)).sort();
            return { pred, po, spodek: +box.min.y.toFixed(2), vrsek: +box.max.y.toFixed(2), vrsky }; })()`);
        kontrola('3D: rám jde od 0,2 m ke společné horní hraně 2,1 m; pod díly jsou parapetní kusy stěny 0,2 a 0,9 m', ruznyParapet.spodek === 0.2 && ruznyParapet.vrsek === 2.1 && ruznyParapet.vrsky.includes(0.2) && ruznyParapet.vrsky.includes(0.9), JSON.stringify(ruznyParapet));
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
