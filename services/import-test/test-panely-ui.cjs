/**
 * Panely vpravo: hlavičky bez počtů, „Použité objekty“, přesun panelu tahem za šestitečkový úchyt
 * (pořadí se uloží v prohlížeči a drží po načtení), klik na úchyt panel nerozbalí.
 *
 * Spuštění: node services/import-test/test-panely-ui.cjs [složka snímků]
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
    const p = await otevriProhlizec({ sirka: 1500, vyska: 1100 });
    const poradi = () => p.vyhodnot(`[...document.querySelectorAll('details[data-panel]')].filter(e => e.offsetParent).sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(e => e.dataset.panel)`);
    const stred = (sel) => p.vyhodnot(`(() => { const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    const mys = (typ, b, tlacitka) => p.cmd('Input.dispatchMouseEvent', { type: typ, x: b.x, y: b.y, button: 'left', buttons: tlacitka, clickCount: 1 });
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(localStorage.removeItem('kv3_poradiPanelu'), 1)`);
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest panely ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; e.addWall(0, 0, 8*X, 0, 0.3, 'obvodova'); e.addWall(8*X, 0, 8*X, 6*X, 0.3, 'obvodova'); d.renderer.render(); d.autoSave('Stěny'); return 1; })()`);
        await pauza(1200);

        console.log('\n1) Hlavičky panelů');
        const hlavicky = await p.vyhodnot(`[...document.querySelectorAll('details[data-panel] > summary')].map(s => s.innerText.replace(/\\s+/g, ' ').trim())`);
        kontrola('žádný panel nemá v hlavičce počet', hlavicky.every(t => !/\\d/.test(t)), JSON.stringify(hlavicky));
        kontrola('panel se jmenuje Použité objekty', hlavicky.some(t => t === 'Použité objekty'), JSON.stringify(hlavicky));

        console.log('\n2) Přesun tahem za úchyt');
        const pred = await poradi();
        const otevrenoPred = await p.vyhodnot(`document.querySelector('details[data-panel=historie]').open`);
        const od = await stred('[data-uchop-panelu=historie]');
        const kam = await stred('details[data-panel=plochy] > summary');
        await mys('mouseMoved', od, 0);
        await mys('mousePressed', od, 1);
        for (let i = 1; i <= 12; i++) await mys('mouseMoved', { x: od.x, y: Math.round(od.y + (kam.y - 8 - od.y) * i / 12) }, 1);
        await mys('mouseReleased', { x: od.x, y: kam.y - 8 }, 0);
        await pauza(300);
        const po = await poradi();
        const otevrenoPo = await p.vyhodnot(`document.querySelector('details[data-panel=historie]').open`);
        kontrola('Historie se přesunula úplně nahoru, ostatní drží pořadí', po[0] === 'historie' && po.slice(1).join() === pred.filter(x => x !== 'historie').join(), JSON.stringify({ pred, po }));
        kontrola('tah za úchyt panel nerozbalí ani nesbalí', otevrenoPred === otevrenoPo, JSON.stringify({ otevrenoPred, otevrenoPo }));
        await p.snimek(path.join(vystup, 'panely-poradi.png'));
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor po načtení');
        await pauza(800);
        const poNacteni = await poradi();
        kontrola('pořadí drží i po načtení stránky', poNacteni.join() === po.join(), JSON.stringify(poNacteni));
        await p.vyhodnot(`(localStorage.removeItem('kv3_poradiPanelu'), 1)`);
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
