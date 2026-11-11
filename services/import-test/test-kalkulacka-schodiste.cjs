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

// U2 = do U se dvěma odpočívadly, v editoru tvar U s prostřední částí větší než 0
for (const tvar of ['prime', 'L', 'U', 'U2']) {
    for (const vyska of [2.5, 2.7, 2.85, 2.9, 3.0, 3.2, 3.5]) {
        for (const sirka of [0.8, 0.9, 1.1]) {
            for (const cilova of [0.16, 0.175, 0.19]) {
                pripadu++;
                const PX = 100;
                const n0 = Math.max(2, Math.round(vyska / cilova));
                const s = { x: 0, y: 0, uhel: 0, sirka, tvar: tvar === 'prime' ? undefined : tvar === 'U2' ? 'U' : tvar, strana: 1, vyskaStupne: cilova,
                    casti: tvar === 'U2' ? Kalkulacka.castiSchodu(n0, 'U2') : undefined };
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

// Zabíhající stupně a točité schody: editor je zatím nemá, kontroluje se geometrie
const plocha = (body) => Math.abs(body.reduce((s, p, i) => { const q = body[(i + 1) % body.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const krizi = (a, b, c, d) => {
    const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
};
const prekryvHran = (body) => {
    for (let i = 0; i < body.length; i++) for (let j = i + 2; j < body.length; j++) {
        if (i === 0 && j === body.length - 1) continue;
        if (krizi(body[i], body[(i + 1) % body.length], body[j], body[(j + 1) % body.length])) return true;
    }
    return false;
};
let geoChyb = 0, geoPripadu = 0;
for (const tvar of ['Lz', 'Uz']) {
    for (const vyska of [2.5, 2.7, 2.9, 3.05, 3.2, 3.5]) {
        for (const sirka of [0.8, 0.9, 1.0, 1.2, 1.5]) {
            for (const cilova of [0.16, 0.175, 0.19]) {
                geoPripadu++;
                const k = Kalkulacka.spocitej({ vyska, tvar, sirka, cilova });
                if (k.nelze) continue;
                const p = k.pudorys;
                const soucet = p.polygony.reduce((s, o) => s + plocha(o.body), 0);
                const vadne = p.polygony.filter((o) => plocha(o.body) < 0.02 || prekryvHran(o.body)).length;
                // Plocha stupňů = obálka bez vnitřního rohu (L), u U bez ničeho (ramena těsně vedle sebe)
                const ocekavana = tvar === 'Lz' ? p.delka * p.sirka - (p.delka - sirka) * (p.sirka - sirka) : p.delka * p.sirka;
                const ok = p.platne && !vadne && p.polygony.length === k.n - 1 && Math.abs(soucet - ocekavana) < 1e-6 && k.nejuzsi > 0 && k.nejuzsiOk === (k.nejuzsi >= 0.13 - 1e-9);
                if (!ok) {
                    geoChyb++;
                    if (geoChyb <= 8) console.log(`   CHYBA ${tvar} H=${vyska} š=${sirka} h0=${cilova}: pořadí ${p.platne}, vadných ${vadne}, stupňů ${p.polygony.length}/${k.n - 1}, plocha ${soucet.toFixed(3)} / ${ocekavana.toFixed(3)}, nejužší ${k.nejuzsi?.toFixed(3)}`);
                }
            }
        }
    }
}
console.log(`   ${geoChyb ? 'CHYBA' : 'OK  '} zabíhající stupně: ${geoPripadu} kombinací bez překřížených a prázdných stupňů, plocha sedí, pod 130 mm v nejužším místě upozorní`);
chyb += geoChyb;

const lz = Kalkulacka.spocitej({ tvar: 'Lz' }), lPod = Kalkulacka.spocitej({ tvar: 'L' });
const uz = Kalkulacka.spocitej({ tvar: 'Uz' }), uPod = Kalkulacka.spocitej({ tvar: 'U' });
const zabihaOk = lz.nejuzsiOk && uz.nejuzsiOk && lz.nejuzsi >= 0.15 - 1e-9
    && lz.pudorys.delka + lz.pudorys.sirka < lPod.pudorys.delka + lPod.pudorys.sirka && uz.pudorys.delka < uPod.pudorys.delka;
console.log(`   ${zabihaOk ? 'OK  ' : 'CHYBA'} výchozí zabíhající: nejužší L ${(lz.nejuzsi * 1000).toFixed(0)} mm, U ${(uz.nejuzsi * 1000).toFixed(0)} mm; půdorys L ${lz.pudorys.delka.toFixed(2)} × ${lz.pudorys.sirka.toFixed(2)} (s odpočívadlem ${lPod.pudorys.delka.toFixed(2)} × ${lPod.pudorys.sirka.toFixed(2)}), U ${uz.pudorys.delka.toFixed(2)} × ${uz.pudorys.sirka.toFixed(2)} (${uPod.pudorys.delka.toFixed(2)} × ${uPod.pudorys.sirka.toFixed(2)})`);
if (!zabihaOk) chyb++;

// Točité: průměr 1,6 m na 2,90 m nesplní podchodnou výšku, 2 m ano; výstupní čára 0,6 m od středu
const t16 = Kalkulacka.spocitej({ tvar: 'tocite', prumer: 1.6 }), t20 = Kalkulacka.spocitej({ tvar: 'tocite', prumer: 2.0 });
const toc = !t16.podchodOk && t20.podchodOk && Math.abs(t20.pudorys.delka - 2) < 1e-9 && t20.pudorys.polygony.length === t20.n - 1
    && Math.abs(t20.otacka - 2 * Math.PI * 0.6 / t20.b) < 1e-9 && t20.pudorys.polygony.every((o) => plocha(o.body) > 0.02);
console.log(`   ${toc ? 'OK  ' : 'CHYBA'} točité: ø 1,6 m podchod ${t16.podchod.toFixed(2)} m (málo), ø 2 m ${t20.podchod.toFixed(2)} m, ${t20.otacka.toFixed(1)} stupně na otáčku`);
if (!toc) chyb++;

// Široké rameno na málo stupňů: zatáčka se nevejde, kalkulačka to řekne a nespadne
const siroke = Kalkulacka.spocitej({ tvar: 'Uz', sirka: 2.5, vyska: 2.0, cilova: 0.21 });
const sirokeOk = siroke.nelze && siroke.nejuzsi === null && siroke.pudorys.polygony.length > 0;
console.log(`   ${sirokeOk ? 'OK  ' : 'CHYBA'} rameno 2,5 m do U na 2 m výšky: zatáčka se nevejde, upozornění`);
if (!sirokeOk) chyb++;

console.log(chyb ? `\nCHYBY: ${chyb} z ${pripadu} případů` : `\nVše v pořádku, ${pripadu} případů shodných s editorem`);
process.exit(chyb ? 1 : 0);
