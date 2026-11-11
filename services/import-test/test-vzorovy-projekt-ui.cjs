/**
 * Vzorový projekt (App\Support\VzorovyProjekt, modules/aplikace.md): zákazník dostane kopii šablony, upravuje ji
 * zdarma mimo limit tarifu, nejde smazat, nad plátnem je hláška a ve 3:00 jeho času se vrátí do výchozího stavu.
 * Potřebuje šablonu (vzor = sablona) v lokální databázi.
 *
 * Spuštění: node services/import-test/test-vzorovy-projekt-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = 'claudetest.vzor@example.com';
const HESLO = 'ClaudeTest12345';
const KOREN = path.join(__dirname, '..', '..');
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const tinker = (kod) => execFileSync('php', ['artisan', 'tinker', '--execute=' + kod], { cwd: KOREN, encoding: 'utf8' }).trim();
const json = (kod) => JSON.parse(tinker(kod).split('\n').pop());

const zaloz = () => tinker(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first() ?? new App\\Models\\Uzivatel;
    $u->forceFill(['jmeno' => 'ClaudeTest', 'prijmeni' => 'Vzor', 'email' => '${EMAIL}', 'heslo' => '${HESLO}', 'email_overen_v' => now(), 'zeme' => 'CZ', 'jazyk' => 'cs'])->save();
    App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->delete();
    Illuminate\\Support\\Facades\\DB::table('denni_upravy')->where('uzivatel_id', $u->id)->delete();
    echo $u->id;`).split('\n').pop();
const uklid = () => tinker(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first();
    if ($u) { App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->delete(); $u->delete(); }`);

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const sablona = json(`echo json_encode(optional(App\\Support\\VzorovyProjekt::sablona())->only(['id', 'nazev', 'verze']));`);
    if (!sablona || !sablona.id) { console.log('Šablona vzorového projektu chybí, test nemá co ověřit.'); process.exit(1); }
    const uid = zaloz();
    const p = await otevriProhlizec({ sirka: 1500, vyska: 950 });
    try {
        console.log('\n1) Kopie po přihlášení');
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)}; document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)}; document.querySelector('form').submit(); true`);
        await pauza(3000);
        await p.jdiNa(ZAKLAD + '/projects');
        await pauza(1500);
        const uvod = await p.vyhodnot(`({ url: location.pathname, odkaz: document.querySelector('.tt-prvni-vzor a')?.getAttribute('href') || null })`);
        const kopie = json(`echo json_encode(App\\Models\\KonceptV3::where('uzivatel_id', ${uid})->get(['id', 'kod', 'nazev', 'vzor'])->toArray());`);
        kontrola('bez vlastního projektu úvodní obrazovka s odkazem na vzorový projekt, kopie vznikla jedna', uvod.url === '/projects' && kopie.length === 1 && kopie[0].vzor === 'kopie' && uvod.odkaz && uvod.odkaz.endsWith('/projects/' + kopie[0].kod), JSON.stringify({ uvod, kopie }));
        const pocet = json(`echo json_encode(App\\Support\\Tarif::stav(App\\Models\\Uzivatel::find(${uid})));`);
        kontrola('kopie se nepočítá do limitu projektů', pocet.pocet_projektu === 0, JSON.stringify(pocet));

        console.log('\n2) Editor vzorového projektu');
        await p.jdiNa(ZAKLAD + '/projects/' + kopie[0].kod);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await pauza(2500);
        const editor = await p.vyhodnot(`(() => { const d = ${D}; const h = document.querySelector('[data-vzor-hlaska]');
            return { hlaska: h ? h.textContent.replace(/\\s+/g, ' ').trim() : null, limit: _kkInitData.limit, steny: d.engine.walls.size, smazat: [...document.querySelectorAll('button')].some(b => b.getAttribute('@click') === 'smazatKoncept()' && b.offsetParent),
                podklad: !!d.renderer.podkladLayer?.findOne('Image') }; })()`);
        kontrola('výrazná hláška o hraní zdarma a noční obnově', editor.hlaska && /zdarma|nic nestojí/i.test(editor.hlaska) && /3:00/.test(editor.hlaska), editor.hlaska);
        kontrola('editor bez limitu úprav, smazání skryté, kresba i podklad šablony', editor.limit && editor.limit.zbyva === null && !editor.smazat && editor.steny > 5 && editor.podklad, JSON.stringify({ limit: editor.limit, smazat: editor.smazat, steny: editor.steny, podklad: editor.podklad }));
        await p.snimek(path.join(vystup, 'vzorovy-projekt.png'));
        // Křížek hlášku schová do dalšího dne (jen v tomhle prohlížeči)
        const videt = () => p.vyhodnot(`(() => { const h = document.querySelector('[data-vzor-hlaska]'); return !!h && getComputedStyle(h).display !== 'none'; })()`);
        await p.vyhodnot(`(document.querySelector('[data-vzor-zavrit]').click(), 1)`);
        await pauza(200);
        const poKrizku = await videt();
        await p.jdiNa(ZAKLAD + '/projects/' + kopie[0].kod);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await pauza(800);
        const poNacteni = await videt();
        await p.vyhodnot(`(localStorage.setItem('tt_vzor_hlaska_kopie', '2000-01-01'), 1)`);
        await p.jdiNa(ZAKLAD + '/projects/' + kopie[0].kod);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await pauza(2500);
        const dalsiDen = await videt();
        kontrola('křížek hlášku skryje, po načtení zůstane skrytá, další den je zpět', !poKrizku && !poNacteni && dalsiDen, JSON.stringify({ poKrizku, poNacteni, dalsiDen }));
        const profil =await p.vyhodnot(`(async () => { const d = ${D}; await new Promise(r => setTimeout(r, 500));
            const dotazy = performance.getEntriesByType('resource').filter(e => e.name.includes('/land/elevation')).length;
            d._katastrAutosave(); await new Promise(r => setTimeout(r, 2500));
            return { body: d.vyskovyProfil?.body?.length || 0, dotazy }; })()`);
        const profilVDb = json(`echo json_encode(count(App\\Models\\KonceptV3::find(${kopie[0].id})->metadata['katastr']['profil']['body'] ?? []));`);
        kontrola('terén z profilu uloženého v projektu, bez dotazu na server, uložení katastru ho nesmaže', profil.body > 100 && profil.dotazy === 0 && profilVDb === profil.body, JSON.stringify({ profil, profilVDb }));

        // Úpravy: 40 kroků, víc než denní limit Zdarma (30), všechny se uloží a nic se nezapočte
        const upravy = await p.vyhodnot(`(async () => { const d = ${D}; const e = d.engine; const X = e.PX_PER_M;
            for (let i = 0; i < 40; i++) { e.addWall(i * X * 0.3, 20 * X, i * X * 0.3, 21 * X, 0.1, 'pricka'); d.autoSave('test ' + i); }
            await d.ulozit(); await new Promise(r => setTimeout(r, 1500)); return { steny: e.walls.size, dialog: !!document.querySelector('[data-limit-dialog]:not([hidden])') }; })()`);
        const poUpravach = json(`echo json_encode(['steny' => count(App\\Models\\KonceptV3::find(${kopie[0].id})->data['steny'] ?? []), 'upravy' => (int) Illuminate\\Support\\Facades\\DB::table('denni_upravy')->where('uzivatel_id', ${uid})->sum('pocet')]);`);
        kontrola('40 úprav se uloží a do denního limitu se nic nezapočte', poUpravach.steny >= editor.steny + 40 && poUpravach.upravy === 0, JSON.stringify({ upravy, poUpravach }));
        const smazani = await p.vyhodnot(`(async () => { const r = await fetch(_kkInitData.routes.smazat.replace(':id', ${kopie[0].id}), { method: 'DELETE', headers: { 'X-CSRF-TOKEN': _kkInitData.csrf, Accept: 'application/json' } }); return r.status; })()`);
        const poSmazani = json(`echo json_encode(App\\Models\\KonceptV3::whereKey(${kopie[0].id})->exists());`);
        kontrola('server kopii smazat nedovolí', poSmazani === true, 'HTTP ' + smazani);

        console.log('\n3) Noční obnova');
        tinker(`App\\Models\\KonceptV3::whereKey(${kopie[0].id})->update(['vzor_obnoveno_v' => now()->subDays(2)]);`);
        const nanecisto = tinker('Artisan::call("vzor:obnovit", ["--dry-run" => true]); echo Artisan::output();');
        tinker('Artisan::call("vzor:obnovit"); echo Artisan::output();');
        const poObnove = json(`$k = App\\Models\\KonceptV3::find(${kopie[0].id}); $s = App\\Support\\VzorovyProjekt::sablona(); echo json_encode(['stejne' => json_encode($k->data) === json_encode($s->data), 'historie' => count($k->historie ?? []), 'obnoveno' => (string) $k->vzor_obnoveno_v]);`);
        kontrola('obnova vrátí kopii do stavu šablony a smaže historii', /k obnově [1-9]/.test(nanecisto) && poObnove.stejne && poObnove.historie === 0, JSON.stringify({ nanecisto, poObnove }));
        const znovu = tinker('Artisan::call("vzor:obnovit"); echo Artisan::output();');
        kontrola('podruhé týž den už se neobnovuje', /obnoveno 0/.test(znovu), znovu);
        // Nepoužitá kopie: v noci se nenačte ani nepřepíše, ani když je po termínu
        tinker(`App\\Models\\KonceptV3::whereKey(${kopie[0].id})->update(['vzor_obnoveno_v' => now()->subDays(2), 'upraveno' => now()->subDays(2)]);`);
        const nepouzita = tinker('Artisan::call("vzor:obnovit", ["--dry-run" => true]); echo Artisan::output();');
        kontrola('nepoužitou kopii noční běh nebere', /k obnově 0/.test(nepouzita), nepouzita);
        // Změněná šablona: nepoužitá kopie ji dostane až při otevření
        tinker(`App\\Models\\KonceptV3::whereKey(${sablona.id})->update(['upraveno' => now()]);`);
        const predOtevrenim = json(`echo json_encode(App\\Models\\KonceptV3::find(${kopie[0].id})->verze);`);
        await p.jdiNa(ZAKLAD + '/projects/' + kopie[0].kod);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const poOtevreni = json(`$k = App\\Models\\KonceptV3::find(${kopie[0].id}); echo json_encode(['verze' => $k->verze, 'dnes' => $k->vzor_obnoveno_v->isToday(), 'shodne' => (string) $k->upraveno === (string) $k->vzor_obnoveno_v]);`);
        kontrola('při otevření se nepoužitá kopie srovná s novou šablonou a nevypadá jako upravená', poOtevreni.verze === predOtevrenim + 1 && poOtevreni.dnes && poOtevreni.shodne, JSON.stringify({ predOtevrenim, poOtevreni }));
        await p.jdiNa(ZAKLAD + '/projects/' + kopie[0].kod);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        const podruhe = json(`echo json_encode(App\\Models\\KonceptV3::find(${kopie[0].id})->verze);`);
        kontrola('další otevření týž den už nic nezapisuje', podruhe === poOtevreni.verze, String(podruhe));
        const pasmo = json(`echo json_encode([App\\Support\\VzorovyProjekt::casovaZona((new App\\Models\\Uzivatel)->forceFill(['zeme' => 'CZ'])), App\\Support\\VzorovyProjekt::casovaZona((new App\\Models\\Uzivatel)->forceFill(['zeme' => 'PT'])), App\\Support\\VzorovyProjekt::casovaZona((new App\\Models\\Uzivatel)->forceFill(['zeme' => 'ES']))]);`);
        kontrola('3:00 podle země uživatele (pevninské pásmo)', pasmo[0] === 'Europe/Prague' && pasmo[1] === 'Europe/Lisbon' && pasmo[2] === 'Europe/Madrid', JSON.stringify(pasmo));

        console.log('\n4) Master tým v aplikaci jako běžný uživatel');
        await p.cmd('Network.clearBrowserCookies');
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = 'libor.sloupensky@seznam.cz'; document.querySelector('input[name=password]').value = '12345'; document.querySelector('form').submit(); true`);
        await pauza(3000);
        const masterKopie = json(`$u = App\\Models\\Uzivatel::where('email', 'libor.sloupensky@seznam.cz')->first(); echo json_encode(optional(App\\Support\\VzorovyProjekt::zajistiKopii($u))->kod);`);
        await p.jdiNa(ZAKLAD + '/projects/' + masterKopie);
        await p.cekej(`!!(window.Alpine && ${D} && ${D}.engine)`, 20000, 'editor');
        await pauza(1500);
        const master = await p.vyhodnot(`(() => { const d = ${D}; return { vzory: d.koncepty.filter(k => k.vzor).map(k => k.vzor), hlaska: document.querySelector('[data-vzor-hlaska]')?.textContent.replace(/\\s+/g, ' ').trim() || null }; })()`);
        kontrola('master má v aplikaci svou kopii s hláškou pro uživatele, šablonu nevidí', masterKopie && !master.vzory.includes('sablona') && master.vzory.includes('kopie') && /na hraní/.test(master.hlaska || ''), JSON.stringify(master));
    } finally {
        await p.zavri?.();
        uklid();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}
main().catch(e => { console.error(e); uklid(); process.exit(1); });
