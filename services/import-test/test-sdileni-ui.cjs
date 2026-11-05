/**
 * Export a sdílení: PNG půdorysu a 3D, stav editoru po exportu, odkaz pro čtení bez kódu editoru,
 * hlavičky, aktualizace, vypnutí, cizí uživatel a tarif.
 *
 * Spuštění: node services/import-test/test-sdileni-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

// Rozměr a podíl nebílých a neprůhledných bodů v canvasu
const ROZBOR = `(cv) => { const g = cv.getContext('2d'); const d = g.getImageData(0, 0, cv.width, cv.height).data; let n = 0, b = 0; const krok = 16; for (let i = 0; i < d.length; i += 4 * krok) { b++; if (d[i + 3] > 10 && (d[i] < 245 || d[i + 1] < 245 || d[i + 2] < 245)) n++; } return { w: cv.width, h: cv.height, plne: +(n / b).toFixed(3), roh: [...g.getImageData(1, 1, 1, 1).data] }; }`;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const ulozCanvas = async (nazevJs, soubor) => {
        const b64 = await p.vyhodnot(`${nazevJs}.toDataURL('image/png').split(',')[1]`);
        fs.writeFileSync(path.join(vystup, soubor), Buffer.from(b64, 'base64'));
    };

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
            body: JSON.stringify({ nazev: 'ClaudeTest sdílení ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n1) Dům a PNG půdorysu');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.3, 'obvodova'); e.addWall(10*X, 0, 10*X, 8*X, 0.3, 'obvodova'); e.addWall(10*X, 8*X, 0, 8*X, 0.3, 'obvodova'); e.addWall(0, 8*X, 0, 0, 0.3, 'obvodova');
            e.addWall(5*X, 0, 5*X, 8*X, 0.15, 'pricka'); e.addOpening(w1.id, 2, 1.5, 'okno', { presnaSirka: true });
            d.podlaziKopie = true; d.pridatPodlazi('nahoru'); e.addWall(2*X, 2*X, 2*X, 6*X, 0.25, 'nosna'); d.strechaVytvor(); d.naPodlazi('P1'); d.nastroj = 'vyber'; d.fitView();
            d.renderer.setSelection([w1.id]); d.renderer.render(); d.autoSave('Dům'); return true; })()`);
        await pauza(1500);
        const pred = await p.vyhodnot(`(() => { const d = ${D}; return { json: JSON.stringify(d.engine.toJSON()), aktivni: d.engine.dum.aktivni, scale: d.stage.scaleX(), x: d.stage.x(), y: d.stage.y(), vyber: [...d.renderer.selectedWalls], kroku: d.historie.length, ids: d.renderer.showIds, mrizka: d.renderer.gridLayer.visible() }; })()`);
        const pudorys = await p.vyhodnot(`(() => { const d = ${D}; window.__k = d._listPudorysu(d._kresbyPodlazi([d.engine.dum.aktivni])); return (${ROZBOR})(window.__k); })()`);
        await ulozCanvas('window.__k', 'export-pudorys.png');
        kontrola('půdorys: rozměr podle domu při 120 px na metr, bílé pozadí, není prázdný', pudorys.w > 1200 && pudorys.w < 1800 && pudorys.h > 1000 && pudorys.roh.join() === '255,255,255,255' && pudorys.plne > 0.1, JSON.stringify(pudorys));
        const po = await p.vyhodnot(`(() => { const d = ${D}; return { json: JSON.stringify(d.engine.toJSON()), aktivni: d.engine.dum.aktivni, scale: d.stage.scaleX(), x: d.stage.x(), y: d.stage.y(), vyber: [...d.renderer.selectedWalls], kroku: d.historie.length, ids: d.renderer.showIds, mrizka: d.renderer.gridLayer.visible() }; })()`);
        kontrola('po exportu je editor beze změny: data, pohled, výběr, vrstvy, historie', po.json === pred.json && po.aktivni === pred.aktivni && po.scale === pred.scale && po.x === pred.x && po.y === pred.y && JSON.stringify(po.vyber) === JSON.stringify(pred.vyber) && po.kroku === pred.kroku && po.ids === pred.ids && po.mrizka === pred.mrizka, JSON.stringify({ stejnaData: po.json === pred.json, aktivni: po.aktivni, vyber: po.vyber, kroku: [pred.kroku, po.kroku] }));
        console.log('\n1a) Zápatí se značkou, mřížka a parcela na výkresu');
        const ORANZOVA = `(cv, odY) => { const d = cv.getContext('2d').getImageData(0, odY, cv.width, cv.height - odY).data; let n = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 200 && d[i + 1] > 80 && d[i + 1] < 170 && d[i + 2] < 90) n++; } return n; }`;
        const znacka = await p.vyhodnot(`(async () => { const d = ${D}; await d._pripravZnacku(); window.__k = d._listPudorysu(d._kresbyPodlazi([d.engine.dum.aktivni])); const c = document.createElement('canvas'); c.width = 1000; c.height = 600; c.getContext('2d').fillRect(0, 0, 1000, 600); const k3 = d._list3d(c); return { obrazek: d._znackaExportu?.naturalWidth, list: (${ORANZOVA})(window.__k, window.__k.height - 90), vyska3d: k3.height, zapati3d: [...k3.getContext('2d').getImageData(5, k3.height - 5, 1, 1).data], oranzova3d: (${ORANZOVA})(k3, 600), obraz3d: [...k3.getContext('2d').getImageData(5, 5, 1, 1).data] }; })()`);
        await ulozCanvas('window.__k', 'export-zapati.png');
        kontrola('značka je v zápatí půdorysu i pod 3D, záběr zůstává celý', znacka.obrazek > 0 && znacka.list > 100 && znacka.oranzova3d > 50 && znacka.vyska3d > 600 && znacka.zapati3d.join() === '255,255,255,255' && znacka.obraz3d[0] < 10, JSON.stringify(znacka));
        const realne3d = await p.vyhodnot(`(async () => { const d = ${D}; const puvodni = d._stahni; d._stahni = async (cv) => { window.__k3 = cv; }; await d.export3d(); d._stahni = puvodni; return (${ORANZOVA})(window.__k3, window.__k3.height - 90); })()`);
        await ulozCanvas('window.__k3', 'export-3d.png');
        kontrola('stažené 3D nese značku', realne3d > 50, String(realne3d));
        const mrizka = await p.vyhodnot(`(() => { const d = ${D}; const zmer = () => (${ROZBOR})(d._listPudorysu(d._kresbyPodlazi([d.engine.dum.aktivni]))); const bylo = d.showGrid; d.showGrid = true; d.toggleGrid(); const s = zmer(); d.showGrid = false; d.toggleGrid(); const bez = zmer(); const car = d.renderer.gridLayer.getChildren().length; d.showGrid = true; d.toggleGrid(); const vEditoru = d.renderer.gridLayer.getChildren().length; d.showGrid = bylo; d.toggleGrid(); return { s: s.plne, bez: bez.plne, car, vEditoru }; })()`);
        kontrola('přepínač Mřížka platí i pro obrázek a editor ji po snímku obnoví', mrizka.s > mrizka.bez && mrizka.car === 0 && mrizka.vEditoru > 0, JSON.stringify(mrizka));
        const parcela = await p.vyhodnot(`(() => { const d = ${D}; const r = d.renderer; const bylo = d.showGrid; d.showGrid = false; d.toggleGrid();
            const zmer = (opt) => { const k = d._kresbyPodlazi([d.engine.dum.aktivni], opt); return { w: k[0].canvas.width, h: k[0].canvas.height, px: k[0].pxNaMetr, c: k[0].canvas }; };
            const bez = zmer();
            d.katastrParcely = [{ cislo: 't', label: 't', stavby: [{ polygon_wgs84: [[50.0001, 15.00005], [50.0001, 15.0002], [50.00005, 15.0002], [50.00005, 15.00005]] }], polygon_wgs84: [[49.99985, 14.9997], [50.00015, 14.9997], [50.00015, 15.0003], [49.99985, 15.0003]] }];
            d._katastrOkolni = [{ label: '123/4', polygon_wgs84: [[50.00015, 15.0003], [50.00015, 15.0006], [49.99985, 15.0006], [49.99985, 15.0003]] }]; r._fixedWgsCenter = { lat: 50, lon: 15 };
            d.katastrZobrazitParcely = true; d.katastrZobrazitStavby = true; d.katastrZobrazitSousedy = true; d.katastrPrekreslitCanvas();
            const c = document.createElement('canvas'); c.width = c.height = 32; const gc = c.getContext('2d'); gc.fillStyle = '#ff0000'; gc.fillRect(0, 0, 32, 32);
            const dlazdice = new Konva.Image({ image: c, x: -5000, y: -5000, width: 10000, height: 10000, listening: false }); dlazdice.setAttr('_mapTile', true); r.katastrLayer.add(dlazdice); dlazdice.moveToBottom();
            const puv = d.stage.toCanvas; let textu = -1, textuOdkaz = -1, dlazdiceVidet = null; const zachyt = (kam) => { d.stage.toCanvas = function (o) { const t = r.katastrLayer.getChildren(n => n.getClassName() === 'Text' && n.visible()).length; if (kam === 'png') textu = t; else textuOdkaz = t; dlazdiceVidet = dlazdice.visible(); return puv.call(this, o); }; };
            zachyt('png'); const s = zmer(); zachyt('odkaz'); const odkaz = zmer(); d.stage.toCanvas = puv;
            window.__k = d._listPudorysu([{ id: d.engine.dum.aktivni, pxNaMetr: s.px, canvas: s.c }]);
            const data = s.c.getContext('2d').getImageData(0, 0, s.w, s.h).data; let cervena = 0; for (let i = 0; i < data.length; i += 16) { if (data[i] > 200 && data[i + 1] < 60 && data[i + 2] < 60 && data[i + 3] > 200) cervena++; }
            const poSnimku = dlazdice.visible(), popisekEditor = r.katastrLayer.getChildren(n => n.getClassName() === 'Text' && n.visible()).length;
            dlazdice.destroy();
            d.katastrZobrazitParcely = false; d.katastrZobrazitStavby = false; d.katastrZobrazitSousedy = false; d.katastrPrekreslitCanvas(); const vypnuto = zmer();
            d.katastrZobrazitParcely = true; d.katastrZobrazitStavby = true; d.katastrZobrazitSousedy = true;
            d.katastrParcely = [{ cislo: 't', label: 't', polygon_wgs84: [[49.998, 14.996], [50.002, 14.996], [50.002, 15.004], [49.998, 15.004]] }]; d.katastrPrekreslitCanvas(); const velka = zmer();
            d.showGrid = bylo; d.toggleGrid();
            return { bez: [bez.w, bez.h, bez.px], s: [s.w, s.h, s.px], odkaz: [odkaz.w, odkaz.h], vypnuto: [vypnuto.w, vypnuto.h], velka: [velka.w, velka.h, velka.px], textu, textuOdkaz, dlazdiceVidet, poSnimku, popisekEditor, cervena }; })()`);
        await ulozCanvas('window.__k', 'export-parcela.png');
        kontrola('zaškrtnutá parcela s okolím obrázek zvětší, vypnutá ho vrátí', parcela.s[0] > parcela.bez[0] * 2 && parcela.s[2] === 60 && parcela.vypnuto.join() === parcela.bez.slice(0, 2).join(), JSON.stringify(parcela));
        kontrola('mapový podklad na obrázku není a po snímku se vrátí', parcela.cervena === 0 && parcela.dlazdiceVidet === false && parcela.poSnimku === true, JSON.stringify({ c: parcela.cervena, v: parcela.dlazdiceVidet, po: parcela.poSnimku }));
        kontrola('číslo sousední parcely je v PNG i v odkazu', parcela.textu === 1 && parcela.textuOdkaz === 1 && parcela.popisekEditor === 1, JSON.stringify({ png: parcela.textu, odkaz: parcela.textuOdkaz, editor: parcela.popisekEditor }));
        kontrola('velká parcela sníží měřítko, obrázek zůstane v limitu', parcela.velka[2] < 60 && Math.max(parcela.velka[0], parcela.velka[1]) <= 8800, JSON.stringify(parcela.velka));
        // Body se kreslí přímo: dosazení do vyskovyProfil by editor vzal jako nový terén a změnil výšku domu
        const vysky = await p.vyhodnot(`(() => { const d = ${D}; const mrizka = d.showGrid; d.showGrid = false; d.toggleGrid();
            const profil = { body: [[50.0001, 15.0001, 400], [50.0002, 15.0001, 400]], vyska_min: 400, vyska_max: 401, vyskovy_rozdil: 1 };
            const zelenych = (pr) => { d.renderer.renderKatastr(d.katastrParcely, true, true, true, null, d._katastrOkolni, 0, pr); const cv = d._kresbyPodlazi([d.engine.dum.aktivni])[0].canvas; const x = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < x.length; i += 4) { if (x[i + 1] > 200 && x[i] < 130 && x[i + 2] < 170) n++; } return n; };
            const s = zelenych(profil), bez = zelenych(null);
            d.showGrid = mrizka; d.toggleGrid(); d.katastrPrekreslitCanvas(); return { s, bez }; })()`);
        kontrola('přepínač Výška platí i pro obrázek', vysky.s > 20 && vysky.bez === 0, JSON.stringify(vysky));
        const prepinace = await p.vyhodnot(`(async () => { const d = ${D}; d.panelOpen.export = true; document.querySelector('[data-sekce-export]').open = true; await new Promise(r => setTimeout(r, 400)); const vidim = () => [...document.querySelectorAll('[data-export-parcela] label')].filter(l => l.offsetParent).map(l => l.textContent.trim()).join(); const s = vidim(); const nadpis = document.querySelector('[data-export-parcela] > div').textContent; document.querySelector('[data-sekce-export]').scrollIntoView(); await new Promise(r => setTimeout(r, 300)); const r = document.querySelector('[data-export-parcela]').getBoundingClientRect(); const pretek = [...document.querySelectorAll('[data-export-parcela] label')].some(l => l.getBoundingClientRect().right > r.right + 0.5); const pole = [...document.querySelectorAll('details.kk-section label')].filter(x => x.textContent.trim() === 'Sousedé').map(l => l.querySelector('input')); pole[1].click(); await new Promise(r => setTimeout(r, 200)); const shoda = pole.map(i => i.checked); pole[1].click(); return { s, nadpis, pretek, shoda, oddelene: !document.querySelector('[data-export-prepinace] [x-model=katastrZobrazitParcely]') }; })()`);
        await p.snimek(path.join(vystup, 'export-prepinace.png'));
        kontrola('v Exportu je samostatný odstavec parcely, nastavení je společné s panelem', prepinace.s === 'Mřížka,Parcely,Stavby,Sousedé,Výška,Terén,Mřížka terénu' && prepinace.nadpis.includes('Parcela') && !prepinace.pretek && prepinace.shoda[0] === prepinace.shoda[1] && prepinace.shoda[0] === false && prepinace.oddelene, JSON.stringify(prepinace));
        const bezParcely = await p.vyhodnot(`(async () => { const d = ${D}; d.katastrParcely = []; d._katastrOkolni = []; d.renderer._fixedWgsCenter = null; d.katastrPrekreslitCanvas(); await new Promise(r => setTimeout(r, 200)); const v = [...document.querySelectorAll('[data-export-parcela] label')].filter(l => l.offsetParent).map(l => l.textContent.trim()).join(); return { v, nadpis: document.querySelector('[data-export-parcela] > div').textContent }; })()`);
        kontrola('bez parcely zbývá mřížka a terén', bezParcely.v === 'Mřížka,Terén,Mřížka terénu' && bezParcely.nadpis === 'Mřížka a terén:', JSON.stringify(bezParcely));

        console.log('\n1b) Výřez podle pohledu v editoru');
        const pohledEditoru = await p.vyhodnot(`(async () => { const d = ${D}; const st = d.stage; const puv = { s: st.scaleX(), x: st.x(), y: st.y() }; const sirka = st.width(), vyska = st.height();
            st.scale({ x: puv.s * 3, y: puv.s * 3 }); st.position({ x: puv.x * 3 - sirka, y: puv.y * 3 - vyska }); d.renderer.poZmeneZoomu();
            const stav = { s: st.scaleX(), x: st.x(), y: st.y() };
            let stazeny = null; const stahni = d._stahni; d._stahni = async (cv) => { stazeny = cv; }; await d.exportPudorys(false); d._stahni = stahni; window.__k = stazeny;
            const v = d._kresbyPodlazi([d.engine.dum.aktivni], { podlePohledu: true })[0], cely = d._kresbyPodlazi([d.engine.dum.aktivni])[0];
            const po = { s: st.scaleX(), x: st.x(), y: st.y() };
            st.scale({ x: puv.s, y: puv.s }); st.position({ x: puv.x, y: puv.y }); d.renderer.poZmeneZoomu();
            return { sirka, vyska, v: [v.canvas.width, v.canvas.height], px: v.pxNaMetr, ocekavanePx: stav.s * d.engine.PX_PER_M, cely: [cely.canvas.width, cely.pxNaMetr], stazeny: stazeny.width, stejnyStav: JSON.stringify(po) === JSON.stringify(stav) }; })()`);
        await ulozCanvas('window.__k', 'export-priblizeni.png');
        kontrola('obrázek má výřez a přiblížení jako editor, pohled se nezmění, odkaz dál bere celý dům', pohledEditoru.v[0] === pohledEditoru.sirka * 2 && pohledEditoru.v[1] === pohledEditoru.vyska * 2 && Math.abs(pohledEditoru.px - pohledEditoru.ocekavanePx) < 1e-6 && pohledEditoru.stazeny === Math.max(900, pohledEditoru.sirka * 2) && pohledEditoru.stejnyStav && pohledEditoru.cely[1] === 60, JSON.stringify(pohledEditoru));
        const maska = await p.vyhodnot(`(() => { const t = Teren3d.maskaParcel([[[0, 0], [50, 0], [60, 100], [0, 100]], [[50, 0], [100, 0], [100, 100], [60, 100]]], 0, 0, 100, 100); const g = t.image.getContext('2d'); let nejmene = 255; for (let r = 5; r < 1019; r += 7) { const x = Math.round((50 + 10 * r / 1024) / 100 * 1024); for (let i = -2; i <= 2; i++) nejmene = Math.min(nejmene, g.getImageData(x + i, r, 1, 1).data[0]); } return nejmene; })()`);
        kontrola('mezi sousedními parcelami v masce terénu není šev', maska === 255, String(maska));

        const popisky = await p.vyhodnot(`(() => { const d = ${D}; const st = d.stage; const puv = st.toCanvas; const nalezene = []; d.naPodlazi('P2'); const srafPred = d.renderer.schodyLayer.getChildren().filter(n => n.getClassName() === 'Group' && n.clipFunc()).length; d.naPodlazi(${JSON.stringify(pred.aktivni)}); st.toCanvas = function (c) { for (const n of d.renderer.labelLayer.find('Text')) { if (/^[WOD]\\d+$/.test(n.text()) && n.isVisible()) nalezene.push(n.text()); } for (const n of d.renderer.schodyLayer.getChildren()) { if (n.getClassName() === 'Group' && n.clipFunc()) nalezene.push('nepodepřená'); } return puv.call(this, c); }; d.renderer.showIds = false; d.renderer.render(); d._kresbyPodlazi([...d.engine.dum.podlazi].map(x => x.id)); st.toCanvas = puv; d.renderer.showIds = ${pred.ids}; d.renderer.render(); return { nalezene, srafPred }; })()`);
        kontrola('se schovanými značkami v obrázku nejsou popisky stěn a otvorů, šrafy nepodepřených stěn nikdy (v editoru šrafy jsou)', popisky.nalezene.length === 0 && popisky.srafPred > 0, JSON.stringify(popisky));
        const vse = await p.vyhodnot(`(() => { const d = ${D}; window.__k = d._listPudorysu(d._kresbyPodlazi([...d.engine.dum.podlazi].reverse().map(x => x.id))); return (${ROZBOR})(window.__k); })()`);
        await ulozCanvas('window.__k', 'export-vsechna.png');
        kontrola('všechna podlaží na jednom listu vedle sebe', vse.w > pudorys.w * 1.8 && vse.plne > 0.1, JSON.stringify(vse));
        const stazeni = await p.vyhodnot(`(async () => { const d = ${D}; const puvodni = HTMLAnchorElement.prototype.click; let nazev = null; HTMLAnchorElement.prototype.click = function () { nazev = this.download; }; await d.exportPudorys(false); const prvni = nazev; await d.exportPudorys(true); const druhy = nazev; await d.export3d(); HTMLAnchorElement.prototype.click = puvodni; return { prvni, druhy, treti: nazev, rezim3d: d.rezim3d }; })()`);
        kontrola('tlačítka stáhnou soubory se srozumitelným názvem, po 3D zůstane 2D', /^claudetest-sdileni-[\w-]+-pudorys-1-np\.png$/.test(stazeni.prvni) && /-pudorysy\.png$/.test(stazeni.druhy) && /-3d\.png$/.test(stazeni.treti) && stazeni.rezim3d === false, JSON.stringify(stazeni));
        await pauza(400);

        console.log('\n2) Vytvoření odkazu');
        const panel = await p.vyhodnot(`(async () => { const d = ${D}; document.querySelector('[data-sekce-export]').open = true; await new Promise(r => setTimeout(r, 500)); return { vidime: !!document.querySelector('[data-sdileni=vytvorit]'), stav: d.sdileni && { aktivni: d.sdileni.aktivni } }; })()`);
        kontrola('sekce ukazuje vytvoření, odkaz zatím neexistuje', panel.vidime && panel.stav && panel.stav.aktivni === false, JSON.stringify(panel));
        await p.vyhodnot(`(() => { document.querySelector('[data-sdileni=vytvorit]').click(); return true; })()`);
        await p.cekej(`!!(${D}.sdileni && ${D}.sdileni.aktivni)`, 40000, 'odkaz');
        const zalozeny = await p.vyhodnot(`(() => { const d = ${D}; return { url: d.sdileni.url, pole: document.querySelector('[data-sdileni=adresa]')?.value, rezim3d: d.rezim3d, json: JSON.stringify(d.engine.toJSON()) }; })()`);
        kontrola('odkaz vznikl a je v poli, editor zůstal ve 2D a data se nezměnila', /\/share\/[A-Za-z0-9]{40}$/.test(zalozeny.url) && zalozeny.pole === zalozeny.url && !zalozeny.rezim3d && zalozeny.json === pred.json, JSON.stringify({ url: zalozeny.url, poleShoda: zalozeny.pole === zalozeny.url, rezim3d: zalozeny.rezim3d, stejnaData: zalozeny.json === pred.json, rozdil: zalozeny.json === pred.json ? null : (() => { let i = 0; while (zalozeny.json[i] === pred.json[i]) i++; return [pred.json.slice(Math.max(0, i - 60), i + 80), zalozeny.json.slice(Math.max(0, i - 60), i + 80)]; })() }));
        const token = zalozeny.url.split('/').pop();
        const adresa = ZAKLAD + '/share/' + token;
        await p.snimek(path.join(vystup, 'sdileni-panel.png'));
        const urlEditoru = await p.vyhodnot('location.href');

        console.log('\n3) Odkaz bez přihlášení a bez kódu editoru');
        const anonym = async (cesta) => { const r = await fetch(ZAKLAD + cesta, { redirect: 'manual' }); return { s: r.status, robots: r.headers.get('x-robots-tag'), ref: r.headers.get('referrer-policy'), typ: r.headers.get('content-type'), kod: r.headers.get('content-encoding'), telo: await r.arrayBuffer() }; };
        const stranka = await anonym('/share/' + token);
        const html = Buffer.from(stranka.telo).toString('utf8');
        kontrola('stránka jde bez přihlášení, nesmí do indexu', stranka.s === 200 && /noindex/.test(stranka.robots) && stranka.ref === 'no-referrer' && /noindex/.test(html), JSON.stringify({ s: stranka.s, robots: stranka.robots, ref: stranka.ref }));
        const skripty = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m => m[1]);
        kontrola('HTML nenačítá nic z editoru ani analytiku', !skripty.some(s => /koncept|konva|engine|renderer|dum\.js|strecha|mistnosti/i.test(s)) && !/googletagmanager|gtag\(|_kkInitData|StavebniEngine/.test(html), JSON.stringify(skripty));
        const model = await anonym('/share/' + token + '/model');
        const modelText = Buffer.from(model.telo).toString('utf8');   // fetch gzip rozbalí sám, hlavička zůstává
        const modelData = JSON.parse(modelText);
        kontrola('model je jen geometrie: žádné stěny, otvory ani historie', model.s === 200 && model.kod === 'gzip' && modelData.meshe.length > 3 && !/"steny"|"otvory"|"mistnosti"|"historie"|"kotva"|"nodeA"|"dum"/.test(modelText), JSON.stringify({ s: model.s, gzip: model.kod, meshe: modelData.meshe.length, kB: Math.round(model.telo.byteLength / 1024), kBRozbaleno: Math.round(modelText.length / 1024) }));
        const obrazek = await anonym('/share/' + token + '/soubor/plan-P1.png');
        kontrola('půdorys jde stáhnout jako PNG, také s noindex', obrazek.s === 200 && obrazek.typ === 'image/png' && /noindex/.test(obrazek.robots));
        const pruchod = await anonym('/share/' + token + '/soubor/..%2Fmodel.json');
        kontrola('cesta mimo povolené soubory nejde', pruchod.s === 404, String(pruchod.s));

        await p.jdiNa(adresa);
        await p.cekej(`!!window.__sdileniScena`, 20000, 'prohlížeč');
        await pauza(600);
        const prohlizec = await p.vyhodnot(`(() => { const zdroje = performance.getEntriesByType('resource').map(r => r.name); const sc = window.__sdileniScena; sc.renderer.render(sc.scene, sc.camera); const c = sc.renderer.domElement; const t = document.createElement('canvas'); t.width = c.width; t.height = c.height; t.getContext('2d').drawImage(c, 0, 0); const r = (${ROZBOR})(t); const u = t.getContext('2d').getImageData(0, 0, t.width, t.height).data; const barvy = new Set(); for (let i = 0; i < u.length; i += 4000) barvy.add(u[i] >> 4 << 8 | u[i + 1] >> 4 << 4 | u[i + 2] >> 4); return { editor: zdroje.filter(z => /koncept|konva|stavebni|\\/dum\\.js/.test(z)), globaly: ['StavebniEngine', 'KonceptDum', 'konceptV3Komponenta', 'Konva', 'Strecha', 'MistnostiRastr'].filter(n => n in window), barev: barvy.size, plne: r.plne, tlacitka: [...document.querySelectorAll('[data-sdileni-ovladani] button')].map(b => b.textContent), vyber: [...document.querySelectorAll('[data-sdileni-vyber] button')].map(b => b.textContent) }; })()`);
        kontrola('v prohlížeči není kód editoru, 3D se vykreslí', prohlizec.editor.length === 0 && prohlizec.globaly.length === 0 && prohlizec.barev > 3, JSON.stringify(prohlizec));
        kontrola('jdou přepnout podlaží a střecha, nahoře 3D a půdorysy', /^(Střecha|Roof)$/.test(prohlizec.tlacitka[0]) && prohlizec.tlacitka.includes('1.NP') && prohlizec.tlacitka.includes('2.NP') && prohlizec.vyber[0] === '3D' && prohlizec.vyber.length === 3, JSON.stringify({ t: prohlizec.tlacitka, v: prohlizec.vyber }));
        await p.snimek(path.join(vystup, 'sdileni-3d.png'));
        const skryti = await p.vyhodnot(`(async () => { const b = document.querySelector('[data-sdileni-ovladani] [data-skupina=strecha]'); b.click(); await new Promise(r => setTimeout(r, 200)); return { skryta: !window.__sdileniScena.skupiny.get('strecha').visible, stav: b.getAttribute('aria-pressed') }; })()`);
        kontrola('skrytí střechy funguje', skryti.skryta && skryti.stav === 'false', JSON.stringify(skryti));
        await pauza(200);
        await p.snimek(path.join(vystup, 'sdileni-3d-bez-strechy.png'));
        const plan = await p.vyhodnot(`(async () => { document.querySelector('[data-pohled=plan-P1]').click(); const i = document.querySelector('[data-panel=plan-P1] img'); await (i.decode ? i.decode().catch(() => {}) : null); await new Promise(r => setTimeout(r, 300)); return { videt: i.offsetWidth > 100, sirka: i.naturalWidth, plocha3d: document.querySelector('[data-panel="3d"]').hidden }; })()`);
        kontrola('přepnutí na půdorys ukáže obrázek', plan.videt && plan.sirka > 1000 && plan.plocha3d, JSON.stringify(plan));
        await p.snimek(path.join(vystup, 'sdileni-plan.png'));
        const vazneOdkaz = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('stránka odkazu bez chyb v konzoli', vazneOdkaz.length === 0, vazneOdkaz.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));

        console.log('\n3a) Terén v odkazu');
        await p.jdiNa(urlEditoru);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await p.vyhodnot(`(() => { const d = ${D}; d.katastrParcely = [{ cislo: 't', label: 't', centroid_wgs84: { lat: 50.0002, lon: 15.0003 }, polygon_wgs84: [[49.9998, 14.9997], [50.0006, 14.9997], [50.0006, 15.0009], [49.9998, 15.0009]] }]; d.renderer._fixedWgsCenter = { lat: 50, lon: 15 };
            const o = []; const M = 111320, c = Math.cos(50 * Math.PI / 180);
            for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) o.push([50 + j * 2 / M, 15 + i * 2 / (M * c), 400 + i * 0.1]);
            d.vyskovyProfil = { body: o, vyska_min: 397, vyska_max: 403, vyskovy_rozdil: 6 }; d._zalozZaklady(); d._selectionTick++; return true; })()`);
        await pauza(800);
        await p.vyhodnot(`(() => { document.querySelector('[data-sdileni=aktualizovat]').click(); return true; })()`);
        await pauza(500);
        await p.cekej(`!${D}.sdileniBezi`, 40000, 'aktualizace s terénem');
        const sTerenem = await anonym('/share/' + token + '/model');
        const textSTerenem = Buffer.from(sTerenem.telo).toString('utf8');
        const modelSTerenem = JSON.parse(textSTerenem);
        const vyskyOdkazu = new Float32Array(Uint8Array.from(Buffer.from(modelSTerenem.teren.vysky, 'base64')).buffer);
        kontrola('model nese terén', modelSTerenem.teren.sloupcu > 5 && vyskyOdkazu.length === modelSTerenem.teren.sloupcu * modelSTerenem.teren.radku && modelSTerenem.teren.parcely.length === 1, `${modelSTerenem.teren.sloupcu}×${modelSTerenem.teren.radku}`);
        kontrola('terén neprozradí polohu: bez souřadnic a nadmořské výšky', !/wgs84|sjtsk|"lat"|"lon"|"cislo"|"label"/.test(textSTerenem) && Math.max(...vyskyOdkazu) < 50, 'max ' + Math.max(...vyskyOdkazu).toFixed(2));
        await p.jdiNa(adresa);
        await p.cekej(`!!window.__sdileniScena`, 20000, 'prohlížeč s terénem');
        await pauza(800);
        const pohledOdkazu = await p.vyhodnot(`(() => { const sc = window.__sdileniScena; return { teren: !!sc.teren, ve: sc.scene.children.includes(sc.teren?.plocha), vnitrek: sc.teren?.uniformy.uVnitrekZap.value }; })()`);
        const jamyModelu = Object.keys(modelSTerenem.teren.jamy || {});
        kontrola('model nese výkop pro skrytá podlaží', jamyModelu.length >= 1 && (textSTerenem.length < 4e6), jamyModelu.join(' | ') + ', ' + Math.round(textSTerenem.length / 1024) + ' kB');
        const vykopOdkazu = await p.vyhodnot(`(async () => { const sc = window.__sdileniScena; const px = (x, y, z) => { sc.renderer.render(sc.scene, sc.camera); const v = new THREE.Vector3(x, y, z).project(sc.camera); const g = sc.renderer.getContext(); const b = new Uint8Array(4); g.readPixels(Math.round((v.x + 1) / 2 * g.drawingBufferWidth), Math.round((v.y + 1) / 2 * g.drawingBufferHeight), 1, 1, g.RGBA, g.UNSIGNED_BYTE, b); return [b[0], b[1], b[2]]; };
            const tlacitka = [...document.querySelectorAll('[data-sdileni-ovladani] button')];
            tlacitka.forEach(b => b.click());
            await new Promise(r => setTimeout(r, 400));
            const sit = [...sc.jamy.values()].find(s => s.visible);
            const stred = sit ? new THREE.Box3().setFromObject(sit).getCenter(new THREE.Vector3()) : null;
            let barva = null;
            if (sit) { const q = sit.geometry.attributes.position; let m = -1, nej = Infinity; for (let i = 0; i < q.count; i += 7) { const d = Math.hypot(q.getX(i) - stred.x, q.getZ(i) - stred.z); if (d < nej) { nej = d; m = i; } } barva = px(q.getX(m), q.getY(m), q.getZ(m)); }
            const r = { vidna: !!sit, zap: sc.teren.uniformyJamy.uJamaZap.value, barva, napoveda: /výkop|excavation/.test(document.querySelector('.tt-sdileni-pata').textContent) };
            return r; })()`);
        kontrola('po skrytí podlaží odkaz ukáže výkop v barvě zeminy', vykopOdkazu.vidna && vykopOdkazu.zap === 1 && vykopOdkazu.barva[0] > vykopOdkazu.barva[1] + 8, JSON.stringify(vykopOdkazu));
        kontrola('odkaz o výkopu napoví', vykopOdkazu.napoveda);
        await p.snimek(path.join(vystup, 'sdileni-vykop.png'));
        await p.vyhodnot(`(() => { [...document.querySelectorAll('[data-sdileni-ovladani] button')].forEach(b => b.click()); return true; })()`);
        await pauza(300);
        const vykopZpet = await p.vyhodnot(`window.__sdileniScena.teren.uniformyJamy.uJamaZap.value`);
        kontrola('s viditelnými podlažími se terén v odkazu zavře', vykopZpet === 0);
        kontrola('prohlížeč terén ukáže a uvnitř domu ho vyřízne', pohledOdkazu.teren && pohledOdkazu.ve && pohledOdkazu.vnitrek === 1, JSON.stringify(pohledOdkazu));
        await p.snimek(path.join(vystup, 'sdileni-teren.png'));

        console.log('\n3c) Přepínače Terén a Mřížka terénu');
        await p.jdiNa(urlEditoru);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        // Dvě sousední parcely se šikmou společnou hranou
        await p.vyhodnot(`(async () => { const d = ${D}; d.katastrParcely = [{ cislo: 't1', label: 't1', centroid_wgs84: { lat: 50.0002, lon: 15 }, polygon_wgs84: [[49.9998, 14.9997], [50.0006, 14.9997], [50.0006, 15.0002], [49.9998, 15.0005]] }, { cislo: 't2', label: 't2', centroid_wgs84: { lat: 50.0002, lon: 15.0006 }, polygon_wgs84: [[49.9998, 15.0005], [50.0006, 15.0002], [50.0006, 15.0009], [49.9998, 15.0009]] }]; d.renderer._fixedWgsCenter = { lat: 50, lon: 15 };
            const o = []; const M = 111320, c = Math.cos(50 * Math.PI / 180);
            for (let i = -30; i <= 30; i++) for (let j = -30; j <= 30; j++) o.push([50 + j * 2 / M, 15 + i * 2 / (M * c), 400 + i * 0.1]);
            d.vyskovyProfil = { body: o, vyska_min: 397, vyska_max: 403, vyskovy_rozdil: 6 }; d._zalozZaklady(); d._selectionTick++; d.panelOpen.export = true; document.querySelector('[data-sekce-export]').open = true; await d.prepni3d(); return true; })()`);
        await pauza(1500);
        const snimek3d = async (soubor) => { await p.vyhodnot(`(async () => { const d = ${D}; const stahni = d._stahni; d._stahni = async (cv) => { window.__k3 = cv; }; await d.export3d(); d._stahni = stahni; return true; })()`); await ulozCanvas('window.__k3', soubor); };
        const stavTerenu = () => p.vyhodnot(`(() => { const d = ${D}, t = window._kk3d; return { zap: d.zobrazTeren3d, mriz: d.zobrazMrizkuTerenu, plocha: t.terrain?.visible, cary: t.gridLines?.visible }; })()`);
        const klikPole = (model) => p.vyhodnot(`(() => { document.querySelector('[data-export-parcela] input[x-model=${model}]').click(); return true; })()`);
        const vychozi = await stavTerenu();
        await snimek3d('export-3d-teren.png');
        kontrola('výchozí: terén je, mřížka terénu ne', vychozi.zap === true && vychozi.mriz === false && vychozi.plocha === true && vychozi.cary === false, JSON.stringify(vychozi));
        await klikPole('zobrazMrizkuTerenu');
        await pauza(200);
        const sMrizkou = await stavTerenu();
        await snimek3d('export-3d-mrizka.png');
        kontrola('Mřížka terénu ji ve 3D zapne', sMrizkou.mriz === true && sMrizkou.cary === true, JSON.stringify(sMrizkou));
        await klikPole('zobrazMrizkuTerenu');
        await p.vyhodnot(`(() => { document.querySelector('[data-sdileni=aktualizovat]').click(); return true; })()`);
        await pauza(500);
        await p.cekej(`!${D}.sdileniBezi`, 40000, 'odkaz bez mřížky');
        const modelBezMrizky = JSON.parse(Buffer.from((await anonym('/share/' + token + '/model')).telo).toString('utf8'));
        kontrola('odkaz nese volbu bez mřížky terénu', modelBezMrizky.mrizkaTerenu === false && !!modelBezMrizky.teren && modelBezMrizky.bezZeme === false, JSON.stringify({ m: modelBezMrizky.mrizkaTerenu, z: modelBezMrizky.bezZeme }));
        await klikPole('zobrazTeren3d');
        await pauza(200);
        const bezTerenu = await stavTerenu();
        await snimek3d('export-3d-bez-terenu.png');
        kontrola('Terén ho ve 3D skryje i s mřížkou', bezTerenu.zap === false && bezTerenu.plocha === false && bezTerenu.cary === false, JSON.stringify(bezTerenu));
        await p.vyhodnot(`(() => { document.querySelector('[data-sdileni=aktualizovat]').click(); return true; })()`);
        await pauza(500);
        await p.cekej(`!${D}.sdileniBezi`, 40000, 'odkaz bez terénu');
        const modelBezTerenu = JSON.parse(Buffer.from((await anonym('/share/' + token + '/model')).telo).toString('utf8'));
        kontrola('odkaz bez terénu nenese terén a nemá ani rovnou zem', modelBezTerenu.teren === null && modelBezTerenu.bezZeme === true, JSON.stringify({ t: modelBezTerenu.teren, z: modelBezTerenu.bezZeme }));
        await klikPole('zobrazTeren3d');
        await p.vyhodnot(`(() => { ${D}.prepni2d(); return true; })()`);
        await pauza(300);
        const zustalo = await stavTerenu();
        kontrola('po vrácení je terén zpět', zustalo.zap === true && zustalo.plocha === true, JSON.stringify(zustalo));
        await p.vyhodnot(`(() => { const d = ${D}; d.ulozitNastaveni(); return true; })()`);
        await p.jdiNa(adresa);
        await p.cekej(`!!window.__sdileniScena`, 20000, 'prohlížeč bez terénu');
        await pauza(500);
        const pohledBez = await p.vyhodnot(`(() => { const sc = window.__sdileniScena; return { teren: !!sc.teren, zem: sc.scene.children.filter(o => o.isMesh && o.material?.color?.getHexString() === 'c8d6c0').length }; })()`);
        kontrola('prohlížeč bez terénu nekreslí terén ani zem', !pohledBez.teren && pohledBez.zem === 0, JSON.stringify(pohledBez));

        console.log('\n3b) Odkaz autora ve verzi zdarma');
        await p.jdiNa(urlEditoru);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const projekt = await p.vyhodnot(`${D}.projektId`);
        const tinker = (kod) => execSync('php artisan tinker', { input: kod, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
        const cislo = (kod) => Number((tinker(`echo 'CISLO:' . (${kod}) . PHP_EOL;`).match(/CISLO:(\d+)/) || [])[1]);
        const majitel = (id) => tinker(`DB::table('koncepty_v3')->where('id', ${projekt})->update(['uzivatel_id' => ${id}]);`);
        const puvodniMajitel = cislo(`DB::table('koncepty_v3')->where('id', ${projekt})->value('uzivatel_id')`);
        const zdarma = cislo(`App\\Models\\Uzivatel::all()->first(fn ($u) => App\\Support\\Tarif::uzivatele($u) === 'zdarma')->id`);
        try {
            majitel(zdarma);
            const [z1, z2, z3] = [await anonym('/share/' + token), await anonym('/share/' + token + '/model'), await anonym('/share/' + token + '/soubor/plan-P1.png')];
            const zamekText = Buffer.from(z1.telo).toString('utf8');
            kontrola('autor ve verzi zdarma: odkaz, model i obrázky fungují', zdarma > 0 && z1.s === 200 && !/uzamčený|locked/i.test(zamekText) && /sdileni-prohlizec/.test(zamekText) && z2.s === 200 && z3.s === 200, JSON.stringify({ zdarma, s: [z1.s, z2.s, z3.s] }));
        } finally {
            majitel(puvodniMajitel);
        }
        const odemceno = await anonym('/share/' + token);
        kontrola('po obnovení tarifu se odkaz sám odemkne na stejné adrese', odemceno.s === 200 && /sdileni-prohlizec/.test(Buffer.from(odemceno.telo).toString('utf8')), String(odemceno.s));

        console.log('\n4) Aktualizace, vypnutí');
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor');
        const akt = await p.vyhodnot(`(async () => { const d = ${D}; d.setBarvaDomu('fasada', '#123456'); await d.nactiSdileni(); const byl = d.sdileni.url; await d.sdileniUloz(); return { stejna: d.sdileni.url === byl, rezim: d.rezim3d }; })()`);
        const modelPo = await anonym('/share/' + token + '/model');
        const textPo = Buffer.from(modelPo.telo).toString('utf8');
        kontrola('Aktualizovat: adresa stejná, nová barva v modelu', akt.stejna && /#123456/.test(textPo) && !/#123456/.test(modelText), JSON.stringify(akt));
        const cizi = await fetch(ZAKLAD + '/masterteam/koncept-v3/' + (await p.vyhodnot(`${D}.projektId`)) + '/sdileni', { method: 'DELETE', redirect: 'manual', headers: { Accept: 'application/json' } });
        kontrola('bez přihlášení nejde odkaz vypnout', cizi.status === 401 || cizi.status === 302 || cizi.status === 419, String(cizi.status));
        const stale = await anonym('/share/' + token);
        kontrola('odkaz po tom pokusu pořád běží', stale.s === 200);
        const vyp = await p.vyhodnot(`(async () => { const d = ${D}; const c = window.confirm; window.confirm = () => true; await d.sdileniVypni(); window.confirm = c; return { stav: d.sdileni.aktivni }; })()`);
        const [s1, s2, s3] = [await anonym('/share/' + token), await anonym('/share/' + token + '/model'), await anonym('/share/' + token + '/soubor/plan-P1.png')];
        kontrola('po vypnutí stránka, model i obrázek vrací 404', vyp.stav === false && s1.s === 404 && s2.s === 404 && s3.s === 404, JSON.stringify([s1.s, s2.s, s3.s]));
        const znovu = await p.vyhodnot(`(async () => { const d = ${D}; await d.sdileniUloz(); return d.sdileni.url; })()`);
        const s4 = await anonym('/share/' + token);
        kontrola('nové sdílení má novou adresu, stará zůstává mrtvá', !znovu.endsWith(token) && s4.s === 404, znovu.split('/').pop().slice(0, 6) + '…');
        const smaz = await p.vyhodnot(`(async () => { const d = ${D}; const c = window.confirm; window.confirm = () => true; await d.sdileniVypni(); window.confirm = c; return true; })()`);
        void smaz;

        await p.vyhodnot(`(async () => { await ${D}.sdileniUloz(); return true; })()`);
        const tokenSmazani = (await p.vyhodnot(`${D}.sdileni.url`)).split('/').pop();
        const slozka = path.join(__dirname, '..', '..', 'storage', 'app', 'sdileni', tokenSmazani);
        const predSmazanim = fs.existsSync(slozka);
        await p.vyhodnot(`(async () => { const d = ${D}; const r = await fetch(_kkInitData.routes.indexK + '/' + d.projektId, { method: 'DELETE', headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' } }); return r.status; })()`);
        const poSmazani = await anonym('/share/' + tokenSmazani);
        kontrola('smazání projektu zruší odkaz i soubory', predSmazanim && !fs.existsSync(slozka) && poSmazani.s === 404, JSON.stringify({ predSmazanim, slozkaZustala: fs.existsSync(slozka), s: poSmazani.s }));

        console.log('\n5) Tarif');
        const tarif = await p.vyhodnot(`(async () => { const d = ${D}; const b = window._kkInitData.exporty; window._kkInitData.exporty = false; const r = { povolen: d.exportPovolen }; window._kkInitData.exporty = b; r.zpet = d.exportPovolen; return r; })()`);
        kontrola('bez exportů v tarifu editor funkci nenabízí', tarif.povolen === false && tarif.zpet === true, JSON.stringify(tarif));

        const vazne = p.chybyDetail.filter(c => !/404|401|403/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
