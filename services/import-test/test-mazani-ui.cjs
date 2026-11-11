/**
 * Potvrzení mazání v editoru (Libor 11. 11. 2026: „čekal jsem ověření typu opravdu smazat, zkontroluj,
 * aby to tak bylo u všeho mazání“).
 *
 *   - každé mazání se zeptá „Opravdu smazat?“ a řekne, co zmizí; Zrušit nic nezmění, OK smaže
 *   - klávesa Delete (stěna, otvor, sloup), seznam objektů, schody, sloup, střecha, podklad, parcela
 *   - Delete během tažení: okno spolkne puštění myši, proto tah po Zrušit skončí a objekt zůstane, kam dojel
 *   Sestavu, skříňku a rameno kontroluje test-sestava-ui, oddělovač test-oddelovac-ui, nábytek test-katalog-ui.
 *
 * Okno prohlížeče test nahradí záznamem textu a předem danou odpovědí (window.__odpoved).
 * Spuštění: node services/import-test/test-mazani-ui.cjs
 */
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
const blizko = (a, b, tol) => Math.abs(a - b) <= tol;

async function main() {
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    // Bod plánu v metrech (y dolů jako na plátně) → bod obrazovky
    const obr = (xm, ym) => p.vyhodnot(`(() => { const d = ${D}; const X = d.engine.PX_PER_M; const t = d.stage.getAbsoluteTransform().copy().point({ x: ${xm} * X, y: ${ym} * X });
        const r = d.stage.container().getBoundingClientRect(); return { x: Math.round(r.left + t.x), y: Math.round(r.top + t.y) }; })()`);
    const mys = (type, b, navic = {}) => p.cmd('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', ...navic });
    const klavesaDelete = async () => {
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
        await p.cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Delete', code: 'Delete', windowsVirtualKeyCode: 46 });
        await pauza(250);
    };
    const odpovez = (ano) => p.vyhodnot(`window.__potvrzeni = []; window.__odpoved = ${ano}; true`);
    const texty = () => p.vyhodnot('window.__potvrzeni.slice()');
    const nazev = (id) => p.vyhodnot(`${D}._nazevProSmazani(${JSON.stringify(id)})`);
    /** Tah myší po krocích se stisknutým tlačítkem; myš zůstane stisknutá. */
    const tahni = async (a, dx, dy) => {
        await mys('mouseMoved', a);
        await mys('mousePressed', a, { clickCount: 1, buttons: 1 });
        for (let i = 1; i <= 6; i++) { await mys('mouseMoved', { x: a.x + dx * i / 6, y: a.y + dy * i / 6 }, { buttons: 1 }); await pauza(40); }
        await pauza(150);
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
            body: JSON.stringify({ nazev: 'ClaudeTest mazání ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await p.vyhodnot(`window.__potvrzeni = []; window.__odpoved = true; window.confirm = (t) => { window.__potvrzeni.push(String(t)); return window.__odpoved; }; true`);

        console.log('\n1) Místnost 5 × 4 m s dveřmi v dolní stěně');
        const ids = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            const b = [[0,0],[5,0],[5,4],[0,4]];
            b.forEach((q, i) => { const r = b[(i + 1) % b.length]; e.addWall(q[0]*X, q[1]*X, r[0]*X, r[1]*X, 0.3, 'obvodova'); });
            const steny = [...e.walls.values()];
            const najdi = (y) => steny.find(w => { const a = e.nodes.get(w.nodeA), c = e.nodes.get(w.nodeB); return Math.abs(a.y - y * X) < 1 && Math.abs(c.y - y * X) < 1; });
            const horni = najdi(0), dolni = najdi(4);
            const a2 = e.nodes.get(dolni.nodeA);
            e.addOpening(dolni.id, a2.x < 1 ? 0.4 : 5 - 0.4 - 0.9, 0.9, 'dvere', { presnaSirka: true });
            d.nastroj = 'vyber'; d.panelOtvoruPoz = { x: 6, y: 6 }; d.fitView(); d.stage.scale({ x: 0.65, y: 0.65 }); d.stage.position({ x: 440, y: 120 });
            d.renderer.render(); d.autoSave('Místnost');
            return { horni: horni.id, dolni: dolni.id, otvor: [...e.openings.keys()][0] }; })()`);
        await pauza(500);
        const stav = () => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; const w = e.walls.get(${JSON.stringify(ids.horni)});
            return { steny: e.walls.size, otvory: e.openings.size, horniY: w ? +(e.nodes.get(w.nodeA).y / X).toFixed(3) : null,
                tah: !!(d.isDraggingWall || d.isDraggingNode || d.isDraggingOpening || d.isDraggingVybaveni), cekajiciTah: !!d._pendingDrag, domTah: !!d._domTah }; })()`);
        let st = await stav();
        kontrola('čtyři stěny a dveře', st.steny === 4 && st.otvory === 1, JSON.stringify(st));

        console.log('\n2) Klávesa Delete: stěna a otvor');
        const nazevSteny = await nazev(ids.horni);
        await p.vyhodnot(`(() => { document.activeElement?.blur?.(); const d = ${D}; d.renderer.setSelection([${JSON.stringify(ids.horni)}]); d.renderer.render(); return true; })()`);
        await odpovez(false);
        await klavesaDelete();
        st = await stav();
        let t = await texty();
        kontrola('Delete u stěny se zeptá s jejím názvem, Zrušit ji nechá', st.steny === 4 && t.length === 1 && t[0] === 'Opravdu smazat?\n' + nazevSteny && /\S+ \S+/.test(nazevSteny), JSON.stringify({ st, t }));
        const nazevOtvoru = await nazev(ids.otvor);
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([], [], [${JSON.stringify(ids.otvor)}]); d.renderer.render(); return true; })()`);
        await odpovez(true);
        await klavesaDelete();
        st = await stav();
        t = await texty();
        kontrola('Delete u dveří se zeptá, po OK dveře zmizí a stěny zůstanou', st.otvory === 0 && st.steny === 4 && t.length === 1 && t[0] === 'Opravdu smazat?\n' + nazevOtvoru, JSON.stringify({ st, t }));

        console.log('\n3) Seznam objektů');
        const nazevDolni = await nazev(ids.dolni);
        await odpovez(false);
        await p.vyhodnot(`(() => { ${D}.smazatObjekt(${JSON.stringify(ids.dolni)}); return true; })()`);
        st = await stav();
        t = await texty();
        kontrola('křížek v seznamu objektů se zeptá, Zrušit stěnu nechá', st.steny === 4 && t.length === 1 && t[0] === 'Opravdu smazat?\n' + nazevDolni, JSON.stringify({ st, t }));

        console.log('\n4) Delete během tažení stěny');
        await p.vyhodnot(`(() => { const d = ${D}; d.renderer.setSelection([]); d.renderer.render(); return true; })()`);
        const a = await obr(2.5, 0);
        await tahni(a, 0, 40);
        const predDelete = await stav();
        await odpovez(false);
        await klavesaDelete();
        const poZruseni = await stav();
        t = await texty();
        kontrola('stěna se táhla a Delete se zeptal', predDelete.tah && predDelete.horniY > 0.05 && t.length === 1, JSON.stringify({ predDelete, t }));
        kontrola('po Zrušit tah skončil, stěna zůstala, kam dojela', !poZruseni.tah && !poZruseni.cekajiciTah && poZruseni.steny === 4 && blizko(poZruseni.horniY, predDelete.horniY, 0.001), JSON.stringify(poZruseni));
        // Skutečné okno by puštění myši spolklo: další pohyb už stěnou hýbat nesmí
        await mys('mouseMoved', { x: a.x, y: a.y + 90 }, { buttons: 1 });
        await pauza(100);
        await mys('mouseReleased', { x: a.x, y: a.y + 90 }, { clickCount: 1 });
        await pauza(250);
        st = await stav();
        kontrola('další pohyb myši stěnou nepohne', !st.tah && blizko(st.horniY, predDelete.horniY, 0.001), JSON.stringify(st));
        await p.vyhodnot(`(() => { const d = ${D}; d.undo(); d.renderer.setSelection([]); d.renderer.render(); return true; })()`);
        await pauza(250);

        console.log('\n5) Sloup: panel, tah a klávesa Delete');
        await p.vyhodnot(`(() => { const d = ${D}; const X = d.engine.PX_PER_M; d._sloupKlik({ x: 2 * X, y: 2 * X }, { evt: {} }); return true; })()`);
        await pauza(200);
        const sloup = () => p.vyhodnot(`(() => { const d = ${D}; const s = (d.engine.dum.sloupy || [])[0]; return { pocet: (d.engine.dum.sloupy || []).length, id: s?.id, x: s ? +s.x.toFixed(3) : null, domTah: !!d._domTah }; })()`);
        let sl = await sloup();
        const nazevSloupu = await nazev(sl.id);
        await odpovez(false);
        await p.vyhodnot(`(() => { ${D}.smazatSloup(); return true; })()`);
        t = await texty();
        kontrola('Smazat v panelu sloupu se zeptá, Zrušit ho nechá', (await sloup()).pocet === 1 && t.length === 1 && t[0] === 'Opravdu smazat?\n' + nazevSloupu, JSON.stringify({ t, nazevSloupu }));
        const s0 = await obr(sl.x, 2);
        await tahni(s0, 45, 0);
        const sloupPredDelete = await sloup();
        await odpovez(false);
        await klavesaDelete();
        const sloupPoZruseni = await sloup();
        t = await texty();
        kontrola('Delete při tažení sloupu se zeptá, po Zrušit tah skončil a sloup zůstal posunutý', sloupPredDelete.domTah && sloupPredDelete.x > sl.x + 0.05 && t.length === 1
            && !sloupPoZruseni.domTah && sloupPoZruseni.pocet === 1 && blizko(sloupPoZruseni.x, sloupPredDelete.x, 0.001), JSON.stringify({ sl, sloupPredDelete, sloupPoZruseni, t }));
        await mys('mouseMoved', { x: s0.x + 120, y: s0.y }, { buttons: 1 });
        await pauza(100);
        await mys('mouseReleased', { x: s0.x + 120, y: s0.y }, { clickCount: 1 });
        await pauza(250);
        kontrola('další pohyb myši sloupem nepohne', blizko((await sloup()).x, sloupPredDelete.x, 0.001), JSON.stringify(await sloup()));
        await p.vyhodnot(`(() => { document.activeElement?.blur?.(); const d = ${D}; d.renderer.setSelection([]); d.renderer.selectedSloupy.add(${JSON.stringify(sl.id)}); d.renderer.render(); return true; })()`);
        await odpovez(true);
        await klavesaDelete();
        t = await texty();
        kontrola('Delete u vybraného sloupu se zeptá, po OK sloup zmizí', (await sloup()).pocet === 0 && t.length === 1 && t[0].startsWith('Opravdu smazat?\n'), JSON.stringify(t));

        console.log('\n6) Střecha');
        await p.vyhodnot(`(() => { ${D}.strechaVytvor(); return true; })()`);
        await odpovez(false);
        await p.vyhodnot(`(() => { ${D}.smazatStrechu(); return true; })()`);
        t = await texty();
        kontrola('Smazat střechu se zeptá, Zrušit ji nechá', await p.vyhodnot(`!!${D}.engine.dum.strecha`) && t.length === 1 && t[0] === 'Opravdu smazat?\nStřecha', JSON.stringify(t));
        await odpovez(true);
        await p.vyhodnot(`(() => { ${D}.smazatStrechu(); return true; })()`);
        kontrola('po OK střecha zmizí', !(await p.vyhodnot(`!!${D}.engine.dum.strecha`)));

        console.log('\n7) Schody');
        const schody = await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; d.pridatPodlazi('nahoru'); d.naPodlazi(e.dum.podlazi.find(q => q.id !== e.dum.aktivni && q.typ !== 'sklep').id);
            d.schodyStart = { x: 1 * X, y: 1 * X }; d._schodyKlik({ x: 1 * X, y: 3.5 * X }, { evt: {} }); const s = e.dum.schodiste[0]; return s ? s.id : null; })()`);
        await pauza(200);
        const nazevSchodu = await nazev(schody);
        await odpovez(false);
        await p.vyhodnot(`(() => { ${D}.smazatSchody(); return true; })()`);
        t = await texty();
        kontrola('Smazat schody se zeptá, Zrušit je nechá', schody && (await p.vyhodnot(`${D}.engine.dum.schodiste.length`)) === 1 && t.length === 1 && t[0] === 'Opravdu smazat?\n' + nazevSchodu, JSON.stringify({ schody, t }));
        await odpovez(true);
        await p.vyhodnot(`(() => { ${D}.smazatSchody(); return true; })()`);
        kontrola('po OK schody zmizí', (await p.vyhodnot(`${D}.engine.dum.schodiste.length`)) === 0);

        console.log('\n8) Podklad a parcela');
        await odpovez(false);
        await p.vyhodnot(`(() => { ${D}.podkladOdeber(); return true; })()`);
        t = await texty();
        kontrola('Odebrat podklad se zeptá', t.length === 1 && t[0] === 'Opravdu smazat?\nPodklad (výkres pod kresbou)', JSON.stringify(t));
        st = await p.vyhodnot(`(async () => { const d = ${D}; d.katastrParcely = [{ cislo: '101/1', typ: 'stavebni' }, { cislo: '102', typ: 'pozemkova' }];
            window.__potvrzeni = []; window.__odpoved = false; await d.katastrOdeberParcelu(1); const n = d.katastrParcely.length; d.katastrParcely = []; return { n, t: window.__potvrzeni.slice() }; })()`);
        kontrola('odebrání parcely se zeptá s jejím číslem, Zrušit ji nechá', st.n === 2 && st.t.length === 1 && st.t[0].startsWith('Opravdu smazat?\n102 ('), JSON.stringify(st));

        const chybyKonzole = p.chyby.filter(x => !/favicon|ERR_|net::/.test(x));
        kontrola('konzole bez chyb', chybyKonzole.length === 0, chybyKonzole.slice(0, 5).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
