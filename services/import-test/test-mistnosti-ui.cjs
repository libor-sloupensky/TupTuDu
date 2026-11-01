/**
 * Místnosti z rastru: plochy, názvy, barvy, panel; volby stěny na plátně.
 *
 *   - dům 10 × 7 m, příčka uprostřed, oddělovač v pravé části → 3 místnosti s plochou k líci stěn
 *   - klik do plochy vybere místnost, panel ukáže název, plochu a paletu; název a barva se uloží
 *   - obnovení stránky: jména a barvy drží (záznam u kotvy), plochy se spočítají znovu
 *   - smazání oddělovače sloučí dvě místnosti, Zpět je vrátí i se jmény
 *   - nástroj Stěna má volby v panelu na plátně, ne v liště
 *
 * Spuštění: node services/import-test/test-mistnosti-ui.cjs [složka snímků]
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
const blizko = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(400);
    };
    const mistnosti = () => p.vyhodnot(`(() => { const d = ${D}; return d.engine.mistnosti.map(m => ({ id: m.id, nazev: m.nazev, barva: m.barva, kotva: [+(m.kotva.x/80).toFixed(2), +(m.kotva.y/80).toFixed(2)], plocha: d.renderer.plochaMistnosti(m.id) })); })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest místnosti ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Dům, příčka, oddělovač → 3 místnosti');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const PX = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*PX, 0, 0.4, 'obvodova');
            const w2 = e.addWall(10*PX, 0, 10*PX, 7*PX, 0.4, 'obvodova');
            const w3 = e.addWall(10*PX, 7*PX, 0, 7*PX, 0.4, 'obvodova');
            const w4 = e.addWall(0, 7*PX, 0, 0, 0.4, 'obvodova');
            const w5 = e.addWall(5*PX, 0, 5*PX, 7*PX, 0.15, 'pricka');
            const o = e.addOddelovac({ x: 7.5*PX, y: 0.2*PX, host: { stena: w1.id, t: 0.75, strana: 1 } }, { x: 7.5*PX, y: 6.8*PX, host: { stena: w3.id, t: 0.25, strana: 1 } });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render();
            return { w1: w1.id, w3: w3.id, w5: w5.id, o: o.id }; })()`);
        await pauza(500);
        let m = await mistnosti();
        const plochy = m.map(x => x.plocha).filter(x => x !== null).sort((a, b) => a - b);
        kontrola('3 místnosti se jmény Místnost 1–3', m.length === 3 && m.every(x => /^Místnost [123]$/.test(x.nazev)), JSON.stringify(m));
        kontrola('plochy k líci stěn: 15,2 · 16,0 · 31,2 m² (±0,4)', plochy.length === 3 && blizko(plochy[0], 15.18, 0.4) && blizko(plochy[1], 16.0, 0.4) && blizko(plochy[2], 31.19, 0.4), JSON.stringify(plochy));
        kontrola('barvy z palety, žádné dvě sousední stejné', new Set(m.map(x => x.barva)).size === 3, JSON.stringify(m.map(x => x.barva)));

        console.log('\n2) Výběr klikem, název a barva');
        await klik(await naObr(2.5 * 80, 3.5 * 80));
        const insp = await p.vyhodnot(`(() => { const d = ${D}; const i = d.inspector; return i ? { kind: i.kind, nazev: i.nazev, plocha: i.plocha, paleta: i.paleta.length, panel: document.getElementById('kk-panel-otvoru').offsetParent !== null } : null; })()`);
        kontrola('klik do levé místnosti: panel Místnost, plocha ≈ 31,2 m², paleta 8 barev', insp && insp.kind === 'mistnost' && blizko(insp.plocha, 31.19, 0.4) && insp.paleta === 8 && insp.panel, JSON.stringify(insp));
        const poNazvu = await p.vyhodnot(`(() => { const d = ${D}; d.setMistnostNazev('Obývák'); d.setMistnostBarva(window.PALETA_MISTNOSTI[3]);
            const m = d.engine.mistnosti.find(x => x.nazev === 'Obývák'); const texty = d.renderer.mistnostiLayer.find('Text').map(t => t.text());
            return { m: m && { barva: m.barva }, popisek: texty.some(t => /^Obývák\\n31,[0-9] m²$/.test(t)), vybranaSytejsi: !!m }; })()`);
        kontrola('název Obývák a barva z palety se zapsaly, popisek „Obývák / 31,x m²"', poNazvu.m && poNazvu.m.barva === '#fbf4d6' && poNazvu.popisek, JSON.stringify(poNazvu));
        await p.snimek(path.join(vystup, 'mistnosti-2d.png'));

        console.log('\n3) Uložení a obnovení');
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(1500);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 15000, 'editor po obnovení');
        await pauza(500);
        m = await mistnosti();
        const obyvak = m.find(x => x.nazev === 'Obývák');
        kontrola('po obnovení: 3 místnosti, Obývák s barvou a plochou', m.length === 3 && obyvak && obyvak.barva === '#fbf4d6' && blizko(obyvak.plocha, 31.19, 0.4), JSON.stringify(m));

        console.log('\n4) Sloučení po smazání oddělovače a Zpět');
        const slouceni = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; e.pushUndo(); e.removeOddelovac(${JSON.stringify(ids.o)}); d.renderer._mistnostiCache = null; d.renderer.render();
            const po = e.mistnosti.map(x => ({ nazev: x.nazev, plocha: d.renderer.plochaMistnosti(x.id) }));
            e.undo(); d.renderer._mistnostiCache = null; d.renderer.render();
            const zpet = e.mistnosti.map(x => ({ nazev: x.nazev, plocha: d.renderer.plochaMistnosti(x.id) }));
            return { po, zpet }; })()`);
        const sPlochou = slouceni.po.filter(x => x.plocha !== null);
        kontrola('bez oddělovače: 2 plochy (pravá 31,2 m²), záznam bez plochy zůstává', sPlochou.length === 2 && sPlochou.some(x => blizko(x.plocha, 31.19, 0.4) && x.nazev !== 'Obývák') && slouceni.po.length === 3, JSON.stringify(slouceni.po));
        kontrola('Zpět vrátí 3 místnosti i jména', slouceni.zpet.filter(x => x.plocha !== null).length === 3 && slouceni.zpet.some(x => x.nazev === 'Obývák'), JSON.stringify(slouceni.zpet));

        console.log('\n5) Volby stěny v panelu na plátně');
        const stena = await p.vyhodnot(`(async () => { const d = ${D}; d.renderer.clearSelection(); d.nastroj = 'stena'; d.stenaTyp = 'obvodova'; await new Promise(r => setTimeout(r, 250));
            const panel = document.getElementById('kk-panel-otvoru'); const text = panel.innerText.split(String.fromCharCode(10)).join(' ');
            const vPanelu = !!panel.querySelector('select[x-model=stenaTyp]'); const vListe = !!document.querySelector('.kk-lista select[x-model=stenaTyp]');
            d.stenaTyp = 'oddelovac'; await new Promise(r => setTimeout(r, 250)); const textOdd = panel.innerText.split(String.fromCharCode(10)).join(' ');
            d.nastroj = 'vyber'; d.stenaTyp = 'obvodova'; return { viditelny: panel.offsetParent !== null, text, vPanelu, vListe, textOdd }; })()`);
        kontrola('nástroj Stěna: panel „Nová stěna" s typem a tloušťkou, lišta bez voleb', stena.viditelny && /Nová stěna/.test(stena.text) && /tl:/.test(stena.text) && stena.vPanelu && !stena.vListe, JSON.stringify(stena));
        kontrola('oddělovač: panel bez tloušťky, s nápovědou', /Oddělovač místnosti/.test(stena.textOdd) && !/tl:/.test(stena.textOdd) && /líc/.test(stena.textOdd), JSON.stringify(stena.textOdd));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli (404 jen vypsat)', vazne.length === 0, vazne.slice(0, 3).map(c => c.text).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
