/**
 * Přegeneruje obrázky do článků z aktuálního editoru (Libor 11. 11. 2026: „jak budeme vyvíjet editor, budu chtít
 * přegenerovávat obrázky, aby držely styl s realitou“). Recepty, z čeho který obrázek vzniká, jsou v modules/blog.md,
 * část Obrázky článků: recepty; scény samotné jsou v snimky-clanky-dum.cjs a snimky-zemina.cjs.
 *
 * Spuštění: node services/clanky/snimky-vse.cjs [článek …]   (bez argumentu všechny články s obrázky z editoru)
 * Potom obrázky prohlédnout (kontrolní půdorysy jsou v services/import-test/vystup) a commitnout.
 * Běží proti lokálnímu serveru 127.0.0.1:8002, testovací koncepty ClaudeTest maže hned po sobě.
 */
const path = require('path');
const { spawnSync } = require('child_process');

const DUM = ['typy-strech', 'barva-fasady', 'minimalni-rozmery-mistnosti', 'jak-nakreslit-pudorys-domu', 'vypocet-schodiste'];
const ZEMINA = ['kolik-zeminy-z-vykopu'];
// Bez obrázků z editoru: koeficient-nakypreni-zeminy (nákres ::nakypreni je SVG v šabloně, mění se s ní)

const chci = process.argv.slice(2);
const nezname = chci.filter((c) => !DUM.includes(c) && !ZEMINA.includes(c));
if (nezname.length) {
    console.error('Neznámý článek: ' + nezname.join(', ') + '\nZnámé: ' + [...DUM, ...ZEMINA].join(', '));
    process.exit(1);
}
const dum = chci.length ? DUM.filter((c) => chci.includes(c)) : DUM;
const zemina = chci.length ? ZEMINA.filter((c) => chci.includes(c)) : ZEMINA;

const spust = (skript, argy) => {
    const r = spawnSync(process.execPath, [path.join(__dirname, skript), ...argy], { stdio: 'inherit' });
    if (r.status !== 0) {
        console.error(`\n${skript} skončil chybou (${r.status})`);
        process.exit(r.status || 1);
    }
};
const zacatek = Date.now();
if (dum.length) spust('snimky-clanky-dum.cjs', dum);
if (zemina.length) spust('snimky-zemina.cjs', []);
console.log(`\nHotovo za ${Math.round((Date.now() - zacatek) / 1000)} s. Obrázky prohlédnout a commitnout.`);
