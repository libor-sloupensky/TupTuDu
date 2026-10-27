/**
 * Odpojení stěny od spoje — odpojený konec se musí VŽDY odsunout dost daleko.
 *
 * Když se neodsune, leží dva uzly na sobě a při dalším kliknutí se chytne ten
 * druhý. Mezeru si volající (overlay v koncept-v3.blade.php) počítá z dosahu
 * přichytávání, aby se stěna hned nechytila zpátky.
 *
 * Spuštění: node services/import-test/test-odpojeni.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Projekt má "type": "module", takže require() by z enginu nic nevydal.
if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
const soubor = path.join(__dirname, '../../public/js/koncept-v3/stavebni-engine.js');
vm.runInThisContext(fs.readFileSync(soubor, 'utf8'), { filename: soubor });
const { StavebniEngine } = globalThis;
if (!StavebniEngine) throw new Error('Engine se nenačetl.');

const MEZERA = (20 / 0.53) + 6;     // co posílá overlay při zoomu 53 %
let chyb = 0;

function zmer(popis, postav) {
    const e = new StavebniEngine({ pxPerM: 100 });
    e.SNAP_STEP = 0.1;
    const { stena, uzelId } = postav(e);
    const pred = { ...e.nodes.get(uzelId) };
    const ok = e.detachWallFromNode(stena.id, uzelId, MEZERA);

    // Konec, který ve spoji byl, je ten bližší k původnímu místu.
    const vzdalenost = [e.nodes.get(stena.nodeA), e.nodes.get(stena.nodeB)]
        .map(n => Math.hypot(n.x - pred.x, n.y - pred.y))
        .sort((a, b) => a - b)[0];

    const sedi = ok && vzdalenost >= MEZERA - 0.5;
    if (!sedi) chyb++;
    console.log(`   ${sedi ? 'OK  ' : 'CHYBA'} ${popis.padEnd(32)} odsun ${vzdalenost.toFixed(1)} px`
        + ` (potřeba ${MEZERA.toFixed(1)})${ok ? '' : ' · NEODPOJENO'}`);
}

console.log('\nOdsun odpojeného konce podle typu spoje:');

// T — příčka držená vazbou uprostřed hostitele
zmer('T (vazba, kolmo)', (e) => {
    const host = e.addWall(0, 0, 1000, 0, 0.3);
    const pricka = e.addWall(500, 400, 500, 0, 0.15);
    pricka.doConstraint = { host: host.id, t: 0.5 };
    return { stena: pricka, uzelId: pricka.nodeB };
});

// L — dvě kolmé stěny sdílející roh
zmer('L (sdílený roh, 90°)', (e) => {
    e.addWall(0, 0, 500, 0, 0.3);
    const b = e.addWall(500, 0, 500, 500, 0.3);
    return { stena: b, uzelId: b.nodeA };
});

// V — dvě stěny pod ostrým úhlem
zmer('V (sdílený roh, 45°)', (e) => {
    e.addWall(0, 0, 500, 0, 0.3);
    const b = e.addWall(500, 0, 900, 400, 0.3);
    return { stena: b, uzelId: b.nodeA };
});

// I přes sdílený uzel — tady se dřív konec nehnul vůbec
zmer('I (sdílený uzel, souosé)', (e) => {
    e.addWall(0, 0, 500, 0, 0.3);
    const b = e.addWall(500, 0, 1000, 0, 0.3);
    return { stena: b, uzelId: b.nodeA };
});

// I přes vazbu na čelo
zmer('I (vazba na čelo)', (e) => {
    const a = e.addWall(0, 0, 500, 0, 0.3);
    const b = e.addWall(500, 0, 1000, 0, 0.2);
    const novy = e.addNode(500.01, 0);
    b.nodeA = novy.id;
    b.odConstraint = { host: a.id, konec: 'B' };
    return { stena: b, uzelId: novy.id };
});

// Krátká stěna — na zkrácení po vlastní ose není dost délky
zmer('L s krátkou stěnou (30 px)', (e) => {
    e.addWall(0, 0, 500, 0, 0.3);
    const b = e.addWall(500, 0, 500, 30, 0.1);
    return { stena: b, uzelId: b.nodeA };
});

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
