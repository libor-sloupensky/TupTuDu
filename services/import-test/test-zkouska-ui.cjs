/**
 * Zkušební verze Stavebníku na 14 dní bez karty (App\Support\Tarif::zacniZkousku, modules/platby.md):
 * nabídka na stránce předplatného a v ceníku, zapnutí z okna limitu v editoru (bez opuštění editoru),
 * stav po zapnutí, nabídka zmizí, po konci zkoušky zpět Zdarma.
 *
 * Spuštění: node services/import-test/test-zkouska-ui.cjs [složka snímků]
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const ZAKLAD = process.env.V3_URL || 'http://127.0.0.1:8002';
const EMAIL = 'claudetest.zkouska@example.com';
const HESLO = 'ClaudeTest12345';
const KOREN = path.join(__dirname, '..', '..');
const D = `Alpine.$data(document.querySelector('#kk-canvas-wrap').closest('[x-data]'))`;

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};
const tinker = (kod) => execFileSync('php', ['artisan', 'tinker', '--execute=' + kod], { cwd: KOREN, encoding: 'utf8' }).trim();
const json = (kod) => JSON.parse(tinker(kod).split('\n').pop());

// Uživatel bez zkoušky, s jedním projektem a 10 z 30 dnešních úprav (vyčerpání test nasimuluje v editoru)
const zaloz = () => json(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first() ?? new App\\Models\\Uzivatel;
    $u->forceFill(['jmeno' => 'ClaudeTest', 'prijmeni' => 'Zkouska', 'email' => '${EMAIL}', 'heslo' => '${HESLO}', 'email_overen_v' => now(), 'zeme' => 'CZ', 'jazyk' => 'cs', 'zkouska_od' => null, 'zkouska_do' => null])->save();
    App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->delete();
    $k = App\\Models\\KonceptV3::create(['uzivatel_id' => $u->id, 'nazev' => 'ClaudeTest zkouška', 'data' => []]);
    Illuminate\\Support\\Facades\\DB::table('denni_upravy')->updateOrInsert(['uzivatel_id' => $u->id, 'den' => today()->toDateString()], ['pocet' => 10]);
    // Smyšlený zákazník Cashieru: stránka předplatného pak nezakládá zákazníka v Paddlu (lokálně je ostrý klíč)
    Illuminate\\Support\\Facades\\DB::table('customers')->updateOrInsert(['billable_type' => App\\Models\\Uzivatel::class, 'billable_id' => $u->id], ['paddle_id' => 'ctm_claudetest_zkouska', 'name' => 'ClaudeTest Zkouska', 'email' => '${EMAIL}', 'created_at' => now(), 'updated_at' => now()]);
    echo json_encode(['id' => $u->id, 'kod' => $k->fresh()->kod]);`);
const uklid = () => tinker(`
    $u = App\\Models\\Uzivatel::where('email', '${EMAIL}')->first();
    if ($u) { App\\Models\\KonceptV3::where('uzivatel_id', $u->id)->delete(); Illuminate\\Support\\Facades\\DB::table('denni_upravy')->where('uzivatel_id', $u->id)->delete(); $u->delete(); }
    Illuminate\\Support\\Facades\\DB::table('customers')->where('paddle_id', 'ctm_claudetest_zkouska')->delete();`);
const zkouska = (uid) => json(`$u = App\\Models\\Uzivatel::find(${uid}); echo json_encode(['od' => $u->zkouska_od, 'do' => $u->zkouska_do, 'tarif' => App\\Support\\Tarif::uzivatele($u)]);`);

async function main() {
    const vystup = process.argv[2] || path.join(__dirname, 'vystup');
    fs.mkdirSync(vystup, { recursive: true });
    const { id: uid, kod } = zaloz();
    const p = await otevriProhlizec({ sirka: 1400, vyska: 950 });
    try {
        await p.jdiNa(ZAKLAD + '/login');
        await p.vyhodnot(`document.querySelector('input[name=email]').value = ${JSON.stringify(EMAIL)}; document.querySelector('input[name=password]').value = ${JSON.stringify(HESLO)}; document.querySelector('form').submit(); true`);
        await pauza(3000);

        console.log('\n1) Předplatné: nabídka zkoušky u Stavebníku');
        await p.jdiNa(ZAKLAD + '/billing');
        await pauza(1000);
        const b1 = await p.vyhodnot(`({
            tlacitko: document.querySelector('#zkouska button')?.textContent.trim() || null,
            karta: document.querySelector('#zkouska')?.closest('.tt-tarif')?.querySelector('h3')?.textContent.trim() || null,
            pocet: document.querySelectorAll('#zkouska').length,
        })`);
        kontrola('tlačítko „Vyzkoušet 14 dní zdarma“ jen v kartě Stavebník', b1.tlacitko === 'Vyzkoušet 14 dní zdarma' && b1.karta === 'Stavebník' && b1.pocet === 1, JSON.stringify(b1));
        await p.snimek(path.join(vystup, 'zkouska-1-predplatne.png'));

        console.log('\n2) Ceník webu');
        await p.jdiNa(ZAKLAD + '/cs/pricing');
        await pauza(1000);
        const c = await p.vyhodnot(`({
            odkaz: document.querySelector('.tt-zkouska a')?.getAttribute('href') || null,
            text: document.querySelector('.tt-zkouska a')?.textContent.trim() || null,
            poznamka: [...document.querySelectorAll('.tt-cenik-poznamky li')].some(li => li.textContent.includes('Zkouška zdarma: 14 dní')),
        })`);
        kontrola('ceník: zkouška u Stavebníku vede na /billing#zkouska a je v poznámkách', c.text === 'Vyzkoušet 14 dní zdarma' && /\/billing\?tarif=stavebnik#zkouska$/.test(c.odkaz || '') && c.poznamka, JSON.stringify(c));
        await p.snimek(path.join(vystup, 'zkouska-2-cenik.png'));

        console.log('\n3) Editor: limit vyčerpaný → okno nabídne zkoušku a zapne ji');
        await p.jdiNa(ZAKLAD + '/projects/' + kod);
        await p.cekej(`!!(window.Alpine && document.querySelector('#kk-canvas-wrap') && ${D}.engine)`, 20000, 'editor');
        await pauza(1500);
        // Štítek nad plátnem nabízí zkoušku i před vyčerpáním limitu (laik ji nemá hledat v nastavení)
        const s0 = await p.vyhodnot(`(() => {
            const o = document.getElementById('kk-limit-odznak');
            o?.click();
            const okno = document.getElementById('kk-limit-dialog');
            const r = { odznak: o?.textContent || null, nadpis: okno?.querySelector('h2')?.textContent || null, tlacitko: [...(okno?.querySelectorAll('button') || [])].some(b => b.textContent === 'Vyzkoušet 14 dní zdarma') };
            return r;
        })()`);
        kontrola('štítek „Vyzkoušej 14 dní bez omezení zdarma“, klik otevře nabídku s tlačítkem', s0.odznak === 'Vyzkoušej 14 dní bez omezení zdarma' && s0.nadpis === 'Vyzkoušej Stavebníka 14 dní zdarma' && s0.tlacitko, JSON.stringify(s0));
        await p.snimek(path.join(vystup, 'zkouska-3a-editor-stitek.png'));
        await p.vyhodnot(`document.querySelector('#kk-limit-dialog [data-zavrit]').click(); true`);
        const e1 = await p.vyhodnot(`(() => {
            const k = ${D};
            k._limit().zbyva = 0;   // limit vyčerpaný (server má 30 z 30)
            k._limitOdznak();
            const smi = k._limitPovolKrok();
            const okno = document.getElementById('kk-limit-dialog');
            return { smi, okno: !!okno, tlacitka: [...(okno?.querySelectorAll('button, a') || [])].map(b => b.textContent.trim()), odznak: document.getElementById('kk-limit-odznak')?.textContent || null };
        })()`);
        kontrola('úprava nad limit neprojde a okno nabídne zkoušku', e1.smi === false && e1.okno && e1.tlacitka.includes('Vyzkoušet 14 dní zdarma'), JSON.stringify(e1));
        await p.snimek(path.join(vystup, 'zkouska-3-editor-nabidka.png'));
        await p.vyhodnot(`[...document.querySelectorAll('#kk-limit-dialog button')].find(b => b.textContent.includes('Vyzkoušet')).click(); true`);
        await p.cekej(`document.querySelector('#kk-limit-dialog h2')?.textContent === 'Zkouška zdarma běží'`, 10000, 'zapnutá zkouška');
        const e2 = await p.vyhodnot(`(() => {
            const k = ${D};
            const l = k._limit();
            return { text: document.querySelector('#kk-limit-dialog p')?.textContent, zbyva: l.zbyva, kroku: l.kroku_denne, tarif: l.tarif, mozna: l.zkouska_mozna, odznak: document.getElementById('kk-limit-odznak')?.textContent || null, smi: (document.getElementById('kk-limit-dialog').remove(), k._limitPovolKrok()), url: location.pathname };
        })()`);
        const db1 = zkouska(uid);
        kontrola('zkouška zapnutá v DB, editor zůstal otevřený', db1.tarif === 'zkouska' && db1.od && db1.do && e2.url === '/projects/' + kod, JSON.stringify({ db1, url: e2.url }));
        kontrola('limit úprav zmizel, štítek ukazuje zbývající dny, další úprava projde', e2.zbyva === null && e2.kroku === null && e2.tarif === 'zkouska' && e2.mozna === false && e2.odznak === 'Zkouška zdarma: zbývá 14 dní' && e2.smi === true, JSON.stringify(e2));
        kontrola('okno ukáže, do kdy zkouška platí', /^Zkouška zdarma běží do .+\. Upravuj bez omezení\.$/.test(e2.text || ''), e2.text);

        console.log('\n4) Předplatné během zkoušky');
        await p.jdiNa(ZAKLAD + '/billing');
        await pauza(1000);
        const b2 = await p.vyhodnot(`({
            tarif: document.querySelector('h2 .brand')?.textContent.trim(),
            bezi: [...document.querySelectorAll('section p')].some(x => x.textContent.startsWith('Zkouška zdarma platí do')),
            nabidka: !!document.querySelector('#zkouska'),
            koupit: [...document.querySelectorAll('.tt-tarif button')].map(b => b.textContent.trim()),
        })`);
        kontrola('tarif „Stavebník – zkouška zdarma“, do kdy platí, druhá nabídka není', b2.tarif === 'Stavebník – zkouška zdarma' && b2.bezi && !b2.nabidka, JSON.stringify(b2));
        await p.snimek(path.join(vystup, 'zkouska-4-bezi.png'));

        console.log('\n5) Druhé zapnutí (třeba ze starého okna) neprojde');
        const druhe = await p.vyhodnot(`fetch('/billing/trial', { method: 'POST', headers: { Accept: 'application/json', 'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content || document.querySelector('input[name=_token]')?.value || '' } }).then(r => r.status)`);
        kontrola('druhé zapnutí vrátí 409', druhe === 409, String(druhe));

        console.log('\n6) Po konci zkoušky');
        tinker(`App\\Models\\Uzivatel::whereKey(${uid})->update(['zkouska_do' => now()->subMinute()]);`);
        await p.jdiNa(ZAKLAD + '/billing');
        await pauza(1000);
        const b3 = await p.vyhodnot(`({
            tarif: document.querySelector('h2 .brand')?.textContent.trim(),
            skoncila: [...document.querySelectorAll('section p')].some(x => x.textContent.startsWith('Zkouška zdarma skončila')),
            uprav: [...document.querySelectorAll('section p')].some(x => x.textContent.startsWith('Úpravy dnes:')),
            nabidka: !!document.querySelector('#zkouska'),
        })`);
        kontrola('zpět Zdarma s limitem úprav, „skončila“, nabídka už není', b3.tarif === 'Zdarma' && b3.skoncila && b3.uprav && !b3.nabidka, JSON.stringify(b3));
        await p.snimek(path.join(vystup, 'zkouska-5-skoncila.png'));
    } finally {
        await p.zavri();
        uklid();
    }
    console.log(chyb ? `\n${chyb} chyb` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch((e) => { console.error(e); try { uklid(); } catch (_) {} process.exit(1); });
