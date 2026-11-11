/**
 * Přegeneruje obrázky do článků z aktuálního editoru (Libor 11. 11. 2026: „jak budeme vyvíjet editor, budu chtít
 * přegenerovávat obrázky, aby držely styl s realitou“). Recepty, z čeho který obrázek vzniká, jsou v modules/blog.md,
 * část Obrázky článků: recepty; scény samotné jsou v snimky-clanky-dum.cjs a snimky-zemina.cjs.
 *
 * Spuštění: node services/clanky/snimky-vse.cjs [článek …]   (bez argumentu všechny články s obrázky z editoru)
 *           node services/clanky/snimky-vse.cjs --jazyk en,sk,pl,de,fr,es,it [článek …]
 *           (jazykové verze snímků s textem, tj. půdorysů s názvy místností, do public/img/clanky/{článek}/{jazyk}/;
 *           3D snímky bez textu jsou společné pro všechny jazyky)
 * Potom obrázky prohlédnout (kontrolní půdorysy jsou v services/import-test/vystup) a commitnout.
 * Běží proti lokálnímu serveru 127.0.0.1:8002, testovací koncepty ClaudeTest maže hned po sobě.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const DUM = ['typy-strech', 'barva-fasady', 'minimalni-rozmery-mistnosti', 'jak-nakreslit-pudorys-domu', 'vypocet-schodiste'];
const ZEMINA = ['kolik-zeminy-z-vykopu'];
// Články se snímky, na kterých je text editoru (názvy místností), mají jazykové verze
const S_TEXTEM = ['minimalni-rozmery-mistnosti', 'jak-nakreslit-pudorys-domu'];
// Bez obrázků z editoru: koeficient-nakypreni-zeminy (nákres ::nakypreni je SVG v šabloně, mění se s ní)

const argy = process.argv.slice(2);
const iJazyk = argy.indexOf('--jazyk');
const jazyky = iJazyk >= 0 ? (argy[iJazyk + 1] || '').split(',').map((j) => j.trim()).filter((j) => j && j !== 'cs') : [];
const chci = argy.filter((a, i) => iJazyk < 0 || (i !== iJazyk && i !== iJazyk + 1));
const nezname = chci.filter((c) => !DUM.includes(c) && !ZEMINA.includes(c));
if (nezname.length || (iJazyk >= 0 && !jazyky.length)) {
    console.error((nezname.length ? 'Neznámý článek: ' + nezname.join(', ') : 'Chybí seznam jazyků za --jazyk') + '\nZnámé: ' + [...DUM, ...ZEMINA].join(', '));
    process.exit(1);
}

const spust = (skript, argyS, env = {}) => {
    const r = spawnSync(process.execPath, [path.join(__dirname, skript), ...argyS], { stdio: 'inherit', env: { ...process.env, ...env } });
    if (r.status !== 0) {
        console.error(`\n${skript} skončil chybou (${r.status})`);
        process.exit(r.status || 1);
    }
};
const zacatek = Date.now();
if (jazyky.length) {
    const sTextem = chci.length ? S_TEXTEM.filter((c) => chci.includes(c)) : S_TEXTEM;
    for (const jazyk of jazyky) {
        console.log(`\n=== ${jazyk}`);
        if (sTextem.length) spust('snimky-clanky-dum.cjs', sTextem, { JAZYK: jazyk });
    }
} else {
    const dum = chci.length ? DUM.filter((c) => chci.includes(c)) : DUM;
    const zemina = chci.length ? ZEMINA.filter((c) => chci.includes(c)) : ZEMINA;
    if (dum.length) spust('snimky-clanky-dum.cjs', dum);
    if (zemina.length) spust('snimky-zemina.cjs', []);
}
console.log(`\nHotovo za ${Math.round((Date.now() - zacatek) / 1000)} s. Obrázky prohlédnout a commitnout.`);
