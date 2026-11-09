/**
 * Starý model `prostory` je zrušený (9. 11. 2026). Starší projekty a import výkresu ho dál nesou:
 * názvy se při načtení převedou na místnosti, uložení už prostory neobsahuje.
 *
 * Spuštění: node services/import-test/test-stare-prostory.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (typeof globalThis.window === 'undefined') globalThis.window = globalThis;
const soubor = path.join(__dirname, '../../public/js/koncept-v3/stavebni-engine.js');
vm.runInThisContext(fs.readFileSync(soubor, 'utf8'), { filename: soubor });
const Engine = globalThis.StavebniEngine;
if (!Engine) throw new Error('Engine se nenačetl.');

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

// Dům 10 × 8 m s příčkou v x = 5, souřadnice v metrech (y nahoru)
const steny = [
    { id: 'W1', od: [0, 0], do: [10, 0], tloustka: 0.3, typ: 'obvodova' },
    { id: 'W2', od: [10, 0], do: [10, -8], tloustka: 0.3, typ: 'obvodova' },
    { id: 'W3', od: [10, -8], do: [0, -8], tloustka: 0.3, typ: 'obvodova' },
    { id: 'W4', od: [0, -8], do: [0, 0], tloustka: 0.3, typ: 'obvodova' },
    { id: 'S5', od: [5, 0], do: [5, -8], tloustka: 0.15, typ: 'pricka' },
];
const PX = 100;
const blizko = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('\n1) Uložený starší projekt s vrcholy');
{
    const e = new Engine({ pxPerM: PX });
    e.fromJSON({
        steny,
        prostory: [
            { id: 'P1', nazev: 'Kuchyně', typ: 'Kitchen', vertices: [{ refNodeId: null, x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 800 }, { x: 0, y: 800 }] },
            { id: 'P2', nazev: 'Terasa', typ: 'Outdoor', venkovni: true, vertices: [{ x: 1000, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 800 }] },
        ],
    });
    const m = e.mistnosti.find(x => x.nazev === 'Kuchyně');
    kontrola('název prostoru se převede na místnost s kotvou v jeho těžišti', m && blizko(m.kotva.x, 250, 30) && blizko(m.kotva.y, 400, 30), JSON.stringify(e.mistnosti));
    kontrola('venkovní prostor místnost nevytvoří', !e.mistnosti.some(x => x.nazev === 'Terasa'));
    const json = e.toJSON();
    kontrola('engine model prostorů nemá a uložení je neobsahuje', e.prostory === undefined && json.prostory === undefined && json.mistnosti.length === 1, Object.keys(json).join());
    kontrola('id stěn se sjednotí i se starými prostory (S5 → W)', [...e.walls.keys()].every(id => id.startsWith('W')));
}

console.log('\n2) Import výkresu s polygonem v metrech');
{
    const e = new Engine({ pxPerM: PX });
    e.fromJSON({
        steny,
        prostory: [{ id: 'P1', nazev: 'Obývák', typ: 'LivingRoom', polygon: [[5, 0], [10, 0], [10, -8], [5, -8]] }],
    });
    const m = e.mistnosti[0];
    kontrola('místnost z importu dostane název a kotvu uvnitř', m && m.nazev === 'Obývák' && blizko(m.kotva.x, 750, 40) && blizko(m.kotva.y, 400, 40), JSON.stringify(e.mistnosti));
}

console.log('\n3) Projekt, který místnosti už má');
{
    const e = new Engine({ pxPerM: PX });
    e.fromJSON({
        steny,
        mistnosti: [{ id: 'M1', nazev: 'Ložnice', kotva: [2, -4] }],
        prostory: [{ id: 'P1', nazev: 'Kuchyně', vertices: [{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 500, y: 800 }] }],
    });
    kontrola('existující místnosti se nepřepisují starými prostory', e.mistnosti.length === 1 && e.mistnosti[0].nazev === 'Ložnice', JSON.stringify(e.mistnosti.map(x => x.nazev)));
}

console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
