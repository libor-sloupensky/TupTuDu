/**
 * Tloušťka stěny musí přežít uložení a znovunačtení.
 *
 * `fromJSON` dřív každou tloušťku přichytil na normovou řadu typu, takže
 * 25cm příčka (řada končí na 19) se po reloadu i po undu vrátila na 19 cm —
 * uživateli to vypadalo, že se tloušťka neuložila. Normovou řadu si teď
 * vyžádá jen import z výkresu, kde tloušťka vyšla z měření.
 *
 * Spuštění: node services/import-test/test-tloustka-ulozeni.cjs
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

const tl = (e, id) => { const w = e.walls.get(id); return w ? w.tloustka : null; };

console.log('\n1) Ruční tloušťka přežije uložení a načtení');
{
    const e = new StavebniEngine({ pxPerM: 80 });
    const pricka = e.addWall(0, 0, 400, 0, 0.14);
    const nosna = e.addWall(0, 0, 0, 400, 0.30);
    // uživatel přepíše tloušťku v inspektoru (volně psaná hodnota, bez snapu)
    pricka.tloustka = 0.25;
    nosna.tloustka = 0.33;
    const data = JSON.parse(JSON.stringify(e.toJSON()));

    const e2 = new StavebniEngine({ pxPerM: 80 });
    e2.fromJSON(data);
    kontrola('příčka 25 cm zůstala 25 cm', tl(e2, pricka.id) === 0.25, 'je ' + tl(e2, pricka.id));
    kontrola('nosná 33 cm zůstala 33 cm', tl(e2, nosna.id) === 0.33, 'je ' + tl(e2, nosna.id));
    kontrola('typy se nezměnily',
        e2.walls.get(pricka.id).typ === pricka.typ && e2.walls.get(nosna.id).typ === nosna.typ);
}

console.log('\n2) Undo tloušťku taky nepřepíše');
{
    const e = new StavebniEngine({ pxPerM: 80 });
    const w = e.addWall(0, 0, 400, 0, 0.14);
    w.tloustka = 0.25;
    e.pushUndo();
    const id = w.id;
    e.walls.get(id).tloustka = 0.40;
    e.undo();
    kontrola('po undu je zpátky 25 cm (ne 19)', tl(e, id) === 0.25, 'je ' + tl(e, id));
}

console.log('\n3) Milimetrové tloušťky i mez');
{
    const e = new StavebniEngine({ pxPerM: 80 });
    const a = e.addWall(0, 0, 400, 0, 0.115);
    const b = e.addWall(0, 200, 400, 200, 0.14);
    b.tloustka = 0.1437;              // naměřená hodnota uložená bez snapu
    const e2 = new StavebniEngine({ pxPerM: 80 });
    e2.fromJSON(JSON.parse(JSON.stringify(e.toJSON())));
    kontrola('115 mm zůstalo 115 mm', tl(e2, a.id) === 0.115, 'je ' + tl(e2, a.id));
    kontrola('zlomek se zaokrouhlí na milimetry', tl(e2, b.id) === 0.144, 'je ' + tl(e2, b.id));
}

console.log('\n4) Import z výkresu normovou řadu dál používá');
{
    const e = new StavebniEngine({ pxPerM: 80 });
    e.fromJSON({ steny: [
        { id: 'W1', od: [0, 0], do: [5, 0], tloustka: 0.1437 },
        { id: 'W2', od: [0, 0], do: [0, 5], tloustka: 0.2960 },
    ] }, { snapTloustky: true });
    kontrola('0.1437 → 0.14', tl(e, 'W1') === 0.14, 'je ' + tl(e, 'W1'));
    kontrola('0.2960 → 0.30', tl(e, 'W2') === 0.30, 'je ' + tl(e, 'W2'));
}

console.log(chyb === 0 ? '\nVŠE PROŠLO\n' : `\nNEPROŠLO: ${chyb} kontrol\n`);
process.exit(chyb === 0 ? 0 : 1);
