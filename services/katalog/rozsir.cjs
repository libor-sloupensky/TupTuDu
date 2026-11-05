/**
 * Rozšíření katalogu: doplní do polozky.json další kusy z Amazon Berkeley Objects podle pravidel,
 * s českým názvem z typu, barvy a materiálu. Ručně vybrané kusy zůstávají první a beze změny.
 * Názvy značek se nepřebírají. Potom spusť sestav.cjs, který doplněné kusy vyrobí.
 *
 * Spuštění: node services/katalog/rozsir.cjs [--nasucho]
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const B = 'https://amazon-berkeley-objects.s3.amazonaws.com';
const SOUBOR = path.join(__dirname, 'polozky.json');
const NASUCHO = process.argv.includes('--nasucho');

// Vyřazené při prohlídce náhledů, další běh je nesmí vrátit
const VYRAZENE = {
    B07JC4M6VR: 'rohová pohovka otočená o 90°',
    B0732HV63N: 'koberec s 323 808 ploškami a 6,7 MB, pro prohlížeč zbytečně těžký',
    B07B8FHTMV: 'okenice, ne obraz',
    B07C41C1C8: 'skříň s tmavým přechodem přímo v textuře, výroba ho neopraví',
};

// Kolik kusů má mít kategorie celkem i s ručně vybranými
const CILE = { pohovky: 80, kresla: 110, zidle: 100, stoly: 40, stolky: 110, postele: 50, skrine: 90, police: 40, psaci: 50, svitidla: 70, koberce: 70, obrazy: 50, zrcadla: 30, rostliny: 40 };
const NIKDY = /\b(kid|kids|child|children|toddler|baby|nursery|outdoor|patio|cover|slipcover|massage|gaming|folding|bean ?bag|replacement|mattress only|sectional|futon)\b/i;

// Barva z katalogu: kmen přídavného jména, koncovku dodá rod podstatného jména. Pořadí rozhoduje při shodě.
const BARVY = [
    [/charcoal|graphite|anthracite|slate/i, 'tmavě šed'], [/gr[ae]y|silver grey|ash|smoke|pewter/i, 'šed'], [/white|ivory|snow/i, 'bíl'], [/black|ebony|onyx/i, 'čern'],
    [/espresso|walnut|chocolate|mocha|coffee|brown|cognac|chestnut|saddle|bark/i, 'hněd'], [/beige|sand|linen|oatmeal|taupe|natural|flax|stone|khaki|cream/i, 'béžov'],
    [/navy|indigo/i, 'tmavě modr'], [/blue|teal|aqua|turquoise/i, 'modr'], [/green|olive|sage|emerald|moss/i, 'zelen'], [/red|burgundy|wine|crimson|rust|brick/i, 'červen'],
    [/yellow|mustard|gold|amber/i, 'žlut'], [/orange|terracotta/i, 'oranžov'], [/pink|blush|rose/i, 'růžov'], [/purple|plum|lavender/i, 'fialov'], [/oak|pine|maple|birch|beech|honey|wood/i, 'dřevěn'],
];
const rod = (kmen, r) => {
    if (r === 'f') return kmen + 'á';
    if (r === 'n') return kmen + 'é';
    return kmen + 'ý';
};
const barva = (text, r) => {
    for (const [v, kmen] of BARVY) if (v.test(text)) return rod(kmen, r);
    return null;
};

/** Z typu produktu, názvu a rozměrů určí kategorii a podstatné jméno. Null = do katalogu nepatří. */
function zaradit(typ, nazev, r) {
    const t = nazev.toLowerCase();
    const s = Math.max(r.x, r.z);
    const kuze = /leather/.test(t) && !/faux leather look/.test(t);
    const u = (p) => ({ kategorie: p[0], jmeno: p[1], rod: p[2], uroven: p[3] || 0 });
    switch (typ) {
        case 'SOFA':
            if (s < 1.2 || s > 3.2) return null;
            if (/loveseat/.test(t) || s < 1.7) return u(['pohovky', kuze ? 'Kožená pohovka dvojsed' : 'Pohovka dvojsed', 'f']);
            return u(['pohovky', kuze ? 'Kožená pohovka' : (/velvet/.test(t) ? 'Sametová pohovka' : (/tufted/.test(t) ? 'Prošívaná pohovka' : (s > 2.1 ? 'Pohovka trojsed' : 'Pohovka'))), 'f']);
        case 'CHAIR':
            if (s > 1.5) return null;
            if (/office|desk chair|task chair/.test(t)) return null;
            if (/recliner|reclining/.test(t)) return u(['kresla', 'Polohovací křeslo', 'n']);
            if (/swivel/.test(t)) return u(['kresla', 'Otočné křeslo', 'n']);
            if (/wing/.test(t)) return u(['kresla', 'Ušák', 'm']);
            if (/dining|side chair|kitchen/.test(t) || s < 0.62) return u(['zidle', /dining|kitchen/.test(t) ? 'Jídelní židle' : 'Židle', 'f']);
            return u(['kresla', kuze ? 'Kožené křeslo' : 'Křeslo', 'n']);
        case 'OTTOMAN':
            return s <= 1.4 ? u(['kresla', 'Taburet', 'm']) : null;
        case 'STOOL_SEATING':
            return u(['zidle', /bar|counter/.test(t) || r.y > 0.75 ? 'Barová židle' : 'Stolička', 'f']);
        case 'BENCH':
            return s <= 2.2 ? u(['zidle', 'Lavice', 'f']) : null;
        case 'TABLE':
            if (s > 2.8) return null;
            if (/night ?stand|bedside/.test(t)) return u(['stolky', 'Noční stolek', 'm']);
            if (/coffee|cocktail/.test(t)) return u(['stolky', 'Konferenční stolek', 'm']);
            if (/console|sofa table|entryway/.test(t)) return u(['stolky', 'Konzolový stolek', 'm']);
            if (/end table|side table|accent table/.test(t)) return u(['stolky', 'Odkládací stolek', 'm']);
            if (/dining|kitchen/.test(t) || (s >= 1.1 && r.y >= 0.68)) return u(['stoly', 'Jídelní stůl', 'm']);
            if (r.y < 0.55 && s >= 0.7) return u(['stolky', 'Konferenční stolek', 'm']);
            return u(['stolky', 'Odkládací stolek', 'm']);
        case 'BED':
        case 'BED_FRAME':
            if (/dresser|chest|drawer unit|nightstand/.test(t)) return null;
            if (s < 1.6 || r.y < 0.3) return null;   // holé rošty bez matrace do katalogu nechceme
            if (Math.min(r.x, r.z) < 1.25) return u(['postele', 'Jednolůžko', 'n']);
            return u(['postele', /upholster|tufted|fabric/.test(t) ? 'Čalouněná postel' : (/metal|iron|steel/.test(t) ? 'Kovová postel' : 'Postel'), 'f']);
        case 'DRESSER':
            return s <= 2.2 ? u(['skrine', 'Komoda', 'f']) : null;
        case 'CABINET':
            if (/file|filing/.test(t) || s > 2.4) return null;
            if (/wardrobe|armoire|closet/.test(t)) return u(['skrine', 'Šatní skříň', 'f']);
            if (/sideboard|buffet|credenza/.test(t)) return u(['skrine', 'Příborník', 'm']);
            if (/shoe/.test(t)) return u(['skrine', 'Botník', 'm']);
            if (/tv |television|media/.test(t)) return u(['skrine', 'TV stolek', 'm']);
            if (/drawer|chest|dresser/.test(t)) return u(['skrine', 'Komoda', 'f']);
            if (/bookcase|bookshelf/.test(t)) return u(['police', 'Knihovna', 'f']);
            return u(['skrine', r.y > 1.5 ? 'Skříň' : 'Skříňka', 'f']);
        case 'SHELF':
            if (/wall|floating|hanging/.test(t) || s > 2.2 || r.y < 0.5) return null;
            return u(['police', /bookcase|bookshelf/.test(t) ? 'Knihovna' : 'Police', 'f']);
        case 'DESK':
            if (s > 2.2 || /lap|standing/.test(t)) return null;
            return u(['psaci', /corner|l-shaped|l shaped/.test(t) ? 'Rohový psací stůl' : 'Psací stůl', 'm']);
        case 'LAMP':
            if (/floor/.test(t) || r.y > 1.1) return u(['svitidla', 'Stojací lampa', 'f']);
            return u(['svitidla', 'Stolní lampa', 'f', 0.75]);
        case 'RUG':
            return s >= 1.2 && s <= 4 && !/runner/.test(t) ? u(['koberce', 'Koberec', 'm']) : null;
        case 'WALL_ART':
            return s >= 0.25 && s <= 1.6 && !/word|quote/.test(t) ? u(['obrazy', 'Obraz', 'm', 1.3]) : null;
        case 'HOME_MIRROR':
            return s <= 1.5 && !/vanity|makeup/.test(t) ? u(['zrcadla', 'Zrcadlo', 'n', 1.1]) : null;
        case 'PLANTER':
            return /hanging|wall/.test(t) ? null : u(['rostliny', 'Květináč', 'm']);
        case 'VASE':
            return u(['rostliny', 'Váza', 'f']);
        default:
            return null;
    }
}

const radky = async function* (url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status + ' ' + url);
    const t = zlib.gunzipSync(Buffer.from(await r.arrayBuffer())).toString('utf8');
    for (const l of t.split(/\r?\n/)) if (l) yield l;
};

(async () => {
    const zadani = JSON.parse(fs.readFileSync(SOUBOR, 'utf8'));
    const rucni = zadani.polozky.filter(p => !p.auto);
    const uz = new Set([...rucni.map(p => p.orig), ...Object.keys(VYRAZENE)]);

    const rozmery = new Map();
    let hlava = null;
    for await (const l of radky(`${B}/3dmodels/metadata/3dmodels.csv.gz`)) {
        const c = l.split(',');
        if (!hlava) { hlava = c; continue; }
        const o = {}; hlava.forEach((k, i) => { o[k] = c[i]; });
        rozmery.set(o['3dmodel_id'], { x: Number(o.extent_x), y: Number(o.extent_y), z: Number(o.extent_z) });
    }

    // Stejný model v jiné barvě je v datech víckrát: bereme jeden, klíč jsou první slova názvu bez značky
    const kandidati = {};
    const klice = new Set();
    for (const hx of '0123456789abcdef') {
        for await (const l of radky(`${B}/listings/metadata/listings_${hx}.json.gz`)) {
            let o; try { o = JSON.parse(l); } catch { continue; }
            const id = o['3dmodel_id'];
            if (!id || uz.has(id)) continue;
            const typ = o.product_type?.[0]?.value;
            const nazev = (o.item_name || []).find(x => (x.language_tag || '').startsWith('en'))?.value || '';
            const r = rozmery.get(id);
            if (!typ || !nazev || !r || !Number.isFinite(r.x) || NIKDY.test(nazev)) continue;
            const z = zaradit(typ, nazev, r);
            if (!z) continue;
            const klic = z.kategorie + '|' + nazev.replace(/Amazon Brand\s*[-–]\s*/i, '').replace(/,.*$/, '').split(/\s+/).slice(0, 5).join(' ').toLowerCase();
            if (klice.has(klic)) continue;
            klice.add(klic);
            uz.add(id);
            const textBarvy = (o.color || []).map(c => c.value || '').join(' ') + ' ' + (o.color || []).flatMap(c => c.standardized_values || []).join(' ');
            const b = barva(textBarvy, z.rod);
            (kandidati[z.kategorie] = kandidati[z.kategorie] || []).push({
                id: 'abo-' + id, zdroj: 'abo', orig: id, nazev: b ? `${z.jmeno}, ${b}` : z.jmeno, kategorie: z.kategorie, auto: true,
                ...(z.uroven ? { uroven: z.uroven } : {}),
            });
        }
    }

    const pocet = {}; for (const p of rucni) pocet[p.kategorie] = (pocet[p.kategorie] || 0) + 1;
    const nove = [];
    for (const [kat, cil] of Object.entries(CILE)) {
        const seznam = (kandidati[kat] || []).sort((a, b) => a.orig.localeCompare(b.orig));
        const zbyva = Math.max(0, cil - (pocet[kat] || 0));
        // Rovnoměrný průřez místo prvních N, ať nejsou všechny ze stejné řady
        const krok = Math.max(1, seznam.length / (zbyva || 1));
        const vyb = [];
        for (let i = 0; i < seznam.length && vyb.length < zbyva; i += krok) vyb.push(seznam[Math.floor(i)]);
        nove.push(...vyb);
        console.log(`${kat}: ručních ${pocet[kat] || 0}, kandidátů ${seznam.length}, přidáno ${vyb.length}`);
    }
    const poradi = (k) => zadani.kategorie.findIndex(x => x.id === k);
    const vse = [...rucni, ...nove].sort((a, b) => poradi(a.kategorie) - poradi(b.kategorie));
    console.log(`Celkem ${vse.length} kusů`);
    if (!NASUCHO) fs.writeFileSync(SOUBOR, JSON.stringify({ kategorie: zadani.kategorie, polozky: vse }, null, 1));
    const ukazka = nove.filter((_, i) => i % Math.ceil(nove.length / 24) === 0).map(p => p.nazev);
    console.log('Ukázka názvů: ' + ukazka.join(' · '));
})().catch((e) => { console.error(e); process.exit(1); });
