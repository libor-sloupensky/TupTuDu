/**
 * StavebníEngine — datový model pro 2D CAD editor
 *
 * Čistá logika bez UI/renderingu.
 * Node = sdílený bod, Wall = stěna mezi dvěma body, Opening = otvor ve stěně.
 * Rohy řešeny mitre join (úhel řezu = polovina úhlu mezi stěnami).
 */
// Texty jsou v lang/*/ed_kresba.php. V Node testech slovník není a tx vrací klíč.
const tx = (k, p) => (typeof preloz === 'function' ? preloz(k, p) : k);

// ═══════════════════════════════════════════════════════
// TYPOVÉ DEFINICE OBJEKTŮ
// ═══════════════════════════════════════════════════════
const TYPY_STEN = {
    obvodova: {
        nazev: tx('ed_kresba.typ_stena_obvodova'),
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.20, max: 0.60, default: 0.30 },
        barva2d: '#4b5563',
        barva2dStroke: '#1f2937',
        barva3d: 0x6b6b6b,
        standardTloustky: [0.20, 0.25, 0.30, 0.36, 0.40, 0.44, 0.50, 0.60],
    },
    nosna: {
        nazev: tx('ed_kresba.typ_stena_nosna'),
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.20, max: 0.45, default: 0.25 },
        barva2d: '#374151',
        barva2dStroke: '#111827',
        barva3d: 0x5a5a5a,
        standardTloustky: [0.20, 0.25, 0.30, 0.365, 0.40, 0.45],
    },
    pricka: {
        nazev: tx('ed_kresba.typ_stena_pricka'),
        kategorie: 'konstrukcni',
        tloušťka: { min: 0.05, max: 0.19, default: 0.10 },
        barva2d: '#9ca3af',
        barva2dStroke: '#6b7280',
        barva3d: 0xa0a0a0,
        standardTloustky: [0.05, 0.08, 0.10, 0.115, 0.14, 0.175, 0.19],
    },
    plot: {
        nazev: tx('ed_kresba.typ_stena_plot'),
        kategorie: 'exterior',
        tloušťka: { min: 0.05, max: 0.40, default: 0.15 },
        vyska: { min: 0.5, max: 2.5, default: 1.8 },
        barva2d: '#92400e',
        barva2dStroke: '#78350f',
        barva3d: 0x8b6914,
        standardTloustky: [0.05, 0.10, 0.15, 0.20, 0.30, 0.40],
    },
    zidka: {
        nazev: tx('ed_kresba.typ_stena_zidka'),
        kategorie: 'exterior',
        tloušťka: { min: 0.15, max: 0.50, default: 0.25 },
        vyska: { min: 0.3, max: 1.5, default: 0.8 },
        barva2d: '#78716c',
        barva2dStroke: '#57534e',
        barva3d: 0x8a8278,
        standardTloustky: [0.15, 0.20, 0.25, 0.30, 0.40, 0.50],
    },
};

const TYPY_OTVORU = {
    dvere: {
        nazev: tx('ed_kresba.typ_otvor_dvere'),
        sirka: { min: 0.6, max: 2.4, default: 0.9 },
        vyska: { min: 1.8, max: 2.4, default: 2.1 },
        parapet: 0,
        barva2d: '#c2410c',
        barva3d: 0x6b4226,
        // ČSN 74 6401 — standardní stavební otvory (jedno- a dvoukřídlé)
        standardSirky: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8],
    },
    okno: {
        nazev: tx('ed_kresba.typ_otvor_okno'),
        sirka: { min: 0.4, max: 3.0, default: 1.2 },
        vyska: { min: 0.4, max: 2.0, default: 1.2 },
        parapet: 0.9,
        barva2d: '#2563eb',
        barva3d: 0xa3d5f7,
        standardSirky: [0.4, 0.6, 0.8, 0.9, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0],
    },
    garazova_vrata: {
        nazev: tx('ed_kresba.typ_otvor_garazova_vrata'),
        sirka: { min: 2.0, max: 6.0, default: 2.7 },
        vyska: { min: 2.0, max: 3.0, default: 2.2 },
        parapet: 0,
        barva2d: '#71717a',
        barva3d: 0x808080,
        standardSirky: [2.0, 2.25, 2.5, 2.7, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0],
    },
    francouzske_okno: {
        nazev: tx('ed_kresba.typ_otvor_francouzske_okno'),
        sirka: { min: 0.6, max: 3.0, default: 1.5 },
        vyska: { min: 2.0, max: 2.8, default: 2.2 },
        parapet: 0,
        barva2d: '#0891b2',
        barva3d: 0x7cc8e0,
        standardSirky: [0.6, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5, 3.0],
    },
    pruchod: {
        nazev: tx('ed_kresba.typ_otvor_pruchod'),
        sirka: { min: 0.6, max: 4.0, default: 1.2 },
        vyska: { min: 1.8, max: 3.0, default: 2.1 },
        parapet: 0,
        barva2d: '#d97706',
        barva3d: 0xf5f5f5,
        standardSirky: [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0],
    },
};

/**
 * Křídla otvoru.
 *
 * Otvor je JEDEN rám v jedné stěně (jeden překlad); uvnitř má jedno nebo víc
 * křídel. Francouzské okno „dveře + pevný díl" je tedy jeden otvor se dvěma
 * křídly, ne dva otvory vedle sebe — ty by šly od sebe odtrhnout, ve 3D by
 * mezi nimi vznikl kus zdi a kóty by ukazovaly dva kusy.
 *
 *   křídlo = { sirka, otv, sklopne?, parapet? }
 *   otv: fix | pravy | levy | posuvne
 *   parapet: vlastní parapet dílu (dvojokno s nižším parapetem, boční pevný díl
 *            u francouzského okna), absolutně nad podlahou. Bez něj díl dědí parapet
 *            otvoru. Horní hrana je pro všechny díly společná (parapet + vyska otvoru);
 *            posun parapetu otvoru posune i díly s vlastním parapetem (posunParapetOtvoru).
 *   sklopne: true = křídlo jde navíc sklopit (otevíravě-sklopné, posuvně-sklopné,
 *            pevné + sklopné = jen větračka). Doplněk, ne další typ — Libor 1. 11. 2026,
 *            jinak by kombinací bylo moc.
 *   levy / pravy = panty u začátku / konce křídla ve směru stěny A→B
 *   (stejná konvence jako dřív u `smer` celého otvoru).
 *
 * Otvor bez pole `kridla` (starší projekty, import z výkresu) se odvodí
 * z typu a `smer` za běhu — viz odvodKridla(); migrace není potřeba.
 * Starší hodnoty otv (sklopne, levy_sklopne, pravy_sklopne) převádí normalizujKridlo().
 */
const TYPY_KRIDEL = {
    fix: { nazev: tx('ed_kresba.kridlo_fix') },
    pravy: { nazev: tx('ed_kresba.kridlo_pravy') },
    levy: { nazev: tx('ed_kresba.kridlo_levy') },
    posuvne: { nazev: tx('ed_kresba.kridlo_posuvne') },
};

const naCm = (m) => Math.round(m * 100) / 100;

/**
 * Automatický název podlaží podle jazyka. n = kolikáté od země: 0 přízemí, 1 první patro, u sklepu 1 první pod zemí.
 * Node testy slovník nemají a s českými zkratkami počítají.
 */
function autoNazevPodlazi(typ, n) {
    const bezSlovniku = typeof preloz !== 'function';
    if (typ === 'podkrovi') return bezSlovniku ? 'Podkroví' : tx('ed_kresba.podkrovi');
    if (typ === 'sklep') return bezSlovniku ? n + '.PP' : tx('ed_kresba.podlazi_sklep', { n });
    if (n === 0) return bezSlovniku ? '1.NP' : tx('ed_kresba.podlazi_prizemi');
    return bezSlovniku ? (n + 1) + '.NP' : tx('ed_kresba.podlazi_patro', { n, np: n + 1 });
}

/**
 * Výchozí název místnosti ze slovníku. Ukládá se jako auto = { k: 'mistnost_n', n: 3 } nebo { k: 'prostor_obyvak' }:
 * přepíná se s jazykem, přejmenováním auto zmizí a název je dál text uživatele. Bez slovníku (Node) česky.
 */
function autoNazevMistnosti(auto) {
    if (auto.k === 'mistnost_n') return typeof preloz === 'function' ? tx('ed_kresba.mistnost_n', { n: auto.n }) : 'Místnost ' + (auto.n ?? '');
    // Podle druhu: „Obývák“, další stejného druhu „Obývák 2“
    const zaklad = tx('ed_kresba.' + auto.k);
    return auto.n > 1 ? zaklad + ' ' + auto.n : zaklad;
}

/** Druhy místností (Libor 10. 11. 2026): název ze slovníku ed_kresba. Bez druhu = „Jiná“, jen vlastní název. */
const DRUHY_MISTNOSTI = {
    obyvak: 'prostor_obyvak', loznice: 'prostor_loznice', pokoj: 'prostor_pokoj', kuchyne: 'prostor_kuchyne',
    jidelna: 'prostor_jidelna', koupelna: 'prostor_koupelna', wc: 'prostor_wc', chodba: 'prostor_chodba',
    zadveri: 'prostor_zadveri', satna: 'prostor_satna', pracovna: 'prostor_pracovna', technicka: 'prostor_technicka',
    pradelna: 'prostor_pradelna', spiz: 'prostor_spiz', sklad: 'prostor_sklad', sklep: 'prostor_sklep', garaz: 'prostor_garaz',
};

/**
 * Skupiny druhů místností (Libor 11. 11. 2026): přehlednější výběr druhu a společná nabídka nábytku pro celou skupinu.
 * Denní a noční zóna jsou oddělené kvůli nábytku (pohovky × postele). Název ze slovníku ed_kresba.skupina_*.
 */
const SKUPINY_MISTNOSTI = {
    denni: ['obyvak', 'jidelna', 'pracovna'],
    nocni: ['loznice', 'pokoj'],
    kuchyne: ['kuchyne', 'spiz'],
    hygiena: ['koupelna', 'wc', 'pradelna'],
    vstup: ['zadveri', 'chodba', 'satna'],
    technicke: ['technicka', 'sklad', 'sklep', 'garaz'],
};
const skupinaDruhu = (druh) => Object.keys(SKUPINY_MISTNOSTI).find(s => SKUPINY_MISTNOSTI[s].includes(druh)) || null;

/** Typ prostoru z importu výkresu (CubiCasa) → druh místnosti. */
const DRUH_Z_IMPORTU = {
    LivingRoom: 'obyvak', Bedroom: 'loznice', Room: 'pokoj', Kitchen: 'kuchyne', Dining: 'jidelna', Bath: 'koupelna',
    Entry: 'zadveri', DraughtLobby: 'zadveri', Hall: 'chodba', Closet: 'satna', DressingRoom: 'satna', Den: 'pracovna',
    Utility: 'technicka', TechnicalRoom: 'technicka', Storage: 'sklad', Basement: 'sklep', Garage: 'garaz',
};

/** Název kusu z katalogu: slovník podle českého názvu, ten je zdroj a ukládá se vedle. Neznámý kus zůstane, jak je. */
function nazevKusuKatalogu(rv) {
    const zdroj = rv.nazevZdroj || rv.nazev;
    const preklad = rv.katalog ? globalThis.TT_LOKALIZACE?.texty?.['ed_katalog.' + zdroj] : undefined;
    return preklad ? { nazev: preklad, nazevZdroj: zdroj } : { nazev: rv.nazev ?? null, nazevZdroj: rv.nazevZdroj ?? null };
}

/** Jemné pastelové barvy místností (sytost kolem 15 %) — přidělují se dokola. */
const MAX_ODCHYLKA_ROVNOBEZNE = Math.sin(3 * Math.PI / 180);   // rovnoběžné stěny: do 3°
const PALETA_MISTNOSTI = ['#fbe9dc', '#e4eefb', '#e5f3e4', '#fbf4d6', '#efe8f8', '#e0f3f1', '#f8e6ea', '#ececec'];

/**
 * Křídlo do aktuálního tvaru { sirka, otv, sklopne? }. Starší hodnoty otv
 * (sklopne, levy_sklopne, pravy_sklopne) rozloží na typ + příznak. Null = poškozené.
 */
function normalizujKridlo(k) {
    if (!k || typeof k.sirka !== 'number' || !(k.sirka > 0)) return null;
    const stare = { sklopne: 'fix', levy_sklopne: 'levy', pravy_sklopne: 'pravy' };
    let otv = k.otv, sklopne = !!k.sklopne;
    if (stare[otv]) { sklopne = true; otv = stare[otv]; }
    if (!TYPY_KRIDEL[otv]) return null;
    const out = { sirka: naCm(k.sirka), otv };
    if (sklopne) out.sklopne = true;
    if (typeof k.parapet === 'number' && k.parapet >= 0) out.parapet = naCm(k.parapet);
    return out;
}

/** Parapet jednoho dílu — vlastní, nebo parapet otvoru. */
function parapetKridla(opening, kridlo) {
    if (kridlo && typeof kridlo.parapet === 'number' && kridlo.parapet >= 0) return kridlo.parapet;
    return parapetOtvoru(opening);
}

/** Horní hrana otvoru nad podlahou (společná pro všechny díly). */
function vrsekOtvoru(opening) {
    return naCm(parapetOtvoru(opening) + vyskaOtvoru(opening));
}

/** Nejnižší parapet ze všech dílů (rozhoduje o kresbě k podlaze a o straně otvírání). */
function minParapetOtvoru(opening) {
    const kridla = kridlaOtvoru(opening);
    if (kridla.length === 0) return parapetOtvoru(opening);
    return Math.min(...kridla.map(k => parapetKridla(opening, k)));
}

/**
 * Parapet celého otvoru: otvor se posune nahoru či dolů, výška zůstane
 * (běžné okno se změnou parapetu nezmenšuje). Díly s vlastním parapetem
 * se posunou o totéž, takže rozdělení výšek, které si uživatel zvolil, drží.
 */
function posunParapetOtvoru(opening, novyParapet) {
    const stary = parapetOtvoru(opening);
    const novy = naCm(Math.max(0, novyParapet));
    const posun = novy - stary;
    opening.parapet = novy;
    if (Array.isArray(opening.kridla)) {
        for (const k of opening.kridla) {
            if (typeof k.parapet === 'number') k.parapet = naCm(Math.max(0, k.parapet + posun));
        }
    }
}

/** Vlastní parapet jednoho dílu; hodnota rovná parapetu otvoru se neukládá (díl ho dědí). */
function nastavParapetKridla(opening, kridlo, parapet) {
    const p = naCm(Math.max(0, parapet));
    if (Math.abs(p - parapetOtvoru(opening)) < 0.001) delete kridlo.parapet;
    else kridlo.parapet = p;
}

/** Křídla odvozená pro otvor bez pole `kridla` (starší data, import). */
function odvodKridla(opening) {
    const s = naCm(opening.sirka || 0);
    if (opening.typ === 'okno') {
        // Běžné české okno je otevíravě-sklopné; nad 1,3 m dvoukřídlé
        if (s <= 1.3) return [{ sirka: s, otv: 'pravy', sklopne: true }];
        const pul = naCm(s / 2);
        return [{ sirka: pul, otv: 'levy', sklopne: true }, { sirka: naCm(s - pul), otv: 'pravy', sklopne: true }];
    }
    if (opening.typ === 'pruchod') return [];
    const smer = opening.smer || defaultOpeningSmer(opening.typ);
    if (!smer || smer === 'otvor') return [];
    return [{ sirka: s, otv: smer }];
}

/** Křídla otvoru — uložená, nebo odvozená z typu a směru. */
function kridlaOtvoru(opening) {
    if (Array.isArray(opening.kridla)) return opening.kridla;
    return odvodKridla(opening);
}

/**
 * Počet dílů (křídel) otvoru — Libor 1. 11. 2026: žádné předvolby sestav,
 * uživatel zvolí počet dílů a každý díl si nastaví sám. Zachované díly si
 * nechají typ, nové dostanou výchozí podle typu otvoru, šířky se rozdělí
 * rovnoměrně (poslední dorovná zaokrouhlení).
 */
function nastavPocetKridel(opening, pocet) {
    const stare = kridlaOtvoru(opening);
    const n = Math.max(0, Math.min(MAX_KRIDEL, Math.round(pocet) || 0));
    const kridla = [];
    for (let i = 0; i < n; i++) {
        kridla.push(stare[i] ? { ...stare[i] } : vychoziKridlo(opening.typ, i, n));
    }
    // Z jednoho křídla na víc: samotné pravé křídlo se stává levým krajním
    if (stare.length === 1 && n >= 2 && kridla[0].otv === 'pravy') kridla[0].otv = 'levy';
    let zbyva = naCm(opening.sirka);
    kridla.forEach((k, i) => {
        k.sirka = i === n - 1 ? zbyva : naCm(opening.sirka / n);
        zbyva = naCm(zbyva - k.sirka);
    });
    opening.kridla = kridla;
    opening.smer = smerZKridel(opening);
}

const MAX_KRIDEL = 4;

/** Výchozí nové křídlo: okna otevíravě-sklopná, dveře otevíravá, vrata posuvná; krajní díly mají panty u ostění. */
function vychoziKridlo(typ, i, n) {
    const panty = (n > 1 && i === 0) ? 'levy' : 'pravy';
    if (typ === 'garazova_vrata') return { sirka: 0, otv: 'posuvne' };
    if (typ === 'okno' || typ === 'francouzske_okno') return { sirka: 0, otv: panty, sklopne: true };
    return { sirka: 0, otv: panty };
}

/** Povolené počty dílů podle typu otvoru (0 = jen otvor bez křídla). */
function pocetKridelVolby(typ) {
    if (typ === 'pruchod') return [0];
    if (typ === 'okno') return [1, 2, 3, 4];
    if (typ === 'garazova_vrata') return [1, 2];
    return [0, 1, 2, 3, 4]; // dveře, francouzské okno
}

/** Zrcadlový typ křídla (panty z levé na pravou a naopak). */
function zrcadliOtv(otv) {
    return { levy: 'pravy', pravy: 'levy' }[otv] || otv;
}

/**
 * Zrcadlí sestavu zleva doprava: obrátí pořadí křídel a prohodí panty.
 * Samotné posuvné křídlo nemá co obracet — přehodí se strana pouzdra.
 */
function zrcadliKridla(opening) {
    const kridla = kridlaOtvoru(opening).map(k => normalizujKridlo({ ...k, otv: zrcadliOtv(k.otv) })).filter(Boolean).reverse();
    opening.kridla = kridla;
    if (kridla.length === 1 && kridla[0].otv === 'posuvne') opening.strana = opening.strana === 'out' ? 'in' : 'out';
    opening.smer = smerZKridel(opening);
}

/** Po změně šířky otvoru přeškálovat uložená křídla (odvozená se přepočítají sama). */
function zmenSirkuKridel(opening, novaSirka) {
    if (!Array.isArray(opening.kridla) || opening.kridla.length === 0) return;
    const soucet = opening.kridla.reduce((a, k) => a + k.sirka, 0) || 1;
    let zbyva = naCm(novaSirka);
    opening.kridla.forEach((k, i) => {
        const s = i === opening.kridla.length - 1 ? zbyva : naCm(novaSirka * k.sirka / soucet);
        k.sirka = s;
        zbyva = naCm(zbyva - s);
    });
}

/** Souhrnný `smer` otvoru podle křídel — pro starší kód a výpisy. Okna směr nemají. */
function smerZKridel(opening) {
    if (opening.typ === 'okno') return null;
    const kridla = kridlaOtvoru(opening);
    if (kridla.length === 0) return 'otvor';
    const prvni = kridla.find(k => k.otv !== 'fix');
    if (!prvni) return 'otvor';
    if (prvni.otv === 'posuvne') return 'posuvne';
    return kridloPanty(prvni.otv) || 'otvor';
}

/** Strana pantů křídla: 'levy' (u začátku), 'pravy' (u konce), nebo null. */
function kridloPanty(otv) {
    if (otv === 'levy') return 'levy';
    if (otv === 'pravy') return 'pravy';
    return null;
}

/** Jde křídlo sklopit? Bere celé křídlo (příznak), pro jistotu i starý řetězec. */
function kridloSklopne(kridlo) {
    if (!kridlo) return false;
    if (typeof kridlo === 'string') return /sklopne/.test(kridlo);
    return !!kridlo.sklopne || /sklopne/.test(kridlo.otv || '');
}

/**
 * Kam se posuvné křídlo zasouvá: +1 = ke konci otvoru (nodeB), -1 = k začátku.
 * Pravidlo: ke středu otvoru; přes pevný díl jen když ho má přímo po straně
 * (HS schéma pevné + posuvné + posuvné + pevné jede ven). Samotné posuvné
 * křídlo řeší pouzdro (getOpeningExtent), tady se neřeší.
 */
function smerPosunuKridla(kridla, i) {
    const vlevoFix = i > 0 && kridla[i - 1].otv === 'fix';
    const vpravoFix = i < kridla.length - 1 && kridla[i + 1].otv === 'fix';
    if (vlevoFix !== vpravoFix) return vpravoFix ? 1 : -1;
    const stred = (kridla.length - 1) / 2;
    return i < stred ? 1 : -1;
}

/** Výška otvoru v m — vlastní, nebo výchozí podle typu. */
function vyskaOtvoru(opening) {
    if (typeof opening.vyska === 'number' && opening.vyska > 0) return opening.vyska;
    return TYPY_OTVORU[opening.typ]?.vyska?.default ?? 2.1;
}

/** Parapet (spodní hrana nad podlahou) v m — vlastní, nebo výchozí podle typu. */
function parapetOtvoru(opening) {
    if (typeof opening.parapet === 'number' && opening.parapet >= 0) return opening.parapet;
    return TYPY_OTVORU[opening.typ]?.parapet ?? 0;
}

/**
 * Snap šířky otvoru na nejbližší standardní rozměr (ČSN 74 6401).
 * fineSnap=true → snap na 5 cm (pro atypické), jinak na seznam standardů typu.
 */
function snapOpeningSirka(sirka, typ, fineSnap = false) {
    if (fineSnap) return Math.round(sirka * 20) / 20; // 5 cm
    const cfg = TYPY_OTVORU[typ];
    if (!cfg || !cfg.standardSirky) return Math.round(sirka * 10) / 10; // fallback 10 cm
    let best = cfg.standardSirky[0], bestDiff = Math.abs(sirka - best);
    for (const s of cfg.standardSirky) {
        const d = Math.abs(sirka - s);
        if (d < bestDiff) { best = s; bestDiff = d; }
    }
    return best;
}

/**
 * Efektivní footprint otvoru podél stěny — leftExt + rightExt od pozice.
 * Pouzdro posuvných dveří zabírá stejnou délku jako křídlo na dané straně.
 *   - leftExt: kolik otvor zabírá VLEVO od pozice (směrem k nodeA)
 *   - rightExt: kolik otvor zabírá VPRAVO od pozice (směrem k nodeB)
 * Standardně rightExt=sirka, leftExt=0. Posuvné se zasunou doleva (strana=in) nebo doprava (strana=out),
 * takže na jedné straně musí být volný prostor = sirka navíc.
 */
function getOpeningExtent(opening) {
    // Pouzdro potřebuje jen samotné posuvné křídlo. HS portál (posuvné + pevné)
    // se zasouvá před pevný díl, stěnu vedle otvoru nepotřebuje.
    const kridla = kridlaOtvoru(opening);
    if (kridla.length === 1 && kridla[0].otv === 'posuvne') {
        const slideToA = (opening.strana || 'in') === 'in';
        if (slideToA) return { leftExt: opening.sirka, rightExt: opening.sirka };
        return { leftExt: 0, rightExt: 2 * opening.sirka };
    }
    return { leftExt: 0, rightExt: opening.sirka };
}

/** Výchozí směr otvírání pro typ otvoru. */
function defaultOpeningSmer(typ) {
    if (typ === 'okno') return null; // okna nemají křídlo
    if (typ === 'pruchod') return 'otvor';
    if (typ === 'garazova_vrata') return 'posuvne';
    return 'pravy'; // dveře, francouzské okno: default pravy hinge
}

/** Migrace starého formátu smer_otvirani "left_in" → { smer, strana }. */
function migrateOpeningSmer(raw) {
    if (!raw) return null;
    if (typeof raw !== 'string') return null;
    if (raw.indexOf('_') < 0) return { smer: raw, strana: 'in' };
    const parts = raw.split('_');
    const smer = parts[0] === 'left' ? 'levy' : (parts[0] === 'right' ? 'pravy' : parts[0]);
    const strana = parts[1] === 'out' ? 'out' : 'in';
    return { smer, strana };
}

/** Snap tloušťky stěny na nejbližší standardní rozměr podle typu. */
function snapWallTloustka(tloustka, typ) {
    const cfg = TYPY_STEN[typ];
    if (!cfg || !cfg.standardTloustky) return Math.round(tloustka * 100) / 100;
    let best = cfg.standardTloustky[0], bestDiff = Math.abs(tloustka - best);
    for (const t of cfg.standardTloustky) {
        const d = Math.abs(tloustka - t);
        if (d < bestDiff) { best = t; bestDiff = d; }
    }
    return best;
}

const TYPY_PLOCH = {
    terasa: {
        nazev: tx('ed_kresba.typ_plocha_terasa'),
        kategorie: 'exterior',
        vyska: 0.15, // výška nad terénem
        barva2d: '#d4a574',
        barva2dStroke: '#b8956a',
        barva3d: 0xc4956a,
        pattern: 'dlazba',
    },
    chodnik: {
        nazev: tx('ed_kresba.typ_plocha_chodnik'),
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#d1d5db',
        barva2dStroke: '#9ca3af',
        barva3d: 0xc0c0c0,
        pattern: 'dlazba',
    },
    cesta: {
        nazev: tx('ed_kresba.typ_plocha_cesta'),
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#a8a29e',
        barva2dStroke: '#78716c',
        barva3d: 0x909090,
        pattern: 'asfalt',
    },
    travnik: {
        nazev: tx('ed_kresba.typ_plocha_travnik'),
        kategorie: 'exterior',
        vyska: 0,
        barva2d: '#86efac',
        barva2dStroke: '#4ade80',
        barva3d: 0x5cb85c,
        pattern: 'trava',
    },
    zahon: {
        nazev: tx('ed_kresba.typ_plocha_zahon'),
        kategorie: 'exterior',
        vyska: 0.1,
        barva2d: '#a3734c',
        barva2dStroke: '#8b6340',
        barva3d: 0x8b6340,
        pattern: 'zemina',
    },
    parkoviste: {
        nazev: tx('ed_kresba.typ_plocha_parkoviste'),
        kategorie: 'exterior',
        vyska: 0.05,
        barva2d: '#94a3b8',
        barva2dStroke: '#64748b',
        barva3d: 0x808898,
        pattern: 'asfalt',
    },
    bazén: {
        nazev: tx('ed_kresba.typ_plocha_bazen'),
        kategorie: 'exterior',
        vyska: -1.5, // zapuštěný
        barva2d: '#38bdf8',
        barva2dStroke: '#0ea5e9',
        barva3d: 0x4db8e8,
        pattern: null,
    },
    piskoviste: {
        nazev: tx('ed_kresba.typ_plocha_piskoviste'),
        kategorie: 'exterior',
        vyska: 0,
        barva2d: '#fde68a',
        barva2dStroke: '#fbbf24',
        barva3d: 0xe8d080,
        pattern: null,
    },
};

const TYPY_STRECHY = {
    sedlova: {
        nazev: tx('ed_kresba.typ_strecha_sedlova'),
        sklon: { min: 15, max: 55, default: 35 },
        presah: { min: 0.2, max: 1.5, default: 0.5 },
        barva3d: 0xb84c2c,
    },
    pultova: {
        nazev: tx('ed_kresba.typ_strecha_pultova'),
        sklon: { min: 5, max: 25, default: 10 },
        presah: { min: 0.2, max: 1.0, default: 0.4 },
        barva3d: 0xa04828,
    },
    plocha: {
        nazev: tx('ed_kresba.typ_strecha_plocha'),
        sklon: { min: 1, max: 5, default: 2 },
        presah: { min: 0, max: 0.5, default: 0.1 },
        barva3d: 0x808080,
    },
    valbova: {
        nazev: tx('ed_kresba.typ_strecha_valbova'),
        sklon: { min: 20, max: 45, default: 30 },
        presah: { min: 0.3, max: 1.5, default: 0.5 },
        barva3d: 0xc05030,
    },
    mansardova: {
        nazev: tx('ed_kresba.typ_strecha_mansardova'),
        sklon: { min: 30, max: 70, default: 55 },
        presah: { min: 0.3, max: 1.0, default: 0.5 },
        barva3d: 0x985030,
    },
};

const TYPY_PRISLUSENSTVI = {
    pergola: {
        nazev: tx('ed_kresba.typ_prisl_pergola'),
        kategorie: 'exterior',
        vyska: { min: 2.2, max: 3.5, default: 2.5 },
        barva2d: '#a16207',
        barva2dStroke: '#854d0e',
        barva3d: 0x8b6914,
    },
    pristresek: {
        nazev: tx('ed_kresba.typ_prisl_pristresek'),
        kategorie: 'exterior',
        vyska: { min: 2.2, max: 4.0, default: 2.5 },
        barva2d: '#737373',
        barva2dStroke: '#525252',
        barva3d: 0x707070,
    },
    komin: {
        nazev: tx('ed_kresba.typ_prisl_komin'),
        kategorie: 'konstrukcni',
        rozmer: { min: 0.3, max: 0.6, default: 0.4 },
        barva2d: '#dc2626',
        barva2dStroke: '#b91c1c',
        barva3d: 0xc03030,
    },
    sloup: {
        nazev: tx('ed_kresba.typ_prisl_sloup'),
        kategorie: 'konstrukcni',
        rozmer: { min: 0.2, max: 0.5, default: 0.3 },
        barva2d: '#374151',
        barva2dStroke: '#1f2937',
        barva3d: 0x606060,
    },
    schody: {
        nazev: tx('ed_kresba.typ_prisl_schody'),
        kategorie: 'konstrukcni',
        sirka: { min: 0.8, max: 2.0, default: 1.0 },
        barva2d: '#6b7280',
        barva2dStroke: '#4b5563',
        barva3d: 0x909090,
    },
    branka: {
        nazev: tx('ed_kresba.typ_prisl_branka'),
        kategorie: 'exterior',
        sirka: { min: 0.8, max: 1.5, default: 1.0 },
        vyska: { min: 1.0, max: 2.2, default: 1.5 },
        barva2d: '#b45309',
        barva2dStroke: '#92400e',
        barva3d: 0xa06020,
    },
    brana: {
        nazev: tx('ed_kresba.typ_prisl_brana'),
        kategorie: 'exterior',
        sirka: { min: 2.5, max: 6.0, default: 3.5 },
        vyska: { min: 1.5, max: 2.5, default: 1.8 },
        barva2d: '#78350f',
        barva2dStroke: '#451a03',
        barva3d: 0x704020,
    },
};

/**
 * Určí typ stěny podle tloušťky (explicitní typ má přednost).
 * Bez informace o poloze na obvodu defaultujeme na 'nosna' (vnitřní nosnou),
 * ne 'obvodova' — obvodová = poloha + funkce (na obvodu) a vyžaduje geometrickou
 * detekci, kterou zvládne jen parser půdorysu. AI/ruční kresba typ upraví ručně.
 */
function urcTypSteny(tloustka, explicitTyp = null) {
    if (explicitTyp && TYPY_STEN[explicitTyp]) return explicitTyp;
    return tloustka >= 0.20 ? 'nosna' : 'pricka';
}

class StavebniEngine {
    constructor(options = {}) {
        this.nodes = new Map();   // id → {id, x, y}
        this.walls = new Map();   // id → {id, nodeA, nodeB, tloustka, typ}
        this.openings = new Map(); // id → {id, wallId, pozice, sirka, typ, nazev, smer, strana, vyska?, parapet?, kridla?}
        this.vybaveni = [];        // [{id, typ, podtyp, kategorie, polygon, stred:[x,y px], sirka, hloubka, uhel, vyska}] — souřadnice v canvas px
        this.oddelovace = new Map(); // id → {id, a, b, delkaPx}; konec = {x, y, host?: {stena, t, strana}} — viz addOddelovac
        this.mistnosti = [];         // [{id, nazev, barva, podlaha:{dekor, barva}, kotva:{x,y px}}] — plochy počítá rastr (mistnosti.js), záznam drží jméno a barvu u kotvy; barva je pro půdorys, podlaha pro 3D
        // Dům: podlaží, schody, výškové plochy, střecha. Engine drží v nodes/walls/… vždy
        // AKTIVNÍ podlaží, ostatní leží v dum.podlazi[].data jako JSON, se kterým se NIKDY
        // nehýbe na místě (úprava = nový objekt) — snímky Zpět na ně proto jen odkazují.
        this.dum = StavebniEngine.vychoziDum();
        this._tmpEnginy = new WeakMap();   // data podlaží → engine jen pro čtení (podklad, kontroly, 3D)
        this.nextId = 1;
        this.MAGNET_DIST = options.magnetDist || 16;
        this.PX_PER_M = options.pxPerM || 80;
        this.SNAP_STEP = options.snapStep || 8;
        this.undoStack = [];
        this.maxUndo = 50;
        // Stav mimo kresbu, který se musí vracet spolu s ní (poloha podkladu).
        // UI sem dosadí { zachyt() → stav, obnov(stav) }; bez něj by Zpět vrátil
        // posunutý dům, ale podklad by zůstal posunutý a rozjely by se.
        this.undoDoplnek = null;
        // (nodeId) → { host } | null — napojení na okraj, které zatím jen ukazuje
        // náhled tažení (vazba vznikne až po puštění). Dosazuje UI.
        this.nahledNapojeni = null;
    }

    // ─── ID generátor ──────────────────────────────────
    _id(prefix = 'N') {
        return prefix + (this.nextId++);
    }

    /**
     * Prefix id otvoru podle typu: D pro dveře (všechny dveřní typy), O pro okna.
     *
     * Na jednom místě proto, že se to počítalo zvlášť v addOpening a zvlášť ve
     * fromJSON — a tam natvrdo „O", takže dveře načtené bez id dostaly okenní id.
     */
    /** Označení kusu nábytku na plánu a v seznamu: M a číslo z id (vb12 → M12). Jako W, D a O je
     *  ve všech jazycích stejné, ať si lidé v různých jazycích můžou na kus odkázat (Libor 9. 11. 2026). */
    static oznaceniKusu(v) {
        return 'M' + ((String(v.id).match(/\d+/) || [''])[0]);
    }

    static prefixOtvoru(typ) {
        return (typ === 'dvere' || typ === 'francouzske_okno'
            || typ === 'pruchod' || typ === 'garazova_vrata') ? 'D' : 'O';
    }

    // ─── UNDO ──────────────────────────────────────────
    pushUndo() {
        const stav = this.toJSON();
        if (this.undoDoplnek) stav._doplnek = this.undoDoplnek.zachyt();
        this.undoStack.push(stav);
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    }

    undo() {
        if (this.undoStack.length === 0) return false;
        const state = this.undoStack.pop();
        this.fromJSON(state);
        if (this.undoDoplnek && '_doplnek' in state) this.undoDoplnek.obnov(state._doplnek);
        return true;
    }

    // ─── SNAP ──────────────────────────────────────────
    snapToGrid(val) {
        return Math.round(val / this.SNAP_STEP) * this.SNAP_STEP;
    }

    /** @param {number} [dosah]  dosah magnetu k uzlům v px výkresu (UI ho počítá z přiblížení) */
    snapPoint(x, y, dosah = this.MAGNET_DIST) {
        let sx = this.snapToGrid(x);
        let sy = this.snapToGrid(y);

        // Magnet k existujícím nodům
        let minDist = dosah;
        let magnetNode = null;

        for (const node of this.nodes.values()) {
            const dist = Math.hypot(sx - node.x, sy - node.y);
            if (dist < minDist) {
                minDist = dist;
                magnetNode = node;
            }
        }

        if (magnetNode) {
            return { x: magnetNode.x, y: magnetNode.y, magnetNodeId: magnetNode.id };
        }
        // Rohy a osy nosných a obvodových stěn podlaží pod aktivním — stěny patra mají
        // navazovat na ty dole (vlastní uzel má vždy přednost)
        // a stěna tohoto podlaží v dosahu: tam patří okraj nebo střih, ne volný bod.
        const dole = this.findSnapCandidate(x, y, dosah, null, true) ? null : this.magnetSpodku(x, y, dosah);
        if (dole) return { x: dole.x, y: dole.y, magnetNodeId: null, magnetSpodek: true };
        return { x: sx, y: sy, magnetNodeId: null };
    }

    // ─── DŮM: PODLAŽÍ ──────────────────────────────────
    /** Barvy společné pro celý dům: fasáda a výplně otvorů zvlášť venku a uvnitř. */
    static vychoziBarvyDomu() {
        return {
            fasada: '#6b6b6b',
            oknoVen: '#f3f4f6', oknoDovnitr: '#f3f4f6',
            dvereVen: '#6b4226', dvereDovnitr: '#6b4226',   // dveře v obvodové stěně
            dvereVnitrni: '#6b4226',                        // dveře uvnitř domu mají jednu barvu
            vrataVen: '#8a8a8a', vrataDovnitr: '#8a8a8a',
        };
    }

    static vychoziDum() {
        return {
            verze: 1,
            aktivni: 'P1',
            // Kóta podlahy prvního nadzemního podlaží (m). Kóty ostatních plynou z konstrukčních
            // výšek, podlaží proto nejde nasunout do sebe ani od sebe odtrhnout.
            posunVysky: 0,
            barvy: StavebniEngine.vychoziBarvyDomu(),
            // Pořadí zdola nahoru. vyska = konstrukční výška (podlaha až podlaha), strop = tloušťka
            // stropu nad podlažím. typ: bezne | sklep | podkrovi; data = JSON kresby, u aktivního null.
            podlazi: [{ id: 'P1', nazev: autoNazevPodlazi('bezne', 0), typ: 'bezne', vyska: 3.05, strop: 0.25, data: null }],
            schodiste: [],   // [{id, odPodlazi, doPodlazi, plocha? (schody k výškové ploše), tvar: prime|L|U, x, y (m, y nahoru), uhel (rad), sirka, strana, vyskaStupne?, naslap?, casti?, barva?}]
            // Sloup stojí na podlaží, označení C1, C2… (Column). strecha: false = nerozšiřuje půdorys střechy.
            sloupy: [],      // [{id, podlazi, x, y (m, y nahoru), sirka (m), tvar: ctverec|kruh, uhel (rad), barva?, strecha?}]
            plochy: [],      // [{id, podlazi, mistnost, typ: zvysena|snizena|bez_podlahy, dh, body:[[x,y] m] = obrys místnosti z rastru, prenos, vypnuto:[id podlaží]}]
            strecha: null,   // {typ, sklon, presah, presahStit, vyskaOkapu, krytina, hrany:{klíč:{typ,sklon,presah}}}
            zaklady: null,   // {odkop, sirkaPasu, spara, skladba, skladbaDeska, ornice, svah, nakypreni, podDum, prodlouzit, casti:{id podlaží: pasy|deska|stavajici}}; co chybí, bere se z Zemina.VYCHOZI
        };
    }

    static normalizujDum(d) {
        const v = StavebniEngine.vychoziDum();
        const podlazi = Array.isArray(d.podlazi) && d.podlazi.length ? d.podlazi : v.podlazi;
        const dum = {
            verze: d.verze || 1,
            aktivni: d.aktivni,
            // Starší ruční kóty jednotlivých podlaží (kotaRucne) se záměrně nepřebírají
            posunVysky: typeof d.posunVysky === 'number' ? d.posunVysky : 0,
            // Starší uložení měla jednu barvu dveří „uvnitř" i pro vnitřní dveře
            barvy: Object.fromEntries(Object.entries(v.barvy).map(([k, b]) => {
                const ulozena = d.barvy?.[k] ?? (k === 'dvereVnitrni' ? d.barvy?.dvereDovnitr : null);
                return [k, /^#[0-9a-fA-F]{6}$/.test(ulozena || '') ? ulozena : b];
            })),
            podlazi: podlazi.map(p => ({
                id: p.id, nazev: p.nazev || p.id, typ: p.typ || 'bezne',
                vyska: typeof p.vyska === 'number' && p.vyska > 0 ? p.vyska : 3.05,
                strop: typeof p.strop === 'number' && p.strop >= 0 ? p.strop : 0.25,
                vlastniNazev: !!p.vlastniNazev,
                data: p.data || null,
            })),
            schodiste: Array.isArray(d.schodiste) ? JSON.parse(JSON.stringify(d.schodiste)) : [],
            sloupy: (Array.isArray(d.sloupy) ? d.sloupy : []).filter(s => s && s.id && podlazi.some(p => p.id === s.podlazi)).map(s => JSON.parse(JSON.stringify(s))),
            // Výšková plocha patří místnosti (mistnost = id záznamu), obrys si bere z rastru. Starší
            // „prostup" je totéž co bez podlahy; volně kreslené plochy bez místnosti (do 3. 11. 2026)
            // se nepřebírají — neměly by ke komu patřit.
            plochy: (Array.isArray(d.plochy) ? d.plochy : [])
                .filter(a => a && a.mistnost)
                .map(a => JSON.parse(JSON.stringify({ ...a, typ: a.typ === 'prostup' ? 'bez_podlahy' : a.typ, body: Array.isArray(a.body) ? a.body : [] }))),
            strecha: d.strecha ? JSON.parse(JSON.stringify(d.strecha)) : null,
            zaklady: d.zaklady ? JSON.parse(JSON.stringify(d.zaklady)) : null,
        };
        if (!dum.podlazi.some(p => p.id === dum.aktivni)) dum.aktivni = dum.podlazi[0].id;
        return dum;
    }

    /** Kopie domu do snímku: data podlaží se jen odkazují (nemění se na místě), zbytek se klonuje. */
    static kopieDumu(d) {
        return {
            verze: d.verze, aktivni: d.aktivni, posunVysky: d.posunVysky || 0, barvy: { ...d.barvy },
            podlazi: d.podlazi.map(p => ({ ...p })),
            schodiste: JSON.parse(JSON.stringify(d.schodiste || [])),
            sloupy: JSON.parse(JSON.stringify(d.sloupy || [])),
            plochy: JSON.parse(JSON.stringify(d.plochy || [])),
            strecha: d.strecha ? JSON.parse(JSON.stringify(d.strecha)) : null,
            zaklady: d.zaklady ? JSON.parse(JSON.stringify(d.zaklady)) : null,
        };
    }

    aktivniPodlazi() {
        return this.dum.podlazi.find(p => p.id === this.dum.aktivni) || this.dum.podlazi[0];
    }

    podlaziPodleId(id) {
        return this.dum.podlazi.find(p => p.id === id) || null;
    }

    /** Podlaží hned pod / nad daným (null = není). */
    podlaziPod(id) {
        const i = this.dum.podlazi.findIndex(p => p.id === id);
        return i > 0 ? this.dum.podlazi[i - 1] : null;
    }

    podlaziNad(id) {
        const i = this.dum.podlazi.findIndex(p => p.id === id);
        return i >= 0 && i < this.dum.podlazi.length - 1 ? this.dum.podlazi[i + 1] : null;
    }

    /** Nejvyšší podlaží — nad ním je střecha. */
    horniPodlazi() {
        return this.dum.podlazi[this.dum.podlazi.length - 1];
    }

    /**
     * Kóty podlah v metrech: ±0,000 je podlaha prvního nadzemního podlaží,
     * ostatní se dopočítají z konstrukčních výšek. Ručně přepsaná kóta platí
     * a výpočet od ní pokračuje dál.
     */
    kotyPodlazi() {
        const pp = this.dum.podlazi;
        const kory = new Map();
        const zaklad = Math.max(0, pp.findIndex(p => p.typ !== 'sklep'));
        kory.set(pp[zaklad].id, this.dum.posunVysky || 0);
        for (let i = zaklad + 1; i < pp.length; i++) {
            kory.set(pp[i].id, kory.get(pp[i - 1].id) + pp[i - 1].vyska);
        }
        for (let i = zaklad - 1; i >= 0; i--) {
            kory.set(pp[i].id, kory.get(pp[i + 1].id) - pp[i].vyska);
        }
        return kory;
    }

    kotaPodlazi(id) {
        return this.kotyPodlazi().get(id) ?? 0;
    }

    /** Světlá výška podlaží = konstrukční výška bez stropu. */
    svetlaVyska(p = this.aktivniPodlazi()) {
        return Math.max(0.5, (p?.vyska ?? 3.05) - (p?.strop ?? 0.25));
    }

    /**
     * Výška stěny v metrech: vlastní, jinak typ (zídka, plot), jinak světlá výška
     * podlaží. Na tomhle se 3D a strop otvoru shodnou na jednom místě.
     */
    vyskaSteny(wall, p = this.aktivniPodlazi()) {
        if (typeof wall?.vyska === 'number' && wall.vyska > 0) return wall.vyska;
        return TYPY_STEN[wall?.typ]?.vyska?.default || this.svetlaVyska(p);
    }

    /** JSON kresby podlaží: aktivní z enginu, ostatní z uloženého. */
    jsonPodlazi(id) {
        if (id === this.dum.aktivni) return this._jsonPodlazi();
        return this.podlaziPodleId(id)?.data || { steny: [], otvory: [] };
    }

    /** Engine podlaží JEN PRO ČTENÍ. Aktivní je tenhle; ostatní se staví jednou na objekt dat. */
    enginePodlazi(id) {
        if (id === this.dum.aktivni) return this;
        const data = this.podlaziPodleId(id)?.data;
        if (!data) return null;
        let eng = this._tmpEnginy.get(data);
        if (!eng) {
            eng = new StavebniEngine({ pxPerM: this.PX_PER_M });
            eng.fromJSON(data, { zachovatDum: true });
            this._tmpEnginy.set(data, eng);
        }
        return eng;
    }

    /** Přepne aktivní podlaží: kresba se odloží do domu, nová se načte. */
    prepniPodlazi(id) {
        const cil = this.podlaziPodleId(id);
        if (!cil || id === this.dum.aktivni) return false;
        const data = cil.data || { steny: [], otvory: [] };
        this.aktivniPodlazi().data = this._jsonPodlazi();
        cil.data = null;
        this.dum.aktivni = id;
        this.fromJSON(data, { zachovatDum: true });
        return true;
    }

    /**
     * Přidá podlaží a přepne na něj.
     * @param {'nahoru'|'sklep'|'podkrovi'} kam
     * @param {{kopie?: boolean}} nast  kopie = převzít obvodové a nosné stěny sousedního podlaží
     */
    pridejPodlazi(kam, nast = {}) {
        const pp = this.dum.podlazi;
        if (kam === 'podkrovi' && pp.some(p => p.typ === 'podkrovi')) return null;
        let n = 1;
        while (pp.some(p => p.id === 'P' + n)) n++;
        const dolu = kam === 'sklep';
        const indexPodkrovi = pp.findIndex(p => p.typ === 'podkrovi');
        const index = dolu ? 0 : (kam === 'nahoru' && indexPodkrovi >= 0 ? indexPodkrovi : pp.length);
        const zdroj = dolu ? pp[0] : pp[index - 1];
        const vychozi = { sklep: { vyska: 2.7, strop: 0.25 }, podkrovi: { vyska: 3.2, strop: 0.2 }, nahoru: { vyska: zdroj?.vyska ?? 3.05, strop: zdroj?.strop ?? 0.25 } }[kam];
        const nove = {
            id: 'P' + n, nazev: '', typ: kam === 'nahoru' ? 'bezne' : kam,
            vyska: vychozi.vyska, strop: vychozi.strop, vlastniNazev: false,
            data: nast.kopie === false ? { steny: [], otvory: [] } : this._kopieNosnych(zdroj.id),
        };
        pp.splice(index, 0, nove);
        this.prejmenujPodlazi();
        this.prepniPodlazi(nove.id);
        return nove;
    }

    /** Kopie obvodových a nosných stěn podlaží (bez otvorů a vazeb na vynechané stěny). */
    _kopieNosnych(id) {
        const json = this.jsonPodlazi(id);
        const steny = (json.steny || []).filter(s => s.typ === 'obvodova' || s.typ === 'nosna');
        const zustava = new Set(steny.map(s => s.id));
        const vazba = (c) => (c && zustava.has(c.host) ? c : undefined);
        return {
            steny: steny.map(s => {
                const k = { id: s.id, od: s.od, do: s.do, tloustka: s.tloustka, typ: s.typ };
                const o = vazba(s.od_constraint), d = vazba(s.do_constraint);
                if (o) k.od_constraint = o;
                if (d) k.do_constraint = d;
                return k;
            }),
            otvory: [],
        };
    }

    smazPodlazi(id) {
        const pp = this.dum.podlazi;
        if (pp.length < 2 || !this.podlaziPodleId(id)) return false;
        if (id === this.dum.aktivni) this.prepniPodlazi((this.podlaziPod(id) || this.podlaziNad(id)).id);
        this.dum.podlazi = pp.filter(p => p.id !== id);
        this.dum.schodiste = this.dum.schodiste.filter(s => s.odPodlazi !== id && s.doPodlazi !== id);
        this.dum.plochy = this.dum.plochy.filter(p => p.podlazi !== id);
        this.dum.sloupy = (this.dum.sloupy || []).filter(s => s.podlazi !== id);
        this.dum.schodiste = this.dum.schodiste.filter(s => !s.plocha || this.dum.plochy.some(p => p.id === s.plocha));
        this.prejmenujPodlazi();
        return true;
    }

    /** Automatické názvy podle jazyka: 1.PP, 1.NP, 2.NP…, Podkroví. Ručně přejmenované se nemění. */
    prejmenujPodlazi() {
        const pp = this.dum.podlazi;
        const zaklad = Math.max(0, pp.findIndex(p => p.typ !== 'sklep'));
        pp.forEach((p, i) => {
            if (p.vlastniNazev) return;
            if (p.typ === 'podkrovi') p.nazev = autoNazevPodlazi('podkrovi');
            else if (i < zaklad) p.nazev = autoNazevPodlazi('sklep', zaklad - i);
            else p.nazev = autoNazevPodlazi('bezne', i - zaklad);
        });
    }

    /**
     * Přepočítá JSON kresby podlaží bodovou funkcí (px plátna → px plátna). Vrací NOVÝ
     * objekt — uložená data se nemění na místě, snímky Zpět na ně odkazují.
     * @param {number} deg  o kolik se dům otáčí (informativní úhel vybavení)
     */
    _prevedData(data, f, deg = 0) {
        const PX = this.PX_PER_M;
        const m = (p) => { const q = f({ x: p[0] * PX, y: -p[1] * PX }); return [q.x / PX, -q.y / PX]; };
        const o = { ...data };
        o.steny = (data.steny || []).map(s => ({ ...s, od: m(s.od), do: m(s.do) }));
        o.oddelovace = (data.oddelovace || []).map(r => {
            const k = (e) => { const [x, y] = m([e.x, e.y]); return { ...e, x, y }; };
            return { ...r, a: k(r.a), b: k(r.b) };
        });
        o.mistnosti = (data.mistnosti || []).map(r => ({ ...r, kotva: m(r.kotva) }));
        o.vybaveni = (data.vybaveni || []).map(v => ({
            ...v,
            stred: v.stred ? m(v.stred) : v.stred,
            polygon: Array.isArray(v.polygon) ? v.polygon.map(m) : v.polygon,
            uhel: (v.uhel || 0) + deg,
        }));
        // Starší projekty: prostory z importu se převedou na místnosti až při načtení podlaží, do té doby se posouvají s domem
        if (data.prostory) o.prostory = data.prostory.map(p => ({
            ...p,
            vertices: (p.vertices || []).map(v => {
                const n = { ...v };
                if (typeof v.x === 'number' && typeof v.y === 'number') { const q = f({ x: v.x, y: v.y }); n.x = q.x; n.y = q.y; }
                if (typeof v.fallbackX === 'number' && typeof v.fallbackY === 'number') { const q = f({ x: v.fallbackX, y: v.fallbackY }); n.fallbackX = q.x; n.fallbackY = q.y; }
                return n;
            }),
        }));
        return o;
    }

    /** Přepočítá uložená podlaží (kromě aktivního) — dům se hýbe jako celek. */
    transformujOstatniPodlazi(f, deg = 0) {
        for (const p of this.dum.podlazi) {
            if (p.id !== this.dum.aktivni && p.data) p.data = this._prevedData(p.data, f, deg);
        }
    }

    /** Přepočítá objekty domu (schody, sloupy, výškové plochy) — souřadnice m, y nahoru. */
    transformujObjektyDomu(f, rad = 0) {
        const PX = this.PX_PER_M;
        const m = (x, y) => { const q = f({ x: x * PX, y: -y * PX }); return [q.x / PX, -q.y / PX]; };
        for (const s of this.dum.schodiste) {
            [s.x, s.y] = m(s.x, s.y);
            s.uhel = (s.uhel || 0) + rad;
        }
        for (const s of this.dum.sloupy || []) {
            [s.x, s.y] = m(s.x, s.y);
            s.uhel = (s.uhel || 0) + rad;
        }
        for (const p of this.dum.plochy) p.body = p.body.map(b => m(b[0], b[1]));
    }

    /** Kotvy místností a volné konce oddělovačů aktivního podlaží (stěny hýbe volající). */
    transformujDoplnkyAktivniho(f) {
        for (const m of this.mistnosti) m.kotva = f(m.kotva);
        for (const o of this.oddelovace.values()) {
            for (const k of [o.a, o.b]) {
                if (k.host) continue;
                const q = f({ x: k.x, y: k.y });
                k.x = q.x; k.y = q.y;
            }
        }
    }

    /** Otisk geometrie aktivního podlaží — přepočty (rastr, kontroly) jen po jeho změně. */
    geoPodpis() {
        const c = [];
        for (const w of this.walls.values()) {
            const a = this.nodes.get(w.nodeA), b = this.nodes.get(w.nodeB);
            if (!a || !b) continue;
            c.push(w.id, a.x.toFixed(1), a.y.toFixed(1), b.x.toFixed(1), b.y.toFixed(1), w.tloustka, w.typ);
        }
        for (const o of this.oddelovace.values()) {
            const a = this.bodKonceOddelovace(o.a), b = this.bodKonceOddelovace(o.b);
            c.push(a.x.toFixed(1), a.y.toFixed(1), b.x.toFixed(1), b.y.toFixed(1));
        }
        return c.join('|');
    }

    /** Podlaží pod aktivním s engine pro čtení, nebo null. */
    spodekAktivniho() {
        const p = this.podlaziPod(this.dum.aktivni);
        const eng = p ? this.enginePodlazi(p.id) : null;
        return eng ? { podlazi: p, engine: eng } : null;
    }

    /** Přichycení na roh, pak na osu stěny spodního podlaží (plot a zídka se nepočítají). */
    magnetSpodku(x, y, dosah) {
        const s = this.spodekAktivniho();
        if (!s || !(dosah > 0)) return null;
        let nej = null, nejD = dosah;
        const nosne = [...s.engine.walls.values()].filter(w => TYPY_STEN[w.typ]?.kategorie !== 'exterior');
        for (const w of nosne) {
            for (const id of [w.nodeA, w.nodeB]) {
                const n = s.engine.nodes.get(id);
                if (!n) continue;
                const d = Math.hypot(n.x - x, n.y - y);
                if (d < nejD) { nejD = d; nej = { x: n.x, y: n.y }; }
            }
        }
        if (nej) return nej;
        nejD = dosah * 0.6;   // na osu slaběji, ať nepřebíjí volné kreslení podél stěny
        for (const w of nosne) {
            const a = s.engine.nodes.get(w.nodeA), b = s.engine.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
            if (!L2) continue;
            const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
            if (t < 0 || t > 1) continue;
            const px = a.x + dx * t, py = a.y + dy * t;
            const d = Math.hypot(px - x, py - y);
            if (d < nejD) { nejD = d; nej = { x: px, y: py, cara: { a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } } }; }
        }
        return nej;
    }

    /**
     * Přichycení celé stěny při tažení na stěnu podlaží pod ní: na osu, nebo na líc
     * (tenčí stěna v patře lícuje s tou dole). Jen rovnoběžné stěny, které se s taženou
     * podél překrývají. Vrací dorovnání posunu {x, y} kolmo na stěnu a čáru pro náhled.
     * @param {number} posunX, posunY  posun, který by stěna dostala bez magnetu
     */
    magnetSteny(wallId, posunX, posunY, dosah) {
        const s = this.spodekAktivniho();
        const w = this.walls.get(wallId);
        const a = w && this.nodes.get(w.nodeA), b = w && this.nodes.get(w.nodeB);
        if (!s || !a || !b || !(dosah > 0)) return null;
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        if (L < 1) return null;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L, nx = -uy, ny = ux;
        const poloha = (a.x + posunX) * nx + (a.y + posunY) * ny;
        const od = (a.x + posunX) * ux + (a.y + posunY) * uy, po = od + L;
        const pul = (w.tloustka * this.PX_PER_M) / 2;
        let nej = null, nejD = dosah;
        for (const dole of s.engine.walls.values()) {
            if (TYPY_STEN[dole.typ]?.kategorie === 'exterior') continue;
            const p = s.engine.nodes.get(dole.nodeA), q = s.engine.nodes.get(dole.nodeB);
            if (!p || !q) continue;
            const M = Math.hypot(q.x - p.x, q.y - p.y);
            if (M < 1 || Math.abs(ux * (q.y - p.y) - uy * (q.x - p.x)) / M > MAX_ODCHYLKA_ROVNOBEZNE) continue;
            const s0 = p.x * ux + p.y * uy, s1 = q.x * ux + q.y * uy;
            if (Math.min(po, Math.max(s0, s1)) - Math.max(od, Math.min(s0, s1)) <= 0) continue;
            const osa = ((p.x + q.x) / 2) * nx + ((p.y + q.y) / 2) * ny;
            const rozdil = (dole.tloustka * this.PX_PER_M) / 2 - pul;
            for (const cil of rozdil ? [osa, osa + rozdil, osa - rozdil] : [osa]) {
                const d = Math.abs(cil - poloha);
                if (d >= nejD) continue;
                nejD = d;
                const k = cil - osa;
                nej = { x: nx * (cil - poloha), y: ny * (cil - poloha), cara: { a: { x: p.x + nx * k, y: p.y + ny * k }, b: { x: q.x + nx * k, y: q.y + ny * k } } };
            }
        }
        return nej;
    }

    /** Nosná nebo obvodová stěna spodního podlaží, na jejíž ose stěna leží (nejvýš 2 cm vedle, aspoň půlkou délky). */
    stenaPodStenou(wallId) {
        const s = this.spodekAktivniho();
        const w = this.walls.get(wallId);
        const a = w && this.nodes.get(w.nodeA), b = w && this.nodes.get(w.nodeB);
        if (!s || !a || !b) return null;
        const L = Math.hypot(b.x - a.x, b.y - a.y);
        if (L < 1) return null;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const tolerance = 0.02 * this.PX_PER_M;
        const od = a.x * ux + a.y * uy, po = od + L;
        let pokryto = 0, nej = null, nejDelka = 0;
        for (const dole of s.engine.walls.values()) {
            if (dole.typ !== 'obvodova' && dole.typ !== 'nosna') continue;
            const p = s.engine.nodes.get(dole.nodeA), q = s.engine.nodes.get(dole.nodeB);
            if (!p || !q) continue;
            const M = Math.hypot(q.x - p.x, q.y - p.y);
            if (M < 1 || Math.abs(ux * (q.y - p.y) - uy * (q.x - p.x)) / M > MAX_ODCHYLKA_ROVNOBEZNE) continue;
            if (Math.abs((p.x - mx) * -uy + (p.y - my) * ux) > tolerance) continue;
            const s0 = p.x * ux + p.y * uy, s1 = q.x * ux + q.y * uy;
            const delka = Math.min(po, Math.max(s0, s1)) - Math.max(od, Math.min(s0, s1));
            if (delka <= 0) continue;
            pokryto += delka;
            if (delka > nejDelka) { nejDelka = delka; nej = dole; }
        }
        return pokryto >= L / 2 ? nej : null;
    }

    // ─── NODES ─────────────────────────────────────────
    addNode(x, y) {
        // Pokud existuje blízký node, vrať ho
        for (const node of this.nodes.values()) {
            if (Math.hypot(x - node.x, y - node.y) >= this.MAGNET_DIST) continue;
            // …ale ne přes zeď. U tenké příčky je protější líc blíž než dosah
            // magnetu, takže nová stěna na druhé straně hostitele se jinak
            // slepí s uzlem té první a vznikne „X", které ve skutečnosti
            // sdílí jeden bod uprostřed zdi.
            if (this.naOpacnychLicich({ x, y }, node)) continue;

            return node;
        }
        const id = this._id('N');
        const node = { id, x, y };
        this.nodes.set(id, node);
        return node;
    }

    moveNode(nodeId, x, y) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        node.x = this.snapToGrid(x);
        node.y = this.snapToGrid(y);
    }

    getNodeWalls(nodeId) {
        const walls = [];
        for (const wall of this.walls.values()) {
            if (wall.nodeA === nodeId || wall.nodeB === nodeId) {
                walls.push(wall);
            }
        }
        return walls;
    }

    /**
     * Vodicí úsečka napojení „I" — čelo hostitelské stěny v jejím konci.
     *
     * Dvě souosé stěny různé tloušťky se v praxi obvykle nelícují osou, ale
     * jednou stranou. Tenčí stěna proto nesdílí uzel, ale klouže po čele
     * tlustší — jako dítě u T, jen vodicí čára je kolmá na konci hostitele.
     * Úsečka je zkrácená o polovinu tloušťky napojené stěny, takže její krajní
     * body jsou PŘESNĚ lícování s jednou a druhou stranou hostitele.
     *
     * @param {string} hostId  hostitelská (tlustší) stěna
     * @param {'A'|'B'} konec  u kterého konce hostitele se napojuje
     * @param {number} tloustkaDitete  tloušťka napojené stěny (m)
     */
    celoHostitele(hostId, konec, tloustkaDitete = 0) {
        const host = this.walls.get(hostId);
        if (!host) return null;
        const ha = this.nodes.get(host.nodeA);
        const hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return null;
        const uzel = konec === 'A' ? ha : hb;
        const dx = hb.x - ha.x, dy = hb.y - ha.y;
        const L = Math.hypot(dx, dy);
        if (!L) return null;
        const kolmiceX = -dy / L, kolmiceY = dx / L;
        // Směr ven ze stěny — od druhého konce k tomuhle.
        const venX = (konec === 'A' ? -dx : dx) / L;
        const venY = (konec === 'A' ? -dy : dy) / L;

        // V rohu stěna fyzicky končí až na vnějším líci souseda. Spojovací uzel
        // ale leží v průsečíku OS, tedy uprostřed souseda — kdyby čelo zůstalo
        // tam, napojená stěna by skončila půlkou souseda uvnitř rohu, opticky
        // „na střed" místo na okraj. Posuneme ho proto ven o polovinu tloušťky
        // souseda. U volného konce (prosté napojení „I") žádný soused není
        // a čelo zůstává v uzlu.
        const soused = this.sousedVCele(hostId, konec);
        const posunVen = soused ? (soused.tloustka || 0) / 2 * this.PX_PER_M : 0;
        const stred = { x: uzel.x + venX * posunVen, y: uzel.y + venY * posunVen };

        // Rozsah posunu = rozdíl polotloušťek. V absolutní hodnotě, aby šlo
        // napojit i tlustší stěnu na tenčí (pak čelo hostitele leží v čele dítěte).
        const dosah = Math.abs(((host.tloustka || 0) - (tloustkaDitete || 0)) / 2) * this.PX_PER_M;
        const a = { x: stred.x - kolmiceX * dosah, y: stred.y - kolmiceY * dosah };
        const b = { x: stred.x + kolmiceX * dosah, y: stred.y + kolmiceY * dosah };

        // Pro kreslení se čára vede přes CELOU tloušťku hostitele, ať je čelo
        // vidět i tam, kde je dosah posunu jen pár centimetrů. Přichytit se dá
        // pořád jen na úsek a–b, ten se vykresluje zvlášť.
        const poloHost = (host.tloustka || 0) / 2 * this.PX_PER_M;
        return {
            stred,
            kolmice: { x: kolmiceX, y: kolmiceY },
            dosah,
            a, b,
            jeRoh: !!soused,
            zobrazA: { x: stred.x - kolmiceX * poloHost, y: stred.y - kolmiceY * poloHost },
            zobrazB: { x: stred.x + kolmiceX * poloHost, y: stred.y + kolmiceY * poloHost },
        };
    }

    /**
     * Stěna, která se s hostitelem potkává v jeho čele a dělá z něj roh.
     *
     * Souosé pokračování roh nedělá — hledá se soused, který z uzlu odbočuje do
     * strany. Je-li jich víc, vítězí ten nejkolmější. Vrací null u volného konce.
     *
     * @returns {?Object} stěna souseda, nebo null
     */
    sousedVCele(hostId, konec) {
        const host = this.walls.get(hostId);
        if (!host) return null;
        const uzelId = konec === 'A' ? host.nodeA : host.nodeB;
        const uzel = this.nodes.get(uzelId);
        const ha = this.nodes.get(host.nodeA), hb = this.nodes.get(host.nodeB);
        if (!uzel || !ha || !hb) return null;
        const dx = hb.x - ha.x, dy = hb.y - ha.y;
        const L = Math.hypot(dx, dy) || 1;
        const kx = -dy / L, ky = dx / L;
        let nej = null;
        for (const soused of this.getNodeWalls(uzelId)) {
            if (soused.id === host.id) continue;
            const druhyId = soused.nodeA === uzelId ? soused.nodeB : soused.nodeA;
            const druhy = this.nodes.get(druhyId);
            if (!druhy) continue;
            const sL = Math.hypot(druhy.x - uzel.x, druhy.y - uzel.y) || 1;
            const odklon = ((druhy.x - uzel.x) * kx + (druhy.y - uzel.y) * ky) / sL;
            if (Math.abs(odklon) < 0.08) continue;   // souosé pokračování
            if (!nej || Math.abs(odklon) > Math.abs(nej.odklon)) nej = { wall: soused, odklon };
        }
        return nej ? nej.wall : null;
    }

    /**
     * Na kterou stranu čela hostitele padne „vnější" líc rohu.
     *
     * Vnější strana je ta odvrácená od směru, kterým soused z rohu vede — po té
     * pokračuje obvodová čára dál. Bez souseda vrací 0 = roh tam není.
     *
     * @returns {number} -1 / +1 podle strany, 0 když to není roh
     */
    vnejsiStranaCela(hostId, konec, kolmice) {
        const host = this.walls.get(hostId);
        const soused = this.sousedVCele(hostId, konec);
        if (!host || !soused) return 0;
        const uzelId = konec === 'A' ? host.nodeA : host.nodeB;
        const uzel = this.nodes.get(uzelId);
        const druhyId = soused.nodeA === uzelId ? soused.nodeB : soused.nodeA;
        const druhy = this.nodes.get(druhyId);
        if (!uzel || !druhy) return 0;
        const smer = (druhy.x - uzel.x) * kolmice.x + (druhy.y - uzel.y) * kolmice.y;
        return Math.abs(smer) > 0.01 ? -Math.sign(smer) : 0;
    }

    /**
     * Stěna napojená „I" na čelo hostitele musí v rohu končit na jeho VNĚJŠÍ
     * hraně, ne v průsečíku os.
     *
     * Dřív se sázela do spojovacího uzlu, který leží uprostřed souseda, takže
     * zasahovala půlkou souseda dovnitř rohu. V uložených konceptech tam takhle
     * zůstala — při načtení ji proto posadíme na hranu. Posun po čele (na který
     * líc) si drží.
     *
     * @returns {number} kolik stěn se srovnalo
     */
    srovnejCelaNaRoh() {
        let opraveno = 0;
        for (const w of this.walls.values()) {
            for (const kde of ['odConstraint', 'doConstraint']) {
                const c = w[kde];
                if (!c || !c.konec) continue;
                const celo = this.celoHostitele(c.host, c.konec, w.tloustka);
                if (!celo) continue;
                const uzel = this.nodes.get(kde === 'odConstraint' ? w.nodeA : w.nodeB);
                if (!uzel) continue;
                // Pojistka: srovnání je dorovnání o pár centimetrů, ne skok.
                // Když konec u čela vůbec neleží, je vazba rozbitá (řeší ji
                // opravVisiciVazby) a tady se nesmí přesouvat nic.
                const stavVazbyCela = this.stavVazby(w, kde);
                if (stavVazbyCela && !stavVazbyCela.drzi) continue;
                // podél čela zůstat (jen ořezat na dosah), kolmo sednout na jeho rovinu
                const u = (uzel.x - celo.stred.x) * celo.kolmice.x
                        + (uzel.y - celo.stred.y) * celo.kolmice.y;
                const uOrez = Math.max(-celo.dosah, Math.min(celo.dosah, u));
                const nx = celo.stred.x + celo.kolmice.x * uOrez;
                const ny = celo.stred.y + celo.kolmice.y * uOrez;
                if (Math.hypot(nx - uzel.x, ny - uzel.y) > 0.01) {
                    uzel.x = nx; uzel.y = ny;
                    opraveno++;
                }
            }
        }
        return opraveno;
    }

    /**
     * Příčka napojená na stěnu nesmí končit na opačném líci, než kam míří její
     * tělo — tam by procházela skrz hostitele.
     *
     * Vznikalo to překlápěním v srovnejPraveUhly() (znaménko odsazení záviselo
     * na směru zápisu hostitele, A→B). Chyba je opravená, ale v uložených
     * konceptech ty překlopené příčky zůstaly, tak je při načtení srovnáme zpět
     * na bližší líc. Konec v ose hostitele (střih) se nechává být.
     *
     * @returns {number} kolik příček se srovnalo
     */
    srovnejPrickyNaLic() {
        let opraveno = 0;
        for (const w of this.walls.values()) {
            for (const kde of ['odConstraint', 'doConstraint']) {
                const c = w[kde];
                if (!c || c.konec) continue;
                const host = this.walls.get(c.host);
                if (!host) continue;
                const ha = this.nodes.get(host.nodeA), hb = this.nodes.get(host.nodeB);
                const uzel = this.nodes.get(kde === 'odConstraint' ? w.nodeA : w.nodeB);
                const daleky = this.nodes.get(kde === 'odConstraint' ? w.nodeB : w.nodeA);
                if (!ha || !hb || !uzel || !daleky) continue;
                const dx = hb.x - ha.x, dy = hb.y - ha.y;
                const L = Math.hypot(dx, dy);
                if (!L) continue;
                const odsazeni = (p) => ((p.x - ha.x) * (-dy) + (p.y - ha.y) * dx) / L;
                const uKonce = odsazeni(uzel), uTela = odsazeni(daleky);
                if (Math.abs(uTela) < 0.5) continue;        // tělo leží v ose hostitele — neřešitelné
                if (Math.abs(uKonce) < 0.5) continue;       // konec na ose = střih, je v pořádku
                if (Math.sign(uKonce) === Math.sign(uTela)) continue;   // už je na správné straně
                uzel.x += (-dy / L) * (-2 * uKonce);
                uzel.y += (dx / L) * (-2 * uKonce);
                opraveno++;
            }
        }
        return opraveno;
    }

    /**
     * Odemkne napojení „I" v daném uzlu. Obal nad _zaridCeloNapojeni(), aby
     * výpočet spoje byl na jednom místě. Poloha se nemění, jen se odemkne posun.
     */
    oddelCeloNapojeni(nodeId, toleranceDeg = 5) {
        for (const stena of this.getNodeWalls(nodeId)) {
            const konec = stena.nodeA === nodeId ? 'A' : 'B';
            if (this._zaridCeloNapojeni(stena, konec, toleranceDeg)) return true;
        }
        return false;
    }

    /**
     * Projde konce všech stěn a u napojení „I" se změnou tloušťky zařídí
     * klouzavé uložení po čele.
     *
     * Jde přes konce stěn (ne přes uzly), aby to zabralo ve všech podobách,
     * v jakých spoj v datech bývá: sdílený uzel, vlastní uzel bez vazby i
     * stará vazba na OSU hostitele z importu. Ta poslední je důvod, proč se
     * u starších konceptů posun po čele vůbec nenabízel.
     */
    oddelVsechnaCelaNapojeni(toleranceDeg = 5) {
        let pocet = 0;
        for (const stena of [...this.walls.values()]) {
            for (const konec of ['A', 'B']) {
                if (this._zaridCeloNapojeni(stena, konec, toleranceDeg)) pocet++;
            }
        }
        return pocet;
    }

    /** Jeden konec jedné stěny — viz oddelVsechnaCelaNapojeni(). */
    _zaridCeloNapojeni(stena, konecSteny, toleranceDeg = 5) {
        const uzelId = konecSteny === 'A' ? stena.nodeA : stena.nodeB;
        const uzel = this.nodes.get(uzelId);
        if (!uzel) return false;
        const vazba = konecSteny === 'A' ? stena.odConstraint : stena.doConstraint;
        if (vazba && vazba.konec) return false;              // už je po čele

        const druhyId = konecSteny === 'A' ? stena.nodeB : stena.nodeA;
        const druhy = this.nodes.get(druhyId);
        if (!druhy) return false;
        const smerVen = Math.atan2(druhy.y - uzel.y, druhy.x - uzel.x) * 180 / Math.PI;

        let host = null, konecHost = null;
        for (const h of this.walls.values()) {
            if (h.id === stena.id) continue;
            if ((h.tloustka || 0) <= (stena.tloustka || 0) + 0.001) continue;   // hostitel musí být tlustší
            for (const konec of ['A', 'B']) {
                const hUzel = this.nodes.get(konec === 'A' ? h.nodeA : h.nodeB);
                if (!hUzel) continue;
                if (Math.hypot(hUzel.x - uzel.x, hUzel.y - uzel.y) > this.MAGNET_DIST) continue;
                const protiUzel = this.nodes.get(konec === 'A' ? h.nodeB : h.nodeA);
                if (!protiUzel) continue;
                const smerHost = Math.atan2(protiUzel.y - hUzel.y, protiUzel.x - hUzel.x) * 180 / Math.PI;
                // Souosé pokračování = obě stěny vedou od spoje opačným směrem
                const rozdil = Math.abs(((smerVen - smerHost + 540) % 360) - 180);
                if (Math.abs(rozdil - 180) > toleranceDeg) continue;
                host = h; konecHost = konec;
                break;
            }
            if (host) break;
        }
        if (!host) return false;

        // Sdílený uzel rozdělit — tenčí stěna musí mít svůj, aby šla posunout
        if (this.getNodeWalls(uzelId).length > 1) {
            const novy = { id: this._id('N'), x: uzel.x, y: uzel.y };
            this.nodes.set(novy.id, novy);
            if (konecSteny === 'A') stena.nodeA = novy.id; else stena.nodeB = novy.id;
        }
        const nova = { host: host.id, konec: konecHost };
        if (konecSteny === 'A') stena.odConstraint = nova; else stena.doConstraint = nova;
        return true;
    }

    /**
     * Najít všechny stěny (T-children) co mají constraint na danou stěnu.
     * Používá se při pohybu hostitele — propaguje pohyb na děti.
     */
    getTChildren(hostWallId) {
        const children = [];
        for (const w of this.walls.values()) {
            if (w.odConstraint && w.odConstraint.host === hostWallId) {
                children.push({ wall: w, end: 'a', t: w.odConstraint.t });
            }
            if (w.doConstraint && w.doConstraint.host === hostWallId) {
                children.push({ wall: w, end: 'b', t: w.doConstraint.t });
            }
        }
        return children;
    }

    /**
     * Před pohybem hostitelské stěny synchronizuj t parametry T-children
     * tak, aby odpovídaly jejich SKUTEČNÉ pozici. Tím propagateTChildren
     * po pohybu hostitele jen přesune děti o stejnou translaci, ne na
     * stored (potenciálně zastaralé) t.
     */
    syncTChildrenT(hostWallId) {
        const host = this.walls.get(hostWallId);
        if (!host) return;
        const ha = this.nodes.get(host.nodeA);
        const hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return;
        const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
        const L2 = hdx * hdx + hdy * hdy;
        if (L2 === 0) return;
        // Uložené t smí ven z 0,02–0,98 tolik, kolik přesahuje líc (vnější roh) —
        // pevná mez by dítě dorazené do rohu při pohybu hostitele odsunula.
        const lic = this.rozsahLice(hostWallId);
        const omez = (t) => Math.max(Math.min(0.02, lic.od), Math.min(Math.max(0.98, lic.do), t));
        for (const w of this.walls.values()) {
            // Napojení na čelo (I) nemá t — drží se konce hostitele, nepřepočítává se
            if (w.odConstraint && w.odConstraint.host === hostWallId && !w.odConstraint.konec) {
                const node = this.nodes.get(w.nodeA);
                if (node) {
                    const t = ((node.x - ha.x) * hdx + (node.y - ha.y) * hdy) / L2;
                    w.odConstraint.t = omez(t);
                }
            }
            if (w.doConstraint && w.doConstraint.host === hostWallId && !w.doConstraint.konec) {
                const node = this.nodes.get(w.nodeB);
                if (node) {
                    const t = ((node.x - ha.x) * hdx + (node.y - ha.y) * hdy) / L2;
                    w.doConstraint.t = omez(t);
                }
            }
        }
    }

    /**
     * Po pohybu hostitelské stěny posuň T-children.
     * Pro KAŽDÉ dítě:
     *  - napojený endpoint → přepočítá se na nové pozici hostitele (t zachován)
     *  - druhý endpoint:
     *    - má constraint na JINÉHO hostitele → zůstane (ten hostitel se nehnul)
     *      → dítě se prodlouží/zkrátí
     *    - je volný → translatuje se o delta → dítě zachová tvar
     */
    propagateTChildren(hostWallId, dx, dy) {
        const host = this.walls.get(hostWallId);
        if (!host) return;
        const children = this.getTChildren(hostWallId);
        this._vezOddelovace(hostWallId, dx, dy);
        const moved = new Set();
        // Pokud známe delta pohybu hostitele, translatujeme T-children o stejnou
        // hodnotu (zachovává kolmé odsazení od osy hostitele).
        // Bez delty: dítě položíme na t-pozici, ale kolmé odsazení mu necháme —
        // stěna napojená na líc hostitele na líci zůstane.
        const haveDelta = (typeof dx === 'number' && typeof dy === 'number');
        const ha = this.nodes.get(host.nodeA);
        const hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return;
        const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
        for (const ch of children) {
            const attachedNodeId = ch.end === 'a' ? ch.wall.nodeA : ch.wall.nodeB;
            const attachedNode = this.nodes.get(attachedNodeId);
            if (!attachedNode) continue;
            let deltaX, deltaY;
            const jeCelo = !!(ch.end === 'a' ? ch.wall.odConstraint?.konec : ch.wall.doConstraint?.konec);
            if (haveDelta) {
                deltaX = dx;
                deltaY = dy;
            } else if (jeCelo) {
                continue;   // bez delty neumíme čelo dopočítat; zůstane, kde je
            } else {
                const hL = Math.hypot(hdx, hdy) || 1;
                const odsazeni = ((attachedNode.x - ha.x) * (-hdy) + (attachedNode.y - ha.y) * hdx) / hL;
                const newX = ha.x + ch.t * hdx + (-hdy / hL) * odsazeni;
                const newY = ha.y + ch.t * hdy + (hdx / hL) * odsazeni;
                deltaX = newX - attachedNode.x;
                deltaY = newY - attachedNode.y;
            }
            if (!moved.has(attachedNodeId)) {
                attachedNode.x += deltaX;
                attachedNode.y += deltaY;
                moved.add(attachedNodeId);
            }
            // Druhý endpoint dítěte
            const otherNodeId = ch.end === 'a' ? ch.wall.nodeB : ch.wall.nodeA;
            const otherNode = this.nodes.get(otherNodeId);
            if (!otherNode || moved.has(otherNodeId)) continue;
            const otherConstraint = ch.end === 'a' ? ch.wall.doConstraint : ch.wall.odConstraint;
            if (otherConstraint && otherConstraint.host !== hostWallId) {
                // Jiný hostitel — zůstane (ten hostitel se nehnul) → dítě se prodlouží
                continue;
            }
            // Sdílený node s jinými stěnami (L-corner, X-junction) → zůstane,
            // jinak bychom táhli i další stěny. Dítě se prodlouží/rotuje.
            const otherWallsAtNode = this.getNodeWalls(otherNodeId);
            if (otherWallsAtNode.length > 1) {
                continue;
            }
            // Opravdu volný konec (jen jedna stěna) — translatovat o delta → rigidní
            otherNode.x += deltaX;
            otherNode.y += deltaY;
            moved.add(otherNodeId);
        }
    }

    /**
     * Leží dva body na OPAČNÝCH lících téže stěny?
     *
     * Na křížení (X) visí z každé strany hostitele jedna příčka a jejich konce
     * dělí jen tloušťka zdi — u 14cm příčky 14 px, tedy míň než dosah magnetu
     * uzlů (16 px). Puštěný konec se proto slučoval s uzlem na protějším líci
     * a příčka přeskočila na druhou stranu zdi (Kováčová, W106).
     *
     * Body musí oba ležet v pásu té stěny a každý na jiné straně její osy —
     * jinak o žádné „přeskočení přes zeď" nejde.
     *
     * @returns {boolean}
     */
    naOpacnychLicich(p1, p2) {
        for (const w of this.walls.values()) {
            const a = this.nodes.get(w.nodeA);
            const b = this.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const L = Math.hypot(dx, dy);
            if (L < 1e-6) continue;

            const pul = (w.tloustka || 0) * this.PX_PER_M / 2;
            if (pul <= 0) continue;
            // Tažený konec ještě nemusí na líci přesně sedět, proto se počítá
            // s vůlí o půl dosahu magnetu. Bez ní test u tenké zdi neplatil:
            // 14cm příčka má při 80 px/m líc jen 5,6 px od osy.
            const okraj = pul + this.MAGNET_DIST / 2;
            const prah = pul / 3;           // blíž k ose = bod na líci neleží

            const strany = [p1, p2].map((p) => {
                const podel = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (L * L);
                if (podel < -0.02 || podel > 1.02) return null;      // mimo stěnu
                return ((p.x - a.x) * -dy + (p.y - a.y) * dx) / L;
            });
            if (strany[0] === null || strany[1] === null) continue;
            if (Math.abs(strany[0]) > okraj || Math.abs(strany[1]) > okraj) continue;
            if (Math.abs(strany[0]) < prah || Math.abs(strany[1]) < prah) continue;
            if ((strany[0] > 0) !== (strany[1] > 0)) return true;
        }

        return false;
    }

    /**
     * Najít blízkou stěnu pro snap kandidát.
     * Vrátí { wall, t, point } pro nejbližší T-junction kandidát v dosahu,
     * nebo null. Vyloučí stěny obsahující excludeNodeId.
     * Tolerance v px (typicky 20).
     */
    /**
     * @param {boolean} odPovrchu  měřit vzdálenost od POVRCHU stěny, ne od osy.
     *        Bez toho se konec dal přichytit jen zevnitř stěny: u 400mm zdi leží
     *        líc 16 px od osy, takže z 20px dosahu zbyly 4 px venku a „přichyť
     *        se na okraj" bylo prakticky nedostupné.
     */
    findSnapCandidate(x, y, tolerancePx, excludeNodeId = null, odPovrchu = false) {
        let best = null;
        let bestDist = tolerancePx;
        for (const wall of this.walls.values()) {
            if (excludeNodeId && (wall.nodeA === excludeNodeId || wall.nodeB === excludeNodeId)) continue;
            const a = this.nodes.get(wall.nodeA);
            const b = this.nodes.get(wall.nodeB);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const L2 = dx * dx + dy * dy;
            if (L2 === 0) continue;
            const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
            if (t < 0.02 || t > 0.98) continue;
            const px = a.x + t * dx, py = a.y + t * dy;
            const d = Math.hypot(x - px, y - py);
            // Uvnitř stěny je vzdálenost od povrchu nulová — pak rozhoduje osa,
            // aby se ze dvou překrytých stěn vybrala ta bližší.
            const polotl = odPovrchu ? (wall.tloustka || 0) / 2 * this.PX_PER_M : 0;
            const dMer = Math.max(0, d - polotl);
            if (dMer < bestDist || (dMer === bestDist && best && d < best.distance)) {
                bestDist = dMer;
                best = { wall, t, point: { x: px, y: py }, distance: d };
            }
        }
        return best;
    }

    /**
     * Detach: odpojí stěnu od nodu — pokud má constraint, smaže ho;
     * pokud je node sdílený s jinou stěnou, vytvoří nový node.
     * Po detachi aplikuje malý optický offset (10 cm) aby uživatel viděl, že se odpojilo:
     *  - bez T-children: translate celé stěny kolmo od host (bounce)
     *  - s T-children: jen detached endpoint se posune PO OSE směrem k druhému konci
     *    (zkrátit) — zachová vazby T-children na hostiteli s minimálním skokem.
     */
    /**
     * @param {number} minimalniMezera  jak daleko (v px kresby) musí odpojený konec
     *        skončit od spoje. Volající (editor) ji počítá z dosahu přichytávání —
     *        bez toho se stěna odsune o pár pixelů, hned se zase chytí a vypadá to,
     *        že odpojení nefunguje.
     */
    detachWallFromNode(wallId, nodeId, minimalniMezera = 0) {
        const wall = this.walls.get(wallId);
        if (!wall) return false;
        const node = this.nodes.get(nodeId);
        if (!node) return false;
        const isEndA = wall.nodeA === nodeId;
        if (!isEndA && wall.nodeB !== nodeId) return false;

        const constraint = isEndA ? wall.odConstraint : wall.doConstraint;
        const hasTChildren = this.getTChildren(wallId).length > 0;
        const OFFSET_PX = Math.max(0.10 * this.PX_PER_M, minimalniMezera || 0);

        // Směr hostitele (stěny, od které se odpojujeme) — podle něj se pozná,
        // jestli stačí stěnu zkrátit po ose, nebo ji musí odsunout kolmo.
        let hostSmer = null;
        const hostStena = constraint ? this.walls.get(constraint.host)
            : this.getNodeWalls(nodeId).find(w => w.id !== wallId);
        if (hostStena) {
            const ha = this.nodes.get(hostStena.nodeA);
            const hb = this.nodes.get(hostStena.nodeB);
            if (ha && hb) {
                const hL = Math.hypot(hb.x - ha.x, hb.y - ha.y);
                if (hL > 0) hostSmer = { x: (hb.x - ha.x) / hL, y: (hb.y - ha.y) / hL };
            }
        }

        // Vypočítat směr offsetu PŘED aplikací detachu (potřebujeme původní host info).
        //
        // Hostitele hledáme i tam, kde žádná vazba není — u napojení „I" přes
        // SDÍLENÝ UZEL (dvě souosé stěny konec na konec) se zkrácením po vlastní
        // ose nic neodsune, a dokud se tenhle směr počítal jen z vazby, zůstal
        // konec přesně na místě. Odpojení pak vypadalo, že nic neudělalo,
        // a kliklo se na uzel té druhé stěny.
        let perpX = 0, perpY = 0; // kolmo od host (pro bounce mimo host)
        if (hostSmer) {
            const nx = -hostSmer.y, ny = hostSmer.x;
            // Strana = kde leží druhý endpoint stěny. U souosých stěn vyjde nula,
            // pak je jedno kam — hlavně ať se konec vzdálí.
            const otherId = isEndA ? wall.nodeB : wall.nodeA;
            const other = this.nodes.get(otherId);
            const side = other ? (other.x - node.x) * nx + (other.y - node.y) * ny : 0;
            const sign = side >= 0 ? 1 : -1;
            perpX = nx * sign * OFFSET_PX;
            perpY = ny * sign * OFFSET_PX;
        }

        // Aplikovat detach. Stěna může být v uzlu držená DVĚMA způsoby najednou:
        // vazbou (T / čelo) a sdíleným uzlem. Dřív se zrušilo jen to první, takže
        // stěna zůstala fyzicky přilepená — vypadala odpojeně, ale posun ji táhl
        // i se sousedy. Rušíme proto obojí.
        let odpojeno = false;
        if (isEndA && wall.odConstraint) {
            wall.odConstraint = null;
            odpojeno = true;
        } else if (!isEndA && wall.doConstraint) {
            wall.doConstraint = null;
            odpojeno = true;
        }

        // Sdílený uzel → dát téhle stěně vlastní (na stejném místě)
        if (this.getNodeWalls(nodeId).length > 1) {
            const newNode = { id: this._id('N'), x: node.x, y: node.y };
            this.nodes.set(newNode.id, newNode);
            if (isEndA) wall.nodeA = newNode.id;
            else wall.nodeB = newNode.id;
            odpojeno = true;
        }

        if (!odpojeno) return false;   // nebylo co odpojovat

        // Odsunout odpojený konec od spoje. Přednostně ZKRÁCENÍM po vlastní ose
        // (zbytek kresby zůstane, kde byl); u stěn skoro rovnoběžných s hostitelem
        // by zkrácení od osy neodsunulo nic, tam se stěna posune kolmo.
        const aNode = this.nodes.get(wall.nodeA);
        const bNode = this.nodes.get(wall.nodeB);
        if (aNode && bNode) {
            const wdx = bNode.x - aNode.x, wdy = bNode.y - aNode.y;
            const wL = Math.hypot(wdx, wdy);
            const ux = wL ? wdx / wL : 0, uy = wL ? wdy / wL : 0;

            // Jak moc se konec vzdálí od osy hostitele na každý px zkrácení
            let ucinnost = 1;
            if (hostSmer) ucinnost = Math.abs(ux * hostSmer.y - uy * hostSmer.x);  // |sin úhlu|

            const zkraceni = ucinnost > 0.3 ? OFFSET_PX / ucinnost : 0;
            if (zkraceni > 0 && wL > zkraceni + 10) {
                const detachedNode = isEndA ? aNode : bNode;
                const sign = isEndA ? 1 : -1;      // směr k druhému konci
                detachedNode.x += ux * sign * zkraceni;
                detachedNode.y += uy * sign * zkraceni;
            } else if (perpX !== 0 || perpY !== 0) {
                // Skoro rovnoběžná (nebo moc krátká) — odsunout celou stěnu kolmo
                const delka = Math.hypot(perpX, perpY) || 1;
                const posunX = (perpX / delka) * OFFSET_PX;
                const posunY = (perpY / delka) * OFFSET_PX;
                aNode.x += posunX; aNode.y += posunY;
                bNode.x += posunX; bNode.y += posunY;
            }
        }

        return true;
    }

    /**
     * Vrátí omezení pohybu pro daný node (pro editor).
     * Returns:
     *   null                                        — volný 2D pohyb
     *   { type: 'frozen' }                          — nelze hýbat
     *   { type: 'slide', host, line: {a, b} }       — 1D klouzání po linii
     */
    getNodeMovementConstraint(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return { type: 'frozen' };
        const walls = this.getNodeWalls(nodeId);
        if (walls.length === 0) return null;

        // Najít constraint(y) na tomto nodu
        const constraints = [];
        for (const w of walls) {
            const isEndA = w.nodeA === nodeId;
            const c = isEndA ? w.odConstraint : w.doConstraint;
            if (c) constraints.push({ wall: w, end: isEndA ? 'a' : 'b', constraint: c });
        }

        // S constraint(y) — sliding po hostiteli
        if (constraints.length > 0) {
            // Pokud víc constraints, zkusit jestli jsou kompatibilní (stejný host)
            const firstHost = constraints[0].constraint.host;
            const allSameHost = constraints.every(c => c.constraint.host === firstHost);
            if (!allSameHost) return { type: 'frozen' };
            const host = this.walls.get(firstHost);
            if (!host) return null;

            // Napojení „I" — klouže po čele hostitele, ne po jeho ose
            const prvni = constraints[0].constraint;
            if (prvni.konec) {
                const celo = this.celoHostitele(firstHost, prvni.konec, constraints[0].wall.tloustka);
                if (!celo) return null;
                return {
                    type: 'slide',
                    cela: true,
                    host: firstHost,
                    konec: prvni.konec,
                    line: { a: celo.a, b: celo.b },                   // osa — pro výpočet posunu
                    zobrazLine: { a: celo.zobrazA, b: celo.zobrazB }, // líc — pro kreslení
                };
            }

            const ha = this.nodes.get(host.nodeA);
            const hb = this.nodes.get(host.nodeB);
            if (!ha || !hb) return null;
            // Vodicí čára vede TUDY, kudy uzel opravdu jezdí — po líci hostitele,
            // je-li stěna napojená na okraj, ne po jeho ose. Dřív zelená čára
            // slibovala pohyb po ose, zatímco stěna klouzala po líci.
            const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
            const hL = Math.hypot(hdx, hdy) || 1;
            const odsazeni = ((node.x - ha.x) * (-hdy) + (node.y - ha.y) * hdx) / hL;
            const ox = (-hdy / hL) * odsazeni, oy = (hdx / hL) * odsazeni;
            return {
                type: 'slide',
                host: firstHost,
                odsazeni,
                line: { a: { x: ha.x + ox, y: ha.y + oy }, b: { x: hb.x + ox, y: hb.y + oy } },
            };
        }

        // Roh dvou stěn jde chytit za bod a posunout — obě stěny se o ten kus
        // prodlouží nebo zkrátí a příčky, které na nich visí, se přizpůsobí.
        // (Dřív byl roh zamčený a nešlo s ním hnout vůbec.)
        if (walls.length === 2) return null;
        // Tři a víc stěn (T/X po střihu) zůstává zamčené: posun takového uzlu
        // by zalomil průběžnou stěnu do „V".
        if (walls.length >= 3) return { type: 'frozen' };
        // 1 stěna = volný konec → 2D pohyb
        return null;
    }

    /**
     * Klasifikuje typ napojení v nodu pro editor.
     * Vrátí: 'free' | 'L' | 'T' | 'X' | 'frozen'
     * - free: 1 stěna (volný konec)
     * - L: 2 stěny pod úhlem (mitered roh)
     * - T: 3 stěny kde 2 jsou collinear (split host + perpendicular)
     * - X: 4 stěny tvořící 2 collinear páry (cross)
     * - frozen: 3+ stěn co netvoří T ani X (anomálie, nelze hýbat)
     */
    getNodeJunctionType(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return 'free';
        const walls = this.getNodeWalls(nodeId);
        // Zkontrolovat zda má některá stěna constraint na tomto nodu
        // (T-junction v novém modelu = 1 stěna + constraint na hostiteli)
        const hasConstraint = walls.some(w => {
            const isEndA = w.nodeA === nodeId;
            return isEndA ? !!w.odConstraint : !!w.doConstraint;
        });
        if (walls.length <= 1) return hasConstraint ? 'T' : 'free';
        if (walls.length === 2) return hasConstraint ? 'T' : 'L';

        // Spočítat úhly stěn z nodu (směrem k druhému konci)
        const angles = walls.map(w => {
            const otherId = w.nodeA === nodeId ? w.nodeB : w.nodeA;
            const other = this.nodes.get(otherId);
            if (!other) return null;
            return Math.atan2(other.y - node.y, other.x - node.x);
        }).filter(a => a !== null);

        // Najít páry collinear stěn (úhel ≈ 180°, tolerance 5°)
        const COLLINEAR_TOL = 0.087;
        const isCollinearPair = (a, b) => {
            const diff = Math.abs(a - b);
            const norm = Math.min(diff, 2 * Math.PI - diff);
            return Math.abs(norm - Math.PI) < COLLINEAR_TOL;
        };

        let collinearPairs = 0;
        const used = new Set();
        for (let i = 0; i < angles.length; i++) {
            if (used.has(i)) continue;
            for (let j = i + 1; j < angles.length; j++) {
                if (used.has(j)) continue;
                if (isCollinearPair(angles[i], angles[j])) {
                    collinearPairs++;
                    used.add(i);
                    used.add(j);
                    break;
                }
            }
        }

        if (walls.length === 3 && collinearPairs === 1) return 'T';
        if (walls.length === 4 && collinearPairs === 2) return 'X';
        // 3+ stěn bez pěkné klasifikace — dovolit volný 2D pohyb (ne frozen).
        // Frozen používáme jen pro opravdu anomální případy (5+ stěn ap.).
        if (walls.length >= 3 && walls.length <= 4) return 'T';
        return 'frozen';
    }

    /** Sloučí dva nody — přepojí všechny stěny z nodeB na nodeA, smaže nodeB */
    mergeNodes(nodeAId, nodeBId) {
        if (nodeAId === nodeBId) return;
        for (const wall of this.walls.values()) {
            if (wall.nodeA === nodeBId) wall.nodeA = nodeAId;
            if (wall.nodeB === nodeBId) wall.nodeB = nodeAId;
        }
        // Smazat duplicitní stěny (nodeA === nodeB) — i s vazbami, které na ně vedly
        for (const [id, wall] of this.walls.entries()) {
            if (wall.nodeA === wall.nodeB) {
                this.walls.delete(id);
                this.zrusVazbyNa(id);
            }
        }
        this.nodes.delete(nodeBId);
    }

    // ─── WALLS ─────────────────────────────────────────
    /** @param {?string} explicitTyp  vynutí typ stěny (obvodová/nosná/příčka…); jinak se určí z tloušťky */
    addWall(x1, y1, x2, y2, tloustka = 0.3, explicitTyp = null) {
        const nodeA = this.addNode(x1, y1);
        const nodeB = this.addNode(x2, y2);
        if (nodeA.id === nodeB.id) return null; // nulová délka

        const delka = Math.hypot(nodeB.x - nodeA.x, nodeB.y - nodeA.y);
        if (delka < this.SNAP_STEP) return null;

        // Stěny mají jednotně prefix W. Dřív se tu zakládalo „S" a při dělení „W",
        // takže v jednom konceptu byly obě řady a nešlo poznat, co je co.
        const id = this._id('W');
        const typ = urcTypSteny(tloustka, explicitTyp);
        const wall = { id, nodeA: nodeA.id, nodeB: nodeB.id, tloustka, typ };
        this.walls.set(id, wall);
        return wall;
    }

    /**
     * Rozdělí stěnu v bodě t na dvě. splitNodeId bude sdílený uzel mezi
     * oběma polovinami. T-children se rozdělí podle své t pozice a
     * přepočtou se na nové t v odpovídající polovině. Otvory se
     * ponechají v té polovině, kde jejich pozice stále fit.
     * Vrací id druhé poloviny (první polovina ponechána pod původním id).
     */
    splitWall(wallId, tSplit, splitNodeId) {
        const wall = this.walls.get(wallId);
        if (!wall) return null;
        const nodeA = this.nodes.get(wall.nodeA);
        const nodeB = this.nodes.get(wall.nodeB);
        const splitNode = this.nodes.get(splitNodeId);
        if (!nodeA || !nodeB || !splitNode) return null;
        if (tSplit <= 0.01 || tSplit >= 0.99) return null;

        const origNodeB = wall.nodeB;
        // Přenést constraints původní stěny na správné poloviny:
        // odConstraint (nodeA) zůstává na první polovině (wall zachovává nodeA)
        // doConstraint (původní nodeB) přejde na druhou polovinu (W16.nodeB = origNodeB)
        const origDoConstraint = wall.doConstraint;
        wall.doConstraint = null;  // první polovina má nový nodeB (splitNode), constraint neaplikuje
        // První polovina: zachovává wall.id, nodeA, ale nodeB se změní na splitNode
        wall.nodeB = splitNodeId;
        // Druhá polovina: nový wall s splitNode → původní nodeB
        const newId = this._id('W');
        const newWall = {
            id: newId,
            nodeA: splitNodeId,
            nodeB: origNodeB,
            tloustka: wall.tloustka,
            typ: wall.typ,
            odConstraint: null,  // nodeA je nový (splitNode)
            doConstraint: origDoConstraint,  // nodeB je původní → zachová původní constraint
        };
        if (typeof wall.vyska === 'number') newWall.vyska = wall.vyska;
        this.walls.set(newId, newWall);

        this._premapujOddelovace(wallId, newId, tSplit);

        // Přepočítat T-children constraints
        for (const w of this.walls.values()) {
            // Napojení na čelo: konec A zůstává původní stěně, konec B jde na novou
            for (const c of [w.odConstraint, w.doConstraint]) {
                if (c && c.host === wallId && c.konec === 'B') c.host = newId;
            }
            if (w.odConstraint && w.odConstraint.host === wallId && !w.odConstraint.konec) {
                const origT = w.odConstraint.t;
                if (origT < tSplit) {
                    w.odConstraint.t = origT / tSplit;
                } else {
                    w.odConstraint.host = newId;
                    w.odConstraint.t = (origT - tSplit) / (1 - tSplit);
                }
            }
            if (w.doConstraint && w.doConstraint.host === wallId && !w.doConstraint.konec) {
                const origT = w.doConstraint.t;
                if (origT < tSplit) {
                    w.doConstraint.t = origT / tSplit;
                } else {
                    w.doConstraint.host = newId;
                    w.doConstraint.t = (origT - tSplit) / (1 - tSplit);
                }
            }
        }

        // Přepočítat otvory podle pozice (pozice je v metrech od nodeA)
        const lenA = Math.hypot(nodeA.x - splitNode.x, nodeA.y - splitNode.y) / this.PX_PER_M;
        for (const op of this.openings.values()) {
            if (op.wallId !== wallId) continue;
            if (op.pozice + op.sirka <= lenA + 0.001) {
                // zůstává na první polovině
            } else if (op.pozice >= lenA - 0.001) {
                // celý se přesune na druhou polovinu
                op.wallId = newId;
                op.pozice = op.pozice - lenA;
            } else {
                // Otvor překlenuje split bod — ponechat na té polovině kde začíná
                op.wallId = newId;
                op.pozice = 0;
            }
        }

        return newId;
    }

    /**
     * Jde v uzlu sloučit dvě stěny do jedné?
     *
     * Slučovat se smí jen stěny, které jsou prakticky v jedné přímce. U většího
     * úhlu by výsledkem byla úhlopříčka mezi vzdálenými konci, tedy něco úplně
     * jiného, než co je nakreslené.
     *
     * @param {number} maxOdchylkaDeg  o kolik smí úhel chybět do 180°
     * @returns {{ok: boolean, duvod: ?string, steny: ?Array, uhel: ?number}}
     */
    lzeSpojitVUzlu(nodeId, maxOdchylkaDeg = 5) {
        const ne = (duvod) => ({ ok: false, duvod, steny: null, uhel: null });
        const uzel = this.nodes.get(nodeId);
        if (!uzel) return ne('uzel neexistuje');

        const steny = this.getNodeWalls(nodeId);
        if (steny.length !== 2) {
            return ne(steny.length < 2 ? 'v uzlu je jen jedna stěna' : 'v uzlu se potkává víc než dvě stěny');
        }

        // Směry OD uzlu ke vzdáleným koncům. V jedné přímce svírají 180°.
        const smery = steny.map(w => {
            const vzdalenyId = w.nodeA === nodeId ? w.nodeB : w.nodeA;
            const vzdaleny = this.nodes.get(vzdalenyId);
            if (!vzdaleny) return null;
            const dx = vzdaleny.x - uzel.x, dy = vzdaleny.y - uzel.y;
            const L = Math.hypot(dx, dy);
            return L > 0 ? { x: dx / L, y: dy / L } : null;
        });
        if (!smery[0] || !smery[1]) return ne('stěna má nulovou délku');

        const skalar = Math.max(-1, Math.min(1, smery[0].x * smery[1].x + smery[0].y * smery[1].y));
        const uhel = Math.acos(skalar) * 180 / Math.PI;
        if (180 - uhel > maxOdchylkaDeg) {
            return ne('stěny nejsou v jedné přímce (' + uhel.toFixed(0) + '°)');
        }

        return { ok: true, duvod: null, steny, uhel };
    }

    /**
     * Opak splitWall(): sloučí dvě stěny potkávající se v uzlu do jedné
     * a uzel zruší. Slouží k odstranění spoje, který po úpravách zbyl
     * (typicky po odpojení příčky z T — hostitel zůstal rozdělený na dvě).
     *
     * Napojené stěny se nesmí rozbít. Osa se při slučování narovná (úhel
     * nebývá přesně 180°), takže se napojeným stěnám přesune JEN napojený
     * konec na novou osu — vzdálený zůstane stát. Stěna se tím prodlouží
     * nebo zkrátí místo aby se posunula a utrhla svoje napojení jinde.
     * Kolmé odsazení od líce hostitele se přitom zachová, ale měří se
     * k PŮVODNÍ ose: z nové by do něj spadl i zlom a stěna by zůstala
     * viset vedle hostitele.
     *
     * @returns {?object} sloučená stěna, nebo null když to nejde
     */
    spojSteny(nodeId, maxOdchylkaDeg = 5) {
        const kontrola = this.lzeSpojitVUzlu(nodeId, maxOdchylkaDeg);
        if (!kontrola.ok) return null;

        const [w1, w2] = kontrola.steny;
        const uzel = this.nodes.get(nodeId);
        const aId = w1.nodeA === nodeId ? w1.nodeB : w1.nodeA;
        const bId = w2.nodeA === nodeId ? w2.nodeB : w2.nodeA;
        const a = this.nodes.get(aId);
        const b = this.nodes.get(bId);
        if (!a || !b || aId === bId) return null;

        // Uložené t dětí nemusí sedět na jejich skutečnou polohu — nejdřív srovnat,
        // jinak by se přepočítávala zastaralá hodnota.
        this.syncTChildrenT(w1.id);
        this.syncTChildrenT(w2.id);

        const L1 = Math.hypot(uzel.x - a.x, uzel.y - a.y);
        const L2 = Math.hypot(b.x - uzel.x, b.y - uzel.y);
        const Lcelk = L1 + L2;
        const Lnova = Math.hypot(b.x - a.x, b.y - a.y);
        if (Lcelk <= 0 || Lnova <= 0) return null;

        // Orientace původních stěn vůči novému směru A → B
        const w1Vpred = w1.nodeA === aId;       // w1 vede A → uzel
        const w2Vpred = w2.nodeA === nodeId;    // w2 vede uzel → B

        /** Vzdálenost od A (v px) pro parametr t na původní stěně. */
        const podelOsy = (w, t) => (w === w1
            ? (w1Vpred ? t * L1 : (1 - t) * L1)
            : L1 + (w2Vpred ? t * L2 : (1 - t) * L2));

        /** Kterému konci sloučené stěny odpovídá konec původní stěny. */
        const novyKonec = (w, konec) => {
            const uzelKonce = konec === 'A' ? w.nodeA : w.nodeB;
            if (uzelKonce === aId) return 'A';
            if (uzelKonce === bId) return 'B';
            return null;        // konec mizí i s uzlem → z čela se stane T
        };

        // Napojené stěny přepsat na sloučenou stěnu a přepočítat jejich t.
        // Zároveň si zapamatovat jejich kolmé odsazení od PŮVODNÍ osy — podle
        // něj se pak posadí na novou (viz komentář u metody).
        const deti = [];
        for (const w of this.walls.values()) {
            if (w === w1 || w === w2) continue;
            for (const konec of ['odConstraint', 'doConstraint']) {
                const c = w[konec];
                if (!c) continue;
                if (c.host !== w1.id && c.host !== w2.id) continue;
                const uzelDitete = this.nodes.get(konec === 'odConstraint' ? w.nodeA : w.nodeB);
                if (!uzelDitete || c.konec) continue;       // čelo se neposouvá
                const hostStena = c.host === w1.id ? w1 : w2;
                const ha = this.nodes.get(hostStena.nodeA);
                const hb = this.nodes.get(hostStena.nodeB);
                if (!ha || !hb) continue;
                const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                const hL = Math.hypot(hdx, hdy) || 1;
                deti.push({
                    uzel: uzelDitete,
                    vazba: c,
                    odsazeni: ((uzelDitete.x - ha.x) * (-hdy) + (uzelDitete.y - ha.y) * hdx) / hL,
                });
            }
        }

        for (const w of this.walls.values()) {
            if (w === w1 || w === w2) continue;
            for (const c of [w.odConstraint, w.doConstraint]) {
                if (!c) continue;
                const host = c.host === w1.id ? w1 : (c.host === w2.id ? w2 : null);
                if (!host) continue;

                if (c.konec) {
                    const konec = novyKonec(host, c.konec);
                    if (konec) {
                        c.konec = konec;
                    } else {
                        // Čelo mířilo na mizející uzel — drž se místa spoje na ose.
                        delete c.konec;
                        c.t = Math.max(0.02, Math.min(0.98, L1 / Lcelk));
                    }
                } else {
                    c.t = Math.max(0.02, Math.min(0.98, podelOsy(host, c.t) / Lcelk));
                }
                c.host = w1.id;
            }
        }

        // Otvory: pozice se měří v metrech od nodeA, takže se přepočítá
        // na vzdálenost od A a zmenší v poměru skutečné délky nové stěny.
        const naM = (px) => px / this.PX_PER_M;
        const pomer = Lnova / Lcelk;
        for (const op of this.openings.values()) {
            if (op.wallId !== w1.id && op.wallId !== w2.id) continue;
            const naW1 = op.wallId === w1.id;
            const delka = naM(naW1 ? L1 : L2);
            const vpred = naW1 ? w1Vpred : w2Vpred;
            const odZacatku = vpred ? op.pozice : delka - op.pozice - op.sirka;
            const odA = (naW1 ? 0 : naM(L1)) + odZacatku;
            op.wallId = w1.id;
            op.pozice = Math.max(0, Math.min(naM(Lnova) - op.sirka, odA * pomer));
        }

        // Vazby vzdálených konců si sloučená stěna bere z obou původních.
        const konecW1 = w1Vpred ? w1.odConstraint : w1.doConstraint;
        const konecW2 = w2Vpred ? w2.doConstraint : w2.odConstraint;
        const ciziHost = (c) => (c && c.host !== w1.id && c.host !== w2.id) ? c : null;

        // Tloušťku i typ udává delší stěna — ta určuje, co to ve skutečnosti je.
        const hlavni = L1 >= L2 ? w1 : w2;
        w1.tloustka = hlavni.tloustka;
        w1.typ = hlavni.typ;
        w1.nodeA = aId;
        w1.nodeB = bId;
        w1.odConstraint = ciziHost(konecW1);
        w1.doConstraint = ciziHost(konecW2);

        this.walls.delete(w2.id);
        this._cleanOrphanNodes();

        // Dotáhnout napojené stěny na narovnanou osu. Hýbe se VÝHRADNĚ
        // napojeným koncem — vzdáleného se nedotýkáme, i když je volný:
        // slučování má zrušit spoj, ne posouvat kusy výkresu.
        const ndx = b.x - a.x, ndy = b.y - a.y;
        const nL = Math.hypot(ndx, ndy) || 1;
        for (const d of deti) {
            d.uzel.x = a.x + d.vazba.t * ndx + (-ndy / nL) * d.odsazeni;
            d.uzel.y = a.y + d.vazba.t * ndy + (ndx / nL) * d.odsazeni;
        }

        return w1;
    }

    /**
     * Kostra domu: nejpočetnější sada stěn, které jsou navzájem PŘESNĚ kolmé
     * nebo rovnoběžné (aspoň tři). Z ní se bere hlavní směr domu.
     */
    _kostraDomu(steny) {
        // Úhly mají periodu 90°, takže se průměrují přes čtyřnásobek — jinak by
        // se vodorovné a svislé stěny vyrušily.
        const smery = [];
        for (const w of steny) {
            const a = this.nodes.get(w.nodeA), b = this.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            if (L >= 1) smery.push({ w, L, uhel4: 4 * Math.atan2(b.y - a.y, b.x - a.x) });
        }
        const odchylka4 = (u, v) => Math.abs(Math.atan2(Math.sin(u - v), Math.cos(u - v)));
        const prumer4 = (sada) => {
            let sx = 0, sy = 0;
            for (const s of sada) { sx += Math.cos(s.uhel4) * s.L; sy += Math.sin(s.uhel4) * s.L; }
            return (sx || sy) ? Math.atan2(sy, sx) : 0;
        };

        // Hlavní směr domu = jeho kostra: stěny, které už jsou navzájem přesně
        // kolmé/rovnoběžné. Nová stěna se srovná podle domu, ne dům podle ní.
        // Dřív se směr průměroval ze VŠECH stěn, takže každá nová, o kousek
        // křivá stěna (i každá šikmá) průměr posunula a celý dům se k němu
        // „dorovnal" — po každé nakreslené stěně se pootočil a ujel z podkladu.
        const PRESNE4 = 4 * 0.02 * Math.PI / 180;
        let kostra = [];
        for (const kandidat of smery) {
            const shoda = smery.filter(s => odchylka4(s.uhel4, kandidat.uhel4) <= PRESNE4);
            const delka = (sada) => sada.reduce((suma, s) => suma + s.L, 0);
            if (shoda.length > kostra.length || (shoda.length === kostra.length && delka(shoda) > delka(kostra))) kostra = shoda;
        }
        // Kostra až od tří stěn — dvě přesně kolmé můžou vzniknout i náhodou.
        if (kostra.length < 3) kostra = [];
        return { smery, kostra, odchylka4, prumer4, PRESNE4 };
    }

    /**
     * Směr rastru domu (rad, perioda 90°) z jeho kostry — k němu se vztahují
     * magnety úhlů místo vodorovné osy obrazovky. U domu natočeného podle
     * podkladu (Klemov 58°) by „45° k vodorovné" byl úhel, který s domem nijak
     * nesouvisí. Bez kostry (prázdný výkres, první stěny) vrací null — pak
     * platí vodorovná osa obrazovky.
     *
     * @param {Iterable<string>} vynech  stěny, které se právě táhnou
     */
    smerRastru(vynech = []) {
        const bez = new Set(vynech);
        const steny = [...this.walls.values()].filter(w => !bez.has(w.id));
        const { kostra, prumer4 } = this._kostraDomu(steny);
        return kostra.length ? prumer4(kostra) / 4 : null;
    }

    /**
     * Vrátí stěny do pravých úhlů tam, kde jsou mimo jen o kousek.
     *
     * Rozdíl desetiny stupně na obrazovce nepoznáte, ale v konstrukci se sčítá:
     * změřeno na konceptech v databázi — ze 121 stěn jich 85 (70 %) leželo mimo
     * pravý úhel o 0,001 až 1,99°, a nad 2° nebyla ANI JEDNA. Jinými slovy: žádná
     * z nich nebyla šikmá záměrně, všechny ty odchylky byly nechtěné. Proto se
     * srovnává do 2° — co je šikmé víc, je šikmé schválně a nikdo na to nesahá.
     *
     * Postup: najde hlavní směr domu, otočí si do něj souřadnice, a stěnám,
     * které mají být svislé, srovná X na společnou hodnotu (vodorovným Y).
     * Pracuje tedy přes SOUŘADNICE UZLŮ, ne přes natáčení jednotlivých stěn —
     * uzly zůstanou sdílené a topologie se nerozpadne.
     *
     * @param {number} toleranceDeg  do kolika stupňů se ještě srovnává
     * @returns {number} kolik uzlů se posunulo
     */
    srovnejPraveUhly(toleranceDeg = 2) {
        const steny = [...this.walls.values()]
            .filter(w => this.nodes.get(w.nodeA) && this.nodes.get(w.nodeB));
        if (steny.length < 2) return 0;

        const { smery, kostra, odchylka4, prumer4, PRESNE4 } = this._kostraDomu(steny);
        // Bez kostry (čerstvý import, první stěny) se směr odhadne z průměru všech.
        let zaklad = prumer4(kostra.length ? kostra : smery) / 4;
        const tol = toleranceDeg * Math.PI / 180;
        // Dům kreslený „narovno" srovnáme na skutečnou vodorovnou, ne na svůj
        // vlastní průměrný šum. Hotovou kostru ne — ta může být záměrně natočená
        // podle podkladu a otočením by z něj ujela.
        if (!kostra.length && Math.abs(zaklad) <= tol) zaklad = 0;

        // Uzly stěn, které už ve směru domu leží, zůstanou stát — zarovnání
        // hýbe jen tím, co srovnané ještě není. Jinak by se poloha sdíleného
        // uzlu průměrovala s novou stěnou a posunul by se i hotový dům.
        const pevne = new Set();
        for (const s of smery) {
            if (odchylka4(s.uhel4, 4 * zaklad) > PRESNE4) continue;
            pevne.add(s.w.nodeA);
            pevne.add(s.w.nodeB);
        }

        const cos = Math.cos(zaklad), sin = Math.sin(zaklad);
        const vRamci = new Map();
        for (const [id, n] of this.nodes) {
            vRamci.set(id, { x: n.x * cos + n.y * sin, y: -n.x * sin + n.y * cos });
        }

        // Které stěny mají být svislé a které vodorovné
        const svisle = [], vodorovne = [];
        for (const w of steny) {
            const a = vRamci.get(w.nodeA), b = vRamci.get(w.nodeB);
            const dx = b.x - a.x, dy = b.y - a.y;
            if (Math.hypot(dx, dy) < 1) continue;
            const uhel = Math.atan2(dy, dx);
            const kNejblizsi = Math.round(uhel / (Math.PI / 2)) * (Math.PI / 2);
            if (Math.abs(uhel - kNejblizsi) > tol) continue;        // šikmá schválně
            (Math.abs(Math.cos(kNejblizsi)) < 0.5 ? svisle : vodorovne).push(w);
        }
        if (!svisle.length && !vodorovne.length) return 0;

        // Odsazení napojených stěn od osy hostitele se musí změřit TEĎ —
        // po srovnání už by do něj spadla i opravená odchylka.
        const deti = [];
        for (const w of this.walls.values()) {
            for (const kde of ['odConstraint', 'doConstraint']) {
                const c = w[kde];
                if (!c || c.konec) continue;
                const host = this.walls.get(c.host);
                if (!host) continue;
                const uzelId = kde === 'odConstraint' ? w.nodeA : w.nodeB;
                const u = vRamci.get(uzelId);
                const ha = vRamci.get(host.nodeA), hb = vRamci.get(host.nodeB);
                if (!u || !ha || !hb) continue;
                const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
                const hL = Math.hypot(hdx, hdy) || 1;
                deti.push({
                    uzelId, host,
                    odsazeni: ((u.x - ha.x) * (-hdy) + (u.y - ha.y) * hdx) / hL,
                });
            }
        }

        // Skupiny uzlů, které musí sdílet souřadnici (union-find)
        const skupiny = (dvojice) => {
            const rodic = new Map();
            const najdi = (x) => {
                if (!rodic.has(x)) rodic.set(x, x);
                while (rodic.get(x) !== x) { rodic.set(x, rodic.get(rodic.get(x))); x = rodic.get(x); }
                return x;
            };
            for (const [a, b] of dvojice) {
                const ra = najdi(a), rb = najdi(b);
                if (ra !== rb) rodic.set(ra, rb);
            }
            const ven = new Map();
            for (const x of rodic.keys()) {
                const r = najdi(x);
                if (!ven.has(r)) ven.set(r, []);
                ven.get(r).push(x);
            }
            return [...ven.values()];
        };

        let posunuto = 0;
        const srovnej = (steny2, osa) => {
            for (const clenove of skupiny(steny2.map(w => [w.nodeA, w.nodeB]))) {
                const vzor = clenove.some(id => pevne.has(id)) ? clenove.filter(id => pevne.has(id)) : clenove;
                let suma = 0;
                for (const id of vzor) suma += vRamci.get(id)[osa];
                const prumer = suma / vzor.length;
                for (const id of clenove) {
                    if (Math.abs(vRamci.get(id)[osa] - prumer) > 1e-9) posunuto++;
                    vRamci.get(id)[osa] = prumer;
                }
            }
        };
        srovnej(svisle, 'x');          // svislá stěna = oba konce mají stejné X
        srovnej(vodorovne, 'y');

        // Napojené stěny posadit zpět na hostitele: podél hostitele zůstane konec
        // tam, kde byl (drží směr dítěte), kolmo se vrátí na změřené odsazení.
        //
        // Počítá se přes TUTÉŽ kolmici, jakou se odsazení měřilo. Dřív se dosazovalo
        // zvlášť pro vodorovného a svislého hostitele s pevným znaménkem, jenže
        // znaménko odsazení se otáčí podle toho, kterým směrem je stěna zapsaná
        // (A→B). U poloviny stěn se tak příčka při každé úpravě překlopila na
        // PROTILEHLÝ líc — a při další úpravě zase zpátky.
        for (const d of deti) {
            const ha = vRamci.get(d.host.nodeA), hb = vRamci.get(d.host.nodeB);
            const u = vRamci.get(d.uzelId);
            if (!ha || !hb || !u) continue;
            const hdx = hb.x - ha.x, hdy = hb.y - ha.y;
            const hL2 = hdx * hdx + hdy * hdy;
            if (hL2 < 1e-9) continue;
            const hL = Math.sqrt(hL2);
            const t = ((u.x - ha.x) * hdx + (u.y - ha.y) * hdy) / hL2;
            u.x = ha.x + hdx * t + (-hdy / hL) * d.odsazeni;
            u.y = ha.y + hdy * t + (hdx / hL) * d.odsazeni;
        }

        for (const [id, n] of this.nodes) {
            const p = vRamci.get(id);
            if (!p) continue;
            n.x = p.x * cos - p.y * sin;
            n.y = p.x * sin + p.y * cos;
        }

        // Stěny se o zlomky změnily — otvor nesmí přečnívat.
        for (const op of this.openings.values()) {
            const w = this.walls.get(op.wallId);
            if (!w) continue;
            const a = this.nodes.get(w.nodeA), b = this.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const delka = Math.hypot(b.x - a.x, b.y - a.y) / this.PX_PER_M;
            op.pozice = Math.max(0, Math.min(delka - op.sirka, op.pozice));
        }

        return posunuto;
    }

    moveWall(wallId, dx, dy) {
        const wall = this.walls.get(wallId);
        if (!wall) return;

        const nodeA = this.nodes.get(wall.nodeA);
        const nodeB = this.nodes.get(wall.nodeB);
        if (!nodeA || !nodeB) return;

        // Snap pouze na nodeA; nodeB posunout o STEJNÝ delta jako nodeA.
        // Nezávislý snap obou uzlů by jinak stěnu mírně natáčel kvůli
        // rozdílným zaokrouhlovacím zbytkům — ztrácel by rigidní translaci.
        const newAx = this.snapToGrid(nodeA.x + dx);
        const newAy = this.snapToGrid(nodeA.y + dy);
        const realDx = newAx - nodeA.x;
        const realDy = newAy - nodeA.y;
        nodeA.x = newAx;
        nodeA.y = newAy;
        nodeB.x += realDx;
        nodeB.y += realDy;
    }

    removeWall(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return;

        // Smazat otvory na stěně
        for (const [id, opening] of this.openings.entries()) {
            if (opening.wallId === wallId) this.openings.delete(id);
        }

        this._odpojOddelovaceOd(wallId);
        this.walls.delete(wallId);
        this.zrusVazbyNa(wallId);

        // Smazat osiřelé nody (nepřipojené k žádné stěně)
        this._cleanOrphanNodes();
    }

    /**
     * Zruší vazby stěn, které visely na už neexistující stěně.
     *
     * Bez toho zůstane dítě ukazovat na smazaného hostitele: ve výkrese vypadá
     * napojené, ale `getTChildren` ho pod novou stěnou nenajde, takže se při
     * pohybu hostitele neveze ani neprodlouží. Takhle vznikly W32→W67 na
     * Klemově, W8→S49 na Křemelné a S25→S19 na Na bělidle.
     *
     * @returns {number} kolik vazeb se zrušilo
     */
    zrusVazbyNa(wallId) {
        let zruseno = 0;
        for (const w of this.walls.values()) {
            if (w.odConstraint && w.odConstraint.host === wallId) { w.odConstraint = null; zruseno++; }
            if (w.doConstraint && w.doConstraint.host === wallId) { w.doConstraint = null; zruseno++; }
        }

        return zruseno;
    }

    removeNode(nodeId) {
        // Smazat všechny stěny připojené k nodu
        const wallsToRemove = this.getNodeWalls(nodeId);
        wallsToRemove.forEach(w => this.removeWall(w.id));
        this.nodes.delete(nodeId);
    }

    // ─── ODDĚLOVAČE MÍSTNOSTÍ ──────────────────────────────
    /**
     * Oddělovač místnosti (Libor 1. 11. 2026): úsečka nulové tloušťky, která
     * dělí plochu na místnosti, ale NENÍ stěna — nemá tloušťku ani 3D, nespojuje
     * se s rohy, neřeže stěny a nikdy neblokuje jejich posun. Konec může viset
     * na líci stěny: { host: { stena, t, strana } } — poloha se počítá z hostitele
     * (bodKonceOddelovace), takže se oddělovač s posunem stěny protáhne nebo
     * zkrátí sám; volný konec se s hostitelem veze (_vezOddelovace).
     */
    addOddelovac(a, b) {
        const odd = { id: this._id('R'), a: this._konecOddelovace(a), b: this._konecOddelovace(b) };
        odd.delkaPx = this.delkaOddelovace(odd);
        this.oddelovace.set(odd.id, odd);
        return odd;
    }

    _konecOddelovace(k) {
        const out = { x: k.x, y: k.y };
        if (k.host && this.walls.has(k.host.stena)) {
            // Ořez na rozsah LÍCE, ne osy: líc sahá přes pokos až za konec osy (t < 0 nebo > 1).
            // Ořez na 0–1 posouval začátek kliknutý u rohu a rozpadl zacvaknutý úhel (Klemov W11→W36).
            const strana = k.host.strana >= 0 ? 1 : -1;
            const lic = this.rozsahLice(k.host.stena, strana);
            out.host = { stena: k.host.stena, t: Math.max(lic.od, Math.min(lic.do, k.host.t)), strana };
            const p = this.bodNaLici(out.host.stena, out.host.t, out.host.strana);
            if (p) { out.x = p.x; out.y = p.y; }
        }
        return out;
    }

    /** Skutečná poloha konce: z líce hostitele, jinak uložené souřadnice (hostitel bez stěny se odpojí). */
    bodKonceOddelovace(konec) {
        if (konec.host) {
            const p = this.bodNaLici(konec.host.stena, konec.host.t, konec.host.strana);
            if (p) { konec.x = p.x; konec.y = p.y; return p; }
            delete konec.host;
        }
        return { x: konec.x, y: konec.y };
    }

    /** Bod na líci stěny: t po ose A→B, strana +1 = vlevo od směru (normála jako v rendereru), -1 vpravo. */
    bodNaLici(wallId, t, strana) {
        const w = this.walls.get(wallId);
        if (!w) return null;
        const a = this.nodes.get(w.nodeA), b = this.nodes.get(w.nodeB);
        if (!a || !b) return null;
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        if (!L) return null;
        const half = (w.tloustka || 0) * this.PX_PER_M / 2;
        return { x: a.x + dx * t - dy / L * half * strana, y: a.y + dy * t + dx / L * half * strana };
    }

    delkaOddelovace(odd) {
        const a = this.bodKonceOddelovace(odd.a), b = this.bodKonceOddelovace(odd.b);
        return Math.hypot(b.x - a.x, b.y - a.y);
    }

    /**
     * Přichycení konce oddělovače: konec jiného oddělovače, jinak líc stěny
     * (ne roh, ne čelo — t v rozsahu 2–98 %). Vrací { bod, host } nebo null.
     */
    najdiUchytOddelovace(x, y, tolerancePx, vynechatId = null) {
        let best = null, bestD = tolerancePx;
        for (const o of this.oddelovace.values()) {
            if (o.id === vynechatId) continue;
            for (const k of [o.a, o.b]) {
                const p = this.bodKonceOddelovace(k);
                const d = Math.hypot(p.x - x, p.y - y);
                if (d < bestD) { bestD = d; best = { typ: 'oddelovac', bod: p, host: k.host ? { ...k.host } : null }; }
            }
        }
        if (best) return best;
        // Líc stěny: nejbližší úsek líce na kterékoli straně. Rozsah líce (rozsahLice)
        // sahá až k pokosu v rohu, takže se oddělovač chytí i těsně u spoje stěn —
        // findSnapCandidate konce stěny vynechává (2 %), to tu vadilo (Libor 1. 11. 2026).
        let nej = null, nejD = tolerancePx;
        for (const w of this.walls.values()) {
            const a = this.nodes.get(w.nodeA), b = this.nodes.get(w.nodeB);
            if (!a || !b) continue;
            const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
            if (!L2) continue;
            for (const strana of [1, -1]) {
                const lic = this.rozsahLice(w.id, strana);
                const p0 = this.bodNaLici(w.id, lic.od, strana), p1 = this.bodNaLici(w.id, lic.do, strana);
                if (!p0 || !p1) continue;
                const ex = p1.x - p0.x, ey = p1.y - p0.y, E2 = ex * ex + ey * ey;
                if (!E2) continue;
                const u = Math.max(0, Math.min(1, ((x - p0.x) * ex + (y - p0.y) * ey) / E2));
                const px = p0.x + ex * u, py = p0.y + ey * u;
                const d = Math.hypot(x - px, y - py);
                if (d < nejD) {
                    const t = ((px - a.x) * dx + (py - a.y) * dy) / L2;
                    nejD = d;
                    nej = { typ: 'stena', bod: { x: px, y: py }, host: { stena: w.id, t, strana } };
                }
            }
        }
        return nej;
    }

    removeOddelovac(id) {
        this.oddelovace.delete(id);
    }

    /**
     * Posune konec oddělovače k bodu (x, y): konec na líci klouže po líci (t se
     * ořízne na rozsah líce), volný konec se tam položí. Pro tažení celku i konce.
     */
    posunKonecOddelovace(konec, x, y) {
        if (konec.host) {
            const w = this.walls.get(konec.host.stena);
            const a = w && this.nodes.get(w.nodeA), b = w && this.nodes.get(w.nodeB);
            if (a && b) {
                const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy;
                if (L2 > 0) {
                    const lic = this.rozsahLice(w.id, konec.host.strana);
                    const t = ((x - a.x) * dx + (y - a.y) * dy) / L2;
                    konec.host.t = Math.max(lic.od, Math.min(lic.do, t));
                    this.bodKonceOddelovace(konec);
                    return;
                }
            }
            delete konec.host;
        }
        konec.x = x;
        konec.y = y;
    }

    /**
     * Posune celý oddělovač o (dx, dy) jako tuhé těleso — jako stěna:
     *  - konec na líci může jen po líci, proto se posun promítne do směru líce
     *    (kolmá složka se zahodí) a volný konec jede o totéž, tvar drží;
     *  - když některý konec dojede na kraj líce, zastaví se CELÝ oddělovač
     *    (dřív jel druhý konec dál a rozbil zacvaknutý úhel — Libor 1. 11. 2026).
     */
    posunOddelovac(odd, dx, dy) {
        const osa = (k) => {
            const w = k.host && this.walls.get(k.host.stena);
            const a = w && this.nodes.get(w.nodeA), b = w && this.nodes.get(w.nodeB);
            if (!a || !b) return null;
            const wdx = b.x - a.x, wdy = b.y - a.y, L2 = wdx * wdx + wdy * wdy;
            return L2 ? { w, wdx, wdy, L2, ux: wdx / Math.sqrt(L2), uy: wdy / Math.sqrt(L2) } : null;
        };
        const konce = [odd.a, odd.b].map(k => ({ k, osa: osa(k) }));
        const hostovane = konce.filter(c => c.osa);
        let ex = dx, ey = dy;
        if (hostovane.length) {
            const u = hostovane[0].osa;
            const pr = dx * u.ux + dy * u.uy;
            ex = u.ux * pr; ey = u.uy * pr;
        }
        // Mez: nejmenší povolený podíl posunu přes všechny hostované konce
        let s = 1;
        for (const c of hostovane) {
            const dt = (ex * c.osa.wdx + ey * c.osa.wdy) / c.osa.L2;
            if (Math.abs(dt) < 1e-9) continue;
            const lic = this.rozsahLice(c.osa.w.id, c.k.host.strana);
            const cil = c.k.host.t + dt;
            const orez = Math.max(lic.od, Math.min(lic.do, cil));
            const sk = (orez - c.k.host.t) / dt;
            if (sk < s) s = Math.max(0, sk);
        }
        ex *= s; ey *= s;
        if (Math.abs(ex) < 1e-9 && Math.abs(ey) < 1e-9) return false;
        for (const c of konce) {
            if (c.osa) {
                c.k.host.t += (ex * c.osa.wdx + ey * c.osa.wdy) / c.osa.L2;
                this.bodKonceOddelovace(c.k);
            } else {
                c.k.x += ex; c.k.y += ey;
            }
        }
        odd.delkaPx = this.delkaOddelovace(odd);
        return true;
    }

    /** Před smazáním stěny: konce na ní zmrazit tam, kde právě jsou. */
    _odpojOddelovaceOd(wallId) {
        for (const o of this.oddelovace.values()) {
            for (const k of [o.a, o.b]) {
                if (k.host && k.host.stena === wallId) { this.bodKonceOddelovace(k); delete k.host; }
            }
        }
    }

    /** Hostitel se posunul o (dx, dy): oddělovač s jedním koncem na něm a druhým volným jede celý. */
    _vezOddelovace(hostWallId, dx, dy) {
        if (typeof dx !== 'number' || typeof dy !== 'number') return;
        for (const o of this.oddelovace.values()) {
            const naHostiteli = (k) => k.host && k.host.stena === hostWallId;
            if (naHostiteli(o.a) && !o.b.host) { o.b.x += dx; o.b.y += dy; }
            else if (naHostiteli(o.b) && !o.a.host) { o.a.x += dx; o.a.y += dy; }
        }
    }

    /**
     * Po úpravě stěn: oddělovač stlačený pod 10 cm. Volný konec se odsune na
     * původní délku; konec na jiné stěně nemá kam → oddělovač zmizí (Zpět ho vrátí).
     * @returns {boolean} něco se změnilo
     */
    uklidOddelovace() {
        const MIN = 0.1 * this.PX_PER_M;
        let zmena = false;
        for (const o of [...this.oddelovace.values()]) {
            const a = this.bodKonceOddelovace(o.a), b = this.bodKonceOddelovace(o.b);
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            if (L >= MIN) { o.delkaPx = L; continue; }
            const volny = !o.a.host ? 'a' : (!o.b.host ? 'b' : null);
            if (volny && o.delkaPx > MIN) {
                const pevny = volny === 'a' ? b : a;
                const k = o[volny];
                let ux = (volny === 'a' ? a.x - b.x : b.x - a.x), uy = (volny === 'a' ? a.y - b.y : b.y - a.y);
                const n = Math.hypot(ux, uy);
                if (n > 1e-6) { ux /= n; uy /= n; }
                else {
                    // Délka nula: směr kolmo od líce hostitele
                    const h = o[volny === 'a' ? 'b' : 'a'].host;
                    const w = h && this.walls.get(h.stena);
                    const na = w && this.nodes.get(w.nodeA), nb = w && this.nodes.get(w.nodeB);
                    if (na && nb) { const ddx = nb.x - na.x, ddy = nb.y - na.y, LL = Math.hypot(ddx, ddy) || 1; ux = -ddy / LL * h.strana; uy = ddx / LL * h.strana; }
                    else { ux = 1; uy = 0; }
                }
                k.x = pevny.x + ux * o.delkaPx;
                k.y = pevny.y + uy * o.delkaPx;
            } else {
                this.oddelovace.delete(o.id);
            }
            zmena = true;
        }
        return zmena;
    }

    // ─── MÍSTNOSTI ────────────────────────────────────────
    /**
     * Sladí záznamy místností s plochami z rastru: plocha, ve které leží kotva
     * záznamu, dostane jeho jméno a barvu; plocha bez záznamu dostane nový
     * („Místnost N", barva z palety dokola). Záznam bez plochy (sloučené
     * místnosti, rozestavěná stěna) se nemaže — jakmile se jeho kotva zase
     * ocitne v uzavřené ploše, jméno se vrátí.
     *
     * @param {Array<{stitek:number, stred:{x,y}}>} komponenty  plochy z rastru
     * @param {(x:number,y:number)=>number} stitekVBode
     * @returns {Map<number, object>} štítek → záznam místnosti
     */
    sladMistnosti(komponenty, stitekVBode) {
        const mapa = new Map();
        for (const m of this.mistnosti) {
            const s = stitekVBode(m.kotva.x, m.kotva.y);
            if (s < 2 || mapa.has(s) || !komponenty.some(k => k.stitek === s)) continue;
            mapa.set(s, m);
        }
        for (const k of komponenty) {
            if (mapa.has(k.stitek)) continue;
            const auto = this.dalsiAutoMistnosti();
            const m = {
                id: this._id('M'),
                nazev: autoNazevMistnosti(auto),
                auto,
                barva: PALETA_MISTNOSTI[this.mistnosti.length % PALETA_MISTNOSTI.length],
                kotva: { x: k.stred.x, y: k.stred.y },
            };
            this.mistnosti.push(m);
            mapa.set(k.stitek, m);
        }
        return mapa;
    }

    /**
     * Druh místnosti. Výchozí název se převezme z druhu s prvním volným číslem („Obývák 2“),
     * ručně napsaný název zůstane. Bez druhu („Jiná“) dostane výchozí název zpět „Místnost n“.
     */
    nastavDruhMistnosti(m, druh) {
        const klic = DRUHY_MISTNOSTI[druh];
        if (klic) m.druh = druh;
        else delete m.druh;
        // Ručně napsaný název, který je stejný jako výchozí („Ložnice“ u ložnice, staré „Místnost 3“), se stane
        // výchozím a od teď se překládá. Tak jde převést starší projekt, třeba vzorový dům pro všechny jazyky.
        if (!m.auto && klic) {
            const n = this.cisloVychozihoNazvu(m.nazev, klic);
            if (n) { m.auto = { k: klic, n }; return; }
            if (this.cisloVychozihoNazvu(m.nazev, 'mistnost_n')) m.auto = { k: 'mistnost_n', n: 1 };
        }
        if (!m.auto) return;
        const obsazena = new Set(this.mistnosti.filter(x => x !== m).map(x => x.nazev));
        const k = klic || 'mistnost_n';
        let n = 1;
        while (n < 10000 && obsazena.has(autoNazevMistnosti({ k, n }))) n++;
        m.auto = { k, n };
        m.nazev = autoNazevMistnosti(m.auto);
    }

    /** Číslo, se kterým je název výchozím názvem pro klíč (`prostor_loznice`, `mistnost_n`), jinak 0. */
    cisloVychozihoNazvu(nazev, k) {
        const text = String(nazev || '').trim();
        for (let n = 1; n < 100; n++) if (autoNazevMistnosti({ k, n }) === text) return n;
        return 0;
    }

    /**
     * Název místnosti z panelu. Prázdný nebo stejný jako výchozí (podle druhu, jinak „Místnost n“) zůstane výchozím
     * a překládá se, jiný text je text uživatele a s jazykem se nemění.
     */
    prejmenujMistnost(m, nazev) {
        const text = String(nazev || '').trim().slice(0, 40);
        const k = DRUHY_MISTNOSTI[m.druh] || 'mistnost_n';
        const n = text ? this.cisloVychozihoNazvu(text, k) : 0;
        if (n) {
            m.auto = { k, n };
            m.nazev = text;
        } else if (!text) {
            m.auto = { k, n: 1 };
            this.nastavDruhMistnosti(m, m.druh || '');
        } else {
            m.nazev = text;
            delete m.auto;
        }
    }

    /** Výchozí název místnosti s prvním volným číslem. */
    dalsiAutoMistnosti() {
        const obsazena = new Set(this.mistnosti.map(m => m.nazev));
        // Strop: text bez čísla (překlad bez :n) by smyčku nikdy neukončil
        let n = 1;
        while (n < 10000 && obsazena.has(autoNazevMistnosti({ k: 'mistnost_n', n }))) n++;
        return { k: 'mistnost_n', n };
    }

    najdiMistnost(id) {
        return (this.mistnosti || []).find(m => m.id === id) || null;
    }

    removeVybaveni(id) {
        if (!Array.isArray(this.vybaveni)) return;
        this.vybaveni = this.vybaveni.filter(v => v.id !== id);
    }

    _cleanOrphanNodes() {
        const usedNodes = new Set();
        for (const wall of this.walls.values()) {
            usedNodes.add(wall.nodeA);
            usedNodes.add(wall.nodeB);
        }
        for (const nodeId of this.nodes.keys()) {
            if (!usedNodes.has(nodeId)) {
                this.nodes.delete(nodeId);
            }
        }
    }

    /**
     * Automaticky rozdělí stěny kde se node jiné stěny dotýká hrany.
     * Řeší T-napojení příček na obvodové stěny.
     */
    _autoSplitWalls() {
        const TOLERANCE = 2; // px — tolerance pro "bod leží na hraně"
        let changed = true;
        let iterations = 0;

        while (changed && iterations < 10) {
            changed = false;
            iterations++;

            for (const node of this.nodes.values()) {
                for (const wall of [...this.walls.values()]) {
                    // Přeskočit stěny které tento node vlastní
                    if (wall.nodeA === node.id || wall.nodeB === node.id) continue;

                    const nA = this.nodes.get(wall.nodeA);
                    const nB = this.nodes.get(wall.nodeB);
                    if (!nA || !nB) continue;

                    // Vzdálenost bodu od úsečky stěny
                    const dx = nB.x - nA.x, dy = nB.y - nA.y;
                    const len2 = dx * dx + dy * dy;
                    if (len2 === 0) continue;

                    const t = ((node.x - nA.x) * dx + (node.y - nA.y) * dy) / len2;
                    if (t <= 0.01 || t >= 0.99) continue; // příliš blízko konců

                    const cx = nA.x + t * dx, cy = nA.y + t * dy;
                    const dist = Math.hypot(node.x - cx, node.y - cy);

                    if (dist > TOLERANCE) continue;

                    // Bod leží na hraně stěny → rozdělit stěnu
                    // Přesunout node přesně na hranu
                    node.x = Math.round(cx);
                    node.y = Math.round(cy);

                    // Vytvořit druhou polovinu stěny
                    const newId = this._id('W');
                    const newWall = {
                        id: newId,
                        nodeA: node.id,
                        nodeB: wall.nodeB,
                        tloustka: wall.tloustka,
                        typ: wall.typ,
                    };
                    if (typeof wall.vyska === 'number') newWall.vyska = wall.vyska;
                    this.walls.set(newId, newWall);

                    // Zkrátit původní stěnu
                    wall.nodeB = node.id;

                    // Přesunout otvory které jsou za split bodem na novou stěnu
                    for (const opening of this.openings.values()) {
                        if (opening.wallId === wall.id && opening.pozice > t * Math.sqrt(len2) / this.PX_PER_M) {
                            opening.wallId = newId;
                            opening.pozice -= t * Math.sqrt(len2) / this.PX_PER_M;
                        }
                    }

                    this._premapujOddelovace(wall.id, newId, t);

                    changed = true;
                    break; // restart inner loop
                }
                if (changed) break; // restart outer loop
            }
        }
    }

    /**
     * Po rozdělení stěny v parametru tSplit: konce oddělovačů za řezem přejdou
     * na novou polovinu, parametr se přepočítá. Volá splitWall i _autoSplitWalls
     * (to při načtení dělí stěny u T-napojení ručně — bez tohoto se oddělovač
     * po obnovení stránky stáhl na zkrácenou stěnu a šel šikmo).
     */
    _premapujOddelovace(wallId, newId, tSplit) {
        for (const o of this.oddelovace.values()) {
            for (const k of [o.a, o.b]) {
                if (!k.host || k.host.stena !== wallId) continue;
                if (k.host.t < tSplit) k.host.t = k.host.t / tSplit;
                else { k.host.stena = newId; k.host.t = (k.host.t - tSplit) / (1 - tSplit); }
            }
        }
    }

    // ─── WALL GEOMETRY (mitre join) ────────────────────
    /**
     * Vrátí polygon stěny jako pole bodů [{x,y}, ...] (uzavřený).
     * Na koncích kde se potkávají jiné stěny, ořízne úhel (mitre join).
     */
    getWallPolygon(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return [];

        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return [];

        const dx = nB.x - nA.x;
        const dy = nB.y - nA.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return [];

        const tl = wall.tloustka * this.PX_PER_M;
        const half = tl / 2;

        // Směrový vektor stěny (A→B) a normála
        const dirX = dx / len, dirY = dy / len;
        const nrmX = -dirY, nrmY = dirX;  // normála (vlevo od směru A→B)

        // Základní 4 body (obdélník)
        let a1 = { x: nA.x + nrmX * half, y: nA.y + nrmY * half };
        let a2 = { x: nA.x - nrmX * half, y: nA.y - nrmY * half };
        let b1 = { x: nB.x + nrmX * half, y: nB.y + nrmY * half };
        let b2 = { x: nB.x - nrmX * half, y: nB.y - nrmY * half };

        // Mitre join — pro každý konec najdi průsečíky s sousedními stěnami
        // Funguje pro L-spoj (1 soused), T-spoj (2 sousedi) i křížový (3+ sousedi)
        const doMitre = (nodeId, isEndB) => {
            const neighbors = this.getNodeWalls(nodeId).filter(w => w.id !== wallId);
            if (neighbors.length === 0 || len <= tl) return;

            // Úhel aktuální stěny OD sdíleného bodu
            const node = this.nodes.get(nodeId);
            const otherNode = isEndB ? nA : nB; // druhý konec aktuální stěny
            const myAngle = Math.atan2(otherNode.y - node.y, otherNode.x - node.x);

            // Úhly sousedních stěn OD sdíleného bodu, seřazené
            const neighborAngles = neighbors.map(w => {
                const end = this.nodes.get(w.nodeA === nodeId ? w.nodeB : w.nodeA);
                if (!end) return null;
                return {
                    wall: w,
                    angle: Math.atan2(end.y - node.y, end.x - node.x),
                    edges: this._getOtherPolygonEdges(w, nodeId),
                };
            }).filter(n => n && n.edges);

            if (neighborAngles.length === 0) return;

            // Přidat aktuální stěnu do kruhu úhlů pro nalezení sousedů po stranách
            const allAngles = [...neighborAngles.map(n => n.angle), myAngle];

            // Normalizovat úhly a najít levého a pravého souseda aktuální stěny
            const normAngle = (a) => { let v = a; while (v < -Math.PI) v += 2 * Math.PI; while (v > Math.PI) v -= 2 * Math.PI; return v; };

            // Relativní úhly sousedů vůči aktuální stěně
            const withRelAngleAll = neighborAngles.map(n => ({
                ...n,
                relAngle: normAngle(n.angle - myAngle),
            }));

            // Filtrovat KOLINEÁRNÍ sousedy (relAngle blízko ±π = pokračování stěny).
            // Vznikají při splitu stěny v T-junction — sub-stěny jsou collinear
            // a "sousedi" v miteringu by produkovaly diagonální cap → tapering.
            // Treat collinear neighbor as continuation, ne jako junction soused.
            const COLLINEAR_TOL = 0.087; // ~5°
            const withRelAngle = withRelAngleAll.filter(n =>
                Math.abs(Math.abs(n.relAngle) - Math.PI) > COLLINEAR_TOL
            );
            // Stěna, která ve spoji pokračuje rovně dál (rozstřižená zeď, do které
            // vede příčka), se NEzkosí vůbec — konec zůstane kolmý a navazuje na
            // pokračování. Dřív se obě půlky zkosily podle odbočky, každá jinak,
            // a ve zdi vznikl klín (Klemov W3 + W58 s W5). Odbočka si svůj konec
            // srovná na líc sama (její sousedi jsou obě půlky).
            if (withRelAngle.length < withRelAngleAll.length) return;

            // Levý soused = nejmenší kladný relativní úhel (po směru hodin)
            // Pravý soused = největší záporný relativní úhel (proti směru hodin)
            const leftNeighbors = withRelAngle.filter(n => n.relAngle > 0).sort((a, b) => a.relAngle - b.relAngle);
            const rightNeighbors = withRelAngle.filter(n => n.relAngle < 0).sort((a, b) => b.relAngle - a.relAngle);

            // Fallback: pokud všechny sousedi jsou na jedné straně
            const leftN = leftNeighbors[0] || rightNeighbors[rightNeighbors.length - 1];
            const rightN = rightNeighbors[0] || leftNeighbors[leftNeighbors.length - 1];

            if (!leftN || !rightN) return;

            // Průsečíky hran
            // a1-b1 = levá hrana stěny (strana +normála)
            // a2-b2 = pravá hrana stěny (strana -normála)
            let use1, use2;
            if (!isEndB) {
                // Konec A: levá hrana s pravou hranou levého souseda, pravá s levou pravého
                use1 = this._lineIntersect(a1, b1, leftN.edges.p3, leftN.edges.p4);
                use2 = this._lineIntersect(a2, b2, rightN.edges.p1, rightN.edges.p2);
            } else {
                // Konec B: levá s levou levého souseda, pravá s pravou pravého
                use1 = this._lineIntersect(a1, b1, leftN.edges.p1, leftN.edges.p2);
                use2 = this._lineIntersect(a2, b2, rightN.edges.p3, rightN.edges.p4);
            }

            // Omezení zkosení (miter limit): u velmi ostrých úhlů letí průsečík
            // hran daleko a ze stěny se stane dlouhá špice. Nad limit se roh
            // neřeže a nechá se rovný. Projeví se hlavně u importu z výkresu,
            // kde se sbíhá víc stěn pod ostrými úhly.
            const limit = Math.max(tl * 3, 0.3 * this.PX_PER_M);   // v px, jako celá geometrie
            const vLimitu = (puvodni, novy) => novy && Math.hypot(novy.x - puvodni.x, novy.y - puvodni.y) <= limit;

            if (isEndB) {
                if (vLimitu(b1, use1)) b1 = use1;
                if (vLimitu(b2, use2)) b2 = use2;
            } else {
                if (vLimitu(a1, use1)) a1 = use1;
                if (vLimitu(a2, use2)) a2 = use2;
            }
        };

        // Napojení na hostitele bez sdíleného uzlu (na okraj): uzel leží na líci
        // hostitele. Čelo kolmé k vlastní ose by u šikmé stěny jedním rohem
        // z líce trčelo a druhým se do hostitele zařezávalo — vede se proto
        // souběžně s hostitelem přes uzel, tedy po jeho líci.
        const kLiciHostitele = (nodeId, isEndB) => {
            if (this.getNodeWalls(nodeId).length > 1) return;   // sdílený uzel řeší mitre
            // Během tažení vazba ještě není — editor ji dodá z náhledu přichycení,
            // ať čelo sedí na líci už před puštěním (jinak by po puštění poskočilo).
            const c = (isEndB ? wall.doConstraint : wall.odConstraint) || this.nahledNapojeni?.(nodeId);
            if (!c || c.konec) return;                          // „I" napojení na čelo
            const host = this.walls.get(c.host);
            const ha = host && this.nodes.get(host.nodeA);
            const hb = host && this.nodes.get(host.nodeB);
            if (!ha || !hb) return;
            const uzel = isEndB ? nB : nA;
            const podel = { x: uzel.x + hb.x - ha.x, y: uzel.y + hb.y - ha.y };
            const u1 = this._lineIntersect(a1, b1, uzel, podel);
            const u2 = this._lineIntersect(a2, b2, uzel, podel);
            // stejný limit jako u mitre — u velmi ostrého úhlu zůstane čelo rovné
            const limit = Math.max(tl * 3, 0.3 * this.PX_PER_M);
            const blizko = (puvodni, novy) => novy && Math.hypot(novy.x - puvodni.x, novy.y - puvodni.y) <= limit;
            if (isEndB) {
                if (blizko(b1, u1) && blizko(b2, u2)) { b1 = u1; b2 = u2; }
            } else if (blizko(a1, u1) && blizko(a2, u2)) {
                a1 = u1; a2 = u2;
            }
        };

        doMitre(wall.nodeA, false);
        doMitre(wall.nodeB, true);
        kLiciHostitele(wall.nodeA, false);
        kLiciHostitele(wall.nodeB, true);

        return [a1, b1, b2, a2];
    }

    /**
     * Vrátí 4 body (hrany) obdélníku sousední stěny BEZ mitre.
     * p1-p2 = "levá" hrana (strana +normála), p3-p4 = "pravá" hrana (-normála)
     * Hrany jsou orientovány OD sdíleného bodu ven.
     */
    _getOtherPolygonEdges(otherWall, sharedNodeId) {
        const nodeS = this.nodes.get(sharedNodeId);
        const nodeE = this.nodes.get(
            otherWall.nodeA === sharedNodeId ? otherWall.nodeB : otherWall.nodeA
        );
        if (!nodeS || !nodeE) return null;

        const dx = nodeE.x - nodeS.x;
        const dy = nodeE.y - nodeS.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return null;

        const tl = otherWall.tloustka * this.PX_PER_M;
        const half = tl / 2;
        const nx = -dy / len, ny = dx / len;

        // Levá hrana (+normála): od sdíleného bodu k druhému konci
        // Pravá hrana (-normála): od sdíleného bodu k druhému konci
        return {
            p1: { x: nodeS.x + nx * half, y: nodeS.y + ny * half },
            p2: { x: nodeE.x + nx * half, y: nodeE.y + ny * half },
            p3: { x: nodeS.x - nx * half, y: nodeS.y - ny * half },
            p4: { x: nodeE.x - nx * half, y: nodeE.y - ny * half },
        };
    }

    /**
     * Průsečík dvou přímek (definovaných body p1-p2 a p3-p4).
     * Vrátí bod průsečíku nebo null.
     */
    _lineIntersect(p1, p2, p3, p4) {
        const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
        const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
        const det = d1x * d2y - d1y * d2x;
        if (Math.abs(det) < 0.0001) return null;

        const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / det;
        return { x: p1.x + d1x * t, y: p1.y + d1y * t };
    }

    // ─── OPENINGS ──────────────────────────────────────
    /**
     * @param {object} extra  `presnaSirka: true` = použít zadanou šířku beze změny
     *        (okna mají atypické rozměry, přichytávání na normovou řadu je kazilo)
     */
    addOpening(wallId, pozice, sirka, typ = 'dvere', extra = {}) {
        const wall = this.walls.get(wallId);
        if (!wall) return null;

        const id = this._id(StavebniEngine.prefixOtvoru(typ));
        const snappedSirka = extra.presnaSirka ? sirka : snapOpeningSirka(sirka, typ);
        const opening = {
            id, wallId, pozice, sirka: snappedSirka, typ,
            smer: extra.smer || defaultOpeningSmer(typ),
            strana: extra.strana || 'in',
        };
        // Výška, parapet a křídla jen když jsou zadané — jinak platí výchozí podle typu
        if (typeof extra.vyska === 'number') opening.vyska = extra.vyska;
        if (typeof extra.parapet === 'number') opening.parapet = extra.parapet;
        if (Array.isArray(extra.kridla)) opening.kridla = extra.kridla.map(normalizujKridlo).filter(Boolean);
        this.openings.set(id, opening);
        return opening;
    }

    removeOpening(openingId) {
        this.openings.delete(openingId);
    }

    /**
     * Na kterou stranu stěny se křídla otvírají ('in' = +normála směru A→B).
     * Dveře a vše k podlaze: podle uložené `strana` (jde přepnout tlačítkem).
     * Okna s parapetem se otvírají vždy dovnitř — strana se určí podle toho,
     * kde leží těžiště kresby (vnitřek domu); ven otvíraná větračka je nesmysl.
     */
    stranaOtvoru(opening) {
        if (minParapetOtvoru(opening) < 0.05) return opening.strana || 'in';
        const wall = this.walls.get(opening.wallId);
        const a = wall && this.nodes.get(wall.nodeA);
        const b = wall && this.nodes.get(wall.nodeB);
        if (!a || !b || this.nodes.size === 0) return 'in';
        let sx = 0, sy = 0;
        for (const n of this.nodes.values()) { sx += n.x; sy += n.y; }
        const tx = sx / this.nodes.size, ty = sy / this.nodes.size;
        const nx = -(b.y - a.y), ny = b.x - a.x; // normála jako v rendereru
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        return ((tx - mx) * nx + (ty - my) * ny) >= 0 ? 'in' : 'out';
    }

    getWallOpenings(wallId) {
        return [...this.openings.values()].filter(o => o.wallId === wallId);
    }

    // ─── SERIALIZATION ─────────────────────────────────
    toJSON() {
        const json = this._jsonPodlazi();
        json.dum = StavebniEngine.kopieDumu(this.dum);
        return json;
    }

    /** JSON jen aktivního podlaží (kresba bez domu). */
    _jsonPodlazi() {
        const steny = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            const wallOut = {
                id: wall.id,
                od: [nA.x / this.PX_PER_M, -nA.y / this.PX_PER_M],
                do: [nB.x / this.PX_PER_M, -nB.y / this.PX_PER_M],
                tloustka: wall.tloustka,
                typ: wall.typ,
            };
            if (typeof wall.vyska === 'number') wallOut.vyska = wall.vyska;
            if (wall.zajisteno) wallOut.zajisteno = wall.zajisteno;
            // Constraint metadata (T-junction) — zachovat při uložení
            if (wall.odConstraint) wallOut.od_constraint = wall.odConstraint;
            if (wall.doConstraint) wallOut.do_constraint = wall.doConstraint;
            steny.push(wallOut);
        }

        const otvory = [];
        for (const opening of this.openings.values()) {
            const out = {
                id: opening.id,
                stena: opening.wallId,
                pozice: opening.pozice,
                sirka: opening.sirka,
                typ: opening.typ,
            };
            if (opening.smer) out.smer = opening.smer;
            if (opening.strana) out.strana = opening.strana;
            if (typeof opening.vyska === 'number') out.vyska = opening.vyska;
            if (typeof opening.parapet === 'number') out.parapet = opening.parapet;
            if (Array.isArray(opening.kridla)) {
                out.kridla = opening.kridla.map(k => {
                    const d = { sirka: k.sirka, otv: k.otv };
                    if (k.sklopne) d.sklopne = true;
                    if (typeof k.parapet === 'number') d.parapet = k.parapet;
                    return d;
                });
            }
            otvory.push(out);
        }

        // Vybavení (nábytek) — engine si polygon drží v metrech (kompatibilita
        // s output.json formátem a pudorys-icons.createFurnitureShape).
        const vybaveni = (this.vybaveni || []).map(v => ({
            id: v.id,
            typ: v.typ,
            podtyp: v.podtyp ?? null,
            kategorie: v.kategorie ?? null,
            stred: v.stred ? [v.stred[0], v.stred[1]] : undefined,
            polygon: Array.isArray(v.polygon) ? v.polygon.map(p => [p[0], p[1]]) : undefined,
            sirka: v.sirka,
            hloubka: v.hloubka,
            uhel: v.uhel ?? 0,
            vyska: v.vyska ?? null,
            tvar: v.tvar ?? null,
            zadni_strana: v.zadni_strana ?? null,
            katalog: v.katalog ?? undefined,
            nazev: v.nazev ?? undefined,
            nazevZdroj: v.nazevZdroj ?? undefined,
            barva: v.barva || undefined,
            uroven: v.uroven ?? undefined,
            zaklad: v.zaklad ?? undefined,
        }));

        // Oddělovače místností — konce v metrech (y nahoru jako u stěn), vazba na líc stěny zvlášť
        const oddelovace = [];
        for (const o of this.oddelovace.values()) {
            const konec = (k) => {
                const p = this.bodKonceOddelovace(k);
                const out = { x: Math.round(p.x / this.PX_PER_M * 1000) / 1000, y: Math.round(-p.y / this.PX_PER_M * 1000) / 1000 };
                if (k.host) out.host = { stena: k.host.stena, t: k.host.t, strana: k.host.strana };
                return out;
            };
            oddelovace.push({ id: o.id, a: konec(o.a), b: konec(o.b) });
        }

        // Místnosti: jméno + barva + kotva (metry, y nahoru); plochy se nepersistují, počítá je rastr
        const mistnosti = (this.mistnosti || []).map(m => ({
            id: m.id, nazev: m.nazev, ...(m.auto ? { auto: { ...m.auto } } : {}), ...(m.druh ? { druh: m.druh } : {}), barva: m.barva, ...(m.podlaha ? { podlaha: { ...m.podlaha } } : {}),
            kotva: [Math.round(m.kotva.x / this.PX_PER_M * 1000) / 1000, Math.round(-m.kotva.y / this.PX_PER_M * 1000) / 1000],
        }));

        return { steny, otvory, vybaveni, oddelovace, mistnosti };
    }

    /**
     * @param {object} nast  `snapTloustky: true` = přichytit tloušťky stěn na
     *        normovou řadu typu. Smí si o to říct jen import z výkresu, kde
     *        tloušťka vyšla z měření (0.1437 → 0.14). Při načtení uloženého
     *        konceptu a při undu se zachovává přesně to, co uživatel zadal.
     */
    fromJSON(data, nast = {}) {
        // Dům: uložený se převezme, starý projekt bez něj = jedno podlaží. Import výkresu
        // a přepnutí podlaží mění jen kresbu aktivního podlaží (zachovatDum).
        if (data && data.dum) {
            this.dum = StavebniEngine.normalizujDum(data.dum);
            // Automatické názvy podle jazyka toho, kdo projekt otevřel. Ve stejném jazyce se nic nezmění,
            // jinak se _stavKroku bere až po načtení, takže nevznikne krok historie ani úprava do limitu.
            this.prejmenujPodlazi();
        }
        else if (!nast.zachovatDum) this.dum = StavebniEngine.vychoziDum();

        this.nodes.clear();
        this.walls.clear();
        this.openings.clear();
        // Starší projekty a import výkresu nesou pojmenované prostory (polygony). Model už není, převedou se
        // na místnosti (název a kotva) níž, jakmile jsou stěny načtené.
        const stareProstory = [];
        this.vybaveni = [];
        this.oddelovace.clear();
        this.mistnosti = [];
        this.nextId = 1;

        if (!data || !data.steny) return;

        // Při importu: přesné pozice, merge jen identické body (ne magnet)
        const MERGE_THRESHOLD = 0.5; // px — jen opravdu stejné body
        const findOrCreateNode = (x, y) => {
            for (const node of this.nodes.values()) {
                if (Math.abs(node.x - x) < MERGE_THRESHOLD && Math.abs(node.y - y) < MERGE_THRESHOLD) {
                    return node;
                }
            }
            const id = this._id('N');
            const node = { id, x, y };
            this.nodes.set(id, node);
            return node;
        };

        data.steny.forEach(s => {
            const x1 = s.od[0] * this.PX_PER_M;
            const y1 = -s.od[1] * this.PX_PER_M;
            const x2 = s.do[0] * this.PX_PER_M;
            const y2 = -s.do[1] * this.PX_PER_M;

            const nodeA = findOrCreateNode(x1, y1);
            const nodeB = findOrCreateNode(x2, y2);
            if (nodeA.id === nodeB.id) return;

            const rawTl = s.tloustka || 0.3;
            let typ = s.typ || s.material; // fallback: AI někdy posílá 'material' místo 'typ'
            if (!typ || !TYPY_STEN[typ]) typ = urcTypSteny(rawTl);
            // Uložená tloušťka se zachovává, jen se zaokrouhlí na milimetry.
            // Přichytávání na normovou řadu typu tu tiše vracelo ručně zadané
            // tloušťky zpátky (25cm příčka → 19cm) při každém reloadu i undu —
            // stejná chyba, jaká byla u šířky otvoru. Normovou řadu si vyžádá
            // jen import z výkresu (nast.snapTloustky).
            const tl = nast.snapTloustky
                ? snapWallTloustka(rawTl, typ)
                : Math.min(1, Math.max(0.02, Math.round(rawTl * 1000) / 1000));
            const wall = {
                // Bez id by se stěny v Mapě přepsaly navzájem — data z importu
                // (rozpoznané z výkresu) id nemají.
                id: s.id || this._id('W'),
                nodeA: nodeA.id,
                nodeB: nodeB.id,
                tloustka: tl,
                typ,
                // Constraint metadata pro editor (T-junction):
                // { 'host': 'W3', 't': 0.42 } — endpoint je na ose hostitele
                odConstraint: s.od_constraint || null,
                doConstraint: s.do_constraint || null,
            };
            if (typeof s.vyska === 'number' && s.vyska > 0) wall.vyska = s.vyska;
            // Podpis nepodepřeného úseku, který uživatel označil jako staticky zajištěný (dum.js)
            if (typeof s.zajisteno === 'string') wall.zajisteno = s.zajisteno;
            this.walls.set(wall.id, wall);

            // Aktualizovat nextId
            // String() — importovaná data (rozpoznaná z výkresu) nemusí mít id vůbec
            const num = parseInt(String(s.id ?? '').replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        (data.otvory || []).forEach(o => {
            // Migrace směru otvírání: původní "left_in" → { smer, strana } + lítačky
            let smer = o.smer || null;
            let strana = o.strana || 'in';
            if (!smer) {
                const migrated = migrateOpeningSmer(o.smer_otvirani);
                if (migrated) { smer = migrated.smer; strana = migrated.strana; }
                if (!smer) smer = defaultOpeningSmer(o.typ);
            }
            const opening = {
                id: o.id || this._id(StavebniEngine.prefixOtvoru(o.typ)),
                wallId: o.stena,
                pozice: o.pozice,
                // Uložená šířka se zachovává, jen se zaokrouhlí na centimetry
                // (naměřené zlomky z importu 0.8825 → 0.88). Přichytávání na
                // normovou řadu tu tiše měnilo atypické rozměry oken (2.30 → 2.50).
                sirka: Math.round((o.sirka || 0) * 100) / 100,
                typ: o.typ,
                smer,
                strana,
            };
            if (typeof o.vyska === 'number' && o.vyska > 0) opening.vyska = o.vyska;
            if (typeof o.parapet === 'number' && o.parapet >= 0) opening.parapet = o.parapet;
            if (Array.isArray(o.kridla)) {
                const kridla = o.kridla.map(normalizujKridlo).filter(Boolean);
                // Prázdné pole je platná sestava (otvor bez křídla); poškozená data se raději odvodí znovu
                if (kridla.length === o.kridla.length) opening.kridla = kridla;
            }
            this.openings.set(opening.id, opening);

            const num = parseInt(String(o.id ?? '').replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        (data.oddelovace || []).forEach(o => {
            if (!o || !o.a || !o.b) return;
            const konec = (k) => ({ x: k.x * this.PX_PER_M, y: -k.y * this.PX_PER_M, host: k.host || null });
            const odd = { id: o.id || this._id('R'), a: this._konecOddelovace(konec(o.a)), b: this._konecOddelovace(konec(o.b)) };
            odd.delkaPx = this.delkaOddelovace(odd);
            this.oddelovace.set(odd.id, odd);
            const num = parseInt(String(o.id ?? '').replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        (data.mistnosti || []).forEach(m => {
            if (!m || !Array.isArray(m.kotva)) return;
            this.mistnosti.push({
                id: m.id || this._id('M'),
                nazev: m.auto?.k && typeof preloz === 'function' ? autoNazevMistnosti(m.auto) : String(m.nazev || ''),
                ...(m.auto?.k ? { auto: { ...m.auto } } : {}),
                ...(DRUHY_MISTNOSTI[m.druh] ? { druh: m.druh } : {}),
                barva: /^#[0-9a-fA-F]{6}$/.test(m.barva || '') ? m.barva : PALETA_MISTNOSTI[this.mistnosti.length % PALETA_MISTNOSTI.length],
                ...(m.podlaha?.dekor ? { podlaha: { ...m.podlaha } } : {}),
                kotva: { x: m.kotva[0] * this.PX_PER_M, y: -m.kotva[1] * this.PX_PER_M },
            });
            const num = parseInt(String(m.id ?? '').replace(/\D/g, ''));
            if (num >= this.nextId) this.nextId = num + 1;
        });

        // Automaticky rozdělit stěny kde se bod dotýká hrany (T-napojení)
        // POZN: pokud má některá stěna constraint metadata, jsme v novém
        // constraint-based modelu — T-junctions řídí metadata, ne topology.
        // Split by rozbil logickou stěnu na dvě (problém při undo/reload).
        const hasConstraints = Array.from(this.walls.values()).some(w => w.odConstraint || w.doConstraint);
        if (!hasConstraints) {
            this._autoSplitWalls();
        }

        // Import místností: polygon vertices mohou buď REFERENCOVAT existující
        // wall node (blízko endpointu stěny → polygon se automaticky aktualizuje
        // s pohybem uzlu) nebo mít vlastní nezávislé souřadnice (pro open-plan
        // boundary). Virtuální stěny se nevytváří v grafu — hranice jsou jen
        // vizuální reprezentace, nemodifikují wall graph.
        // REF_TOL_PX 12 px (≈24 cm) — větší tolerance než 3 px, protože parser
        // polygonu z metrů často zaokrouhluje a vrchol končí lehce vedle uzlu.
        // Bez toho se vrchol uložil jako fixní {x,y} a po pohybu stěny zůstal
        // viset na původním místě.
        const REF_TOL_PX = 12.0;
        const findRefNode = (x, y) => {
            let best = null, bestD = REF_TOL_PX;
            for (const n of this.nodes.values()) {
                const d = Math.hypot(n.x - x, n.y - y);
                if (d < bestD) { bestD = d; best = n; }
            }
            return best;
        };
        const rawProstory = Array.isArray(data && data.prostory) ? data.prostory : [];
        for (const rp of rawProstory) {
            // Reload z engine toJSON: přímo vertices s refNodeId / x, y.
            // Při reloadu zkusíme re-snap fixních vrcholů na blízký wall node —
            // retroaktivní oprava starých projektů uložených před zvětšením
            // import tolerance (kde vrcholy mírně mimo uzel zůstaly fixed).
            if (Array.isArray(rp.vertices) && rp.vertices.length >= 3) {
                stareProstory.push({
                    id: rp.id, nazev: rp.nazev, typ: rp.typ, podtyp: rp.podtyp,
                    venkovni: !!rp.venkovni,
                    vertices: rp.vertices.map(v => {
                        if (!v.refNodeId && !(v.wallA && v.wallB) && typeof v.x === 'number') {
                            const refNode = findRefNode(v.x, v.y);
                            if (refNode) return { refNodeId: refNode.id };
                        }
                        return { ...v };
                    }),
                });
                const pnum2 = parseInt(String(rp.id).replace(/\D/g, ''));
                if (pnum2 >= this.nextId) this.nextId = pnum2 + 1;
                continue;
            }
            // První import z parseru: polygon v metrech.
            // Pro každý vertex najdi 2 zdi, jejichž vnitřní povrch se protíná
            // u této pozice → uložíme "recept" (wallRefs). Pozice se pak při
            // renderu počítá jako průsečík povrchů, takže místnost reaguje
            // na pohyb zdí.
            if (!rp.polygon || rp.polygon.length < 3) continue;
            const vertices = [];
            // Přibližná "středová pozice" místnosti pro určení strany povrchu
            let centroidX = 0, centroidY = 0;
            for (const pt of rp.polygon) {
                centroidX += pt[0] * this.PX_PER_M;
                centroidY += -pt[1] * this.PX_PER_M;
            }
            centroidX /= rp.polygon.length;
            centroidY /= rp.polygon.length;
            for (const pt of rp.polygon) {
                const x = pt[0] * this.PX_PER_M;
                const y = -pt[1] * this.PX_PER_M;
                // PRIO 1: blízký wall node → refNodeId. Vrchol pak živě sleduje
                // pohyb uzlu (a tím i jakékoliv stěny napojené na uzel).
                // Nejvíc spolehlivé pro rohové vrcholy místnosti.
                const refNode = findRefNode(x, y);
                if (refNode) {
                    vertices.push({ refNodeId: refNode.id });
                    continue;
                }
                // PRIO 2: wallA+wallB (průsečík vnitřních povrchů dvou zdí)
                const candidates = [];
                for (const w of this.walls.values()) {
                    const na = this.nodes.get(w.nodeA);
                    const nb = this.nodes.get(w.nodeB);
                    if (!na || !nb) continue;
                    const wdx = nb.x - na.x, wdy = nb.y - na.y;
                    const wL = Math.hypot(wdx, wdy);
                    if (wL < 1) continue;
                    const halfThk = (w.tloustka * this.PX_PER_M) / 2;
                    // Signed perp distance from point to wall axis
                    const perpSigned = ((x - na.x) * (-wdy) + (y - na.y) * wdx) / wL;
                    const absPerpDelta = Math.abs(Math.abs(perpSigned) - halfThk);
                    if (absPerpDelta > 3.0) continue;
                    // Along t
                    const t = ((x - na.x) * wdx + (y - na.y) * wdy) / (wL * wL);
                    if (t < -0.05 || t > 1.05) continue;
                    candidates.push({
                        wallId: w.id,
                        side: perpSigned >= 0 ? 1 : -1,  // která strana axis (sign)
                        perpDelta: absPerpDelta,
                        dir: [wdx / wL, wdy / wL],
                    });
                }
                candidates.sort((a, b) => a.perpDelta - b.perpDelta);
                // Vyber 2 ne-rovnoběžné zdi
                let chosenA = null, chosenB = null;
                for (const c of candidates) {
                    if (!chosenA) { chosenA = c; continue; }
                    const cos = Math.abs(chosenA.dir[0] * c.dir[0] + chosenA.dir[1] * c.dir[1]);
                    if (cos < 0.95) { chosenB = c; break; }
                }
                if (chosenA && chosenB) {
                    vertices.push({
                        wallA: chosenA.wallId, sideA: chosenA.side,
                        wallB: chosenB.wallId, sideB: chosenB.side,
                        fallbackX: x, fallbackY: y,
                    });
                } else {
                    // Žádné zdi poblíž — virtuální vrchol (open-plan)
                    vertices.push({ x, y });
                }
            }
            stareProstory.push({
                id: rp.id,
                nazev: rp.nazev,
                typ: rp.typ,
                podtyp: rp.podtyp,
                venkovni: !!rp.venkovni,
                vertices,
            });
            const pnum = parseInt(String(rp.id).replace(/\D/g, ''));
            if (pnum >= this.nextId) this.nextId = pnum + 1;
        }

        // Vybavení (nábytek) — drží se v metrech (output.json formát).
        // pudorys-icons.createFurnitureShape si převede na canvas px sám (× PX_PER_M).
        const rawVybaveni = Array.isArray(data && data.vybaveni) ? data.vybaveni : [];
        for (const rv of rawVybaveni) {
            this.vybaveni.push({
                id: rv.id,
                typ: rv.typ,
                podtyp: rv.podtyp ?? null,
                kategorie: rv.kategorie ?? null,
                stred: rv.stred ? [rv.stred[0], rv.stred[1]] : null,
                polygon: Array.isArray(rv.polygon) ? rv.polygon.map(p => [p[0], p[1]]) : null,
                sirka: rv.sirka,
                hloubka: rv.hloubka,
                uhel: rv.uhel ?? 0,
                vyska: rv.vyska ?? null,
                tvar: rv.tvar ?? null,
                zadni_strana: rv.zadni_strana ?? null,
                katalog: rv.katalog ?? null,
                ...nazevKusuKatalogu(rv),
                uroven: rv.uroven ?? 0,
                zaklad: rv.zaklad ?? null,
                ...(rv.barva ? { barva: rv.barva } : {}),
            });
            const vnum = parseInt(String(rv.id).replace(/\D/g, ''));
            if (vnum >= this.nextId) this.nextId = vnum + 1;
        }

        // Jména starých prostorů přejdou na kotvy místností (těžiště polygonu), plochu už počítá rastr.
        // Musí to být před sjednocením id stěn, vrcholy odkazují na stěny původními id.
        if (this.mistnosti.length === 0 && stareProstory.length > 0) {
            for (const p of stareProstory) {
                if (p.venkovni) continue;
                const body = (p.vertices || []).map(v => this.getProstorVertexPx(v)).filter(Boolean);
                if (body.length < 3) continue;
                const kotva = { x: body.reduce((a, b) => a + b.x, 0) / body.length, y: body.reduce((a, b) => a + b.y, 0) / body.length };
                this.mistnosti.push({ id: this._id('M'), nazev: String(p.nazev || p.typ || ''), ...(DRUH_Z_IMPORTU[p.typ] ? { druh: DRUH_Z_IMPORTU[p.typ] } : {}), barva: PALETA_MISTNOSTI[this.mistnosti.length % PALETA_MISTNOSTI.length], kotva });
            }
        }

        // Starší koncepty se opraví samy při otevření — viz obě metody níž.
        // POŘADÍ: kontrola vazeb musí být PŘED srovnáváním. Srovnání nesmyslnou
        // vazbu jinak vynutí a odtáhne uzel přes půl domu (Na bělidle: W53 se
        // načetlo navázané na čelo W96 půl metru daleko a srovnání ji tam
        // doopravdy přesunulo).
        this.sjednotIdSten();
        this.opravVisiciVazby();

        // Napojení „I" se změnou tloušťky odemknout na klouzavé po čele.
        // Poloha se nemění, jen jde nově srovnat na líc. Platí i pro stěny
        // z importu a z AI — ty vznikají automaticky a mají stejný problém.
        this.oddelVsechnaCelaNapojeni();
        this.srovnejPrickyNaLic();
        this.srovnejCelaNaRoh();

        // UI se dozví o změně kresby (Zpět, historie, přepnutí podlaží); dočasné enginy hook nemají
        if (this.poNacteni) this.poNacteni();
    }

    /**
     * Sjednotí id stěn na prefix W.
     *
     * Stěna založená kreslením dostávala „S", stěna vzniklá rozdělením „W“.
     * V jednom konceptu tak byly dvě řady a podle id nešlo poznat, co je co
     * (Klemov: S36 a W32 jsou obojí příčky).
     *
     * @returns {number} kolik stěn se přejmenovalo
     */
    sjednotIdSten() {
        const obsazena = new Set(this.walls.keys());
        const prejmenovat = new Map();
        for (const id of this.walls.keys()) {
            const m = /^S(\d+)$/.exec(id);
            if (!m) continue;
            let novy = 'W' + m[1];
            // Kdyby W s tímtéž číslem existovalo, vezme se další volné id.
            while (obsazena.has(novy)) novy = this._id('W');
            obsazena.add(novy);
            prejmenovat.set(id, novy);
        }
        if (!prejmenovat.size) return 0;

        const nove = new Map();
        for (const [id, w] of this.walls) {
            const novy = prejmenovat.get(id) || id;
            w.id = novy;
            nove.set(novy, w);
        }
        this.walls = nove;

        for (const w of this.walls.values()) {
            for (const c of [w.odConstraint, w.doConstraint]) {
                if (c && prejmenovat.has(c.host)) c.host = prejmenovat.get(c.host);
            }
        }
        for (const op of this.openings.values()) {
            if (prejmenovat.has(op.wallId)) op.wallId = prejmenovat.get(op.wallId);
        }

        return prejmenovat.size;
    }

    /**
     * Opraví vazby, které ukazují na už neexistující stěnu.
     *
     * Mazání stěny dřív vazby dětí nerušilo, takže zůstaly viset na mrtvém id.
     * Ve výkrese to vypadá napojeně, ale getTChildren dítě pod skutečným
     * hostitelem nenajde — při pohybu se nevveze ani neprodlouží. Nalezeno
     * na třech konceptech: W32→W67 (Klemov), W8→S49 (Křemelná), S25→S19
     * (Na bělidle).
     *
     * Pokud pod napojeným koncem nějaká stěna leží, vazba se na ni přepojí
     * (to uživatel čekal). Když tam není nic, vazba se zruší — konec je volný.
     *
     * @returns {{prepojeno: number, zruseno: number}}
     */
    opravVisiciVazby() {
        const dosah = 0.25 * this.PX_PER_M;      // půlka nejtlustší zdi se vejde
        const vule = this.MAGNET_DIST / 2;       // co projde jako „u sebe"
        let prepojeno = 0, zruseno = 0, osvezeno = 0;

        for (const w of this.walls.values()) {
            for (const kde of ['odConstraint', 'doConstraint']) {
                const c = w[kde];
                if (!c) continue;
                const uzelId = kde === 'odConstraint' ? w.nodeA : w.nodeB;
                const uzel = this.nodes.get(uzelId);

                // a) hostitel už neexistuje — přepojit na to, co pod koncem leží
                if (!this.walls.has(c.host)) {
                    const kandidat = uzel ? this.findSnapCandidate(uzel.x, uzel.y, dosah, uzelId) : null;
                    if (kandidat) {
                        w[kde] = { host: kandidat.wall.id, t: kandidat.t };
                        prepojeno++;
                    } else {
                        w[kde] = null;
                        zruseno++;
                    }
                    continue;
                }

                // b) hostitel existuje, ale konec u něj vůbec neleží
                if (!uzel) { w[kde] = null; zruseno++; continue; }
                const stav = this.stavVazby(w, kde, vule);
                if (!stav || !stav.drzi) { w[kde] = null; zruseno++; continue; }

                // c) uložené t neodpovídá poloze uzlu — přepsat podle geometrie,
                //    jinak dítě při prvním pohnutí hostitelem uskočí
                if (stav.t !== null && Math.abs(stav.t - c.t) > 1e-6) { c.t = stav.t; osvezeno++; }
            }
        }

        return { prepojeno, zruseno, osvezeno };
    }

    /**
     * Drží vazba geometricky? Porovná uloženou polohu konce s hostitelem.
     *
     * Vazba je jen metadata; podle nich dítě při každém pohybu hostitele skáče.
     * Když si ta dvě data odporují (konec leží půl metru jinde, než vazba tvrdí),
     * je vazba zbytek po dřívější úpravě a nesmí se vynucovat — jinak se svážou
     * stěny, které spolu vůbec nesousedí (hlášeno na Na bělidle: W53 + W96).
     *
     * @param {object} w     stěna s vazbou
     * @param {string} kde   'odConstraint' | 'doConstraint'
     * @param {number} vule  dovolená odchylka v px
     * @returns {?{drzi: boolean, t: ?number}}  t = poloha podél hostitele
     *          dopočítaná z geometrie (jen u klouzavé vazby, jinak null)
     */
    stavVazby(w, kde, vule = this.MAGNET_DIST / 2) {
        const c = w[kde];
        if (!c) return null;
        const host = this.walls.get(c.host);
        const uzel = this.nodes.get(kde === 'odConstraint' ? w.nodeA : w.nodeB);
        if (!host || !uzel) return null;
        const ha = this.nodes.get(host.nodeA), hb = this.nodes.get(host.nodeB);
        if (!ha || !hb) return null;
        const dx = hb.x - ha.x, dy = hb.y - ha.y;
        const L = Math.hypot(dx, dy);
        if (!L) return null;

        // Dovolené odsazení od osy hostitele: konec sedí na jeho líci, u tenčí
        // stěny ještě o vlastní polotloušťku vedle. Plus vůle na nepřesnosti.
        const bokem = ((host.tloustka || 0) + (w.tloustka || 0)) / 2 * this.PX_PER_M + vule;

        if (c.konec) {
            // Napojení „I" — konec musí ležet v čele hostitele.
            const celo = this.celoHostitele(host.id, c.konec, w.tloustka);
            if (!celo) return { drzi: false, t: null };
            const venX = (c.konec === 'A' ? -dx : dx) / L;
            const venY = (c.konec === 'A' ? -dy : dy) / L;
            const ox = uzel.x - celo.stred.x, oy = uzel.y - celo.stred.y;
            const podel = ox * venX + oy * venY;              // před/za čelem
            const napric = ox * celo.kolmice.x + oy * celo.kolmice.y;
            return { drzi: Math.abs(podel) <= this.MAGNET_DIST && Math.abs(napric) <= bokem, t: null };
        }

        // Klouzavá vazba — konec musí ležet u osy hostitele a v délce jeho líců
        // (vnější líc v rohu přesahuje uzel, konec tam smí být i za ním).
        const t = ((uzel.x - ha.x) * dx + (uzel.y - ha.y) * dy) / (L * L);
        const napric = Math.abs(((uzel.x - ha.x) * -dy + (uzel.y - ha.y) * dx) / L);
        const vuleT = vule / L;
        const lic = this.rozsahLice(host.id);
        return { drzi: napric <= bokem && t >= lic.od - vuleT && t <= lic.do + vuleT, t };
    }

    /**
     * Kudy vede líc stěny podél její osy — v t (0 = uzel A, 1 = uzel B).
     * V rohu líc nekončí v uzlu: vnější přesahuje za něj (t < 0 nebo > 1),
     * vnitřní končí dřív. Bere se ze skutečného obrysu (getWallPolygon).
     *
     * @param {number} strana  +1 / −1 = líc na straně normály (−dy, dx) / opačné,
     *        0 = celkový rozsah obou líců
     * @returns {{od: number, do: number}}
     */
    rozsahLice(wallId, strana = 0) {
        const w = this.walls.get(wallId);
        const a = w && this.nodes.get(w.nodeA), b = w && this.nodes.get(w.nodeB);
        const poly = w ? this.getWallPolygon(wallId) : [];
        if (!a || !b || poly.length !== 4) return { od: 0, do: 1 };
        const dx = b.x - a.x, dy = b.y - a.y;
        const L2 = dx * dx + dy * dy;
        if (!L2) return { od: 0, do: 1 };
        const t = (p) => ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2;
        // poly = [a1, b1, b2, a2]; a1–b1 leží na straně +normály
        const plus = [t(poly[0]), t(poly[1])], minus = [t(poly[3]), t(poly[2])];
        const body = strana > 0 ? plus : strana < 0 ? minus : [...plus, ...minus];
        return { od: Math.min(...body), do: Math.max(...body) };
    }

    /**
     * Kam až smí po líci hostitele dojet uzel stěny napojené na okraj.
     *
     * Čelo napojené stěny je zkosené podél líce (getWallPolygon), takže na líci
     * zabírá polotloušťku / sin(úhel) na každou stranu od uzlu — u šikmé stěny
     * víc než u kolmé. Mez je tam, kde se okraj čela dotkne konce líce.
     * Dřív platila pevná 2 % délky hostitele od konců: u 12m zdi 24 cm, a šikmá
     * stěna nešla dorazit do rohu (Klemov W64 na W3).
     *
     * Střih (uzel na ose) hostitele dělí, takže zůstává uvnitř stěny.
     *
     * @param {number} perpOff  odsazení uzlu od osy hostitele (px, znaménko = strana)
     * @param {{x,y}} smer      jednotkový směr napojené stěny (od uzlu k druhému konci)
     * @param {number} polotlPx polotloušťka napojené stěny v px
     * @returns {{od: number, do: number}} rozsah t
     */
    rozsahNapojeni(hostId, perpOff, smer, polotlPx) {
        const host = this.walls.get(hostId);
        const a = host && this.nodes.get(host.nodeA), b = host && this.nodes.get(host.nodeB);
        if (!a || !b) return { od: 0.02, do: 0.98 };
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.hypot(dx, dy);
        const polotlHost = (host.tloustka || 0) / 2 * this.PX_PER_M;
        if (!L || Math.abs(perpOff) < polotlHost / 2) return { od: 0.02, do: 0.98 };

        const lic = this.rozsahLice(hostId, Math.sign(perpOff));
        const sin = smer ? Math.abs((dx * smer.y - dy * smer.x) / L) : 1;
        // Skoro rovnoběžná stěna by měla stopu nekonečnou — tam se čelo
        // stejně nezkosí (limit v getWallPolygon), počítá se jako kolmá.
        const stopa = (sin > 0.2 ? polotlPx / sin : polotlPx) / L;
        const od = lic.od + stopa, d = lic.do - stopa;
        return od <= d ? { od, do: d } : { od: (od + d) / 2, do: (od + d) / 2 };
    }

    /** Pozice vertexu v px. Počítáno podle typu vrcholu:
     *  - refNodeId: live pozice wall uzlu
     *  - wallA/wallB: průsečík vnitřních povrchů dvou zdí (sleduje jejich pohyb)
     *  - x,y: fixní souřadnice (virtuální vrchol)
     */
    getProstorVertexPx(v) {
        if (v.refNodeId) {
            const n = this.nodes.get(v.refNodeId);
            return n ? { x: n.x, y: n.y } : null;
        }
        if (v.wallA && v.wallB) {
            const wA = this.walls.get(v.wallA);
            const wB = this.walls.get(v.wallB);
            if (wA && wB) {
                const aA = this.nodes.get(wA.nodeA), bA = this.nodes.get(wA.nodeB);
                const aB = this.nodes.get(wB.nodeA), bB = this.nodes.get(wB.nodeB);
                if (aA && bA && aB && bB) {
                    const result = this._intersectWallSurfaces(aA, bA, wA.tloustka * this.PX_PER_M / 2, v.sideA, aB, bB, wB.tloustka * this.PX_PER_M / 2, v.sideB);
                    if (result) return result;
                }
            }
            // Fallback na uloženou pozici
            if (typeof v.fallbackX === 'number') return { x: v.fallbackX, y: v.fallbackY };
        }
        return { x: v.x, y: v.y };
    }

    /** Průsečík vnitřních povrchů dvou zdí. Každý povrch = osa posunutá
     *  o half_thk × side (perpendikulárně). Vrací null pro rovnoběžné.
     */
    _intersectWallSurfaces(a1, b1, h1, s1, a2, b2, h2, s2) {
        const d1x = b1.x - a1.x, d1y = b1.y - a1.y;
        const L1 = Math.hypot(d1x, d1y);
        if (L1 < 1) return null;
        const n1x = -d1y / L1 * s1, n1y = d1x / L1 * s1;
        const p1x = a1.x + n1x * h1, p1y = a1.y + n1y * h1;
        const d2x = b2.x - a2.x, d2y = b2.y - a2.y;
        const L2 = Math.hypot(d2x, d2y);
        if (L2 < 1) return null;
        const n2x = -d2y / L2 * s2, n2y = d2x / L2 * s2;
        const p2x = a2.x + n2x * h2, p2y = a2.y + n2y * h2;
        // Průsečík přímek P1 + t * D1 a P2 + u * D2
        const det = d1x * (-d2y) - d1y * (-d2x);
        if (Math.abs(det) < 1e-6) return null;
        const t = ((p2x - p1x) * (-d2y) - (p2y - p1y) * (-d2x)) / det;
        return { x: p1x + t * d1x, y: p1y + t * d1y };
    }

    // ─── QUERIES ───────────────────────────────────────
    getWallLength(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return 0;
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return 0;
        return Math.hypot(nB.x - nA.x, nB.y - nA.y) / this.PX_PER_M;
    }

    getWallAngle(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return 0;
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return 0;
        return Math.atan2(nB.y - nA.y, nB.x - nA.x);
    }

    getWallCenter(wallId) {
        const wall = this.walls.get(wallId);
        if (!wall) return { x: 0, y: 0 };
        const nA = this.nodes.get(wall.nodeA);
        const nB = this.nodes.get(wall.nodeB);
        if (!nA || !nB) return { x: 0, y: 0 };
        return { x: (nA.x + nB.x) / 2, y: (nA.y + nB.y) / 2 };
    }

    /** Najdi stěnu nejbližší bodu (pro kliknutí) */
    findWallAt(x, y, maxDist = 20) {
        let best = null;
        let bestDist = maxDist;

        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;

            const dist = this._pointToSegmentDist(x, y, nA.x, nA.y, nB.x, nB.y);
            const tl = wall.tloustka * this.PX_PER_M / 2;

            if (dist < tl + 5 && dist < bestDist) {
                bestDist = dist;
                best = wall;
            }
        }
        return best;
    }

    /** Najdi node nejbližší bodu */
    findNodeAt(x, y, maxDist = 15) {
        let best = null;
        let bestDist = maxDist;

        for (const node of this.nodes.values()) {
            const dist = Math.hypot(x - node.x, y - node.y);
            if (dist < bestDist) {
                bestDist = dist;
                best = node;
            }
        }
        return best;
    }

    _pointToSegmentDist(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - x1, py - y1);

        let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = x1 + t * dx;
        const projY = y1 + t * dy;
        return Math.hypot(px - projX, py - projY);
    }

    /** Vrátí stěny jejichž OBA konce leží uvnitř obdélníku */
    findInRect(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2), maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2), maxY = Math.max(y1, y2);

        const walls = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            if (nA.x >= minX && nA.x <= maxX && nA.y >= minY && nA.y <= maxY &&
                nB.x >= minX && nB.x <= maxX && nB.y >= minY && nB.y <= maxY) {
                walls.push(wall);
            }
        }
        return walls;
    }

    /** Vrátí stěny jejichž OBA konce leží uvnitř polygonu (4 rohy screen obdélníku v world space) */
    findInPolygon(corners) {
        const walls = [];
        for (const wall of this.walls.values()) {
            const nA = this.nodes.get(wall.nodeA);
            const nB = this.nodes.get(wall.nodeB);
            if (!nA || !nB) continue;
            if (this._pointInPolygon(nA.x, nA.y, corners) && this._pointInPolygon(nB.x, nB.y, corners)) {
                walls.push(wall);
            }
        }
        return walls;
    }

    _pointInPolygon(px, py, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;
            if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
                inside = !inside;
            }
        }
        return inside;
    }

    /** Vrátí stats pro panel objektů */
    getObjectList() {
        // Řádek vede označení z výkresu (W3, D56), výchozí název je jen typ.
        // Dřív tu bylo pořadové číslo („Obvodová stěna 1“), které s označením
        // ve výkrese nesouviselo — W3 se v seznamu nedala najít.
        const list = [];
        for (const wall of this.walls.values()) {
            const delka = this.getWallLength(wall.id);
            const typDef = TYPY_STEN[wall.typ] || {};
            list.push({
                id: wall.id,
                type: 'wall',
                wallTyp: wall.typ,
                nazev: wall.nazev || typDef.nazev || wall.typ,
                info: delka.toFixed(1) + 'm · ' + (wall.tloustka * 100).toFixed(0) + 'cm',
            });
        }
        for (const opening of this.openings.values()) {
            const otvorDef = TYPY_OTVORU[opening.typ] || {};
            list.push({
                id: opening.id,
                type: 'opening',
                nazev: opening.nazev || otvorDef.nazev || opening.typ,
                info: (Math.round((opening.sirka || 0) * 100) / 100) + ' m',
            });
        }
        for (const v of this.vybaveni || []) {
            list.push({
                id: v.id,
                type: 'kus',
                oznaceni: StavebniEngine.oznaceniKusu(v),
                nazev: v.nazev || v.typ || '',
                info: Math.round((v.sirka || 0) * 100) + ' × ' + Math.round((v.hloubka || 0) * 100) + ' cm',
            });
        }
        // Schodiště patří domu, v seznamu jsou ta, která vedou z aktivního podlaží nebo do něj
        const aktivni = this.dum?.aktivni;
        for (const st of this.dum?.schodiste || []) {
            if (st.odPodlazi !== aktivni && st.doPodlazi !== aktivni) continue;
            const od = this.podlaziPodleId(st.odPodlazi)?.nazev || '', kam = this.podlaziPodleId(st.doPodlazi)?.nazev || '';
            list.push({ id: st.id, type: 'schody', nazev: tx('ed_dum.krok.schodiste'), info: od === kam ? od : od + ' → ' + kam });
        }
        for (const s of this.dum?.sloupy || []) {
            if (s.podlazi !== aktivni) continue;
            const cm = Math.round((s.sirka || 0.2) * 100);
            list.push({ id: s.id, type: 'sloup', nazev: tx('ed_dum.sloup'), info: s.tvar === 'kruh' ? '⌀ ' + cm + ' cm' : cm + ' × ' + cm + ' cm' });
        }
        // Stěny před otvory, pak podle označení: písmena (D, O…) a číslo
        // číselně (W2 před W10) — ať se v seznamu hledá stejně jako ve výkrese.
        const cislo = (id) => parseInt(String(id).replace(/\D+/g, ''), 10) || 0;
        const pismena = (id) => String(id).replace(/\d+/g, '');
        const poradi = { wall: 0, opening: 1, kus: 2, schody: 3, sloup: 4 };
        list.sort((a, b) => poradi[a.type] - poradi[b.type]
            || pismena(a.id).localeCompare(pismena(b.id)) || cislo(a.id) - cislo(b.id));
        return list;
    }
}

// Export pro použití v prohlížeči
if (typeof window !== 'undefined') {
    window.StavebniEngine = StavebniEngine;
    window.TYPY_STEN = TYPY_STEN;
    window.TYPY_OTVORU = TYPY_OTVORU;
    window.TYPY_PLOCH = TYPY_PLOCH;
    window.TYPY_STRECHY = TYPY_STRECHY;
    window.TYPY_PRISLUSENSTVI = TYPY_PRISLUSENSTVI;
    // Křídla, výška a parapet otvoru — sdílí je 2D renderer, inspektor i 3D
    window.TYPY_KRIDEL = TYPY_KRIDEL;
    window.PALETA_MISTNOSTI = PALETA_MISTNOSTI;
    window.DRUHY_MISTNOSTI = DRUHY_MISTNOSTI;
    window.SKUPINY_MISTNOSTI = SKUPINY_MISTNOSTI;
    window.skupinaDruhu = skupinaDruhu;
    window.kridlaOtvoru = kridlaOtvoru;
    window.nastavPocetKridel = nastavPocetKridel;
    window.pocetKridelVolby = pocetKridelVolby;
    window.zmenSirkuKridel = zmenSirkuKridel;
    window.smerZKridel = smerZKridel;
    window.zrcadliKridla = zrcadliKridla;
    window.normalizujKridlo = normalizujKridlo;
    window.smerPosunuKridla = smerPosunuKridla;
    window.kridloPanty = kridloPanty;
    window.kridloSklopne = kridloSklopne;
    window.vyskaOtvoru = vyskaOtvoru;
    window.parapetOtvoru = parapetOtvoru;
    window.parapetKridla = parapetKridla;
    window.vrsekOtvoru = vrsekOtvoru;
    window.minParapetOtvoru = minParapetOtvoru;
    window.posunParapetOtvoru = posunParapetOtvoru;
    window.nastavParapetKridla = nastavParapetKridla;
}

// Export pro Node.js (testovací skripty)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        StavebniEngine,
        TYPY_STEN,
        TYPY_OTVORU,
        TYPY_PLOCH,
        TYPY_STRECHY,
        TYPY_PRISLUSENSTVI,
        TYPY_KRIDEL,
        kridlaOtvoru,
        nastavPocetKridel,
        pocetKridelVolby,
        zmenSirkuKridel,
        smerZKridel,
        zrcadliKridla,
        normalizujKridlo,
        smerPosunuKridla,
        kridloPanty,
        kridloSklopne,
        vyskaOtvoru,
        parapetOtvoru,
        parapetKridla,
        vrsekOtvoru,
        minParapetOtvoru,
        posunParapetOtvoru,
        nastavParapetKridla,
    };
}
