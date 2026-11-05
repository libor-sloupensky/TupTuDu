/**
 * Veřejná kalkulačka zeminy musí počítat stejně jako editor: obdélníkový dům na rovině v různých
 * kombinacích, přesný vzorec proti mřížce po 10 cm ze zemina.js. Bez prohlížeče.
 *
 * Spuštění: node services/import-test/test-kalkulacka-zeminy.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// package.json má type module, soubory se proto nenačítají přes require
const nacti = (soubor, klic) => {
    const okno = {};
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/js', soubor), 'utf8'), { window: okno, Math, Map, Infinity, Number, parseFloat, String, Object });
    return okno[klic];
};
const Zemina = nacti('koncept-v3/zemina.js', 'Zemina');
const Kalkulacka = nacti('kalkulacka-zemina.js', 'KalkulackaZeminy');

let chyb = 0;
let pripadu = 0;
const bod = ([x, y]) => ({ x, y });

function editor(v) {
    const O = [[0, 0], [v.delka, 0], [v.delka, v.sirka], [0, v.sirka]].map(bod);
    const steny = [...O.map((a, i) => ({ a, b: O[(i + 1) % 4] })), { a: bod([v.delka / 2, 0]), b: bod([v.delka / 2, v.vnitrni]) }];
    const cast = (id, kota) => ({ id, nazev: id, obrys: O, kota, typ: v.typ, steny: v.typ === 'pasy' ? steny : [] });
    const casti = v.sklep ? [cast('S', v.nadTerenem - v.vyskaSklepu), cast('P1', v.nadTerenem)] : [cast('P1', v.nadTerenem)];
    return Zemina.spocitej(casti, null, { skladba: v.skladba, ornice: v.ornice, odkop: v.odkop, sirkaPasu: v.sirkaPasu, spara: v.spara, svah: v.svah, nakypreni: v.nakypreni });
}

function porovnej(popis, vstup) {
    const v = { ...Kalkulacka.VYCHOZI, ...vstup, vnitrni: vstup.sirka ?? Kalkulacka.VYCHOZI.sirka };
    const a = Kalkulacka.spocitej(v);
    const b = editor(v);
    pripadu++;
    const dvojice = [
        ['ornice vykopáno', a.ornice.vykopano, b.ornice.vykopano],
        ['ornice zpět', a.ornice.zpet, b.ornice.zpet],
        ['ornice navíc', a.ornice.prebytek, b.ornice.prebytek],
        ['výkopek vykopáno', a.vykopek.vykopano, b.vykopek.vykopano],
        ['výkopek zpět', a.vykopek.zpet, b.vykopek.zpet],
        ['výkopek navíc', a.vykopek.prebytek, b.vykopek.prebytek],
        ['rýhy', a.vykopek.ryhy, b.vykopek.ryhy],
        ['hromada', a.hromada, b.hromada],
    ];
    for (const [nazev, x, y] of dvojice) {
        // Mřížka editoru po 10 cm má na obvodu chybu do půl buňky. U sklepu může řada buněk ležet přesně na líci
        // stěny a započítat se ven z domu (polovina obvodu × 10 cm × hloubka), proto tolerance podle velikosti domu.
        const radaBunek = v.sklep ? 0.1 * (v.delka + v.sirka) * (v.vyskaSklepu + v.skladba) : 0;
        const tol = Math.max(1.5, Math.abs(y) * 0.012, radaBunek);
        if (Math.abs(x - y) > tol) {
            chyb++;
            console.log(`   CHYBA ${popis}: ${nazev} kalkulačka ${x.toFixed(2)}, editor ${y.toFixed(2)} (tolerance ${tol.toFixed(2)})`);
        }
    }
}

console.log('1) Shoda s editorem');
for (const [delka, sirka] of [[12, 10], [8, 6], [20, 9], [14.5, 11.2]]) {
    for (const typ of ['pasy', 'deska']) {
        for (const sklep of [false, true]) {
            for (const nadTerenem of [0.3, 0.15, 0.45]) {
                for (const skladba of [0.45, 0.6]) {
                    porovnej(`${delka}×${sirka} ${typ} ${sklep ? 'sklep' : 'bez sklepu'} nad ${nadTerenem} skladba ${skladba}`, { delka, sirka, typ, sklep, nadTerenem, skladba });
                }
            }
        }
    }
}
for (const svah of [0.25, 1]) porovnej(`sklep se svahem ${svah}`, { sklep: true, svah });
porovnej('hluboká spára', { spara: 1.6 });
porovnej('široký pas a tlustá ornice', { sirkaPasu: 0.7, ornice: 0.4 });
porovnej('pracovní prostor 60 cm', { odkop: 0.6 });
porovnej('nakypření 1,35', { nakypreni: 1.35 });
console.log(`   ${pripadu} kombinací, ${chyb} odchylek`);

console.log('2) Hodnoty, které uvádí článek (dům 12 × 10 m)');
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const blizko = (a, b, tol = 0.6) => Math.abs(a - b) <= tol;
const pasy = Kalkulacka.spocitej({ vnitrni: 10 });
kontrola('pasy: ornice navíc 30', blizko(pasy.ornice.prebytek, 30), pasy.ornice.prebytek.toFixed(1));
kontrola('pasy: výkopek navíc 8', blizko(pasy.vykopek.prebytek, 8.25), pasy.vykopek.prebytek.toFixed(1));
kontrola('pasy: vykopáno celkem 60', blizko(pasy.ornice.vykopano + pasy.vykopek.vykopano, 59.6), (pasy.ornice.vykopano + pasy.vykopek.vykopano).toFixed(1));
const deska = Kalkulacka.spocitej({ typ: 'deska' });
kontrola('deska: výkopek chybí 12', blizko(deska.vykopek.prebytek, -12), deska.vykopek.prebytek.toFixed(1));
const vysoko = Kalkulacka.spocitej({ nadTerenem: 0.6 });
kontrola('spodek nad terénem: nic se nekope', vysoko.bezKontaktu && vysoko.hromada === 0);

console.log(chyb ? `\nCHYBY: ${chyb}` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
