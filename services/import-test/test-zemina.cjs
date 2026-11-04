/**
 * Bilance zeminy bez prohlížeče: pasy, celý a částečný sklep, svah, násyp, stávající stavba.
 *
 * Spuštění: node services/import-test/test-zemina.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// package.json má type module, soubor se proto nenačítá přes require
const okno = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/js/koncept-v3/zemina.js'), 'utf8'), { window: okno, Math, Map, Infinity });
const Zemina = okno.Zemina;

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const blizko = (a, b, tol) => Math.abs(a - b) <= tol;
const bod = ([x, y]) => ({ x, y });
const obd = (w, h) => [[0, 0], [w, 0], [w, h], [0, h]].map(bod);
const stenyObrysu = (o) => o.map((a, i) => ({ a, b: o[(i + 1) % o.length] }));

const O = obd(12, 10);
const kota = 0.3;   // výchozí výška podlahy 1.NP nad terénem

console.log('1) Dům 10 × 12 m na pasech, rovina');
const A = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'pasy',
    steny: [...stenyObrysu(O), { a: bod([6, 0]), b: bod([6, 10]) }] }], null);
const plochaZony = 12 * 10 + 2 * 0.8 * (12 + 10) + Math.PI * 0.64;
kontrola('ornice = obrys + 0,8 m × 0,25 m', blizko(A.ornice.vykopano, plochaZony * 0.25, 0.5), A.ornice.vykopano.toFixed(1));
kontrola('přebytek ornice = jen pod domem', blizko(A.ornice.prebytek, 120 * 0.25, 0.5), A.ornice.prebytek.toFixed(1));
kontrola('rýhy = 54 m × 0,5 × 0,75', blizko(A.vykopek.ryhy, 54 * 0.5 * 0.75, 0.5), A.vykopek.ryhy.toFixed(1));
kontrola('pod domem se dosype 10 cm', blizko(A.vykopek.zpet, 120 * 0.1, 0.5), A.vykopek.zpet.toFixed(1));
kontrola('nakypřený = rostlý × 1,25', blizko(A.vykopek.prebytekNakypreny, A.vykopek.prebytek * 1.25, 1e-6));
kontrola('plocha části', blizko(A.casti[0].plocha, 120, 0.5), A.casti[0].plocha.toFixed(1));

console.log('2) Celý sklep 3,05 m');
const B = Zemina.spocitej([
    { id: 'S', nazev: '1.PP', obrys: O, kota: kota - 3.05, typ: 'deska', steny: [] },
    { id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'pasy', steny: stenyObrysu(O) },
], null);
const hS = 3.05 + 0.45 - 0.3;
kontrola('přebytek výkopku = objem domu pod terénem bez ornice', blizko(B.vykopek.prebytek, 120 * (hS - 0.25), 3), B.vykopek.prebytek.toFixed(1));
kontrola('pasy 1.NP nad sklepem nevzniknou', B.vykopek.ryhy === 0 && B.casti[1].delkaPasu === 0);
kontrola('celá plocha patří sklepu', blizko(B.casti[0].plocha, 120, 0.5) && B.casti[1].plocha === 0);
kontrola('zásyp je znát: vykopáno > přebytek', B.vykopek.zpet > 150, B.vykopek.zpet.toFixed(0));

console.log('3) Část podsklepená (Klemov kopie)');
const np = [[-9.12,-0.49],[-2.64,9.89],[4.09,5.69],[0.15,-0.62],[-0.91,0.04],[-3.45,-4.03]].map(bod);
const sk = [[4.09,5.69],[0.16,-0.61],[-0.9,0.05],[-3.45,-4.03],[-6.19,-2.32],[0.29,8.06]].map(bod);
const C = Zemina.spocitej([
    { id: 'P3', nazev: '1.PP', obrys: sk, kota: kota - 2.7, typ: 'deska', steny: stenyObrysu(sk) },
    { id: 'P1', nazev: '1.NP', obrys: np, kota, typ: 'pasy', steny: [...stenyObrysu(np), { a: bod([-6.11,-2.19]), b: bod([0.21,7.93]) }] },
], null);
kontrola('plochy částí dají celý půdorys', blizko(C.casti[0].plocha + C.casti[1].plocha, 91, 1.5), C.casti.map(c => c.plocha.toFixed(1)).join(' + '));
kontrola('každá část má vlastní výkop a sečtou se', C.casti[0].vykopek > 100 && C.casti[1].vykopek > 0 && blizko(C.casti[0].vykopek + C.casti[1].vykopek, C.vykopek.vykopano, 0.01), C.casti.map(c => c.vykopek.toFixed(0)).join(' + '));
kontrola('nosná stěna na stěně sklepu pas nemá', C.casti[1].delkaPasu < 20, C.casti[1].delkaPasu.toFixed(1) + ' m');

console.log('4) Svah a násyp');
const svah = (x) => (x - 6) * 0.2;   // 20 % přes dům
const S = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'deska', steny: [] }], (x) => svah(x));
kontrola('na svahu se dosype pod spodní stranu', S.vykopek.zpet > A.vykopek.zpet, S.vykopek.zpet.toFixed(1));
const V = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota: 1.5, typ: 'deska', steny: [] }], null, { sokl: 2 });
kontrola('vysoko nad terénem v dosahu soklu chybí zemina (záporný přebytek)', V.vykopek.prebytek < 0, V.vykopek.prebytek.toFixed(1));

console.log('5) Stávající stavba a nastavení');
const E = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'stavajici', steny: stenyObrysu(O) }], null);
kontrola('stávající stavba nic nekope', E.vykopek.vykopano === 0 && E.ornice.vykopano === 0 && blizko(E.casti[0].plocha, 120, 0.5));
const N = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'pasy', steny: stenyObrysu(O) }], null, { sirkaPasu: 0.6, spara: 1.2, nakypreni: 1.35 });
kontrola('vlastní šířka a hloubka pasu', blizko(N.vykopek.ryhy, 44 * 0.6 * 0.95, 0.5), N.vykopek.ryhy.toFixed(1));
kontrola('vlastní nakypření', blizko(N.vykopek.prebytekNakypreny, N.vykopek.prebytek * 1.35, 1e-6));

console.log('6) Terén z výškových bodů');
const stred = { lat: 50, lon: 15 };
const body = [];
for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) body.push([50 + j * 2 / 111320, 15 + i * 2 / (111320 * Math.cos(50 * Math.PI / 180)), 400 + i * 0.2]);
const t = Zemina.terenZProfilu(body, stred);
kontrola('výška odpovídá sklonu bodů', blizko(t(10, 0), 401, 0.1), t(10, 0).toFixed(2));
kontrola('nad parcelou není odhad, daleko je', !t.odhad(0, 0) && t.odhad(200, 0));
kontrola('±0 je 70. percentil pod domem', blizko(Zemina.nulaTerenu(obd(10, 10), t), 400 + 7 * 0.1, 0.25), Zemina.nulaTerenu(obd(10, 10), t).toFixed(2));
const a0 = Date.now();
const R = Zemina.spocitej([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'pasy', steny: stenyObrysu(O) }], (x, y) => t(x, y) - 400);
kontrola('výpočet nad terénem pod 400 ms', Date.now() - a0 < 400, (Date.now() - a0) + ' ms, výkopek ' + R.vykopek.vykopano.toFixed(0));

console.log('7) Tvar jámy pro 3D');
const objem = (j) => { let s = 0; for (const h of j.hloubky) s += h * j.krok * j.krok; return s; };
const castiPasy = [{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'pasy', steny: stenyObrysu(O) }];
const J = Zemina.jama(castiPasy, null);
const JB = Zemina.spocitej(castiPasy, null);
const celkem = JB.vykopek.vykopano + JB.ornice.vykopano;
kontrola('objem jámy odpovídá bilanci i s rýhami', blizko(objem(J), celkem, celkem * 0.05), objem(J).toFixed(1) + ' / ' + celkem.toFixed(1));
const hl = (j, x, y) => j.hloubky[Math.round((y - j.v0) / j.krok) * j.sloupcu + Math.round((x - j.u0) / j.krok)];
kontrola('pod domem bez sklepu je sejmutá ornice', blizko(hl(J, O[0].x + 3, O[0].y + 3), 0.25, 0.01), String(hl(J, O[0].x + 3, O[0].y + 3)));
kontrola('pod stěnou je rýha až na spáru', blizko(hl(J, O[0].x + 3, O[0].y), 1, 0.01), String(hl(J, O[0].x + 3, O[0].y)));
kontrola('daleko od domu se nekope', hl(J, J.u0 + J.krok, J.v0 + J.krok) === 0);
const JN = Zemina.jama(castiPasy, null, null, 0.6);
kontrola('natočená mřížka dá stejný objem', blizko(objem(JN), celkem, celkem * 0.03), objem(JN).toFixed(1) + ' / ' + celkem.toFixed(1));
const JS = Zemina.jama([{ id: 'P0', nazev: '1.PP', obrys: O, kota: -2.8, typ: 'deska', steny: [] }], null);
kontrola('jáma sklepu je na dně pod skladbou a kolem ní se svahuje', blizko(hl(JS, O[0].x + 3, O[0].y + 3), 3.25, 0.01) && hl(JS, O[0].x - 1.3, O[0].y + 3) > 2 && hl(JS, O[0].x - 1.3, O[0].y + 3) < 3.25, [hl(JS, O[0].x + 3, O[0].y + 3), hl(JS, O[0].x - 1.3, O[0].y + 3)].join(' / '));
kontrola('stávající stavba jámu nemá', Zemina.jama([{ id: 'P1', nazev: '1.NP', obrys: O, kota, typ: 'stavajici', steny: [] }], null) === null);

console.log('8) Dům, který na zem nedosáhne');
const vysoko = [{ id: 'P1', nazev: '1.NP', obrys: O, kota: 2, typ: 'pasy', steny: stenyObrysu(O) }];
const ZV = Zemina.spocitej(vysoko, null);
kontrola('dům 2 m nad terénem se nekope a chybí mu základ', ZV.vykopek.vykopano === 0 && ZV.ornice.vykopano === 0 && ZV.casti[0].delkaPasu === 0 && blizko(ZV.bezZakladu, 120, 1), JSON.stringify([ZV.vykopek.vykopano, ZV.ornice.vykopano, ZV.bezZakladu]));
const JV = Zemina.jama(vysoko, null);
kontrola('takový dům nemá ani jámu', objem(JV) === 0);
const naHrane = Zemina.spocitej([{ ...vysoko[0], kota: 0.95 }], null), pres = Zemina.spocitej([{ ...vysoko[0], kota: 0.96 }], null);
kontrola('sokl 50 cm překlene mezeru, o kousek výš už ne', naHrane.bezZakladu === 0 && naHrane.vykopek.vykopano > 0 && pres.vykopek.vykopano === 0 && pres.bezZakladu > 100, [naHrane.bezZakladu, pres.bezZakladu].join(' / '));
const soklNula = Zemina.spocitej([{ ...vysoko[0], kota: 0.5 }], null, { sokl: 0 });
kontrola('sokl jde nastavit', soklNula.bezZakladu > 100 && soklNula.vykopek.vykopano === 0);
const SvV = Zemina.spocitej(vysoko, (x) => (x - O[0].x) * 0.3);
kontrola('na svahu se kope jen tam, kde dům na zem dosáhne', SvV.vykopek.vykopano > 0 && SvV.bezZakladu > 10 && SvV.bezZakladu < 110, SvV.bezZakladu.toFixed(1) + ' m²');
const KV = Zemina.spocitej([{ id: 'S', nazev: '1.PP', obrys: obd(6, 10), kota: -0.8, typ: 'pasy', steny: stenyObrysu(obd(6, 10)) }, { id: 'P1', nazev: '1.NP', obrys: O, kota: 2, typ: 'pasy', steny: stenyObrysu(O) }], null);
kontrola('zvednutý dům se sklepem: sklep se kope, zbytek chybí', KV.casti[0].vykopek > 5 && KV.casti[1].vykopek === 0 && KV.casti[1].bezZakladu > 50, JSON.stringify(KV.casti.map(c => [c.nazev, Math.round(c.vykopek), Math.round(c.bezZakladu)])));
const EV = Zemina.spocitej([{ ...vysoko[0], typ: 'stavajici' }], null);
kontrola('stávající stavba základ má', EV.bezZakladu === 0);

console.log('\nBilance pro přehled (rostlý / nakypřený přebytek výkopku, ornice):');
for (const [n, v] of [['A pasy', A], ['B sklep', B], ['C Klemov', C]]) {
    console.log(`   ${n}: výkopek ${v.vykopek.vykopano.toFixed(0)}, zpět ${v.vykopek.zpet.toFixed(0)}, přebytek ${v.vykopek.prebytek.toFixed(0)} / ${v.vykopek.prebytekNakypreny.toFixed(0)}; ornice přebytek ${v.ornice.prebytek.toFixed(0)} / ${v.ornice.prebytekNakypreny.toFixed(0)}; hromada ${v.hromada.toFixed(0)}`);
}
console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
