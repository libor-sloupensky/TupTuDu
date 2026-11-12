/**
 * Výběr pozemku na mapě (Libor 12. 11. 2026): jeden postup pro všechny země.
 *
 *   - mapa se otevře z panelu Parcela, Leaflet se načte, podklad Mapy.com a vrstva hranic parcel podle země
 *   - v každé zemi klik na mapu najde parcelu z národního katastru, bod leží uvnitř obrysu
 *   - přidání do projektu: parcela v editoru, okolí, výškový profil ze země pozemku
 *   - parcela z jiné země k projektu nesousedí a nepřidá se
 *   - obkreslení pozemku tam, kde katastr nemáme (Rakousko)
 * Snímky pro kontrolu očima (sedí obrys na letecké mapě a na vrstvě katastru?) jdou do V3_SNIMKY.
 *
 * Spuštění: node services/import-test/test-mapa-pozemku-ui.cjs
 */
const path = require('path');
const fs = require('fs');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = process.env.V3_EMAIL || 'libor.sloupensky@seznam.cz';
const HESLO = process.env.V3_HESLO || '12345';
const SNIMKY = process.env.V3_SNIMKY || path.join(require('os').tmpdir(), 'mapa-pozemku');
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

// Místa s rodinnými domy, bod uprostřed pozemku (ověřeno službami 12. 11. 2026)
const MISTA = [
    { zeme: 'CZ', nazev: 'Říčany', vysky: true, lat: 49.989809, lon: 14.650139 },
    { zeme: 'SK', nazev: 'Banská Bystrica', vysky: true, lat: 48.737482, lon: 19.147434 },
    { zeme: 'PL', nazev: 'Zakopane', vysky: true, lat: 49.301824, lon: 19.952773 },
    { zeme: 'FR', nazev: 'Rennes', vysky: true, lat: 48.123277, lon: -1.603509 },
    { zeme: 'ES', nazev: 'Madrid', vysky: false, lat: 40.4290, lon: -3.6935 },
    { zeme: 'IT', nazev: 'Torino', vysky: false, lat: 44.998623, lon: 7.685416 },
    { zeme: 'DE', nazev: 'Bonn (NRW)', vysky: true, lat: 50.683631, lon: 7.15849 },
    { zeme: 'DE', nazev: 'Weimar (TH)', vysky: false, lat: 50.980992, lon: 11.31911 },
];

let chyb = 0;
const kontrola = (popis, podminka, detail = '') => {
    const ok = !!podminka;
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

async function main() {
    fs.mkdirSync(SNIMKY, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    const mys = (type, b) => p.cmd('Input.dispatchMouseEvent', { type, x: b.x, y: b.y, button: 'left', clickCount: 1 });
    const klikni = async (b) => { await mys('mouseMoved', b); await mys('mousePressed', b); await mys('mouseReleased', b); };
    /** Bod mapy (lat, lon) → bod obrazovky. */
    const naObrazovku = (lat, lon) => p.vyhodnot(`(() => { const m = window.__kkMapaPozemku; const b = m.latLngToContainerPoint([${lat}, ${lon}]);
        const r = m.getContainer().getBoundingClientRect(); return { x: Math.round(r.left + b.x), y: Math.round(r.top + b.y) }; })()`);
    const najed = async (lat, lon, zoom = 18) => {
        // Informace z předchozího místa smazat, jinak by test četl starou zemi
        await p.vyhodnot(`(() => { ${D}.mapaInfo = null; window.__kkMapaPozemku.setView([${lat}, ${lon}], ${zoom}, { animate: false }); return true; })()`);
        await pauza(400);
        await p.cekej(`${D}.mapaInfo !== null`, 15000, 'informace o místě');
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
            body: JSON.stringify({ nazev: 'ClaudeTest mapa pozemku ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await p.vyhodnot(`window.__chyby = []; window.addEventListener('error', e => window.__chyby.push(String(e.message))); true`);

        console.log('\n1) Otevření mapy z panelu Parcela');
        kontrola('tlačítko „Vybrat pozemek na mapě“ je v panelu', await p.vyhodnot(`!!document.querySelector('[data-mapa-otevrit]')`));
        await p.vyhodnot(`(() => { ${D}.panelOpen.parcela = true; document.querySelector('[data-mapa-otevrit]').click(); return true; })()`);
        await p.cekej(`!!(window.L && window.__kkMapaPozemku && document.querySelector('[data-mapa-pozemku].leaflet-container'))`, 20000, 'Leaflet');
        kontrola('mapa se otevřela', await p.vyhodnot(`${D}.mapaPozemku === true`));

        console.log('\n2) Parcela kliknutím v každé zemi');
        for (const m of MISTA) {
            await najed(m.lat, m.lon);
            const info = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.mapaInfo))`);
            // Dlaždice vrstvy parcel se v prohlížeči opravdu načetly (server je smí poslat na cizí stránku)
            const wmsDlazdice = `(() => { let n = 0, ok = 0; window.__kkMapaPozemku.eachLayer(l => { if (!l.wmsParams) return;
                for (const k in l._tiles) { n++; const t = l._tiles[k]; if (t.loaded && t.el.complete && t.el.naturalWidth > 0) ok++; } }); return { n, ok }; })()`;
            try { await p.cekej(`${wmsDlazdice}.ok > 0`, 20000, 'dlaždice vrstvy parcel'); } catch { /* vyhodnotí kontrola */ }
            const dl = await p.vyhodnot(wmsDlazdice);
            kontrola(`${m.nazev}: vrstva hranic parcel se načetla v prohlížeči`, dl.ok > 0, `${dl.ok} z ${dl.n} dlaždic`);
            await pauza(1000);
            await p.cekej(`!${D}.mapaNacitani`, 60000, 'předchozí dotaz');
            await p.vyhodnot(`(() => { ${D}.mapaHlaska = ''; return true; })()`);
            const pred = await p.vyhodnot(`${D}.mapaVybrane.length`);
            const t0 = Date.now();
            await klikni(await naObrazovku(m.lat, m.lon));
            await p.cekej(`!${D}.mapaNacitani && (${D}.mapaVybrane.length > ${pred} || ${D}.mapaHlaska)`, 60000, 'parcela ' + m.nazev);
            const sekund = ((Date.now() - t0) / 1000).toFixed(1);
            const vybrana = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.mapaVybrane[${pred}] || null))`);
            const hlaska = await p.vyhodnot(`${D}.mapaHlaska`);
            const uvnitr = vybrana && await p.vyhodnot(`${D}._bodVPolygonu(${m.lat}, ${m.lon}, ${D}.mapaVybrane[${pred}].polygon_wgs84)`);
            kontrola(`${m.nazev}: parcela ${vybrana?.cislo ?? '—'} (${vybrana?.vymera ?? '?'} m²), země ${vybrana?.zeme}, vrstva parcel ${info.wms ? 'ano' : 'ne'}`,
                vybrana && vybrana.zeme === m.zeme && uvnitr && info.wms, (hlaska ? hlaska + ', ' : '') + sekund + ' s');
            // Výšky jen tam, kde je model terénu 1 m (Španělsko 5 m a Itálie 10 m vypnuté, Durynsko bez služby)
            kontrola(`${m.nazev}: výškový profil ${m.vysky ? 'ano' : 'ne'}`, info.vysky === m.vysky, JSON.stringify({ vysky: info.vysky }));
            await pauza(1500);
            await p.snimek(path.join(SNIMKY, `mapa-${m.zeme}-${m.nazev.replace(/\W+/g, '-')}.png`));
            if (!vybrana) continue;
            // Klik na vybranou parcelu ji odebere
            await klikni(await naObrazovku(m.lat, m.lon));
            await pauza(300);
            kontrola(`${m.nazev}: klik na vybranou parcelu ji odebere`, await p.vyhodnot(`${D}.mapaVybrane.length === ${pred}`));
        }

        console.log('\n3) Přidání české parcely do projektu');
        const cz = MISTA[0];
        await najed(cz.lat, cz.lon);
        await klikni(await naObrazovku(cz.lat, cz.lon));
        await p.cekej(`!${D}.mapaNacitani && ${D}.mapaVybrane.length === 1`, 30000, 'česká parcela');
        await p.vyhodnot(`(() => { document.querySelector('[data-mapa-potvrdit]').click(); return true; })()`);
        await p.cekej(`!${D}.mapaPozemku && ${D}.katastrParcely.length === 1`, 40000, 'přidání do projektu');
        await p.cekej(`!${D}.katastrNacitaniProfil && !!${D}.vyskovyProfil?.body?.length`, 60000, 'výškový profil');
        const stav = await p.vyhodnot(`(() => { const d = ${D}; const pr = d.vyskovyProfil; return { parcel: d.katastrParcely.length, zeme: d.katastrParcely[0].zeme,
            body: pr.body.length, min: pr.vyska_min, max: pr.vyska_max, okoli: (d._katastrOkolni || []).length, stavby: (d.katastrParcely[0].stavby || []).length,
            atribuce: d.katastrAtribuce() }; })()`);
        kontrola('parcela je v projektu se zemí CZ', stav.parcel === 1 && stav.zeme === 'CZ', JSON.stringify(stav));
        kontrola('výškový profil z DMR 5G (stovky bodů, Říčany kolem 330 m)', stav.body > 100 && stav.min > 300 && stav.max < 360);
        kontrola('okolní parcely a stavby načtené', stav.okoli > 0, `okolí ${stav.okoli}, stavby ${stav.stavby}`);
        kontrola('zdroj dat v panelu', /ČÚZK/.test(stav.atribuce), stav.atribuce);
        await p.vyhodnot(`(() => { ${D}.fitView?.(); return true; })()`);
        await pauza(1500);
        await p.snimek(path.join(SNIMKY, 'editor-CZ.png'));

        console.log('\n3b) Přepínač výšek terénu: vypnuté = rovina, drží se v projektu');
        kontrola('přepínač je v panelu Parcela', await p.vyhodnot(`!!document.querySelector('[data-vysky-prepinac]') && getComputedStyle(document.querySelector('[data-vysky-prepinac]')).display !== 'none'`));
        await p.vyhodnot(`(() => { document.querySelector('[data-vysky-prepinac] input').click(); return true; })()`);
        await pauza(300);
        kontrola('po vypnutí editor výšky nemá (terén rovina), načtené zůstaly odložené',
            await p.vyhodnot(`${D}.katastrBezVysek === true && ${D}.vyskovyProfil === null && !!${D}._vyskyNactene?.body?.length`));
        await pauza(1800);   // ukládání katastru se odkládá o 1 s
        await p.vyhodnot(`(() => { location.reload(); return true; })()`);
        await pauza(2500);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine && ${D}.katastrParcely.length === 1)`, 30000, 'editor po obnovení');
        await p.cekej(`!${D}.katastrNacitaniProfil && !!${D}._vyskyNactene`, 60000, 'profil po obnovení');
        kontrola('po obnovení stránky jsou výšky pořád vypnuté', await p.vyhodnot(`${D}.katastrBezVysek === true && ${D}.vyskovyProfil === null`));
        await p.vyhodnot(`(() => { ${D}.panelOpen.parcela = true; document.querySelector('[data-vysky-prepinac] input').click(); return true; })()`);
        await pauza(300);
        kontrola('po zapnutí se výšky vrátí', await p.vyhodnot(`${D}.katastrBezVysek === false && !!${D}.vyskovyProfil?.body?.length`));
        await pauza(1800);

        console.log('\n4) Parcela z jiné země k projektu nesousedí');
        await p.vyhodnot(`(() => { ${D}.otevriMapuPozemku(); return true; })()`);
        // Po obnovení stránky lokální server (php artisan serve) vydá Leaflet až po souběžných dotazech katastru, i 7 s
        await p.cekej(`!!document.querySelector('[data-mapa-pozemku].leaflet-container')`, 60000, 'mapa znovu');
        await pauza(500);
        const fr = MISTA[3];
        await najed(fr.lat, fr.lon);
        await klikni(await naObrazovku(fr.lat, fr.lon));
        await p.cekej(`!${D}.mapaNacitani && ${D}.mapaVybrane.length === 1`, 30000, 'francouzská parcela');
        await p.vyhodnot(`(() => { document.querySelector('[data-mapa-potvrdit]').click(); return true; })()`);
        await p.cekej(`!${D}.mapaPridavani`, 30000, 'pokus o přidání');
        kontrola('nepřidá se, mapa zůstane otevřená s hláškou', await p.vyhodnot(`${D}.mapaPozemku && ${D}.katastrParcely.length === 1 && !!${D}.mapaHlaska`),
            await p.vyhodnot(`${D}.mapaHlaska`));
        await p.vyhodnot(`(() => { ${D}.zavriMapuPozemku(); return true; })()`);

        console.log('\n5) Obkreslení pozemku v Rakousku (katastr nemáme) v novém projektu');
        await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.vytvorit, { method:'POST',
            headers:{'Content-Type':'application/json','X-CSRF-TOKEN':_kkInitData.csrf,'Accept':'application/json'},
            body: JSON.stringify({ nazev: 'ClaudeTest obkreslení ' + new Date().toISOString().slice(11,19) }) });
            const j = await r.json(); location.href = j.redirect; })()`);
        await pauza(3000);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor 2');
        await p.vyhodnot(`(() => { ${D}.otevriMapuPozemku(); return true; })()`);
        await p.cekej(`!!(window.__kkMapaPozemku && document.querySelector('[data-mapa-pozemku].leaflet-container'))`, 20000, 'mapa');
        const at = { lat: 47.2692, lon: 11.4041 };
        await najed(at.lat, at.lon);
        const infoAt = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.mapaInfo))`);
        kontrola('Rakousko: mapa ví, že katastr tu nemáme a výšky ano', infoAt.zeme === 'AT' && !infoAt.parcely && infoAt.vysky, JSON.stringify(infoAt));
        await p.vyhodnot(`(() => { document.querySelector('[data-mapa-obkreslit]').click(); return true; })()`);
        const d = 0.00012;
        for (const [a, b] of [[-d, -d * 1.5], [-d, d * 1.5], [d, d * 1.5], [d, -d * 1.5]]) {
            await klikni(await naObrazovku(at.lat + a, at.lon + b));
            await pauza(150);
        }
        kontrola('čtyři body obrysu', await p.vyhodnot(`${D}.mapaBodu === 4`));
        await klikni(await naObrazovku(at.lat - d, at.lon - d * 1.5));   // klik na první bod obrys uzavře
        await pauza(300);
        const rucni = await p.vyhodnot(`JSON.parse(JSON.stringify(${D}.mapaVybrane[0] || null))`);
        kontrola('obkreslený pozemek 26,7 × 27,2 m má kolem 727 m²', rucni?.rucni && rucni.zeme === 'AT' && rucni.vymera > 680 && rucni.vymera < 780, JSON.stringify(rucni && { cislo: rucni.cislo, vymera: rucni.vymera, zeme: rucni.zeme }));
        await p.snimek(path.join(SNIMKY, 'mapa-AT-obkresleni.png'));
        await p.vyhodnot(`(() => { document.querySelector('[data-mapa-potvrdit]').click(); return true; })()`);
        await p.cekej(`!${D}.mapaPozemku && ${D}.katastrParcely.length === 1`, 30000, 'přidání obkresleného');
        await p.cekej(`!${D}.katastrNacitaniProfil`, 60000, 'profil');
        const at2 = await p.vyhodnot(`({ hlaska: ${D}.katastrProfilHlaska, profil: !!${D}.vyskovyProfil?.body?.length, min: ${D}.vyskovyProfil?.vyska_min, max: ${D}.vyskovyProfil?.vyska_max })`);
        kontrola('obkreslený pozemek je v projektu, výšky z BEV ALS-DGM 1 m (Innsbruck kolem 575 m)', at2.profil && at2.min > 560 && at2.max < 600, JSON.stringify(at2));

        const chybyJs = await p.vyhodnot('window.__chyby || []');
        kontrola('bez chyb JavaScriptu', !chybyJs.length, chybyJs.join(' | '));
    } catch (e) {
        chyb++;
        console.log('   CHYBA ' + e.message);
        try { await p.snimek(path.join(SNIMKY, 'chyba.png')); } catch { /* bez snímku */ }
    } finally {
        await p.zavri();
    }
    console.log(`\nSnímky: ${SNIMKY}`);
    console.log(chyb ? `\nChyb: ${chyb}` : '\nVše v pořádku.');
    process.exit(chyb ? 1 : 0);
}

main();
