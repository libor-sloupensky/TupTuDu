/**
 * Veřejná kalkulačka schodiště musí počítat stejně jako schody v editoru (DumGeo.schodyGeo v koncept-v3/dum.js):
 * počet výšek, výška stupně, nášlap a půdorysné rozměry přímých schodů, do L a do U. Bez prohlížeče.
 *
 * Spuštění: node services/import-test/test-kalkulacka-schodiste.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// package.json má type module, soubory se proto nenačítají přes require
const okno = {};
const kontext = vm.createContext({ window: okno, Math, Number, Array, Object, String, parseFloat, Map, Set, Infinity, console, preloz: (k) => k, prelozPocet: (k) => k, prelozCislo: (x) => String(x) });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../public/js/koncept-v3/dum.js'), 'utf8'), kontext);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../../public/js/kalkulacka-schodiste.js'), 'utf8'), kontext);
const { schodyGeo } = okno.DumGeo;
const Kalkulacka = okno.KalkulackaSchodiste;

let chyb = 0;
let pripadu = 0;
const blizko = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;

for (const tvar of ['prime', 'L', 'U']) {
    for (const vyska of [2.5, 2.7, 2.85, 2.9, 3.0, 3.2, 3.5]) {
        for (const sirka of [0.8, 0.9, 1.1]) {
            for (const cilova of [0.16, 0.175, 0.19]) {
                pripadu++;
                const PX = 100;
                const s = { x: 0, y: 0, uhel: 0, sirka, tvar: tvar === 'prime' ? undefined : tvar, strana: 1, vyskaStupne: cilova };
                const e = schodyGeo(s, vyska, PX);
                const xs = e.obrys.map((p) => p.x / PX), ys = e.obrys.map((p) => p.y / PX);
                const ed = { delka: Math.max(...xs) - Math.min(...xs), sirka: Math.max(...ys) - Math.min(...ys) };
                const k = Kalkulacka.spocitej({ vyska, tvar, sirka, cilova });
                const ok = k.n === e.n && blizko(k.h, e.v) && blizko(k.b, e.b)
                    && blizko(k.pudorys.delka, ed.delka) && blizko(k.pudorys.sirka, ed.sirka)
                    && e.stupne.length === k.useky.length;
                if (!ok) {
                    chyb++;
                    if (chyb <= 10) {
                        console.log(`   CHYBA ${tvar} H=${vyska} š=${sirka} h0=${cilova}: editor n=${e.n} h=${e.v.toFixed(4)} b=${e.b.toFixed(4)} ${ed.delka.toFixed(3)}×${ed.sirka.toFixed(3)} stupňů ${e.stupne.length}`
                            + ` | kalkulačka n=${k.n} h=${k.h.toFixed(4)} b=${k.b.toFixed(4)} ${k.pudorys.delka.toFixed(3)}×${k.pudorys.sirka.toFixed(3)} úseků ${k.useky.length}`);
                    }
                }
            }
        }
    }
}

// Doporučení v Česku: výška stupně 150 až 180 mm, 2h + b 600 až 650 mm, šířka od 900 mm
const vychozi = Kalkulacka.spocitej({});
const vychoziOk = vychozi.n === 17 && vychozi.vyskaOk && vychozi.krokOk && vychozi.sirkaOk;
console.log(`   ${vychoziOk ? 'OK  ' : 'CHYBA'} výchozí 2,90 m: 17 stupňů po 171 mm, vše v doporučení`);
if (!vychoziOk) chyb++;
const uzke = Kalkulacka.spocitej({ sirka: 0.8, cilova: 0.2, vyska: 2.8 });
const uzkeOk = !uzke.sirkaOk && !uzke.vyskaOk;
console.log(`   ${uzkeOk ? 'OK  ' : 'CHYBA'} úzké a strmé schody nesplní doporučení šířky ani výšky`);
if (!uzkeOk) chyb++;

// Výšek v jednom rameni nejvýš 18: přímé schody na 3,50 m (20 výšek) ne, do L ano
const prime35 = Kalkulacka.spocitej({ vyska: 3.5 });
const l35 = Kalkulacka.spocitej({ vyska: 3.5, tvar: 'L' });
const ramenoOk = prime35.rameno === 20 && !prime35.ramenoOk && l35.rameno <= 11 && l35.ramenoOk && vychozi.ramenoOk;
console.log(`   ${ramenoOk ? 'OK  ' : 'CHYBA'} přímé schody na 3,50 m mají 20 výšek v rameni a potřebují odpočívadlo, do L ne — ${prime35.rameno} / ${l35.rameno}`);
if (!ramenoOk) chyb++;

console.log(chyb ? `\nCHYBY: ${chyb} z ${pripadu} případů` : `\nVše v pořádku, ${pripadu} případů shodných s editorem`);
process.exit(chyb ? 1 : 0);
