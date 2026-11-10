/**
 * Druh místnosti (Libor 10. 11. 2026): výchozí název se přepne s druhem a očísluje („Obývák 2“),
 * ručně napsaný název zůstane, „Jiná“ vrátí „Místnost n“. Druh se uloží i načte, import ho převezme.
 * Bez slovníku (Node) vrací engine místo názvu druhu klíč slovníku, např. „ed_kresba.prostor_obyvak 2“.
 *
 * Spuštění: node services/import-test/test-druh-mistnosti.cjs
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

const novy = () => {
    const e = new Engine({ pxPerM: 100 });
    e.fromJSON({
        steny: [],
        mistnosti: [
            { id: 'M1', nazev: 'Místnost 1', auto: { k: 'mistnost_n', n: 1 }, kotva: [1, -1] },
            { id: 'M2', nazev: 'Místnost 2', auto: { k: 'mistnost_n', n: 2 }, kotva: [5, -1] },
            { id: 'M3', nazev: 'Pokojíček nahoře', kotva: [9, -1] },
        ],
    });
    return e;
};

console.log('\n1) Výchozí název podle druhu');
{
    const e = novy();
    const [m1, m2, m3] = e.mistnosti;
    e.nastavDruhMistnosti(m1, 'obyvak');
    e.nastavDruhMistnosti(m2, 'obyvak');
    kontrola('první obývák bez čísla, druhý s číslem 2', m1.nazev === 'ed_kresba.prostor_obyvak' && m2.nazev === 'ed_kresba.prostor_obyvak 2' && m1.druh === 'obyvak', `${m1.nazev} | ${m2.nazev}`);
    e.nastavDruhMistnosti(m3, 'loznice');
    kontrola('ručně napsaný název zůstane, druh se uloží', m3.nazev === 'Pokojíček nahoře' && m3.druh === 'loznice' && !m3.auto);
    e.nastavDruhMistnosti(m2, '');
    kontrola('„Jiná“ vrátí výchozí „Místnost n“ s volným číslem a druh zmizí', m2.nazev === 'Místnost 1' && !m2.druh, m2.nazev);
    e.nastavDruhMistnosti(m2, 'nesmysl');
    kontrola('neznámý druh se nepřijme', !m2.druh);
}

console.log('\n2) Uložení a načtení');
{
    const e = novy();
    e.nastavDruhMistnosti(e.mistnosti[0], 'kuchyne');
    const json = e.toJSON();
    const ulozena = json.mistnosti.find(m => m.id === 'M1');
    kontrola('druh a výchozí název se uloží', ulozena.druh === 'kuchyne' && ulozena.auto.k === 'prostor_kuchyne', JSON.stringify(ulozena));
    const e2 = new Engine({ pxPerM: 100 });
    e2.fromJSON(json);
    kontrola('po načtení druh zůstane', e2.mistnosti.find(m => m.id === 'M1')?.druh === 'kuchyne');
    kontrola('místnost bez druhu se uloží bez něj', !('druh' in json.mistnosti.find(m => m.id === 'M2')));
}

console.log('\n3) Import výkresu');
{
    const e = new Engine({ pxPerM: 100 });
    e.fromJSON({ steny: [], prostory: [{ id: 'P1', nazev: 'Kuchyně', typ: 'Kitchen', polygon: [[0, 0], [4, 0], [4, -3], [0, -3]] }] });
    const m = e.mistnosti[0];
    kontrola('typ z importu se převede na druh, název z výkresu zůstane', m && m.druh === 'kuchyne' && m.nazev === 'Kuchyně', JSON.stringify(m));
}

console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
