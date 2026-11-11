/**
 * Formuláře editoru. Zarovnání: v každém řádku panelu stejná výška polí a jedna svislá osa polí i nápisů.
 * Hodnota ihned: co se do pole napíše, je v modelu bez potvrzování a klik jinam ji neztratí.
 * Prochází všechny panely, které editor umí ukázat.
 *
 * Spuštění: node services/import-test/test-formulare-ui.cjs [složka snímků]
 * V3_JEN_IHNED=1 přeskočí průchod panely a pustí jen scénáře z části 5.
 * V3_POPISKY=1 u každého panelu vypíše přetékající a zalomené nápisy a uloží snímek panelu (pro kontrolu překladů,
 * server pustit s MASTERTEAM_JAZYK=de). Mezi chyby se nepočítají, jen se vypíšou.
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const TOL = 1.01;   // px
const JEN_IHNED = !!process.env.V3_JEN_IHNED;
const POPISKY = !!process.env.V3_POPISKY;
// Nápis mimo svůj prvek, oříznutý nebo krátký zalomený. Delší věty se zalamovat smějí.
const MERENI_POPISKU = `(koren) => {
    const vystup = [];
    const k = koren.getBoundingClientRect();
    const chod = document.createTreeWalker(koren, NodeFilter.SHOW_TEXT);
    while (chod.nextNode()) {
        const t = chod.currentNode, text = t.textContent.trim(), n = t.parentElement;
        if (!text || n.closest('script,style,template,option') || !n.offsetParent) continue;
        const rng = document.createRange(); rng.selectNodeContents(t);
        const r = [...rng.getClientRects()].filter(q => q.width > 0);
        if (!r.length) continue;
        const radku = new Set(r.map(q => Math.round(q.top))).size;
        const vpravo = Math.max(...r.map(q => q.right));
        if (vpravo > k.right + 1) vystup.push('MIMO: ' + text.slice(0, 44));
        else if (n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible') vystup.push('ŘEZ: ' + text.slice(0, 44));
        else if (radku > 1 && text.length <= 26) vystup.push('ZLOM: ' + text.slice(0, 44));
    }
    for (const b of koren.querySelectorAll('select')) {
        if (!b.offsetParent) continue;
        const o = b.options[b.selectedIndex]; if (!o) continue;
        const c = document.createElement('canvas').getContext('2d'); c.font = getComputedStyle(b).font;
        if (c.measureText(o.textContent).width > b.clientWidth - 22) vystup.push('VÝBĚR: ' + o.textContent.trim().slice(0, 44));
    }
    return [...new Set(vystup)];
}`;
const PO_PAUZE = 550;   // ms, déle než odevzdání rozepsané hodnoty v _poleIhnedInit

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

// Řádek = rodič, jehož potomci leží vedle sebe a nese aspoň jedno pole. Porovnává se střed polí a nápisů.
const MERENI = `(koren) => {
    const viditelne = (n) => { const r = n.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden'; };
    const POLE = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), select';
    const popis = (n) => (n.getAttribute('data-hrana') || n.getAttribute('data-schody') || n.placeholder || n.title || n.tagName).slice(0, 24);
    const vady = [];
    const pole = [...koren.querySelectorAll(POLE)].filter(viditelne);
    const vysky = new Set();
    const zaobleni = new Set();
    for (const n of pole) {
        const r = n.getBoundingClientRect(), s = getComputedStyle(n);
        vysky.add(Math.round(r.height));
        zaobleni.add(s.borderTopLeftRadius);
        if (parseFloat(s.marginTop) || parseFloat(s.marginBottom)) vady.push('okraj ' + popis(n) + ' ' + s.marginTop + '/' + s.marginBottom);
        // Sourozenci na stejné řádce (flex položky rodiče, případně i o patro výš přes obalový span)
        let rodic = n.parentElement;
        for (let i = 0; i < 2 && rodic; i++, rodic = rodic.parentElement) {
            if (!getComputedStyle(rodic).display.includes('flex')) continue;
            const stred = r.top + r.height / 2;
            const texty = [];
            const prochazej = (k) => {
                for (const c of k.childNodes) {
                    if (c.nodeType === 3 && c.textContent.trim()) {
                        const rng = document.createRange(); rng.selectNodeContents(c); const q = rng.getBoundingClientRect();
                        if (q.height) texty.push({ t: c.textContent.trim().slice(0, 18), s: q.top + q.height / 2, sir: q.height });
                    } else if (c.nodeType === 1 && viditelne(c) && !c.matches('input,select,template,svg')) prochazej(c);
                }
            };
            for (const c of rodic.children) {
                if (c === n || c.contains(n) || !viditelne(c) || c.matches('template')) continue;
                const q = c.getBoundingClientRect();
                if (q.bottom < r.top || q.top > r.bottom) continue;   // jiná řádka zalomeného flexu
                if (c.matches(POLE + ', button')) {
                    if (Math.abs(q.top + q.height / 2 - stred) > ${TOL}) vady.push('osa ' + popis(n) + ' × ' + popis(c) + ' ' + (q.top + q.height / 2 - stred).toFixed(1));
                } else prochazej(c);
            }
            for (const t of texty) if (Math.abs(t.s - stred) > ${TOL}) vady.push('nápis „' + t.t + '" × ' + popis(n) + ' ' + (t.s - stred).toFixed(1));
            break;
        }
    }
    if (vysky.size > 1) vady.push('výšky polí ' + [...vysky].join(', '));
    if (zaobleni.size > 1) vady.push('zaoblení polí ' + [...zaobleni].join(', '));
    return { poli: pole.length, vady: [...new Set(vady)].slice(0, 12) };
}`;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    await p.cmd('Emulation.setFocusEmulationEnabled', { enabled: true });
    const napis = async (text) => {
        for (const z of String(text)) {
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', text: z, key: z, unmodifiedText: z });
            await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: z });
        }
    };
    // Každé pole panelu: napsat platnou hodnotu a nic dalšího. Musí se odevzdat právě jednou, kurzor zůstane v poli
    // a text se nesmí změnit pod rukama. Odchod z pole už nic neodevzdá znovu a Zpět je jeden krok.
    const hodnotaIhned = async (nazev, selektor) => {
        const seznam = `[...document.querySelector(${JSON.stringify(selektor)}).querySelectorAll('input[type=number], input[type=text]')].filter(n => { const r = n.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && !n.disabled && !n.readOnly && !n.pattern && n.hasAttribute('@change'); })`;
        const pocet = await p.vyhodnot(`${seznam}.length`);
        const vady = [];
        for (let i = 0; i < pocet; i++) {
            const cil = await p.vyhodnot(`(() => { const n = ${seznam}[${i}]; if (!n) return null;
                window.__pole = n; window.__zmen = 0; window.__pocitej ??= () => { window.__zmen++; }; n.addEventListener('change', window.__pocitej);
                window.__zpet = ${D}.historie[${D}.historiePozice].id;
                const krok = parseFloat(n.step) || 1, max = n.max === '' ? Infinity : +n.max, ted = parseFloat(n.value);
                let v = n.type === 'text' ? (n.value + 'x').slice(-(n.maxLength > 0 ? n.maxLength : 99)) : (isNaN(ted) ? Math.max(+n.min || 0, 0) : ted) + krok;
                if (v > max) v = ted - krok;
                n.focus(); n.select();
                return { popis: n.getAttribute('data-hrana') || n.getAttribute('data-schody') || n.getAttribute('data-zaklad') || n.title || n.placeholder || ('pole ' + n.min + '–' + n.max), v: String(v) }; })()`);
            if (!cil) continue;
            await napis(cil.v);
            await pauza(PO_PAUZE);
            const a = await p.vyhodnot(`({ zmen: window.__zmen, kurzor: document.activeElement === window.__pole, text: window.__pole.value })`);
            const b = await p.vyhodnot(`(() => { window.__pole.blur(); return { zmen: window.__zmen, zpet: ${D}.historiePozice - ${D}.historie.findIndex(k => k.id === window.__zpet) }; })()`);
            await p.vyhodnot(`(window.__pole.removeEventListener('change', window.__pocitej), 1)`);
            await pauza(60);
            if (a.zmen !== 1) vady.push(`${cil.popis}: při psaní ${a.zmen}× odevzdáno`);
            if (!a.kurzor) vady.push(`${cil.popis}: pole přišlo o kurzor`);
            if (a.text !== cil.v) vady.push(`${cil.popis}: text se změnil pod rukama ${cil.v} → ${a.text}`);
            if (b.zmen !== a.zmen) vady.push(`${cil.popis}: odchod odevzdal znovu`);
            if (b.zpet > 1) vady.push(`${cil.popis}: ${b.zpet} kroků Zpět`);
        }
        if (pocet) kontrola('hodnota ihned: ' + nazev, vady.length === 0, `${pocet} polí${vady.length ? ': ' + vady.join(' | ') : ''}`);
    };
    const zmer = async (nazev, selektor, bezPoli = false) => {
        if (JEN_IHNED) return;
        await pauza(350);
        const v = await p.vyhodnot(`(${MERENI})(document.querySelector(${JSON.stringify(selektor)}))`);
        kontrola(nazev, (v.poli > 0 || bezPoli) && v.vady.length === 0, `${v.poli} polí${v.vady.length ? ': ' + v.vady.join(' | ') : ''}`);
        if (v.vady.length) await p.snimek(path.join(vystup, 'formular-' + nazev.replace(/[^a-z0-9]+/gi, '-') + '.png'));
        if (POPISKY) {
            const nalezy = await p.vyhodnot(`(${MERENI_POPISKU})(document.querySelector(${JSON.stringify(selektor)}))`);
            if (nalezy.length) console.log('   POPISKY ' + nazev + ': ' + nalezy.join(' | '));
            await p.snimek(path.join(vystup, 'panel-' + nazev.replace(/[^a-z0-9]+/gi, '-') + '.png'));
        }
        await hodnotaIhned(nazev, selektor);
    };
    const js = (kod) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; ${kod}; return true; })()`);
    const PANEL = '#kk-panel-otvoru';

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest formulare ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        await js(`const w1 = e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            const w5 = e.addWall(5*X, 0, 5*X, 8*X, 0.15, 'pricka');
            e.addOpening(w1.id, 1, 1.5, 'okno', { presnaSirka: true }); e.addOpening(w5.id, 3, 0.9, 'dvere', { presnaSirka: true });
            e.addOpening(w1.id, 7, 2.7, 'garazova_vrata', { presnaSirka: true });
            d.podlaziKopie = true; d.pridatPodlazi('nahoru'); d.naPodlazi('P1'); d.nastroj = 'vyber'; d.fitView(); d.renderer.render()`);
        await pauza(500);

        console.log('\n1) Nástroje');
        await js(`d.nastroj = 'stena'; d._selectionTick++`);
        await zmer('nástroj stěna', PANEL);
        await js(`d.nastroj = 'otvor'; d._selectionTick++`);
        await zmer('nástroj otvor', PANEL);
        await js(`d.nastroj = 'vyber'; d.zacniSchody(); d._selectionTick++`);
        await zmer('nástroj schody', PANEL);
        await js(`d._zrusRozkreslene?.(); d.nastroj = 'vyber'; d._selectionTick++`);

        console.log('\n2) Vybrané objekty');
        await js(`d.renderer.setSelection([[...e.walls.values()].find(w => w.typ === 'obvodova').id]); d._selectionTick++`);
        await zmer('stěna', PANEL);
        await js(`d.renderer.setSelection([], [], [[...e.openings.values()].find(o => o.typ === 'okno').id]); d._selectionTick++`);
        await zmer('okno', PANEL);
        await p.vyhodnot(`(() => { const n = document.querySelector('[data-barva-otvoru=ven] [data-barva-symbol]'); n?.click(); return true; })()`);
        await zmer('okno s otevřeným výběrem barvy', PANEL);
        await js(`d.renderer.setSelection([], [], [[...e.openings.values()].find(o => o.typ === 'dvere').id]); d._selectionTick++`);
        await zmer('vnitřní dveře', PANEL);
        await js(`d.renderer.setSelection([], [], [[...e.openings.values()].find(o => o.typ === 'garazova_vrata').id]); d._selectionTick++`);
        await zmer('vrata', PANEL);
        await js(`const m = e.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++`);
        await zmer('místnost', PANEL);
        await js(`d.zacniSchody(); d.schodyTvar = 'U'; const n = 'S1'; e.dum.schodiste.push({ id: n, odPodlazi: 'P1', doPodlazi: e.dum.podlazi.find(p => p.id !== 'P1').id, tvar: 'U', x: 2, y: -2, uhel: 0, sirka: 1, strana: 1 }); d.nastroj = 'vyber'; d.renderer.setSelection([]); d.renderer.selectedSchody.add(n); d.renderer.render(); d._selectionTick++`);
        await zmer('schody do U', PANEL);
        await p.snimek(path.join(vystup, 'formular-schody.png'));
        await js(`d.renderer.clearSelection(); e.dum.sloupy.push({ id: 'C1', podlazi: 'P1', x: 3, y: -3, sirka: 0.2, tvar: 'ctverec', uhel: 0 }); d.renderer.selectedSloupy.add('C1'); d.renderer.render(); d._selectionTick++`);
        await zmer('sloup', PANEL);
        await js(`d.nastroj = 'vyber'; d.zacniSloup(); d._selectionTick++`);
        await zmer('nástroj sloup', PANEL, true);   // jen nápověda, žádné pole
        await js(`d.nastroj = 'vyber'; d._selectionTick++`);
        // Úroveň podlahy je v panelu místnosti; přenesenou zvýšenou podlahu vypíše panel místnosti nad ní,
        // vlastní panel má jen tam, kde pod ní uzavřená místnost není
        await js(`d.renderer.setSelection([]); const m = e.mistnosti[0]; d.renderer.setSelection([], [], [], [], [], [], [m.id]); d.setMistnostUroven('typ', 'zvysena'); d._selectionTick++`);
        await zmer('místnost se zvýšenou podlahou', PANEL);
        await js(`d.naPodlazi(e.dum.podlazi.find(p => p.id !== 'P1').id)`);
        await pauza(400);
        await js(`const a = e.dum.plochy[0]; const q = d._plochaPoly(a); const sx = q.reduce((v, b) => v + b.x, 0) / q.length, sy = q.reduce((v, b) => v + b.y, 0) / q.length; d.renderer.setSelection([], [], [], [], [], [], [d.renderer.mistnostVBode(sx, sy)]); d._selectionTick++`);
        await zmer('místnost s přenesenou zvýšenou podlahou', PANEL);
        await js(`const a = e.dum.plochy[0]; d.renderer.setSelection([]); d.renderer.selectedPlochy.add(a.id); d.renderer.render(); d._selectionTick++`);
        await zmer('přenesená zvýšená podlaha', PANEL, true);   // jen zaškrtávátko a tlačítka, žádné pole
        await js(`d.naPodlazi('P1')`);
        await pauza(400);
        await js(`d.renderer.clearSelection(); d._selectionTick++`);

        console.log('\n3) Pravý panel');
        await js(`d.podlaziUprava = 'P1'`);
        await zmer('úprava podlaží', '#kk-podlazi-seznam');
        await js(`d.strechaVytvor(); d.podlaziUprava = 'strecha'; d.rezimStrecha = true; d._selectionTick++`);
        await zmer('střecha', '#kk-podlazi-seznam');
        await js(`const v = d._strechaVypocet(); d.strechaHrana = v.hrany.find(x => x.typ === 'okap').klic; d._selectionTick++`);
        await zmer('vybraná hrana střechy', '#kk-podlazi-seznam');
        await js(`d.rezimStrecha = false; d.strechaHrana = null; d.katastrParcely = [{ cislo: 'test' }]; d.podlaziUprava = 'zaklady'; d._selectionTick++`);
        await pauza(200);
        await js(`document.querySelector('[data-zaklady-panel] details').open = true`);
        await zmer('základy', '[data-zaklady-panel]');
        await js(`d.katastrParcely = []; d.podlaziUprava = null; d._selectionTick++`);

        await js(`const kus = d._katalogZaznam({ id: 'abo-B07124WMX5', nazev: 'Pohovka dvojsed, šedá', kategorie: 'pohovky', sirka: 2, hloubka: 1, vyska: 0.9 }, [3, -3], 0); d.engine.vybaveni.push(kus); d.renderer.setSelection([], [], [], [kus.id]); d._selectionTick++`);
        await pauza(200);
        await zmer('kus z katalogu', PANEL);
        await js(`d.engine.vybaveni.pop(); d.renderer.clearSelection(); d._selectionTick++`);

        console.log('\n4) Ostatní formuláře');
        await js(`d.rezimStrecha = false; d.strechaHrana = null; d.podlaziUprava = null; d.magnetPanel = true`);
        await zmer('nastavení magnetu', '#kk-magnet-panel', true);
        await js(`d.magnetPanel = false; d.panelOpen.parcela = true; d.panelOpen.objekty = true; d.panelOpen.podklad = true`);
        await pauza(200);
        await p.vyhodnot(`(() => { document.querySelector('[x-model=katastrCislo]').closest('details').setAttribute('data-parcela', ''); return true; })()`);
        await zmer('parcela', '[data-parcela]');
        await p.snimek(path.join(vystup, 'formular-parcela.png'));

        console.log('\n5) Hodnota ihned');
        const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const X = d.engine.PX_PER_M; const t = d.stage.getAbsoluteTransform().copy().point({ x: ${x} * X, y: ${y} * X });
            const r = d.stage.container().getBoundingClientRect(); return { x: r.left + t.x, y: r.top + t.y }; })()`);
        const klikNa = async (b) => {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
            await pauza(40);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
            await pauza(150);
        };
        const doPole = (sel) => p.vyhodnot(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); window.__pole = n; n.focus(); n.select(); return document.activeElement === n; })()`);
        const sklonHrany = (klic) => p.vyhodnot(`${D}._strechaVypocet().hrany.find(x => x.klic === ${JSON.stringify(klic)}).sklon`);
        await js(`d.rezimStrecha = false; d.strechaHrana = null; d.podlaziUprava = null; d.prepniUpravuStrechy(); d.fitView(); d.renderer.render(); d._selectionTick++`);
        await pauza(400);
        const hrany = await p.vyhodnot(`${D}._strechaVypocet().hrany.filter(x => x.typ === 'okap').slice(0, 2).map(h => ({ klic: h.klic, x: (h.a.x + h.b.x) / 2, y: (h.a.y + h.b.y) / 2 }))`);
        const [A, B] = hrany;
        const POLE_SKLON = '[data-hrana=sklon]';

        await klikNa(await naObr(A.x, A.y));
        const puvodniB = await sklonHrany(B.klic);
        const novyA = puvodniB === 33 ? 34 : 33;
        await doPole(POLE_SKLON);
        await napis(novyA);
        await klikNa(await naObr(B.x, B.y));   // bez čekání, přesně jak to dělá uživatel
        const po = await p.vyhodnot(`(() => { const d = ${D}; return { vybrana: d.strechaHrana, pole: document.querySelector(${JSON.stringify(POLE_SKLON)})?.value }; })()`);
        kontrola('klik na jinou hranu uloží hodnotu té předchozí', await sklonHrany(A.klic) === novyA, `hrana A ${await sklonHrany(A.klic)}°, čekáno ${novyA}°`);
        kontrola('nová hrana hodnotu nepřevzala a panel ukazuje její', po.vybrana === B.klic && await sklonHrany(B.klic) === puvodniB && po.pole === String(puvodniB), JSON.stringify(po));

        await doPole(POLE_SKLON);
        await napis(41);
        await pauza(PO_PAUZE);
        kontrola('hodnota je v modelu bez opuštění pole', await sklonHrany(B.klic) === 41 && await p.vyhodnot('document.activeElement === window.__pole'), `${await sklonHrany(B.klic)}°`);
        await p.vyhodnot('(window.__pole.blur(), 1)');
        await pauza(100);

        const zpetPred = await p.vyhodnot(`${D}.historie[${D}.historiePozice].id`);
        await doPole(POLE_SKLON);
        await napis(5);
        await pauza(PO_PAUZE);
        await napis(2);
        await pauza(PO_PAUZE);
        await p.vyhodnot('(window.__pole.blur(), 1)');
        await pauza(100);
        const kroku = await p.vyhodnot(`${D}.historiePozice - ${D}.historie.findIndex(k => k.id === ${JSON.stringify(zpetPred)})`);
        kontrola('pomalé psaní dá správnou hodnotu', await sklonHrany(B.klic) === 52, `${await sklonHrany(B.klic)}°`);
        kontrola('celá úprava pole je jeden krok Zpět', kroku === 1, `${kroku} kroků`);
        await p.vyhodnot(`(${D}.undo(), 1)`);
        await pauza(300);
        kontrola('Zpět vrátí hodnotu před úpravou', await sklonHrany(B.klic) === 41, `${await sklonHrany(B.klic)}°`);

        await js(`d.strechaHrana = ${JSON.stringify(B.klic)}; d._selectionTick++`);
        await pauza(200);
        await doPole(POLE_SKLON);
        await napis(99);
        await pauza(PO_PAUZE);
        kontrola('hodnota mimo rozsah při psaní nic nezmění', await sklonHrany(B.klic) === 41, `${await sklonHrany(B.klic)}°`);
        await p.vyhodnot('(window.__pole.blur(), 1)');
        await pauza(200);
        kontrola('po odchodu se omezí a pole ukáže výsledek', await sklonHrany(B.klic) === 75 && await p.vyhodnot(`document.querySelector(${JSON.stringify(POLE_SKLON)}).value`) === '75', `${await sklonHrany(B.klic)}°`);

        await js(`d.rezimStrecha = false; d.strechaHrana = null; d.naPodlazi('P1'); d.podlaziUprava = 'P1'; d._selectionTick++`);
        await pauza(300);
        const POLE_KOTA = '#kk-podlazi-seznam input[min="150"]';
        await doPole(POLE_KOTA);
        await napis('250.6');
        await pauza(PO_PAUZE);
        const psano = await p.vyhodnot('window.__pole.value');
        await p.vyhodnot('(window.__pole.blur(), 1)');
        await pauza(200);
        const poOdchodu = await p.vyhodnot(`document.querySelector(${JSON.stringify(POLE_KOTA)}).value`);
        kontrola('upravená hodnota se ukáže až po odchodu', psano === '250.6' && poOdchodu === '251', `${psano} → ${poOdchodu}`);
        await js(`d.podlaziUprava = null; d._selectionTick++`);

        await js(`d.renderer.setSelection([], [], [[...e.openings.values()].find(o => o.typ === 'okno').id]); d._selectionTick++`);
        await pauza(300);
        await p.vyhodnot(`(document.querySelector('[data-barva-otvoru=ven] [data-barva-symbol]').click(), 1)`);
        await pauza(250);
        const POLE_RAL = '[data-barva-otvoru=ven] [data-barva-ral]';
        await doPole(POLE_RAL);
        await napis('70');
        await pauza(PO_PAUZE);
        const rozepsany = await p.vyhodnot(`Alpine.$data(window.__pole).ralChyba`);
        await napis('16');
        await pauza(PO_PAUZE);
        const ral = await p.vyhodnot(`(() => { const a = Alpine.$data(window.__pole); return { hex: a.hex, cil: window.RAL_KLASIK.find(r => r.kod === '7016').hex }; })()`);
        kontrola('RAL: rozepsaný kód nehlásí chybu', !rozepsany, rozepsany);
        kontrola('RAL: dopsaný kód platí hned', ral.hex === ral.cil, JSON.stringify(ral));
        await p.vyhodnot('(window.__pole.blur(), 1)');

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
