/**
 * Články na webu v prohlížeči: jazyk v adrese, kalkulačka, výzva podle ovládání, přetékání na telefonu,
 * zápis článku jako zdroje registrace. Snímky do složky vystup/clanky.
 *
 * Spuštění: node services/import-test/test-clanky-ui.cjs
 *           V3_WEB=http://tuptudu.localhost:8002 V3_APP=http://app.tuptudu.localhost:8002
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { otevriProhlizec, pauza } = require('./prohlizec.cjs');

const WEB = process.env.V3_WEB || 'http://tuptudu.localhost:8002';
const APP = process.env.V3_APP || 'http://app.tuptudu.localhost:8002';
const CLANEK = '/cs/clanky/kolik-zeminy-z-vykopu';
const VYSTUP = path.join(__dirname, 'vystup', 'clanky');

let chyb = 0;
const kontrola = (popis, ok, detail = '') => {
    if (!ok) chyb++;
    console.log(`   ${ok ? 'OK  ' : 'CHYBA'} ${popis}${detail ? ' — ' + detail : ''}`);
};

/** Celá stránka do jednoho PNG: okno se roztáhne podle výšky obsahu. */
async function snimekCele(p, soubor) {
    const vyska = await p.vyhodnot('document.documentElement.scrollHeight');
    const sirka = await p.vyhodnot('window.innerWidth');
    await p.cmd('Emulation.setDeviceMetricsOverride', { width: sirka, height: Math.min(vyska, 6000), deviceScaleFactor: 1, mobile: false });
    await pauza(300);
    await p.snimek(soubor);
    await p.cmd('Emulation.clearDeviceMetricsOverride', {});
}

const hodnoty = (p) => p.vyhodnot(`Object.fromEntries([...document.querySelectorAll('[data-v]')].map(e => [e.dataset.v, e.textContent]))`);
const nastav = (p, klic, hodnota) => p.vyhodnot(`(() => { const i = document.querySelector('[data-pole="${klic}"]'); i.value = ${JSON.stringify(hodnota)};
    i.dispatchEvent(new Event(i.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })); return true; })()`);
const videt = (p, selektor) => p.vyhodnot(`(() => { const e = document.querySelector(${JSON.stringify(selektor)}); return !!e && e.getClientRects().length > 0; })()`);

async function main() {
    fs.mkdirSync(VYSTUP, { recursive: true });
    const p = await otevriProhlizec({ sirka: 1400, vyska: 950 });
    try {
        console.log('1) Článek na počítači');
        await p.jdiNa(WEB + CLANEK);
        await p.cekej(`document.querySelector('[data-v="ornice-navic"]')?.textContent !== '–'`, 20000, 'kalkulačka');
        const hlava = await p.vyhodnot(`({ jazyk: document.documentElement.lang, kan: document.querySelector('link[rel=canonical]')?.href, popis: document.querySelector('meta[name=description]')?.content,
            ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).map(x => x['@type']), h1: document.querySelectorAll('h1').length })`);
        kontrola('česky, kanonická adresa, popis, jeden nadpis', hlava.jazyk === 'cs' && hlava.kan.endsWith(CLANEK) && hlava.popis.length > 80 && hlava.h1 === 1, JSON.stringify(hlava.h1));
        kontrola('strukturovaná data článku a drobečků', hlava.ld.join() === 'Article,BreadcrumbList', hlava.ld.join());
        // Autor z hlavičky článku: pod titulkem i pro vyhledávače
        const autor = await p.vyhodnot(`({ meta: document.querySelector('.tt-clanek-meta')?.textContent || '',
            ld: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent)[0].author })`);
        kontrola('autor Libor z TupTuDu na stránce i ve strukturovaných datech', autor.meta.includes('Libor z TupTuDu')
            && autor.ld?.['@type'] === 'Person' && autor.ld?.name === 'Libor z TupTuDu', JSON.stringify(autor));

        console.log('\n2) Kalkulačka');
        let v = await hodnoty(p);
        kontrola('výchozí dům: ornice 30, výkopek 8, bez štěrku, vykopáno 60, zpět 21, zbude 38, hromada 74',
            v['ornice-navic'] === '30' && v['vykopek-navic'] === '8' && !(await videt(p, '[data-ukaz="sterk"]')) && v['celkem-vykopano'] === '60' && v['celkem-zpet'] === '21' && v['celkem-zbude'] === '38' && v.hromada === '74', JSON.stringify(v));
        await nastav(p, 'podDum', 'sterk');
        v = await hodnoty(p);
        kontrola('dosypání štěrkem: štěrk 12, výkopek 20, zbude 50', v.sterk === '12' && v['vykopek-navic'] === '20' && v['celkem-zbude'] === '50' && await videt(p, '[data-ukaz="sterk"]'), JSON.stringify([v.sterk, v['vykopek-navic'], v['celkem-zbude']]));
        await nastav(p, 'typ', 'deska');
        v = await hodnoty(p);
        const skladbaDesky = await p.vyhodnot(`document.querySelector('[data-pole="skladba"]').value`);
        kontrola('nosná deska: skladba 70 cm, výkopek navíc 18', skladbaDesky === '70' && v['vykopek-navic'] === '18', JSON.stringify([skladbaDesky, v['vykopek-navic']]));
        await nastav(p, 'typ', 'pasy');
        kontrola('zpět na pasy: skladba 45 cm', await p.vyhodnot(`document.querySelector('[data-pole="skladba"]').value`) === '45');
        await nastav(p, 'typ', 'deska');
        kontrola('u desky se pole pasů schovají', !(await p.vyhodnot(`(() => { document.querySelector('.tt-kalkulacka details').open = true; return document.querySelector('[data-pole="sirkaPasu"]').getClientRects().length > 0; })()`)));
        await nastav(p, 'podDum', 'vykopek');
        await nastav(p, 'skladba', '45');
        v = await hodnoty(p);
        kontrola('tenká deska dosypaná výkopkem: řádek Výkopek chybí', v['vykopek-chybi'] === '12' && await videt(p, '[data-ukaz="vykopek-chybi"]') && !(await videt(p, '[data-ukaz="vykopek-navic"]')), v['vykopek-chybi']);
        await nastav(p, 'podDum', 'sterk');
        await nastav(p, 'typ', 'pasy');
        await nastav(p, 'sklep', 'ano');
        v = await hodnoty(p);
        kontrola('sklep: výkopek 368, hromada 814', v['vykopek-navic'] === '368' && v.hromada === '814', JSON.stringify(v));
        kontrola('se sklepem je vidět jeho výška', await videt(p, '[data-pole="vyskaSklepu"]'));
        await nastav(p, 'sklep', 'ne');
        await nastav(p, 'nadTerenem', '60');
        v = await hodnoty(p);
        kontrola('vysoká podlaha: základ se prodlouží a víc se dosype', v.sterk === '48' && v['vykopek-navic'] === '20', JSON.stringify([v.sterk, v['vykopek-navic']]));
        await nastav(p, 'nadTerenem', '');
        v = await hodnoty(p);
        kontrola('prázdné pole bere výchozí hodnotu', v['ornice-navic'] === '30' && v.sterk === '12', v['ornice-navic']);
        await nastav(p, 'nadTerenem', '30');
        await nastav(p, 'delka', '1000');
        v = await hodnoty(p);
        kontrola('délka mimo rozsah se omezí', v['ornice-navic'] === String(60 * 10 * 0.25), v['ornice-navic']);
        await nastav(p, 'delka', '12');
        await p.vyhodnot(`document.querySelector('.tt-kalkulacka details').open = false`);

        console.log('\n3) Výzva a výstup');
        kontrola('na počítači tlačítko registrace, ne poslání odkazu', await videt(p, '[data-vyzva-klik]') && !(await videt(p, '[data-poslat-odkaz]')));
        const odkaz = await p.vyhodnot(`document.querySelector('[data-vyzva-klik]').href`);
        kontrola('registrace nese článek jako zdroj', odkaz === APP + '/register?zdroj=kolik-zeminy-z-vykopu', odkaz);
        kontrola('obrázek se načte', await p.vyhodnot(`new Promise(r => { const i = document.querySelector('.tt-obrazek img'); i.loading = 'eager'; if (i.complete && i.naturalWidth) r(true); i.onload = () => r(true); i.onerror = () => r(false); setTimeout(() => r(false), 8000); })`));
        kontrola('stránka nenačítá kód editoru', await p.vyhodnot(`![...document.scripts].some(s => s.src.includes('/koncept-v3/')) && !window.Zemina`));
        const vnejsi = await p.vyhodnot(`[...document.querySelectorAll('.tt-clanek a[href]')].filter(a => !a.hostname.endsWith('tuptudu.localhost')).map(a => a.href)`);
        kontrola('v článku nejsou vnější odkazy', vnejsi.length === 0, vnejsi.join(' '));
        kontrola('u výsledku kalkulačky je cesta do aplikace', await videt(p, '.tt-kalkulacka-aplikace a[data-vyzva-klik]'));
        const doAplikace = await p.vyhodnot(`document.querySelectorAll('.tt-clanek a[href*="/register?zdroj="]').length`);
        kontrola('do aplikace vedou aspoň tři cesty', doAplikace >= 3, String(doAplikace));
        kontrola('odkaz na napsaný článek funguje', await p.vyhodnot(`!!document.querySelector('.tt-clanek p a[href$="/cs/clanky/koeficient-nakypreni-zeminy"]')`));
        kontrola('článek, který ještě není, zůstane jen textem', await p.vyhodnot(`!document.querySelector('.tt-clanek a[href*="zaklady-na-svahu"]') && document.querySelector('.tt-clanek').textContent.replace(/\\u00a0/g, ' ').includes('základy dělají po stupních')`));
        kontrola('související články ukazují jen napsané', await p.vyhodnot(`document.querySelectorAll('.tt-clanky-polozka').length === 1`));
        await snimekCele(p, path.join(VYSTUP, 'clanek-pocitac-tmavy.png'));
        await p.vyhodnot(`document.documentElement.dataset.theme = 'light'`);
        await pauza(200);
        await snimekCele(p, path.join(VYSTUP, 'clanek-pocitac-svetly.png'));
        await p.vyhodnot(`document.documentElement.dataset.theme = 'dark'`);

        console.log('\n4) Přehled, navazující článek a titulka');
        await p.jdiNa(WEB + '/cs/clanky');
        kontrola('přehled obsahuje článek', await p.vyhodnot(`!!document.querySelector('a[href$="${CLANEK}"]')`));
        await p.jdiNa(WEB + '/cs/clanky/koeficient-nakypreni-zeminy');
        kontrola('navazující článek vede zpět na hlavní', await p.vyhodnot(`!!document.querySelector('.tt-clanek p a[href$="${CLANEK}"]')`));
        await p.jdiNa(WEB + '/cs');
        kontrola('z titulky vede odkaz na články a ceník s jazykem', await p.vyhodnot(`!!document.querySelector('.topbar-akce a[href$="/cs/clanky"]') && !!document.querySelector('.topbar-akce a[href$="/cs/pricing"]')`));
        const prepnuti = await p.vyhodnot(`document.querySelector('.tt-jazyky a[hreflang=en]').href`);
        kontrola('přepínač vede přímo na anglickou verzi', prepnuti === WEB + '/en', prepnuti);
        await p.jdiNa(WEB + '/en');
        kontrola('/en je anglicky a odkaz na články chybí, anglické zatím nejsou', await p.vyhodnot(`document.documentElement.lang === 'en' && !document.querySelector('.topbar-akce a[href*="articles"]')`));
        await p.jdiNa(WEB + '/terms');
        kontrola('stránka bez jazyka v adrese si vybraný jazyk pamatuje', await p.vyhodnot(`document.documentElement.lang === 'en'`));

        console.log('\n5) Zdroj registrace');
        await p.jdiNa(APP + '/register?zdroj=kolik-zeminy-z-vykopu');
        const email = 'claudetest-zdroj-' + Date.now() + '@example.com';
        await p.vyhodnot(`(() => { const f = document.querySelector('form[action*="register"]');
            f.querySelector('[name=jmeno]').value = 'ClaudeTest'; f.querySelector('[name=email]').value = ${JSON.stringify(email)};
            f.querySelector('[name=password]').value = 'ClaudeTest-12345'; f.querySelector('[name=password_confirmation]').value = 'ClaudeTest-12345';
            f.querySelector('[name=souhlas]').checked = true; f.submit(); return true; })()`);
        await pauza(4000);
        // Přímo v databázi, testovací účet po sobě smaže (jen tento e-mail)
        const dotaz = `$u = DB::table('uzivatele')->where('email', '${email}'); echo 'ZDROJ=' . $u->value('zdroj_registrace'); $u->delete();`;
        const vypis = execFileSync('php', ['artisan', 'tinker', '--execute', dotaz], { cwd: path.join(__dirname, '../..'), encoding: 'utf8' });
        kontrola('článek se uložil k účtu', vypis.includes('ZDROJ=kolik-zeminy-z-vykopu'), vypis.trim().slice(0, 80));
    } finally {
        await p.zavri();
    }

    console.log('\n6) Telefon (dotyk, 390 px)');
    const t = await otevriProhlizec({ sirka: 500, vyska: 900 });
    try {
        await t.cmd('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
        await t.cmd('Emulation.setTouchEmulationEnabled', { enabled: true });
        await t.cmd('Emulation.setEmulatedMedia', { features: [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }] });
        await t.jdiNa(WEB + CLANEK);
        await t.cekej(`document.querySelector('[data-v="ornice-navic"]')?.textContent !== '–'`, 20000, 'kalkulačka');
        const preteka = await t.vyhodnot(`document.documentElement.scrollWidth - window.innerWidth`);
        kontrola('stránka nepřetéká do šířky', preteka <= 0, String(preteka));
        const siroke = await t.vyhodnot(`[...document.querySelectorAll('.tt-clanek-stranka *')].filter(e => !e.closest('.tt-tabulka') && !e.closest('svg') && e.getBoundingClientRect().right > window.innerWidth + 1).map(e => e.tagName + '.' + e.className).slice(0, 5)`);
        kontrola('žádný prvek mimo tabulky nesahá za okraj', siroke.length === 0, JSON.stringify(siroke));
        kontrola('na dotyku poslání odkazu místo registrace', await videt(t, '[data-poslat-odkaz]') && !(await videt(t, '[data-vyzva-klik]')));
        kontrola('kalkulačka funguje', (await hodnoty(t))['ornice-navic'] === '30');
        kontrola('u kalkulačky na dotyku poslání odkazu', await videt(t, '.tt-kalkulacka-aplikace [data-poslat-odkaz]') && !(await videt(t, '.tt-kalkulacka-aplikace a[data-vyzva-klik]')));
        kontrola('odkaz do aplikace v textu na dotyku neodvede na registraci', await t.vyhodnot(`(() => { navigator.share = async () => {}; const u = new MouseEvent('click', { bubbles: true, cancelable: true }); document.querySelector('[data-dotyk-poslat]').dispatchEvent(u); return u.defaultPrevented; })()`));
        await t.vyhodnot(`window.scrollTo(0, 0)`);
        await t.snimek(path.join(VYSTUP, 'clanek-telefon-horni.png'));
        await t.vyhodnot(`document.querySelector('.tt-rez').scrollIntoView()`);
        await pauza(300);
        await t.snimek(path.join(VYSTUP, 'clanek-telefon-rez.png'));
        await t.vyhodnot(`document.querySelector('[data-vyzva]').scrollIntoView({ block: 'center' })`);
        await pauza(300);
        await t.snimek(path.join(VYSTUP, 'clanek-telefon-vyzva.png'));
    } finally {
        await t.zavri();
    }

    // Zkušební německá verze (klíč na český článek), po testu se smaže i se složkou, kterou založil
    console.log('\n7) Jazykové verze článku');
    const slozkaDe = path.join(__dirname, '../../resources/clanky/de');
    const zalozenaSlozka = !fs.existsSync(slozkaDe);
    const soubor = path.join(slozkaDe, 'claudetest-verze.md');
    fs.mkdirSync(slozkaDe, { recursive: true });
    fs.writeFileSync(soubor, ['---', 'titulek: ClaudeTest verze', 'popis: Zkušební verze.', 'perex: Zkušební verze.',
        'publikovano: 2026-11-09', 'overeno: 2026-11-09', 'stav: koncept', 'klic: kolik-zeminy-z-vykopu', 'zeme: DE, AT',
        '---', '::kalkulacka-zeminy spara=80 | ornice=30', ''].join('\n'));
    // Node adresu *.localhost nepřeloží, stránky proto stahuje prohlížeč (stejný původ)
    const v7 = await otevriProhlizec({ sirka: 1200, vyska: 800 });
    try {
        await v7.jdiNa(WEB + CLANEK);
        const stranka = (cesta) => v7.vyhodnot(`fetch(${JSON.stringify(WEB + cesta)}).then((r) => r.text())`);
        const hreflang = (html) => [...html.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)"/g)].map((m) => m[1] + '=' + m[2].replace(WEB, ''));
        const cs = await stranka(CLANEK);
        const de = await stranka('/de/artikel/claudetest-verze');
        const ocekavane = ['cs=' + CLANEK, 'de=/de/artikel/claudetest-verze'].join();
        kontrola('hreflang na české i německé verzi, bez x-default (anglická verze není)', hreflang(cs).join() === ocekavane && hreflang(de).join() === ocekavane,
            hreflang(cs).join() + ' | ' + hreflang(de).join());
        kontrola('přepínač jazyka vede na druhou verzi', cs.includes(`href="${WEB}/de/artikel/claudetest-verze" lang="de"`) && de.includes(`href="${WEB}${CLANEK}" lang="cs"`));
        kontrola('kalkulačka bere výchozí hodnoty a země z verze', /id="kalk-spara"[^>]*value="80"/.test(de) && /id="kalk-ornice"[^>]*value="30"/.test(de)
            && de.includes('Deutschland / Österreich') && /id="kalk-spara"[^>]*value="100"/.test(cs));
        const mapa = await stranka('/sitemap.xml');
        kontrola('sitemapa má německou verzi s hreflang na českou', mapa.includes('<loc>' + WEB + '/de/artikel/claudetest-verze</loc>')
            && mapa.includes('hreflang="cs" href="' + WEB + CLANEK + '"') && mapa.includes('<loc>' + WEB + '/de/artikel</loc>'));
    } finally {
        await v7.zavri();
        fs.rmSync(soubor);
        if (zalozenaSlozka) fs.rmdirSync(slozkaDe);
    }

    console.log(chyb ? `\nCHYBY: ${chyb}` : '\nVše v pořádku');
    process.exit(chyb ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
