/**
 * Měření nad SKUTEČNÝM vstupem uživatele — kalibrace i obkreslený obvod se
 * berou z popisného JSONu nahraného výkresu, ne z odhadu.
 *
 * Testy, které si obrys odhadují samy, měří něco jiného, než co vidí uživatel.
 *
 * Spuštění:
 *   node services/import-test/test-realny.cjs <svg> <popis.json> [strana]
 */
const fs = require('fs');
const { nactiAnalyzu } = require('./nacti-analyzu.cjs');

const A = nactiAnalyzu();

/** Dvojice stěn na jedné ose, které dělí jen mezera velikosti otvoru. */
function najdiPreruseni(steny, mnb, maxMezeraM = 3.2) {
    const nalezy = [];
    for (let i = 0; i < steny.length; i++) {
        for (let j = i + 1; j < steny.length; j++) {
            const a = steny[i], b = steny[j];
            if (Math.abs(a.tloustka - b.tloustka) > 0.08) continue;
            let rozdil = Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
            if (rozdil > 3 * Math.PI / 180) continue;

            const dx = a.x2 - a.x1, dy = a.y2 - a.y1, L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;
            const odsazeni = Math.max(
                Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny),
                Math.abs((b.x2 - a.x1) * nx + (b.y2 - a.y1) * ny));
            if (odsazeni > (a.tloustka / mnb) / 2) continue;

            const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / L;
            const bt1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
            const bt2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
            const mezera = bt1 > L ? bt1 - L : (bt2 < 0 ? -bt2 : 0);
            if (mezera <= 0 || mezera * mnb > maxMezeraM) continue;
            nalezy.push({ mezeraM: mezera * mnb });
        }
    }
    return nalezy;
}

/** Kolik stěn se překrývá s jinou (na jednom místě má být jedna zeď). */
function merPrekryvy(steny, mnb) {
    let pocet = 0;
    for (let i = 0; i < steny.length; i++) {
        const a = steny[i];
        const dx = a.x2 - a.x1, dy = a.y2 - a.y1, L = Math.hypot(dx, dy) || 1;
        const nx = -dy / L, ny = dx / L;
        let prekryv = false;
        for (let j = 0; j < steny.length && !prekryv; j++) {
            if (i === j) continue;
            const b = steny[j];
            let uhel = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
            if (uhel > Math.PI / 2) uhel = Math.PI - uhel;
            if (uhel > 10 * Math.PI / 180) continue;
            if (Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny) * mnb > (a.tloustka + b.tloustka) / 2) continue;
            const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / (L * L);
            const t1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
            const t2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
            if (Math.min(t2, 1) - Math.max(t1, 0) > 0.15) prekryv = true;
        }
        if (prekryv) pocet++;
    }
    return pocet;
}

/**
 * Kolik NAKRESLENÉ zdi se cestou ztratilo.
 *
 * Bere syrové vyplněné plochy (to, co je ve výkrese opravdu nakresleno jako
 * zeď) a ptá se, kolik jejich délky nepokrývá žádná výsledná stěna. Zeď, která
 * u dveří celá vypadla, se v počtu "přerušení" neprojeví — chybí totiž obě
 * strany dvojice. Tohle ji odhalí.
 */
function merZtraty(steny, syrove, mnb, obrys) {
    let celkem = 0, chybi = 0;
    const useky = [];
    for (const r of syrove) {
        const dx = r.x2 - r.x1, dy = r.y2 - r.y1, L = Math.hypot(dx, dy);
        if (L * mnb < 0.4) continue;
        // jen to, co je uvnitř obkresleného domu — legenda a výpis překladů
        // jsou taky vyplněné plochy, ale zeď to není
        if (obrys && !A.vPolygonu((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, obrys)) continue;
        celkem += L * mnb;
        const kroku = Math.max(4, Math.round(L * mnb / 0.1));
        let ztraceno = 0;
        for (let i = 0; i < kroku; i++) {
            const t = (i + 0.5) / kroku;
            const px = r.x1 + dx * t, py = r.y1 + dy * t;
            const kryto = steny.some(s => {
                const sdx = s.x2 - s.x1, sdy = s.y2 - s.y1;
                const sL2 = sdx * sdx + sdy * sdy || 1;
                let u = ((px - s.x1) * sdx + (py - s.y1) * sdy) / sL2;
                if (u < -0.02 || u > 1.02) return false;
                u = Math.max(0, Math.min(1, u));
                return Math.hypot(s.x1 + sdx * u - px, s.y1 + sdy * u - py) < (s.tloustka / mnb) / 2 + 0.1 / mnb;
            });
            if (!kryto) ztraceno++;
        }
        const ztracenoM = L * mnb * (ztraceno / kroku);
        chybi += ztracenoM;
        if (ztracenoM > 0.5) useky.push({ delkaM: L * mnb, ztracenoM, tl: r.tloustka });
    }
    useky.sort((a, b) => b.ztracenoM - a.ztracenoM);
    return { celkem, chybi, useky };
}

const [svgSoubor, popisSoubor, stranaArg] = process.argv.slice(2);
if (!svgSoubor || !popisSoubor) { console.error('Zadejte: <svg> <popis.json> [strana]'); process.exit(1); }

const popis = JSON.parse(fs.readFileSync(popisSoubor, 'utf8'));
const strana = stranaArg || Object.keys(popis.strany || {})[0] || '1';
const ulozeno = (popis.strany || {})[strana];
if (!ulozeno?.obrys || !ulozeno?.kalibBody) { console.error('Výkres nemá uloženou kalibraci ani obrys.'); process.exit(1); }

// měřítko z kalibrace uživatele: metrů na bod PDF
const [b1, b2] = ulozeno.kalibBody;
const vzdalenostBodu = Math.hypot(b2[0] - b1[0], b2[1] - b1[1]);
const mnb = (ulozeno.kalibMm / 1000) / vzdalenostBodu;

const svg = fs.readFileSync(svgSoubor, 'utf8');
const usecky = A.extrahujUsecky(svg);
const obrys = ulozeno.obrys;

console.log(`${popis.nazev} · strana ${strana}`);
console.log(`kalibrace ${ulozeno.kalibMm} mm / ${vzdalenostBodu.toFixed(1)} bodů → měřítko 1:${Math.round(mnb / 0.0003528)}`);
console.log(`obrys uživatele: ${obrys.length} bodů\n`);

const { varianty } = A.navrhniVarianty(svg, { metryNaBod: mnb, obrys, maxVariant: 4 });
varianty.forEach((v, i) => {
    const p = najdiPreruseni(v.osy, mnb);
    const prekryvy = merPrekryvy(v.osy, mnb);
    const uhly = v.osy.map(o => { const a = ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI) % 90 + 90) % 90; return Math.min(a, 90 - a); });
    console.log(`${i + 1}. ${v.styl.slice(0, 32).padEnd(34)} stěn=${String(v.osy.length).padStart(3)} délka=${v.delka.toFixed(0).padStart(3)}m`
        + ` | přerušeno v otvoru: ${p.length}` + (p.length ? ' (' + p.map(x => x.mezeraM.toFixed(2)).join(', ') + ' m)' : '')
        + ` | překryvy: ${prekryvy}`
        + ` | mimo pravý úhel: ${uhly.filter(a => a > 0.5).length} (max ${Math.max(...uhly, 0).toFixed(1)}°)`);
});

// kolik nakreslené zdi chybí ve vítězné variantě
const syrove = A.stenyZVyplni(usecky, { metryNaBod: mnb });
const z = merZtraty(varianty[0].osy, syrove, mnb, obrys);
console.log(`
nakresleno jako zeď: ${z.celkem.toFixed(0)} m · nepokryto výslednými stěnami: ${z.chybi.toFixed(1)} m`
    + ` (${(z.chybi / z.celkem * 100).toFixed(0)} %)`);
for (const u of z.useky.slice(0, 10)) {
    console.log(`   úsek ${u.delkaM.toFixed(2)} m (tl ${u.tl.toFixed(2)}) → chybí ${u.ztracenoM.toFixed(2)} m`);
}
