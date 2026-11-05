/**
 * Editor v každém jazyce: chyby v konzoli, chybějící klíče, zbylá čeština, přetékající nápisy.
 * Založí vlastního uživatele a kopii projektu (prefix ClaudeTest), po sobě je smaže.
 *
 * Spuštění: V3_URL=http://127.0.0.1:8002 node services/import-test/test-jazyky-editor-ui.cjs [jazyky oddělené čárkou]
 * Snímky: vystup/jazyky/{jazyk}.png
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const JAZYKY = (process.argv[2] || 'en,sk,pl,de,fr,es,it').split(',');
const VZOR = process.env.V3_VZOR || 377;   // projekt, který se zkopíruje
const EMAIL = 'claudetest.jazyky@example.com';
const HESLO = 'ClaudeTest12345';
const KOREN = path.join(__dirname, '..', '..');
const VYSTUP = path.join(__dirname, 'vystup', 'jazyky');
const D = `Alpine.$data(document.querySelector('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const tinker = (kod) => execFileSync('php', ['artisan', 'tinker', '--execute=' + kod], { cwd: KOREN, encoding: 'utf8' }).trim();

const zaloz = () => tinker(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first() ?? new App\\Models\\Uzivatel;
    $u->forceFill(['jmeno' => 'ClaudeTest', 'prijmeni' => 'Jazyky', 'email' => '${EMAIL}', 'heslo' => '${HESLO}', 'email_overen_v' => now(), 'zeme' => 'CZ', 'jazyk' => 'en'])->save();
    App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->delete();
    $k = App\\Models\\KonceptV3::findOrFail(${VZOR})->replicate();
    $k->nazev = 'ClaudeTest jazyky'; $k->uzivatel_id = $u->id; $k->kod = 'ctj' . substr(md5(uniqid()), 0, 2); $k->save();
    echo 'KOD=' . $k->kod;`).match(/KOD=(\w+)/)[1];
const uklid = () => tinker(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first();
    if ($u) { App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->where('nazev', 'like', 'ClaudeTest%')->delete(); $u->delete(); }`);

// Všechny texty stránky: viditelné a z atributů. Bere se i ze skrytých částí kromě skriptů a šablon.
const TEXTY = `(() => {
    const vystup = new Set();
    const prochazej = (n) => {
        for (const c of n.childNodes) {
            if (c.nodeType === 3) { const t = c.textContent.trim(); if (t) vystup.add(t); }
            else if (c.nodeType === 1 && !c.matches('script,style,template,svg')) {
                for (const a of ['title', 'data-tip', 'placeholder', 'aria-label', 'alt']) { const v = c.getAttribute(a); if (v) vystup.add(v); }
                prochazej(c);
            }
        }
    };
    prochazej(document.body);
    return [...vystup];
})()`;

// Nápisy řádků a tlačítek v pravém panelu, které přetekly přes okraj nebo jsou oříznuté
const PRETEKA = `(() => {
    const vady = [];
    for (const n of document.querySelectorAll('.kk-section button, .kk-section label, .kk-section span, .kk-lista button, .kk-section summary')) {
        const r = n.getBoundingClientRect();
        if (!r.width || n.offsetParent === null) continue;
        if (n.scrollWidth > n.clientWidth + 2 && getComputedStyle(n).overflow !== 'visible' && n.textContent.trim()) vady.push(n.textContent.trim().slice(0, 40));
        const k = n.closest('.kk-section')?.getBoundingClientRect();
        if (k && r.right > k.right + 1) vady.push('mimo panel: ' + n.textContent.trim().slice(0, 40));
    }
    return [...new Set(vady)].slice(0, 15);
})()`;

const CESTINA = { sk: /[ěřů]/, default: /[ěřůčšžďťň]/ };
// Data projektu (historie, název kusů, data ČGS a katastru z česky uloženého projektu), jména jazyků a skrytý AI panel, ne texty rozhraní
const VYJIMKY = /^ClaudeTest|Klemov|^(Masterteam|Čeština|Slovenčina|Français|Español|Italiano|Polski|Deutsch|English)$|DB-IP|Sloupensk|Zvýrazňovač|zvýraznění|Přemýšlím|Popiš změnu|kvartér|hlína, písek|^Rajon |^Orná půda|^Ukotvení|^Vložení objektu|^Hrana střechy|^Podlaží \d|^Posun stěny/;

async function main() {
    fs.mkdirSync(VYSTUP, { recursive: true });
    const kod = zaloz();
    const zacatek = tinker(`echo 'CAS=' . now()->format('Y-m-d H:i:s');`).match(/CAS=(.+)/)[1];
    const p = await otevriProhlizec({ sirka: 1500, vyska: 1000 });
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)};
            document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)};
            document.querySelector('form').submit(); true`);
        await pauza(3000);

        for (const jazyk of JAZYKY) {
            console.log(`\n=== ${jazyk}`);
            const pocetVad = p.chybyDetail.length;
            await p.jdiNa(`${ZAKLAD}/jazyk/${jazyk}`);
            await p.jdiNa(`${ZAKLAD}/projects/${kod}`);
            await p.cekej(`!!window.Alpine && !!document.querySelector('[x-data]') && !!${D}.renderer`, 30000, 'editor');
            await pauza(1500);
            kontrola('jazyk stránky', (await p.vyhodnot('document.documentElement.lang')) === jazyk);

            await p.vyhodnot(`document.querySelectorAll('details.kk-section').forEach(d => d.open = true); true`);
            await pauza(500);
            // Výběr první stěny ukáže panel vlastností
            await p.vyhodnot(`(() => { const d = ${D}; const w = [...(d.engine?.walls?.values?.() || [])][0]; if (w && d.selectWall) d.selectWall(w.id); return true; })()`).catch(() => {});
            await pauza(500);

            const preteka = await p.vyhodnot(PRETEKA);
            kontrola('nápisy v panelech se vejdou', preteka.length === 0, preteka.join(' | '));
            const vzor = CESTINA[jazyk] || CESTINA.default;
            const cesky = (await p.vyhodnot(TEXTY)).filter(t => vzor.test(t) && !VYJIMKY.test(t));
            kontrola('žádná čeština v rozhraní', cesky.length === 0, `${cesky.length}: ` + cesky.slice(0, 25).join(' | '));
            const nazvy = await p.vyhodnot(`${D}.seznamPodlazi?.map(x => x.nazev).join(', ') || ''`);
            console.log('   podlaží:', nazvy);
            // Nejde o texty: modely a podklad kopie projektu nemusí v této složce být, /masterteam je přesměrování po přihlášení
            const vady = [...new Set(p.chybyDetail.slice(pocetVad).map(c => (c.url || c.text).replace(ZAKLAD, '')))]
                .filter(u => !/^\/(katalog|editor\/plans|masterteam$)/.test(u));
            kontrola('bez chyb v konzoli', vady.length === 0, vady.slice(0, 10).join(' | ').slice(0, 500));
            await p.snimek(path.join(VYSTUP, `${jazyk}.png`));
        }

        const chybejici = tinker(`echo DB::table('bugy')->where('zprava', 'like', '%Chybí překlad%')->where('naposledy_v', '>=', '${zacatek}')->pluck('zprava')->implode(' | ');`);
        const radek = chybejici.split('\n').pop();
        kontrola('žádný chybějící klíč', !radek.includes('Chybí překlad'), radek.slice(0, 500));
    } finally {
        await p.zavri();
        uklid();
    }
    console.log(chyb ? `\nChyb: ${chyb}` : '\nVše v pořádku.');
    process.exitCode = chyb ? 1 : 0;
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
