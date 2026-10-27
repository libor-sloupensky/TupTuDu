/**
 * Vazba, která odporuje geometrii, se nesmí vynucovat.
 *
 * Vazba (odConstraint/doConstraint) je jen metadata — podle nich se dítě veze
 * s hostitelem. Když uložená poloha konce tvrdí něco jiného než vazba, byla to
 * dřív vazba, která vyhrála: `srovnejCelaNaRoh` konec natvrdo přesadil na čelo
 * hostitele, i když bylo půl metru daleko. Dvě stěny, které spolu nesousedí,
 * se tak při načtení svázaly a hýbaly se spolu (hlášeno na Na bělidle: W53
 * navázaná na čelo W96, 0,55 m daleko; po smazání a nakreslení znovu se to
 * vrátilo, protože dosah magnetu rostl s odzoomováním bez stropu).
 *
 * Spuštění: node services/import-test/test-vazby-geometrie.cjs
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

const nacti = (data) => {
    const e = new StavebniEngine({ pxPerM: 80 });
    e.SNAP_STEP = 0.1;
    e.fromJSON(JSON.parse(JSON.stringify(data)));
    return e;
};
const uzel = (e, id, konec) => {
    const w = e.walls.get(id);
    return w ? e.nodes.get(konec === 'A' ? w.nodeA : w.nodeB) : null;
};
/** Posune hostitele o dx metrů a vrátí, o kolik se hnul konec dítěte. */
const posunHostitele = (e, hostId, ditId, ditKonec, dx) => {
    const d = uzel(e, ditId, ditKonec);
    const pred = { x: d.x, y: d.y };
    const h = e.walls.get(hostId);
    e.syncTChildrenT(hostId);
    for (const nid of [h.nodeA, h.nodeB]) e.nodes.get(nid).x += dx * e.PX_PER_M;
    // delta se předává stejně jako při tažení stěny v editoru — bez ní se
    // napojení na čelo („konec") záměrně nepropaguje
    e.propagateTChildren(hostId, dx * e.PX_PER_M, 0);
    const po = uzel(e, ditId, ditKonec);
    return Math.hypot(po.x - pred.x, po.y - pred.y) / e.PX_PER_M;
};

console.log('\n1) Nesmyslná vazba „konec" se při načtení zruší');
{
    // Dvě svislé příčky vedle sebe, mezera 0,5 m napříč a 0,34 m podél —
    // čísla jsou z konceptu Na bělidle (W53 + W96).
    const e = nacti({ steny: [
        { id: 'W96', od: [-1.673, 2.581], do: [-1.673, 1.998], tloustka: 0.15, typ: 'pricka' },
        { id: 'W53', od: [-2.177, -0.821], do: [-2.177, 1.661], tloustka: 0.10, typ: 'pricka',
          do_constraint: { host: 'W96', konec: 'B' } },
    ] });
    const b = uzel(e, 'W53', 'B');
    kontrola('vazba je zrušená', e.walls.get('W53').doConstraint === null,
        JSON.stringify(e.walls.get('W53').doConstraint));
    kontrola('konec zůstal tam, kde byl uložený',
        Math.abs(b.x / 80 + 2.177) < 0.001 && Math.abs(-b.y / 80 - 1.661) < 0.001,
        (b.x / 80).toFixed(3) + ' ' + (-b.y / 80).toFixed(3));
    kontrola('pohyb W96 už W53 netahá', posunHostitele(e, 'W96', 'W53', 'B', 0.5) < 0.001);
}

console.log('\n2) Poctivá vazba „konec" zůstane');
{
    // Tenká příčka pokračuje v ose tlustší zdi, konec sedí v jejím čele.
    const e = nacti({ steny: [
        { id: 'W1', od: [0, 0], do: [3, 0], tloustka: 0.30, typ: 'nosna' },
        { id: 'W2', od: [3, 0.1], do: [6, 0.1], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W1', konec: 'B' } },
    ] });
    kontrola('vazba drží', !!e.walls.get('W2').odConstraint,
        JSON.stringify(e.walls.get('W2').odConstraint));
    kontrola('pohyb hostitele konec veze', posunHostitele(e, 'W1', 'W2', 'A', 0.4) > 0.3);
}

console.log('\n3) Poctivá klouzavá vazba „t" zůstane');
{
    const e = nacti({ steny: [
        { id: 'W1', od: [0, 0], do: [6, 0], tloustka: 0.30, typ: 'nosna' },
        { id: 'W2', od: [3, 0.15], do: [3, 3], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W1', t: 0.5 } },
    ] });
    kontrola('vazba drží', !!e.walls.get('W2').odConstraint);
    kontrola('pohyb hostitele konec veze', posunHostitele(e, 'W1', 'W2', 'A', 0.4) > 0.3);
}

console.log('\n4) Klouzavá vazba mimo hostitele se zruší');
{
    const e = nacti({ steny: [
        { id: 'W1', od: [0, 0], do: [6, 0], tloustka: 0.30, typ: 'nosna' },
        // konec visí 0,9 m nad osou hostitele — tam vazba nemá co dělat
        { id: 'W2', od: [3, 0.9], do: [3, 3], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W1', t: 0.5 } },
        // a tahle má projekci mimo délku hostitele
        { id: 'W3', od: [8, 0.15], do: [8, 3], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W1', t: 0.5 } },
    ] });
    kontrola('vazba stěny bokem je zrušená', e.walls.get('W2').odConstraint === null);
    kontrola('vazba stěny za koncem je zrušená', e.walls.get('W3').odConstraint === null);
    const a2 = uzel(e, 'W2', 'A');
    kontrola('geometrie se nezměnila', Math.abs(-a2.y / 80 - 0.9) < 0.001, (-a2.y / 80).toFixed(3));
}

console.log('\n5) Zastaralé t se opraví podle geometrie (dítě neuskočí)');
{
    const e = nacti({ steny: [
        { id: 'W1', od: [0, 0], do: [6, 0], tloustka: 0.30, typ: 'nosna' },
        // uzel leží na t = 0,25, ale uložené t tvrdí 0,75
        { id: 'W2', od: [1.5, 0.15], do: [1.5, 3], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W1', t: 0.75 } },
    ] });
    const c = e.walls.get('W2').odConstraint;
    kontrola('t je přepsané na skutečnou polohu', c && Math.abs(c.t - 0.25) < 0.005,
        c ? 't = ' + c.t.toFixed(3) : 'vazba zrušena');
    // posun hostitele podél vlastní osy nesmí dítě odtáhnout jinam než s ním
    const d = posunHostitele(e, 'W1', 'W2', 'A', 0.5);
    kontrola('konec se povezl právě o posun hostitele', Math.abs(d - 0.5) < 0.01, d.toFixed(3) + ' m');
}

console.log('\n6) Vazba na smazanou stěnu se pořád uklidí');
{
    const e = nacti({ steny: [
        { id: 'W1', od: [0, 0], do: [6, 0], tloustka: 0.30, typ: 'nosna' },
        { id: 'W2', od: [3, 2], do: [3, 5], tloustka: 0.10, typ: 'pricka',
          od_constraint: { host: 'W99', t: 0.5 } },
    ] });
    kontrola('vazba na neexistující hostitele je zrušená', e.walls.get('W2').odConstraint === null);
}

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
