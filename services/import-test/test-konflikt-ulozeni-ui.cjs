/**
 * Starší karta nepřepíše novější práci: server odmítne zápis ze staré verze, editor přestane ukládat
 * a nabídne načtení, nebo přepsání. Editor se nesmí předbíhat sám se sebou.
 *
 * Spuštění: node services/import-test/test-konflikt-ulozeni-ui.cjs [složka snímků]
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

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const js = (t) => p.vyhodnot(`(() => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; ${t} })()`);
    // Zápis „z jiné karty": přímo na server s aktuální verzí, editor o něm neví
    const jinaKarta = (popis) => p.vyhodnot(`(async () => { const d = ${D}; const u = _kkInitData.routes.ulozit.replace(':id', d.projektId);
        const data = JSON.parse(JSON.stringify(d.engine.toJSON())); data.znacka = ${JSON.stringify(popis)};
        const r = await fetch(u, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' }, body: JSON.stringify({ data }) });
        return (await r.json()).verze; })()`);
    const stena = (y) => `e.addWall(0, ${y}*X, 5*X, ${y}*X, 0.2, 'pricka'); d.renderer.render(); d.autoSave('Stěna'); return e.walls.size;`;
    const pocetNaServeru = () => p.vyhodnot(`(async () => { const d = ${D}; const r = await fetch(location.href, { headers: { Accept: 'text/html' } }); const t = await r.text(); const m = t.match(/verze: (\\d+)/); return Number(m && m[1]); })()`);
    try {
        console.log('1) Přihlášení a nový koncept');
        await p.jdiNa(ZAKLAD + '/login');
        await p.cekej(`!!document.querySelector('input[name=password]')`, 20000, 'login');
        await p.vyhodnot(`(() => { const e = document.querySelector('input[name=email]') || document.querySelector('input[type=email]'); e.value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)}; document.querySelector('form').submit(); return true; })()`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/masterteam/koncept-v3');
        await p.cekej(`!!(window.Alpine && ${D})`, 20000, 'Alpine');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest konflikt ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');

        console.log('\n2) Běžné ukládání konflikt nevyvolá');
        await js(stena(1));
        // Několik uložení hned za sebou: čekají na sebe, verze se nepředbíhá
        const soubeh = await p.vyhodnot(`(async () => { const d = ${D}; const v0 = d.verze; const e = d.engine; const X = e.PX_PER_M;
            e.addWall(0, 2*X, 5*X, 2*X, 0.2, 'pricka'); d._zapisKrok('A'); const a = d.ulozit();
            e.addWall(0, 3*X, 5*X, 3*X, 0.2, 'pricka'); d._zapisKrok('B'); const b = d.ulozit();
            e.addWall(0, 4*X, 5*X, 4*X, 0.2, 'pricka'); d._zapisKrok('C'); const c = d.ulozit();
            await Promise.all([a, b, c]); await new Promise(r => setTimeout(r, 300));
            return { v0, verze: d.verze, konflikt: d._konfliktVerze ?? null, dialog: !!document.getElementById('kk-konflikt-dialog'), neodeslane: d._neodeslaneKroky.length }; })()`);
        kontrola('souběžná uložení se nepředbíhají a konflikt nehlásí', soubeh.verze > soubeh.v0 && soubeh.konflikt === null && !soubeh.dialog && soubeh.neodeslane === 0, JSON.stringify(soubeh));
        const podklad = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; e.addWall(0, 5*X, 5*X, 5*X, 0.2, 'pricka'); d._zapisKrok('D'); d.ulozit(); await d.podkladUloz(); await new Promise(r => setTimeout(r, 300)); return { konflikt: d._konfliktVerze ?? null }; })()`);
        kontrola('podklad při běžícím uložení konflikt nevyvolá', podklad.konflikt === null, JSON.stringify(podklad));
        // Import stěn: podklad a hned po něm kresba v témže kroku (Libor 13. 11. 2026 — hláška v jediném okně)
        const importPoradi = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M; e.addWall(0, 7*X, 5*X, 7*X, 0.2, 'pricka'); d._zapisKrok('E');
            const a = d.podkladUloz(); const b = d.ulozit(); await Promise.all([a, b]); await new Promise(r => setTimeout(r, 300));
            return { konflikt: d._konfliktVerze ?? null, dialog: !!document.getElementById('kk-konflikt-dialog'), neodeslane: d._neodeslaneKroky.length }; })()`);
        kontrola('podklad a hned kresba (import) konflikt nevyvolají', importPoradi.konflikt === null && !importPoradi.dialog && importPoradi.neodeslane === 0, JSON.stringify(importPoradi));
        const prejmenovani = await p.vyhodnot(`(async () => { const d = ${D}; const u = _kkInitData.routes.ulozit.replace(':id', d.projektId); const r = await fetch(u, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' }, body: JSON.stringify({ nazev: d.projektNazev }) }); return r.status; })()`);
        kontrola('přejmenování bez verze projde', prejmenovani === 200, String(prejmenovani));

        console.log('\n3) Jiná karta uloží novější verzi');
        const vJina = await jinaKarta('jina-karta');
        const vEditor = await js(`return d.verze;`);
        kontrola('verze se rozešly', vJina > vEditor, `server ${vJina}, editor ${vEditor}`);
        const pocetPred = await js(`return e.walls.size;`);
        await js(stena(6));
        await pauza(3500);
        const po = await js(`return { dialog: !!document.getElementById('kk-konflikt-dialog'), konflikt: d._konfliktVerze ?? null, neodeslane: d._neodeslaneKroky.length, nadpis: document.querySelector('#kk-konflikt-dialog h2')?.textContent, tlacitka: [...document.querySelectorAll('#kk-konflikt-dialog button')].map(b => b.textContent) };`);
        kontrola('editor ukáže dialog a práci neodešle', po.dialog && po.konflikt === vJina && po.neodeslane > 0, JSON.stringify(po));
        kontrola('dialog nabízí načíst i přepsat, s přeloženými texty', po.tlacitka.length === 2 && po.tlacitka.every(t => t && !t.includes('.')) && !!po.nadpis, JSON.stringify(po.tlacitka));
        await p.snimek(path.join(vystup, 'konflikt-dialog.png'));
        kontrola('server si nechal novější verzi', await pocetNaServeru() === vJina);
        const znacka = () => p.vyhodnot(`(async () => { const d = ${D}; const r = await fetch(_kkInitData.routes.indexK + '/' + d.projektId + '/export', { headers: { Accept: 'application/json' } }); const t = await r.text(); return t.includes('jina-karta'); })()`);
        const dalsi = await p.vyhodnot(`(async () => { const d = ${D}; await d.ulozit(); await d.podkladUloz(); await new Promise(r => setTimeout(r, 300)); return d.verze; })()`);
        kontrola('během konfliktu se dál neukládá', dalsi === vEditor && await pocetNaServeru() === vJina, `${dalsi}`);

        console.log('\n4) Přepsat touto verzí');
        await p.vyhodnot(`(() => { document.querySelector('[data-konflikt=prepsat]').click(); return true; })()`);
        await pauza(1500);
        const poPrepsani = await js(`return { verze: d.verze, konflikt: d._konfliktVerze ?? null, dialog: !!document.getElementById('kk-konflikt-dialog'), neodeslane: d._neodeslaneKroky.length, steny: e.walls.size };`);
        kontrola('přepsání uloží práci a ukládání zase běží', poPrepsani.verze === vJina + 1 && poPrepsani.konflikt === null && !poPrepsani.dialog && poPrepsani.neodeslane === 0, JSON.stringify(poPrepsani));
        await js(stena(7));
        await pauza(3000);
        const dale = await js(`return { konflikt: d._konfliktVerze ?? null, verze: d.verze, neodeslane: d._neodeslaneKroky.length };`);
        kontrola('další úprava se uloží normálně', dale.konflikt === null && dale.verze === vJina + 2 && dale.neodeslane === 0, JSON.stringify(dale));

        console.log('\n5) Načíst aktuální verzi');
        await jinaKarta('jina-karta-2');
        await js(stena(8));
        await pauza(3500);
        const steny = await js(`return e.walls.size;`);
        await p.vyhodnot(`(() => { document.querySelector('[data-konflikt=nacist]').click(); return true; })()`);
        await pauza(3500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor po načtení');
        await pauza(1500);
        const nacteno = await js(`return { steny: e.walls.size, verze: d.verze, konflikt: d._konfliktVerze ?? null, dialog: !!document.getElementById('kk-konflikt-dialog') };`);
        kontrola('načtení dá novější verzi, bez dialogu', nacteno.steny === steny - 1 && nacteno.konflikt === null && !nacteno.dialog, JSON.stringify({ ...nacteno, predtim: steny }));
        await js(stena(9));
        await pauza(3000);
        const poNacteni = await js(`return { konflikt: d._konfliktVerze ?? null, neodeslane: d._neodeslaneKroky.length };`);
        kontrola('po načtení se zase ukládá', poNacteni.konflikt === null && poNacteni.neodeslane === 0, JSON.stringify(poNacteni));

        const vazne = p.chybyDetail.filter(c => !/404|409/.test(c.text));
        kontrola('bez chyb v konzoli', vazne.length === 0, vazne.slice(0, 3).map(c => (c.text || '').slice(0, 200)).join(' | '));
    } finally {
        await p.zavri();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(2); });
