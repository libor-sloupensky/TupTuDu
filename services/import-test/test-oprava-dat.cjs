/**
 * Samoopravy při načtení konceptu: jednotná id stěn a visící vazby.
 *
 * Obojí vzniklo provozem: stěna založená kreslením dostávala id „S", stěna
 * vzniklá rozdělením „W"; a mazání stěny nerušilo vazby dětí, takže zůstaly
 * ukazovat na mrtvé id. Nalezeno na třech konceptech — W32→W67 (Klemov),
 * W8→S49 (Křemelná), S25→S19 (Na bělidle).
 *
 * Spuštění: node services/import-test/test-oprava-dat.cjs
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

const novy = () => { const e = new Engine({ pxPerM: 100 }); e.SNAP_STEP = 0.1; return e; };

console.log('\n1) Id stěn se sjednotí na W');
{
    const e = novy();
    e.fromJSON({
        steny: [
            { id: 'S36', od: [0, 0], do: [10, 0], tloustka: 0.14, typ: 'pricka' },
            { id: 'W32', od: [3, 0], do: [3, 4], tloustka: 0.14, typ: 'pricka' },
            { id: 'S40', od: [7, 0], do: [7, 4], tloustka: 0.14, typ: 'pricka' },
        ],
        otvory: [{ id: 'D5', stena: 'S36', pozice: 1, sirka: 0.8, typ: 'dvere' }],
    });
    const ids = [...e.walls.keys()].sort();
    kontrola('žádné id nezačíná na S', !ids.some(id => /^S\d+$/.test(id)), ids.join(', '));
    kontrola('původní W si drží své id', e.walls.has('W32'));
    kontrola('S36 se přejmenovalo na W36', e.walls.has('W36'));
    const otvor = [...e.openings.values()][0];
    kontrola('otvor ukazuje na přejmenovanou stěnu', otvor.wallId === 'W36', otvor.wallId);
}

console.log('\n2) Kolize id: W s tímtéž číslem už existuje');
{
    const e = novy();
    e.fromJSON({
        steny: [
            { id: 'S12', od: [0, 0], do: [10, 0], tloustka: 0.14, typ: 'pricka' },
            { id: 'W12', od: [0, 5], do: [10, 5], tloustka: 0.14, typ: 'pricka' },
        ],
    });
    kontrola('obě stěny zůstaly', e.walls.size === 2, [...e.walls.keys()].join(', '));
    kontrola('žádné S nezbylo', ![...e.walls.keys()].some(id => /^S\d+$/.test(id)));
    kontrola('id se nepřepsala navzájem', new Set(e.walls.keys()).size === 2);
}

console.log('\n3) Vazba na smazanou stěnu se přepojí na tu, co tam leží');
{
    const e = novy();
    e.fromJSON({
        steny: [
            // vodorovná stěna, pod jejíž osou končí příčka
            { id: 'S36', od: [0, 0], do: [10, 0], tloustka: 0.14, typ: 'pricka' },
            // příčka visí na neexistující W67 — ve skutečnosti sedí na S36
            { id: 'W32', od: [3, 4], do: [3, 0.06], tloustka: 0.14, typ: 'pricka',
              do_constraint: { host: 'W67', t: 0.25 } },
        ],
    });
    const pricka = e.walls.get('W32');
    kontrola('vazba se přepojila na skutečného hostitele',
        pricka.doConstraint && pricka.doConstraint.host === 'W36',
        JSON.stringify(pricka.doConstraint));
    kontrola('příčka je teď dítětem té stěny',
        e.getTChildren('W36').some(ch => ch.wall.id === 'W32'));
    const t = pricka.doConstraint.t;
    kontrola('t odpovídá skutečné poloze (x = 3 z 10)', Math.abs(t - 0.3) < 0.02, 't = ' + t.toFixed(3));
}

console.log('\n4) Vazba do prázdna se zruší');
{
    const e = novy();
    e.fromJSON({
        steny: [
            { id: 'W3', od: [0, 0], do: [10, 0], tloustka: 0.14, typ: 'pricka' },
            // konec příčky je daleko od čehokoli
            { id: 'S25', od: [30, 30], do: [30, 34], tloustka: 0.14, typ: 'pricka',
              od_constraint: { host: 'S19', t: 0.5 } },
        ],
    });
    const osamela = e.walls.get('W25');
    kontrola('stěna se načetla pod novým id', !!osamela, [...e.walls.keys()].join(', '));
    kontrola('visící vazba je pryč', osamela && !osamela.odConstraint);
}

console.log('\n5) Smazání hostitele vazby rovnou ruší');
{
    const e = novy();
    const host = e.addWall(0, 0, 1000, 0, 0.3);
    const pricka = e.addWall(500, 400, 500, 0, 0.15);
    pricka.doConstraint = { host: host.id, t: 0.5 };

    e.removeWall(host.id);
    kontrola('dítě po smazaném hostiteli nevisí', !pricka.doConstraint,
        JSON.stringify(pricka.doConstraint));
}

console.log('\n6) Id otvoru odpovídá typu i po načtení bez id');
{
    const e = novy();
    e.fromJSON({
        steny: [{ id: 'W3', od: [0, 0], do: [10, 0], tloustka: 0.3, typ: 'nosna' }],
        otvory: [
            { stena: 'W3', pozice: 1, sirka: 0.8, typ: 'dvere' },
            { stena: 'W3', pozice: 4, sirka: 1.2, typ: 'okno' },
        ],
    });
    const podleTypu = {};
    for (const o of e.openings.values()) podleTypu[o.typ] = o.id;
    kontrola('dveře dostaly D…', /^D\d+$/.test(podleTypu.dvere || ''), podleTypu.dvere);
    kontrola('okno dostalo O…', /^O\d+$/.test(podleTypu.okno || ''), podleTypu.okno);
}

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
