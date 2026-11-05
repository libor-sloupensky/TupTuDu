/**
 * Zobrazení v panelu Objekty: body výchozí skryté a ukázané jen u vybrané stěny,
 * samostatné přepínače Stěny, Otvory a Značky, zalamování řádku přepínačů, klik v seznamu
 * jako na plánku, kóty (výchozí skryté, řetězce, rozměry místností), výkres přesně podle přepínačů.
 *
 * Spuštění: node services/import-test/test-zobrazeni-objektu-ui.cjs [složka snímků]
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
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const klik = async (x, y) => {
        const b = await naObr(x, y);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await pauza(80);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(300);
    };
    const tah = async (x0, y0, x1, y1) => {
        const a = await naObr(x0, y0), b = await naObr(x1, y1);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y });
        await pauza(80);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: a.x, y: a.y, button: 'left', clickCount: 1, buttons: 1 });
        await pauza(60);
        for (let i = 1; i <= 8; i++) {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8, button: 'left', buttons: 1 });
            await pauza(20);
        }
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(300);
    };
    const body = () => p.vyhodnot(`[...${D}.renderer._nodeShapes.keys()].sort()`);
    const stejne = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

    let konceptId = null;
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        // Starý uložený stav: kdo editor někdy otevřel, má uložené showNodes, showKoty a showZnacky true
        await p.vyhodnot(`(() => { const s = JSON.parse(localStorage.getItem('kv3_state') || '{}');
            delete s.bodyVzdy; delete s.kotyVzdy; delete s.znackyVzdy; s.showZnacky = true; delete s.showSteny; delete s.showOtvory; s.showNodes = true; s.showKoty = true; s.showObjekty = true;
            localStorage.setItem('kv3_state', JSON.stringify(s)); return true; })()`);
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest zobrazeni ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        konceptId = await p.vyhodnot(`${D}.projektId`);

        // Obdélník + příčka napojená do T na horní stěnu + okno v levé stěně
        const id = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine;
            e.walls.clear(); e.nodes.clear(); e.openings.clear();
            const a = e.addWall(0, 0, 800, 0, 0.3, 'obvodova');
            const b = e.addWall(800, 0, 800, 600, 0.3, 'obvodova');
            const c = e.addWall(800, 600, 0, 600, 0.3, 'obvodova');
            const l = e.addWall(0, 600, 0, 0, 0.3, 'obvodova');
            const t = e.addWall(400, 300, 400, 0, 0.1, 'pricka');
            t.doConstraint = { host: a.id, t: 0.5 };
            const okno = e.addOpening(l.id, 3, 1.2, 'okno', {});
            d.nastroj = 'vyber'; d.panelOpen.objekty = true;
            d.renderer.clearSelection(); d.fitView(); d.renderer.render();
            return { a: a.id, b: b.id, c: c.id, l: l.id, t: t.id, okno: okno.id !== undefined ? okno.id : okno,
                aA: a.nodeA, aB: a.nodeB, tA: t.nodeA, tB: t.nodeB, bB: b.nodeB, cB: c.nodeB }; })()`);
        await pauza(400);

        console.log('\n1) Výchozí stav: body skryté i přes starý uložený showNodes:true');
        kontrola('přepínač Body je vypnutý', (await p.vyhodnot(`${D}.showNodes`)) === false);
        kontrola('bez výběru není vidět žádný bod', (await body()).length === 0, JSON.stringify(await body()));

        console.log('\n2) Klik na stěnu ukáže její body, opuštění je skryje');
        await klik(200, 0);
        kontrola('stěna je vybraná', await p.vyhodnot(`${D}.renderer.selectedWalls.has(${JSON.stringify(id.a)})`));
        const bodyA = await body();
        kontrola('vidět jsou oba konce stěny a konec napojené příčky', stejne(bodyA, [id.aA, id.aB, id.tB]), JSON.stringify(bodyA));
        await klik(150, 300);
        kontrola('klik mimo zruší výběr', (await p.vyhodnot(`${D}.renderer.selectedWalls.size`)) === 0);
        kontrola('body jsou zase skryté', (await body()).length === 0, JSON.stringify(await body()));

        console.log('\n3) Klik na stěnu těsně u rohu vybere stěnu, ne bod');
        // Panel vybrané místnosti by tohle místo zakryl
        await p.vyhodnot(`(() => { ${D}.renderer.clearSelection(); return true; })()`);
        await pauza(200);
        await klik(15, 0);
        const uRohu = await p.vyhodnot(`(() => { const r = ${D}.renderer; return { steny: [...r.selectedWalls], body: [...r.selectedNodes] }; })()`);
        kontrola('vybraná je stěna, bod ne', uRohu.steny.length === 1 && uRohu.body.length === 0, JSON.stringify(uRohu));

        console.log('\n4) Ukázaný bod jde chytit a výběr bodu ostatní neschová');
        await klik(150, 300);
        await klik(800, 300);          // pravá stěna, její spodní konec je roh s dolní stěnou
        const predTahem = await p.vyhodnot(`(() => { const n = ${D}.engine.nodes.get(${JSON.stringify(id.bB)}); return { x: n.x, y: n.y }; })()`);
        await tah(800, 600, 860, 660);
        const poTahu = await p.vyhodnot(`(() => { const d = ${D}; const n = d.engine.nodes.get(${JSON.stringify(id.bB)}); return { x: n.x, y: n.y, vidim: d.renderer._nodeShapes.has(${JSON.stringify(id.bB)}), pocet: d.renderer._nodeShapes.size }; })()`);
        kontrola('roh se tažením posunul', poTahu.x > predTahem.x + 20 && poTahu.y > predTahem.y + 20, JSON.stringify(poTahu));
        kontrola('po tažení jsou body pořád vidět', poTahu.vidim && poTahu.pocet >= 3, JSON.stringify(poTahu));
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.undo?.(); d.renderer.clearSelection(); return true; })()`);
        await pauza(200);

        console.log('\n5) Přepínač Body ukáže všechny bez výběru a pamatuje se');
        const zaskrtni = (popisek) => p.vyhodnot(`(() => {
            const l = [...document.querySelectorAll('details.kk-section label')].find(x => x.textContent.trim() === ${JSON.stringify(popisek)});
            if (!l) return false; l.querySelector('input').click(); return true; })()`);
        kontrola('přepínač Body je v panelu', await zaskrtni('Body'));
        await pauza(200);
        const vsechny = await p.vyhodnot(`${D}.engine.nodes.size`);
        kontrola('vidět jsou všechny body', (await body()).length === vsechny, `${(await body()).length} z ${vsechny}`);
        kontrola('zapsáno pod novým klíčem', (await p.vyhodnot(`JSON.parse(localStorage.getItem('kv3_state')).bodyVzdy`)) === true);
        await zaskrtni('Body');
        await pauza(200);
        kontrola('po vypnutí zase nic', (await body()).length === 0);

        console.log('\n6) Řádek přepínačů');
        const radek = await p.vyhodnot(`(() => {
            const prvni = [...document.querySelectorAll('details.kk-section label')].find(x => x.textContent.trim() === 'Stěny');
            const div = prvni.parentElement; const st = getComputedStyle(div);
            const nazvy = [...div.querySelectorAll('label')].map(l => l.textContent.trim());
            const horni = [...new Set([...div.querySelectorAll('label')].map(l => Math.round(l.getBoundingClientRect().top)))];
            const pretek = [...div.querySelectorAll('label')].some(l => l.getBoundingClientRect().right > div.getBoundingClientRect().right + 0.5);
            return { wrap: st.flexWrap, nazvy, radku: horni.length, pretek, sirka: Math.round(div.getBoundingClientRect().width) }; })()`);
        kontrola('přepínače jsou Stěny, Otvory, Kóty, Značky, Body, Místnosti, Vybavení', radek.nazvy.join() === 'Stěny,Otvory,Kóty,Značky,Body,Místnosti,Vybavení', radek.nazvy.join());
        kontrola('řádek se zalamuje a nic nepřetéká', radek.wrap === 'wrap' && !radek.pretek, JSON.stringify(radek));
        const uzky = await p.vyhodnot(`(() => {
            const div = [...document.querySelectorAll('details.kk-section label')].find(x => x.textContent.trim() === 'Stěny').parentElement;
            const puvodne = div.style.width; div.style.width = '220px';
            const labely = [...div.querySelectorAll('label')];
            const radku = new Set(labely.map(l => Math.round(l.getBoundingClientRect().top))).size;
            const pretek = labely.some(l => l.getBoundingClientRect().right > div.getBoundingClientRect().right + 0.5);
            const naKus = labely.some(l => l.getBoundingClientRect().height > 24);
            div.style.width = puvodne; return { radku, pretek, naKus }; })()`);
        kontrola('v úzkém panelu jdou přepínače na další řádek celé', uzky.radku >= 2 && !uzky.pretek && !uzky.naKus, JSON.stringify(uzky));
        await p.vyhodnot(`document.querySelector('details.kk-section label')?.scrollIntoView(); true`);
        await p.snimek(path.join(vystup, 'zobrazeni-objektu-panel.png'));

        console.log('\n7) Seznam objektů: najetí a klik jako na plánku');
        const naRadek = (oid) => p.vyhodnot(`(() => { const el = [...document.querySelectorAll('.kk-oznaceni')].find(x => x.textContent.trim() === ${JSON.stringify(oid)});
            if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
        const klikObr = async (b, modifiers = 0) => {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, modifiers });
            await pauza(80);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1, modifiers });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1, modifiers });
            await pauza(400);
        };
        const vyberStav = () => p.vyhodnot(`(() => { const d = ${D}, r = d.renderer, i = d.inspector; return JSON.stringify({ steny: [...r.selectedWalls].sort(), otvory: [...r.selectedOpenings].sort(), body: [...r.selectedNodes],
            druh: i && i.kind, koty: (r._kotyVyberu || []).length, uzly: [...r._nodeShapes.keys()].sort(), vyber: r.selectionLayer.getChildren().length, nastroj: d.nastroj }); })()`);
        const zrus = async () => { await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.nastroj = 'vyber'; return true; })()`); await pauza(200); };
        const CTRL = 2;
        const bodSteny = await naObr(400, 600), bodSteny2 = await naObr(800, 300), bodOtvoru = await naObr(0, 312);

        await zrus();
        const radekOkna = await naRadek(id.okno);
        const barvaOtvoru = () => p.vyhodnot(`${D}.renderer._openingShapes.get(${JSON.stringify(id.okno)}).fill()`);
        const barvaPred = await barvaOtvoru();
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: radekOkna.x, y: radekOkna.y });
        await pauza(200);
        const barvaNajeti = await barvaOtvoru();
        kontrola('najetí na řádek otvor na plánku podbarví', barvaNajeti !== barvaPred, `${barvaPred} → ${barvaNajeti}`);
        await p.snimek(path.join(vystup, 'zobrazeni-objektu-najeti-otvor.png'));
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: bodSteny2.x, y: bodSteny2.y });
        await pauza(200);
        kontrola('po odjetí barva zase zmizí', (await barvaOtvoru()) === barvaPred);

        for (const [nazev, oid, bod] of [['stěna', id.c, bodSteny], ['otvor', id.okno, bodOtvoru]]) {
            await zrus();
            await klikObr(bod);
            const naPlanku = await vyberStav();
            await zrus();
            await klikObr(await naRadek(oid));
            const veSeznamu = await vyberStav();
            kontrola(`${nazev}: klik v seznamu = klik na plánku`, naPlanku === veSeznamu && naPlanku.includes(oid), `plánek ${naPlanku} | seznam ${veSeznamu}`);
        }

        await zrus();
        await klikObr(bodSteny);
        await klikObr(bodSteny2, CTRL);
        const ctrlPlanek = await vyberStav();
        await zrus();
        await klikObr(await naRadek(id.c));
        await klikObr(await naRadek(id.b), CTRL);
        const ctrlSeznam = await vyberStav();
        kontrola('Ctrl+klik přidává do výběru stejně na plánku i v seznamu', ctrlPlanek === ctrlSeznam && JSON.parse(ctrlSeznam).steny.length === 2, `plánek ${ctrlPlanek} | seznam ${ctrlSeznam}`);
        await klikObr(await naRadek(id.b), CTRL);
        kontrola('druhý Ctrl+klik v seznamu položku z výběru ubere', JSON.parse(await vyberStav()).steny.length === 1);

        await zrus();
        await p.vyhodnot(`(() => { ${D}.nastroj = 'stena'; return true; })()`);
        await pauza(200);
        await klikObr(await naRadek(id.c));
        const zNastroje = JSON.parse(await vyberStav());
        kontrola('z kreslení přepne na výběr a stěnu vybere', zNastroje.nastroj === 'vyber' && zNastroje.steny.includes(id.c), JSON.stringify(zNastroje));

        await zrus();
        await p.vyhodnot(`(() => { ${D}.rezimStrecha = true; return true; })()`);
        await klikObr(await naRadek(id.c));
        const veStrese = JSON.parse(await vyberStav());
        await p.vyhodnot(`(() => { ${D}.rezimStrecha = false; return true; })()`);
        kontrola('v režimu střechy nevybírá, stejně jako plánek', veStrese.steny.length === 0, JSON.stringify(veStrese));

        await zrus();
        await p.vyhodnot(`(() => { const d = ${D}; d.showOtvory = false; d.toggleOtvory(); return true; })()`);
        await pauza(150);
        await klikObr(await naRadek(id.okno));
        const zeSkryteho = await p.vyhodnot(`(() => { const d = ${D}, r = d.renderer; return { ui: d.showOtvory, tvary: r._openingShapes.size, vybran: [...r.selectedOpenings] }; })()`);
        kontrola('klik na schovaný otvor v seznamu otvory zapne a vybere', zeSkryteho.ui === true && zeSkryteho.tvary === 1 && zeSkryteho.vybran[0] === id.okno, JSON.stringify(zeSkryteho));

        console.log('\n8) Otvory zvlášť');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([], [], [${JSON.stringify(id.okno)}]); return true; })()`);
        kontrola('s otvory je okno nakreslené', (await p.vyhodnot(`${D}.renderer._openingShapes.size`)) === 1);
        await zaskrtni('Otvory');
        await pauza(200);
        const bezOtvoru = await p.vyhodnot(`(() => { const r = ${D}.renderer; return { otvory: r._openingShapes.size, vybrane: r.selectedOpenings.size, steny: r._wallShapes.size, koty: [...r._labelShapes.keys()].filter(k => k.startsWith('kota_')).length }; })()`);
        kontrola('otvor zmizel a není vybraný', bezOtvoru.otvory === 0 && bezOtvoru.vybrane === 0, JSON.stringify(bezOtvoru));
        kontrola('stěny zůstaly', bezOtvoru.steny === 5, JSON.stringify(bezOtvoru));

        console.log('\n9) Stěny zvlášť');
        await zaskrtni('Otvory');
        await zaskrtni('Stěny');
        await pauza(200);
        const bezSten = await p.vyhodnot(`(() => { const r = ${D}.renderer; return { steny: r._wallShapes.size, otvory: r._openingShapes.size, body: r._nodeShapes.size, koty: [...r._labelShapes.keys()].filter(k => k.startsWith('kota_')).length }; })()`);
        kontrola('stěny, jejich body a kóty zmizely', bezSten.steny === 0 && bezSten.body === 0 && bezSten.koty === 0, JSON.stringify(bezSten));
        kontrola('otvor zůstal', bezSten.otvory === 1, JSON.stringify(bezSten));

        console.log('\n10) Značky');
        await zaskrtni('Stěny');
        await pauza(200);
        const znacek = () => p.vyhodnot(`[...${D}.renderer._labelShapes.keys()].filter(k => k.startsWith('id_')).length`);
        kontrola('značky W a O jsou výchozí skryté i přes starý uložený showZnacky:true', (await p.vyhodnot(`${D}.showZnacky`)) === false && (await znacek()) === 0, 'značek: ' + await znacek());
        kontrola('přepínač Značky je v panelu', await zaskrtni('Značky'));
        await pauza(200);
        kontrola('po zapnutí jsou vidět', (await znacek()) > 0, 'značek: ' + await znacek());
        kontrola('zapnutí se uloží', (await p.vyhodnot(`JSON.parse(localStorage.getItem('kv3_state')).znackyVzdy`)) === true);
        await zaskrtni('Značky');
        await pauza(200);
        kontrola('po vypnutí žádná značka', (await znacek()) === 0);
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([${JSON.stringify(id.a)}]); d.renderer.clearSelection(); return true; })()`);
        await pauza(150);
        kontrola('značky se samy nevrátí po překreslení', (await znacek()) === 0);
        kontrola('vypnutí se uloží', (await p.vyhodnot(`JSON.parse(localStorage.getItem('kv3_state')).znackyVzdy`)) === false);

        console.log('\n11) Kóty: výchozí skryté, délka jen u výběru');
        const kotyStav = () => p.vyhodnot(`(() => { const r = ${D}.renderer; return { rady: r._kotyRetezce, delky: [...r._labelShapes.keys()].filter(k => k.startsWith('kota_') && k !== 'kota_retezce') }; })()`);
        const celkem = (st) => st.rady.filter(x => x.druh === 'celkem').map(x => x.cm[0]).sort((a, b) => a - b);
        const plan = (kod) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; e.walls.clear(); e.nodes.clear(); e.openings.clear(); e.oddelovace.clear();
            ${kod}
            d.nastroj = 'vyber'; d.renderer.clearSelection(); d.renderer._mistnostiCache = null; d.fitView(); d.renderer.render(); return true; })()`);
        await plan(`const W = (a, b, c, f, t = 0.3) => e.addWall(a, b, c, f, t, t > 0.2 ? 'obvodova' : 'pricka');
            W(0, 0, 640, 0); W(640, 0, 640, 400); W(640, 400, 0, 400); const l = W(0, 400, 0, 0); W(240, 400, 240, 0, 0.1);
            e.addOpening(l.id, 2, 1, 'okno', {});`);
        await pauza(400);
        kontrola('kóty jsou výchozí skryté i přes starý uložený showKoty:true', (await p.vyhodnot(`${D}.showKoty`)) === false);
        let k = await kotyStav();
        kontrola('bez výběru žádná kóta', k.rady.length === 0 && k.delky.length === 0, JSON.stringify(k));
        const stena = await p.vyhodnot(`[...${D}.engine.walls.keys()][0]`);
        await p.vyhodnot(`(() => { ${D}.renderer.setSelection([${JSON.stringify(stena)}]); return true; })()`);
        await pauza(250);
        k = await kotyStav();
        kontrola('u vybrané stěny je vidět její délka, u ostatních ne', k.delky.length === 1 && k.delky[0] === 'kota_' + stena && k.rady.length === 0, JSON.stringify(k));
        await p.vyhodnot(`(() => { ${D}.renderer.clearSelection(); return true; })()`);

        console.log('\n12) Kóty zapnuté: řetězce a místnosti');
        kontrola('přepínač Kóty je v panelu', await zaskrtni('Kóty'));
        await pauza(500);
        k = await kotyStav();
        kontrola('celkové rozměry jednou na směr: 8,30 x 5,30 m', JSON.stringify(celkem(k)) === JSON.stringify([530, 830]), JSON.stringify(k.rady));
        const sOknem = k.rady.find(x => x.druh === 'otvory');
        kontrola('otvor a pilíře na fasádě s oknem, součet sedí', sOknem && sOknem.cm.includes(100) && sOknem.cm.reduce((a, b) => a + b, 0) === 530, JSON.stringify(sOknem));
        kontrola('bez zalomení a bez otvorů žádná další řada', k.rady.length === 3, k.rady.map(x => x.strana + ':' + x.druh).join());
        const popisky = () => p.vyhodnot(`${D}.renderer._mistnostiPopisky.filter(t => t.visible()).map(t => t.text())`);
        let pop = await popisky();
        kontrola('rozměry místností u názvu', pop.some(x => x.includes('2,80 × 4,70 m')) && pop.some(x => x.includes('4,80 × 4,70 m')), JSON.stringify(pop));
        const prekryti = () => p.vyhodnot(`(() => { const d = ${D}; const sk = d.renderer._labelShapes.get('kota_retezce'); const b = sk.getChildren(x => x.getClassName() === 'Text').map(t => t.getClientRect());
            let n = 0; for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) if (b[i].x < b[j].x + b[j].width && b[j].x < b[i].x + b[i].width && b[i].y < b[j].y + b[j].height && b[j].y < b[i].y + b[i].height) n++;
            return { cisel: b.length, prekryvu: n }; })()`);
        const pr = await prekryti();
        kontrola('čísla řetězců se nepřekrývají', pr.cisel > 3 && pr.prekryvu === 0, JSON.stringify(pr));
        await p.snimek(path.join(vystup, 'zobrazeni-objektu-koty.png'));

        console.log('\n13) Přiblížení: co se nevejde, nekreslí se');
        await p.vyhodnot(`(() => { const d = ${D}; d.stage.scale({ x: 0.12, y: 0.12 }); d.zoom = 0.12; d.renderer.poZmeneZoomu(); return true; })()`);
        await pauza(200);
        k = await kotyStav();
        pop = await popisky();
        kontrola('hodně oddáleno: bez podrobné řady, bez rozměrů místností', !k.rady.some(x => x.druh === 'otvory') && !pop.some(x => x.includes('×')), JSON.stringify({ rady: k.rady, pop }));
        await p.vyhodnot(`(() => { ${D}.fitView(); return true; })()`);
        await pauza(300);
        k = await kotyStav();
        kontrola('po přiblížení se vrátí', k.rady.some(x => x.druh === 'otvory') && (await popisky()).some(x => x.includes('×')));

        console.log('\n14) Natočený a zalomený dům');
        await plan(`const a = 30 * Math.PI / 180; const R = (x, y) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
            const W = (p1, p2) => e.addWall(...R(...p1), ...R(...p2), 0.3, 'obvodova');
            W([0, 0], [640, 0]); W([640, 0], [640, 400]); W([640, 400], [0, 400]); W([0, 400], [0, 0]);`);
        await pauza(500);
        k = await kotyStav();
        kontrola('natočený dům má stejné rozměry', JSON.stringify(celkem(k)) === JSON.stringify([530, 830]), JSON.stringify(k.rady));
        pop = await popisky();
        kontrola('natočený dům: světlý rozměr místnosti', pop.some(x => x.includes('7,70 × 4,70 m') || x.includes('4,70 × 7,70 m')), JSON.stringify(pop));
        await plan(`const W = (a, b, c, f) => e.addWall(a, b, c, f, 0.3, 'obvodova');
            W(0, 0, 800, 0); W(800, 0, 800, 600); W(800, 600, 400, 600); W(400, 600, 400, 300); W(400, 300, 0, 300); W(0, 300, 0, 0);`);
        await pauza(500);
        k = await kotyStav();
        const useky = k.rady.filter(x => x.druh === 'useky');
        kontrola('zalomená fasáda má řadu úseků a součty sedí', useky.length === 2 && useky.every(x => [1030, 780].includes(x.cm.reduce((a, b) => a + b, 0))), JSON.stringify(k.rady));
        pop = await popisky();
        kontrola('místnost do L rozměr nemá, jedno číslo by lhalo', pop.length === 1 && !pop[0].includes('×'), JSON.stringify(pop));
        await p.snimek(path.join(vystup, 'zobrazeni-objektu-koty-l.png'));
        await zaskrtni('Kóty');
        await pauza(300);
        k = await kotyStav();
        kontrola('po vypnutí Kót nic nezbude', k.rady.length === 0 && k.delky.length === 0 && !(await popisky()).some(x => x.includes('×')), JSON.stringify(k));
        await plan(`const W = (a, b, c, f) => e.addWall(a, b, c, f, 0.3, 'obvodova');
            W(0, 0, 800, 0); W(800, 0, 800, 600); W(800, 600, 0, 600); const l = W(0, 600, 0, 0);
            e.addOpening(l.id, 3, 1.2, 'okno', {});`);
        await pauza(300);

        console.log('\n15) Výkres je přesně podle přepínačů');
        const kresba = () => p.vyhodnot(`(() => { const d = ${D}; const k = d._kresbyPodlazi([d.engine.dum.aktivni])[0]; return k.canvas ? k.canvas.toDataURL('image/png') : null; })()`);
        const zaklad = await kresba();
        kontrola('výkres vznikl', !!zaklad);
        const prepinace = ['Stěny', 'Otvory', 'Kóty', 'Značky', 'Body'];
        for (const nazev of prepinace) {
            await zaskrtni(nazev);
            await pauza(200);
            const jina = await kresba();
            await zaskrtni(nazev);
            await pauza(200);
            const zpet = await kresba();
            kontrola(`přepínač ${nazev} změní výkres a po vrácení je stejný`, jina && jina !== zaklad && zpet === zaklad);
        }
        const nastaveni = await p.vyhodnot(`(() => { const r = ${D}.renderer; const pred = [r.showSteny, r.showOtvory, r.showKoty, r.showIds, r.showNodes].join(); ${D}._kresbyPodlazi([${D}.engine.dum.aktivni]); return { pred, po: [r.showSteny, r.showOtvory, r.showKoty, r.showIds, r.showNodes].join() }; })()`);
        kontrola('výkres nastavení nezmění', nastaveni.pred === nastaveni.po, JSON.stringify(nastaveni));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([[...d.engine.walls.keys()][0]]); return true; })()`);
        await pauza(200);
        const sVyberem = await kresba();
        await p.vyhodnot(`(() => { ${D}.renderer.clearSelection(); return true; })()`);
        kontrola('výběr ani jeho body se do výkresu nedostanou', sVyberem === zaklad);

        console.log('\n16) Tytéž přepínače v sekci Export');
        await p.vyhodnot(`(() => { ${D}.panelOpen.export = true; return true; })()`);
        await pauza(300);
        const vExportu = await p.vyhodnot(`(() => { const sekce = document.querySelector('[data-export-prepinace]'); if (!sekce) return null;
            const r = sekce.getBoundingClientRect(); return { nazvy: [...sekce.querySelectorAll('label')].map(l => l.textContent.trim()), vidim: r.height > 0, pretek: [...sekce.querySelectorAll('label')].some(l => l.getBoundingClientRect().right > r.right + 0.5) }; })()`);
        kontrola('v sekci Export je všech sedm přepínačů a nepřetékají', vExportu && vExportu.nazvy.join() === 'Stěny,Otvory,Kóty,Značky,Body,Místnosti,Vybavení' && vExportu.vidim && !vExportu.pretek, JSON.stringify(vExportu));
        const klikVExportu = (nazev) => p.vyhodnot(`(() => { const l = [...document.querySelectorAll('[data-export-prepinace] label')].find(x => x.textContent.trim() === ${JSON.stringify(nazev)}); if (!l) return false; l.querySelector('input').click(); return true; })()`);
        const obePole = (nazev) => p.vyhodnot(`[...document.querySelectorAll('details.kk-section label')].filter(x => x.textContent.trim() === ${JSON.stringify(nazev)}).map(l => l.querySelector('input').checked)`);
        await klikVExportu('Kóty');
        await pauza(300);
        const ctvereckyKoty = await obePole('Kóty');
        kontrola('zaškrtnutí v Exportu platí i v panelu Objekty a na plánku', ctvereckyKoty.length === 2 && ctvereckyKoty.every(x => x === true) && (await p.vyhodnot(`${D}.renderer.showKoty`)) === true && (await p.vyhodnot(`${D}.renderer._kotyRetezce.length`)) > 0, JSON.stringify(ctvereckyKoty));
        const sKotami = await kresba();
        kontrola('výkres po zapnutí v Exportu kóty má', sKotami && sKotami !== zaklad);
        const textyListu = () => p.vyhodnot(`(() => { const d = ${D}; const puv = CanvasRenderingContext2D.prototype.fillText; const t = []; CanvasRenderingContext2D.prototype.fillText = function (x, ...z) { t.push(String(x)); return puv.call(this, x, ...z); }; try { d._listPudorysu(d._kresbyPodlazi([d.engine.dum.aktivni])); } finally { CanvasRenderingContext2D.prototype.fillText = puv; } return t.filter(x => x.startsWith('1 m')); })()`);
        const zapatiS = await textyListu();
        await klikVExportu('Kóty');
        await pauza(300);
        const zapatiBez = await textyListu();
        kontrola('poznámka „kóty v cm" je na listu jen s kótami', zapatiS.some(x => x.includes('kóty v cm')) && zapatiBez.length && !zapatiBez.some(x => x.includes('kóty v cm')), JSON.stringify({ zapatiS, zapatiBez }));
        const obePoleBez = await obePole('Kóty');
        kontrola('vypnutí v Exportu platí všude', obePoleBez.every(x => x === false), JSON.stringify(obePoleBez));
        await p.snimek(path.join(vystup, 'zobrazeni-objektu-export.png'));

        console.log('\n17) Nástroj si schovanou vrstvu zapne a stav přežije načtení');
        await zaskrtni('Otvory');
        await pauza(150);
        await p.vyhodnot(`(() => { ${D}.nastroj = 'otvor'; return true; })()`);
        await pauza(200);
        kontrola('nástroj Otvor zapnul otvory', (await p.vyhodnot(`${D}.showOtvory`)) === true && (await p.vyhodnot(`${D}.renderer.showOtvory`)) === true);
        await p.vyhodnot(`(() => { ${D}.nastroj = 'vyber'; return true; })()`);
        await zaskrtni('Otvory');
        await pauza(200);
        await p.vyhodnot(`location.reload(); true`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.renderer)`, 20000, 'editor po načtení');
        await pauza(800);
        const poReloadu = await p.vyhodnot(`(() => { const d = ${D}; return { ui: d.showOtvory, kresli: d.renderer.showOtvory, tvary: d.renderer._openingShapes.size }; })()`);
        kontrola('schované otvory drží po načtení stránky', poReloadu.ui === false && poReloadu.kresli === false && poReloadu.tvary === 0, JSON.stringify(poReloadu));
        await p.vyhodnot(`(() => { const d = ${D}; d.showOtvory = true; d.toggleOtvory(); return true; })()`);

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text + ' ' + (c.url || '')).join(' | '));
    } finally {
        // Po sobě smazat jen koncept, který tenhle běh založil
        if (konceptId) await p.vyhodnot(`fetch('/masterteam/koncept-v3/' + ${JSON.stringify(konceptId)}, { method:'DELETE',
            headers:{'X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'} }).then(r => r.status)`).catch(() => {});
        await p.zavri();
    }

    console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
    process.exit(chyb === 0 ? 0 : 1);
}

main().catch(e => { console.error('\nSELHALO:', e.message); process.exit(1); });
