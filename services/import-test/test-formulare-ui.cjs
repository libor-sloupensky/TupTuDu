/**
 * Zarovnání formulářů editoru: v každém řádku panelu stejná výška polí a jedna svislá osa
 * polí i nápisů. Prochází všechny panely, které editor umí ukázat.
 *
 * Spuštění: node services/import-test/test-formulare-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const TOL = 1.01;   // px

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
    const zmer = async (nazev, selektor, bezPoli = false) => {
        await pauza(350);
        const v = await p.vyhodnot(`(${MERENI})(document.querySelector(${JSON.stringify(selektor)}))`);
        kontrola(nazev, (v.poli > 0 || bezPoli) && v.vady.length === 0, `${v.poli} polí${v.vady.length ? ': ' + v.vady.join(' | ') : ''}`);
        if (v.vady.length) await p.snimek(path.join(vystup, 'formular-' + nazev.replace(/[^a-z0-9]+/gi, '-') + '.png'));
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

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
