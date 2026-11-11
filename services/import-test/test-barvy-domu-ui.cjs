/**
 * Barvy celého domu a podlahy místností: fasáda včetně okrajů desek, okna a dveře venku a
 * uvnitř, „Jinde použité" jako výčet z domu, dekor a barva podlahy, Zpět, uložení.
 *
 * Spuštění: node services/import-test/test-barvy-domu-ui.cjs [složka snímků]
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

// Materiály scény podle klíče barvy
const MATERIALY = `const materialy = (klic) => { const v = []; window._kk3d.wallGroup.traverse(o => { if (!o.material) return; for (const m of [].concat(o.material)) if (m.userData?.barva === klic && !m.userData.jas) v.push({ o, m }); }); return v; };`;

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const naObr = (x, y) => p.vyhodnot(`(() => { const d = ${D}; const t = d.stage.getAbsoluteTransform().copy().point({x:${x},y:${y}});
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const klik = async (b) => {
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y });
        await pauza(40);
        await p.cmd('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, button: 'left', clickCount: 1, buttons: 1 });
        await p.cmd('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, button: 'left', clickCount: 1 });
        await pauza(300);
    };
    const PX = 80;
    const m = (x, y) => naObr(x * PX, y * PX);

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
            body: JSON.stringify({ nazev: 'ClaudeTest barvy ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const url = await p.vyhodnot('location.href');

        console.log('\n1) Dům: dvě podlaží, střecha, okno a dveře venku, dveře uvnitř');
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const w1 = e.addWall(0, 0, 10*X, 0, 0.4, 'obvodova');
            e.addWall(10*X, 0, 10*X, 7*X, 0.4, 'nosna');
            const w3 = e.addWall(10*X, 7*X, 0, 7*X, 0.4, 'obvodova');
            e.addWall(0, 7*X, 0, 0, 0.4, 'obvodova');
            const w5 = e.addWall(5*X, 0, 5*X, 7*X, 0.25, 'pricka');
            e.addOpening(w1.id, 2, 1.2, 'okno', { presnaSirka: true });
            e.addOpening(w3.id, 7, 0.9, 'dvere', { presnaSirka: true });
            e.addOpening(w5.id, 3, 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.fitView(); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(400);
        await p.vyhodnot(`(() => { const d = ${D}; d.pridatPodlazi('nahoru'); d.strechaVytvor(); d.naPodlazi('P1'); d.fitView(); d.renderer.render(); return true; })()`);
        await pauza(400);
        await p.vyhodnot(`(async () => { const d = ${D}; await d.prepni3d(); await new Promise(r => setTimeout(r, 500)); return true; })()`);

        console.log('\n2) Barva domu: jedna pro všechna podlaží, včetně okrajů desek');
        await p.vyhodnot(`(() => { const d = ${D}; d.podlaziUprava = 'P2'; return true; })()`);
        await pauza(250);
        const fasada = await p.vyhodnot(`(async () => { const d = ${D}; ${MATERIALY} const cek = () => new Promise(r => setTimeout(r, 200));
            const panel = document.querySelector('[data-uprava=P2] [data-barva-fasady]');
            const zavreno = !panel.querySelector('[data-barva-nastroj]');
            panel.querySelector('[data-barva-symbol]').click(); await cek();
            const kroky = d.historie.length;
            const jas = panel.querySelector('[data-barva-posuvnik=l]');
            jas.value = 75; jas.dispatchEvent(new Event('input', { bubbles: true })); await cek();
            const zaTahu = { hex: '#' + materialy('fasada')[0].m.color.getHexString(), zapis: d.engine.dum.barvy.fasada, kroku: d.historie.length - kroky };
            jas.dispatchEvent(new Event('change', { bubbles: true })); await cek(); await cek();
            const zapis = d.engine.dum.barvy.fasada;
            const vse = materialy('fasada');
            const barvy = [...new Set(vse.map(x => '#' + x.m.color.getHexString()))];
            const desek = vse.filter(x => Array.isArray(x.o.material)).length;
            const skupiny = new Set(); vse.forEach(x => { let g = x.o; while (g && !g.userData.podlazi) g = g.parent; if (g) skupiny.add(g.userData.podlazi); });
            const kroku = d.historie.length - kroky;
            panel.querySelector('[data-barva-symbol]').click(); await cek();
            d.podlaziUprava = null;
            return { zavreno, zaTahu, zapis, barvy, desek, podlazi: [...skupiny], kroku }; })()`);
        kontrola('zavřený je jen symbol, za tahu se mění 3D bez zápisu', fasada.zavreno && fasada.zaTahu.kroku === 0 && fasada.zaTahu.hex !== fasada.zaTahu.zapis, JSON.stringify(fasada.zaTahu));
        kontrola('po puštění jeden krok; stěny i boky desek všech podlaží mají jednu barvu', fasada.kroku === 1 && fasada.barvy.length === 1 && fasada.barvy[0] === fasada.zapis && fasada.desek >= 3 && fasada.podlazi.length === 2, JSON.stringify(fasada));
        await pauza(200);
        await p.snimek(path.join(vystup, 'barvy-fasada.png'));

        console.log('\n3) Okno a dveře: vybrané ve 2D, barvy pro celý dům, panel zůstává ve 3D');
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); d.rezim3d = false; d.fitView(); d.renderer.render(); return true; })()`);
        await pauza(400);
        await klik(await m(2.6, 0));
        const okno = await p.vyhodnot(`(() => { const d = ${D}; const b = document.querySelector('[data-barvy-otvoru]');
            return { typ: d.inspector?.typ, panel: !!b, nadpis: b?.firstElementChild?.innerText, ven: !!b?.querySelector('[data-barva-otvoru=ven] [data-barva-symbol]'), dovnitr: !!b?.querySelector('[data-barva-otvoru=dovnitr] [data-barva-symbol]') }; })()`);
        kontrola('klik na okno ukáže barvy Venku a Uvnitř pro všechna okna', okno.typ === 'okno' && okno.ven && okno.dovnitr && /všech oken/.test(okno.nadpis), JSON.stringify(okno));
        await p.vyhodnot(`(async () => { document.querySelector('[data-barva-otvoru=ven] [data-barva-symbol]').click(); await new Promise(r => setTimeout(r, 200)); return true; })()`);
        await p.snimek(path.join(vystup, 'barvy-panel-okna.png'));
        const okno2 = await p.vyhodnot(`(async () => { const d = ${D}; ${MATERIALY} const cek = () => new Promise(r => setTimeout(r, 250));
            d.setBarvaDomu('oknoVen', '#293133'); await cek();
            await d.prepni3d(); await new Promise(r => setTimeout(r, 500));
            const panel3d = getComputedStyle(document.getElementById('kk-panel-otvoru')).display !== 'none';
            const poz = (k) => materialy(k).map(x => { const v = new THREE.Vector3(); x.o.getWorldPosition(v); return { x: v.x, z: v.z, hex: '#' + x.m.color.getHexString() }; }).filter(a => a.z < 1 && a.x < 4);
            const ven = poz('oknoVen'), uvnitr = poz('oknoDovnitr');
            return { panel3d, nVen: ven.length, nUvn: uvnitr.length, zVen: Math.max(...ven.map(a => a.z)), zUvn: Math.min(...uvnitr.map(a => a.z)), hexVen: [...new Set(ven.map(a => a.hex))], hexUvn: [...new Set(uvnitr.map(a => a.hex))] }; })()`);
        kontrola('panel vybraného okna zůstává i ve 3D', okno2.panel3d);
        kontrola('okno na severní stěně: vnější půlka rámu má barvu „venku", vnitřní druhou', okno2.nVen > 0 && okno2.zVen < okno2.zUvn && okno2.hexVen[0] === '#293133' && okno2.hexUvn[0] === '#f3f4f6', JSON.stringify(okno2));
        const dvere = await p.vyhodnot(`(async () => { const d = ${D}; ${MATERIALY}
            d.setBarvaDomu('dvereVen', '#112233'); await new Promise(r => setTimeout(r, 250));
            const pos = (k) => materialy(k).map(x => { const v = new THREE.Vector3(); x.o.getWorldPosition(v); return { x: +v.x.toFixed(2), z: +v.z.toFixed(2) }; });
            return { ven: pos('dvereVen'), uvn: pos('dvereDovnitr'), vnitrni: pos('dvereVnitrni') }; })()`);
        const zVen = Math.max(...dvere.ven.map(a => a.z)), naPricce = dvere.uvn.filter(a => Math.abs(a.x - 5) < 0.2);
        const venNaPricce = dvere.ven.filter(a => Math.abs(a.x - 5) < 0.2);
        kontrola('vchodové dveře na jižní stěně mají barvu „venku" na vnější straně', dvere.ven.length > 0 && zVen > 7 && Math.max(...dvere.uvn.filter(a => a.z > 6).map(a => a.z)) < zVen, `ven z ${zVen}`);
        kontrola('dveře mezi místnostmi mají jednu vlastní barvu, vchodové „uvnitř" ji nesdílí', dvere.vnitrni.length > 0 && dvere.vnitrni.every(a => Math.abs(a.x - 5) < 0.2) && naPricce.length === 0 && venNaPricce.length === 0, JSON.stringify({ vnitrni: dvere.vnitrni.length, naPricce: naPricce.length, venNaPricce: venNaPricce.length }));
        const steny3d = await p.vyhodnot(`(() => { const out = { fasada: [], bila: [] }; window._kk3d.podlaziSkupiny.get('P1').children.forEach(o => { if (!Array.isArray(o.material) || o.material.length !== 2) return; const poz = o.geometry.getAttribute('position'); for (const [i, g] of o.geometry.groups.entries()) { const m = o.material[g.materialIndex]; const cil = m.userData.barva === 'fasada' ? out.fasada : out.bila; for (let v = g.start; v < g.start + g.count; v += 3) { const n = new THREE.Vector3(); const a = new THREE.Vector3().fromBufferAttribute(poz, v), b = new THREE.Vector3().fromBufferAttribute(poz, v + 1), c = new THREE.Vector3().fromBufferAttribute(poz, v + 2); n.subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)); if (Math.abs(n.y) > 1e-6) continue; cil.push(+((a.x + b.x + c.x) / 3).toFixed(2), +((a.z + b.z + c.z) / 3).toFixed(2)); } } }); const body = (v) => { const p = []; for (let i = 0; i < v.length; i += 2) p.push([v[i], v[i + 1]]); return p; }; const f = body(out.fasada), b = body(out.bila); const vne = (q) => q[0] < -0.19 || q[0] > 10.19 || q[1] < -0.19 || q[1] > 7.19; const barvy = window._kk3d.podlaziSkupiny.get('P1').children.filter(o => Array.isArray(o.material) && o.material.length === 2).map(o => '#' + o.material[0].color.getHexString()); return { fasadaVne: f.filter(vne).length, fasadaUvnitr: f.filter(q => !vne(q) && q[0] > 0.3 && q[0] < 9.7 && q[1] > 0.3 && q[1] < 6.7).length, bilaVne: b.filter(vne).length, bilaUvnitr: b.filter(q => q[0] > 0.1 && q[0] < 9.9 && q[1] > 0.1 && q[1] < 6.9).length, barvaUvnitr: [...new Set(barvy)] }; })()`);
        kontrola('ve 3D: vnější líc fasáda, vnitřní líce a příčky bílé', steny3d.fasadaVne > 0 && steny3d.fasadaUvnitr === 0 && steny3d.bilaVne === 0 && steny3d.bilaUvnitr > 0 && steny3d.barvaUvnitr.length === 1 && steny3d.barvaUvnitr[0] === '#ffffff', JSON.stringify(steny3d));
        const deska = await p.vyhodnot(`(() => { const d = window._kk3d.dumSkupina.children.find(o => Array.isArray(o.material) && o.material.length >= 3); if (!d) return null; const poz = d.geometry.getAttribute('position'); const horni = d.geometry.groups.find(g => g.materialIndex === 2), spodni = d.geometry.groups.find(g => g.materialIndex === 0); return { horniZ: poz.getZ(horni.start), spodniZ: poz.getZ(spodni.start), barva: d.material[2].userData.barva }; })()`);
        kontrola('vrch stropu pod patrem má barvu fasády, spodek zůstává (opravdu horní plocha)', deska && deska.barva === 'fasada' && deska.horniZ > deska.spodniZ, JSON.stringify(deska));
        await p.snimek(path.join(vystup, 'barvy-okno-3d.png'));

        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); d.rezim3d = false; d.renderer.clearSelection(); d.panelOtvoruPoz = { x: 500, y: 460 }; d.fitView(); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(400);
        await klik(await m(5, 3.45));
        const vnitrniDvere = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 200)); const b = document.querySelector('[data-barvy-otvoru]');
            const out = { typ: d.inspector?.typ, obvodovy: d.inspector?.obvodovy, nadpis: b?.firstElementChild?.innerText, jedna: !!b?.querySelector('[data-barva-otvoru=jedna]'), ven: !!b?.querySelector('[data-barva-otvoru=ven]') };
            b?.querySelector('[data-barva-otvoru=jedna] [data-barva-symbol]')?.click(); await cek();
            const pole = b?.querySelector('[data-barva-ral]'); out.ral = pole?.value; out.popisek = pole?.previousElementSibling?.textContent;
            const jas = b?.querySelector('[data-barva-posuvnik=l]'); if (jas) { jas.value = 40; jas.dispatchEvent(new Event('input', { bubbles: true })); await cek(); out.ralZaTahu = pole.value; jas.dispatchEvent(new Event('change', { bubbles: true })); await cek(); }
            out.barva = d.engine.dum.barvy.dvereVnitrni; out.vchodove = d.engine.dum.barvy.dvereDovnitr;
            if (pole) { pole.value = '7016'; pole.dispatchEvent(new Event('change', { bubbles: true })); await cek(); out.ralPoZadani = pole.value; out.popisekPoZadani = pole.previousElementSibling.textContent; }
            return out; })()`);
        kontrola('vnitřní dveře: jedna barva pro všechny, vchodové se nemění', vnitrniDvere.typ === 'dvere' && vnitrniDvere.obvodovy === false && vnitrniDvere.jedna && !vnitrniDvere.ven && /vnitřních dveří/.test(vnitrniDvere.nadpis) && vnitrniDvere.barva !== vnitrniDvere.vchodove, JSON.stringify(vnitrniDvere));
        kontrola('pole RAL ukazuje aktuální odstín a mění se s barvou', /^RAL \d{4} /.test(vnitrniDvere.ral || '') && /^RAL \d{4} /.test(vnitrniDvere.ralZaTahu || '') && vnitrniDvere.popisek === 'Nejbližší RAL' && /^RAL 7016 /.test(vnitrniDvere.ralPoZadani || '') && vnitrniDvere.popisekPoZadani === 'RAL', JSON.stringify(vnitrniDvere));
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.clearSelection(); d._selectionTick++; return true; })()`);
        await pauza(150);

        console.log('\n4) Jinde použité: co je na domě, ne historie');
        const jinde = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 200));
            d.setStrecha('krytina', 'falc'); d.setStrecha('barva', '#aa1111'); await cek(); const a = d.barvyJinde('fasada').map(b => b.hex);
            d.setStrecha('barva', '#3f4347'); await cek(); const b = d.barvyJinde('fasada');
            const uStrechy = d.barvyJinde('strecha').map(x => x.hex);
            return { predtim: a.includes('#aa1111'), pozdeji: b.map(x => x.hex).includes('#aa1111'), strechaUSebe: uStrechy.includes('#3f4347'), popis: b.find(x => x.hex === '#3f4347')?.kde, okna: b.find(x => x.hex === '#293133')?.kde, fasadaUSebe: b.some(x => x.hex === d.engine.dum.barvy.fasada) }; })()`);
        kontrola('stará barva střechy ze seznamu zmizí, nová tam je i s popisem, kde je', jinde.predtim && !jinde.pozdeji && jinde.popis === 'Střecha' && /Okna venku/.test(jinde.okna || ''), JSON.stringify(jinde));
        kontrola('prvek v seznamu nenabízí sám sebe', !jinde.strechaUSebe && !jinde.fasadaUSebe, JSON.stringify(jinde));

        console.log('\n5) Podlaha místnosti: dekor a barva ve stejném okně jako název');
        await p.vyhodnot(`(() => { const d = ${D}; d.prepni2d(); d.rezim3d = false; d.renderer.clearSelection(); d.fitView(); d.renderer.render(); d._selectionTick++; return true; })()`);
        await pauza(400);
        await klik(await m(2.5, 4.5));
        const pan = await p.vyhodnot(`(() => { const d = ${D}; const i = d.inspector; return { kind: i?.kind, select: !!document.querySelector('[data-dekor-podlahy]'), symbol: !!document.querySelector('[data-barva-podlahy] [data-barva-symbol]'), nazevVPanelu: !!document.querySelector('#kk-panel-otvoru input[placeholder=Název]'), id: i?.id, barva2d: i?.barva }; })()`);
        kontrola('klik na místnost: v panelu s názvem je i dekor a barva podlahy', pan.kind === 'mistnost' && pan.select && pan.symbol && pan.nazevVPanelu, JSON.stringify(pan));
        await p.vyhodnot(`(() => { const s = document.querySelector('[data-dekor-podlahy]'); s.value = 'prkna'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
        await pauza(250);
        await p.vyhodnot(`(async () => { document.querySelector('[data-barva-podlahy] [data-barva-symbol]').click(); await new Promise(r => setTimeout(r, 200)); return true; })()`);
        await p.snimek(path.join(vystup, 'barvy-panel-mistnosti.png'));
        const podl = await p.vyhodnot(`(async () => { const d = ${D}; const cek = () => new Promise(r => setTimeout(r, 250)); const id = ${JSON.stringify(pan.id)};
            const zaznam = JSON.stringify(d.engine.najdiMistnost(id).podlaha);
            await d.prepni3d(); await new Promise(r => setTimeout(r, 500));
            const najdi = () => { let mesh = null; window._kk3d.wallGroup.traverse(o => { if (o.userData.podlaha === id) mesh = o; }); return mesh; };
            const mesh = najdi();
            const plocha = mesh ? (() => { const pos = mesh.geometry.getAttribute('position'); let s = 0; for (let i = 0; i < pos.count; i += 3) { const ax = pos.getX(i), az = pos.getZ(i), bx = pos.getX(i+1), bz = pos.getZ(i+1), cx = pos.getX(i+2), cz = pos.getZ(i+2); s += Math.abs((bx-ax)*(cz-az)-(cx-ax)*(bz-az)) / 2; } return s; })() : 0;
            const textura = !!mesh?.material.map;
            const zacatek = mesh ? '#' + mesh.material.color.getHexString() : null;
            const posuv = document.querySelector('[data-barva-podlahy] [data-barva-posuvnik=l]');
            const krok0 = d.historie.length;
            posuv.value = 30; posuv.dispatchEvent(new Event('input', { bubbles: true })); await cek();
            const zaTahu = { hex: '#' + najdi().material.color.getHexString(), kroku: d.historie.length - krok0 };
            posuv.dispatchEvent(new Event('change', { bubbles: true })); await cek(); await cek();
            const m2 = d.engine.najdiMistnost(id);
            const poPusteni = { barva: m2.podlaha.barva, barva2d: m2.barva, kroku: d.historie.length - krok0 };
            const hex3d = '#' + najdi().material.color.getHexString();
            return { zaznam, plocha, textura, zacatek, zaTahu, poPusteni, hex3d, mistnost: d.renderer.plochaMistnosti(id) }; })()`);
        kontrola('dekor se zapíše a ve 3D má plochu místnosti s texturou (navíc jen pruh pod stěnami)', /prkna/.test(podl.zaznam) && podl.textura && podl.plocha >= podl.mistnost && podl.plocha - podl.mistnost < 1.1, JSON.stringify({ zaznam: podl.zaznam, plocha: podl.plocha, mistnost: podl.mistnost }));
        // Směr vzoru (Libor 11. 11. 2026): podél stěn, prkna po delší straně místnosti, tlačítko 90° napříč
        const smer = await p.vyhodnot(`(async () => { const d = ${D}; const eng = { walls: new Map(), nodes: new Map(), PX_PER_M: 100, smerRastru: () => 0 };
            const sirsi = d._smerDekoru([{ x0: 0, x1: 400, y0: 0, y1: 200 }], 0, 0, 1, eng, null), hlubsi = d._smerDekoru([{ x0: 0, x1: 200, y0: 0, y1: 400 }], 0, 0, 1, eng, null), otocena = d._smerDekoru([{ x0: 0, x1: 400, y0: 0, y1: 200 }], 0, 0, 1, eng, { podlaha: { otoceni: 90 } });
            const btn = document.querySelector('[data-dekor-otocit]'); const videt = !!btn && btn.offsetParent !== null; btn?.click(); await new Promise(r => setTimeout(r, 400)); const m = d.engine.mistnosti.find(x => x.podlaha?.dekor === 'prkna'); const po = m?.podlaha?.otoceni;
            btn?.click(); await new Promise(r => setTimeout(r, 400)); return { sirsi: +sirsi.toFixed(4), hlubsi: +hlubsi.toFixed(4), otocena: +otocena.toFixed(4), videt, po, zpet: m?.podlaha?.otoceni ?? 0 }; })()`);
        kontrola('vzor podél stěn, prkna po delší straně, tlačítko 90° je otočí napříč a zpět', smer.sirsi === 0 && Math.abs(smer.hlubsi - 1.5708) < 1e-3 && Math.abs(smer.otocena - 1.5708) < 1e-3 && smer.videt && smer.po === 90 && smer.zpet === 0, JSON.stringify(smer));
        kontrola('tah mění podlahu bez kroku, po puštění jeden krok; barva v půdorysu zůstane', podl.zaTahu.kroku === 0 && podl.zaTahu.hex !== podl.zacatek && podl.poPusteni.kroku === 1 && podl.hex3d === podl.poPusteni.barva && podl.poPusteni.barva2d === pan.barva2d, JSON.stringify(podl));
        await p.vyhodnot(`(() => { const d = ${D}; d.skryte3d = ['P2']; d.zobrazStrechu3d = false; d._nastavViditelnost3d(); return true; })()`);
        await pauza(400);
        await p.snimek(path.join(vystup, 'barvy-podlaha-3d.png'));
        for (const dekor of ['parkety', 'dlazba30', 'dlazba60', 'beton', 'koberec']) {
            await p.vyhodnot(`(async () => { const d = ${D}; d.setMistnostPodlaha({ dekor: ${JSON.stringify(dekor)}, barva: null }); await new Promise(r => setTimeout(r, 400)); return true; })()`);
            await p.snimek(path.join(vystup, `barvy-dekor-${dekor}.png`));
        }
        const zpetDekor = await p.vyhodnot(`(async () => { const d = ${D}; const id = ${JSON.stringify(pan.id)}; const cek = () => new Promise(r => setTimeout(r, 300));
            d.setMistnostPodlaha({ dekor: 'dlazba30' }); await cek();
            const pred = d.engine.najdiMistnost(id).podlaha.dekor; d.undo(); await cek();
            const po = d.engine.najdiMistnost(id).podlaha.dekor;
            d.skryte3d = []; d.zobrazStrechu3d = true; d._nastavViditelnost3d();
            return { pred, po }; })()`);
        kontrola('Zpět vrátí dekor', zpetDekor.pred === 'dlazba30' && zpetDekor.po === 'koberec', JSON.stringify(zpetDekor));

        console.log('\n6) Uložení: barvy i podlaha přežijí znovunačtení, jiné podlaží má vlastní podlahy');
        const predUlozenim = await p.vyhodnot(`(async () => { const d = ${D}; d.prepni2d(); d.rezim3d = false; d.setBarvaDomu('oknoDovnitr', '#334455'); await new Promise(r => setTimeout(r, 4000)); return { barvy: d.engine.dum.barvy, podlaha: d.engine.najdiMistnost(${JSON.stringify(pan.id)}).podlaha }; })()`);
        await p.jdiNa(url);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.engine.walls.size > 0)`, 20000, 'editor po načtení');
        await pauza(500);
        const poNacteni = await p.vyhodnot(`(() => { const d = ${D}; return { barvy: d.engine.dum.barvy, podlaha: d.engine.najdiMistnost(${JSON.stringify(pan.id)})?.podlaha || null, naP2: (d.engine.enginePodlazi('P2')?.mistnosti || []).filter(m => m.podlaha).length, historie: 'pouziteBarvy' in d.engine.dum }; })()`);
        kontrola('po načtení stejné barvy a podlaha', JSON.stringify(poNacteni.barvy) === JSON.stringify(predUlozenim.barvy) && JSON.stringify(poNacteni.podlaha) === JSON.stringify(predUlozenim.podlaha), JSON.stringify(poNacteni));
        kontrola('podlaha nepřeskočila na jiné podlaží, historie barev v domě není', poNacteni.naP2 === 0 && !poNacteni.historie);

        const vazne = p.chybyDetail.filter(c => !/404/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200) + ' @ ' + (c.url || '') + ':' + (c.radek || '')).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
