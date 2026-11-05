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
        kontrola('odkaz vznikl a je v poli, editor zůstal ve 2D a data se nezměnila', /\/share\/[A-Za-z0-9]{40}$/.test(zalozeny.url) && zalozeny.pole === zalozeny.url && !zalozeny.rezim3d && zalozeny.json === pred.json, zalozeny.url);
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
        kontrola('jdou přepnout podlaží a střecha, nahoře 3D a půdorysy', prohlizec.tlacitka[0] === 'Střecha' && prohlizec.tlacitka.includes('1.NP') && prohlizec.tlacitka.includes('2.NP') && prohlizec.vyber[0] === '3D' && prohlizec.vyber.length === 3, JSON.stringify({ t: prohlizec.tlacitka, v: prohlizec.vyber }));
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
