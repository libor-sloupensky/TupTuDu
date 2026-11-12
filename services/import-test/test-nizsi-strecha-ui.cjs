/**
 * Nižší střecha (Libor 12. 11. 2026): patrový dům s přízemní garáží mimo obrys patra. Editor nad garáží
 * přidá sám pultovou střechu od zdi patra (10°, okap ve výšce stropu, plech v barvě hlavní střechy),
 * hlavní střecha se nemění. Výběr v panelu i klepnutím v půdorysu, krytina podle sklonu, terasa se
 * zábradlím, bez střechy, 3D (bez štítu a čela u zdi patra), Zpět, uložení a obnovení, prstenec kolem patra.
 *
 * Spuštění: node services/import-test/test-nizsi-strecha-ui.cjs [složka snímků]
 *           V3_URL=http://127.0.0.1:8031 (výchozí 8002)
 */
const path = require('path');
const fs = require('fs');
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
const blizko = (a, b, tol) => typeof a === 'number' && Math.abs(a - b) <= tol;
const TG10 = Math.tan(10 * Math.PI / 180);

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup', 'nizsi-strecha');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const obr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const m = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const PX = d.engine.PX_PER_M; const t = d.stage.getAbsoluteTransform().copy().point({x:${x}*PX,y:${y}*PX});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(250);
    };
    const pole = (sel, hod) => p.vyhodnot(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n) return false; n.value = ${JSON.stringify(String(hod))}; n.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    // Stav nižších střech: id, typy hran, výšky u zdi a u okapu, nastavení
    const stav = () => p.vyhodnot(`(() => { const d = ${D}; const n = d._nizsiStrechy(); const hl = d._strechaVypocet();
        return { pocet: n.length, hlavniHran: hl ? hl.hrany.length : 0, hlavniZMax: hl ? +hl.zMax.toFixed(3) : null,
            n: n.map(x => ({ id: x.id, podlazi: x.podlazi, nazev: x.nazev, typy: x.v.hrany.map(h => (h.zed ? 'zed' : h.typ)).join(','),
                uZdi: window.Strecha.vyskaVBode(x.v.plochy, 10.17, 4), uOkapu: window.Strecha.vyskaVBode(x.v.plochy, 14.13, 4),
                typ: x.nast.typ, sklon: x.nast.sklon, krytina: x.nast.krytina, barva: x.nast.barva, rucneKrytina: x.nast.rucneKrytina,
                terasa: !!x.v.terasa, zadna: !!x.v.zadna, plocha: Math.round(x.plocha * 100) / 100 })) }; })()`);
    const panel = () => p.vyhodnot(`(() => { const d = ${D}; const s = d.strechaPanel; const u = document.querySelector('[data-uprava=strecha]');
        return s && { nizsi: s.nizsi, id: s.id, typ: s.st && s.st.typ, krytina: s.krytina, auto: s.autoKrytina, autoText: s.autoText, volby: (s.volby || []).length,
            vyber: !!u?.querySelector('[data-strecha-vyber]'), autoVidet: !!u?.querySelector('[data-krytina-auto]')?.offsetParent,
            smazatVidet: [...(u?.querySelectorAll('button') || [])].some(b => b.offsetParent && /Smazat|Delete/.test(b.textContent)),
            typy: [...(u?.querySelectorAll('[data-strecha-typ] option') || [])].map(o => o.value).join(',') }; })()`);
    const v3d = (fn) => p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = true; await d.prepni3d(); await new Promise(r => setTimeout(r, 1200));
        const sk = window._kk3d.dumSkupina; const vysledek = (${fn})(d, sk); return vysledek; })()`);
    // Šikmý pohled na celý dům (azimut od +x ve stupních), snímek jen 3D plátna
    const snimek3d = async (jmeno, azimut = 40, cil = [7, 2.5, 4]) => {
        await p.vyhodnot(`(() => { const _3d = window._kk3d; const u = ${azimut} * Math.PI / 180;
            _3d.controls.target.set(${cil[0]}, ${cil[1]}, ${cil[2]}); _3d.camera.position.set(${cil[0]} + Math.cos(u) * 30, 17, ${cil[2]} + Math.sin(u) * 30);
            _3d.camera.zoom = 1; _3d.camera.updateProjectionMatrix(); _3d.controls.update(); _3d.kresliDo = performance.now() + 800; return true; })()`);
        await pauza(900);
        const r = await p.vyhodnot(`(() => { const c = document.getElementById('kk-3d-container').getBoundingClientRect(); return { x: c.left, y: c.top, w: c.width, h: c.height }; })()`);
        const { data } = await p.cmd('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
        fs.writeFileSync(path.join(vystup, jmeno), Buffer.from(data, 'base64'));
    };
    const zpet2d = () => p.vyhodnot(`(async () => { const d = ${D}; d.rezim3d = false; await d.prepni2d?.(); await new Promise(r => setTimeout(r, 400)); return true; })()`);

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
            body: JSON.stringify({ nazev: 'ClaudeTest nizsi strecha ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');
        await p.vyhodnot('window.confirm = () => true; true');

        console.log('\n1) Přízemí 14 × 8 m se střechou, jedno podlaží: žádná nižší střecha');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const b = [[0,0],[14,0],[14,8],[0,8]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d.strechaVytvor(); d.autoSave('Přízemí'); return true; })()`);
        await pauza(800);
        let s = await stav();
        kontrola('jedno podlaží: hlavní střecha nad ním, nižší žádná', s.pocet === 0 && s.hlavniHran === 4, JSON.stringify(s));

        console.log('\n2) Patro jen nad domem 10 × 8 m, garáž 4 m zůstane přízemní');
        await p.vyhodnot(`(() => { const d = ${D}; d.podlaziKopie = false; d.pridatPodlazi('nahoru'); const e = d.engine; const X = e.PX_PER_M;
            const b = [[0,0],[10,0],[10,8],[0,8]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            d.renderer._mistnostiCache = null; d.fitView(); d.renderer.render(); d.autoSave('Patro'); return true; })()`);
        await pauza(1000);
        s = await stav();
        const g = s.n[0];
        kontrola('editor přidal sám jednu nižší střechu nad garáží v 1.NP', s.pocet === 1 && g.podlazi === 'P1', JSON.stringify(s));
        kontrola('garáž má plochu 4 × 8,3 m', g && blizko(g.plocha, 33.2, 0.3), g && String(g.plocha));
        kontrola('hlavní střecha je nad patrem (čtyři hrany)', s.hlavniHran === 4, String(s.hlavniHran));
        kontrola('výchozí pultová 10°: okap naproti zdi patra, boky štíty, u patra zeď', g && g.typ === 'pultova' && g.sklon === 10 && g.typy.split(',').sort().join(',') === 'okap,stit,stit,zed', g && g.typy);
        kontrola('okap ve výšce stropu přízemí, ke zdi patra stoupá', g && blizko(g.uOkapu, 3.05, 0.02) && blizko(g.uZdi, 3.05 + 4 * TG10, 0.02), g && `${g.uOkapu} / ${g.uZdi}`);
        const hl = await p.vyhodnot(`(() => { const d = ${D}; return { typ: d.engine.dum.strecha.krytina, barva: d.engine.dum.strecha.barva, zobrazena: window.Krytiny3d.vzhled('taska', d.engine.dum.strecha.barva)?.hex }; })()`);
        kontrola('pod bezpečným sklonem tašek je plech (falc) v barvě hlavní střechy', g && g.krytina === 'falc' && g.barva === hl.zobrazena && !g.rucneKrytina, JSON.stringify({ g: [g.krytina, g.barva], hl }));
        kontrola('název podle podlaží', g && /^1\.NP – /.test(g.nazev), g && g.nazev);

        console.log('\n3) Panel: výběr střechy, krytina podle sklonu');
        await p.vyhodnot(`(() => { const d = ${D}; d.panelOpen.plochy = true; d._strechaZapni(); d.podlaziUprava = 'strecha'; d._selectionTick++; return true; })()`);
        await pauza(400);
        let pn = await panel();
        kontrola('panel nabízí výběr: hlavní a nižší', pn && pn.vyber && pn.volby === 2 && !pn.nizsi, JSON.stringify(pn));
        await pole('[data-strecha-vyber]', g.id);
        await pauza(300);
        pn = await panel();
        kontrola('vybraná nižší: typy s terasou a bez střechy, krytina podle sklonu, bez tlačítka smazat',
            pn.nizsi && pn.id === g.id && pn.typy.includes('terasa') && pn.typy.includes('zadna') && pn.auto && pn.autoVidet && !pn.smazatVidet, JSON.stringify(pn));
        await pole('[data-strecha-pole=sklon]', 25);
        await pauza(300);
        s = await stav();
        kontrola('sklon 25° (nad bezpečným sklonem tašek): stejná krytina i barva jako hlavní', s.n[0].sklon === 25 && s.n[0].krytina === 'taska' && s.n[0].barva === hl.barva, JSON.stringify(s.n[0]));
        await pole('[data-strecha-pole=sklon]', 10);
        await pauza(200);
        await pole('[data-uprava=strecha] [data-krytina]', 'trapez');
        await pauza(300);
        s = await stav();
        pn = await panel();
        kontrola('ručně zvolená krytina platí a panel nabídne návrat podle sklonu', s.n[0].krytina === 'trapez' && s.n[0].rucneKrytina && !pn.auto, JSON.stringify(s.n[0]));
        await p.vyhodnot(`(document.querySelector('[data-podle-sklonu]').click(), 1)`);
        await pauza(300);
        s = await stav();
        kontrola('podle sklonu: zpět plech', s.n[0].krytina === 'falc' && !s.n[0].rucneKrytina, JSON.stringify(s.n[0]));
        const hlavniBez = await p.vyhodnot(`(() => { const d = ${D}; const st = d.engine.dum.strecha; return { sklon: st.sklon, krytina: st.krytina, typ: st.typ }; })()`);
        kontrola('úpravy nižší střechy nesahají na hlavní', hlavniBez.sklon === 38 && hlavniBez.typ === 'sedlova', JSON.stringify(hlavniBez));

        console.log('\n4) Klepnutí v půdorysu vybere střechu i hranu');
        // Pohled na celé přízemí: přizpůsobení bere jen patro a garáž by byla mimo plátno
        await p.vyhodnot(`(() => { const d = ${D}; const PX = d.engine.PX_PER_M; const st = d.stage; const r = st.container().getBoundingClientRect();
            const k = Math.min((r.width - 500) / (17 * PX), (r.height - 100) / (11 * PX)); st.rotation(0); st.scale({ x: k, y: k }); st.position({ x: 40 - (-1.5) * PX * k, y: 50 - (-1.5) * PX * k });
            d.renderer.render(); d.vyberStrechu(''); return true; })()`);
        await pauza(300);
        await klik(await m(12.2, 4));
        let vyb = await p.vyhodnot(`(() => { const d = ${D}; return { vyber: d.strechaVyber, hrana: d.strechaHrana }; })()`);
        kontrola('klepnutí na plochu nad garáží vybere nižší střechu', vyb.vyber === g.id && !vyb.hrana, JSON.stringify(vyb));
        await klik(await m(14.15, 2));
        vyb = await p.vyhodnot(`(() => { const d = ${D}; return { vyber: d.strechaVyber, hrana: d.strechaHrana, panel: d.strechaPanel.hrana && d.strechaPanel.hrana.typ }; })()`);
        kontrola('klepnutí na okap garáže vybere jeho hranu', vyb.vyber === g.id && vyb.hrana && vyb.panel === 'okap', JSON.stringify(vyb));
        await klik(await m(5, 2));
        vyb = await p.vyhodnot(`(() => { const d = ${D}; return { vyber: d.strechaVyber, hrana: d.strechaHrana, panel: d.strechaPanel.nizsi }; })()`);
        kontrola('klepnutí na hlavní střechu vybere hlavní', vyb.vyber === null && vyb.panel === false, JSON.stringify(vyb));
        await p.snimek(path.join(vystup, 'pudorys-strech.png'));

        console.log('\n5) 3D: pultová garáž bez štítu a čela u zdi patra');
        let d3 = await v3d(`(d, sk) => {
            const n = sk.children.filter(o => o.userData.strechaId && o.userData.strechaId !== 'hlavni');
            const druhy = {}; for (const o of n) for (const k of ['krytina', 'podbiti', 'celo', 'zlab', 'stit', 'hrebenac', 'terasa', 'zabradli']) if (o.userData[k]) druhy[k] = (druhy[k] || 0) + 1;
            // Svislé plochy (štít, čelo) v rovině zdi patra x = 10,15 m by se s ní praly
            let uZdi = 0;
            for (const o of n.filter(o => o.userData.stit || o.userData.celo)) {
                const a = o.geometry.getAttribute('position');
                for (let i = 0; i < a.count; i += 3) { const xs = [a.getX(i), a.getX(i + 1), a.getX(i + 2)]; if (xs.every(x => Math.abs(x - 10.15) < 0.02)) uZdi++; }
            }
            const kota = d.engine.kotaPodlazi('P1');
            const kr = n.find(o => o.userData.krytina);
            kr.geometry.computeBoundingBox();
            return { druhy, uZdi, nizsi: n.every(o => o.userData.nizsi === 'P1'), vrch: +(kr.geometry.boundingBox.max.y - kota).toFixed(3), hlavni: sk.children.filter(o => o.userData.strechaId === 'hlavni' && o.userData.krytina).length };
        }`);
        kontrola('nižší střecha má krytinu, podbití, dva štíty a okapový žlab', d3.druhy.krytina >= 1 && d3.druhy.podbiti === 1 && d3.druhy.stit === 1 && d3.druhy.zlab === 1, JSON.stringify(d3));
        kontrola('u zdi patra žádný štít ani čelo', d3.uZdi === 0, String(d3.uZdi));
        kontrola('krytina končí u zdi patra nad okapem o sklon a tloušťku', blizko(d3.vrch, 3.05 + 4.0 * TG10 + 0.28 / Math.cos(10 * Math.PI / 180), 0.03), String(d3.vrch));
        kontrola('hlavní střecha ve 3D zůstává', d3.hlavni >= 2 && d3.nizsi, JSON.stringify(d3));
        await snimek3d('pultova-3d.png');
        // Skrytý přízemek skryje i jeho nižší střechu, skrytá střecha všechny
        const vid = await p.vyhodnot(`(() => { const d = ${D}; const sk = window._kk3d.dumSkupina; const nizsi = () => sk.children.filter(o => o.userData.nizsi).every(o => o.visible);
            const hlavni = () => sk.children.filter(o => o.userData.strechaId === 'hlavni').every(o => o.visible);
            d.skryte3d = ['P1']; d._nastavViditelnost3d(); const bezPrizemi = { nizsi: nizsi(), hlavni: hlavni() };
            d.skryte3d = []; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); const bezStrechy = { nizsi: sk.children.filter(o => o.userData.nizsi).some(o => o.visible) };
            d.zobrazStrechu3d = true; d._nastavViditelnost3d(); return { bezPrizemi, bezStrechy, vse: nizsi() && hlavni() }; })()`);
        kontrola('skryté přízemí skryje i nižší střechu, skrytá střecha obě', !vid.bezPrizemi.nizsi && vid.bezPrizemi.hlavni && !vid.bezStrechy.nizsi && vid.vse, JSON.stringify(vid));

        console.log('\n6) Terasa a bez střechy');
        await p.vyhodnot(`(() => { const d = ${D}; d.vyberStrechu(${JSON.stringify(g.id)}); d.setStrecha('typ', 'terasa'); return true; })()`);
        await pauza(500);
        d3 = await p.vyhodnot(`(async () => { const d = ${D}; await new Promise(r => setTimeout(r, 400)); const sk = window._kk3d.dumSkupina;
            const n = sk.children.filter(o => o.userData.nizsi); const dl = n.find(o => o.userData.dlazba); dl.geometry.computeBoundingBox();
            const pochozi = d._prochazkaSite ? (window._kk3d._prochazkaSite = null, d._prochazkaSite().pochozi) : [];
            return { dlazba: +(dl.geometry.boundingBox.max.y - d.engine.kotaPodlazi('P2')).toFixed(3), zabradli: n.filter(o => o.userData.zabradli).length,
                krytina: n.filter(o => o.userData.krytina).length, pochozi: pochozi.includes(dl), zabradliPochozi: pochozi.some(o => o.userData.zabradli) }; })()`);
        kontrola('terasa: dlažba ve výšce podlahy patra, zábradlí, bez krytiny', blizko(d3.dlazba, 0.02, 0.005) && d3.zabradli >= 6 && d3.krytina === 0, JSON.stringify(d3));
        kontrola('po terase jde v procházce chodit, po zábradlí ne', d3.pochozi && !d3.zabradliPochozi, JSON.stringify(d3));
        await snimek3d('terasa-3d.png');
        pn = await panel();
        kontrola('panel terasy bez krytiny a sklonu', pn.typ === 'terasa' && !pn.autoVidet, JSON.stringify(pn));
        await p.vyhodnot(`(() => { const d = ${D}; d.setStrecha('typ', 'zadna'); return true; })()`);
        await pauza(500);
        d3 = await p.vyhodnot(`(async () => { await new Promise(r => setTimeout(r, 400)); return window._kk3d.dumSkupina.children.filter(o => o.userData.nizsi).length; })()`);
        kontrola('bez střechy: nad garáží nic, jen strop', d3 === 0, String(d3));
        const zpet = await p.vyhodnot(`(() => { const d = ${D}; d.undo(); const po = d._nastaveniNizsi(${JSON.stringify(g.id)}).typ; d.redo(); return { po, znovu: d._nastaveniNizsi(${JSON.stringify(g.id)}).typ }; })()`);
        kontrola('Zpět vrátí terasu, Znovu bez střechy', zpet.po === 'terasa' && zpet.znovu === 'zadna', JSON.stringify(zpet));
        await zpet2d();

        console.log('\n7) Valbová garáž a uložení');
        await p.vyhodnot(`(() => { const d = ${D}; d.vyberStrechu(${JSON.stringify(g.id)}); d.setStrecha('typ', 'valbova'); return true; })()`);
        await pauza(300);
        s = await stav();
        kontrola('valbová: okap na všech vnějších hranách, u patra zeď', s.n[0].typy.split(',').sort().join(',') === 'okap,okap,okap,zed' && s.n[0].sklon === 30, JSON.stringify(s.n[0]));
        await p.vyhodnot(`${D}.ulozit()`);
        await pauza(2000);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.dum.podlazi.length === 2)`, 20000, 'editor po obnovení');
        await pauza(1000);
        s = await stav();
        kontrola('po obnovení drží valbová nad garáží se stejným id', s.pocet === 1 && s.n[0].id === g.id && s.n[0].typ === 'valbova', JSON.stringify(s.n[0]));
        await p.vyhodnot('window.confirm = () => true; true');

        console.log('\n8) Patro uprostřed přízemí: střecha kolem dokola (prstenec)');
        await p.vyhodnot(`(() => { const d = ${D}; d.naPodlazi('P2'); const e = d.engine; const X = e.PX_PER_M;
            for (const w of [...e.walls.values()]) e.removeWall(w.id);
            const b = [[3,2],[11,2],[11,6],[3,6]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            d.renderer._mistnostiCache = null; d.renderer.render(); d.autoSave('Patro uprostřed'); return true; })()`);
        await pauza(800);
        const prs = await p.vyhodnot(`(() => { const d = ${D}; const n = d._nizsiStrechy(); const x = n[0]; if (!x) return { pocet: 0 };
            let pl = 0; for (const q of x.v.plochy) for (const t of q.troj) pl += Math.abs(window.Strecha.plochaPolygonu(t));
            return { pocet: n.length, diry: x.diry.length, typy: x.v.hrany.map(h => h.typ).join(','), plocha: +pl.toFixed(2), nadPatrem: window.Strecha.vyskaVBode(x.v.plochy, 7, 4), okolo: window.Strecha.vyskaVBode(x.v.plochy, 1, 4) }; })()`);
        kontrola('jedna nižší střecha s patrem jako dírou', prs.pocet === 1 && prs.diry === 1, JSON.stringify(prs));
        kontrola('valbová kolem dokola, nad patrem nic', prs.nadPatrem === null && prs.okolo > 3 && prs.typy.split(',').every(t => t === 'okap'), JSON.stringify(prs));
        await p.snimek(path.join(vystup, 'prstenec-2d.png'));
        d3 = await v3d(`(d, sk) => sk.children.filter(o => o.userData.nizsi && o.userData.krytina).length`);
        kontrola('prstenec ve 3D postavený', d3 >= 1, String(d3));
        await snimek3d('prstenec-3d.png');
        await zpet2d();

        console.log('\n9) Smazání hlavní střechy smaže i nižší, Zpět je vrátí');
        const smaz = await p.vyhodnot(`(() => { const d = ${D}; d.vyberStrechu(''); d.smazatStrechu(); const po = { pocet: d._nizsiStrechy().length, nast: Object.keys(d.engine.dum.nizsiStrechy).length };
            d.undo(); return { po, zpet: d._nizsiStrechy().length }; })()`);
        kontrola('bez hlavní střechy nižší nevznikají, Zpět vrátí obě', smaz.po.pocet === 0 && smaz.po.nast === 0 && smaz.zpet === 1, JSON.stringify(smaz));
        kontrola('bez chyb v konzoli', !p.chyby.length, p.chyby.join(' | '));
    } catch (e) {
        chyb++;
        console.error('CHYBA', e.message);
    } finally {
        await p.zavri?.();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}
main();
