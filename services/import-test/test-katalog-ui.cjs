/**
 * Katalog nábytku v editoru: panel, vložení do půdorysu, přichycení ke zdi, tažení po zdi, otočení,
 * kopie, Zpět, uložení, 3D, sdílení odkazem a stránka autorů.
 *
 * Spuštění: node services/import-test/test-katalog-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;
const POHOVKA = 'abo-' + JSON.parse(fs.readFileSync(path.join(__dirname, '../katalog/polozky.json'), 'utf8')).polozky.find(p => p.kategorie === 'pohovky').orig;

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

(async () => {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'katalog');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    // Klik na bod půdorysu v metrech přes skutečné události myši
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const s = d.stage; const r = s.container().getBoundingClientRect();
        return { x: r.left + ${x} * d.engine.PX_PER_M * s.scaleX() + s.x(), y: r.top + ${y} * d.engine.PX_PER_M * s.scaleY() + s.y() }; })()`);
    const mys = async (typ, b, tlacitko = 'left') => p.cmd('Input.dispatchMouseEvent', { type: typ, x: b.x, y: b.y, button: tlacitko, clickCount: typ === 'mouseMoved' ? 0 : 1 });
    const klikM = async (x, y) => { const b = await naObr(x, y); await mys('mouseMoved', b); await pauza(120); await mys('mousePressed', b); await pauza(60); await mys('mouseReleased', b); await pauza(300); };

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
            body: JSON.stringify({ nazev: 'ClaudeTest katalog ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');
        // Kontrola úložiště čte stažené soubory z měření prohlížeče, výchozích 250 záznamů zaplní náhledy katalogu
        await p.vyhodnot('performance.setResourceTimingBufferSize(5000), true');

        console.log('\n1) Panel katalogu');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 0, 8*X, 0, 0.4, 'obvodova'); e.addWall(8*X, 0, 8*X, 6*X, 0.4, 'obvodova');
            e.addWall(8*X, 6*X, 0, 6*X, 0.4, 'obvodova'); e.addWall(0, 6*X, 0, 0, 0.4, 'obvodova');
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++; return true; })()`);
        // Sekce si pamatuje stav z minula, klik ji musí otevřít, ne zavřít
        await p.vyhodnot(`(() => { const d = ${D}; if (d.panelOpen.katalog) document.querySelector('[data-katalog-tlacitko]').click(); return true; })()`);
        await pauza(300);
        await p.vyhodnot(`document.querySelector('[data-katalog-tlacitko]').click(); true`);
        await p.cekej(`!!${D}.katalog`, 15000, 'katalog.json');
        await pauza(500);
        const panel = await p.vyhodnot(`(() => { const d = ${D}; return { kusu: d.katalog.polozky.length, kategorii: d.katalog.kategorie.length, karet: document.querySelectorAll('[data-katalog-polozka]').length, videt: document.getElementById('kk-sekce-katalog').open }; })()`);
        kontrola('panel ukáže kategorii a katalog se načte', panel.videt && panel.karet > 0 && panel.kusu >= 100, JSON.stringify(panel));
        const hledani = await p.vyhodnot(`(async () => { const d = ${D}; d.katalogHledat = 'postel'; await new Promise(r => setTimeout(r, 150)); const n = d.katalogPolozky.length, vsechnyPostele = d.katalogPolozky.every(x => x.nazev.toLowerCase().includes('postel')); d.katalogHledat = ''; await new Promise(r => setTimeout(r, 150)); return { n, vsechnyPostele }; })()`);
        kontrola('hledání najde podle názvu napříč kategoriemi', hledani.n >= 5 && hledani.vsechnyPostele, JSON.stringify(hledani));
        const hledaniSkupina = await p.vyhodnot(`(async () => { const d = ${D}; const cekej = () => new Promise(r => setTimeout(r, 150)); d.katalogNastavSkupinu('technicke'); d.katalogHledat = 'regál'; await cekej();
            const vysledek = { n: d.katalogPolozky.length, jenPolice: d.katalogPolozky.every(x => ['police', 'skrine', 'svitidla'].includes(x.kategorie)), zapnuto: !document.getElementById('kk-katalog-skupina').disabled && !document.getElementById('kk-katalog-kategorie').disabled };
            const kat = document.getElementById('kk-katalog-kategorie'); kat.value = 'skrine'; kat.dispatchEvent(new Event('change')); await cekej(); vysledek.poZmene = d.katalogHledat;
            d.katalogNastavSkupinu(''); d.katalogKategorie = 'pohovky'; await cekej(); const znacka = document.querySelector('[data-katalog-prebarvit]'); vysledek.znacka = znacka ? znacka.style.top + '|' + znacka.style.bottom : null; return vysledek; })()`);
        kontrola('hledání ve skupině místností, výběry zůstanou zapnuté, kategorie hledání vymaže, značka přebarvení vpravo nahoře', hledaniSkupina.n > 0 && hledaniSkupina.jenPolice && hledaniSkupina.zapnuto && hledaniSkupina.poZmene === '' && hledaniSkupina.znacka === '3px|', JSON.stringify(hledaniSkupina));
        // Skupina místností nad kategoriemi (Libor 11. 11. 2026): volba přes skutečný select, kategorie se zúží
        const skupiny = await p.vyhodnot(`(async () => { const d = ${D}; const cekej = () => new Promise(r => setTimeout(r, 150));
            const sel = document.getElementById('kk-katalog-skupina'); const kat = document.getElementById('kk-katalog-kategorie');
            const zvol = async (v) => { sel.value = v; sel.dispatchEvent(new Event('change')); await cekej(); return { skupina: d.katalogSkupina, kategorie: d.katalogKategorie, volby: [...kat.options].map(o => o.value), vybrana: kat.value, karet: document.querySelectorAll('[data-katalog-polozka]').length }; };
            const nabidka = [...sel.options].map(o => o.value);
            const nocni = await zvol('nocni'); const denni = await zvol('denni'); const technicke = await zvol('technicke'); const vse = await zvol('');
            return { nabidka, nocni, denni, technicke, vse }; })()`);
        kontrola('nabídka: všechny místnosti a šest skupin', skupiny.nabidka.join() === ',denni,nocni,kuchyne,hygiena,vstup,technicke', skupiny.nabidka.join());
        kontrola('noční zóna nabídne postele první a kategorii přepne na ně', skupiny.nocni.volby[0] === 'postele' && skupiny.nocni.kategorie === 'postele' && skupiny.nocni.vybrana === 'postele' && !skupiny.nocni.volby.includes('pohovky') && skupiny.nocni.karet > 0, JSON.stringify(skupiny.nocni));
        kontrola('denní zóna bez postelí přepne na pohovky', skupiny.denni.kategorie === 'pohovky' && !skupiny.denni.volby.includes('postele'), JSON.stringify(skupiny.denni));
        kontrola('technické a sklady jen police, skříně a svítidla', skupiny.technicke.volby.join() === 'police,skrine,svitidla' && skupiny.technicke.kategorie === 'police', JSON.stringify(skupiny.technicke));
        // Koupelna a WC ze Sweet Home 3D (Plán 1, 11. 11. 2026): první ve skupině koupelen, kusy s autorem pro CC BY
        const koupelna = await p.vyhodnot(`(() => { const d = ${D}; d.katalogNastavSkupinu('hygiena'); const kusy = d.katalog.polozky.filter(x => x.kategorie === 'koupelna'); const r = { prvni: d.katalogKategorieVolby[0]?.id, kategorie: d.katalogKategorie, kusu: kusy.length, sAutorem: kusy.filter(x => x.autor && x.odkaz).length, zavesne: kusy.filter(x => x.uroven > 0).length, nazevEn: kusy.find(x => x.id === 'sh3d-pracka')?.nazevZdroj, vlastni: kusy.filter(x => x.zdroj === 'tuptudu').length }; d.katalogNastavSkupinu(''); d.katalogKategorie = 'pohovky'; return r; })()`);
        kontrola('koupelny a WC: kategorie Koupelna a WC první, aspoň 29 kusů (7 vlastních), autoři Blend Swap, závěsné kusy nad podlahou', koupelna.prvni === 'koupelna' && koupelna.kusu >= 29 && koupelna.vlastni >= 7 && koupelna.sAutorem >= 8 && koupelna.zavesne >= 5 && koupelna.nazevEn === 'Pračka', JSON.stringify(koupelna));
        kontrola('„Všechny místnosti“ vrátí všech 15 kategorií', skupiny.vse.volby.length === 15, String(skupiny.vse.volby.length));
        // Chybějící model: srozumitelná chyba s adresou místo {"isTrusted":true} a další pokus stahuje znovu
        const chybPred = (p.chyby || []).length;
        const chybi = await p.vyhodnot(`(async () => { const a = window.Katalog3d.nacti('sh3d-neexistuje'); const zprava = await a.then(() => '', e => e.message); const b = window.Katalog3d.nacti('sh3d-neexistuje'); await b.catch(() => {}); return { zprava, znovu: a !== b }; })()`);
        kontrola('chybějící model hlásí adresu a zkusí se znovu', /Model se nestáhl.*sh3d-neexistuje/.test(chybi.zprava) && chybi.znovu, JSON.stringify(chybi));
        // Očekávané 403 z S3 u neexistujícího modelu nejsou chyba stránky
        await pauza(300); if (p.chyby) p.chyby.splice(chybPred);
        // Vybraná místnost s druhem na plánu přepne nabídku na svou skupinu, bez druhu volbu nechá.
        // Panel místnosti má druhy po skupinách (optgroup), Jiná je nahoře zvlášť.
        const zVyberu = await p.vyhodnot(`(async () => { const d = ${D}; const cekej = () => new Promise(r => setTimeout(r, 150));
            const m = d.engine.mistnosti[0]; if (!m) return null;
            d.engine.nastavDruhMistnosti(m, 'sklep'); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; await cekej();
            const sklep = { skupina: d.katalogSkupina, kategorie: d.katalogKategorie, select: document.getElementById('kk-katalog-skupina').value };
            const druhSel = document.querySelector('[data-druh-mistnosti]');
            const panel = druhSel ? { skupin: druhSel.querySelectorAll('optgroup').length, prvni: druhSel.options[0].value, sklepVe: druhSel.querySelector('option[value=sklep]')?.parentElement.label, hodnota: druhSel.value } : null;
            d.engine.nastavDruhMistnosti(m, 'koupelna'); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; await cekej();
            const koupelna = { skupina: d.katalogSkupina, kategorie: d.katalogKategorie };
            d.engine.nastavDruhMistnosti(m, ''); d.renderer.setSelection([], [], [], [], [], [], [m.id]); d._selectionTick++; await cekej();
            const bezDruhu = d.katalogSkupina;
            d.renderer.clearSelection(); d.katalogNastavSkupinu(''); d.katalogKategorie = 'pohovky'; d._selectionTick++; await cekej();
            return { sklep, panel, koupelna, bezDruhu }; })()`);
        kontrola('panel místnosti: Jiná nahoře, šest skupin, sklep v technických', zVyberu?.panel && zVyberu.panel.skupin === 6 && zVyberu.panel.prvni === '' && zVyberu.panel.sklepVe === 'Technické a sklady' && zVyberu.panel.hodnota === 'sklep', JSON.stringify(zVyberu?.panel));
        kontrola('vybraný sklep přepne nabídku na technické, koupelna na koupelny (police v nich zůstanou), místnost bez druhu volbu nechá', zVyberu && zVyberu.sklep.skupina === 'technicke' && zVyberu.sklep.select === 'technicke' && zVyberu.koupelna.skupina === 'hygiena' && zVyberu.koupelna.kategorie === 'police' && zVyberu.bezDruhu === 'hygiena', JSON.stringify(zVyberu));
        await p.snimek(path.join(vystup, 'katalog-panel.png'));

        console.log('\n2) Vložení klikem a zarážka o zeď');
        await p.vyhodnot(`(() => { document.querySelector('[data-katalog-polozka="${POHOVKA}"]').click(); return true; })()`);
        await pauza(200);
        const kroky0 = await p.vyhodnot(`${D}.historie.length`);
        await klikM(4, 0.5);
        const vlozeno = await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni.find(x => x.katalog === '${POHOVKA}'); if (!v) return null; return { id: v.id, stred: v.stred, uhel: v.uhel, h: v.hloubka, s: v.sirka, nastroj: d.nastroj, vybrano: d.renderer.selectedVybaveni.has(v.id), kroku: d.historie.length, panel: !!d.katalogObjekt }; })()`);
        kontrola('klik vloží kus a vybere ho', vlozeno && vlozeno.vybrano && vlozeno.nastroj === 'vyber' && vlozeno.panel, JSON.stringify(vlozeno));
        kontrola('přidá jeden krok historie', vlozeno && vlozeno.kroku === kroky0 + 1, `${kroky0} → ${vlozeno?.kroku}`);
        // Horní stěna: osa y = 0, líc 0,2 m. Kus se o líc zastaví a zůstane rovně.
        kontrola('u zdi se zastaví o líc a neotočí se', vlozeno && Math.abs(-vlozeno.stred[1] - (0.2 + vlozeno.h / 2)) < 0.005 && Math.abs(vlozeno.uhel) < 0.01, `střed y ${(-vlozeno?.stred[1]).toFixed(3)}, čekáno ${(0.2 + vlozeno?.h / 2).toFixed(3)}, úhel ${vlozeno?.uhel}`);

        console.log('\n3) Tažení a zarážka');
        const tah = async (x0, y0, x1, y1) => { const a = await naObr(x0, y0), b = await naObr(x1, y1); await mys('mouseMoved', a); await pauza(80); await mys('mousePressed', a); await pauza(60);
            // První malý pohyb jen rozběhne tažení, editor ho počítá až od prahu
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + 6, y: a.y, button: 'left', buttons: 1 }); await pauza(40);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x, y: a.y, button: 'left', buttons: 1 }); await pauza(40);
            for (let i = 1; i <= 6; i++) { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6, button: 'left', buttons: 1 }); await pauza(40); }
            await mys('mouseReleased', b); await pauza(300); };
        const stavV = () => p.vyhodnot(`(() => { const v = ${D}.engine.vybaveni[0]; return { stred: v.stred, uhel: v.uhel, h: v.hloubka, s: v.sirka, xMax: Math.max(...v.polygon.map(q => q[0])), xMin: Math.min(...v.polygon.map(q => q[0])), yMax: Math.max(...v.polygon.map(q => -q[1])) }; })()`);
        const usad = (x, y, uhel) => p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; v.stred = [${x}, ${-y}]; v.uhel = ${uhel}; v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); d.renderer.setSelection([], [], [], [v.id]); d.renderer.render(); return true; })()`);
        const sy = -vlozeno.stred[1];
        await tah(4, sy, 5, sy - 0.1);
        const poTahu = await stavV();
        kontrola('podél zdi klouže a drží se jí', Math.abs(poTahu.stred[0] - 5) < 0.12 && Math.abs(-poTahu.stred[1] - sy) < 0.005, JSON.stringify(poTahu.stred));
        // Scénář z připomínky: gauč tlačený bokem do zdi. Líc pravé zdi je na x = 7,8.
        await usad(5, 3, 0);
        await tah(5, 3, 7.6, 3);
        const bokem = await stavV();
        kontrola('bokem do zdi neproteče a neotočí se', bokem.xMax <= 7.801 && bokem.xMax > 7.79 && Math.abs(bokem.uhel) < 0.01, JSON.stringify({ xMax: bokem.xMax, uhel: bokem.uhel }));
        await usad(5, 3, 30);
        await tah(5, 3, 7.5, 3);
        const sikmo = await stavV();
        kontrola('otočený kus se zastaví rohem o zeď', sikmo.xMax <= 7.801 && sikmo.xMax > 7.78 && Math.abs(sikmo.uhel - 30) < 0.01, JSON.stringify({ xMax: sikmo.xMax, uhel: sikmo.uhel }));
        await usad(6.5, 5, 0);
        await tah(6.5, 5, 7.5, 5.9);
        const roh = await stavV();
        kontrola('v rohu se zastaví o obě zdi', roh.xMax <= 7.801 && roh.yMax <= 5.801, JSON.stringify({ xMax: roh.xMax, yMax: roh.yMax }));
        // Přes osu zdi kus přeskočí, jinak by nešel přesunout do vedlejší místnosti
        await usad(6.81, 3, 0);
        await tah(6.81, 3, 9.5, 3);
        const preskok = await stavV();
        kontrola('když střed přejde přes osu zdi, přeskočí celý na druhou stranu', preskok.xMin >= 8.199, JSON.stringify({ xMin: preskok.xMin }));
        await usad(5, 3, 0);
        await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; v.uhel = 0; d.katalogOtoc(); v.stred = [7.5, -3]; v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, v.uhel); d.katalogOtoc(); return true; })()`);
        const poOtoceni = await stavV();
        kontrola('otočení u zdi kus vysune ze zdi', poOtoceni.xMax <= 7.801, JSON.stringify({ xMax: poOtoceni.xMax, uhel: poOtoceni.uhel }));
        await usad(5, 3, 0);
        await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; d.renderer.render(); return true; })()`);
        const altBod = await naObr(5, 3), altCil = await naObr(7.6, 3);
        await mys('mouseMoved', altBod); await pauza(80);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: altBod.x, y: altBod.y, button: 'left', clickCount: 1, modifiers: 1 }); await pauza(60);
        for (let i = 1; i <= 6; i++) { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: altBod.x + (altCil.x - altBod.x) * i / 6, y: altBod.y, button: 'left', buttons: 1, modifiers: 1 }); await pauza(40); }
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: altCil.x, y: altCil.y, button: 'left', clickCount: 1, modifiers: 1 }); await pauza(300);
        const sAlt = await stavV();
        kontrola('s Altem zarážka neplatí', sAlt.xMax > 7.9, JSON.stringify({ xMax: sAlt.xMax }));
        await usad(3.5, 2, 0);
        await p.snimek(path.join(vystup, 'katalog-pudorys.png'));

        console.log('\n3b) Přetažení z panelu');
        const karta = (id) => p.vyhodnot(`(() => { const e = document.querySelector('[data-katalog-polozka="' + ${JSON.stringify('')} + '"]') || document.querySelector('[data-katalog-polozka="${POHOVKA}"]'); e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
        const pretahni = async (cil) => { const a = await karta(); await mys('mouseMoved', a); await pauza(60); await mys('mousePressed', a); await pauza(40);
            for (let i = 1; i <= 8; i++) { await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a.x + (cil.x - a.x) * i / 8, y: a.y + (cil.y - a.y) * i / 8, button: 'left', buttons: 1 }); await pauza(40); }
            return cil; };
        const pred = await p.vyhodnot(`${D}.engine.vybaveni.length`);
        const cilP = await naObr(5.5, 4);
        await pretahni(cilP);
        const zaTahu = await p.vyhodnot(`(() => { const d = ${D}; return { nastroj: d.nastroj, vybrany: !!d.katalogVybrany, kusu: d.engine.vybaveni.length }; })()`);
        kontrola('během tažení je kus připravený a ještě není vložený', zaTahu.nastroj === 'katalog' && zaTahu.vybrany && zaTahu.kusu === pred, JSON.stringify(zaTahu));
        await p.snimek(path.join(vystup, 'katalog-tazeni.png'));
        await mys('mouseReleased', cilP); await pauza(350);
        const poPusteni = await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[d.engine.vybaveni.length - 1]; return { kusu: d.engine.vybaveni.length, stred: v.stred, nastroj: d.nastroj, vybrano: d.renderer.selectedVybaveni.has(v.id), nahled: !!document.querySelector('body > img[style*="fixed"]') }; })()`);
        kontrola('puštěním v půdorysu se kus vloží na místo kurzoru a vybere', poPusteni.kusu === pred + 1 && Math.abs(poPusteni.stred[0] - 5.5) < 0.05 && Math.abs(-poPusteni.stred[1] - 4) < 0.05 && poPusteni.vybrano && poPusteni.nastroj === 'vyber' && !poPusteni.nahled, JSON.stringify(poPusteni));
        await p.vyhodnot(`${D}.katalogSmaz(); true`);
        await pauza(200);
        const mimo = await karta();
        await pretahni({ x: mimo.x + 20, y: mimo.y + 40 });
        await mys('mouseReleased', { x: mimo.x + 20, y: mimo.y + 40 }); await pauza(300);
        const zrusene = await p.vyhodnot(`(() => { const d = ${D}; return { kusu: d.engine.vybaveni.length, nastroj: d.nastroj, vybrany: !!d.katalogVybrany }; })()`);
        kontrola('puštění mimo půdorys nic nevloží', zrusene.kusu === pred && zrusene.nastroj === 'vyber' && !zrusene.vybrany, JSON.stringify(zrusene));

        console.log('\n3c) Přesný klik');
        await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; v.stred = [4, -3]; v.uhel = 30; v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, 30); d.renderer.clearSelection(); d.renderer.render(); return true; })()`);
        await pauza(200);
        const vybrano = () => p.vyhodnot(`${D}.renderer.selectedVybaveni.size`);
        const obalK = await p.vyhodnot(`(() => { const v = ${D}.engine.vybaveni[0]; const xs = v.polygon.map(q => q[0]), ys = v.polygon.map(q => -q[1]); return { x: Math.max(...xs), y: Math.min(...ys) }; })()`);
        await klikM(4 + (obalK.x - 4) * 0.85, 3 + (obalK.y - 3) * 0.85);
        kontrola('roh obálky mimo otočený kus klik nechytí', (await vybrano()) === 0);
        await klikM(4, 3);
        kontrola('střed otočeného kusu klik chytí', (await vybrano()) === 1);
        await p.vyhodnot(`(() => { const d = ${D}; const k = d.katalog.polozky.find(x => x.kategorie === 'koberce'); const s = d.katalog.polozky.find(x => x.kategorie === 'stolky' && x.sirka < 1); const a = d._katalogZaznam(k, [6, -4], 0), b = d._katalogZaznam(s, [6, -4], 0); d.engine.vybaveni.push(b, a); d.renderer.clearSelection(); d.renderer.render(); window.__kusy = { koberec: a.id, stolek: b.id, kw: k.sirka }; return true; })()`);
        await pauza(200);
        await klikM(6, 4);
        const naStolku = await p.vyhodnot(`(() => { const r = ${D}.renderer; return r.selectedVybaveni.has(window.__kusy.stolek); })()`);
        kontrola('menší kus na koberci jde chytit, i když je koberec vložený později', naStolku === true);
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d.renderer.render(); return true; })()`);
        await pauza(100);
        await klikM(6 - 0.45 * (await p.vyhodnot('window.__kusy.kw')), 4);
        const naKoberci = await p.vyhodnot(`${D}.renderer.selectedVybaveni.has(window.__kusy.koberec)`);
        kontrola('koberec jde chytit vedle kusu', naKoberci === true);
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.removeVybaveni(window.__kusy.koberec); d.engine.removeVybaveni(window.__kusy.stolek); const v = d.engine.vybaveni[0]; v.stred = [3.5, -2]; v.uhel = 0; v.polygon = d._katalogPolygon(v.stred, v.sirka, v.hloubka, 0); d.renderer.setSelection([], [], [], [v.id]); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(200);

        console.log('\n3c2) Magnet otáčení ke zdi');
        // Šikmá stěna pod úhlem 30°, ostatní stěny jsou rovně. Kus se točí za madlo skutečnými událostmi myši.
        const sikmaZed = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine, X = e.PX_PER_M; const w = e.addWall(1 * X, 4.5 * X, (1 + 2 * Math.cos(Math.PI / 6)) * X, (4.5 + 2 * Math.sin(Math.PI / 6)) * X, 0.1, 'pricka'); d.renderer.render(); return w.id; })()`);
        const otocNa = async (cil, sAltem = false) => {
            await usad(3.5, 2, 0);
            await p.vyhodnot(`(() => { ${D}._selectionTick++; ${D}.renderer.render(); return true; })()`);
            await pauza(300);
            const h = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.renderRotateHandle(d._rotateBbox(), null); const b = d._rotateBbox(), s = d.stage.scaleX(), X = d.engine.PX_PER_M; const vv = (b.handleLocalV >= 0 ? 1 : -1) * (b.halfH + 12 / s + 28 / s); return { hx: (b.cx - Math.sin(b.angle) * vv) / X, hy: (b.cy + Math.cos(b.angle) * vv) / X, cx: b.cx / X, cy: b.cy / X }; })()`);
            await pauza(100);
            const dx = h.hx - h.cx, dy = h.hy - h.cy, R = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx);
            const mod = sAltem ? { modifiers: 1 } : {};
            const b0 = await naObr(h.hx, h.hy);
            await mys('mouseMoved', b0); await pauza(80);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b0.x, y: b0.y, button: 'left', clickCount: 1, ...mod }); await pauza(60);
            for (let i = 1; i <= 6; i++) {
                const a = a0 + (cil * Math.PI / 180) * i / 6;
                const b = await naObr(h.cx + Math.cos(a) * R, h.cy + Math.sin(a) * R);
                await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, button: 'left', buttons: 1, ...mod }); await pauza(40);
            }
            const koncovy = await naObr(h.cx + Math.cos(a0 + cil * Math.PI / 180) * R, h.cy + Math.sin(a0 + cil * Math.PI / 180) * R);
            const zaTahuCara = await p.vyhodnot(`!!${D}._snapPreview?.line`);
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: koncovy.x, y: koncovy.y, button: 'left', clickCount: 1, ...mod }); await pauza(250);
            return { uhel: +(await p.vyhodnot(`${D}.engine.vybaveni[0].uhel`)).toFixed(2), cara: zaTahuCara };
        };
        const naSikmou = await otocNa(28);
        kontrola('poblíž rovnoběžky se šikmou zdí kus zaskočí a ukáže čáru', Math.abs(naSikmou.uhel - 30) < 0.05 && naSikmou.cara, JSON.stringify(naSikmou));
        const kolmo = await otocNa(118);
        kontrola('zaskočí i kolmo ke zdi', Math.abs(kolmo.uhel - 120) < 0.05, JSON.stringify(kolmo));
        const rovne = await otocNa(88);
        kontrola('zaskočí k rovné zdi', Math.abs(rovne.uhel - 90) < 0.05 && rovne.cara, JSON.stringify(rovne));
        const volne = await otocNa(60 - 15);
        kontrola('mimo zdi se točí volně', Math.abs(volne.uhel - 45) < 1.1 && !volne.cara, JSON.stringify(volne));
        const sAltem = await otocNa(28, true);
        kontrola('s Altem magnet neplatí', Math.abs(sAltem.uhel - 28) < 1.1 && !sAltem.cara, JSON.stringify(sAltem));
        // Nový kus se natočí podle nejbližší zdi, tlačítko 90° kus stojící nakřivo srovná se zdí (Libor 11. 11. 2026)
        const podleZdi = await p.vyhodnot(`(() => { const d = ${D}; const u = d._katalogUhelZdi([1.9, -4.85]), rovne = d._katalogUhelZdi([4, -0.6]); const v = d.engine.vybaveni[0]; const u0 = v.uhel; v.stred = [3.5, -2.5]; v.uhel = 10; d.renderer.setSelection([], [], [], [v.id]); d._selectionTick++; d.katalogOtoc(); const po = v.uhel; d.katalogOtoc(); const po2 = v.uhel; v.uhel = u0; return { u: +u.toFixed(2), rovne, po, po2 }; })()`);
        kontrola('vložení se natočí podle nejbližší zdi, 90° srovná kus nakřivo', Math.abs(podleZdi.u - 30) < 0.01 && podleZdi.rovne === 0 && podleZdi.po === 90 && podleZdi.po2 === 180, JSON.stringify(podleZdi));
        // Pravoúhlá místnost: rovnoběžně i kolmo zaskočí ke stejné, nejbližší stěně, čára se nepřepíná (Libor 11. 11. 2026)
        const jednaCara = await p.vyhodnot(`(() => { const d = ${D}; const X = d.engine.PX_PER_M, s = { x: 4 * X, y: 0.6 * X }; const a = d._magnetOtoceni(0.02, s, d._silaUhlu(5)), b = d._magnetOtoceni(Math.PI / 2 + 0.02, s, d._silaUhlu(5)), c = d._magnetOtoceni(0.02, { x: 7.5 * X, y: 3 * X }, d._silaUhlu(5)); return { a: a && [+a.uhel.toFixed(4), +a.smer.toFixed(4)], b: b && [+b.uhel.toFixed(4), +b.smer.toFixed(4)], c: c && +Math.abs(Math.sin(c.smer)).toFixed(4) }; })()`);
        kontrola('u horní stěny vede čára vodorovně při 0° i 90°, u pravé svisle', jednaCara.a && jednaCara.b && jednaCara.a[0] === 0 && Math.abs(jednaCara.b[0] - 1.5708) < 1e-3 && Math.abs(Math.sin(jednaCara.a[1])) < 1e-3 && Math.abs(Math.sin(jednaCara.b[1])) < 1e-3 && jednaCara.c === 1, JSON.stringify(jednaCara));
        await p.vyhodnot(`(() => { const d = ${D}; d.engine.removeWall(${JSON.stringify(sikmaZed)}); return true; })()`);
        await usad(3.5, 2, 0);
        await p.vyhodnot(`(() => { ${D}._selectionTick++; return true; })()`);
        await pauza(200);

        console.log('\n3d) Rozměry v cm a %');
        const zadej = (osa, jednotka, hodnota) => p.vyhodnot(`(async () => { const i = document.querySelector('[data-katalog-rozmer=${osa}] [data-jednotka=${jednotka}]'); i.value = '${hodnota}'; i.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 200)); return true; })()`);
        const rozmer = () => p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; const pole = (o, j) => document.querySelector('[data-katalog-rozmer=' + o + '] [data-jednotka=' + j + ']').value; return { s: v.sirka, h: v.hloubka, v: v.vyska, z: v.zaklad, scm: pole('sirka', 'cm'), spct: pole('sirka', 'procenta'), hcm: pole('hloubka', 'cm'), hpct: pole('hloubka', 'procenta'), vpct: pole('vyska', 'procenta'), retez: d.katalogRetez }; })()`);
        const r0 = await rozmer();
        kontrola('panel ukazuje rozměry v cm a 100 %', +r0.scm === Math.round(r0.s * 100) && +r0.spct === 100 && r0.retez === true, JSON.stringify(r0));
        await zadej('sirka', 'procenta', 150);
        const r1 = await rozmer();
        kontrola('se spojeným řetízkem změna v % změní všechny rozměry a cm se dopočítají', Math.abs(r1.s - r0.s * 1.5) < 0.002 && Math.abs(r1.h - r0.h * 1.5) < 0.002 && Math.abs(r1.v - r0.v * 1.5) < 0.002 && +r1.scm === Math.round(r1.s * 100) && +r1.hpct === 150, JSON.stringify(r1));
        await zadej('sirka', 'cm', Math.round(r0.s * 100));
        const r2 = await rozmer();
        kontrola('změna v cm přepočítá % a vrátí poměr', Math.abs(r2.s - r0.s) < 0.006 && Math.abs(+r2.spct - 100) <= 1 && Math.abs(+r2.vpct - 100) <= 1, JSON.stringify(r2));
        await p.vyhodnot(`document.querySelector('[data-katalog-retez]').click(); true`);
        await pauza(150);
        await zadej('hloubka', 'cm', 150);
        const r3 = await rozmer();
        kontrola('rozpojený řetízek mění jen zadaný rozměr, kus zůstane mimo zeď', Math.abs(r3.h - 1.5) < 0.002 && Math.abs(r3.s - r2.s) < 0.002 && r3.retez === false, JSON.stringify(r3));
        const obrys = await p.vyhodnot(`(() => { const v = ${D}.engine.vybaveni[0]; const a = v.polygon[0], b = v.polygon[1], c = v.polygon[3]; return { w: Math.hypot(a[0] - b[0], a[1] - b[1]), h: Math.hypot(a[0] - c[0], a[1] - c[1]) }; })()`);
        kontrola('obrys v půdorysu má nový rozměr', Math.abs(obrys.w - r3.s) < 0.002 && Math.abs(obrys.h - r3.h) < 0.002, JSON.stringify(obrys));
        await p.vyhodnot(`document.querySelector('[data-katalog-puvodni]').click(); true`);
        await pauza(200);
        const r4 = await rozmer();
        kontrola('tlačítko Původní vrátí rozměry', Math.abs(r4.s - r0.s) < 0.001 && Math.abs(r4.h - r0.h) < 0.001 && Math.abs(r4.v - r0.v) < 0.001, JSON.stringify(r4));
        await zadej('vyska', 'cm', 120);
        const znacka = await p.vyhodnot(`(async () => { const img = new Image(); img.crossOrigin = 'anonymous'; img.src = Katalog3d.soubor('pudorys/${POHOVKA}.webp'); await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; const g = c.getContext('2d'); g.drawImage(img, 0, 0); const b = g.getImageData(0, 0, c.width, c.height).data; let plne = 0, bile = 0; for (let i = 0; i < b.length; i += 4) { if (b[i + 3] < 128) continue; plne++; if (b[i] > 245 && b[i + 1] > 245 && b[i + 2] > 245) bile++; } return { plne, podilBile: +(bile / plne).toFixed(3) }; })()`);
        kontrola('značka v půdorysu je barevná, ne bílá', znacka.plne > 100 && znacka.podilBile < 0.2, JSON.stringify(znacka));
        const uloziste = await p.vyhodnot(`(() => { const d = ${D}; d.renderer.render(); return { model: Katalog3d.adresa('x'), znacek: [...performance.getEntriesByType('resource')].filter(z => z.name.includes('/pudorys/')).map(z => z.name.split('/')[2]) }; })()`);
        kontrola('modely a značky jdou z úložiště S3', /^https:\/\/tuptudu-katalog\.s3\./.test(uloziste.model) && uloziste.znacek.length > 0 && uloziste.znacek.every(h => h.startsWith('tuptudu-katalog.s3.')), JSON.stringify(uloziste));
        const png = await p.vyhodnot(`(async () => { const d = ${D}; d.renderer.render(); await new Promise(r => setTimeout(r, 800)); try { return Konva.stages[0].toDataURL().length; } catch (e) { return e.name; } })()`);
        kontrola('půdorys se značkou z úložiště jde uložit jako obrázek', typeof png === 'number' && png > 1000, String(png));

        console.log('\n4) Panel kusu, kopie, Zpět a uložení');
        const uprava = await p.vyhodnot(`(async () => { const d = ${D}; const c = () => new Promise(r => setTimeout(r, 150));
            const u0 = d.engine.vybaveni[0].uhel; document.querySelector('[data-katalog-otoc]').click(); await c();
            const u1 = d.engine.vybaveni[0].uhel; document.querySelector('[data-katalog-kopie]').click(); await c();
            const po = d.engine.vybaveni.length; d.undo(); await c(); const zpet = d.engine.vybaveni.length; d.redo(); await c();
            return { u0, u1, po, zpet, ted: d.engine.vybaveni.length, nazev: d.engine.vybaveni[0].nazev }; })()`);
        await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni[0]; d.renderer.setSelection([], [], [], [v.id]); d._selectionTick++; return true; })()`);
        const kopieVedle = await p.vyhodnot(`(() => { const [a, b] = ${D}.engine.vybaveni; const k = Math.hypot(b.stred[0] - a.stred[0], b.stred[1] - a.stred[1]); const c = b.uhel * Math.PI / 180; return { vzdalenost: +k.toFixed(3), cekano: +(a.sirka + 0.1).toFixed(3), stejneOdZdi: Math.abs((b.stred[0] - a.stred[0]) * Math.sin(c) + (b.stred[1] - a.stred[1]) * Math.cos(c)) < 0.001 }; })()`);
        kontrola('kopie stojí vedle originálu podél jeho šířky', Math.abs(kopieVedle.vzdalenost - kopieVedle.cekano) < 0.001 && kopieVedle.stejneOdZdi, JSON.stringify(kopieVedle));
        kontrola('otočení o 90°, kopie a Zpět fungují', Math.abs(((uprava.u1 - uprava.u0 + 360) % 360) - 90) < 0.1 && uprava.po === 2 && uprava.zpet === 1 && uprava.ted === 2, JSON.stringify(uprava));
        const barva = await p.vyhodnot(`(async () => { const d = ${D}; const c = () => new Promise(r => setTimeout(r, 200)); await c();
            const v = d.engine.vybaveni[0]; const n = document.querySelectorAll('[data-katalog-barva]').length;
            document.querySelector('[data-katalog-barva="zelena"]').click(); await c();
            const po = d.engine.vybaveni[0].barva, oznaceno = document.querySelector('[data-katalog-barva="zelena"]').getAttribute('aria-pressed');
            d.undo(); await c(); const zpet = d.engine.vybaveni[0].barva ?? ''; d.redo(); await c();
            const znacka = await Katalog3d.prebarviZnacku(v.katalog, 'zelena');
            return { n, po, oznaceno, zpet, ted: d.engine.vybaveni[0].barva, znacka: !!(znacka && znacka.getContext) }; })()`);
        kontrola('paleta potahu: barva se nastaví, jde vrátit a značka se přebarví', barva.n > 5 && barva.po === 'zelena' && barva.oznaceno === 'true' && barva.zpet === '' && barva.ted === 'zelena' && barva.znacka, JSON.stringify(barva));
        const barva2 = await p.vyhodnot(`(async () => { const d = ${D}; const c = () => new Promise(r => setTimeout(r, 200)); await c();
            const v = d.engine.vybaveni[0]; d.renderer.setSelection([], [], [], [v.id]); d._selectionTick++; await c();
            const panel = !!document.querySelector('[data-katalog-barva=""]');
            document.querySelector('[data-katalog-barva=""]').click(); await c(); const puvodni = v.barva ?? '';
            d.katalogBarva('#3366aa'); await c(); const vlastni = d.engine.vybaveni[0].barva, hex = d.inspector.barvaHex;
            const mapa = await Katalog3d.prebarvi(v.katalog, '#3366aa');
            const nastroj = !!document.querySelector('[data-katalog-vlastni] [x-data], [data-katalog-vlastni] button');
            // Paleta se otevře vpravo vedle panelu, kód #rrggbb jde vložit a barva se tím přenese
            document.querySelector('[data-katalog-paleta]').click(); await c();
            const okno = document.querySelector('[data-katalog-paleta-okno]').getBoundingClientRect(), pan = document.getElementById('kk-panel-otvoru').getBoundingClientRect();
            const vedle = okno.left >= pan.right && Math.abs(okno.top - pan.top) < 2 && okno.bottom <= innerHeight;
            const retez = document.querySelector('[data-katalog-retez]').getAttribute('style') || '';
            document.querySelector('[data-katalog-vlastni] [data-barva-symbol]').click(); await c();
            const kod = document.querySelector('[data-katalog-vlastni] [data-barva-hex]'); kod.focus(); kod.value = 'A0BBA0'; kod.dispatchEvent(new Event('change', { bubbles: true })); kod.blur(); await c();
            const prenos = d.engine.vybaveni[0].barva, kodPole = kod.value;
            const okno2 = document.querySelector('[data-katalog-paleta-okno]').getBoundingClientRect();
            const vejde = okno2.bottom <= innerHeight + 1;
            document.querySelector('[data-katalog-paleta]').click(); await c();
            d.katalogBarva('zelena'); await c();
            const obj = d.seznamObjektu.find(o => o.id === v.id);
            d.renderer.clearSelection(); d._selectionTick++; await c();
            d.vyberObjekt(v.id); await c();
            const vybrany = d.katalogObjekt?.id === v.id;
            const znackyByly = d.renderer.showIds; d.renderer.showIds = true; d.renderer.render(); await c();
            const stitek = d.renderer._labelShapes?.get('id_' + v.id)?.text?.();
            d.renderer.showIds = znackyByly; d.renderer.render();
            const karty = document.querySelectorAll('[data-katalog-prebarvit]').length, sMaskou = d.katalog.polozky.filter(x => x.maska).length;
            return { puvodni, vlastni, hex, mapa: mapa.size, nastroj, vedle, retez, prenos, kodPole, vejde, oznaceni: obj?.oznaceni, typ: obj?.type, vybrany, stitek, karty, sMaskou }; })()`);
        kontrola('původní barva, vlastní barva z nástroje na barvu', barva2.puvodni === '' && barva2.vlastni === '#3366aa' && barva2.hex === '#3366aa' && barva2.mapa > 0 && barva2.nastroj, JSON.stringify(barva2));
        kontrola('paleta vedle panelu, celá v okně, řetízek bez oranžové', barva2.vedle && barva2.vejde && !/primary/.test(barva2.retez), JSON.stringify(barva2));
        kontrola('kód barvy #a0bba0 jde vložit a barva se přenese', barva2.prenos === '#a0bba0' && barva2.kodPole === '#a0bba0', JSON.stringify(barva2));
        kontrola('kus má označení M, je v Objektech a jde z nich vybrat', /^M\d+$/.test(barva2.oznaceni || '') && barva2.typ === 'kus' && barva2.vybrany && barva2.stitek === barva2.oznaceni, JSON.stringify(barva2));
        const lista = await p.vyhodnot(`(async () => { const d = ${D}, c = () => new Promise(r => setTimeout(r, 150)), v = d.engine.vybaveni[0];
            const svit = () => [...document.querySelectorAll('.kk-lista > div:first-child .kk-tl-aktivni')].length;
            const bylo = d.panelOpen.katalog, n0 = d.nastroj;
            if (!d.panelOpen.katalog) await d.prepniKatalog(); await c(); const katalog = svit();
            d.nastroj = 'otvor'; await c(); const otvor = svit();
            await d.prepniKatalog(); await c(); const zpet = [svit(), d.nastroj, d.panelOpen.katalog];
            d.nastroj = n0; if (d.panelOpen.katalog !== bylo) await d.prepniKatalog(); await c();
            d.zvyrazniObjekt(v.id); const najeti = !!d.renderer._hoverKus; d.zvyrazniObjekt(null); const pryc = !d.renderer._hoverKus;
            return { katalog, otvor, zpet, najeti, pryc }; })()`);
        kontrola('v liště svítí vždy jen jedna ikona', lista.katalog === 1 && lista.otvor === 1 && lista.zpet[0] === 1 && lista.zpet[1] === 'vyber' && lista.zpet[2] === true, JSON.stringify(lista));
        kontrola('najetí na kus v Objektech ho zvýrazní', lista.najeti && lista.pryc, JSON.stringify(lista));
        kontrola('karty katalogu ukazují, že jde přebarvit', barva2.sMaskou > 0, JSON.stringify({ karty: barva2.karty, sMaskou: barva2.sMaskou }));
        await p.vyhodnot(`(() => { const d = ${D}; d.katalogVyber(d.katalog.polozky.find(x => x.kategorie === 'stoly')); return true; })()`);
        await klikM(2, 1);
        const stul = await p.vyhodnot(`(() => { const d = ${D}; const v = d.engine.vybaveni.find(x => x.kategorie === 'stoly'); return { y: -v.stred[1], uhel: v.uhel }; })()`);
        kontrola('stůl zůstane, kam ho uživatel dal', Math.abs(stul.y - 1) < 0.03 && stul.uhel === 0, JSON.stringify(stul));
        await pauza(1500);
        await p.vyhodnot(`(async () => { const d = ${D}; if (d.ulozitNyni) await d.ulozitNyni(); else if (d._ulozit) await d._ulozit(); return true; })()`);
        await pauza(2500);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'znovu');
        await pauza(1500);
        const poNacteni = await p.vyhodnot(`${D}.engine.vybaveni.map(v => ({ k: v.katalog, n: v.nazev, u: v.uroven, b: v.barva }))`);
        kontrola('po znovuotevření jsou kusy zpět i s katalogem', poNacteni.length === 3 && poNacteni.every(v => v.k && v.n), JSON.stringify(poNacteni).slice(0, 200));
        kontrola('barva potahu se uloží', poNacteni.filter(v => v.b === 'zelena').length === 1, JSON.stringify(poNacteni.map(v => v.b)));

        console.log('\n5) 3D');
        await p.vyhodnot(`(async () => { const d = ${D}; await d.prepni3d(); await new Promise(r => setTimeout(r, 300)); return true; })()`);
        await p.cekej(`(() => { let n = 0; window._kk3d.wallGroup.traverse(o => { if (o.userData?.katalog && o.children.length) n++; }); return n === 3; })()`, 30000, 'modely ve 3D');
        await pauza(800);
        const d3 = await p.vyhodnot(`(() => { const T = window.THREE, g = window._kk3d.wallGroup; const vysl = []; g.traverse(o => { if (!o.userData?.katalog) return; o.updateMatrixWorld(true); const b = new T.Box3().setFromObject(o), s = b.getSize(new T.Vector3()); const k = o.userData.katalog; const m = []; o.traverse(c => { if (c.isMesh) m.push(c); });
            vysl.push({ id: k.id, spodek: +b.min.y.toFixed(3), sirka: +Math.max(s.x, s.z).toFixed(2), cekano: +Math.max(k.sirka, k.hloubka).toFixed(2), stin: m.every(c => c.castShadow), textura: m.some(c => c.material.map), vyskaBox: +s.y.toFixed(2), vyskaCekano: +k.vyska.toFixed(2) }); });
            return vysl; })()`);
        kontrola('modely stojí na podlaze, ve správné velikosti a vrhají stín', d3.length === 3 && d3.every(v => Math.abs(v.spodek) < 0.02 && Math.abs(v.sirka - v.cekano) < 0.03 && v.stin), JSON.stringify(d3).slice(0, 300));
        kontrola('mají texturu', d3.every(v => v.textura), '');
        kontrola('změněná výška sedí i ve 3D', d3.every(v => Math.abs(v.vyskaBox - v.vyskaCekano) < 0.03) && d3.some(v => v.vyskaCekano === 1.2), JSON.stringify(d3.map(v => [v.vyskaBox, v.vyskaCekano])));
        // Stůl je v půdorysu kolem [2; 1]: stejné místo musí vyjít i ve 3D
        const poloha = await p.vyhodnot(`(() => { const T = window.THREE; let o = null; window._kk3d.wallGroup.traverse(x => { if (x.userData?.katalog && !o) { const v = ${D}.engine.vybaveni.find(q => q.katalog === x.userData.katalog.id && q.kategorie === 'stoly'); if (v) o = x; } }); const p = o.getWorldPosition(new T.Vector3()); return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) }; })()`);
        await pauza(800);
        const barva3d = await p.vyhodnot(`(() => { let n = 0; window._kk3d.wallGroup.traverse(o => { if (o.isMesh && o.material?.map?.image instanceof HTMLCanvasElement) n++; }); return n; })()`);
        kontrola('přebarvený kus má ve 3D přebarvenou texturu', barva3d > 0, String(barva3d));
        kontrola('poloha ve 3D odpovídá půdorysu', Math.abs(poloha.x - 2) < 0.05 && Math.abs(poloha.z - 1) < 0.05, JSON.stringify(poloha));
        await p.vyhodnot(`(() => { const k = window._kk3d.camera; k.zoom = 0.8; k.updateProjectionMatrix(); return true; })()`);
        await pauza(800);
        await p.snimek(path.join(vystup, 'katalog-3d.png'));
        const klik3d = await p.vyhodnot(`(async () => { const d = ${D}, T = window.THREE, _3d = window._kk3d, c = (ms) => new Promise(r => setTimeout(r, ms));
            d.renderer.clearSelection(); d._selectionTick++; await c(100);
            const v = d.engine.vybaveni[0]; let obal = null; _3d.wallGroup.traverse(o => { if (o.userData?.kus === v.id) obal = o; });
            obal.updateMatrixWorld(true); const bod = new T.Vector3(0, v.vyska / 2, 0).applyMatrix4(obal.matrixWorld).project(_3d.camera);
            const pl = _3d.renderer.domElement, r = pl.getBoundingClientRect(), x = r.left + (bod.x + 1) / 2 * r.width, y = r.top + (1 - bod.y) / 2 * r.height;
            for (const typ of ['pointerdown', 'pointerup']) pl.dispatchEvent(new PointerEvent(typ, { clientX: x, clientY: y, button: 0, bubbles: true }));
            await c(300);
            const vybrany = d.katalogObjekt?.id === v.id, panel = !!document.getElementById('kk-panel-otvoru')?.offsetParent;
            const obrys = obal.children.some(o => o.userData.vyber3d);
            d.katalogBarva('modra'); await c(2500);
            let nove = null; _3d.wallGroup.traverse(o => { if (o.userData?.kus === v.id) nove = o; });
            let modra = false; nove?.traverse(o => { if (o.isMesh && o.material?.map?.image instanceof HTMLCanvasElement) modra = true; });
            const obrysPo = !!nove?.children.some(o => o.userData.vyber3d);
            d.katalogBarva('zelena'); await c(300);
            for (const typ of ['pointerdown', 'pointerup']) pl.dispatchEvent(new PointerEvent(typ, { clientX: r.left + 5, clientY: r.top + 5, button: 0, bubbles: true }));
            await c(300);
            return { vybrany, panel, obrys, modra, obrysPo, barva: v.barva, zrusen: !d.katalogObjekt }; })()`);
        kontrola('ve 3D jde kus vybrat klikem, má panel a žádný obrys', klik3d.vybrany && klik3d.panel && !klik3d.obrys, JSON.stringify(klik3d));
        kontrola('ve 3D jde kus přebarvit, klik vedle výběr zruší', klik3d.modra && !klik3d.obrysPo && klik3d.barva === 'zelena' && klik3d.zrusen, JSON.stringify(klik3d));

        console.log('\n6) Model pro sdílený odkaz');
        const zapec = await p.vyhodnot(`(() => { const d = ${D}; const m = d._zapecModel(); return { objektu: (m.objekty || []).length, prvni: m.objekty?.[0], trojuhelniku: m.meshe.reduce((s, k) => s + k.pozice.length, 0) }; })()`);
        kontrola('kusy jdou do odkazu jako odkaz na model, ne jako trojúhelníky', zapec.objektu === 3 && zapec.prvni.id && typeof zapec.prvni.uhel === 'number', JSON.stringify(zapec).slice(0, 240));
        const barvaOdkaz = await p.vyhodnot(`(${D}._zapecModel().objekty || []).filter(o => o.barva === 'zelena').length`);
        kontrola('barva potahu jde i do odkazu', barvaOdkaz === 1, String(barvaOdkaz));

        console.log('\n7) Sdílený odkaz s nábytkem');
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); document.querySelector('[data-sekce-export]').open = true; return true; })()`);
        await pauza(700);
        await p.vyhodnot(`(() => { document.querySelector('[data-sdileni=vytvorit]').click(); return true; })()`);
        await p.cekej(`!!(${D}.sdileni && ${D}.sdileni.aktivni)`, 60000, 'odkaz');
        const adresa = await p.vyhodnot(`${D}.sdileni.url`);
        await p.jdiNa(ZAKLAD + '/share/' + adresa.split('/').pop());
        await p.cekej('!!window.__sdileniScena', 20000, 'prohlížeč');
        await p.cekej(`(() => { let n = 0; window.__sdileniScena.scene.traverse(o => { if (o.userData?.katalog && o.children.length) n++; }); return n === 3; })()`, 30000, 'modely v odkazu');
        await p.vyhodnot('window.__sdileniScena.vykresli(); true');
        await pauza(900);
        const odkaz = await p.vyhodnot(`(() => { const sc = window.__sdileniScena; let textura = 0, stin = 0; sc.scene.traverse(o => { if (o.isMesh && o.material.map) textura++; if (o.isMesh && o.castShadow) stin++; }); const a = [...document.querySelectorAll('.tt-sdileni-pata a')].find(x => x.href.includes('model-credits')); const editor = performance.getEntriesByType('resource').filter(r => /koncept-v3/.test(r.name)).length; return { textura, stin, autori: !!a, editor }; })()`);
        kontrola('v odkazu jsou modely s texturou a stínem, odkaz na autory, žádný kód editoru', odkaz.textura > 0 && odkaz.stin > 0 && odkaz.autori && odkaz.editor === 0, JSON.stringify(odkaz));
        await p.snimek(path.join(vystup, 'katalog-sdileni.png'));

        console.log('\n8) Stránka autorů');
        const autori = await p.vyhodnot(`(async () => { const r = await fetch('/model-credits'); const t = await r.text(); return { ok: r.ok, abo: t.includes('Amazon Berkeley Objects') && t.includes('Amazon.com') && t.includes('CC BY 4.0'), ph: t.includes('Poly Haven'), sh3d: t.includes('Scopia') && t.includes('Jay-Artist') && t.includes('blendswap.com/blends/view/24948') }; })()`);
        kontrola('stránka autorů uvádí zdroje a licence i autory koupelny', autori.ok && autori.abo && autori.ph && autori.sh3d, JSON.stringify(autori));

        const chybyStranky = (p.chyby || []).filter(c => !/favicon|404/.test(String(c)));
        kontrola('bez chyb v konzoli', chybyStranky.length === 0, chybyStranky.slice(0, 3).join(' | ').slice(0, 300));
    } catch (e) {
        chyb++;
        console.log('   CHYBA běhu:', e.message);
        await p.snimek(path.join(vystup, 'chyba.png')).catch(() => {});
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\nCHYB: ${chyb}` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
})();
