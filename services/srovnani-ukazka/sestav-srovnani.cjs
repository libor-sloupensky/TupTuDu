// Ukázka srovnávací stránky (3. 11. 2026, modules/srovnani.md). Sestaví ukázku srovnání: šablona + značka (inline SVG z partialu) + data z analýzy konkurence (jen Homestyler a TupTuDu)
const fs = require('fs');
const path = require('path');
const S = __dirname; // spustit: node services/srovnani-ukazka/sestav-srovnani.cjs → srovnani-tuptudu.html vedle skriptu
const d = JSON.parse(fs.readFileSync(S + '/konkurence-data.json', 'utf8'));
const H = d.produkty.find(p => p.id === 'homestyler').funkce;
const T = d.produkty.find(p => p.id === 'tuptudu').funkce;
// Interní poznámky u TupTuDu přepsat zákaznicky (význam stejný, bez vývojářských slov)
const prepis = {
  h_prohlizec: 'Webová aplikace bez instalace',
  c_3d: 'Jednoduché 3D se stěnami, otvory a terénem pozemku, pohled s otáčením',
  h_cestina: 'Editor česky; web a účet česky i anglicky',
};
for (const k of Object.keys(prepis)) if (T[k]) T[k] = { ...T[k], p: prepis[k] };
const data = { F: d.funkce, G: d.skupiny, H, T };
let znacka = fs.readFileSync(path.resolve(__dirname, '../../resources/views/partials/znacka.blade.php'), 'utf8').replace(/\{\{--[\s\S]*?--\}\}/g, '').trim();
let html = fs.readFileSync(S + '/srovnani-sablona.html', 'utf8');
html = html.replace('{{ZNACKA}}', () => znacka).replace('{{DATA}}', () => JSON.stringify(data).replace(/</g, '\u003c'));
fs.writeFileSync(S + '/srovnani-tuptudu.html', html);
console.log('hotovo', (html.length / 1024).toFixed(0), 'kB; funkcí', data.F.length, '; H klíčů', Object.keys(H).length, '; T klíčů', Object.keys(T).length);
