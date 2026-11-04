/**
 * Plovoucí panel nástroje: křížek na úchopu ukončí nástroj nebo výběr, tažení dojede až na kraj
 * plátna, větší obsah panel nevytlačí z plátna.
 *
 * Spuštění: node services/import-test/test-panel-nastroje-ui.cjs [složka snímků]
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
    const klikNa = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(250);
    };
    const krizek = () => p.vyhodnot(`(() => { const r = document.querySelector('[data-kk-panel-zavrit]').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    const uchop = () => p.vyhodnot(`(() => { const r = document.querySelector('.kk-panel-uchop').getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.bottom - 8) }; })()`);
    const viditelny = () => p.vyhodnot(`(() => document.getElementById('kk-panel-otvoru').offsetParent !== null)()`);
    const tahni = async (a, b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(250);
    };
    const vyberMistnost = () => p.vyhodnot(`(async () => { const d = ${D}; d.nastroj = 'vyber'; const m = d.engine.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; await new Promise(r => setTimeout(r, 250)); return m.id; })()`);
    const rozdil = () => p.vyhodnot(`(() => { const d = ${D}; const w = d.$refs.canvasWrap.getBoundingClientRect(), r = document.getElementById('kk-panel-otvoru').getBoundingClientRect(); return { vlevo: r.left - w.left - d.$refs.canvasWrap.clientLeft, nahore: r.top - w.top - d.$refs.canvasWrap.clientTop, vpravo: w.left + d.$refs.canvasWrap.clientLeft + d.$refs.canvasWrap.clientWidth - r.right, dole: w.top + d.$refs.canvasWrap.clientTop + d.$refs.canvasWrap.clientHeight - r.bottom }; })()`);
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
            body: JSON.stringify({ nazev: 'ClaudeTest panel ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 8*X, 0, 0.3, 'obvodova'); e.addWall(8*X, 0, 8*X, 6*X, 0.3, 'obvodova'); e.addWall(8*X, 6*X, 0, 6*X, 0.3, 'obvodova'); e.addWall(0, 6*X, 0, 0, 0.3, 'obvodova');
            d.panelOtvoruPoz = null; d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(1200);

        console.log('\n1) Křížek');
        await vyberMistnost();
        kontrola('vybraná místnost ukáže panel', await viditelny());
        await p.snimek(path.join(vystup, 'panel-krizek.png'));
        await klikNa(await krizek());
        let s = await p.vyhodnot(`(() => { const d = ${D}; return { inspector: d.inspector?.kind || null, vybrane: d.renderer.selectedMistnosti.size }; })()`);
        kontrola('křížek zruší výběr místnosti a panel zmizí', !(await viditelny()) && !s.inspector && s.vybrane === 0, JSON.stringify(s));
        for (const nastroj of ['stena', 'schody', 'otvor']) {
            await p.vyhodnot(`(() => { ${D}.nastroj = ${JSON.stringify(nastroj)}; return true; })()`);
            await pauza(250);
            const predtim = await viditelny();
            await klikNa(await krizek());
            s = await p.vyhodnot(`(() => ${D}.nastroj)()`);
            kontrola(`křížek ukončí nástroj ${nastroj}`, predtim && s === 'vyber' && !(await viditelny()), s);
        }
        await p.vyhodnot(`(() => { const d = ${D}; d.prepniPosunPodkladu(); return true; })()`);
        await pauza(250);
        const posun = await viditelny();
        await klikNa(await krizek());
        kontrola('křížek ukončí posun plánku', posun && !(await p.vyhodnot(`(() => ${D}.posunPodkladu)()`)) && !(await viditelny()));
        await vyberMistnost();
        await p.vyhodnot(`(async () => { const d = ${D}; await d.prepni3d(); await new Promise(r => setTimeout(r, 600)); return true; })()`);
        const ve3d = await viditelny();
        await klikNa(await krizek());
        kontrola('křížek funguje i ve 3D', ve3d && !(await viditelny()));
        await p.vyhodnot(`(async () => { ${D}.prepni2d(); await new Promise(r => setTimeout(r, 400)); return true; })()`);

        console.log('\n2) Tažení až na kraj');
        await vyberMistnost();
        const W = await p.vyhodnot(`(() => { const r = ${D}.$refs.canvasWrap.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; })()`);
        await tahni(await uchop(), { x: W.r + 300, y: W.b + 300 });
        let r = await rozdil();
        kontrola('vpravo dole dojede přesně na kraj', Math.abs(r.vpravo) <= 1 && Math.abs(r.dole) <= 1, JSON.stringify(r));
        await p.snimek(path.join(vystup, 'panel-kraj.png'));
        await tahni(await uchop(), { x: W.l - 300, y: W.t - 300 });
        r = await rozdil();
        kontrola('vlevo nahoře dojede přesně na kraj', Math.abs(r.vlevo) <= 1 && Math.abs(r.nahore) <= 1, JSON.stringify(r));

        console.log('\n3) Větší obsah panel nevytlačí');
        await tahni(await uchop(), { x: W.r + 300, y: W.b + 300 });
        await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostUroven('typ', 'snizena'); return true; })()`);
        await pauza(400);
        r = await rozdil();
        kontrola('po rozšíření panelu zůstává celý na plátně', r.vpravo >= -1 && r.dole >= -1, JSON.stringify(r));
        const zavrit = await p.vyhodnot(`(() => { const d = ${D}; d.panelOtvoruReset(); return d.panelOtvoruPoz; })()`);
        await pauza(200);
        r = await rozdil();
        kontrola('dvojklik vrátí výchozí roh s odsazením', zavrit === null && Math.abs(r.vlevo - 6) <= 1 && Math.abs(r.nahore - 6) <= 1, JSON.stringify(r));

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
