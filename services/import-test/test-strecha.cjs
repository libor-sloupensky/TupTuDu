/**
 * Geometrie střechy bez prohlížeče: obdélník, L, vlastní sklon, přesah a výška okapu hrany.
 *
 * Spuštění: node services/import-test/test-strecha.cjs
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
// package.json má type module, soubor se proto nenačítá přes require
const okno = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../public/js/koncept-v3/strecha.js'), 'utf8'), { window: okno, module: undefined });
const Strecha = okno.Strecha;

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const blizko = (a, b, tol = 1e-3) => Math.abs(a - b) <= tol;

/** Hrany obdélníku w × h, x doprava, y dolů; po směru plátna. */
const hranyZ = (body, typy) => body.map((a, i) => ({ a, b: body[(i + 1) % body.length], typ: typy[i].typ || typy[i], sklon: typy[i].sklon || 30, presah: typy[i].presah, zOkap: typy[i].zOkap, index: i, klic: 'h' + i }));
const OBD = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 6 }, { x: 0, y: 6 }];
const NAST = { zOkap: 3, presah: 0.5, presahStit: 0.2, sklon: 30 };
const obalka = (v) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const pl of v.plochy) for (const t of pl.troj) for (const b of t) { x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x); y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y); }
    return { x0, x1, y0, y1 };
};
const zPlochy = (v, x, y) => Strecha.vyskaVBode(v.plochy, x, y);
const tg = (s) => Math.tan(s * Math.PI / 180);

console.log('Sedlová, obdélník');
let v = Strecha.vypocet(hranyZ(OBD, ['okap', 'stit', 'okap', 'stit']), NAST);
kontrola('hřeben ve středu', blizko(v.zMax, 3 + 3 * tg(30)), v.zMax.toFixed(3));
kontrola('přesahy: okap 50 cm, štít 20 cm', blizko(obalka(v).y0, -0.5) && blizko(obalka(v).x0, -0.2) && blizko(obalka(v).x1, 10.2), JSON.stringify(obalka(v)));
kontrola('líc v zadané výšce', blizko(zPlochy(v, 5, 0), 3), String(zPlochy(v, 5, 0)));
kontrola('štít jen mezi nárožími domu', v.stity.every(s => s.troj.every(t => t.every(b => b.y >= -1e-6 && b.y <= 6 + 1e-6))), '');

console.log('Rozdílné sklony (bez vlastního přesahu zůstává spodní hrana okapů stejně vysoko)');
v = Strecha.vypocet(hranyZ(OBD, [{ typ: 'okap', sklon: 50 }, 'stit', { typ: 'okap', sklon: 25 }, 'stit']), NAST);
const spodekA = zPlochy(v, 5, obalka(v).y0 + 1e-3), spodekB = zPlochy(v, 5, obalka(v).y1 - 1e-3);
kontrola('spodek obou okapů stejně', blizko(spodekA, spodekB, 0.01), [spodekA, spodekB].map(x => x.toFixed(3)).join(' / '));
kontrola('líc v zadané výšce na obou stranách', blizko(zPlochy(v, 5, 0), 3, 0.002) && blizko(zPlochy(v, 5, 6), 3, 0.002));

console.log('Vlastní přesah a výška okapu hrany');
v = Strecha.vypocet(hranyZ(OBD, [{ typ: 'okap', sklon: 30, presah: 1.2 }, { typ: 'stit', presah: 0.6 }, { typ: 'okap', sklon: 30, zOkap: 2.2, presah: 0.3 }, { typ: 'stit', presah: 0 }]), NAST);
let o = obalka(v);
kontrola('každá hrana má svůj přesah', blizko(o.y0, -1.2) && blizko(o.x1, 10.6) && blizko(o.y1, 6.3) && blizko(o.x0, 0), JSON.stringify(o));
kontrola('líc horní strany ve výšce 3,0', blizko(zPlochy(v, 5, 0), 3, 0.002), String(zPlochy(v, 5, 0)));
kontrola('líc dolní strany ve výšce 2,2', blizko(zPlochy(v, 5, 6), 2.2, 0.002), String(zPlochy(v, 5, 6)));
kontrola('nižší okap je v zOkapMin', blizko(v.zOkapMin, 2.2));
const hreben = (6 - (3 - 2.2) / tg(30)) / 2;   // kde se roviny potkají
kontrola('hřeben se posune k vyšší straně', blizko(zPlochy(v, 5, hreben), 3 + hreben * tg(30), 0.01) && blizko(v.zMax, 3 + hreben * tg(30), 0.01), v.zMax.toFixed(3));

console.log('Valbová s různými výškami okapů');
v = Strecha.vypocet(hranyZ(OBD, [{ typ: 'okap', sklon: 35, zOkap: 3.6 }, { typ: 'okap', sklon: 35 }, { typ: 'okap', sklon: 35, zOkap: 2.6 }, { typ: 'okap', sklon: 35 }]), { ...NAST, presah: 0.4, sklon: 35 });
o = obalka(v);
kontrola('v půdorysu zůstává v okrajích', o.x0 > -0.45 && o.x1 < 10.45 && o.y0 > -0.45 && o.y1 < 6.45, JSON.stringify(o));
let shoda = true;
for (let x = 0.5; x < 10; x += 1) for (let y = 0.5; y < 6; y += 0.7) {
    const rov = Math.min(3.6 + y * tg(35), 2.6 + (6 - y) * tg(35), 3 + x * tg(35), 3 + (10 - x) * tg(35));
    const z = zPlochy(v, x, y);
    if (z === null || !blizko(z, rov, 0.01)) shoda = false;
}
kontrola('plocha odpovídá nejnižší ze čtyř rovin', shoda);

console.log('Půdorys do L, stejné hodnoty i různá výška');
const EL = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 4 }, { x: 0, y: 4 }];
const VSE = (m) => EL.map(() => ({ typ: 'okap', sklon: 30, ...m }));
v = Strecha.vypocet(hranyZ(EL, VSE({})), NAST);
kontrola('L stejné: spočítá se a pokryje vnitřek', zPlochy(v, 3, 2) !== null && zPlochy(v, 8, 6) !== null && blizko(zPlochy(v, 3, 2), 3 + 2 * tg(30), 0.01));
const ruzne = VSE({}); ruzne[0] = { typ: 'okap', sklon: 30, zOkap: 3.5 };
v = Strecha.vypocet(hranyZ(EL, ruzne), NAST);
o = obalka(v);
kontrola('L s vyšší hranou: vnitřek pokrytý, půdorys v mezích', zPlochy(v, 3, 2) !== null && zPlochy(v, 8, 6) !== null && o.x1 < 10.51 && o.y0 > -0.51, JSON.stringify(o));
const vnejsi = v.plochy.some(pl => pl.troj.some(t => t.some(b => b.x < 5.4 && b.y > 4.6)));
kontrola('L: nic nezasahuje do vnějšího rohu', !vnejsi);

console.log('Obrys z rastru: zbytek v rohu natočeného domu není hrana');
const PX = 80;
const uhel = 30 * Math.PI / 180;
const otoc = (x, y) => ({ x: (x * Math.cos(uhel) - y * Math.sin(uhel)) * PX, y: (x * Math.sin(uhel) + y * Math.cos(uhel)) * PX });
const engineZ = (useky) => {
    const steny = new Map(useky.map(([a, b], i) => ['W' + i, { id: 'W' + i, a, b }]));
    return {
        PX_PER_M: PX,
        walls: steny,
        rozsahLice: () => ({ od: 0, do: 1 }),
        bodNaLici: (id, s, strana) => {
            if (strana !== 1) return null;
            const w = steny.get(id);
            return { x: w.a.x + (w.b.x - w.a.x) * s, y: w.a.y + (w.b.y - w.a.y) * s };
        },
    };
};
const rohy = [otoc(0, 0), otoc(10, 0), otoc(10, 6), otoc(0, 6)];
const steny = engineZ(rohy.map((a, i) => [a, rohy[(i + 1) % 4]]));
// Roh seříznutý tětivou 26 cm, jak ho nechá zjednodušení rastru (případ z domu Klemov)
const seriznuty = [otoc(0, 0), otoc(10, 0), otoc(9.98, 5.97), otoc(9.72, 6), otoc(0, 6)];
let hr = Strecha.hranyObrysu(seriznuty, steny);
kontrola('natočený obdélník má čtyři hrany', hr.length === 4, hr.map(h => h.klic).join(' '));
kontrola('všechny patří stěnám', hr.every(h => /^W/.test(h.klic)));
const seznam = hr.map(h => h.a);
kontrola('roh leží na průsečíku stěn', seznam.some(b => Math.hypot(b.x - rohy[2].x, b.y - rohy[2].y) < 0.1), JSON.stringify(seznam));
// Skutečný schod 10 cm mezi rovnoběžnými stěnami zůstává
const schod = [otoc(0, 0), otoc(10, 0), otoc(10, 3), otoc(10.1, 3), otoc(10.1, 6), otoc(0, 6)];
const stenySchod = engineZ([[schod[0], schod[1]], [schod[1], schod[2]], [schod[3], schod[4]], [schod[4], schod[5]], [schod[5], schod[0]]]);
hr = Strecha.hranyObrysu(schod, stenySchod);
kontrola('schod mezi rovnoběžnými stěnami zůstává', hr.length === 6, hr.map(h => h.klic).join(' '));

console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
