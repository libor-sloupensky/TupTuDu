/**
 * Obrázky z editoru do článků o domě: typy střech, barva fasády, minimální rozměry místností,
 * jak nakreslit půdorys a výpočet schodiště. Dům je kopie vzorového projektu (bez parcely a podkladu),
 * ložnice a chodby jsou nový koncept. Koncepty mají prefix ClaudeTest a na konci se smažou.
 *
 * Spuštění: node services/clanky/snimky-clanky-dum.cjs [článek …]   (bez argumentu všechny)
 *           články: typy-strech, barva-fasady, minimalni-rozmery-mistnosti, jak-nakreslit-pudorys-domu, vypocet-schodiste
 * Výstup:   public/img/clanky/{článek}/*.webp a .jpg (.jpg 1200 × 630 je náhled při sdílení)
 */
const S = require('./snimky-editor.cjs');

const sn = (t) => `window.__sn.${t}`;
const RAL = { 9016: '#F6F6F6', 7016: '#293133', 9001: '#FDF4E3', 8003: '#734222', 7035: '#D7D7D7', 9011: '#1C1C1C' };
const KRYTINA = { cervena: '#a8502f', antracit: '#3f4347', hneda: '#6d4c3b' };
const OG = [1200, 630];
// Směr kamery od domu: vodorovně (1, 1), výška podle sklonu pohledu
const smer = (stupnu, x = 1, z = 1) => [x, Math.tan(stupnu * Math.PI / 180) * Math.hypot(x, z), z];

/** Kopie vzorového domu ve 3D, střecha podle zadání. */
async function vzorovyDum(s, nazev) {
    await s.otevri(s.kopieVzoru(nazev));
    await s.do3d();
}

async function strecha(s, nast) {
    const prikazy = Object.entries(nast).map(([k, v]) => `d.setStrecha(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(' ');
    await s.js(`${prikazy} return true;`);
    await s.prestav3d();
}

async function typyStrech(s) {
    console.log('\nTypy střech');
    await vzorovyDum(s, 'snímky typy střech');
    const typy = [
        { typ: 'sedlova', sklon: 38, krytina: 'taska', barva: KRYTINA.cervena },
        { typ: 'valbova', sklon: 30, krytina: 'taska', barva: KRYTINA.cervena },
        { typ: 'pultova', sklon: 15, krytina: 'falc', barva: KRYTINA.antracit },
        { typ: 'plocha', sklon: 2, krytina: 'falc', barva: KRYTINA.antracit },
    ];
    // Pohled od zadní strany domu: přední má ustoupený vstup, nad kterým pultová střecha ukáže vnitřek stěny
    const POHLED = smer(30, -1, -1);
    // Jeden záběr pro všechny čtyři: obálka všech střech dohromady
    await s.js(`window.__vse = []; return true;`);
    for (const t of typy) {
        await strecha(s, { typ: t.typ, sklon: t.sklon, presah: 0.5, krytina: t.krytina, barva: t.barva });
        await s.js(`window.__vse.push(...${sn('body')}()); return true;`);
    }
    for (const [i, t] of typy.entries()) {
        await strecha(s, { typ: t.typ, sklon: t.sklon, presah: 0.5, krytina: t.krytina, barva: t.barva });
        if (i === 0) {
            // Náhled pro sdílení jen se sedlovou
            await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(POHLED)}, pomer: ${OG[0] / OG[1]}, okraj: 0.05 }); return true;`);
            await S.pauza(600);
            await s.js(`return ${sn('snimek')}('og', ${OG[0]}, ${OG[1]});`);
            await s.uloz('og', 'typy-strech', 'typy-strech', { webp: false });
            await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(POHLED)}, pomer: 597 / 398, okraj: 0.05, B: window.__vse }); return true;`);
        }
        await S.pauza(600);
        await s.js(`return ${sn('snimek')}('st${i}', 597, 398);`);
    }
    await s.js(`return ${sn('slozit')}('strechy', ['st0', 'st1', 'st2', 'st3'], 2);`);
    await s.uloz('strechy', 'typy-strech', 'typy-strech-porovnani', { jpg: false });

    // Sedlová 30° a 45° kolmo na štít, stejné měřítko (záběr podle vyšší)
    const osa = await s.js(`const u = e.smerRastru(); return [Math.sin(u), -Math.cos(u)];`);
    const pohled = [osa[0], Math.tan(4 * Math.PI / 180), osa[1]];
    await strecha(s, { typ: 'sedlova', sklon: 45, presah: 0.5, krytina: 'taska', barva: KRYTINA.cervena });
    await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(pohled)}, pomer: 597 / 500, okraj: 0.05 }); return true;`);
    await S.pauza(600);
    await s.js(`return ${sn('snimek')}('s45', 597, 500);`);
    await strecha(s, { sklon: 30 });
    await S.pauza(600);
    await s.js(`return ${sn('snimek')}('s30', 597, 500);`);
    await s.js(`return ${sn('slozit')}('sklony', ['s30', 's45'], 2);`);
    await s.uloz('sklony', 'typy-strech', 'sedlova-30-45', { jpg: false });
}

async function barvaFasady(s) {
    console.log('\nBarva fasády');
    await vzorovyDum(s, 'snímky barva fasády');
    const kombinace = [
        { fasada: RAL[9016], strecha: RAL[7016], okna: RAL[7016] },
        { fasada: RAL[9001], strecha: KRYTINA.cervena, okna: RAL[9016] },
        { fasada: '#D8C8A8', strecha: KRYTINA.hneda, okna: RAL[8003] },
        { fasada: RAL[7035], strecha: RAL[9011], okna: RAL[9016] },
    ];
    await strecha(s, { typ: 'sedlova', sklon: 38, presah: 0.5, krytina: 'taska' });
    for (const [i, k] of kombinace.entries()) {
        await s.js(`d.setBarvaDomu('fasada', '${k.fasada}'); d.setBarvaDomu('oknoVen', '${k.okna}'); d.setBarvaDomu('dvereVen', '${k.okna}'); d.setStrecha('barva', '${k.strecha}'); return true;`);
        await s.prestav3d();
        if (i === 0) {
            await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(20, 0.29, 0.96))}, pomer: ${OG[0] / OG[1]}, okraj: 0.05 }); return true;`);
            await S.pauza(600);
            await s.js(`return ${sn('snimek')}('og', ${OG[0]}, ${OG[1]});`);
            await s.uloz('og', 'barva-fasady', 'barva-fasady', { webp: false });
            await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(20, 0.29, 0.96))}, pomer: 597 / 398, okraj: 0.05 }); return true;`);
        }
        await S.pauza(600);
        await s.js(`return ${sn('snimek')}('b${i}', 597, 398);`);
    }
    await s.js(`return ${sn('slozit')}('barvy', ['b0', 'b1', 'b2', 'b3'], 2);`);
    await s.uloz('barvy', 'barva-fasady', 'barva-fasady-kombinace', { jpg: false });
}

/** Kus z katalogu v půdorysu: střed v metrech plátna (y dolů), úhel 0 = záda nahoru, vlastní rozměr. */
const kus = (id, x, y, uhel, sirka, hloubka) => `{ const p = d.katalog.polozky.find(q => q.id === '${id}'); const v = d._katalogZaznam(p, [${x}, ${-y}], ${uhel});
    ${sirka ? `v.sirka = ${sirka};` : ''} ${hloubka ? `v.hloubka = ${hloubka};` : ''} v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); e.vybaveni.push(v); }`;
const POSTEL = 'abo-B07H93GTMN', STOLEK = 'abo-B07RR3K7M8', SKRIN = 'abo-B07JGY5LPJ', BOTNIK = 'abo-B07GFS1R7X';

async function rozmeryMistnosti(s) {
    console.log('\nMinimální rozměry místností');
    await s.otevri(s.novy('snímky ložnice'));
    await s.jsA(`await d._katalogNacti(); return true;`);
    // Dvě ložnice vedle sebe, stěny 20 cm (osy o 10 cm za lícem): vlevo světle 3,00 × 3,00 m, vpravo 3,00 × 4,00 m
    await s.js(`const W = (x1, y1, x2, y2, typ = 'obvodova') => e.addWall(x1 * X, y1 * X, x2 * X, y2 * X, 0.2, typ);
        const horniA = W(-0.1, -0.1, 3.1, -0.1), horniB = W(3.1, -0.1, 6.3, -0.1);
        const levaA = W(-0.1, -0.1, -0.1, 3.1), dolniA = W(-0.1, 3.1, 3.1, 3.1);
        W(3.1, -0.1, 3.1, 3.1, 'pricka'); W(3.1, 3.1, 3.1, 4.1);
        const pravaB = W(6.3, -0.1, 6.3, 4.1), dolniB = W(3.1, 4.1, 6.3, 4.1);
        e.addOpening(dolniA.id, 2.0, 0.8, 'dvere', { presnaSirka: true, strana: 'out' });
        e.addOpening(dolniB.id, 2.15, 0.8, 'dvere', { presnaSirka: true, strana: 'out' });
        e.addOpening(levaA.id, 1.0, 1.2, 'okno', { presnaSirka: true });
        e.addOpening(pravaB.id, 1.5, 1.2, 'okno', { presnaSirka: true });
        ${kus(POSTEL, 1.5, 1.05, 0, 1.65, 2.10)} ${kus(STOLEK, 0.45, 0.19, 0)} ${kus(STOLEK, 2.55, 0.19, 0)}
        ${kus(POSTEL, 4.7, 1.05, 0, 1.65, 2.10)} ${kus(STOLEK, 3.65, 0.19, 0)} ${kus(STOLEK, 5.75, 0.19, 0)}
        ${kus(SKRIN, 3.2 + 1.83 / 2, 3.7, 180)}
        d.showGrid = false; d.toggleGrid(); d.showKoty = true; d.toggleKoty(); d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Ložnice'); return true;`);
    await S.pauza(1500);
    const mistnosti = await s.js(`d.renderer.render(); const out = [];
        for (const [x, y] of [[1.5, 2.5], [4.7, 2.5]]) { const id = d.renderer.mistnostVBode(x * X, y * X); const m = e.najdiMistnost(id); if (m) { e.nastavDruhMistnosti(m, 'loznice'); m.nazev = 'Ložnice'; delete m.auto; m.podlaha = { dekor: 'prkna' }; } out.push({ id, plocha: d.renderer.plochaMistnosti(id) }); }
        d.setBarvaDomu('fasada', '#e8e2d6'); d.renderer._mistnostiCache = null; d.renderer.render(); return out;`);
    // Popisky do volného místa u nohou postelí (nábytek se kreslí přes ně)
    await s.js(`${sn('popisky')}({ '${mistnosti[0].id}': [1.15, 2.55], '${mistnosti[1].id}': [4.7, 2.75] }); return true;`);
    console.log('   místnosti', JSON.stringify(mistnosti));
    // Kontrola vzdáleností z modelu: u nohou postele, mezi postelí a skříní, po stranách postele
    const miry = await s.js(`const v = e.vybaveni; const y = (k) => k.polygon.map(q => -q[1]); const x = (k) => k.polygon.map(q => q[0]);
        const [pA, , , pB, , , sk] = v; return { nohyA: 3 - Math.max(...y(pA)), mezi: Math.min(...y(sk)) - Math.max(...y(pB)), bokA: Math.min(...x(pA)), postel: [pA.sirka, pA.hloubka], skrin: [sk.sirka, sk.hloubka] };`);
    console.log('   míry', JSON.stringify(miry));
    const r = await s.js(`return ${sn('plan')}('plan');`);
    console.log('   půdorys', JSON.stringify(r));
    await s.js(`const o = ${sn('obalka')}('plan'); const k = 24; const w = o.x1 - o.x0 + 2 * k, h = o.y1 - o.y0 + 2 * k; const W = 1200, H = Math.round(W * h / w);
        return ${sn('vyrez')}('plan2', 'plan', o.x0 - k, o.y0 - k, w, h, W, H);`);
    await s.uloz('plan2', 'minimalni-rozmery-mistnosti', 'loznice-pudorys', { jpg: false, kvalitaWebp: 0.9 });

    // Ložnice 3 × 4 m ve 3D šikmo shora
    await s.do3d();
    const B = `${sn('body')}().filter(b => b.x > 3.05 && b.x < 6.45 && b.z > -0.15 && b.z < 4.2)`;
    await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(72, 1, 0.1))}, pomer: 1200 / 700, okraj: 0.04, B: ${B} }); return true;`);
    await S.pauza(800);
    await s.js(`return ${sn('snimek')}('loz3d', 1200, 700);`);
    await s.uloz('loz3d', 'minimalni-rozmery-mistnosti', 'loznice-3x4-3d', { jpg: false });
    await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(72, 1, 0.1))}, pomer: ${OG[0] / OG[1]}, okraj: 0.04, B: ${B} }); return true;`);
    await S.pauza(800);
    await s.js(`return ${sn('snimek')}('og', ${OG[0]}, ${OG[1]});`);
    await s.uloz('og', 'minimalni-rozmery-mistnosti', 'minimalni-rozmery-mistnosti', { webp: false });
    return { mistnosti, miry };
}

async function chodby(s) {
    console.log('\nChodby 90 a 120 cm');
    await s.otevri(s.novy('snímky chodby'));
    await s.jsA(`await d._katalogNacti(); return true;`);
    // Dvě chodby nad sebou, dlouhé 3 m, světle 0,90 a 1,20 m, stěny 20 cm; botník hluboký 30 cm jen v širší
    await s.js(`const W = (x1, y1, x2, y2, typ = 'obvodova') => e.addWall(x1 * X, y1 * X, x2 * X, y2 * X, 0.2, typ);
        const horni = W(-0.1, -0.1, 3.1, -0.1); W(3.1, -0.1, 3.1, 1.0); W(3.1, 1.0, 3.1, 2.4); const dolni = W(-0.1, 2.4, 3.1, 2.4);
        W(-0.1, 2.4, -0.1, 1.0); W(-0.1, 1.0, -0.1, -0.1);
        // Střední stěna ze dvou půlek od krajů: z obou stran pak vznikne stejné napojení do T
        W(-0.1, 1.0, 1.5, 1.0); W(3.1, 1.0, 1.5, 1.0);
        e.addOpening(horni.id, 2.1, 0.8, 'dvere', { presnaSirka: true, strana: 'out' }); e.addOpening(dolni.id, 2.1, 0.8, 'dvere', { presnaSirka: true });
        ${kus(BOTNIK, 1.2, 2.3 - 0.15, 180, 0.75, 0.30)}
        d.showGrid = false; d.toggleGrid(); d.showKoty = true; d.toggleKoty(); d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Chodby'); return true;`);
    await S.pauza(1500);
    const ids = await s.js(`d.renderer.render(); const out = []; for (const [x, y] of [[1.5, 0.45], [1.5, 1.4]]) { const id = d.renderer.mistnostVBode(x * X, y * X); const m = e.najdiMistnost(id); if (m) { e.nastavDruhMistnosti(m, 'chodba'); m.nazev = 'Chodba'; delete m.auto; } out.push(id); }
        d.renderer._mistnostiCache = null; d.renderer.render(); return out;`);
    await s.js(`${sn('popisky')}({ '${ids[1]}': [1.9, 1.6] }); return true;`);
    await s.js(`return ${sn('plan')}('plan', 420);`);
    await s.js(`const o = ${sn('obalka')}('plan'); const k = 24; const w = o.x1 - o.x0 + 2 * k, h = o.y1 - o.y0 + 2 * k; const W = Math.min(1200, w), H = Math.round(W * h / w);
        return ${sn('vyrez')}('plan2', 'plan', o.x0 - k, o.y0 - k, w, h, W, H);`);
    await s.uloz('plan2', 'minimalni-rozmery-mistnosti', 'chodba-90-120', { jpg: false, kvalitaWebp: 0.9 });
}

async function pudorysDomu(s) {
    console.log('\nJak nakreslit půdorys domu');
    await vzorovyDum(s, 'snímky půdorys');
    await s.js(`d.prepni2d(); d.rezim3d = false; return true;`);
    await S.pauza(500);
    // Půdorys natočený tak, aby stěny byly vodorovně a svisle, s kótami a místnostmi, bez nábytku (jinak zakryje názvy)
    await s.js(`d.showGrid = false; d.toggleGrid(); d.showKoty = true; d.toggleKoty(); d.showVybaveni = false; d.renderer.showVybaveni = false;
        d.kompasUhel = Math.round((90 - e.smerRastru() * 180 / Math.PI) * 10) / 10; d.aplikujRotaci(); d.fitView(); d.renderer.render(); return d.kompasUhel;`);
    await S.pauza(500);
    const r = await s.js(`return ${sn('plan')}('plan');`);
    console.log('   půdorys', JSON.stringify(r));
    await s.js(`const o = ${sn('obalka')}('plan'); const k = 24; const w = o.x1 - o.x0 + 2 * k, h = o.y1 - o.y0 + 2 * k; const W = 1200, H = Math.round(W * h / w);
        return ${sn('vyrez')}('plan2', 'plan', o.x0 - k, o.y0 - k, w, h, W, H);`);
    await s.uloz('plan2', 'jak-nakreslit-pudorys-domu', 'pudorys-prizemi', { jpg: false, kvalitaWebp: 0.9 });

    await s.js(`d.showVybaveni = true; d.renderer.showVybaveni = true; d.renderer.render(); return true;`);
    await s.do3d();
    await s.js(`d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true;`);
    await S.pauza(400);
    for (const [nazev, W, H] of [['bez', 1200, 700], ['og', ...OG]]) {
        await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(66, 0.88, 0.474))}, pomer: ${W / H}, okraj: 0.04 }); return true;`);
        await S.pauza(800);
        await s.js(`return ${sn('snimek')}('${nazev}', ${W}, ${H});`);
    }
    await s.uloz('bez', 'jak-nakreslit-pudorys-domu', 'dum-3d-bez-strechy', { jpg: false });
    await s.uloz('og', 'jak-nakreslit-pudorys-domu', 'jak-nakreslit-pudorys-domu', { webp: false });
}

async function schodiste(s) {
    console.log('\nVýpočet schodiště');
    await s.otevri(s.kopieVzoru('snímky schodiště'));
    await s.js(`d.pridatPodlazi('nahoru'); d.naPodlazi('P1'); d.renderer._mistnostiCache = null; d.renderer.render(); return true;`);
    await S.pauza(800);
    // Pokoj (vzorový dům je natočený): obdélník v osách domu ze vzorků rastru, dveře do něj
    const pokoj = await s.js(`d.renderer.render(); const m = e.mistnosti.find(q => q.druh === 'pokoj'); const t = e.smerRastru();
        const U = [Math.cos(t), Math.sin(t)], V = [-Math.sin(t), Math.cos(t)];
        let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
        const xs = [...e.nodes.values()].map(n => n.x), ys = [...e.nodes.values()].map(n => n.y);
        for (let x = Math.min(...xs); x < Math.max(...xs); x += 4) for (let y = Math.min(...ys); y < Math.max(...ys); y += 4) {
            if (d.renderer.mistnostVBode(x, y) !== m.id) continue;
            const a = (x * U[0] + y * U[1]) / X, b = (x * V[0] + y * V[1]) / X;
            a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b);
        }
        const dvere = [];
        for (const op of e.openings.values()) { if (op.typ !== 'dvere') continue; const w = e.walls.get(op.wallId); const A = e.nodes.get(w.nodeA), B = e.nodes.get(w.nodeB);
            const L = Math.hypot(B.x - A.x, B.y - A.y), k = (op.pozice + op.sirka / 2) * X / L; const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k;
            const a = (x * U[0] + y * U[1]) / X, b = (x * V[0] + y * V[1]) / X;
            if (a > a0 - 0.4 && a < a1 + 0.4 && b > b0 - 0.4 && b < b1 + 0.4) dvere.push({ a, b }); }
        return { id: m.id, U, V, a: [a0, a1], b: [b0, b1], dvere };`);
    console.log('   pokoj', JSON.stringify(pokoj));
    // Delší strana pokoje je osa ramene 1; rameno 1 podél stěny naproti dveřím od konce u dveří, odpočívadlo v rohu, rameno 2 ke dveřím
    const { U, V } = pokoj, d0 = pokoj.dvere[0];
    const delkaA = pokoj.a[1] - pokoj.a[0], delkaB = pokoj.b[1] - pokoj.b[0];
    const [osa, kolma, rozsah, kolmyRozsah, dvereNaOse, dvereKolmo] = delkaA >= delkaB
        ? [U, V, pokoj.a, pokoj.b, d0.a, d0.b] : [V, U, pokoj.b, pokoj.a, d0.b, d0.a];
    const odKonce = Math.abs(dvereNaOse - rozsah[0]) < Math.abs(dvereNaOse - rozsah[1]) ? 0 : 1;
    const smerA = odKonce === 0 ? 1 : -1;
    const stenaDveri = Math.abs(dvereKolmo - kolmyRozsah[0]) < Math.abs(dvereKolmo - kolmyRozsah[1]) ? 0 : 1;
    const naprotiB = kolmyRozsah[1 - stenaDveri], kDverim = stenaDveri === 0 ? -1 : 1;
    const a = rozsah[odKonce] + smerA * 0.25, b = naprotiB + kDverim * 0.52;
    const start = [osa[0] * a + kolma[0] * b, osa[1] * a + kolma[1] * b];
    const u = [osa[0] * smerA, osa[1] * smerA];
    const kVektor = [-u[1], u[0]];
    const strana = (kVektor[0] * kolma[0] + kVektor[1] * kolma[1]) * kDverim > 0 ? 1 : -1;
    const sch = await s.js(`const st = { id: 'S1', odPodlazi: 'P1', doPodlazi: 'P2', tvar: 'L', x: ${start[0]}, y: ${-start[1]}, uhel: ${Math.atan2(u[1], u[0])}, sirka: 1.0, strana: ${strana}, casti: [9, 6], barva: '#d8c3a0' };
        e.dum.schodiste.push(st); d.renderer._mistnostiCache = null; d.renderer.render(); d.autoSave('Schodiště'); return { st, vyska: d._vyskaMeziPodlazimi(st) };`);
    console.log('   schody', JSON.stringify(sch), 'pokoj', delkaA.toFixed(2), '×', delkaB.toFixed(2));
    // Kontrolní půdorys (do článku nejde)
    await s.js(`d.showGrid = false; d.toggleGrid(); d.kompasUhel = Math.round((90 - e.smerRastru() * 180 / Math.PI) * 10) / 10; d.aplikujRotaci(); d.fitView(); return true;`);
    await s.js(`return ${sn('plan')}('kontrola');`);
    const kontrola = await s.p.vyhodnot(`${sn('platna')}.kontrola.toDataURL('image/png')`);
    require('fs').writeFileSync(require('path').join(__dirname, '../import-test/vystup/schody-kontrola.png'), Buffer.from(kontrola.split(',')[1], 'base64'));

    await s.do3d();
    await s.js(`d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true;`);
    await S.pauza(500);
    // Záběr na pokoj se schody; kamera od nástupu (první rameno stoupá od ní, druhé je vidět z boku) a trochu od dveří
    const stred = [osa[0] * (rozsah[0] + rozsah[1]) / 2 + kolma[0] * (kolmyRozsah[0] + kolmyRozsah[1]) / 2, osa[1] * (rozsah[0] + rozsah[1]) / 2 + kolma[1] * (kolmyRozsah[0] + kolmyRozsah[1]) / 2];
    const pohled = [kolma[0] * kDverim * 0.5 - u[0], 0, kolma[1] * kDverim * 0.5 - u[1]];
    const v = smer(62, pohled[0], pohled[2]);
    const Bz = `${sn('body')}().filter(b => Math.hypot(b.x - ${stred[0]}, b.z - ${stred[1]}) < 2.3)`;
    for (const [nazev, W, H] of [['sch', 1200, 700], ['og', ...OG]]) {
        await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(v)}, pomer: ${W / H}, okraj: 0.03, B: ${Bz} }); return true;`);
        await S.pauza(800);
        await s.js(`return ${sn('snimek')}('${nazev}', ${W}, ${H});`);
    }
    await s.uloz('sch', 'vypocet-schodiste', 'schodiste-do-l-3d', { jpg: false });
    await s.uloz('og', 'vypocet-schodiste', 'vypocet-schodiste', { webp: false });
}

const CLANKY = {
    'typy-strech': typyStrech,
    'barva-fasady': barvaFasady,
    'minimalni-rozmery-mistnosti': async (s) => { await rozmeryMistnosti(s); await chodby(s); },
    'jak-nakreslit-pudorys-domu': pudorysDomu,
    'vypocet-schodiste': schodiste,
};

(async () => {
    const vybrane = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLANKY);
    const s = await S.zacni();
    try {
        for (const c of vybrane) {
            if (!CLANKY[c]) throw new Error('neznámý článek ' + c);
            await CLANKY[c](s);
        }
        const vazne = s.p.chybyDetail.filter(c => !/404/.test(c.text));
        if (vazne.length) console.log('chyby v konzoli:', vazne.slice(0, 5).map(c => c.text));
    } finally {
        await s.konec();
    }
})().catch((e) => { console.error(e); process.exit(1); });
