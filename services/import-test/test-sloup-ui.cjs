/**
 * Sloup: založení s přichycením do rohu výklenku, střecha přes sloup, panel (rozměr, tvar,
 * střecha), tah z rohu a zpět, seznam objektů s okem, 3D až pod střechu, uložení a obnovení.
 *
 * Spuštění: node services/import-test/test-sloup-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const PX = 80;

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
    const obr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const m = (x, y) => obr(x * PX, y * PX);
    const pohyb = async (b, drzi) => { await p.cmd('Input.dispatchMouseEvent', drzi ? { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1 } : { type: 'mouseMoved', x: b.x, y: b.y }); await pauza(30); };
    const stisk = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
    const pust = (b) => p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
    const klik = async (b) => { await pohyb(b); await stisk(b); await pust(b); await pauza(250); };
    const tah = async (od, kam) => { await pohyb(od); await stisk(od); await pauza(40); for (let i = 1; i <= 10; i++) await pohyb({ x: od.x + (kam.x - od.x) * i / 10, y: od.y + (kam.y - od.y) * i / 10 }, true); await pust(kam); await pauza(300); };
    const pole = (sel, hod) => p.vyhodnot(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); n.value = ${JSON.stringify(String(hod))}; n.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    const stav = () => p.vyhodnot(`(() => { const d = ${D}; const s = (d.engine.dum.sloupy || [])[0] || null; const st = d._strechaVypocet();
        return { s: s && { ...s }, hran: st ? st.hrany.length : 0, nadVyklenkem: st ? window.Strecha.vyskaVBode(st.plochy, 10.5, 7.5) : null,
            kind: d.inspector?.kind, vRohu: d.inspector?.vRohu }; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest sloup ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Dům s výklenkem v rohu (krytý vstup 3 × 3 m) a sedlová střecha');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const b = [[0,0],[12,0],[12,6],[9,6],[9,9],[0,9]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 690, y: 6 }; d.fitView(); d.renderer.render(); d.strechaVytvor(); d.autoSave('Dům'); return true; })()`);
        await pauza(1200);
        let s = await stav();
        kontrola('bez sloupu má střecha šest hran a nad výklenkem nic není', s.hran === 6 && s.nadVyklenkem === null, JSON.stringify(s));

        console.log('\n2) Nástroj Sloup: klik kousek od rohu výklenku sloup přichytí do rohu');
        await p.vyhodnot(`(() => { document.querySelector('[data-nastroj-sloup]').click(); return true; })()`);
        await pauza(200);
        const napoveda = await p.vyhodnot(`(() => { const d = ${D}; return { nastroj: d.nastroj, text: document.querySelector('#kk-panel-otvoru')?.innerText || '' }; })()`);
        kontrola('tlačítko zapne nástroj a panel ukáže nápovědu', napoveda.nastroj === 'sloup' && napoveda.text.length > 10, JSON.stringify(napoveda));
        await pohyb(await m(11.85, 8.8));
        await klik(await m(11.85, 8.8));
        s = await stav();
        // Líc obvodové stěny tl. 30 cm leží 15 cm za osou: roh výklenku (12,15; 9,15), střed sloupu 10 cm dovnitř
        kontrola('sloup C1 vznikl v rohu, lícuje s oběma stěnami', s.s && s.s.id === 'C1' && blizko(s.s.x, 12.05, 0.01) && blizko(s.s.y, -9.05, 0.01) && s.kind === 'sloup' && s.vRohu, JSON.stringify(s));
        kontrola('střecha jde přes sloup: čtyři hrany, nad výklenkem střecha', s.hran === 4 && s.nadVyklenkem > 2, JSON.stringify(s));
        const seznam = await p.vyhodnot(`(() => { const d = ${D}; return d.engine.getObjectList().filter(o => o.type === 'sloup').map(o => o.id + ' ' + o.nazev + ' ' + o.info); })()`);
        kontrola('v seznamu objektů je řádek C1', seznam.length === 1 && /^C1 Sloup 20 × 20 cm$/.test(seznam[0]), JSON.stringify(seznam));

        console.log('\n3) Panel: rozměr, tvar, střecha');
        await pole('[data-sloup=sirka]', 30);
        await pauza(200);
        s = await stav();
        kontrola('30 cm: sloup zůstane lícovat v rohu', blizko(s.s.sirka, 0.3, 1e-9) && blizko(s.s.x, 12.0, 0.01) && blizko(s.s.y, -9.0, 0.01) && s.hran === 4, JSON.stringify(s.s));
        await p.vyhodnot(`(document.querySelector('[data-sloup-tvar=kruh]').click(), 1)`);
        await pauza(150);
        s = await stav();
        kontrola('kulatý sloup', s.s.tvar === 'kruh', s.s.tvar);
        await p.vyhodnot(`(() => { const n = document.querySelector('[data-sloup-strecha]'); n.click(); return true; })()`);
        await pauza(200);
        s = await stav();
        kontrola('vypnutá střecha přes sloup: zpět šest hran', s.s.strecha === false && s.hran === 6 && s.nadVyklenkem === null, JSON.stringify(s));
        await p.vyhodnot(`(() => { const n = document.querySelector('[data-sloup-strecha]'); n.click(); return true; })()`);
        await pauza(200);
        s = await stav();
        kontrola('zapnutá zase přes sloup', s.s.strecha === undefined && s.hran === 4, JSON.stringify(s));

        console.log('\n4) Tah sloupu z rohu a zpět');
        await p.vyhodnot(`(() => { const d = ${D}; d.setSloup('tvar', 'ctverec'); d.setSloup('sirka', 0.2); return true; })()`);
        await pauza(200);
        await tah(await m(12.05, 9.05), await m(10.5, 11));
        s = await stav();
        const mimo = await p.vyhodnot(`document.querySelector('[data-panel-sloupu]')?.innerText || ''`);
        kontrola('mimo roh: střecha bez rozšíření, panel to řekne', !s.vRohu && s.hran === 6 && blizko(s.s.y, -11.05, 0.05) && mimo.length > 20, JSON.stringify(s));
        await tah(await m(10.5, 11.05), await m(11.9, 9.2));
        s = await stav();
        kontrola('tah zpět ke kraji: přichytí se do rohu', s.vRohu && blizko(s.s.x, 12.05, 0.01) && blizko(s.s.y, -9.05, 0.01) && s.hran === 4, JSON.stringify(s.s));
        // Otáčení kolečkem ↻: o 30° volně, kolem 89° se přichytí na směr stěn
        const otoc = async (stupnu) => {
            const b = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.sloupy[0]; const PX = d.engine.PX_PER_M;
                const k = d.renderer.schodyLayer.findOne(n => n.getAttr('_sloupOtocId')); const tr = d.stage.getAbsoluteTransform(); const r = d.stage.container().getBoundingClientRect();
                const q = tr.point({ x: k.x(), y: k.y() }), c = tr.point({ x: s.x * PX, y: -s.y * PX });
                const a = Math.atan2(q.y - c.y, q.x - c.x) + ${stupnu} * Math.PI / 180, L = Math.hypot(q.x - c.x, q.y - c.y);
                return { od: { x: Math.round(r.left + q.x), y: Math.round(r.top + q.y) }, kam: { x: Math.round(r.left + c.x + Math.cos(a) * L), y: Math.round(r.top + c.y + Math.sin(a) * L) }, u0: s.uhel }; })()`);
            await tah(b.od, b.kam);
            const u = await p.vyhodnot(`${D}.engine.dum.sloupy[0].uhel`);
            return { u0: b.u0, u: u, dst: (u - b.u0) * 180 / Math.PI };
        };
        const o30 = await otoc(30);
        kontrola('otočení kolečkem o 30°: drží natočení mimo směry stěn', blizko(o30.dst, 30, 2.5), JSON.stringify(o30));
        const o87 = await otoc(59);
        const zbytek = ((o87.u % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
        kontrola('k 89° od stěny se přichytí přesně na její směr', Math.min(zbytek, Math.PI / 2 - zbytek) < 1e-6, JSON.stringify(o87));
        // Společný magnet otáčení (nábytek, sloup, schody): při přichycení čára podél nejbližší stěny, po puštění zmizí
        const cara = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.sloupy[0], PX = d.engine.PX_PER_M; const stred = { x: s.x * PX, y: -s.y * PX }; const r = 600;
            d._domTah = { typ: 'sloupOtoc', id: s.id, stred, u0: s.uhel, a0: 0, last: { x: stred.x + r, y: stred.y }, start: { x: stred.x + r, y: stred.y }, posun: false };
            const a = 2 * Math.PI / 180; d.domPohyb({ x: stred.x + Math.cos(a) * r, y: stred.y + Math.sin(a) * r }, null); const pri = d._snapPreview ? { otoceni: !!d._snapPreview.otoceni, cara: !!d._snapPreview.line } : null;
            d.domPusteni(); return { pri, po: d._snapPreview }; })()`);
        kontrola('při přichycení ukáže čáru magnetu, po puštění zmizí', cara.pri && cara.pri.otoceni && cara.pri.cara && !cara.po, JSON.stringify(cara));
        const poTahu = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.sloupy[0]; return { u: s.uhel, hran: d._strechaVypocet().hrany.length }; })()`);
        kontrola('otočený sloup v rohu dál nese střechu', poTahu.hran === 4, JSON.stringify(poTahu));
        await p.vyhodnot(`(() => { const d = ${D}; d.undo(); d.undo(); return 1; })()`);
        const zpet = await p.vyhodnot(`(() => { const d = ${D}; d.undo(); const po = { ...d.engine.dum.sloupy[0] }; d.redo(); return po; })()`);
        kontrola('Zpět vrátí sloup před tahem', blizko(zpet.y, -11.05, 0.05), JSON.stringify(zpet));

        console.log('\n5) Oko v seznamu objektů, 3D');
        const oko = await p.vyhodnot(`(() => { const d = ${D}; d.prepniSkrytiObjektu({ type: 'sloup', id: 'C1' }); d._renderDum(); const skryty = d.renderer.schodyLayer.find(n => n.getAttr('_sloupId')).length;
            d.prepniSkrytiObjektu({ type: 'sloup', id: 'C1' }); d._renderDum(); const videt = d.renderer.schodyLayer.find(n => n.getAttr('_sloupId')).length; return { skryty, videt }; })()`);
        kontrola('skrytý sloup se v půdorysu nekreslí, po odkrytí zase ano', oko.skryty === 0 && oko.videt === 1, JSON.stringify(oko));
        const d3 = await p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1500));
            const sk = window._kk3d.dumSkupina; const mesh = sk.children.find(o => o.userData.sloup === 'C1'); if (!mesh) return null;
            mesh.geometry.computeBoundingBox(); const b = mesh.geometry.boundingBox; const st = d._strechaVypocet();
            const s = d.engine.dum.sloupy[0]; const PX = d.engine.PX_PER_M;
            const z = Math.min(...d._obrysSloupu(s).map(q => window.Strecha.vyskaVBode(st.plochy, q.x / PX, q.y / PX)));
            const stred = window.Strecha.vyskaVBode(st.plochy, s.x, -s.y);
            // Výklenek pod střechou: podhled ve výšce okapu a zeď od něj pod střechu na otevřených stranách
            const podhled = sk.children.filter(o => o.userData.podhled).length;
            const vyklenky = (st.vyklenky || []).length, zOkap = st.zOkap;
            const pod = sk.children.find(o => o.userData.podhled && o.geometry.type === 'ExtrudeGeometry');
            let vyskaPodhledu = null;
            if (pod) { pod.geometry.computeBoundingBox(); vyskaPodhledu = +(pod.geometry.boundingBox.max.z).toFixed(3); }
            d.rezim3d = false; await d.prepni2d?.(); return { vyska: +(b.max.z - b.min.z).toFixed(3), strecha: +z.toFixed(3), stred: +stred.toFixed(3), podhled, vyklenky, zOkap, vyskaPodhledu }; })()`);
        kontrola('ve 3D sahá sloup pod nejnižší roh střechy, nevyčuhuje', d3 && blizko(d3.vyska, d3.strecha, 0.01) && d3.strecha < d3.stred, JSON.stringify(d3));
        kontrola('nad výklenkem je podhled ve výšce okapu a zeď pod střechu, skrz není vidět', d3 && d3.vyklenky === 1 && d3.podhled >= 1 && d3.vyskaPodhledu !== null, JSON.stringify(d3));

        console.log('\n6) Uložení a obnovení');
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(2000);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor po obnovení');
        await pauza(800);
        s = await stav();
        kontrola('po obnovení sloup drží a střecha jde přes něj', s.s && s.s.id === 'C1' && blizko(s.s.x, 12.05, 0.01) && s.hran === 4, JSON.stringify(s));
        const smaz = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.selectedSloupy.add('C1'); d.domSmazVybrane(); const po = d.engine.dum.sloupy.length; const hran = d._strechaVypocet().hrany.length; d.undo(); return { po, hran, zpet: d.engine.dum.sloupy.length }; })()`);
        kontrola('Delete sloup smaže, střecha je zase bez rozšíření, Zpět ho vrátí', smaz.po === 0 && smaz.hran === 6 && smaz.zpet === 1, JSON.stringify(smaz));

        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.selectedSloupy.add('C1'); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(300);
        await p.snimek(path.join(vystup, 'sloup-2d.png'));
        kontrola('bez chyb v konzoli', !p.chyby.length, p.chyby.join(' | '));
    } catch (e) {
        chyb++;
        console.error('CHYBA', e.message);
    } finally {
        await p.zavri?.();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}
main();
