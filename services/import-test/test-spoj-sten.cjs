/**
 * Sloučení dvou stěn v uzlu (spojSteny) — opak splitWall.
 *
 * Hlídá hlavně to, co uživatel výslovně žádal: při mírně jiném úhlu než 180°
 * se osa narovná, a napojené stěny se MUSÍ dotáhnout (prodloužit/zkrátit),
 * ne posunout — jinak se utrhnou jejich vlastní napojení jinde ve výkrese.
 *
 * Spuštění: node services/import-test/test-spoj-sten.cjs
 */
// Projekt má v package.json "type": "module", takže require() by engine
// považoval za ESM a nic by z něj nevydal — spouští se proto přes vm,
// stejně jako analyzátor v nacti-analyzu.cjs.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const soubor = path.join(__dirname, '../../public/js/koncept-v3/stavebni-engine.js');
// Engine se vystavuje přes window (je psaný pro prohlížeč) — ve vm žádné není,
// a `class` sama o sobě na globalThis nesedá. Stačí tedy window předstírat.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(soubor, 'utf8'), { filename: soubor });
const StavebniEngine = globalThis.StavebniEngine;
if (!StavebniEngine) throw new Error('Engine se nenačetl.');

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const blizko = (a, b, tol = 0.5) => Math.abs(a - b) <= tol;

/** Vodorovná stěna rozdělená v polovině + příčka napojená do T. */
function postavT({ kink = 0 } = {}) {
    const e = new StavebniEngine({ pxPerM: 100 });
    e.SNAP_STEP = 0.1;

    const hlavni = e.addWall(0, 0, 1000, 0, 0.3);
    const stred = e.addNode(500, 0);
    const druha = e.splitWall(hlavni.id, 0.5, stred.id);

    // Příčka zdola do poloviny první půlky (t = 0,5 na stěně 0–500)
    const pricka = e.addWall(250, 400, 250, 0, 0.15);
    pricka.doConstraint = { host: hlavni.id, t: 0.5 };

    // Uzel spoje posunout kolmo = úhel jiný než 180°. Napojený konec příčky
    // musí zůstat na ose hostitele, jinak by test měřil nesmyslný výchozí stav.
    if (kink) {
        stred.y += kink;
        const naOse = e.nodes.get(pricka.nodeB);
        naOse.y = kink * 0.5;        // t = 0,5 na stěně 0 → stred
    }

    return { e, hlavni, druha, stred, pricka };
}

console.log('\n1) Přímé sloučení (přesně 180°)');
{
    const { e, hlavni, druha, stred } = postavT();
    kontrola('hlavní stěna je před sloučením rozdělená na dvě',
        [...e.walls.values()].filter(w => w.tloustka === 0.3).length === 2);
    kontrola('uzel nabízí sloučení', e.lzeSpojitVUzlu(stred.id, 5).ok);

    const slouceno = e.spojSteny(stred.id, 5);
    kontrola('sloučení proběhlo', !!slouceno);
    kontrola('zbyla jedna hlavní stěna', [...e.walls.values()].filter(w => w.tloustka === 0.3).length === 1);
    kontrola('druhá půlka zmizela', !e.walls.has(druha));
    kontrola('uzel spoje zmizel', !e.nodes.has(stred.id));

    const a = e.nodes.get(slouceno.nodeA), b = e.nodes.get(slouceno.nodeB);
    kontrola('stěna vede od 0 do 1000', blizko(Math.min(a.x, b.x), 0) && blizko(Math.max(a.x, b.x), 1000),
        `${a.x},${a.y} → ${b.x},${b.y}`);
}

console.log('\n2) Napojená příčka drží své místo');
{
    const { e, hlavni, stred, pricka } = postavT();
    e.spojSteny(stred.id, 5);

    const uzel = e.nodes.get(pricka.nodeB);
    kontrola('příčka zůstala napojená na sloučenou stěnu', pricka.doConstraint?.host === hlavni.id,
        JSON.stringify(pricka.doConstraint));
    kontrola('t se přepočítalo z 0,50 na 0,25', blizko(pricka.doConstraint.t, 0.25, 0.01),
        't = ' + pricka.doConstraint.t.toFixed(3));
    kontrola('napojený konec je pořád na x = 250', blizko(uzel.x, 250), 'x = ' + uzel.x.toFixed(1));
}

console.log('\n3) Mírný zlom (osa se narovná) — vzdálený konec se NESMÍ hnout');
{
    const KINK = 20;    // px kolmo = úhel ~175,4°
    const { e, hlavni, stred, pricka } = postavT({ kink: KINK });

    const uhel = e.lzeSpojitVUzlu(stred.id, 5);
    kontrola('úhel je uvnitř tolerance 5°', uhel.ok, uhel.uhel ? uhel.uhel.toFixed(1) + '°' : uhel.duvod);

    const volnyPred = { ...e.nodes.get(pricka.nodeA) };
    const napojenyPred = { ...e.nodes.get(pricka.nodeB) };
    const delkaPred = Math.hypot(napojenyPred.x - volnyPred.x, napojenyPred.y - volnyPred.y);
    e.spojSteny(stred.id, 5);
    const volnyPo = e.nodes.get(pricka.nodeA);
    const napojeny = e.nodes.get(pricka.nodeB);

    kontrola('vzdálený konec příčky zůstal na místě',
        blizko(volnyPred.x, volnyPo.x, 0.01) && blizko(volnyPred.y, volnyPo.y, 0.01),
        `${volnyPred.x},${volnyPred.y} → ${volnyPo.x},${volnyPo.y}`);
    kontrola('napojený konec sjel na novou osu (y ≈ 0)', blizko(napojeny.y, 0, 1),
        'y = ' + napojeny.y.toFixed(2));
    kontrola('příčka se tím zkrátila, ne posunula',
        blizko(napojeny.x, volnyPo.x, 1), 'x konců: ' + napojeny.x.toFixed(1) + ' vs ' + volnyPo.x.toFixed(1));

    // Napojený konec ležel na zalomené ose (y = 10), po narovnání je na y = 0,
    // takže se příčka o ten rozdíl prodloužila — přesně „prodloužit či zkrátit".
    const delkaPo = Math.hypot(napojeny.x - volnyPo.x, napojeny.y - volnyPo.y);
    kontrola('příčka se o zlom prodloužila, místo aby se posunula',
        blizko(delkaPred, 400 - KINK * 0.5, 1) && blizko(delkaPo, 400, 1),
        delkaPred.toFixed(1) + ' → ' + delkaPo.toFixed(1) + ' px');
}

console.log('\n4) Větší úhel se slučovat nenabízí');
{
    const { e, stred } = postavT({ kink: 120 });   // ~153°
    const v = e.lzeSpojitVUzlu(stred.id, 5);
    kontrola('uzel se odmítl', !v.ok, v.duvod);
    kontrola('sloučení neproběhlo', e.spojSteny(stred.id, 5) === null);
    kontrola('stěny zůstaly dvě', [...e.walls.values()].filter(w => w.tloustka === 0.3).length === 2);
}

console.log('\n5) Křižovatka (3 stěny) se slučovat nenabízí');
{
    const { e, stred, hlavni } = postavT();
    e.addWall(500, 0, 500, 300, 0.15);          // třetí stěna do téhož uzlu
    const v = e.lzeSpojitVUzlu(stred.id, 5);
    kontrola('uzel se odmítl', !v.ok, v.duvod);
}

console.log('\n6) Otvory přežijí sloučení');
{
    const { e, hlavni, druha, stred } = postavT();
    // dveře na první půlce (0–500 px = 0–5 m) a okno na druhé
    e.addOpening(hlavni.id, 1.0, 0.8, 'dvere');
    e.addOpening(druha, 1.5, 1.2, 'okno');
    kontrola('dva otvory před sloučením', e.openings.size === 2);

    const slouceno = e.spojSteny(stred.id, 5);
    const otvory = [...e.openings.values()];
    kontrola('oba otvory zůstaly', otvory.length === 2);
    kontrola('oba sedí na sloučené stěně', otvory.every(o => o.wallId === slouceno.id));

    const dvere = otvory.find(o => o.typ === 'dvere');
    const okno = otvory.find(o => o.typ === 'okno');
    kontrola('dveře zůstaly na 1,0 m od začátku', blizko(dvere.pozice, 1.0, 0.02), dvere.pozice.toFixed(2) + ' m');
    kontrola('okno se posunulo o délku první půlky na 6,5 m', blizko(okno.pozice, 6.5, 0.02), okno.pozice.toFixed(2) + ' m');
    kontrola('šířky se nezměnily', blizko(dvere.sirka, 0.8, 0.001) && blizko(okno.sirka, 1.2, 0.001));
}

console.log('\n7) Stěna napojená na LÍC hostitele zůstane na líci');
{
    const KINK = 20;
    const { e, stred, pricka } = postavT({ kink: KINK });
    // Posadit příčku 15 px vedle osy (napojená na líc, ne do osy)
    const napojeny = e.nodes.get(pricka.nodeB);
    napojeny.y = KINK * 0.5 + 15;

    e.spojSteny(stred.id, 5);
    const po = e.nodes.get(pricka.nodeB);
    kontrola('odsazení od osy se zachovalo (15 px)', blizko(po.y, 15, 1), 'y = ' + po.y.toFixed(2));
}

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
