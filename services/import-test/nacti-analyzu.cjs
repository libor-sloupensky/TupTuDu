/**
 * Načte public/js/koncept-v3/import-analyza.js jako prohlížečový skript.
 *
 * Projekt má v package.json "type": "module", takže require() by soubor
 * považoval za ESM. Analyzátor je ale psaný pro prohlížeč (přiřazuje se do
 * globálního objektu), proto ho spustíme přes vm — stejný kód pak běží
 * v testech i ve Web Workeru.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function nactiAnalyzu() {
    const soubor = path.join(__dirname, '../../public/js/koncept-v3/import-analyza.js');
    vm.runInThisContext(fs.readFileSync(soubor, 'utf8'), { filename: soubor });
    if (!globalThis.ImportAnalyza) throw new Error('Analyzátor se nenačetl.');
    return globalThis.ImportAnalyza;
}

module.exports = { nactiAnalyzu };
