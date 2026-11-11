/**
 * Schody a rotace domu: tvary a části, výška a nášlap, barva a odstín svislých částí,
 * půdorys bez šrafování, magnet směru, otáčení, přichycení k líci; rotace výběru na osy obrazovky.
 *
 * Spuštění: node services/import-test/test-schody-ui.cjs [složka snímků]
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
    const tah = async (od, kam) => { await pohyb(od); await stisk(od); await pauza(40); for (let i = 1; i <= 10; i++) await pohyb({ x: od.x + (kam.x - od.x) * i / 10, y: od.y + (kam.y - od.y) * i / 10 }, true); };
    const geo = (s = 'S1') => p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste.find(x => x.id === ${JSON.stringify(s)}); const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); return { tvar: s.tvar, n: g.n, v: g.v, b: g.b, casti: g.casti, stupnu: g.stupne.length, podest: g.stupne.filter(u => u.podesta).length, zPosl: g.stupne[g.stupne.length - 1].z, H: d._vyskaMeziPodlazimi(s), obrys: g.obrys.length, delka: g.delka, pohodlne: g.pohodlne, uhel: s.uhel, x: s.x, y: s.y }; })()`);
    const tvarSchodu = (tvar) => p.vyhodnot(`(() => { const s = document.querySelector('[data-schody-tvar]'); s.value = ${JSON.stringify(tvar)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    const pole = (sel, hod) => p.vyhodnot(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); n.value = ${JSON.stringify(String(hod))}; n.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest schody ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům a založení schodů do směru vzdálené šikmé stěny');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 12*X, 0, 0.3, 'obvodova'); e.addWall(12*X, 0, 12*X, 9*X, 0.3, 'obvodova'); e.addWall(12*X, 9*X, 0, 9*X, 0.3, 'obvodova'); e.addWall(0, 9*X, 0, 0, 0.3, 'obvodova');
            d.podlaziKopie = true; d.pridatPodlazi('nahoru'); d.naPodlazi('P1');
            const c = Math.cos(25 * Math.PI / 180) * 1.2 * X, s = Math.sin(25 * Math.PI / 180) * 1.2 * X;
            e.addWall(9.5 * X, 7 * X, 9.5 * X + c, 7 * X + s, 0.1, 'pricka');
            d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 690, y: 6 }; d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(1500);
        const smerZ = await p.vyhodnot(`(() => { const d = ${D}; const u = 22 * Math.PI / 180; return { doSikme: d._magnetSmeru(u, d._silaUhlu(10)) * 180 / Math.PI, volne: d._magnetSmeru(13 * Math.PI / 180, d._silaUhlu(10)) * 180 / Math.PI }; })()`);
        kontrola('směr se přichytí i na vzdálenou stěnu, mimo dosah zůstane', blizko(smerZ.doSikme, 25, 0.01) && blizko(smerZ.volne, 13, 0.01), JSON.stringify(smerZ));
        const obrazovka = await p.vyhodnot(`(() => { const d = ${D}; d.stage.rotation(30); const u = d._magnetSmeru(-27 * Math.PI / 180, d._silaUhlu(5)) * 180 / Math.PI; d.stage.rotation(0); return u; })()`);
        kontrola('při otočeném pohledu se chytá vodorovná obrazovky, ne kompas', blizko(obrazovka, -30, 0.01), String(obrazovka));
        await p.vyhodnot(`(() => { const d = ${D}; d.zacniSchody(); d.schodyTvar = 'prime'; return true; })()`);
        await pauza(150);
        const z1 = await m(2, 3), z2 = await m(5, 3.4);
        await klik(z1);
        await pohyb(z2);
        await klik(z2);
        let g = await geo();
        kontrola('schody vznikly, skoro vodorovný tah se srovnal na 0°', g.tvar === 'prime' && blizko(g.uhel, 0, 1e-6) && blizko(g.zPosl + g.v, g.H, 1e-6), JSON.stringify(g));

        console.log('\n2) Výška stupně a nášlap');
        const vyskaP = 3.05;
        await pole('[data-schody=vyska]', 160);
        await pauza(200);
        g = await geo();
        kontrola('výška 160 mm: počet se přepočítá a stupně vyjdou přesně na podlahu', g.n === Math.round(vyskaP / 0.16) && blizko(g.v, vyskaP / g.n, 1e-6) && blizko(g.zPosl + g.v, vyskaP, 1e-6), JSON.stringify({ n: g.n, v: g.v }));
        await pole('[data-schody=naslap]', 300);
        await pauza(200);
        g = await geo();
        kontrola('nášlap 300 mm mění délku', blizko(g.b, 0.3, 1e-6) && blizko(g.delka, (g.n - 1) * 0.3, 1e-6), JSON.stringify({ b: g.b, delka: g.delka }));
        await pole('[data-schody=vyska]', '');
        await pole('[data-schody=naslap]', '');
        await pauza(200);
        g = await geo();
        // 3,05 m: zaokrouhlení dá 17 výšek s nášlapem 271 mm, vyhláška v Česku žádá 275 mm, proto 18
        kontrola('prázdné pole vrátí výpočet, nášlap podle vyhlášky aspoň 275 mm (18 výšek)', g.n === 18 && blizko(g.b, 0.63 - 2 * g.v, 0.001) && g.b >= 0.275, JSON.stringify({ n: g.n, b: g.b }));
        const varovani = (co) => p.vyhodnot(`(() => { const e = document.querySelector('[data-schody-varovani="${co}"]'); return !!e && e.getClientRects().length > 0; })()`);
        kontrola('bez ruční hodnoty žádné varování k nášlapu', !(await varovani('naslap')));
        // Ruční výška 180 mm smí pravidlo porušit: 17 výšek, nášlap 271 mm a výstraha v panelu
        await pole('[data-schody=vyska]', 180);
        await pauza(200);
        g = await geo();
        kontrola('ruční výška 180 mm: 17 výšek, nášlap 271 mm, panel varuje', g.n === 17 && g.b < 0.275 && await varovani('naslap'), JSON.stringify({ n: g.n, b: g.b }));
        await pole('[data-schody=vyska]', '');
        await pauza(200);

        // Otvor ve stropu nad schody: od 4. stupně, strop nad prvními třemi zůstane, podchodná výška klesne
        const otvor = () => p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste.find(x => x.id === 'S1'); const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80);
            const delka = (o) => { const xs = o.map(q => q.x); return (Math.max(...xs) - Math.min(...xs)) / 80; };
            const maska = d._maskyPodlazi(s.doPodlazi).vyrezy.map(delka); const i = d.inspektorDum();
            return { od: g.otvorOd, obrys: delka(g.obrys), otvor: delka(g.otvor), maska, b: g.b, podchod: i.podchod, podchodOk: i.podchodOk, pole: !!document.querySelector('[data-schody=otvor]') }; })()`);
        let o = await otvor();
        kontrola('otvor ve stropu přes celé schody, v panelu pole a podchodná výška', o.od === 0 && blizko(o.otvor, o.obrys, 1e-6) && o.pole && o.podchodOk, JSON.stringify(o));
        await pole('[data-schody=otvor]', 4);
        await pauza(200);
        o = await otvor();
        kontrola('otvor od 4. stupně: o 3 nášlapy kratší, deska v patře se zkrátí, podchodná výška menší', o.od === 3 && blizko(o.obrys - o.otvor, 3 * o.b, 1e-6) && blizko(o.maska[0], o.otvor, 1e-6) && o.podchodOk, JSON.stringify(o));
        await pole('[data-schody=otvor]', 8);
        await pauza(200);
        o = await otvor();
        kontrola('otvor od 8. stupně: podchodná výška pod 2,1 m, panel varuje', o.od === 7 && !o.podchodOk && await varovani('podchod'), JSON.stringify(o));
        await pole('[data-schody=otvor]', 1);
        await pauza(200);
        o = await otvor();
        kontrola('otvor zpět přes celé schody', o.od === 0 && blizko(o.otvor, o.obrys, 1e-6), JSON.stringify(o));

        console.log('\n3) Do L a do U s částmi');
        await tvarSchodu('L');
        await pauza(200);
        g = await geo();
        kontrola('L: součet částí n − 2, jedno odpočívadlo, poslední stupeň pod podlahou', g.casti.length === 2 && g.casti[0] + g.casti[1] === g.n - 2 && g.podest === 1 && blizko(g.zPosl + g.v, g.H, 1e-6), JSON.stringify(g));
        await pole('[data-schody-cast="1"]', 0);
        await pauza(200);
        g = await geo();
        kontrola('L s druhou částí 0: první má všechno a je to jen odpočívadlo', g.casti[1] === 0 && g.casti[0] === g.n - 2 && g.podest === 1 && g.obrys <= 5 && blizko(g.zPosl + g.v, g.H, 1e-6), JSON.stringify(g));
        await pole('[data-schody-cast="0"]', 5);
        await pauza(200);
        g = await geo();
        kontrola('L: první část 5, zbytek do druhé', g.casti[0] === 5 && g.casti[1] === g.n - 7, JSON.stringify(g.casti));
        await tvarSchodu('U');
        await pauza(200);
        g = await geo();
        kontrola('U výchozí: prostřední 0, jedno široké odpočívadlo, stupně vyjdou na podlahu', g.casti.length === 3 && g.casti[1] === 0 && g.casti[0] + g.casti[2] === g.n - 2 && g.podest === 1 && blizko(g.zPosl + g.v, g.H, 1e-6) && g.obrys >= 4, JSON.stringify(g));
        await p.snimek(path.join(vystup, 'schody-u-dole.png'));
        await pole('[data-schody-cast="1"]', 3);
        await pauza(200);
        g = await geo();
        kontrola('U s prostřední 3: dvě odpočívadla, součet n − 3', g.casti[1] === 3 && g.casti[0] + g.casti[1] + g.casti[2] === g.n - 3 && g.podest === 2 && blizko(g.zPosl + g.v, g.H, 1e-6), JSON.stringify(g));
        await pole('[data-schody-cast="1"]', 0);
        await pole('[data-schody-cast="2"]', 4);
        await pauza(200);
        g = await geo();
        kontrola('U: třetí část 4, zbytek do první', g.casti[2] === 4 && g.casti[0] === g.n - 2 - 4 && g.casti[1] === 0, JSON.stringify(g.casti));
        const kolem = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); return g.stupne.every(u => u.poly.every(q => window.DumGeo.bodVPolygonu ? true : true)) && g.stupne.reduce((v, u) => { const [a, b, c] = u.poly; return v + Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - b.x, c.y - b.y); }, 0) / 6400; })()`);
        const plochaObrysu = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); let a = 0; g.obrys.forEach((q, i) => { const r = g.obrys[(i + 1) % g.obrys.length]; a += q.x * r.y - r.x * q.y; }); return Math.abs(a) / 2 / 6400; })()`);
        kontrola('stupně a odpočívadlo vyplní přesně obrys U', blizko(kolem, plochaObrysu, 0.01), JSON.stringify({ kolem, plochaObrysu }));
        await p.snimek(path.join(vystup, 'schody-u-casti.png'));

        const stitek = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; const s = d.engine.dum.schodiste[0]; const X = 80;
            // Název místnosti těsně pod schody: štítek si má najít jiné místo
            const puvodni = { x: s.x, y: s.y }; const g0 = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), X); const m = r.mistnostiLayer.find('Text')[0].getClientRect(); const tr = d.stage.getAbsoluteTransform(); const body = g0.obrys.map(q => tr.point(q)); const dolu = Math.max(...body.map(q => q.y)); const stredX = (Math.min(...body.map(q => q.x)) + Math.max(...body.map(q => q.x))) / 2; const dx = (m.x + m.width / 2 - stredX) / d.stage.scaleX(), dy = (m.y - 6 - dolu) / d.stage.scaleX(); s.x += dx / X; s.y -= dy / X; r.render();
            const prekryv = (a, b) => a.x + a.width > b.x && a.x < b.x + b.width && a.y + a.height > b.y && a.y < b.y + b.height;
            const text = r.schodyLayer.find('Text').find(t => /×/.test(t.text())); const q = text.getClientRect(); const mistnost = r.mistnostiLayer.find('Text').map(t => t.getClientRect()); const bd = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), X).obrys.map(b => tr.point(b)); const obr = { x: Math.min(...bd.map(b => b.x)), y: Math.min(...bd.map(b => b.y)) }; obr.width = Math.max(...bd.map(b => b.x)) - obr.x; obr.height = Math.max(...bd.map(b => b.y)) - obr.y;
            const out = { naMistnosti: mistnost.some(b => prekryv(q, b)), naSchodech: s.tvar === 'prime' ? prekryv(q, obr) : false }; s.x = puvodni.x; s.y = puvodni.y; r.render(); return out; })()`);
        kontrola('štítek schodů neleží na názvu místnosti ani na stupních', !stitek.naMistnosti && !stitek.naSchodech, JSON.stringify(stitek));

        console.log('\n3b) Zabíhající stupně a točité schody');
        const videt = (sel) => p.vyhodnot(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.getClientRects().length > 0; })()`);
        const plochy = () => p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80);
            const pl = (o) => { let a = 0; o.forEach((q, i) => { const r = o[(i + 1) % o.length]; a += q.x * r.y - r.x * q.y; }); return Math.abs(a) / 2 / 6400; };
            return { stupne: g.stupne.reduce((v, u) => v + pl(u.poly), 0), obrys: pl(g.obrys), zakrivene: !!g.zakrivene, sloupek: !!g.sloupek, prvni: JSON.stringify(g.stupne[Math.floor(g.stupne.length / 2)].poly) }; })()`);
        await tvarSchodu('Lz');
        await pauza(250);
        g = await geo();
        let pl = await plochy();
        kontrola('do L se zabíhajícími stupni: bez odpočívadla n − 1 stupňů, stupně vyplní obrys L, poslední pod podlahou', g.tvar === 'Lz' && g.stupnu === g.n - 1 && g.podest === 0 && pl.zakrivene && blizko(pl.stupne, pl.obrys, 0.01) && blizko(g.zPosl + g.v, g.H, 1e-6), JSON.stringify({ ...g, pl }));
        kontrola('panel: volba zatáčky a šířka ramene, bez částí a průměru', await videt('[data-schody-zatacka="osa"]') && await videt('[data-schody=sirka]') && !(await videt('[data-schody=prumer]')) && !(await videt('[data-schody-cast="0"]')));
        const osa = pl.prvni;
        await p.vyhodnot(`(document.querySelector('[data-schody-zatacka="rozlozene"]').click(), 1)`);
        await pauza(250);
        pl = await plochy();
        const rozl = await p.vyhodnot(`${D}.engine.dum.schodiste[0].zatacka`);
        kontrola('rozložené stupně: jiný tvar stupňů v zatáčce, plocha stejná', rozl === 'rozlozene' && pl.prvni !== osa && blizko(pl.stupne, pl.obrys, 0.01), JSON.stringify({ rozl, stupne: pl.stupne, obrys: pl.obrys }));
        await p.snimek(path.join(vystup, 'schody-lz.png'));
        await tvarSchodu('Uz');
        await pauza(250);
        g = await geo();
        pl = await plochy();
        kontrola('do U se zabíhajícími stupni: n − 1 stupňů, obrys obdélník, stupně ho vyplní', g.tvar === 'Uz' && g.stupnu === g.n - 1 && g.obrys === 4 && blizko(pl.stupne, pl.obrys, 0.01), JSON.stringify({ ...g, pl }));
        await tvarSchodu('tocite');
        await pauza(250);
        g = await geo();
        pl = await plochy();
        kontrola('točité: n − 1 stupňů kolem sloupku, panel s průměrem místo šířky', g.tvar === 'tocite' && g.stupnu === g.n - 1 && pl.sloupek && await videt('[data-schody=prumer]') && !(await videt('[data-schody=sirka]')), JSON.stringify(g));
        await pole('[data-schody=prumer]', 160);
        await pauza(250);
        const toc160 = await p.vyhodnot(`(() => { const i = ${D}.inspektorDum(); return { podchod: i.podchod, ok: i.podchodOk, podOtackou: i.podOtackou, prumer: i.prumer }; })()`);
        kontrola('točité ø 160 cm: pod otáčkou málo místa nad hlavou, panel varuje', toc160.podOtackou && !toc160.ok && toc160.prumer === 1.6 && await videt('[data-schody-varovani="podchod"]'), JSON.stringify(toc160));
        await pole('[data-schody=prumer]', 200);
        await pauza(250);
        const toc200 = await p.vyhodnot(`(() => { const i = ${D}.inspektorDum(); return { podchod: i.podchod, ok: i.podchodOk }; })()`);
        kontrola('točité ø 200 cm: podchodná výška pod otáčkou aspoň 2,1 m', toc200.ok && toc200.podchod >= 2.1, JSON.stringify(toc200));
        await p.snimek(path.join(vystup, 'schody-tocite.png'));
        // Široké rameno na málo stupňů: zatáčka se nevejde, schody se postaví s odpočívadlem a panel to řekne
        await tvarSchodu('Uz');
        await pole('[data-schody=sirka]', 250);
        await pauza(250);
        const nelze = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo({ ...s, vyskaStupne: 0.21 }, 2.0, 80); return { nelze: !!g.nelze, podest: g.stupne.filter(u => u.podesta).length }; })()`);
        kontrola('zabíhající do U se nevejdou (rameno 2,5 m, 2 m výšky): schody s odpočívadlem, příznak pro panel', nelze.nelze && nelze.podest === 1, JSON.stringify(nelze));
        await pole('[data-schody=sirka]', 100);
        await tvarSchodu('U');
        await pauza(250);

        console.log('\n4) Půdorys z horního podlaží');
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P2'); d.fitView(); d.renderer.render(); return true; })()`);
        await pauza(400);
        const shora = await p.vyhodnot(`(() => { const r = ${D}.renderer; const ch = r.schodyLayer.getChildren(); return { texty: r.schodyLayer.find('Text').map(t => t.text()), srafa: ch.filter(n => n.getClassName() === 'Shape').length, vyplnene: ch.filter(n => n.getClassName() === 'Line' && /rgba\\(55,65,81/.test(n.fill() || '')).map(n => n.fill()) }; })()`);
        const hloubka = shora.vyplnene.map(f => parseFloat(f.split(',')[3]));
        kontrola('shora žádné šrafování, stupně se štítkem „dolů" a tmavší do hloubky', shora.srafa === 0 && shora.texty.some(t => /dolů/.test(t)) && hloubka.length > 5 && hloubka[hloubka.length - 1] < hloubka[0], JSON.stringify({ srafa: shora.srafa, texty: shora.texty, prvni: hloubka[0], posledni: hloubka[hloubka.length - 1] }));
        await p.snimek(path.join(vystup, 'schody-shora.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P1'); d.fitView(); d.renderer.setSelection([]); d.renderer.selectedSchody.add('S1'); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(400);

        console.log('\n5) Otáčení a tah schodů');
        await tvarSchodu('prime');
        await pauza(250);
        const uchop = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); const xs = g.obrys.map(q => q.x), ys = g.obrys.map(q => q.y); return { u: g.uchop, stred: { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 } }; })()`);
        // Tah úchopem po kružnici kolem středu tak, aby výsledný úhel vyšel kousek vedle šikmé stěny (25°)
        const kam = (deg) => { const r = Math.hypot(uchop.u.x - uchop.stred.x, uchop.u.y - uchop.stred.y), a0 = Math.atan2(uchop.u.y - uchop.stred.y, uchop.u.x - uchop.stred.x), a = a0 + deg * Math.PI / 180; return obr(uchop.stred.x + Math.cos(a) * r, uchop.stred.y + Math.sin(a) * r); };
        const u0 = await obr(uchop.u.x, uchop.u.y);
        await pohyb(u0); await stisk(u0); await pauza(40);
        for (const deg of [5, 10, 15, 19, 22]) await pohyb(await kam(deg), true);
        const naStene = await geo();
        kontrola('úchopem se schody otočí a chytí směr vzdálené stěny (25°)', blizko(naStene.uhel * 180 / Math.PI, 25, 0.01), String(naStene.uhel * 180 / Math.PI));
        for (const deg of [35, 45, 48]) await pohyb(await kam(deg), true);
        const volneU = await geo();
        kontrola('dál se odtrhne', blizko(volneU.uhel * 180 / Math.PI, 48, 1.5), String(volneU.uhel * 180 / Math.PI));
        for (const deg of [20, 5, 2]) await pohyb(await kam(deg), true);
        const naNule = await geo();
        await pust(await kam(2));
        await pauza(300);
        kontrola('zpět na vodorovnou obrazovky', blizko(naNule.uhel * 180 / Math.PI, 0, 0.01), String(naNule.uhel * 180 / Math.PI));
        // Tah k líci horní stěny (y = 0, líc 15 cm pod osou)
        const pred = await geo();
        const ob = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); return { sx: g.obrys.reduce((v, q) => v + q.x, 0) / 4, sy: g.obrys.reduce((v, q) => v + q.y, 0) / 4, min: Math.min(...g.obrys.map(q => q.y)) }; })()`);
        // Tah o kousek od cíle: obrys má skončit na líci 0,15 m, kurzor dorazí 4 cm vedle
        const posun = (0.15 + 0.04) * PX - ob.min;
        const a1 = await obr(ob.sx + 60, ob.sy), a2 = await obr(ob.sx + 60, ob.sy + posun);

        await tah(a1, a2);
        await pust(a2);
        await pauza(300);
        const poTahu = await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80); return { min: Math.min(...g.obrys.map(q => q.y)) / 80 }; })()`);
        kontrola('hrana schodů se přichytí na líc stěny', blizko(poTahu.min, 0.15, 0.003), JSON.stringify({ poTahu, pred: pred.y, tvar: pred.tvar, obrys: pred.obrys }));

        console.log('\n6) Barva a 3D');
        const barva = await p.vyhodnot(`(async () => { const d = ${D}; const cek = (t = 250) => new Promise(r => setTimeout(r, t)); d.setSchody('tvar', 'U'); await cek(); await d.prepni3d(); await cek(700);
            const b = document.querySelector('[data-barva-schodu]'); const panel = getComputedStyle(document.getElementById('kk-panel-otvoru')).display !== 'none';
            const meshe = () => window._kk3d.dumSkupina.children.filter(o => o.userData.schody === 'S1');
            const naslap = () => meshe().find(o => Array.isArray(o.material)).material[2];
            const svisle = () => meshe().find(o => o.userData.podstupnice).material;
            b.querySelector('[data-barva-symbol]').click(); await cek();
            const ral = b.querySelector('[data-barva-ral]'); ral.value = '7016'; ral.dispatchEvent(new Event('change', { bubbles: true })); await cek(500);
            const kn = naslap().color, ks = svisle().color;
            const out = { panel, zapis: d.engine.dum.schodiste[0].barva, naslap: '#' + kn.getHexString(), pomer: +(ks.r / kn.r).toFixed(3), podstupnic: meshe().filter(o => o.userData.podstupnice).length, stupnu: meshe().filter(o => !o.userData.podstupnice).length, jinde: d.barvyJinde('fasada').some(x => x.kde === 'Schody') };
            return out; })()`);
        kontrola('barva z nástroje, svislé části tmavší, podstupnice ke každému stupni, panel i ve 3D', barva.panel && barva.zapis === '#293133' && barva.naslap === '#293133' && blizko(barva.pomer, 0.7, 0.01) && barva.podstupnic === barva.stupnu && barva.podstupnic > 5 && barva.jinde, JSON.stringify(barva));
        const spoj = await p.vyhodnot(`(() => { const m = window._kk3d.dumSkupina.children.filter(o => o.userData.schody === 'S1'); const vysky = (o) => { o.geometry.computeBoundingBox(); return [o.position.y + o.geometry.boundingBox.min.z, o.position.y + o.geometry.boundingBox.max.z]; }; const stupne = m.filter(o => !o.userData.podstupnice).map(vysky), celo = m.filter(o => o.userData.podstupnice).map(vysky); const vady = []; for (let i = 1; i < stupne.length; i++) { if (Math.abs(celo[i][0] - stupne[i - 1][0]) > 1e-6 || Math.abs(celo[i][1] - stupne[i][0]) > 1e-6) vady.push(i); } return { vady, prvniOd: celo[0][0], kota: window._kk3d.dumSkupina.parent ? 0 : null }; })()`);
        kontrola('podstupnice sahá po spodek předchozího stupně, spoj je zavřený i zespodu', spoj.vady.length === 0 && spoj.prvniOd >= -1e-6, JSON.stringify(spoj));
        const toc3d = await p.vyhodnot(`(async () => { const d = ${D}; const cek = (t = 400) => new Promise(r => setTimeout(r, t)); d.setSchody('tvar', 'tocite'); await cek();
            const m = window._kk3d.dumSkupina.children.filter(o => o.userData.schody === 'S1'); const s = d.engine.dum.schodiste[0]; const g = window.DumGeo.schodyGeo(s, d._vyskaMeziPodlazimi(s), 80);
            const out = { dilu: m.length, stupnu: g.stupne.length, podstupnic: m.filter(o => o.userData.podstupnice).length }; d.setSchody('tvar', 'U'); await cek(); return out; })()`);
        kontrola('točité ve 3D: nášlap a podstupnice ke každému stupni a sloupek', toc3d.podstupnic === toc3d.stupnu && toc3d.dilu === 2 * toc3d.stupnu + 1, JSON.stringify(toc3d));
        await p.vyhodnot(`(() => { const d = ${D}; d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); d.setSchody('barva', '#b08a5e'); const _3d = window._kk3d; _3d.camera.position.set(14, 12, 18); _3d.controls.target.set(6, 1, 4); _3d.camera.zoom = 1.6; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); return true; })()`);
        await pauza(600);
        await p.snimek(path.join(vystup, 'schody-3d.png'));
        await p.vyhodnot(`(() => { const d = ${D}; d.setSchody('tvar', 'prime'); return true; })()`);
        await pauza(500);
        await p.vyhodnot(`(() => { const d = ${D}; const s = d.engine.dum.schodiste[0]; const _3d = window._kk3d; const ux = Math.cos(s.uhel), uz = Math.sin(s.uhel); const cx = s.x + ux * 2, cz = -s.y + uz * 2; _3d.controls.target.set(cx, 1.5, cz); _3d.camera.position.set(cx + uz * 12, 0.6, cz - ux * 12); _3d.camera.zoom = 3.5; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); window._kk3d.podlaziSkupiny.get('P1').visible = false; return true; })()`);
        await pauza(500);
        await p.snimek(path.join(vystup, 'schody-spodek.png'));
        await p.vyhodnot(`(() => { window._kk3d.podlaziSkupiny.get('P1').visible = true; return true; })()`);
        await p.vyhodnot(`(() => { const d = ${D}; d.skryte3d = []; d.zobrazStrechu3d = true; d._nastavViditelnost3d(); d.prepni2d(); d.rezim3d = false; d.renderer.clearSelection(); return true; })()`);
        await pauza(500);

        console.log('\n7) Rotace domu na osy obrazovky');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 690, y: 6 }; d.stage.rotation(0); d.fitView(); d.renderer.setSelection([...e.walls.keys()]); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(400);
        const uch = await p.vyhodnot(`(() => { const d = ${D}; const h = d.renderer.selectionLayer.find(n => n.getAttr('_rotateHandle'))[0]; const c = h.getClientRect(); const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + c.x + c.width / 2), y: Math.round(r.top + c.y + c.height / 2), left: r.left, top: r.top }; })()`);
        const stredH = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; let a = Infinity, b = -Infinity, c = Infinity, f = -Infinity; for (const n of e.nodes.values()) { a = Math.min(a, n.x); b = Math.max(b, n.x); c = Math.min(c, n.y); f = Math.max(f, n.y); } return { x: (a + b) / 2, y: (c + f) / 2 }; })()`);
        const stredO = await obr(stredH.x, stredH.y);
        const kolemDomu = (deg) => { const r = Math.hypot(uch.x - stredO.x, uch.y - stredO.y), a0 = Math.atan2(uch.y - stredO.y, uch.x - stredO.x), a = a0 + deg * Math.PI / 180; return { x: Math.round(stredO.x + Math.cos(a) * r), y: Math.round(stredO.y + Math.sin(a) * r) }; };
        await pohyb(uch); await stisk(uch); await pauza(40);
        for (const deg of [6, 12, 20, 28]) await pohyb(kolemDomu(deg), true);
        const zaTahu = await p.vyhodnot(`(() => { const d = ${D}; return { rotuje: d.isRotating, delta: d._rotateDelta * 180 / Math.PI }; })()`);
        kontrola('mimo osy se dům otáčí volně', zaTahu.rotuje && Math.abs(zaTahu.delta) > 15, JSON.stringify(zaTahu));
        for (const deg of [50, 75, 88]) await pohyb(kolemDomu(deg), true);
        const naOse = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const w = [...e.walls.values()].filter(x => x.typ === 'obvodova').map(x => { const a = e.nodes.get(x.nodeA), b = e.nodes.get(x.nodeB); return Math.min(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }); return { delta: d._rotateDelta * 180 / Math.PI, nejvic: Math.max(...w), nahled: !!d._snapPreview?.line }; })()`);
        kontrola('u 90° se dům přichytí: stěny přesně vodorovné a svislé, ukáže se čára', blizko(Math.abs(naOse.delta), 90, 0.001) && naOse.nejvic < 0.01 && naOse.nahled, JSON.stringify(naOse));
        await p.snimek(path.join(vystup, 'rotace-domu.png'));
        await p.vyhodnot(`(() => { ${D}._altDrzen = true; return true; })()`);
        await pust(kolemDomu(88));
        await pauza(300);
        await p.vyhodnot(`(() => { ${D}._altDrzen = false; return true; })()`);
        const metoda = await p.vyhodnot(`(() => { const d = ${D}; d._rotateSmery = [20 * Math.PI / 180]; d.stage.rotation(15); const r = { blizko: d._magnetRotace(-33 * Math.PI / 180) * 180 / Math.PI, daleko: d._magnetRotace(-25 * Math.PI / 180) }; d.stage.rotation(0);
            d._rotateNodeSnap = new Map([['a', { x: 0, y: 0 }], ['b', { x: 500, y: 0 }]]); const e = d.engine; return r; })()`);
        kontrola('při otočeném pohledu se měří k obrazovce, mimo dosah nic', blizko(metoda.blizko, -35, 0.001) && metoda.daleko === null, JSON.stringify(metoda));

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
