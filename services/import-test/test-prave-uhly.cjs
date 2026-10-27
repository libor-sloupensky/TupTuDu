/**
 * Srovnání stěn do pravých úhlů (srovnejPraveUhly).
 *
 * Rozdíl desetiny stupně nejde na obrazovce poznat, ale v konstrukci se sčítá.
 * Měřeno na konceptech v databázi: ze 121 stěn jich 85 leželo mimo pravý úhel
 * o 0,001–1,99° a nad 2° nebyla ani jedna — žádná odchylka nebyla záměrná.
 *
 * Spuštění: node services/import-test/test-prave-uhly.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
const soubor = path.join(__dirname, '../../public/js/koncept-v3/stavebni-engine.js');
vm.runInThisContext(fs.readFileSync(soubor, 'utf8'), { filename: soubor });
const { StavebniEngine } = globalThis;
if (!StavebniEngine) throw new Error('Engine se nenačetl.');

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

const novyEngine = () => {
    const e = new StavebniEngine({ pxPerM: 100 });
    e.SNAP_STEP = 0.1;
    return e;
};

/** Úhly všech stěn zbytkem po dělení 90° (0 = rovnoběžná s osou). */
const zbytky = (e) => [...e.walls.values()].map(w => {
    const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB);
    if (!a || !b) return 0;
    return ((Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI) % 90 + 90) % 90;
});

/** Největší odchylka od GLOBÁLNÍ vodorovné/svislé. */
const maxOdchylka = (e) => Math.max(...zbytky(e).map(m => Math.min(m, 90 - m)));

/** Rozptyl úhlů mezi stěnami — 0 znamená navzájem přesně kolmé/rovnoběžné,
 *  ať je dům natočený jakkoli. */
const rozptyl = (e) => {
    const z = zbytky(e);
    return Math.max(...z) - Math.min(...z);
};

/** Obdélník, jehož rohy jsou o kousek mimo. */
function rozhozenyObdelnik(e, sum = 1.2) {
    const body = [
        e.addNode(0, 0), e.addNode(600 + sum, 0 - sum),
        e.addNode(600, 400 + sum), e.addNode(0 - sum, 400),
    ];
    for (let i = 0; i < 4; i++) {
        const a = body[i], b = body[(i + 1) % 4];
        const w = e.addWall(a.x, a.y, b.x, b.y, 0.3);
        // addWall zakládá vlastní uzly — přepojit na sdílené, ať vznikne smyčka
        w.nodeA = a.id; w.nodeB = b.id;
    }
    e._cleanOrphanNodes();
    return body;
}

console.log('\n1) Rozhozený obdélník se srovná');
{
    const e = novyEngine();
    rozhozenyObdelnik(e);
    const pred = maxOdchylka(e);
    kontrola('před srovnáním je dům křivý', pred > 0.1, pred.toFixed(3) + '°');

    const posunuto = e.srovnejPraveUhly(2);
    const po = maxOdchylka(e);
    kontrola('po srovnání jsou všechny úhly přesné', po < 0.001, po.toFixed(6) + '°');
    kontrola('uzly se opravdu hýbaly', posunuto > 0, posunuto + ' souřadnic');
    kontrola('stěny zůstaly čtyři', e.walls.size === 4);
    kontrola('uzly zůstaly sdílené (4 rohy)', e.nodes.size === 4, e.nodes.size + ' uzlů');
}

console.log('\n2) Záměrně šikmá stěna se nechá být');
{
    const e = novyEngine();
    rozhozenyObdelnik(e);
    const sikma = e.addWall(100, 100, 400, 250, 0.15);     // ~26,6°
    const uhelPred = Math.atan2(
        e.nodes.get(sikma.nodeB).y - e.nodes.get(sikma.nodeA).y,
        e.nodes.get(sikma.nodeB).x - e.nodes.get(sikma.nodeA).x) * 180 / Math.PI;

    e.srovnejPraveUhly(2);
    const uhelPo = Math.atan2(
        e.nodes.get(sikma.nodeB).y - e.nodes.get(sikma.nodeA).y,
        e.nodes.get(sikma.nodeB).x - e.nodes.get(sikma.nodeA).x) * 180 / Math.PI;
    kontrola('šikmá stěna si drží svůj úhel', Math.abs(uhelPo - uhelPred) < 0.01,
        uhelPred.toFixed(2) + '° → ' + uhelPo.toFixed(2) + '°');
}

console.log('\n3) Dům natočený o 20° se srovná do svého systému, ne do vodorovné');
{
    const e = novyEngine();
    const rad = 20 * Math.PI / 180;
    const otoc = (x, y) => ({ x: x * Math.cos(rad) - y * Math.sin(rad), y: x * Math.sin(rad) + y * Math.cos(rad) });
    const r = [otoc(0, 0), otoc(600, 0), otoc(600, 400), otoc(0, 400)];
    r[1].x += 1.5; r[2].y -= 1.5;                   // rozhodit rohy
    const uzly = r.map(p => e.addNode(p.x, p.y));
    for (let i = 0; i < 4; i++) {
        const w = e.addWall(uzly[i].x, uzly[i].y, uzly[(i + 1) % 4].x, uzly[(i + 1) % 4].y, 0.3);
        w.nodeA = uzly[i].id; w.nodeB = uzly[(i + 1) % 4].id;
    }
    e._cleanOrphanNodes();

    e.srovnejPraveUhly(2);
    kontrola('stěny jsou navzájem přesně kolmé', rozptyl(e) < 0.001, 'rozptyl ' + rozptyl(e).toFixed(6) + '°');

    const a = e.nodes.get([...e.walls.values()][0].nodeA);
    const b = e.nodes.get([...e.walls.values()][0].nodeB);
    const uhel = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    kontrola('natočení domu zůstalo ~20°', Math.abs(Math.abs(uhel) - 20) < 1, uhel.toFixed(2) + '°');
}

console.log('\n4) Napojená příčka zůstane na hostiteli');
{
    const e = novyEngine();
    const host = e.addWall(0, 0, 1000, 1.5, 0.3);          // skoro vodorovná
    const pricka = e.addWall(500, 400, 500.6, 0.75, 0.15);  // skoro svislá, na osu hostitele
    pricka.doConstraint = { host: host.id, t: 0.5 };

    e.srovnejPraveUhly(2);
    const u = e.nodes.get(pricka.nodeB);
    const ha = e.nodes.get(host.nodeA), hb = e.nodes.get(host.nodeB);
    const vzdalenostOdOsy = Math.abs((u.x - ha.x) * (-(hb.y - ha.y)) + (u.y - ha.y) * (hb.x - ha.x))
        / Math.hypot(hb.x - ha.x, hb.y - ha.y);
    kontrola('konec příčky zůstal na ose hostitele', vzdalenostOdOsy < 0.01, vzdalenostOdOsy.toFixed(4) + ' px');
    kontrola('všechny úhly jsou pravé', maxOdchylka(e) < 0.001, maxOdchylka(e).toFixed(6) + '°');
}

console.log('\n5) Otvor nepřečnívá ani po zkrácení stěny');
{
    const e = novyEngine();
    rozhozenyObdelnik(e, 2.0);
    const stena = [...e.walls.values()][0];
    const a = e.nodes.get(stena.nodeA), b = e.nodes.get(stena.nodeB);
    const delka = Math.hypot(b.x - a.x, b.y - a.y) / e.PX_PER_M;
    e.addOpening(stena.id, delka - 0.9, 0.8, 'dvere');

    e.srovnejPraveUhly(2);
    const op = [...e.openings.values()][0];
    const a2 = e.nodes.get(stena.nodeA), b2 = e.nodes.get(stena.nodeB);
    const delka2 = Math.hypot(b2.x - a2.x, b2.y - a2.y) / e.PX_PER_M;
    kontrola('otvor se vejde do stěny', op.pozice >= 0 && op.pozice + op.sirka <= delka2 + 1e-9,
        'pozice ' + op.pozice.toFixed(3) + ' + ' + op.sirka + ' ≤ ' + delka2.toFixed(3));
}

console.log('\n6) Už srovnaný dům se podruhé nehýbe');
{
    const e = novyEngine();
    rozhozenyObdelnik(e);
    e.srovnejPraveUhly(2);
    const posunuto = e.srovnejPraveUhly(2);
    kontrola('druhý průchod nic nemění', posunuto === 0, posunuto + ' posunů');
}

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
