/**
 * Popisky výkresu (úhly, kóty, označení stěn a otvorů) mají jedno pravidlo
 * velikosti: od přiblížení 0,8 stálá velikost na obrazovce, pod ním se
 * zmenšují s výkresem a nečitelné (< 6 px) se nekreslí. Zoom kolečkem musí
 * překreslit i úhly a nesmí smazat označení stěn.
 *
 * Spuštění: node services/import-test/test-popisky-zoom-ui.cjs
 */
const path = require('path');
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

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });

    // Stav popisků na obrazovce: písmo v px obrazovky (fontSize × měřítko)
    const stav = () => p.vyhodnot(`(() => { const d = ${D}; const s = d.stage.scaleX();
        const texty = d.stage.find('Text');
        const pismo = (f) => texty.filter(f).map(t => +(t.fontSize() * s).toFixed(2));
        const uhly = pismo(t => /°$/.test(t.text()));
        return { s: +s.toFixed(3), uhly, uhelMax: uhly.length ? Math.max(...uhly) : 0,
                 koty: pismo(t => /m$/.test(t.text()) && /^\\d/.test(t.text())).length,
                 idSten: [...d.renderer._labelShapes.keys()].filter(k => k.startsWith('id_W')).length,
                 idOtvoru: [...d.renderer._labelShapes.keys()].filter(k => k.startsWith('id_') && !k.startsWith('id_W')).length }; })()`);
    // Kolečko nad plátnem; zápor = přiblížit
    const kolecko = async (kroku, deltaY) => {
        const r = await p.vyhodnot(`(() => { const b = ${D}.stage.container().getBoundingClientRect();
            return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) }; })()`);
        for (let i = 0; i < kroku; i++) {
            await p.cmd('Input.dispatchMouseEvent', { type: 'mouseWheel', x: r.x, y: r.y, deltaX: 0, deltaY });
            await pauza(40);
        }
        await pauza(300);
    };
    const nastavZoom = (z) => p.vyhodnot(`(() => { ${D}.setZoom(${z}); return true; })()`);

    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(1500);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 15000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest popisky při zoomu ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 15000, 'editor');

        // Dům 10 × 7 m s příčkou a dveřmi, vše označené
        await p.vyhodnot(`(() => { const d = ${D}; const e = d.engine;
            const b = [[0,0],[800,0],[800,560],[0,560]];
            const steny = b.map((a, i) => e.addWall(a[0], a[1], b[(i+1)%4][0], b[(i+1)%4][1], 0.3));
            steny.forEach((w, i) => { const dalsi = steny[(i+1)%4]; dalsi.nodeA = w.nodeB; });
            e._cleanOrphanNodes();
            e.addOpening(steny[0].id, 3, 0.9, 'dvere');
            d.renderer.setSelection([...e.walls.keys()]);
            d.renderer.render(); return true; })()`);

        console.log('\n1) Přiblíženo (1,5) — stálá velikost na obrazovce');
        await nastavZoom(1.5);
        let s = await stav();
        kontrola('úhly jsou vidět', s.uhly.length >= 4, s.uhly.length + ' úhlů');
        kontrola('písmo úhlu 11 px', Math.abs(s.uhelMax - 11) < 0.05, s.uhelMax + ' px');
        kontrola('kóty a označení jsou vidět', s.koty >= 4 && s.idSten >= 4 && s.idOtvoru >= 1, JSON.stringify(s));

        console.log('\n2) Oddálení kolečkem pod mez — úhly se zmenší s výkresem');
        await kolecko(10, 120);   // 1,5 / 1,08^10 ≈ 0,69
        s = await stav();
        const ocekavane = 11 * s.s / 0.8;
        kontrola('úhel se překreslil po zoomu a zmenšil', s.uhly.length >= 4 && Math.abs(s.uhelMax - ocekavane) < 0.05,
            `zoom ${s.s}: ${s.uhelMax} px, čekáno ${ocekavane.toFixed(2)} px`);
        kontrola('označení stěn a otvorů po kolečku nezmizelo', s.idSten >= 4 && s.idOtvoru >= 1, JSON.stringify(s));
        kontrola('kóty po kolečku zůstaly', s.koty >= 4, s.koty + ' kót');
        await p.snimek(path.join(vystup, 'popisky-zoom-069.png'));

        console.log('\n3) Hodně oddáleno — nečitelné popisky se nekreslí');
        await kolecko(10, 120);   // ≈ 0,32
        s = await stav();
        kontrola('úhly skryté', s.uhly.length === 0, `zoom ${s.s}: ${s.uhly.length} úhlů`);
        kontrola('kóty a označení skryté', s.koty === 0 && s.idSten === 0, JSON.stringify(s));
        await p.snimek(path.join(vystup, 'popisky-zoom-032.png'));

        console.log('\n4) Zpět přiblížit kolečkem — popisky se vrátí');
        await kolecko(14, -120);
        s = await stav();
        kontrola('úhly zpět na 11 px', s.s >= 0.8 && Math.abs(s.uhelMax - 11) < 0.05, `zoom ${s.s}: ${s.uhelMax} px`);
        kontrola('označení zpět', s.idSten >= 4 && s.idOtvoru >= 1 && s.koty >= 4, JSON.stringify(s));

        const chyby = (p.chybyDetail || []).filter(c => !/favicon|mapy/i.test((c.url || '') + c.text));
        kontrola('bez chyb v konzoli', chyby.length === 0, chyby.slice(0, 3).map(c => c.text).join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA', e.message);
        await p.snimek(path.join(vystup, 'popisky-zoom-chyba.png')).catch(() => {});
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše OK');
    process.exit(chyb ? 1 : 0);
}

main();
