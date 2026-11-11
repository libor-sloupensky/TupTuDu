/**
 * Obrázky z editoru do článků o domě: typy střech, barva fasády, minimální rozměry místností,
 * jak nakreslit půdorys a výpočet schodiště. Dům je kopie vzorového projektu (bez parcely a podkladu),
 * noční část domu (ložnice, chodba) a dům se schodištěm jsou nové koncepty. Koncepty mají prefix ClaudeTest a na konci se smažou.
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

/** Počká, až mají materiály krytiny načtené fotografické textury (krytiny-3d.js se načítá asynchronně). */
async function cekejNaTextury(s) {
    await s.p.cekej(`(() => { let vse = true, pocet = 0; window._kk3d.dumSkupina.traverse(o => { const m = o.material;
        if (!m || !m.userData?.krytinaVzhled) return; pocet++; for (const t of [m.map, m.normalMap, m.aoMap]) if (!t || !t.image) vse = false; });
        return pocet === 0 || vse; })()`, 30000, 'textury krytiny');
    await S.pauza(300);
}

/** Vzhled krytiny podle id z public/textury/krytiny/vzhledy.json: typ i barva (tašky a břidlice mají barvu pevnou). */
const vzhledKrytiny = (id) => `{ const v = window.Krytiny3d.podleId(${JSON.stringify(id)}); d.setStrecha('krytina', v.typ); d.setStrecha('barva', v.hex); }`;

async function strecha(s, nast) {
    const { vzhled, ...zbytek } = nast;
    const prikazy = Object.entries(zbytek).map(([k, v]) => `d.setStrecha(${JSON.stringify(k)}, ${JSON.stringify(v)});`).join(' ');
    await s.js(`${prikazy} ${vzhled ? vzhledKrytiny(vzhled) : ''} return true;`);
    await s.prestav3d();
    await cekejNaTextury(s);
}

async function typyStrech(s) {
    console.log('\nTypy střech');
    await vzorovyDum(s, 'snímky typy střech');
    const typy = [
        { typ: 'sedlova', sklon: 38, vzhled: 'taska-cervena' },
        { typ: 'valbova', sklon: 30, vzhled: 'taska-cervena' },
        { typ: 'pultova', sklon: 15, krytina: 'falc', barva: KRYTINA.antracit },
        { typ: 'plocha', sklon: 2, krytina: 'falc', barva: KRYTINA.antracit },
    ];
    // Pohled od zadní strany domu: přední má ustoupený vstup, nad kterým pultová střecha ukáže vnitřek stěny
    const POHLED = smer(30, -1, -1);
    // Jeden záběr pro všechny čtyři: obálka všech střech dohromady
    await s.js(`window.__vse = []; return true;`);
    for (const t of typy) {
        await strecha(s, { typ: t.typ, sklon: t.sklon, presah: 0.5, ...(t.vzhled ? { vzhled: t.vzhled } : { krytina: t.krytina, barva: t.barva }) });
        await s.js(`window.__vse.push(...${sn('body')}()); return true;`);
    }
    for (const [i, t] of typy.entries()) {
        await strecha(s, { typ: t.typ, sklon: t.sklon, presah: 0.5, ...(t.vzhled ? { vzhled: t.vzhled } : { krytina: t.krytina, barva: t.barva }) });
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
    await strecha(s, { typ: 'sedlova', sklon: 45, presah: 0.5, vzhled: 'taska-cervena' });
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
        { fasada: RAL[9016], strecha: 'taska-cerna', okna: RAL[7016] },
        { fasada: RAL[9001], strecha: 'taska-cervena', okna: RAL[9016] },
        { fasada: '#D8C8A8', strecha: 'betonova-hneda-mech', okna: RAL[8003] },
        { fasada: RAL[7035], strecha: 'betonova-cerna', okna: RAL[9016] },
    ];
    const barvy = async (k) => {
        await s.js(`d.setBarvaDomu('fasada', '${k.fasada}'); d.setBarvaDomu('oknoVen', '${k.okna}'); d.setBarvaDomu('dvereVen', '${k.okna}'); ${vzhledKrytiny(k.strecha)} return true;`);
        await s.prestav3d();
        await cekejNaTextury(s);
    };
    await strecha(s, { typ: 'sedlova', sklon: 38, presah: 0.5 });
    for (const [i, k] of kombinace.entries()) {
        await barvy(k);
        await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(20, 0.29, 0.96))}, pomer: 597 / 398, okraj: 0.05 }); return true;`);
        await S.pauza(600);
        await s.js(`return ${sn('snimek')}('b${i}', 597, 398);`);
    }
    await s.js(`return ${sn('slozit')}('barvy', ['b0', 'b1', 'b2', 'b3'], 2);`);
    await s.uloz('barvy', 'barva-fasady', 'barva-fasady-kombinace', { jpg: false });

    // Úvodní obrázek (i náhled při sdílení): světlá fasáda s tmavou střechou a okny, pohled skoro z výšky očí na štít,
    // který je na slunci (slunce v editoru svítí pevně od jihozápadu, zahradní strana s velkými okny by byla ve stínu
    // a bílá by vyšla šedá), zahradní strana ubíhá vpravo
    await barvy(kombinace[0]);
    const stit = await s.js(`const t = e.smerRastru(), U = [Math.cos(t), Math.sin(t)], V = [-Math.sin(t), Math.cos(t)];
        return [V[0] + 0.55 * U[0], V[1] + 0.55 * U[1]];`);
    await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(11, stit[0], stit[1]))}, pomer: ${OG[0] / OG[1]}, okraj: 0.06 }); return true;`);
    await S.pauza(800);
    await s.js(`return ${sn('snimek')}('uvod', ${OG[0]}, ${OG[1]});`);
    await s.uloz('uvod', 'barva-fasady', 'barva-fasady-uvod', { jpg: false });
    await s.uloz('uvod', 'barva-fasady', 'barva-fasady', { webp: false });
}

/** Kus z katalogu v půdorysu: střed v metrech plátna (y dolů), úhel 0 = záda nahoru (−90 k západu, 90 k východu), vlastní rozměr. */
const kus = (id, x, y, uhel, sirka, hloubka) => `{ const p = d.katalog.polozky.find(q => q.id === '${id}'); const v = d._katalogZaznam(p, [${x}, ${-y}], ${uhel});
    ${sirka ? `v.sirka = ${sirka};` : ''} ${hloubka ? `v.hloubka = ${hloubka};` : ''} v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); e.vybaveni.push(v); }`;
const POSTEL = 'abo-B07H93GTMN', STOLEK = 'abo-B07RR3K7M8', SKRIN = 'abo-B07JGY5LPJ', BOTNIK = 'abo-B07GFS1R7X';
const WC_KOMBI = 'sh3d-toiletsUnit', UMYVADLO = 'sh3d-washbasin', VANA = 'sh3d-bath-jay-hardy';

/**
 * Noční část malého domu (Libor 11. 11. 2026: chodba je vždy průchozí, dveře nesmí vést ven z ložnice do nikam,
 * obvodové zdi ve skutečné tloušťce). Obvodové stěny 45 cm, příčky 15 cm, světlé rozměry:
 *   sever  ložnice 3,00 × 3,00 m | ložnice 4,00 × 3,00 m | hala 3,00 m se vchodem a botníkem
 *          chodba široká `w` mezi ložnicemi, koupelnou a halou, na západním konci okno
 *   jih    koupelna 2,60 m s vanou, WC a umyvadlem | obývák
 * Postele hlavou ke stěně, dveře do ložnic ve volném místě u nohou postele, v ložnici 3 × 4 m skříň naproti posteli.
 * Vrací svislé rozměry pro výřezy.
 */
async function nocniZona(s, w, nazev) {
    await s.otevri(s.novy(nazev));
    await s.jsA(`await d._katalogNacti(); return true;`);
    const Ych = 3.15 + w;                       // jižní líc chodby
    const Yin = Ych + 0.15 + 3.6;               // jižní vnitřní líc koupelny a obýváku
    const Yjih = Yin + 0.225;                   // osa jižní obvodové stěny
    await s.js(`e.dum.podlazi[0].vyska = 2.75;
        const W = (x1, y1, x2, y2, typ) => e.addWall(x1 * X, y1 * X, x2 * X, y2 * X, typ === 'obvodova' ? 0.45 : 0.15, typ);
        const O = (st, od, sirka, typ, nast = {}) => e.addOpening(st.id, od, sirka, typ, { presnaSirka: true, ...nast });
        const sever = W(-0.225, -0.225, 10.525, -0.225, 'obvodova'), vychod = W(10.525, -0.225, 10.525, ${Yjih}, 'obvodova');
        const jih = W(10.525, ${Yjih}, -0.225, ${Yjih}, 'obvodova'), zapad = W(-0.225, ${Yjih}, -0.225, -0.225, 'obvodova');
        W(3.075, -0.225, 3.075, 3.075, 'pricka');
        const chodbaS = W(-0.225, 3.075, 7.225, 3.075, 'pricka');
        const hala = W(7.225, -0.225, 7.225, ${Ych + 0.075}, 'pricka');
        const chodbaJ = W(-0.225, ${Ych + 0.075}, 10.525, ${Ych + 0.075}, 'pricka');
        W(2.675, ${Ych + 0.075}, 2.675, ${Yjih}, 'pricka');
        // Dveře: do ložnic u nohou postele (otvírají se do ložnice), do koupelny, z chodby do haly, vchod, z haly do obýváku
        O(chodbaS, 2.375, 0.8, 'dvere', { strana: 'out' }); O(chodbaS, 5.725, 0.8, 'dvere', { strana: 'out' });
        O(chodbaJ, 1.225, 0.8, 'dvere', { strana: 'in' }); O(hala, ${(w >= 1.1 ? 3.25 : 3.2) + 0.225}, 0.8, 'dvere', { strana: 'out' });
        O(sever, 8.525, 1.0, 'dvere', { strana: 'in' }); O(chodbaJ, 8.825, 0.8, 'dvere', { strana: 'in' });
        // Okna: ložnice na sever vedle postele, chodba na západ, hala na východ, koupelna, obývák na jih a východ
        O(sever, 1.125, 1.2, 'okno'); O(sever, 4.225, 1.2, 'okno');
        O(zapad, ${Yjih - (3.15 + w / 2 + 0.3)}, 0.6, 'okno'); O(vychod, 1.225, 1.2, 'okno');
        O(zapad, ${Yjih - (Ych + 2.0)}, 0.8, 'okno');
        O(jih, 4.125, 2.4, 'okno'); O(jih, 0.925, 2.4, 'okno'); O(vychod, ${Ych + 1.225}, 1.5, 'okno');
        // Ložnice: postel 160 × 200 (s rámem 165 × 210) hlavou ke stěně, stolky, ve větší skříň naproti
        ${kus(POSTEL, 1.05, 1.5, -90, 1.65, 2.10)} ${kus(STOLEK, 0.2, 0.425, -90)} ${kus(STOLEK, 0.2, 2.575, -90)}
        ${kus(POSTEL, 4.20, 1.5, -90, 1.65, 2.10)} ${kus(STOLEK, 3.35, 0.425, -90)} ${kus(STOLEK, 3.35, 2.575, -90)}
        ${kus(SKRIN, 7.15 - 0.3, 1.5, 90, 1.83, 0.6)}
        // Hala: botník u vchodu. Koupelna: vana u jižní stěny, WC v rohu, umyvadlo naproti dveřím
        ${kus(BOTNIK, 7.775, 0.15, 0, 0.75, 0.30)}
        ${kus(VANA, 0.95, Yin - 0.36, 180)} ${kus(WC_KOMBI, 0.36, Ych + 0.7, -90)} ${kus(UMYVADLO, 2.6 - 0.24, Ych + 1.75, 90)}
        d.setBarvaDomu('fasada', '#e8e2d6'); d.showGrid = false; d.toggleGrid(); d.showKoty = true; d.toggleKoty();
        d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Noční část'); return true;`);
    await S.pauza(1500);
    const mistnosti = await s.js(`d.renderer._mistnostiCache = null; d.renderer.render(); const out = {};
        for (const [klic, druh, nazev, dekor, x, y] of [['A', 'loznice', 'Ložnice', 'prkna', 1.5, 1.5], ['B', 'loznice', 'Ložnice', 'prkna', 5.0, 1.5],
            ['chodba', 'chodba', 'Chodba', 'dlazba60', 3.6, ${3.15 + w / 2}], ['hala', 'zadveri', 'Hala', 'dlazba60', 8.8, 2.0],
            ['koupelna', 'koupelna', 'Koupelna', 'dlazba30', 1.3, ${Ych + 2.0}], ['obyvak', 'obyvak', 'Obývák', 'prkna', 6.5, ${Ych + 2.0}]]) {
            const id = d.renderer.mistnostVBode(x * X, y * X); const m = e.najdiMistnost(id);
            if (m) { e.nastavDruhMistnosti(m, druh); m.nazev = nazev; delete m.auto; m.podlaha = { dekor }; }
            out[klic] = { id, plocha: d.renderer.plochaMistnosti(id) };
        }
        d.renderer._mistnostiCache = null; d.renderer.render(); return out;`);
    // Popisky ložnic doprostřed postelí a nad nábytek: volný pruh u nohou postele, o kterém je článek, zůstane čistý.
    // Renderer kreslí nábytek přes popisky, proto se po každém překreslení přesunou do vlastní vrstvy navrch.
    await s.js(`${sn('popisky')}({ '${mistnosti.A.id}': [1.05, 1.5], '${mistnosti.B.id}': [4.2, 1.5], '${mistnosti.hala.id}': [9.0, 1.55] });
        const r = d.renderer; const L = new Konva.Layer({ listening: false }); d.stage.add(L);
        const puvodni = r.renderMistnosti;
        r.renderMistnosti = function (...a) { const v = puvodni.apply(this, a); L.destroyChildren(); for (const t of this._mistnostiPopisky || []) t.moveTo(L); L.moveToTop(); L.batchDraw(); return v; };
        r._mistnostiCache = null; r.render(); return true;`);
    console.log(`   chodba ${w} m, místnosti`, JSON.stringify(Object.fromEntries(Object.entries(mistnosti).map(([k, v]) => [k, v.plocha]))));
    // Kontrola z modelu: u nohou postele v menší ložnici, mezi postelí a skříní a po stranách postele ve větší
    const miry = await s.js(`const v = e.vybaveni; const xs = (k) => k.polygon.map(q => q[0]), ys = (k) => k.polygon.map(q => -q[1]);
        const [pA, , , pB, , , sk] = v; return { nohyA: +(3 - Math.max(...xs(pA))).toFixed(3), mezi: +(Math.min(...xs(sk)) - Math.max(...xs(pB))).toFixed(3),
            bokB: +(Math.min(...ys(pB))).toFixed(3), skrin: [sk.sirka, sk.hloubka], postel: [pA.sirka, pA.hloubka] };`);
    console.log('   míry', JSON.stringify(miry));
    return { Ych, Yjih, mistnosti };
}

/**
 * Půdorys aktivního podlaží a převod metrů plátna na pixely snímku podle vnějších líců obvodových zdí. Zdi se hledají
 * jako nejtmavší pixely (kóty, popisky kót, dveře a okna jsou světlejší), se zapnutými kótami tak obálka nesedí.
 */
async function planSMeritkem(s, nazev, Yjih) {
    const r = await s.js(`return ${sn('plan')}('${nazev}');`);
    const o = await s.js(`const v = ${sn('platna')}['${nazev}'], b = v.getContext('2d').getImageData(0, 0, v.width, v.height).data;
        let x0 = v.width, y0 = v.height, x1 = 0, y1 = 0;
        for (let y = 0; y < v.height; y++) for (let x = 0; x < v.width; x++) {
            const i = (y * v.width + x) * 4;
            if (Math.max(b[i], b[i + 1], b[i + 2]) <= 105) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        }
        return { x0, y0, x1, y1 };`);
    // Vnější líce: x od −0,45 do 10,75 m, y od −0,45 do Yjih + 0,225 m
    const m = { x0: -0.45, x1: 10.75, y0: -0.45, y1: Yjih + 0.225 };
    const kx = (o.x1 - o.x0) / (m.x1 - m.x0), ky = (o.y1 - o.y0) / (m.y1 - m.y0);
    return { r, o, px: (x) => o.x0 + (x - m.x0) * kx, py: (y) => o.y0 + (y - m.y0) * ky, k: (kx + ky) / 2 };
}

/** Lidé shora (ramena 55 cm, hlava) do snímku: [x, y] v metrech plátna, jdou podél osy x. */
async function lide(s, nazev, mapa, body) {
    const px = body.map(([x, y]) => [mapa.px(x), mapa.py(y)]);
    await s.js(`const g = ${sn('platna')}['${nazev}'].getContext('2d'); const k = ${mapa.k};
        for (const [x, y] of ${JSON.stringify(px)}) {
            g.fillStyle = 'rgba(71, 85, 105, 0.88)'; g.beginPath(); g.ellipse(x, y, 0.15 * k, 0.275 * k, 0, 0, 2 * Math.PI); g.fill();
            g.fillStyle = '#1e293b'; g.beginPath(); g.arc(x, y, 0.105 * k, 0, 2 * Math.PI); g.fill();
        } return true;`);
}

async function rozmeryMistnosti(s) {
    console.log('\nMinimální rozměry místností');
    const z = await nocniZona(s, 1.2, 'snímky noční část 120');
    // Ložnice: výřez severní části (ložnice, chodba, hala) bez kót, rozměry jsou v popiscích místností
    const mapa = await planSMeritkem(s, 'plan', z.Yjih);
    const okraj = 0.25;
    const [x0, y0, x1, y1] = [mapa.px(-0.45 - okraj), mapa.py(-0.45 - okraj), mapa.px(10.75 + okraj), mapa.py(z.Ych + 1.0)];
    await s.js(`const W = 1200, H = Math.round(W * ${(y1 - y0) / (x1 - x0)}); return ${sn('vyrez')}('loznice', 'plan', ${x0}, ${y0}, ${x1 - x0}, ${y1 - y0}, W, H);`);
    await s.uloz('loznice', 'minimalni-rozmery-mistnosti', 'loznice-pudorys', { jpg: false, kvalitaWebp: 0.9 });
    // Chodba 120 cm: výřez kolem chodby, dva lidé vedle sebe
    const vyrezChodby = async (mapaCh, Ych, nazev, osoby) => {
        await lide(s, 'plan', mapaCh, osoby);
        const [a0, b0, a1, b1] = [mapaCh.px(-0.45 - 0.15), mapaCh.py(2.2), mapaCh.px(8.4), mapaCh.py(2.2 + 3.25)];
        await s.js(`return ${sn('vyrez')}('${nazev}', 'plan', ${a0}, ${b0}, ${a1 - a0}, ${b1 - b0}, 1200, ${Math.round(1200 * (b1 - b0) / (a1 - a0))});`);
    };
    await vyrezChodby(mapa, z.Ych, 'ch120', [[4.45, 3.15 + 0.3], [4.45, 3.15 + 0.9]]);

    // Úvodní obrázek: noční část ve 3D shora, s nábytkem; obývák se do záběru nevejde
    await s.do3d();
    const B = `${sn('body')}().filter(b => b.z < ${z.Ych + 0.25})`;
    for (const [nazev, W, H] of [['uvod', 1200, 700], ['og', ...OG]]) {
        await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(smer(64, 0.22, 1))}, pomer: ${W / H}, okraj: 0.03, B: ${B} }); return true;`);
        await S.pauza(800);
        await s.js(`return ${sn('snimek')}('${nazev}', ${W}, ${H});`);
    }
    await s.uloz('uvod', 'minimalni-rozmery-mistnosti', 'minimalni-rozmery-mistnosti-uvod', { jpg: false });
    await s.uloz('og', 'minimalni-rozmery-mistnosti', 'minimalni-rozmery-mistnosti', { webp: false });

    // Stejná část s chodbou 90 cm: jeden člověk, druhý se nevyhne. Nový koncept znovu načte stránku, výřez se 120 cm
    // se proto přenese jako obrázek.
    const ch120 = await s.p.vyhodnot(`${sn('platna')}.ch120.toDataURL('image/png')`);
    const z90 = await nocniZona(s, 0.9, 'snímky noční část 90');
    await s.jsA(`const img = new Image(); await new Promise((ok, chyba) => { img.onload = ok; img.onerror = chyba; img.src = ${JSON.stringify(ch120)}; });
        const v = document.createElement('canvas'); v.width = img.width; v.height = img.height; v.getContext('2d').drawImage(img, 0, 0);
        ${sn('platna')}.ch120 = v; return [v.width, v.height];`);
    const mapa90 = await planSMeritkem(s, 'plan', z90.Yjih);
    await vyrezChodby(mapa90, z90.Ych, 'ch90', [[4.45, 3.15 + 0.45]]);
    await s.js(`return ${sn('slozit')}('chodby', ['ch90', 'ch120'], 1, 10);`);
    await s.uloz('chodby', 'minimalni-rozmery-mistnosti', 'chodba-90-120', { jpg: false, kvalitaWebp: 0.9 });
}

/**
 * Vzorový dům v článku o půdorysu (Libor 11. 11. 2026: obrázky musí dávat smysl). Kopie dostane vybavenou koupelnu
 * a WC, dveře WC se otvírají ven do zádveří (článek pod obrázkem radí otvírat je ven) a obývák se jmenuje
 * „Obývák s kuchyní“ (kuchyňskou linku katalog zatím nemá). Šablona vzorového projektu se nemění.
 * Polohy v osách domu (a dolů, b doleva v natočeném půdorysu) ze sondy místností vzorového domu.
 */
async function pudorysDomu(s) {
    console.log('\nJak nakreslit půdorys domu');
    await s.otevri(s.kopieVzoru('snímky půdorys'));
    await s.jsA(`await d._katalogNacti(); return true;`);
    const uprava = await s.js(`const t = e.smerRastru(), U = [Math.cos(t), Math.sin(t)], V = [-Math.sin(t), Math.cos(t)], tDeg = t * 180 / Math.PI;
        const kusAB = (id, a, b, lokalni, sirka, hloubka) => { const p = d.katalog.polozky.find(q => q.id === id); if (!p) return null;
            const x = a * U[0] + b * V[0], y = a * U[1] + b * V[1];
            const v = d._katalogZaznam(p, [x, -y], tDeg + lokalni); if (sirka) v.sirka = sirka; if (hloubka) v.hloubka = hloubka;
            v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); e.vybaveni.push(v); return p.nazev; };
        const ab = (op) => { const w = e.walls.get(op.wallId); const A = e.nodes.get(w.nodeA), B = e.nodes.get(w.nodeB);
            const L = Math.hypot(B.x - A.x, B.y - A.y), k = (op.pozice + op.sirka / 2) * X / L; const x = A.x + (B.x - A.x) * k, y = A.y + (B.y - A.y) * k;
            return [(x * U[0] + y * U[1]) / X, (x * V[0] + y * V[1]) / X]; };
        const dvereWC = [...e.openings.values()].find(op => { if (op.typ !== 'dvere') return false; const [a, b] = ab(op); return Math.abs(a + 5.19) < 0.15 && Math.abs(b + 1.49) < 0.15; });
        const puvodne = dvereWC?.strana;
        if (dvereWC) dvereWC.strana = dvereWC.strana === 'out' ? 'in' : 'out';
        const kusy = [kusAB('${WC_KOMBI}', -5.165, -3.34 + 0.346 + 0.01, 0), kusAB('${VANA}', -4.68 - 0.9 - 0.02, -4.99 + 0.35 + 0.01, 0),
            kusAB('${UMYVADLO}', -7.89 + 0.23 + 0.01, -2.1, -90)];
        const obyvak = e.mistnosti.find(m => m.druh === 'obyvak'); if (obyvak) { obyvak.nazev = 'Obývák s kuchyní'; delete obyvak.auto; }
        // Obvodové zdi zděného domu se zateplením 45 cm (vzor má 30 cm, článek před tím přímo varuje); zesílí se kolem osy
        let obvodovych = 0; for (const w of e.walls.values()) if (w.typ === 'obvodova') { w.tloustka = 0.45; obvodovych++; }
        // Sloup krytého vstupu drží střechu; na půdorysu a ve 3D bez střechy by stál bez smyslu
        const sloupu = (e.dum.sloupy || []).length; e.dum.sloupy = [];
        d.renderer._mistnostiCache = null; d.renderer.render(); d.autoSave('Vybavení');
        const plochy = Object.fromEntries(e.mistnosti.filter(m => d.renderer.plochaMistnosti(m.id) > 0).map(m => [m.nazev, d.renderer.plochaMistnosti(m.id)]));
        return { dvereWC: [puvodne, dvereWC?.strana], kusy, obvodovych, sloupu, plochy };`);
    console.log('   úprava kopie', JSON.stringify(uprava));
    await S.pauza(800);
    // Kontrolní půdorys s nábytkem (do článku nejde)
    await s.js(`d.showGrid = false; d.toggleGrid(); d.showKoty = true; d.toggleKoty();
        d.kompasUhel = Math.round((90 - e.smerRastru() * 180 / Math.PI) * 10) / 10; d.aplikujRotaci(); d.fitView(); d.renderer.render(); return true;`);
    await S.pauza(500);
    await s.js(`return ${sn('plan')}('kontrola');`);
    const kontrola = await s.p.vyhodnot(`${sn('platna')}.kontrola.toDataURL('image/png')`);
    require('fs').writeFileSync(require('path').join(__dirname, '../import-test/vystup/pudorys-kontrola.png'), Buffer.from(kontrola.split(',')[1], 'base64'));
    // Půdorys do článku: s kótami a místnostmi, bez nábytku (jinak zakryje názvy)
    await s.js(`d.showVybaveni = false; d.renderer.showVybaveni = false; d.renderer.render(); return true;`);
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

/**
 * Schodiště v hale patrového domu (Libor 11. 11. 2026: schody nesmí stát před oknem, do místnosti se schody musí
 * vést dveře a místnost jen se schody nedává smysl). Dům 11 × 9 m, obvodové stěny 45 cm, nosná stěna napříč.
 * Sever (nahoře): pracovna, WC a hala se vchodem z ulice. Přímé schody stoupají v hale podél nosné stěny od východu
 * na západ: před prvním stupněm zbude 1,25 m volného místa, vedle něj dveře do obýváku, za horním koncem volná
 * plocha haly (v patře výstup) s dveřmi do pracovny. Jih: obývák s kuchyní. Okna jen tam, kde schody nejsou.
 * Výška mezi podlažími 2,90 m jako v článku: 17 výšek po 171 mm, rameno 4,62 m.
 */
async function schodiste(s) {
    console.log('\nVýpočet schodiště');
    await s.otevri(s.novy('snímky schodiště'));
    await s.jsA(`await d._katalogNacti(); return true;`);
    const zed = { obvod: 0.45, nosna: 0.25, pricka: 0.15 };
    await s.js(`e.dum.podlazi[0].vyska = 2.9;
        const W = (x1, y1, x2, y2, typ) => e.addWall(x1 * X, y1 * X, x2 * X, y2 * X, ${JSON.stringify(zed)}[typ === 'obvodova' ? 'obvod' : typ], typ);
        const sever = W(0.225, 0.225, 10.775, 0.225, 'obvodova'), vychod = W(10.775, 0.225, 10.775, 8.775, 'obvodova');
        const jih = W(10.775, 8.775, 0.225, 8.775, 'obvodova'), zapad = W(0.225, 8.775, 0.225, 0.225, 'obvodova');
        const nosna = W(0.225, 3.9, 10.775, 3.9, 'nosna');
        const pracovna = W(3.2, 0.225, 3.2, 3.9, 'pricka');
        W(3.2, 1.975, 4.975, 1.975, 'pricka'); const wc = W(4.975, 0.225, 4.975, 1.975, 'pricka');
        const O = (st, od, sirka, typ, nast = {}) => e.addOpening(st.id, od, sirka, typ, { presnaSirka: true, ...nast });
        // Vchod, okna haly, pracovny a WC na severu (ne nad schody), dveře z haly
        O(sever, 8.675, 1.0, 'dvere'); O(sever, 5.975, 1.2, 'okno'); O(sever, 0.875, 1.2, 'okno'); O(sever, 3.575, 0.6, 'okno');
        O(pracovna, 2.275, 0.8, 'dvere'); O(wc, 0.675, 0.7, 'dvere', { strana: 'out' }); O(nosna, 9.275, 0.9, 'dvere');
        // Obývák s kuchyní na jihu
        O(jih, 1.5, 2.4, 'okno'); O(jih, 5.2, 1.8, 'okno'); O(zapad, 1.2, 1.5, 'okno'); O(vychod, 6.0, 1.2, 'okno'); O(zapad, 6.4, 1.2, 'okno');
        d.setBarvaDomu('fasada', '#e8e2d6'); d.showGrid = false; d.toggleGrid(); d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.autoSave('Dům'); return true;`);
    await S.pauza(1200);
    // Druhy místností podle bodu uvnitř
    const mistnosti = await s.js(`d.renderer._mistnostiCache = null; d.renderer.render(); const out = {};
        for (const [druh, x, y] of [['pracovna', 1.6, 2.0], ['wc', 4.1, 1.1], ['chodba', 7.0, 1.5], ['obyvak', 5.5, 6.3]]) {
            const id = d.renderer.mistnostVBode(x * X, y * X); const m = e.najdiMistnost(id);
            if (m) { e.nastavDruhMistnosti(m, druh); m.podlaha = { dekor: { wc: 'dlazba30', chodba: 'dlazba60' }[druh] || 'prkna' }; }
            out[druh] = { id, plocha: d.renderer.plochaMistnosti(id) };
        }
        d.renderer._mistnostiCache = null; d.renderer.render(); return out;`);
    console.log('   místnosti', JSON.stringify(mistnosti));
    // Nábytek: botník u vchodu, stůl v pracovně, pohovka v obýváku (modely jsou v S3, bez internetu se ve 3D nenačtou)
    const nabytek = await s.js(`const najdi = (re) => d.katalog.polozky.find(p => re.test(p.nazevZdroj || p.nazev) || re.test(p.nazev));
        const polozky = { botnik: d.katalog.polozky.find(p => p.id === '${BOTNIK}'), stul: najdi(/psac|desk/i), pohovka: najdi(/pohovk|sofa/i) };
        const vloz = (p, x, y, uhel, sirka, hloubka) => { if (!p) return; const v = d._katalogZaznam(p, [x, -y], uhel); if (sirka) v.sirka = sirka; if (hloubka) v.hloubka = hloubka;
            v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); e.vybaveni.push(v); };
        vloz(polozky.botnik, 7.9, 0.45 + 0.15, 0, 0.9, 0.30);
        vloz(polozky.stul, 1.6, 0.45 + 0.35, 0, 1.4, 0.7);
        vloz(polozky.pohovka, 3.0, 8.55 - 1.4, 180);
        d.renderer.render(); d.autoSave('Nábytek');
        return Object.fromEntries(Object.entries(polozky).map(([k, p]) => [k, p ? p.id + ' ' + p.nazev : null]));`);
    console.log('   nábytek', JSON.stringify(nabytek));
    // Patro (kopie obvodových a nosných stěn) a schody z přízemí: nástup na východě, stoupají na západ podél nosné stěny
    const sch = await s.js(`d.pridatPodlazi('nahoru'); d.naPodlazi('P1');
        const st = { id: 'S1', odPodlazi: 'P1', doPodlazi: 'P2', tvar: 'prime', x: 9.3, y: -(3.775 - 0.5), uhel: Math.PI, sirka: 1.0, strana: 1, barva: '#d8c3a0' };
        e.dum.schodiste.push(st); d.renderer._mistnostiCache = null; d.renderer.render(); d.autoSave('Schodiště');
        const g = DumGeo.schodyGeo(st, d._vyskaMeziPodlazimi(st), X);
        return { vyska: d._vyskaMeziPodlazimi(st), n: g.n, v: g.v, b: g.b, delka: g.delka };`);
    console.log('   schody', JSON.stringify(sch));
    if (Math.abs(sch.vyska - 2.9) > 1e-6 || sch.n !== 17) throw new Error('schody nevyšly na 2,90 m a 17 výšek');

    // Kontrolní půdorys přízemí s kótami (do článku nejde, kontroluje se v něm logika domu)
    await s.js(`d.showKoty = true; d.toggleKoty(); d.fitView(); d.renderer.render(); return true;`);
    await S.pauza(500);
    await s.js(`return ${sn('plan')}('kontrola');`);
    const kontrola = await s.p.vyhodnot(`${sn('platna')}.kontrola.toDataURL('image/png')`);
    require('fs').writeFileSync(require('path').join(__dirname, '../import-test/vystup/schody-kontrola.png'), Buffer.from(kontrola.split(',')[1], 'base64'));

    // 3D přízemí bez patra a střechy, kamera od severu nad vchodem: schody stoupají od vchodu podél nosné stěny
    await s.do3d();
    await s.js(`d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true;`);
    await S.pauza(500);
    const v = smer(58, 0.55, -1);
    const Bz = `${sn('body')}().filter(b => b.z < 4.3 && b.x > 2.6)`;
    for (const [nazev, W, H] of [['sch', 1200, 700], ['og', ...OG]]) {
        await s.js(`${sn('zaber')}({ smer: ${JSON.stringify(v)}, pomer: ${W / H}, okraj: 0.03, B: ${Bz} }); return true;`);
        await S.pauza(800);
        await s.js(`return ${sn('snimek')}('${nazev}', ${W}, ${H});`);
    }
    await s.uloz('sch', 'vypocet-schodiste', 'schodiste-v-hale-3d', { jpg: false });
    await s.uloz('og', 'vypocet-schodiste', 'vypocet-schodiste', { webp: false });
}

const CLANKY = {
    'typy-strech': typyStrech,
    'barva-fasady': barvaFasady,
    'minimalni-rozmery-mistnosti': rozmeryMistnosti,
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
