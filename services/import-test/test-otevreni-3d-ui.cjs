/**
 * Bug 58 („Passed-in canvas is empty"): editor otevřený rovnou ve 3D má skryté plátno 2D. Konva
 * kreslí poloprůhledné tvary s obrysem přes pomocné plátno velikosti plátna, při nule padá.
 * Export z takového stavu i export větší než okno musí tvary nakreslit celé.
 *
 * Spuštění: node services/import-test/test-otevreni-3d-ui.cjs [složka snímků]
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

// Poloprůhledný tvar s výplní i obrysem přes celý dům, Konva ho kreslí přes pomocné plátno
const TVAR = `new Konva.Line({ points: [14, 14, 1106, 14, 1106, 706, 14, 706], closed: true, fill: '#ff0000', stroke: '#ff0000', strokeWidth: 2, opacity: 0.6, listening: false, name: 'testTvar' })`;
// Podíl červených bodů v obdélníku canvasu (0 až 1 ve zlomcích rozměru)
const CERVENA = `(c, x0, x1, y0, y1) => { const g = c.getContext('2d'); const X = Math.round(c.width * x0), Y = Math.round(c.height * y0), W = Math.max(1, Math.round(c.width * (x1 - x0))), H = Math.max(1, Math.round(c.height * (y1 - y0))); const d = g.getImageData(X, Y, W, H).data; let n = 0, r = 0; for (let i = 0; i < d.length; i += 4 * 16) { n++; if (d[i + 3] > 10 && d[i] > d[i + 1] + 40 && d[i] > d[i + 2] + 40) r++; } return +(r / n).toFixed(2); }`;

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
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest otevření 3D ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 14*X, 0, 0.3, 'obvodova'); e.addWall(14*X, 0, 14*X, 9*X, 0.3, 'obvodova'); e.addWall(14*X, 9*X, 0, 9*X, 0.3, 'obvodova'); e.addWall(0, 9*X, 0, 0, 0.3, 'obvodova');
            d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(2000);

        console.log('\n1) Export z 2D, větší než okno');
        const zDvou = await p.vyhodnot(`(() => { const d = ${D}; const st = d.stage; const puv = [st.width(), st.height(), st.scaleX(), st.x(), st.y()]; const t = ${TVAR}; d.renderer.overlayLayer.add(t); const c = d._kresbyPodlazi([d.engine.dum.aktivni])[0].canvas; t.destroy(); d.renderer.render(); const f = ${CERVENA}; return { w: c.width, stage: [st.width(), st.height()], vlevo: f(c, 0.15, 0.2, 0.4, 0.6), vpravo: f(c, 0.8, 0.85, 0.4, 0.6), dole: f(c, 0.4, 0.6, 0.8, 0.85), obnoveno: st.width() === puv[0] && st.height() === puv[1] && st.scaleX() === puv[2] && st.x() === puv[3] && st.y() === puv[4] }; })()`);
        kontrola('poloprůhledný tvar je v exportu celý, i mimo velikost okna', zDvou.w > zDvou.stage[0] && zDvou.vlevo > 0.5 && zDvou.vpravo > 0.5 && zDvou.dole > 0.5, JSON.stringify(zDvou));
        kontrola('plátno má po exportu původní velikost a pohled', zDvou.obnoveno);

        console.log('\n2) Editor otevřený rovnou ve 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; await d.prepni3d(); await new Promise(r => setTimeout(r, 500)); d.ulozitNastaveni(); return true; })()`);
        await pauza(500);
        await p.jdiNa(await p.vyhodnot('location.href'));
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor');
        await pauza(1500);
        const kresleni = await p.vyhodnot(`(() => { const d = ${D}; const t = ${TVAR}; d.renderer.overlayLayer.add(t); let chyba = null; try { d.stage.draw(); } catch (e) { chyba = e.name + ': ' + e.message.slice(0, 120); } t.destroy(); return { rezim3d: d.rezim3d, stage: [d.stage.width(), d.stage.height()], buffer: [d.stage.bufferCanvas.width, d.stage.bufferCanvas.height], chyba }; })()`);
        kontrola('skryté plátno kreslí poloprůhledný tvar bez chyby (bug 58)', kresleni.rezim3d && kresleni.chyba === null, JSON.stringify(kresleni));
        const ze3d = await p.vyhodnot(`(() => { const d = ${D}; const t = ${TVAR}; d.renderer.overlayLayer.add(t); let chyba = null, c = null; try { c = d._kresbyPodlazi([d.engine.dum.aktivni])[0].canvas; } catch (e) { chyba = e.name + ': ' + e.message.slice(0, 120); } t.destroy(); d.renderer.render(); const f = ${CERVENA}; return { chyba, w: c?.width, vlevo: c ? f(c, 0.15, 0.2, 0.4, 0.6) : 0, vpravo: c ? f(c, 0.8, 0.85, 0.4, 0.6) : 0 }; })()`);
        kontrola('export ze 3D je celý', ze3d.chyba === null && ze3d.vlevo > 0.5 && ze3d.vpravo > 0.5, JSON.stringify(ze3d));
        await p.vyhodnot(`(() => { ${D}.prepni2d(); return true; })()`);
        await pauza(800);
        const po2d = await p.vyhodnot(`(() => { const d = ${D}; return { stage: [d.stage.width(), d.stage.height()], buffer: [d.stage.bufferCanvas.width, d.stage.bufferCanvas.height], obal: [d.$refs.konvaContainer.offsetWidth, d.$refs.konvaContainer.offsetHeight] }; })()`);
        kontrola('po přepnutí do 2D má plátno skutečnou velikost', po2d.stage[0] === po2d.obal[0] && po2d.stage[1] === po2d.obal[1] && po2d.stage[0] > 100, JSON.stringify(po2d));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));

        // Úklid: testovací koncept po sobě smazat
        await p.vyhodnot(`(async () => { const d = ${D}; await fetch(_kkInitData.routes.indexK + '/' + d.projektId, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' } }); return true; })()`);
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
