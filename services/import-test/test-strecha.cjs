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
const zHorni = 3 + (1.2 - 0.5) * tg(30);   // vlastní přesah bez vlastní výšky: okap zůstává ve výšce ostatních
kontrola('líc horní strany se posune, okap drží výšku', blizko(zPlochy(v, 5, 0), zHorni, 0.002), String(zPlochy(v, 5, 0)));
kontrola('líc dolní strany ve vlastní výšce 2,2', blizko(zPlochy(v, 5, 6), 2.2, 0.002), String(zPlochy(v, 5, 6)));
kontrola('nižší okap je v zOkapMin', blizko(v.zOkapMin, 2.2));
const hreben = (6 - (zHorni - 2.2) / tg(30)) / 2;   // kde se roviny potkají
kontrola('hřeben se posune k vyšší straně', blizko(zPlochy(v, 5, hreben), zHorni + hreben * tg(30), 0.01) && blizko(v.zMax, zHorni + hreben * tg(30), 0.01), v.zMax.toFixed(3));

console.log('Valbová s různými přesahy a sklony: okapy v jedné výšce, v rohu žádný zub');
v = Strecha.vypocet(hranyZ(OBD, [{ typ: 'okap', sklon: 30 }, { typ: 'okap', sklon: 30, presah: 0.3 }, { typ: 'okap', sklon: 30 }, { typ: 'okap', sklon: 60, presah: 0.4 }]), NAST);
const spodek = 3 - 0.5 * tg(30);
const okrajV = v.okraj;
let zubu = 0, nejdal = 0;
okrajV.forEach((a, i) => {
    const b = okrajV[(i + 1) % okrajV.length];
    // Těsně uvnitř obvodu: plocha musí být všude ve výšce okapu, zub by tu byl níž nebo výš
    for (let k = 0.02; k < 1; k += 0.01) {
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
        const z = zPlochy(v, a.x + dx * k - dy / L * 1e-4, a.y + dy * k + dx / L * 1e-4);
        if (z === null) continue;
        nejdal = Math.max(nejdal, Math.abs(z - spodek));
        if (Math.abs(z - spodek) > 0.005) zubu++;
    }
});
kontrola('celý obvod střechy ve výšce okapu', zubu === 0, `nejvíc ${nejdal.toFixed(4)} m od ${spodek.toFixed(3)} m`);
o = obalka(v);
kontrola('přesahy zůstávají přesně podle zadání', blizko(o.x1, 10.3) && blizko(o.x0, -0.4) && blizko(o.y0, -0.5) && blizko(o.y1, 6.5), JSON.stringify(o));
kontrola('nic se neořezává, všechny hrany začínají ve stejné výšce', blizko(v.zStart, spodek));
const hranyV = Strecha.parametryHran(hranyZ(OBD, [{ typ: 'okap', sklon: 30 }, { typ: 'okap', sklon: 30, presah: 0.3 }, { typ: 'okap', sklon: 30, zOkap: 2.4, presah: 0.3 }, { typ: 'stit' }]), NAST);
kontrola('hrana s přesahem bez vlastní výšky drží okap ve výšce ostatních', blizko(hranyV[1].spodek, spodek));
kontrola('hrana s vlastní výškou si ji nechá', blizko(hranyV[2].z, 2.4) && blizko(hranyV[2].spodek, 2.4 - 0.3 * tg(30)));
kontrola('bez vlastního přesahu rovina prochází lícem ve výšce celku', blizko(hranyV[0].z, 3));

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

console.log('Schod na dlouhé straně: střecha bez díry (dřív zmizela plocha i v širší části)');
{
    // Užší část 4 m vpravo, širší 5 m vlevo, schod 1 m
    const SCHOD = [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 5 }, { x: 0, y: 5 }];
    const ROVNE = { zOkap: 3, presah: 0, presahStit: 0, sklon: 30 };
    const pokryto = (v) => {
        let s = 0;
        for (const p of v.plochy) for (const t of p.troj) s += Math.abs(Strecha.plochaPolygonu(t));
        return { s, okraj: Math.abs(Strecha.plochaPolygonu(v.okraj)) };
    };
    for (const [popis, typy] of [
        ['sedlová, schod jako štít', ['okap', 'stit', 'okap', 'stit', 'okap', 'stit']],
        ['sedlová, schod jako okap', ['okap', 'stit', 'okap', 'okap', 'okap', 'stit']],
        ['valbová', Array(6).fill('okap')],
    ]) {
        const v = Strecha.vypocet(hranyZ(SCHOD, typy), ROVNE);
        const { s, okraj } = pokryto(v);
        kontrola(`${popis}: střecha kryje celý půdorys`, blizko(s, okraj), `${s.toFixed(2)} z ${okraj.toFixed(2)} m²`);
    }
    const v = Strecha.vypocet(hranyZ(SCHOD, ['okap', 'stit', 'okap', 'stit', 'okap', 'stit']), ROVNE);
    kontrola('širší část má hřeben výš', blizko(zPlochy(v, 3, 2.5), 3 + 2.5 * tg(30)) && blizko(zPlochy(v, 9, 2), 3 + 2 * tg(30)),
        `${zPlochy(v, 3, 2.5).toFixed(3)} / ${zPlochy(v, 9, 2).toFixed(3)}`);
    const vodorovne = v.hrebeny.filter(h => blizko(h[0].z, h[1].z) && h[0].z > 3.5);
    kontrola('hřeben v obou částech', vodorovne.some(h => blizko(h[0].y, 2)) && vodorovne.some(h => blizko(h[0].y, 2.5)), String(vodorovne.length));
    // Předvolba: krátký schod mezi okapy stejného směru je okap, konce domu zůstávají štíty
    const t = Strecha.typyHran({ typ: 'sedlova' }, SCHOD.map((a, i) => ({ a, b: SCHOD[(i + 1) % 6], klic: 'h' + i })));
    kontrola('sedlová předvolba: schod je okap, konce štíty', t.map(h => h.typ).join(',') === 'okap,stit,okap,okap,okap,stit', t.map(h => h.typ).join(','));
    const rucne = Strecha.typyHran({ typ: 'sedlova', hrany: { h3: { typ: 'stit' } } }, SCHOD.map((a, i) => ({ a, b: SCHOD[(i + 1) % 6], klic: 'h' + i })));
    kontrola('ruční štít na schodu má přednost', rucne[3].typ === 'stit', rucne[3].typ);
}

console.log('Nižší střecha: garáž u zdi patra (Libor 12. 11. 2026)');
{
    // Garáž 4 × 6 m vpravo od domu, zeď patra vlevo (x = 0)
    const G = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 6 }, { x: 0, y: 6 }];
    const hrG = G.map((a, i) => ({ a, b: G[(i + 1) % 4], klic: i === 3 ? 'zed3' : 'W' + i + ':1', zed: i === 3 }));
    let t = Strecha.typyHranNizsi({ typ: 'pultova', sklon: 10 }, hrG);
    kontrola('pultová: okap naproti zdi, boky štíty, u zdi štít bez přesahu', t.map(h => h.typ).join(',') === 'stit,okap,stit,stit' && t[3].presah === 0, t.map(h => h.typ + (h.presah ?? '')).join(','));
    let v = Strecha.vypocet(t, { zOkap: 3, presah: 0.3, presahStit: 0.1, sklon: 10 });
    kontrola('stoupá od okapu ke zdi patra', blizko(zPlochy(v, 3.99, 3), 3, 0.01) && blizko(zPlochy(v, 0.01, 3), 3 + 4 * tg(10), 0.01), `${zPlochy(v, 3.99, 3)?.toFixed(3)} / ${zPlochy(v, 0.01, 3)?.toFixed(3)}`);
    kontrola('u zdi patra střecha končí v líci (bez přesahu)', blizko(obalka(v).x0, 0) && blizko(obalka(v).x1, 4.3), JSON.stringify(obalka(v)));
    t = Strecha.typyHranNizsi({ typ: 'sedlova', sklon: 30 }, hrG);
    kontrola('sedlová: hřeben kolmo ke zdi, štít naproti zdi', t.map(h => h.typ).join(',') === 'okap,stit,okap,stit', t.map(h => h.typ).join(','));
    t = Strecha.typyHranNizsi({ typ: 'sedlova', sklon: 30, otocHreben: true }, hrG);
    kontrola('sedlová otočená: okap souběžně se zdí', t.map(h => h.typ).join(',') === 'stit,okap,stit,stit', t.map(h => h.typ).join(','));
    t = Strecha.typyHranNizsi({ typ: 'valbova', sklon: 25 }, hrG);
    kontrola('valbová: okap všude kromě zdi', t.map(h => h.typ).join(',') === 'okap,okap,okap,stit', t.map(h => h.typ).join(','));
    t = Strecha.typyHranNizsi({ typ: 'pultova', sklon: 10, hrany: { 'W2:1': { typ: 'okap', sklon: 20 }, zed3: { typ: 'okap' } } }, hrG);
    kontrola('ruční hrana platí, zeď patra zůstává štítem', t[2].typ === 'okap' && t[2].sklon === 20 && t[3].typ === 'stit', t.map(h => h.typ).join(','));

    // Část do L kolem rohu domu: okapy na obou vnějších stranách, nároží z vnějšího rohu
    const L = [{ x: 8, y: 0 }, { x: 11, y: 0 }, { x: 11, y: 9 }, { x: 0, y: 9 }, { x: 0, y: 6 }, { x: 8, y: 6 }];
    const hrL = L.map((a, i) => ({ a, b: L[(i + 1) % 6], klic: 'h' + i, zed: i >= 4 }));
    t = Strecha.typyHranNizsi({ typ: 'pultova', sklon: 10 }, hrL);
    kontrola('L: okapy vpravo a dole, konce štíty', t.map(h => h.typ).join(',') === 'stit,okap,okap,stit,stit,stit', t.map(h => h.typ).join(','));
    v = Strecha.vypocet(t, { zOkap: 3, presah: 0.3, presahStit: 0.1, sklon: 10 });
    kontrola('L: u zdi patra v obou ramenech stejně vysoko', blizko(zPlochy(v, 8.01, 2), 3 + 3 * tg(10), 0.01) && blizko(zPlochy(v, 3, 6.01), 3 + 3 * tg(10), 0.01));

    // Samostatná část bez patra nad sebou: běžná pultová (okap na nejdelší hraně)
    t = Strecha.typyHranNizsi({ typ: 'pultova', sklon: 10 }, G.map((a, i) => ({ a, b: G[(i + 1) % 4], klic: 'h' + i })));
    kontrola('bez zdi patra: běžná pultová', t.filter(h => h.typ === 'okap').length === 1, t.map(h => h.typ).join(','));

    // Prstenec kolem patra: valbová přes celé podlaží, oříznutá obrysem patra
    const P = [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 10 }, { x: 0, y: 10 }];
    const U = [{ x: 3, y: 2 }, { x: 10, y: 2 }, { x: 10, y: 8 }, { x: 3, y: 8 }];
    t = Strecha.typyHranNizsi({ typ: 'pultova', sklon: 10 }, P.map((a, i) => ({ a, b: P[(i + 1) % 4], klic: 'h' + i })), U);
    kontrola('prstenec: všechny vnější hrany okapem (paprsek narazí na patro)', t.every(h => h.typ === 'okap'), t.map(h => h.typ).join(','));
    v = Strecha.vypocet(t, { zOkap: 3, presah: 0, presahStit: 0, sklon: 10 });
    const troj = v.plochy.flatMap(pl => Strecha.orizniMimo(pl.troj, U));
    let plocha = 0;
    for (const q of troj) plocha += Math.abs(Strecha.plochaPolygonu(q));
    kontrola('po ořezu zbývá jen prstenec', blizko(plocha, 120 - 42, 0.01), plocha.toFixed(3));
    kontrola('nic neleží uvnitř patra', troj.every(q => !Strecha.bodUvnitr({ x: (q[0].x + q[1].x + q[2].x) / 3, y: (q[0].y + q[1].y + q[2].y) / 3 }, U)));
    kontrola('výška ořezaných kusů leží v rovině', troj.every(q => q.every(b => blizko(Strecha.vyskaVBode(v.plochy, b.x, b.y), b.z, 0.005))));
    const hreb = Strecha.useckyMimo(v.hrebeny, U);
    kontrola('nároží zůstanou jen mimo patro', hreb.length && hreb.every(([a, b]) => !Strecha.bodUvnitr({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, U)), String(hreb.length));
    const oblast = Strecha.oblastBez(P, [U]);
    let po = 0;
    for (const d of oblast) po += Strecha.plochaPolygonu(d);
    kontrola('oblast terasy kolem patra', blizko(po, 78, 0.01), po.toFixed(3));

    // Dorovnání obrysu z rastru: zakulacené rohy zmizí, hrana u patra je zeď
    const zRastru = [{ x: 0.02, y: 0.01 }, { x: 3.9, y: 0.02 }, { x: 3.98, y: 0.08 }, { x: 4.01, y: 0.2 }, { x: 4.02, y: 5.85 }, { x: 3.95, y: 5.99 }, { x: 0.01, y: 6.02 }];
    const primky = [
        { a: { x: -5, y: 0 }, b: { x: 4, y: 0 }, klic: 'W1:1' }, { a: { x: 4, y: 0 }, b: { x: 4, y: 6 }, klic: 'W2:1' },
        { a: { x: 4, y: 6 }, b: { x: -5, y: 6 }, klic: 'W3:1' }, { a: { x: 0, y: -2 }, b: { x: 0, y: 8 }, zed: true },
    ];
    const d = Strecha.dorovnejObrys(zRastru, primky);
    kontrola('dorovnaný obrys má čtyři hrany přesně na lících', d.length === 4 && d.every(h => [h.a, h.b].every(b => [0, 4].includes(Math.round(b.x * 1000) / 1000) && [0, 6].includes(Math.round(b.y * 1000) / 1000))), JSON.stringify(d.map(h => [h.a, h.klic])));
    kontrola('hrana u patra je zeď, ostatní nesou klíč stěny', d.filter(h => h.zed).length === 1 && d.filter(h => !h.zed).every(h => /^W\d:1$/.test(h.klic)), d.map(h => h.klic).join(' '));
}

console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
process.exit(chyb ? 1 : 0);
