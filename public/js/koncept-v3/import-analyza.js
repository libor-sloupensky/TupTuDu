/**
 * Analýza výkresu → osy stěn (Koncept V3, import půdorysu).
 *
 * Běží v prohlížeči (Web Worker) i v Node testech — žádné DOM API.
 * Vstupem je SVG vygenerované z PDF, výstupem osy stěn v metrech.
 *
 * Postup:
 *   1. SVG → úsečky (s transformacemi, s tloušťkou pera a výplní)
 *   2. seskupení podle stylu kreslení (pero/výplň) — stěny mají v CAD svůj styl
 *   3. v každé skupině: dvojice rovnoběžných hran ve vzdálenosti tloušťky stěny → osa
 *   4. ohodnocení skupin, aby šly uživateli nabídnout nejslibnější varianty
 *
 * Rozpoznání NENÍ jistota — uživatel vybírá z nabídnutých variant a výsledek
 * pak upravuje v editoru.
 */
(function (globalni) {
    'use strict';

    // ─── Matice 2×3 (a, b, c, d, e, f) ──────────────────────
    function nasobMatice(m, n) {
        return [
            m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
            m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
            m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
        ];
    }

    function aplikujMatici(m, x, y) {
        return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
    }

    function parsujTransformaci(text) {
        let m = [1, 0, 0, 1, 0, 0];
        const re = /(matrix|translate|scale|rotate)\s*\(([^)]*)\)/g;
        let t;
        while ((t = re.exec(text)) !== null) {
            const c = (t[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);
            let k;
            if (t[1] === 'matrix') k = c.slice(0, 6);
            else if (t[1] === 'translate') k = [1, 0, 0, 1, c[0] || 0, c[1] || 0];
            else if (t[1] === 'scale') k = [c[0] || 1, 0, 0, c.length > 1 ? c[1] : c[0], 0, 0];
            else {
                const r = (c[0] || 0) * Math.PI / 180;
                k = [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
            }
            m = nasobMatice(m, k);
        }
        return m;
    }

    /**
     * SVG → úsečky v souřadnicích stránky (body PDF).
     * Vrací pole {x1,y1,x2,y2,sw,fill,stroke,vyplnene}.
     */
    function extrahujUsecky(svgText) {
        // <defs> obsahuje glyfy písma a vzory šraf — ty nejsou kresba.
        const konecDefs = svgText.lastIndexOf('</defs>');
        const telo = konecDefs > 0 ? svgText.slice(konecDefs) : svgText;

        const usecky = [];
        const krivky = [];          // Bézierovy křivky zvlášť — viz zpracování 'C'
        let citacObrysu = 0;
        const zasobnik = [{ m: [1, 0, 0, 1, 0, 0], sw: 0, fill: 'none', stroke: 'none' }];
        const re = /<g\b([^>]*)>|<\/g>|<path\b([^>]*?)\/>/g;
        let zaznam;

        while ((zaznam = re.exec(telo)) !== null) {
            const vrchol = zasobnik[zasobnik.length - 1];
            if (zaznam[0] === '</g>') {
                if (zasobnik.length > 1) zasobnik.pop();
                continue;
            }

            const jeSkupina = zaznam[1] !== undefined;
            const atributy = jeSkupina ? zaznam[1] : zaznam[2];
            const atr = (nazev) => {
                const a = atributy.match(new RegExp('\\s' + nazev + '="([^"]*)"'));
                if (a) return a[1];
                const s = atributy.match(new RegExp('[;"\\s]' + nazev + ':\\s*([^;"]+)'));
                return s ? s[1].trim() : null;
            };

            const transformace = atr('transform');
            const stav = {
                m: transformace ? nasobMatice(vrchol.m, parsujTransformaci(transformace)) : vrchol.m,
                sw: atr('stroke-width') !== null ? parseFloat(atr('stroke-width')) : vrchol.sw,
                fill: atr('fill') !== null ? atr('fill') : vrchol.fill,
                stroke: atr('stroke') !== null ? atr('stroke') : vrchol.stroke,
            };

            if (jeSkupina) {
                zasobnik.push(stav);
                continue;
            }

            const d = atr('d') || '';
            if (!d) continue;

            const meritkoMatice = Math.sqrt(Math.abs(stav.m[0] * stav.m[3] - stav.m[1] * stav.m[2])) || 1;
            const vyplnene = stav.fill && stav.fill !== 'none' && stav.fill !== 'transparent';
            const spolecne = {
                sw: (stav.sw || 0) * meritkoMatice,
                fill: vyplnene ? stav.fill : 'none',
                stroke: stav.stroke,
                vyplnene: !!vyplnene,
            };

            let cx = 0, cy = 0, zx = 0, zy = 0, pX = 0, pY = 0, mame = false;
            const reCast = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
            let cast;
            // Každý podtah (M…Z) je vlastní obrys. U vyplněných ploch je to
            // typicky jedna stěna — líce téže stěny pak mají stejné číslo.
            spolecne.obrys = ++citacObrysu;
            while ((cast = reCast.exec(d)) !== null) {
                const prikaz = cast[1];
                const absolutne = prikaz === prikaz.toUpperCase();
                const K = prikaz.toUpperCase();
                const c = (cast[2].match(/-?\d*\.?\d+(?:e-?\d+)?/g) || []).map(Number);

                const naBod = (nx, ny, kresli) => {
                    const [X, Y] = aplikujMatici(stav.m, nx, ny);
                    if (kresli && mame) usecky.push({ x1: pX, y1: pY, x2: X, y2: Y, ...spolecne });
                    pX = X; pY = Y; cx = nx; cy = ny; mame = true;
                };

                if (K === 'M') {
                    for (let i = 0; i + 1 < c.length; i += 2) {
                        const nx = absolutne ? c[i] : cx + c[i];
                        const ny = absolutne ? c[i + 1] : cy + c[i + 1];
                        if (i === 0) { spolecne.obrys = ++citacObrysu; zx = nx; zy = ny; }
                        naBod(nx, ny, i > 0);          // druhý a další pár už je jako L
                    }
                } else if (K === 'L') {
                    for (let i = 0; i + 1 < c.length; i += 2) {
                        naBod(absolutne ? c[i] : cx + c[i], absolutne ? c[i + 1] : cy + c[i + 1], true);
                    }
                } else if (K === 'H') {
                    for (const v of c) naBod(absolutne ? v : cx + v, cy, true);
                } else if (K === 'V') {
                    for (const v of c) naBod(cx, absolutne ? v : cy + v, true);
                } else if (K === 'Z') {
                    if (mame) naBod(zx, zy, true);
                } else if (K === 'C' && c.length >= 6) {
                    // Kubická křivka. NEZPLOŠŤUJE se do úseček — jen oblouků
                    // dveří je na výkrese přes 25 000 a vstup by se nafoukl
                    // dvacetinásobně. Ukládá se stranou, s řídicími body,
                    // takže se z ní dá poznat oblouk (dveřní křídlo).
                    for (let i = 0; i + 5 < c.length; i += 6) {
                        const b = [];
                        for (let k = 0; k < 6; k += 2) {
                            b.push(absolutne ? c[i + k] : cx + c[i + k],
                                   absolutne ? c[i + k + 1] : cy + c[i + k + 1]);
                        }
                        const [r1x, r1y] = aplikujMatici(stav.m, b[0], b[1]);
                        const [r2x, r2y] = aplikujMatici(stav.m, b[2], b[3]);
                        const [kx, ky] = aplikujMatici(stav.m, b[4], b[5]);
                        const [zx0, zy0] = aplikujMatici(stav.m, cx, cy);
                        krivky.push({
                            x1: zx0, y1: zy0, r1x, r1y, r2x, r2y, x2: kx, y2: ky, ...spolecne,
                        });
                        pX = kx; pY = ky; cx = b[4]; cy = b[5]; mame = true;
                    }
                } else if (c.length >= 2) {
                    // ostatní typy křivek (v poppleru se nevyskytují) — jen přesun
                    naBod(absolutne ? c[c.length - 2] : cx + c[c.length - 2],
                        absolutne ? c[c.length - 1] : cy + c[c.length - 1], false);
                }
            }
        }

        // křivky se vezou s úsečkami, ať se nemusí měnit všichni volající
        usecky.krivky = krivky;
        return usecky;
    }

    // ═══════════════════════════════════════════════════════
    // OBRYS DOMU (obkreslený uživatelem)
    // ═══════════════════════════════════════════════════════

    /** Leží bod uvnitř mnohoúhelníku? (ray casting) */
    function vPolygonu(x, y, polygon) {
        let uvnitr = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
            const protina = (yi > y) !== (yj > y)
                && x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-9) + xi;
            if (protina) uvnitr = !uvnitr;
        }
        return uvnitr;
    }

    /** Vzdálenost bodu od obvodu mnohoúhelníku. */
    function vzdalenostOdObvodu(x, y, polygon) {
        let nej = Infinity;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const [x1, y1] = polygon[j], [x2, y2] = polygon[i];
            const dx = x2 - x1, dy = y2 - y1;
            const L2 = dx * dx + dy * dy || 1;
            let t = ((x - x1) * dx + (y - y1) * dy) / L2;
            t = Math.max(0, Math.min(1, t));
            nej = Math.min(nej, Math.hypot(x1 + dx * t - x, y1 + dy * t - y));
        }
        return nej;
    }

    /**
     * Ponechá jen kresbu uvnitř obrysu domu.
     * Tolerance pustí i vnější líc obvodové stěny, který leží přesně na obrysu.
     */
    function orezObrysem(usecky, polygon, tolerance = 2) {
        const uvnitr = (x, y) => vPolygonu(x, y, polygon) || vzdalenostOdObvodu(x, y, polygon) <= tolerance;
        return usecky.filter(u => uvnitr(u.x1, u.y1) && uvnitr(u.x2, u.y2));
    }

    /**
     * Z obkresleného obrysu (vnější líc) udělá obvodové stěny.
     *
     * Tloušťka se hledá v kresbě: k úseku obrysu se najde rovnoběžná čára uvnitř
     * domu. Když se nenajde, použije se výchozí tloušťka.
     */
    function obvodoveSteny(polygon, usecky, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;
        const vychozi = nast.tloustkaObvodu ?? 0.45;
        const minTl = nast.minTloustka ?? 0.075;
        const maxTl = nast.maxTloustkaObvodu ?? 0.8;

        // těžiště pro určení směru „dovnitř“
        const tx = polygon.reduce((s, p) => s + p[0], 0) / polygon.length;
        const ty = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;

        // 1. průchod: ke každému úseku obrysu posbírat VŠECHNY možné vnitřní líce.
        // Vybírat hned ten nejbližší se neosvědčilo — trefovalo to čáry uvnitř
        // stěny (omítka, izolace) a obvodová zeď pak vyšla jednou 16 a jinde 45 cm.
        const useky = [];
        for (let i = 0; i < polygon.length; i++) {
            const [x1, y1] = polygon[i];
            const [x2, y2] = polygon[(i + 1) % polygon.length];
            const dx = x2 - x1, dy = y2 - y1;
            const L = Math.hypot(dx, dy);
            if (L * mnb < 0.3) continue;

            // normála mířící dovnitř
            let nx = -dy / L, ny = dx / L;
            const sx = (x1 + x2) / 2, sy = (y1 + y2) / 2;
            if ((tx - sx) * nx + (ty - sy) * ny < 0) { nx = -nx; ny = -ny; }

            const kandidati = [];
            for (const u of usecky) {
                const ux = u.x2 - u.x1, uy = u.y2 - u.y1;
                const uL = Math.hypot(ux, uy);
                if (uL * mnb < 0.4) continue;
                let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(uy, ux)) % Math.PI;
                if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                if (rozdil > 4 * Math.PI / 180) continue;

                const odsazeni = (u.x1 - x1) * nx + (u.y1 - y1) * ny;    // kladné = dovnitř
                const tl = odsazeni * mnb;
                if (tl < minTl || tl > maxTl) continue;

                // musí ležet podél tohoto úseku obrysu
                const t = (px, py) => ((px - x1) * dx + (py - y1) * dy) / (L * L);
                const t1 = Math.min(t(u.x1, u.y1), t(u.x2, u.y2));
                const t2 = Math.max(t(u.x1, u.y1), t(u.x2, u.y2));
                const prekryv = Math.min(t2, 1) - Math.max(t1, 0);
                if (prekryv < 0.4) continue;

                kandidati.push({ tl, vaha: prekryv * L });
            }

            useky.push({ x1, y1, x2, y2, nx, ny, L, kandidati });
        }

        // 2. průchod: jakou tloušťku má obvodová konstrukce domu? Bere se ta,
        // která vychází podél největší části obrysu. Druhý shluk se připustí,
        // jen když je taky výrazný (přístavba, garáž bývá tenčí).
        const koše = new Map();
        for (const u of useky) {
            for (const k of u.kandidati) {
                const koš = Math.round(k.tl / 0.02);
                koše.set(koš, (koše.get(koš) || 0) + k.vaha);
            }
        }
        // sousední koše patří k sobě — tloušťka se měří s přesností na centimetry
        const shluk = new Map();
        for (const [koš, vaha] of koše) {
            for (let d = -1; d <= 1; d++) shluk.set(koš, (shluk.get(koš) || 0) + (koše.get(koš + d) || 0));
        }
        const poradi = [...shluk.entries()].sort((a, b) => b[1] - a[1]);
        const hlavni = poradi.length ? poradi[0][0] * 0.02 : vychozi;

        // Obvodová konstrukce domu je jedna — jedna tloušťka po celém obvodu.
        // Jiná tloušťka se uzná jen tam, kde je opravdu výrazná (přístavba).
        const stredy = [hlavni];
        for (const [koš, vaha] of poradi.slice(1)) {
            if (vaha < poradi[0][1] * 0.8) break;
            const tl = koš * 0.02;
            if (stredy.some(t => Math.abs(t - tl) < 0.1)) continue;
            stredy.push(tl);
        }

        // přesná hodnota shluku = vážený průměr čar, které do něj spadly
        const typicke = stredy.map(stred => {
            let suma = 0, vaha = 0;
            for (const u of useky) for (const k of u.kandidati) {
                if (Math.abs(k.tl - stred) > 0.03) continue;
                suma += k.tl * k.vaha; vaha += k.vaha;
            }
            return vaha ? suma / vaha : stred;
        });

        const steny = [];
        for (const u of useky) {
            // Tloušťka úseku = ten typický shluk, ke kterému má nejblíž.
            // Bere se hodnota shluku, ne jednotlivá čára — obvod tak drží
            // po celé délce stejnou tloušťku místo 16/28/30/45 cm.
            let tloustka = typicke[0], nejlepsi = Infinity;
            for (const k of u.kandidati) {
                for (const t of typicke) {
                    const odchylka = Math.abs(k.tl - t);
                    if (odchylka < nejlepsi && odchylka < 0.06) { nejlepsi = odchylka; tloustka = t; }
                }
            }

            // osa stěny = obrys posunutý dovnitř o půl tloušťky
            const posun = (tloustka / mnb) / 2;
            steny.push({
                x1: u.x1 + u.nx * posun, y1: u.y1 + u.ny * posun,
                x2: u.x2 + u.nx * posun, y2: u.y2 + u.ny * posun,
                tloustka,
                obvodova: true,
            });
        }

        // rohy: protáhnout osy do průsečíků, ať na sebe navazují
        for (let i = 0; i < steny.length; i++) {
            const a = steny[i], b = steny[(i + 1) % steny.length];
            if (!a || !b || a === b) continue;
            const p = prusecikPrimek(a, b);
            if (!p) continue;
            if (Math.hypot(p.x - a.x2, p.y - a.y2) > 2 / mnb) continue;    // nesmí uletět
            a.x2 = p.x; a.y2 = p.y;
            b.x1 = p.x; b.y1 = p.y;
        }

        return steny;
    }

    // ═══════════════════════════════════════════════════════
    // VÝBĚR STĚN PODLE ROZDĚLENÍ DOMU NA MÍSTNOSTI
    //
    // Stěna není jen dvojice čar — je to plocha dané tloušťky, která spolu
    // s ostatními dělí dům na místnosti. Kandidáti (dvojice líců) se proto
    // nepřijímají podle vzhledu, ale podle toho, jestli rozdělení zlepší.
    // Barva ani šrafa se nikde nepoužívá: materiálů stěn i podlah je mnoho.
    // ═══════════════════════════════════════════════════════

    /**
     * Shluky tlouštěk — v domě se opakuje jen několik tlouštěk stěn
     * (obvodová, nosná, příčka…). Vrací pole středů shluků v metrech.
     */
    function shlukyTlousteks(osy, nast = {}) {
        const krok = nast.krokShluku ?? 0.02;          // 2 cm
        const minPodil = nast.minPodilShluku ?? 0.05;  // menší shluky jsou šum

        const koše = new Map();
        let celkovaDelka = 0;
        for (const o of osy) {
            const delka = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
            celkovaDelka += delka;
            const k = Math.round(o.tloustka / krok);
            koše.set(k, (koše.get(k) || 0) + delka);
        }

        const shluky = [];
        for (const [k, delka] of [...koše.entries()].sort((a, b) => b[1] - a[1])) {
            if (delka < celkovaDelka * minPodil) continue;
            const stred = k * krok;
            if (shluky.some(s => Math.abs(s - stred) < krok * 1.5)) continue;
            shluky.push(stred);
        }
        return shluky.sort((a, b) => a - b);
    }

    /**
     * Srovná tloušťky stěn na několik hodnot, které se v domě opravdu opakují.
     *
     * Ve výkresu vychází 9, 10, 14, 23, 25 cm — ve skutečnosti jde o dvě tři
     * tloušťky (příčka, nosná, obvodová) a rozdíly jsou nepřesnost odečtu.
     * Zároveň hlídá, že stěna není tenčí než nejtenčí příčka, která se staví.
     */
    function srovnejTloustky(osy, mnb, nast = {}) {
        const minTl = nast.minTloustkaPricky ?? 0.10;    // tenčí se nestaví
        const dosah = nast.dosahSrovnaniM ?? 0.035;
        const shluky = shlukyTlousteks(osy, { ...nast, minPodilShluku: nast.minPodilShluku ?? 0.06 });
        if (!shluky.length) return osy;

        // shluk pod minimem se posune na minimum (jinak by příčky zmizely)
        const cile = [...new Set(shluky.map(t => Math.max(t, minTl)))];

        return osy.map(o => {
            if (o.obvodova) return o;                      // obvod má tloušťku z obkreslení
            let nej = null, rozdil = Infinity;
            for (const c of cile) {
                const d = Math.abs(o.tloustka - c);
                if (d < rozdil) { rozdil = d; nej = c; }
            }
            if (nej === null || rozdil > dosah) return { ...o, tloustka: Math.max(o.tloustka, minTl) };
            return { ...o, tloustka: nej };
        });
    }

    /**
     * Rastr vnitřku domu — 1 buňka = několik cm. Slouží k tomu, aby šlo
     * rychle zjistit, na kolik místností je dům aktuálně rozdělený.
     */
    function postavRastr(obrys, mnb, krokM = 0.1) {
        const xs = obrys.map(b => b[0]), ys = obrys.map(b => b[1]);
        const minX = Math.min(...xs), minY = Math.min(...ys);
        const krok = krokM / mnb;
        const sirka = Math.ceil((Math.max(...xs) - minX) / krok) + 2;
        const vyska = Math.ceil((Math.max(...ys) - minY) / krok) + 2;

        const bunky = new Uint8Array(sirka * vyska);   // 0 = volno, 1 = mimo dům / stěna
        for (let y = 0; y < vyska; y++) {
            for (let x = 0; x < sirka; x++) {
                const bx = minX + (x + 0.5) * krok;
                const by = minY + (y + 0.5) * krok;
                if (!vPolygonu(bx, by, obrys)) bunky[y * sirka + x] = 1;
            }
        }

        return { bunky, sirka, vyska, krok, minX, minY, krokM };
    }

    /** Zanese pás stěny do rastru (nebo jen spočítá, kterých buněk se dotkne). */
    function zanesStenu(rastr, osa, jenSpocitat = false) {
        const dotcene = [];
        const polovina = (osa.tloustka / rastr.krokM) / 2;   // v buňkách
        const x1 = (osa.x1 - rastr.minX) / rastr.krok, y1 = (osa.y1 - rastr.minY) / rastr.krok;
        const x2 = (osa.x2 - rastr.minX) / rastr.krok, y2 = (osa.y2 - rastr.minY) / rastr.krok;
        const dx = x2 - x1, dy = y2 - y1;
        const delka = Math.hypot(dx, dy);
        if (!delka) return dotcene;

        const nx = -dy / delka, ny = dx / delka;
        const krokuPodel = Math.ceil(delka * 2);
        const krokuNapric = Math.max(1, Math.ceil(polovina * 2));

        for (let i = 0; i <= krokuPodel; i++) {
            const t = i / krokuPodel;
            for (let j = -krokuNapric; j <= krokuNapric; j++) {
                const s = (j / krokuNapric) * polovina;
                const x = Math.round(x1 + dx * t + nx * s);
                const y = Math.round(y1 + dy * t + ny * s);
                if (x < 0 || y < 0 || x >= rastr.sirka || y >= rastr.vyska) continue;
                const idx = y * rastr.sirka + x;
                if (rastr.bunky[idx] === 0) {
                    dotcene.push(idx);
                    if (!jenSpocitat) rastr.bunky[idx] = 1;
                }
            }
        }
        return dotcene;
    }

    /** Najde volné plochy (místnosti) v rastru. */
    function plochyVRastru(rastr) {
        const stav = new Int32Array(rastr.bunky.length).fill(-1);
        const plochy = [];
        const zasobnik = [];

        for (let start = 0; start < rastr.bunky.length; start++) {
            if (rastr.bunky[start] !== 0 || stav[start] !== -1) continue;
            const cislo = plochy.length;
            let pocet = 0;
            zasobnik.push(start);
            stav[start] = cislo;

            while (zasobnik.length) {
                const idx = zasobnik.pop();
                pocet++;
                const x = idx % rastr.sirka, y = (idx / rastr.sirka) | 0;
                const sousedi = [
                    x > 0 ? idx - 1 : -1,
                    x < rastr.sirka - 1 ? idx + 1 : -1,
                    y > 0 ? idx - rastr.sirka : -1,
                    y < rastr.vyska - 1 ? idx + rastr.sirka : -1,
                ];
                for (const s of sousedi) {
                    if (s < 0 || rastr.bunky[s] !== 0 || stav[s] !== -1) continue;
                    stav[s] = cislo;
                    zasobnik.push(s);
                }
            }
            plochy.push({ cislo, bunek: pocet, plochaM2: pocet * rastr.krokM * rastr.krokM });
        }

        return { plochy, stav };
    }

    /**
     * Vybere z kandidátů ty stěny, které dávají smysluplné rozdělení domu.
     *
     * Kandidát se přijme, jen když plochu, kterou protne, rozdělí na části
     * rozumné velikosti (ne na třísky) — tím vypadne nábytek i kóty, protože
     * ty dům nedělí, jen ho „nakrajují“ na nesmysly.
     */
    function vyberPodleRozdeleni(kandidati, obvod, obrys, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;
        const minMistnost = nast.minMistnostM2 ?? 1.2;
        const minTriska = nast.minTriskaM2 ?? 0.35;
        const tolerance = nast.toleranceTloustky ?? 0.03;

        const rastr = postavRastr(obrys, mnb, nast.krokRastruM ?? 0.1);
        for (const o of obvod) zanesStenu(rastr, o);      // obvod platí vždy

        // Povolené tloušťky: z obvodu + opakující se hodnoty mezi kandidáty
        const shluky = shlukyTlousteks(kandidati, nast)
            .concat(obvod.map(o => o.tloustka));
        const tloustkaSedi = (t) => shluky.some(s => Math.abs(s - t) <= tolerance);

        // ── 1. kostra: kandidáti se správnou tloušťkou, opřeni aspoň jedním
        //    koncem o obvod nebo o jinou stěnu (volně stojící čára stěna není)
        const dosah = (nast.dosahUkotveniM ?? 0.35) / mnb;
        const vhodni = kandidati.filter(k =>
            tloustkaSedi(k.tloustka)
            && Math.hypot(k.x2 - k.x1, k.y2 - k.y1) * mnb >= (nast.minDelkaSteny ?? 0.4));

        const dotykaSe = (konecX, konecY, o) => {
            const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
            const L2 = dx * dx + dy * dy || 1;
            let t = ((konecX - o.x1) * dx + (konecY - o.y1) * dy) / L2;
            t = Math.max(0, Math.min(1, t));
            return Math.hypot(o.x1 + dx * t - konecX, o.y1 + dy * t - konecY) < dosah;
        };
        const ukotveni = (k) => {
            const ostatni = obvod.concat(vhodni.filter(o => o !== k));
            const a = ostatni.some(o => dotykaSe(k.x1, k.y1, o));
            const b = ostatni.some(o => dotykaSe(k.x2, k.y2, o));
            return (a ? 1 : 0) + (b ? 1 : 0);
        };

        let prijate = vhodni.filter(k => ukotveni(k) >= 1);

        // ── 2. zanést všechny do rastru
        const zaneseno = new Map();
        for (const k of prijate) zaneseno.set(k, zanesStenu(rastr, k));

        // ── 3. třísky pryč: plocha menší než malá komora znamená chybnou stěnu.
        //    Odebírá se nejkratší stěna, která k té třísce přiléhá.
        for (let kolo = 0; kolo < 60; kolo++) {
            const { plochy, stav } = plochyVRastru(rastr);
            const triska = plochy.find(p => p.plochaM2 < minTriska);
            if (!triska) break;

            const viník = prijate
                .filter(k => sousediSPlochou(rastr, stav, k, triska.cislo))
                .sort((a, b) => Math.hypot(a.x2 - a.x1, a.y2 - a.y1) - Math.hypot(b.x2 - b.x1, b.y2 - b.y1))[0];
            if (!viník) break;

            for (const idx of (zaneseno.get(viník) || [])) rastr.bunky[idx] = 0;
            prijate = prijate.filter(o => o !== viník);
            zaneseno.delete(viník);
        }

        // ── 4. ponechat jen stěny, které OPRAVDU oddělují dvě různé místnosti.
        //    Tím vypadne nábytek, kóty i schodiště: ty nic nedělí.
        let zmena = true;
        while (zmena) {
            zmena = false;
            const { stav } = plochyVRastru(rastr);
            for (const k of prijate.slice()) {
                if (oddelujeMistnosti(rastr, stav, k, nast)) continue;
                for (const idx of (zaneseno.get(k) || [])) rastr.bunky[idx] = 0;
                prijate = prijate.filter(o => o !== k);
                zaneseno.delete(k);
                zmena = true;
                break;                       // rozdělení se změnilo → přepočítat
            }
        }

        const plochy = plochyVRastru(rastr).plochy;
        return {
            steny: prijate,
            mistnosti: plochy.filter(p => p.plochaM2 >= minMistnost),
            rastr,
            shluky,
        };
    }

    /** Přiléhá stěna k dané ploše? */
    function sousediSPlochou(rastr, stav, osa, cisloPlochy) {
        const vzorky = vzorkyKolemOsy(rastr, stav, osa, 8);
        return vzorky.some(v => v.vlevo === cisloPlochy || v.vpravo === cisloPlochy);
    }

    /**
     * Odděluje stěna dvě různé místnosti?
     *
     * Vzorkuje se po délce stěny na obě strany. Když je po většině délky
     * vlevo jedna plocha a vpravo jiná, stěna něco dělí. Když je po obou
     * stranách totéž, je to čára uvnitř místnosti (nábytek, kóta, schodiště).
     */
    function oddelujeMistnosti(rastr, stav, osa, nast = {}) {
        const vzorky = vzorkyKolemOsy(rastr, stav, osa, nast.vzorkuNaStenu ?? 12);
        if (!vzorky.length) return false;

        let delici = 0, platnych = 0;
        for (const v of vzorky) {
            if (v.vlevo === null || v.vpravo === null) continue;
            platnych++;
            if (v.vlevo !== v.vpravo) delici++;
        }
        if (!platnych) return false;
        return delici / platnych >= (nast.podilDelici ?? 0.5);
    }

    /**
     * Vzorky ploch po obou stranách stěny.
     * Vrací pole {vlevo, vpravo} — čísla ploch, nebo null (stěna / mimo dům).
     */
    function vzorkyKolemOsy(rastr, stav, osa, pocet = 12) {
        const x1 = (osa.x1 - rastr.minX) / rastr.krok, y1 = (osa.y1 - rastr.minY) / rastr.krok;
        const x2 = (osa.x2 - rastr.minX) / rastr.krok, y2 = (osa.y2 - rastr.minY) / rastr.krok;
        const dx = x2 - x1, dy = y2 - y1;
        const delka = Math.hypot(dx, dy);
        if (!delka) return [];

        const nx = -dy / delka, ny = dx / delka;
        const odsazeni = (osa.tloustka / rastr.krokM) / 2 + 1.5;    // kousek za líc

        const cti = (sx, sy, znamenko) => {
            const x = Math.round(sx + nx * odsazeni * znamenko);
            const y = Math.round(sy + ny * odsazeni * znamenko);
            if (x < 0 || y < 0 || x >= rastr.sirka || y >= rastr.vyska) return null;
            const idx = y * rastr.sirka + x;
            return rastr.bunky[idx] === 0 ? stav[idx] : null;
        };

        const vzorky = [];
        for (let i = 1; i < pocet; i++) {
            const t = i / pocet;
            const sx = x1 + dx * t, sy = y1 + dy * t;
            vzorky.push({ vlevo: cti(sx, sy, 1), vpravo: cti(sx, sy, -1) });
        }
        return vzorky;
    }

    /**
     * Stěny z vyplněných ploch — stěna nakreslená jako 2D objekt.
     *
     * V CADu (typicky ArchiCAD) je každá stěna samostatná vyplněná plocha.
     * Pak není co hádat: osa i tloušťka se odečtou přímo z tvaru. Barva
     * výplně se nepoužívá, materiálů je mnoho — rozhoduje jen tvar.
     */
    function stenyZVyplni(usecky, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;
        const minTl = nast.minTloustka ?? 0.075;   // pod 7,5 cm žádná stěna není
        const maxTl = nast.maxTloustka ?? 0.8;
        const minDelka = nast.minDelkaSteny ?? 0.4;
        const minPomer = nast.minPomerStran ?? 2;

        // hrany jednoho podtahu = jeden obrys
        const obrysy = new Map();
        for (const u of usecky) {
            if (!u.vyplnene) continue;
            if (!obrysy.has(u.obrys)) obrysy.set(u.obrys, []);
            obrysy.get(u.obrys).push(u);
        }

        const steny = [];
        for (const hrany of obrysy.values()) {
            if (hrany.length < 3) continue;

            // nejdelší hrana udává směr stěny
            let smer = null, nejdelsi = 0;
            for (const h of hrany) {
                const d = Math.hypot(h.x2 - h.x1, h.y2 - h.y1);
                if (d > nejdelsi) { nejdelsi = d; smer = { x: (h.x2 - h.x1) / d, y: (h.y2 - h.y1) / d }; }
            }
            if (!smer) continue;

            // Stěna je obdélník: všechny hrany musí být rovnoběžné nebo kolmé
            // ke směru. Bez téhle kontroly projdou i lichoběžníky (např. šrafa
            // podél okapu) a jejich osa pak vyjde nakloněná.
            const uhelSmeru = Math.atan2(smer.y, smer.x);
            let delkaSikmych = 0, delkaCelkem = 0;
            for (const h of hrany) {
                const d = Math.hypot(h.x2 - h.x1, h.y2 - h.y1);
                if (d < 1e-6) continue;
                delkaCelkem += d;
                let rozdil = Math.abs(Math.atan2(h.y2 - h.y1, h.x2 - h.x1) - uhelSmeru) % (Math.PI / 2);
                rozdil = Math.min(rozdil, Math.PI / 2 - rozdil);
                if (rozdil > (nast.tolHranyDeg ?? 6) * Math.PI / 180) delkaSikmych += d;
            }
            if (delkaCelkem && delkaSikmych / delkaCelkem > (nast.podilSikmych ?? 0.15)) continue;

            // rozměry v soustavě stěny
            const body = hrany.flatMap(h => [[h.x1, h.y1], [h.x2, h.y2]]);
            const podel = body.map(b => b[0] * smer.x + b[1] * smer.y);
            const napric = body.map(b => -b[0] * smer.y + b[1] * smer.x);
            const delka = (Math.max(...podel) - Math.min(...podel)) * mnb;
            const tloustka = (Math.max(...napric) - Math.min(...napric)) * mnb;

            // Tenké pásy se NEZAHAZUJÍ. Zeď bývá nakreslená po vrstvách —
            // jádro 10 cm plus omítky po 1–2 cm — a jen jádro dá 10 cm místo
            // skutečných 14. Vrstvy se pošlou dál a sloučí se k jádru.
            const jeVrstva = tloustka < minTl;
            if (tloustka < (nast.minTloustkaVrstvy ?? 0.005) || tloustka > maxTl) continue;
            if (delka < minDelka || delka / tloustka < minPomer) continue;

            // obdélníkovost: plocha tvaru vs. plocha obálky (L a T tvary ven)
            const plochaObalky = delka * tloustka;
            const plochaTvaru = Math.abs(plochaPolygonu(body)) * mnb * mnb;
            if (plochaTvaru < plochaObalky * (nast.minObdelnikovost ?? 0.75)) continue;

            // osa = střed obálky podél směru
            const stredNapric = (Math.max(...napric) + Math.min(...napric)) / 2;
            const od = Math.min(...podel), doo = Math.max(...podel);
            steny.push({
                x1: smer.x * od - smer.y * stredNapric,
                y1: smer.y * od + smer.x * stredNapric,
                x2: smer.x * doo - smer.y * stredNapric,
                y2: smer.y * doo + smer.x * stredNapric,
                tloustka,
                zVyplne: true,
                ...(jeVrstva ? { vrstva: true } : {}),
            });
        }
        return steny;
    }

    /** Plocha mnohoúhelníku ze seřazených bodů (shoelace). */
    function plochaPolygonu(body) {
        let s = 0;
        for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
            s += (body[j][0] + body[i][0]) * (body[j][1] - body[i][1]);
        }
        return s / 2;
    }

    /** Klíč stylu kreslení — podle něj se hledají stěny. */
    function klicStylu(u) {
        return u.vyplnene ? 'výplň ' + u.fill : 'pero ' + u.sw.toFixed(2) + ' ' + u.stroke;
    }

    function seskupPodleStylu(usecky) {
        const skupiny = new Map();
        for (const u of usecky) {
            const k = klicStylu(u);
            if (!skupiny.has(k)) skupiny.set(k, []);
            skupiny.get(k).push(u);
        }
        return skupiny;
    }

    /**
     * Z úseček jedné skupiny udělá osy stěn.
     * @param {Array} skupina úsečky v bodech PDF
     * @param {object} nast {metryNaBod, minTloustka, maxTloustka, minDelka, tolUhelDeg, minPrekryv}
     */
    function osySten(skupina, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;          // 1:100
        const minTl = nast.minTloustka ?? 0.075;   // pod 7,5 cm žádná stěna není
        const maxTl = nast.maxTloustka ?? 0.75;
        const minDelka = nast.minDelka ?? 0.4;
        const tolUhel = (nast.tolUhelDeg ?? 3) * Math.PI / 180;
        const minPrekryv = nast.minPrekryv ?? 0.5;

        // mřížkový index podle středů úseček (jinak by to bylo n²)
        const krok = Math.max(maxTl * 6 / mnb, 20);
        const mrizka = new Map();
        const klic = (x, y) => Math.floor(x / krok) + ':' + Math.floor(y / krok);
        skupina.forEach((u, i) => {
            const k = klic((u.x1 + u.x2) / 2, (u.y1 + u.y2) / 2);
            if (!mrizka.has(k)) mrizka.set(k, []);
            mrizka.get(k).push(i);
        });

        const osy = [];
        for (let i = 0; i < skupina.length; i++) {
            const a = skupina[i];
            const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
            const L = Math.hypot(dx, dy);
            if (L * mnb < minDelka) continue;

            const gx = Math.floor((a.x1 + a.x2) / 2 / krok), gy = Math.floor((a.y1 + a.y2) / 2 / krok);
            let nejlepsi = null;

            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    for (const j of (mrizka.get((gx + ox) + ':' + (gy + oy)) || [])) {
                        if (j === i) continue;
                        const b = skupina[j];
                        const bL = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
                        if (bL * mnb < minDelka) continue;

                        let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
                        if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                        if (rozdil > tolUhel) continue;

                        const nx = -dy / L, ny = dx / L;
                        const odchylka = (b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny;
                        const tloustka = Math.abs(odchylka) * mnb;
                        if (tloustka < minTl || tloustka > maxTl) continue;

                        // podélný překryv (v parametru úsečky a)
                        const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / (L * L);
                        const t1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
                        const t2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
                        const od = Math.max(t1, 0), doo = Math.min(t2, 1);
                        if (doo - od < minPrekryv) continue;

                        // vyhrává NEJBLIŽŠÍ protilehlá hrana (jinak se páruje přes místnost)
                        if (!nejlepsi || tloustka < nejlepsi.tloustka) {
                            nejlepsi = { tloustka, od, doo, smer: Math.sign(odchylka), nx, ny };
                        }
                    }
                }
            }

            if (!nejlepsi) continue;
            const posun = (nejlepsi.tloustka / mnb) / 2 * nejlepsi.smer;
            osy.push({
                x1: a.x1 + dx * nejlepsi.od + nejlepsi.nx * posun,
                y1: a.y1 + dy * nejlepsi.od + nejlepsi.ny * posun,
                x2: a.x1 + dx * nejlepsi.doo + nejlepsi.nx * posun,
                y2: a.y1 + dy * nejlepsi.doo + nejlepsi.ny * posun,
                tloustka: nejlepsi.tloustka,
            });
        }

        return sloucDuplicity(osy, mnb);
    }

    /** Každá dvojice hran dá osu dvakrát (z obou stran) — sloučit. */
    function sloucDuplicity(osy, mnb) {
        const tolerance = 0.05 / mnb;   // 5 cm
        const vysledek = [];
        const mrizka = new Map();
        const klic = (x, y) => Math.round(x / (tolerance * 4)) + ':' + Math.round(y / (tolerance * 4));

        for (const o of osy) {
            const sx = (o.x1 + o.x2) / 2, sy = (o.y1 + o.y2) / 2;
            let duplicita = false;
            for (let dx = -1; dx <= 1 && !duplicita; dx++) {
                for (let dy = -1; dy <= 1 && !duplicita; dy++) {
                    for (const idx of (mrizka.get((Math.round(sx / (tolerance * 4)) + dx) + ':' + (Math.round(sy / (tolerance * 4)) + dy)) || [])) {
                        const v = vysledek[idx];
                        if (Math.abs(v.tloustka - o.tloustka) > 0.03) continue;
                        const stejne = (Math.hypot(v.x1 - o.x1, v.y1 - o.y1) < tolerance && Math.hypot(v.x2 - o.x2, v.y2 - o.y2) < tolerance)
                            || (Math.hypot(v.x1 - o.x2, v.y1 - o.y2) < tolerance && Math.hypot(v.x2 - o.x1, v.y2 - o.y1) < tolerance);
                        if (stejne) { duplicita = true; break; }
                    }
                }
            }
            if (duplicita) continue;
            const k = klic(sx, sy);
            if (!mrizka.has(k)) mrizka.set(k, []);
            mrizka.get(k).push(vysledek.length);
            vysledek.push(o);
        }
        return vysledek;
    }

    /**
     * Zahustí osy podle toho, co je mezi lícem stěny na obrázku výkresu.
     *
     * Klíčové rozlišení: uvnitř stěny je šrafa nebo výplň (inkoust), kdežto
     * mezi dvojicí kótovacích čar, mezi hranami nábytku nebo mezi prkny terasy
     * je bílo. Volající dodá vzorkovací funkci nad obrázkem stránky.
     *
     * @param {Array} osy osy v bodech PDF
     * @param {function} vzorek (x, y) → 0..1 (1 = úplně tmavé) v bodech PDF
     * @returns {Array} osy doplněné o `inkoust` (podíl tmavých vzorků)
     */
    function zmerInkoust(osy, vzorek, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;
        const kroku = nast.vzorkuNaOsu ?? 12;

        return osy.map(o => {
            const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
            const L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;
            // vzorkuje se pás uvnitř stěny, ale ne přímo na lících (tam je čára vždy)
            const polovina = (o.tloustka / mnb) / 2 * 0.45;
            let tmave = 0, celkem = 0;

            for (let i = 1; i < kroku; i++) {
                const t = i / kroku;
                const px = o.x1 + dx * t, py = o.y1 + dy * t;
                for (const posun of [-polovina, 0, polovina]) {
                    const v = vzorek(px + nx * posun, py + ny * posun);
                    if (v === null) continue;
                    celkem++;
                    if (v > 0.25) tmave++;
                }
            }

            return { ...o, inkoust: celkem ? tmave / celkem : 0 };
        });
    }

    // ═══════════════════════════════════════════════════════
    // ČIŠTĚNÍ OS (podle postupu z parse_pudorys.py)
    // ═══════════════════════════════════════════════════════

    /** Převažující směry kresby (hlavní osa a kolmice) ve stupních. */
    function hlavniSmer(osy) {
        const kose = new Array(90).fill(0);
        for (const o of osy) {
            const delka = Math.hypot(o.x2 - o.x1, o.y2 - o.y1);
            const uhel = ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI) % 90 + 90) % 90;
            kose[Math.floor(uhel)] += delka;       // váženo délkou
        }
        return kose.indexOf(Math.max(...kose)) + 0.5;
    }

    /**
     * Narovná osy na pravoúhlou soustavu (jen ty, které jsou blízko).
     * @param {number|null} zakladniSmer úhel soustavy ve stupních (jinak se odvodí z kresby)
     */
    function narovnej(osy, tolerance = 4, zakladniSmer = null) {
        const zaklad = zakladniSmer ?? hlavniSmer(osy);
        return osy.map(o => {
            const uhel = Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI;
            for (const cil of [zaklad, zaklad + 90, zaklad + 180, zaklad + 270, zaklad - 90, zaklad - 180]) {
                let rozdil = uhel - cil;
                while (rozdil > 180) rozdil -= 360;
                while (rozdil < -180) rozdil += 360;
                if (Math.abs(rozdil) > tolerance) continue;
                // otočit kolem středu
                const sx = (o.x1 + o.x2) / 2, sy = (o.y1 + o.y2) / 2;
                const delka = Math.hypot(o.x2 - o.x1, o.y2 - o.y1) / 2;
                const r = cil * Math.PI / 180;
                return {
                    ...o,
                    x1: sx - Math.cos(r) * delka, y1: sy - Math.sin(r) * delka,
                    x2: sx + Math.cos(r) * delka, y2: sy + Math.sin(r) * delka,
                };
            }
            return o;
        });
    }

    /** Sloučí osy ležící na stejné přímce, které se překrývají nebo na sebe navazují. */
    function sloucKolinearni(osy, mnb, mezeraM = 0.15) {
        const tolKolmo = 0.08 / mnb;      // 8 cm stranou
        const mezera = mezeraM / mnb;
        const zbyva = osy.slice();
        const vysledek = [];

        while (zbyva.length) {
            let akt = zbyva.pop();
            let zmena = true;
            while (zmena) {
                zmena = false;
                for (let i = zbyva.length - 1; i >= 0; i--) {
                    const b = zbyva[i];
                    if (Math.abs(b.tloustka - akt.tloustka) > 0.04) continue;

                    const dx = akt.x2 - akt.x1, dy = akt.y2 - akt.y1;
                    const L = Math.hypot(dx, dy);
                    if (!L) break;
                    let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
                    if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                    if (rozdil > 3 * Math.PI / 180) continue;

                    const nx = -dy / L, ny = dx / L;
                    const odchylka1 = Math.abs((b.x1 - akt.x1) * nx + (b.y1 - akt.y1) * ny);
                    const odchylka2 = Math.abs((b.x2 - akt.x1) * nx + (b.y2 - akt.y1) * ny);
                    if (odchylka1 > tolKolmo || odchylka2 > tolKolmo) continue;

                    // parametry podél osy
                    const t = (px, py) => ((px - akt.x1) * dx + (py - akt.y1) * dy) / L;
                    const body = [0, L, t(b.x1, b.y1), t(b.x2, b.y2)].sort((p, q) => p - q);
                    const bt1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
                    const bt2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
                    if (bt1 > L + mezera || bt2 < -mezera) continue;   // ani nenavazuje

                    const od = body[0], doo = body[3];
                    akt = {
                        x1: akt.x1 + dx / L * od, y1: akt.y1 + dy / L * od,
                        x2: akt.x1 + dx / L * doo, y2: akt.y1 + dy / L * doo,
                        tloustka: (akt.tloustka + b.tloustka) / 2,
                    };
                    zbyva.splice(i, 1);
                    zmena = true;
                }
            }
            vysledek.push(akt);
        }
        return vysledek;
    }

    /** Protáhne konce os tak, aby se blízké konce/dotyky potkaly v jednom bodě. */
    function spojRohy(osy, mnb, dosahM = 0.4) {
        const dosah = dosahM / mnb;
        const konce = [];
        osy.forEach((o, i) => {
            konce.push({ i, konec: 1, x: o.x1, y: o.y1 });
            konce.push({ i, konec: 2, x: o.x2, y: o.y2 });
        });

        // 1) blízké konce → průsečík nosných přímek (roh L)
        for (let a = 0; a < konce.length; a++) {
            for (let b = a + 1; b < konce.length; b++) {
                const ka = konce[a], kb = konce[b];
                if (ka.i === kb.i) continue;
                if (Math.hypot(ka.x - kb.x, ka.y - kb.y) > dosah) continue;

                const oa = osy[ka.i], ob = osy[kb.i];
                const prusecik = prusecikPrimek(oa, ob);
                if (!prusecik) continue;
                if (Math.hypot(prusecik.x - ka.x, prusecik.y - ka.y) > dosah * 1.6) continue;

                if (!posunKonec(oa, ka.konec, prusecik)) continue;
                if (!posunKonec(ob, kb.konec, prusecik)) continue;
                ka.x = kb.x = prusecik.x;
                ka.y = kb.y = prusecik.y;
            }
        }

        // 2) konec blízko těla jiné osy → protáhnout na ni (napojení T).
        //    Delší stěny mají přednost: kratší se napojuje na delší, ne naopak.
        konce.sort((a, b) => {
            const da = Math.hypot(osy[a.i].x2 - osy[a.i].x1, osy[a.i].y2 - osy[a.i].y1);
            const db = Math.hypot(osy[b.i].x2 - osy[b.i].x1, osy[b.i].y2 - osy[b.i].y1);
            return da - db;
        });

        for (const k of konce) {
            const o = osy[k.i];
            for (let j = 0; j < osy.length; j++) {
                if (j === k.i) continue;
                const c = osy[j];
                const dx = c.x2 - c.x1, dy = c.y2 - c.y1;
                const L2 = dx * dx + dy * dy;
                if (!L2) continue;
                let t = ((k.x - c.x1) * dx + (k.y - c.y1) * dy) / L2;
                if (t < -0.05 || t > 1.05) continue;
                t = Math.max(0, Math.min(1, t));
                const px = c.x1 + dx * t, py = c.y1 + dy * t;
                const vzd = Math.hypot(px - k.x, py - k.y);
                if (vzd > dosah || vzd < 1e-9) continue;

                // Rovnoběžné stěny napojení netvoří. Dřív se konec stáhl kolmo
                // na sousední stěnu, čímž se celá stěna naklonila — proto se
                // bez průsečíku nedělá nic.
                const prusecik = prusecikPrimek(o, c);
                if (!prusecik) continue;
                if (Math.hypot(prusecik.x - k.x, prusecik.y - k.y) > dosah * 1.6) continue;
                if (!posunKonec(o, k.konec, prusecik)) continue;
                k.x = prusecik.x; k.y = prusecik.y;
                break;
            }
        }

        return osy;
    }

    /**
     * Posune konec stěny do daného bodu, ale JEN když se tím nezmění směr
     * stěny (do 1°). Napojení rohů nikdy nesmí stěnu naklonit.
     */
    function posunKonec(stena, konec, bod, tolerance = 1) {
        const puvodni = Math.atan2(stena.y2 - stena.y1, stena.x2 - stena.x1);
        const novy = konec === 1
            ? Math.atan2(stena.y2 - bod.y, stena.x2 - bod.x)
            : Math.atan2(bod.y - stena.y1, bod.x - stena.x1);

        let rozdil = Math.abs(novy - puvodni) % Math.PI;
        if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
        if (rozdil > tolerance * Math.PI / 180) return false;

        if (konec === 1) { stena.x1 = bod.x; stena.y1 = bod.y; }
        else { stena.x2 = bod.x; stena.y2 = bod.y; }
        return true;
    }

    function prusecikPrimek(a, b) {
        const x1 = a.x1, y1 = a.y1, x2 = a.x2, y2 = a.y2;
        const x3 = b.x1, y3 = b.y1, x4 = b.x2, y4 = b.y2;
        const jmenovatel = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(jmenovatel) < 1e-9) return null;      // rovnoběžky
        const d1 = x1 * y2 - y1 * x2, d2 = x3 * y4 - y3 * x4;
        return {
            x: (d1 * (x3 - x4) - (x1 - x2) * d2) / jmenovatel,
            y: (d1 * (y3 - y4) - (y1 - y2) * d2) / jmenovatel,
        };
    }

    /** Ponechá jen největší souvislou síť os (zbytek jsou obvykle kóty a nábytek). */
    function nejvetsiSit(osy, mnb, dosahM = 0.35) {
        if (osy.length < 2) return osy;
        const dosah = dosahM / mnb;
        const rodic = osy.map((_, i) => i);
        const najdi = (i) => { while (rodic[i] !== i) { rodic[i] = rodic[rodic[i]]; i = rodic[i]; } return i; };
        const spoj = (i, j) => { const a = najdi(i), b = najdi(j); if (a !== b) rodic[a] = b; };

        const dotyk = (a, b) => {
            const body = [[a.x1, a.y1], [a.x2, a.y2]];
            for (const [px, py] of body) {
                const dx = b.x2 - b.x1, dy = b.y2 - b.y1;
                const L2 = dx * dx + dy * dy || 1;
                let t = ((px - b.x1) * dx + (py - b.y1) * dy) / L2;
                t = Math.max(0, Math.min(1, t));
                if (Math.hypot(b.x1 + dx * t - px, b.y1 + dy * t - py) < dosah) return true;
            }
            return false;
        };

        for (let i = 0; i < osy.length; i++) {
            for (let j = i + 1; j < osy.length; j++) {
                if (dotyk(osy[i], osy[j]) || dotyk(osy[j], osy[i])) spoj(i, j);
            }
        }

        const skupiny = new Map();
        osy.forEach((o, i) => {
            const k = najdi(i);
            if (!skupiny.has(k)) skupiny.set(k, []);
            skupiny.get(k).push(o);
        });

        let nejlepsi = [];
        let nejDelka = 0;
        for (const s of skupiny.values()) {
            const delka = s.reduce((sum, o) => sum + Math.hypot(o.x2 - o.x1, o.y2 - o.y1), 0);
            if (delka > nejDelka) { nejDelka = delka; nejlepsi = s; }
        }
        return nejlepsi;
    }

    /**
     * Vyhodí „hřebeny“ — řady rovnoběžných os s pravidelným rozestupem.
     *
     * Tak vypadají prkna terasy, šrafy a žebříky kót: pět čar vedle sebe po
     * 20 cm. Stěny takhle v domě nikdy nestojí, proto se dají spolehlivě odlišit.
     */
    function odstranHrebeny(osy, mnb, nast = {}) {
        const maxRozestup = (nast.hrebenRozestupM ?? 0.7) / mnb;
        const minSousedu = nast.hrebenSousedu ?? 3;

        const sousedu = osy.map(() => 0);
        for (let i = 0; i < osy.length; i++) {
            const a = osy[i];
            const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
            const L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;

            for (let j = 0; j < osy.length; j++) {
                if (i === j) continue;
                const b = osy[j];
                let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
                if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                if (rozdil > 4 * Math.PI / 180) continue;

                const vzd = Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny);
                if (vzd < 0.02 / mnb || vzd > maxRozestup) continue;

                // musí se podélně překrývat, jinak je to jiná část domu
                const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / (L * L);
                const t1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
                const t2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
                if (Math.min(t2, 1) - Math.max(t1, 0) < 0.5) continue;

                sousedu[i]++;
            }
        }

        return osy.filter((_, i) => sousedu[i] < minSousedu);
    }

    /**
     * Na jednom místě může být jen JEDNA zeď.
     *
     * Rozpoznání někdy najde tutéž stěnu dvakrát (líc zvlášť, vrstva zvlášť,
     * dva zdroje kandidátů). Překrývající se rovnoběžné stěny se proto sloučí
     * do jedné — delší vyhrává, tloušťka se bere větší.
     */
    function odstranPrekryvy(steny, mnb, nast = {}) {
        const tolUhel = (nast.tolPrekryvDeg ?? 8) * Math.PI / 180;
        const minPrekryv = nast.minPodilPrekryvu ?? 0.3;

        const poradi = steny.slice().sort((a, b) =>
            Math.hypot(b.x2 - b.x1, b.y2 - b.y1) - Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
        const ponechane = [];

        for (const s of poradi) {
            let pohlcena = false;

            for (const p of ponechane) {
                let rozdil = Math.abs(Math.atan2(s.y2 - s.y1, s.x2 - s.x1) - Math.atan2(p.y2 - p.y1, p.x2 - p.x1)) % Math.PI;
                if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                if (rozdil > tolUhel) continue;

                const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
                const L = Math.hypot(dx, dy) || 1;
                const nx = -dy / L, ny = dx / L;

                // leží osa uvnitř pásu té druhé stěny?
                const odchylka = Math.abs((s.x1 - p.x1) * nx + (s.y1 - p.y1) * ny) * mnb;
                // pásy se překrývají, když je osa blíž než polovina součtu tlouštěk
                const dovoleno = (p.tloustka + s.tloustka) / 2 * (nast.podilPasu ?? 0.95);
                if (odchylka > dovoleno) continue;

                // a překrývají se i po délce?
                const t = (px, py) => ((px - p.x1) * dx + (py - p.y1) * dy) / (L * L);
                const t1 = Math.min(t(s.x1, s.y1), t(s.x2, s.y2));
                const t2 = Math.max(t(s.x1, s.y1), t(s.x2, s.y2));
                const prekryv = Math.min(t2, 1) - Math.max(t1, 0);
                if (prekryv < minPrekryv * Math.min(1, t2 - t1)) continue;

                // pohltit: delší stěna se případně protáhne a zesílí
                const od = Math.min(0, t1), doo = Math.max(1, t2);
                const nx1 = p.x1 + dx * od, ny1 = p.y1 + dy * od;
                const nx2 = p.x1 + dx * doo, ny2 = p.y1 + dy * doo;
                p.x1 = nx1; p.y1 = ny1; p.x2 = nx2; p.y2 = ny2;
                p.tloustka = Math.max(p.tloustka, s.tloustka);
                p.obvodova = p.obvodova || s.obvodova;
                pohlcena = true;
                break;
            }

            if (!pohlcena) ponechane.push({ ...s });
        }
        return ponechane;
    }

    /**
     * Přichytí líce stěn ke skutečným čarám výkresu.
     *
     * Rozpoznaná stěna bývá o kousek vedle nebo má odhadnutou tloušťku.
     * Ke každému líci se proto hledá výrazná rovnoběžná čára v kresbě a stěna
     * se na ni posadí. Tím se zároveň srovná tloušťka i úhel — čáry ve výkresu
     * jsou přesné, naše odhady ne.
     */
    function prichytLice(steny, usecky, nast = {}) {
        const mnb = nast.metryNaBod || 0.03528;
        const dosah = (nast.dosahLiceM ?? 0.12) / mnb;
        const minPrekryv = nast.minPrekryvLice ?? 0.4;
        const tolUhel = (nast.tolLiceDeg ?? 3) * Math.PI / 180;
        const minTl = nast.minTloustka ?? 0.075;
        const maxTl = nast.maxTloustka ?? 0.8;

        // dlouhé čáry mají přednost — ty vedou po lících stěn
        const cary = usecky.filter(u => Math.hypot(u.x2 - u.x1, u.y2 - u.y1) * mnb > 0.3);

        return steny.map(s => {
            if (s.obvodova) return s;           // obvod je od uživatele, ten se neposouvá

            const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
            const L = Math.hypot(dx, dy);
            if (!L) return s;
            const nx = -dy / L, ny = dx / L;
            const uhelSteny = Math.atan2(dy, dx);

            // najdi nejbližší dlouhou čáru k danému líci (odsazení v bodech)
            const najdiLic = (odsazeni) => {
                let nej = null, nejVzd = Infinity;
                for (const c of cary) {
                    let rozdil = Math.abs(Math.atan2(c.y2 - c.y1, c.x2 - c.x1) - uhelSteny) % Math.PI;
                    if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                    if (rozdil > tolUhel) continue;

                    const vzd = (c.x1 - s.x1) * nx + (c.y1 - s.y1) * ny;      // se znaménkem
                    const odchylka = Math.abs(vzd - odsazeni);
                    if (odchylka > dosah || odchylka >= nejVzd) continue;

                    // musí vést podél stěny, ne ji jen míjet
                    const t = (px, py) => ((px - s.x1) * dx + (py - s.y1) * dy) / (L * L);
                    const t1 = Math.min(t(c.x1, c.y1), t(c.x2, c.y2));
                    const t2 = Math.max(t(c.x1, c.y1), t(c.x2, c.y2));
                    if (Math.min(t2, 1) - Math.max(t1, 0) < minPrekryv) continue;

                    nejVzd = odchylka;
                    nej = vzd;
                }
                return nej;
            };

            const polovina = (s.tloustka / mnb) / 2;
            const licA = najdiLic(polovina);
            const licB = najdiLic(-polovina);

            if (licA === null && licB === null) return s;

            let stred, tloustka;
            if (licA !== null && licB !== null) {
                stred = (licA + licB) / 2;
                tloustka = Math.abs(licA - licB) * mnb;
            } else {
                // jen jeden líc — stěna se k němu přisune, tloušťka zůstává
                const lic = licA !== null ? licA : licB;
                const znamenko = licA !== null ? -1 : 1;
                stred = lic + znamenko * polovina;
                tloustka = s.tloustka;
            }

            if (tloustka < minTl || tloustka > maxTl) return s;

            return {
                ...s,
                x1: s.x1 + nx * stred, y1: s.y1 + ny * stred,
                x2: s.x2 + nx * stred, y2: s.y2 + ny * stred,
                tloustka,
            };
        });
    }

    /**
     * Leží stěna v pásu některé ze stěn v sadě? (rovnoběžná a přes sebe)
     *
     * Používá se hlavně na obvod: vnitřní stěna nakreslená přes obvodovou
     * je stavebně nesmysl — v jednom místě může být jen jedna zeď.
     */
    function prekryvaSadu(stena, sada, mnb, nast = {}) {
        const tolUhel = (nast.tolPrekryvDeg ?? 10) * Math.PI / 180;
        const podil = nast.podilPasu ?? 0.95;

        for (const p of sada) {
            let rozdil = Math.abs(Math.atan2(stena.y2 - stena.y1, stena.x2 - stena.x1)
                - Math.atan2(p.y2 - p.y1, p.x2 - p.x1)) % Math.PI;
            if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
            if (rozdil > tolUhel) continue;

            const dx = p.x2 - p.x1, dy = p.y2 - p.y1;
            const L = Math.hypot(dx, dy) || 1;
            const nx = -dy / L, ny = dx / L;

            const odchylka = Math.abs((stena.x1 - p.x1) * nx + (stena.y1 - p.y1) * ny) * mnb;
            if (odchylka > (p.tloustka + stena.tloustka) / 2 * podil) continue;

            // Překryv se poměřuje s TESTOVANOU stěnou, ne s tou ze sady.
            // Dřív to byl podíl délky obvodové zdi, takže půlmetrový kus ležící
            // ve 13metrové obvodové stěně vyšel jako "5 %" a prošel.
            const t = (px, py) => ((px - p.x1) * dx + (py - p.y1) * dy) / (L * L);
            const t1 = Math.min(t(stena.x1, stena.y1), t(stena.x2, stena.y2));
            const t2 = Math.max(t(stena.x1, stena.y1), t(stena.x2, stena.y2));
            const spolecneM = (Math.min(t2, 1) - Math.max(t1, 0)) * L * mnb;
            if (spolecneM <= 0) continue;

            const delkaTestovane = Math.hypot(stena.x2 - stena.x1, stena.y2 - stena.y1) * mnb;
            if (spolecneM >= delkaTestovane * (nast.podilPrekryvu ?? 0.6)) return true;
        }
        return false;
    }

    /**
     * Zahodí stěny, které celé leží uvnitř jiné stěny.
     *
     * Typicky ostění otvoru v obvodové zdi: krátký kus KOLMO na zeď, celý
     * schovaný v její tloušťce. `prekryvaSadu` je nevidí, protože porovnává
     * jen rovnoběžné stěny — tady na úhlu nezáleží, stěna uvnitř jiné stěny
     * je nadbytečná vždycky.
     */
    function odstranPohlcene(osy, mnb, nast = {}) {
        const podil = nast.podilPohlceni ?? 0.9;
        const kroku = 6;

        return osy.filter((o, i) => {
            const dx = o.x2 - o.x1, dy = o.y2 - o.y1;
            const delkaM = Math.hypot(dx, dy) * mnb;
            if (delkaM > (nast.maxPohlcenaM ?? 0.8)) return true;   // dlouhou zeď nikdo nepohltí

            for (let j = 0; j < osy.length; j++) {
                if (j === i) continue;
                const p = osy[j];
                if (p.tloustka < o.tloustka * 0.9) continue;        // pohlcuje jen tlustší
                const pdx = p.x2 - p.x1, pdy = p.y2 - p.y1;
                const pL2 = pdx * pdx + pdy * pdy;
                if (!pL2) continue;

                let uvnitr = 0;
                for (let k = 0; k <= kroku; k++) {
                    const t = k / kroku;
                    const x = o.x1 + dx * t, y = o.y1 + dy * t;
                    let u = ((x - p.x1) * pdx + (y - p.y1) * pdy) / pL2;
                    if (u < 0 || u > 1) continue;
                    const vzd = Math.hypot(p.x1 + pdx * u - x, p.y1 + pdy * u - y) * mnb;
                    if (vzd <= p.tloustka / 2) uvnitr++;
                }
                if (uvnitr / (kroku + 1) >= podil) return false;
            }
            return true;
        });
    }

    /**
     * Vrstvy jedné konstrukce → jedna stěna.
     *
     * Skladba se kreslí po vrstvách (zdivo, izolace, předstěna), každá jako
     * samostatná plocha. Vedle sebe tak vzniknou dvě rovnoběžné „stěny“, které
     * se dotýkají lícem — ve skutečnosti je to jedna zeď součtové tloušťky.
     */
    function sloucVrstvy(steny, mnb, nast = {}) {
        const tolDotyku = nast.tolDotykuM ?? 0.05;
        const minPrekryv = nast.minPrekryvVrstev ?? 0.6;
        const maxTl = nast.maxTloustkaCelkem ?? 0.9;

        const v = steny.map(s => ({ ...s }));
        let zmena = true;

        while (zmena) {
            zmena = false;
            for (let i = 0; i < v.length && !zmena; i++) {
                for (let j = i + 1; j < v.length && !zmena; j++) {
                    const a = v[i], b = v[j];
                    if (a.tloustka + b.tloustka > maxTl) continue;

                    let uhel = Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
                    if (uhel > Math.PI / 2) uhel = Math.PI - uhel;
                    if (uhel > 3 * Math.PI / 180) continue;

                    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
                    const L = Math.hypot(dx, dy) || 1;
                    const nx = -dy / L, ny = dx / L;
                    const odsazeni = (b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny;    // se znaménkem
                    const vzdalenost = Math.abs(odsazeni) * mnb;

                    // líc na líc: osy jsou od sebe přesně o polovinu součtu tlouštěk
                    const dotyk = (a.tloustka + b.tloustka) / 2;
                    if (Math.abs(vzdalenost - dotyk) > tolDotyku) continue;

                    const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / (L * L);
                    const t1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
                    const t2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
                    const prekryv = Math.min(t2, 1) - Math.max(t1, 0);
                    if (prekryv < minPrekryv * Math.min(1, t2 - t1)) continue;

                    // jedna stěna: součtová tloušťka, osa uprostřed mezi vnějšími líci
                    const posun = Math.sign(odsazeni) * (b.tloustka / 2) / mnb;
                    const od = Math.min(0, t1), doo = Math.max(1, t2);
                    const zx = a.x1 + dx * od + nx * posun, zy = a.y1 + dy * od + ny * posun;
                    const kx = a.x1 + dx * doo + nx * posun, ky = a.y1 + dy * doo + ny * posun;

                    a.x1 = zx; a.y1 = zy; a.x2 = kx; a.y2 = ky;
                    a.tloustka = a.tloustka + b.tloustka;
                    a.obvodova = a.obvodova || b.obvodova;
                    v.splice(j, 1);
                    zmena = true;
                }
            }
        }
        return v;
    }

    /**
     * Otvor stěnu nepřerušuje — pod oknem i nad dveřmi zeď pokračuje.
     *
     * Okna a dveře bývají nakreslené jinou barvou, takže rozpoznání v tom
     * místě stěnu utne. Souosé stěny stejné tloušťky se proto spojí i přes
     * mezeru až do šířky otvoru, pokud mezerou nevede jiná stěna (to by byl
     * skutečný konec u napojení).
     */
    function spojPresOtvory(steny, mnb, nast = {}) {
        const maxMezera = (nast.maxOtvorM ?? 3.2) / mnb;
        const tolTloustky = nast.tolTloustkyOtvoru ?? 0.04;
        const tolKolmo = (nast.tolKolmoOtvoru ?? 0.06) / mnb;

        const vysledek = steny.map(s => ({ ...s }));
        let zmena = true;

        while (zmena) {
            zmena = false;
            for (let i = 0; i < vysledek.length && !zmena; i++) {
                for (let j = i + 1; j < vysledek.length && !zmena; j++) {
                    const a = vysledek[i], b = vysledek[j];
                    const tenci = Math.min(a.tloustka, b.tloustka);

                    // Tloušťka se u obou půlek odečítá zvlášť, takže se o pár
                    // centimetrů liší — u tlusté zdi víc než u příčky.
                    if (Math.abs(a.tloustka - b.tloustka) > Math.max(tolTloustky, tenci * 0.3)) continue;

                    let rozdil = Math.abs(Math.atan2(a.y2 - a.y1, a.x2 - a.x1) - Math.atan2(b.y2 - b.y1, b.x2 - b.x1)) % Math.PI;
                    if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                    if (rozdil > 3 * Math.PI / 180) continue;

                    const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
                    const L = Math.hypot(dx, dy) || 1;
                    const nx = -dy / L, ny = dx / L;
                    // Rozhoduje, jestli se pásy obou půlek pořád překrývají —
                    // pevných 6 cm u silné zdi zbytečně rozdělilo zeď u dveří.
                    const dovolenoStranou = Math.max(tolKolmo, (tenci / mnb) / 2);
                    if (Math.abs((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny) > dovolenoStranou) continue;
                    if (Math.abs((b.x2 - a.x1) * nx + (b.y2 - a.y1) * ny) > dovolenoStranou) continue;

                    // mezera mezi konci po ose
                    const t = (px, py) => ((px - a.x1) * dx + (py - a.y1) * dy) / L;
                    const bt1 = Math.min(t(b.x1, b.y1), t(b.x2, b.y2));
                    const bt2 = Math.max(t(b.x1, b.y1), t(b.x2, b.y2));
                    const mezera = bt1 > L ? bt1 - L : (bt2 < 0 ? -bt2 : 0);
                    if (mezera > maxMezera) continue;

                    // vede mezerou jiná stěna? pak je to opravdový konec
                    const stredMezery = bt1 > L ? (L + bt1) / 2 : (bt2 + 0) / 2;
                    const sx = a.x1 + dx / L * stredMezery, sy = a.y1 + dy / L * stredMezery;
                    const kolizi = vysledek.some((c, k) => {
                        if (k === i || k === j) return false;
                        const cdx = c.x2 - c.x1, cdy = c.y2 - c.y1;
                        const cL2 = cdx * cdx + cdy * cdy || 1;
                        let ct = ((sx - c.x1) * cdx + (sy - c.y1) * cdy) / cL2;
                        ct = Math.max(0, Math.min(1, ct));
                        return Math.hypot(c.x1 + cdx * ct - sx, c.y1 + cdy * ct - sy) < (c.tloustka / mnb);
                    });
                    if (kolizi && mezera > 0.35 / mnb) continue;

                    // Překlenutá mezera JE otvor — zeď pod ním pokračuje.
                    // Zaznamená se dřív, než se obě půlky slijí v jednu stěnu.
                    if (nast.sbernaOtvoru && mezera > 0) {
                        const zacatekMezery = bt1 > L ? L : bt2;
                        const stredMezeryT = zacatekMezery + mezera / 2;
                        nast.sbernaOtvoru.push({
                            x: a.x1 + dx / L * stredMezeryT,
                            y: a.y1 + dy / L * stredMezeryT,
                            sirka: mezera * mnb,
                            tloustka: Math.max(a.tloustka, b.tloustka),
                        });
                    }

                    // Spojit do jedné stěny. Osa se nebere od první z nich —
                    // posune se k delší půlce, ta je změřená spolehlivěji.
                    const odsazeniB = (((b.x1 - a.x1) * nx + (b.y1 - a.y1) * ny)
                        + ((b.x2 - a.x1) * nx + (b.y2 - a.y1) * ny)) / 2;
                    const delkaB = Math.hypot(b.x2 - b.x1, b.y2 - b.y1);
                    const posun = odsazeniB * (delkaB / (L + delkaB));

                    const body = [0, L, bt1, bt2];
                    const od = Math.min(...body), doo = Math.max(...body);
                    a.x1 = a.x1 + dx / L * od + nx * posun; a.y1 = a.y1 + dy / L * od + ny * posun;
                    a.x2 = a.x1 + dx / L * (doo - od); a.y2 = a.y1 + dy / L * (doo - od);
                    a.tloustka = Math.max(a.tloustka, b.tloustka);
                    a.obvodova = a.obvodova || b.obvodova;
                    vysledek.splice(j, 1);
                    zmena = true;
                }
            }
        }
        return vysledek;
    }

    /**
     * Celé čištění: narovnat → sloučit → spojit rohy → největší síť.
     */
    function vycistiOsy(osy, nast = {}, obvod = []) {
        const mnb = nast.metryNaBod || 0.03528;

        // líce stěn posadit na skutečné čáry výkresu (srovná polohu i tloušťku)
        if (nast.usecky && nast.bezPrichyceni !== true) osy = prichytLice(osy, nast.usecky, nast);

        // Úhly: drobné odchylky (pár stupňů) se dorovnají na pravoúhlou soustavu.
        // Základní směr se bere z obkresleného obvodu — ten je od uživatele,
        // takže je spolehlivější než průměr z kresby.
        const zaklad = obvod.length ? hlavniSmer(obvod) : null;
        // tolerance je vyšší, když je základ z obkresleného obvodu — vnitřní
        // stěny mají být rovnoběžné s obvodem, pár stupňů bokem je chyba kresby
        let v = narovnej(osy, nast.tolNarovnaniDeg ?? (zaklad !== null ? 8 : 5), zaklad);

        v = sloucKolinearni(v, mnb, nast.mezeraM ?? 0.15);
        if (nast.bezHrebenu !== false) v = odstranHrebeny(v, mnb, nast);
        // Vrstvy jedné konstrukce (zdivo + izolace) → jedna stěna. MUSÍ být
        // před spojováním otvorů: dokud jsou vrstvy zvlášť, mají obě strany
        // dveří různou tloušťku a jako jedna zeď se nepoznají.
        if (nast.bezSlucovaniVrstev !== true) v = sloucVrstvy(v, mnb, nast);
        // osamocená omítka stěnou není — vrstva, která se k ničemu nepřilepila, jde ven
        v = v.filter(o => !o.vrstva || o.tloustka >= (nast.minTloustka ?? 0.075));
        // otvor (okno, dveře) stěnu nepřerušuje — zeď pod ním pokračuje
        if (nast.bezSpojeniOtvoru !== true) v = spojPresOtvory(v, mnb, nast);
        // pár opakujících se tlouštěk místo desítek odečtených hodnot
        if (nast.bezSrovnaniTloustek !== true) v = srovnejTloustky(v, mnb, nast);
        // na jednom místě jen jedna zeď
        v = odstranPrekryvy(v, mnb, nast);
        v = v.filter(o => Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * mnb >= (nast.minDelkaSteny ?? 0.3));

        if (obvod.length) {
            // Je-li znám obvod domu, vnitřní příčky se k němu dotahují a
            // drží se jen to, co s ním souvisí. Kopie — obvod se nemění.
            const kopieObvodu = obvod.map(o => ({ ...o, obvodova: true }));
            const spolu = spojRohy(v.concat(kopieObvodu), mnb, nast.dosahRohuM ?? 0.4);
            const propojene = nast.jenNejvetsiSit === false
                ? spolu
                : nejvetsiSit(spolu, mnb, nast.dosahSiteM ?? 0.35);
            v = propojene.filter(o => !o.obvodova);
        } else {
            v = spojRohy(v, mnb, nast.dosahRohuM ?? 0.4);
            if (nast.jenNejvetsiSit !== false) v = nejvetsiSit(v, mnb, nast.dosahSiteM ?? 0.35);
        }

        v = sloucKolinearni(v, mnb, nast.mezeraM ?? 0.15);
        // po protažení rohů mohly vzniknout nové překryvy
        v = odstranPrekryvy(v, mnb, nast);
        // krátké kusy schované uvnitř jiné stěny (ostění otvorů) jsou navíc
        v = odstranPohlcene(v, mnb, nast);

        // Zeď musí být aspoň tak dlouhá, jak je tlustá. Kus 22 cm dlouhý a
        // 75 cm tlustý není stěna, ale úlomek kresby (ostění, roh, kóta).
        return v.filter(o => Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * mnb
            >= o.tloustka * (nast.minPomerDelkaTloustka ?? 1));
    }

    /**
     * Ohodnotí sadu os — jak moc vypadá jako půdorys stěn.
     * Rozhoduje napojenost (stěny na sebe navazují), typické tloušťky a pravoúhlost.
     */
    function ohodnotOsy(osy, mnb) {
        if (osy.length < 4) return { skore: 0 };

        // běžné tloušťky u nás: příčky 8–15 cm, nosné 24–30, obvodové 30–50
        const TYPICKE = [0.08, 0.10, 0.115, 0.125, 0.14, 0.15, 0.175, 0.19, 0.20, 0.24, 0.25, 0.30, 0.365, 0.38, 0.40, 0.44, 0.45, 0.50];
        const delka = osy.reduce((s, o) => s + Math.hypot(o.x2 - o.x1, o.y2 - o.y1) * mnb, 0);

        const typicke = osy.filter(o => TYPICKE.some(t => Math.abs(t - o.tloustka) <= 0.025)).length / osy.length;

        // pravoúhlost vůči převažujícímu směru
        const uhly = osy.map(o => ((Math.atan2(o.y2 - o.y1, o.x2 - o.x1) * 180 / Math.PI) % 180 + 180) % 180);
        const kose = new Array(36).fill(0);
        uhly.forEach(u => kose[Math.floor(u / 5) % 36]++);
        const hlavniUhel = kose.indexOf(Math.max(...kose)) * 5 + 2.5;
        const pravouhle = uhly.filter(u => {
            const r = Math.abs(u - hlavniUhel) % 90;
            return Math.min(r, 90 - r) < 8;
        }).length / osy.length;

        // napojenost: konce os se potkávají s jinými osami
        const tol = 0.45 / mnb;
        let spojeno = 0;
        for (const a of osy) {
            for (const konec of [[a.x1, a.y1], [a.x2, a.y2]]) {
                const ok = osy.some(b => {
                    if (b === a) return false;
                    const bx = b.x2 - b.x1, by = b.y2 - b.y1;
                    const L2 = bx * bx + by * by;
                    if (!L2) return false;
                    let t = ((konec[0] - b.x1) * bx + (konec[1] - b.y1) * by) / L2;
                    t = Math.max(0, Math.min(1, t));
                    return Math.hypot(b.x1 + bx * t - konec[0], b.y1 + by * t - konec[1]) < tol;
                });
                if (ok) spojeno++;
            }
        }
        const napojenost = spojeno / (osy.length * 2);

        // rozumná celková délka stěn rodinného domu
        const rozsah = delka > 30 && delka < 900 ? 1 : 0.35;

        // obálka: půdorys domu má desítky m², ne pruh přes celý výkres
        const xs = osy.flatMap(o => [o.x1, o.x2]);
        const ys = osy.flatMap(o => [o.y1, o.y2]);
        const sirka = (Math.max(...xs) - Math.min(...xs)) * mnb;
        const vyska = (Math.max(...ys) - Math.min(...ys)) * mnb;
        const plocha = sirka * vyska;
        const pomerStran = Math.max(sirka, vyska) / Math.max(0.01, Math.min(sirka, vyska));
        const obalka = (plocha > 25 && plocha < 2000 && pomerStran < 6) ? 1 : 0.3;

        return {
            // pokrytí (délka) váží hodně — malá, byť čistá skupinka není půdorys
            skore: napojenost * napojenost * typicke * pravouhle * rozsah * obalka * Math.min(1, delka / 120),
            napojenost, typicke, pravouhle, delka, plocha,
        };
    }

    /**
     * Týž otvor nalezený oběma cestami se nesmí vrátit dvakrát.
     *
     * Slučuje se jen podle blízkosti STŘEDŮ, ne podle šířky: rádius odvozený
     * od šířky u širokého otvoru spolkl i sousední otvor o metr a půl vedle.
     */
    function sloucOtvory(otvory, mnb, nast = {}) {
        const dosah = (nast.tolTehozOtvoruM ?? 0.30) / mnb;
        const vysledek = [];
        for (const o of otvory.sort((a, b) => b.sirka - a.sirka)) {
            if (!vysledek.some(v => Math.hypot(v.x - o.x, v.y - o.y) < dosah)) vysledek.push(o);
        }
        return vysledek;
    }

    /**
     * Otvory podél už rozpoznaných stěn.
     *
     * Jde po ose stěny a hledá úseky, kde CHYBÍ zdivo (vyplněná plocha).
     * Sama mezera nestačí — potvrdí ji až čára vedoucí středem otvoru po ose
     * zdi. Tu tam kreslí architekt vždycky (osa otvoru, kóta šířky, práh),
     * kdežto v místě, kde zeď opravdu končí, žádná není.
     *
     * @param {Array} steny    výsledné osy stěn
     * @param {Array} vyplne   syrové vyplněné plochy (zdivo)
     * @param {Array} usecky   všechny čáry výkresu
     */
    function otvoryZeSten(steny, vyplne, usecky, mnb, nast = {}) {
        const minSirka = nast.minSirkaOtvoru ?? 0.5;
        const maxSirka = nast.maxOtvorM ?? 3.2;
        const krok = (nast.krokOtvoruM ?? 0.05) / mnb;
        const tolOsy = (nast.tolOsyOtvoru ?? 0.06) / mnb;

        // jen dost dlouhé čáry, ať osu nepotvrdí šrafa
        const cary = usecky.filter(u => !u.vyplnene
            && Math.hypot(u.x2 - u.x1, u.y2 - u.y1) * mnb > minSirka * 0.5);

        const otvory = [];
        for (const s of steny) {
            const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
            const L = Math.hypot(dx, dy);
            if (!L) continue;
            const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
            const pulTl = (s.tloustka / mnb) / 2;

            // je v daném místě zdivo?
            const maZdivo = (t) => {
                const px = s.x1 + ux * t, py = s.y1 + uy * t;
                return vyplne.some(v => {
                    const vdx = v.x2 - v.x1, vdy = v.y2 - v.y1;
                    const vL2 = vdx * vdx + vdy * vdy || 1;
                    let u = ((px - v.x1) * vdx + (py - v.y1) * vdy) / vL2;
                    if (u < -0.02 || u > 1.02) return false;
                    u = Math.max(0, Math.min(1, u));
                    return Math.hypot(v.x1 + vdx * u - px, v.y1 + vdy * u - py) < (v.tloustka / mnb) / 2 + pulTl * 0.5;
                });
            };

            // souvislé úseky bez zdiva
            let zacatek = null;
            for (let t = 0; t <= L + krok; t += krok) {
                const prazdno = t <= L && !maZdivo(t);
                if (prazdno && zacatek === null) zacatek = t;
                if ((!prazdno || t > L) && zacatek !== null) {
                    const sirkaM = (t - zacatek) * mnb;
                    const uprostred = zacatek > krok && t < L - krok;   // ne u konce zdi
                    if (sirkaM >= minSirka && sirkaM <= maxSirka && uprostred) {
                        const stredT = (zacatek + t) / 2;
                        const sx = s.x1 + ux * stredT, sy = s.y1 + uy * stredT;

                        const podel = (x, y) => (x - s.x1) * ux + (y - s.y1) * uy;
                        const bok = (x, y) => (x - s.x1) * nx + (y - s.y1) * ny;

                        // PŘÍČNÁ čára středem otvoru — kolmo na zeď. Kreslí se u
                        // otvoru ve všech projektech (osa otvoru / odkaz popisku),
                        // kdežto tam, kde zeď končí, není. Rovnoběžná čára sama
                        // nestačí: bývá i podél celé zdi.
                        const stredOtvoru = (zacatek + t) / 2;
                        const dovolenoOdStredu = Math.max((t - zacatek) * 0.3, 0.12 / mnb);
                        const maPricnou = cary.some(c => {
                            let r = Math.abs(Math.atan2(c.y2 - c.y1, c.x2 - c.x1) - Math.atan2(dy, dx)) % Math.PI;
                            if (r > Math.PI / 2) r = Math.PI - r;
                            if (r < 84 * Math.PI / 180) return false;            // musí být kolmá
                            const p1 = podel(c.x1, c.y1), p2 = podel(c.x2, c.y2);
                            if (Math.abs((p1 + p2) / 2 - stredOtvoru) > dovolenoOdStredu) return false;
                            // musí protnout pás zdi, ne ležet stranou
                            const b1 = bok(c.x1, c.y1), b2 = bok(c.x2, c.y2);
                            return Math.min(b1, b2) < pulTl && Math.max(b1, b2) > -pulTl;
                        });

                        // rovnoběžná čára otvorem (práh, osa) — slabší, ale platná stopa
                        const maPodelnou = cary.some(c => {
                            let r = Math.abs(Math.atan2(c.y2 - c.y1, c.x2 - c.x1) - Math.atan2(dy, dx)) % Math.PI;
                            if (r > Math.PI / 2) r = Math.PI - r;
                            if (r > 6 * Math.PI / 180) return false;
                            if (Math.abs(bok(c.x1, c.y1)) > tolOsy) return false;
                            const c1 = Math.min(podel(c.x1, c.y1), podel(c.x2, c.y2));
                            const c2 = Math.max(podel(c.x1, c.y1), podel(c.x2, c.y2));
                            return Math.min(c2, t) - Math.max(c1, zacatek) > (t - zacatek) * 0.5;
                        });

                        if (maPricnou || maPodelnou) {
                            otvory.push({ x: sx, y: sy, sirka: sirkaM, tloustka: s.tloustka, pricna: maPricnou });
                        }
                    }
                    zacatek = null;
                }
            }
        }
        return otvory;
    }

    /**
     * Doplní otvorům typ. Dveře pozná čtvrtkruh (dráha křídla) poblíž otvoru —
     * je to jediné vodítko ve výkrese a dá i stranu, na kterou se otevírají.
     * Bez oblouku se bere podle šířky: úzké jsou dveře, široké okno.
     */
    function urciTypyOtvoru(otvory, usecky, mnb, nast = {}) {
        if (!otvory.length) return [];
        const obloukyDveri = najdiObloukyDveri(usecky, mnb, nast);

        return otvory.map(o => {
            // Oblouk patří k otvoru, jen když sedí OBOJÍ: pant leží u jeho okraje
            // a poloměr oblouku odpovídá šířce otvoru (křídlo je tak široké jako
            // otvor). Samotná blízkost nestačí — široké okno si jinak přivlastní
            // oblouk dveří o dva metry vedle.
            const oblouk = obloukyDveri.find(k => {
                const kPantu = Math.hypot(k.cx - o.x, k.cy - o.y) * mnb;
                if (kPantu > o.sirka * 0.75 + 0.15) return false;
                return Math.abs(k.sirkaM - o.sirka) <= Math.max(0.25, o.sirka * 0.3);
            });
            const typ = oblouk ? 'dvere' : (o.sirka <= (nast.mezDveriM ?? 1.1) ? 'dvere' : 'okno');
            return { x: o.x, y: o.y, sirka: o.sirka, tloustka: o.tloustka, typ, oblouk: !!oblouk };
        });
    }

    /**
     * Čtvrtkruhy dráhy dveřního křídla — jediné vodítko pro dveře a pro směr
     * otvírání (střed kružnice = pant).
     *
     * Oblouk je v PDF Bézierova křivka, ne řada úseček. Dřívější tři pokusy
     * skládat ho z úseček byly slepá ulička: křivky jsme si v parseru sami
     * zahazovali, takže se hledal signál, který v datech nebyl.
     */
    function najdiObloukyDveri(usecky, mnb, nast = {}) {
        const minR = nast.minPolomerDveri ?? 0.5;
        const maxR = nast.maxPolomerDveri ?? 1.4;
        const krivky = usecky.krivky || [];
        if (!krivky.length) return [];

        const oblouky = [];
        for (const k of krivky) {
            // tětiva zhruba odpovídá šířce dveří — hrubé síto před proložením
            const tetiva = Math.hypot(k.x2 - k.x1, k.y2 - k.y1) * mnb;
            if (tetiva < minR * 0.5 || tetiva > maxR * 2) continue;

            // body na křivce (de Casteljau v uzavřeném tvaru)
            const body = [];
            for (let i = 0; i <= 8; i++) {
                const t = i / 8, u = 1 - t;
                const w0 = u * u * u, w1 = 3 * u * u * t, w2 = 3 * u * t * t, w3 = t * t * t;
                body.push({
                    x: w0 * k.x1 + w1 * k.r1x + w2 * k.r2x + w3 * k.x2,
                    y: w0 * k.y1 + w1 * k.r1y + w2 * k.r2y + w3 * k.y2,
                });
            }

            const kruh = prolozKruznici(body);
            if (!kruh) continue;
            const rM = kruh.r * mnb;
            if (rM < minR || rM > maxR) continue;
            if (kruh.odchylka * mnb > 0.02) continue;        // musí ležet na kružnici

            const uhly = body.map(b => Math.atan2(b.y - kruh.cy, b.x - kruh.cx));
            let rozsah = (Math.max(...uhly) - Math.min(...uhly)) * 180 / Math.PI;
            if (rozsah > 180) rozsah = 360 - rozsah;
            if (rozsah < 40) continue;                        // kratší než část čtvrtkruhu

            oblouky.push({ cx: kruh.cx, cy: kruh.cy, r: kruh.r, sirkaM: rM, rozsah });
        }
        return oblouky;
    }

    /** Proložení kružnice body (Kåsa) — vrací střed, poloměr a největší odchylku. */
    function prolozKruznici(body) {
        const n = body.length;
        if (n < 4) return null;
        let sx = 0, sy = 0;
        for (const b of body) { sx += b.x; sy += b.y; }
        const cx0 = sx / n, cy0 = sy / n;
        let A11 = 0, A12 = 0, A22 = 0, B1 = 0, B2 = 0;
        for (const b of body) {
            const u = b.x - cx0, v = b.y - cy0, w = u * u + v * v;
            A11 += u * u; A12 += u * v; A22 += v * v; B1 += u * w; B2 += v * w;
        }
        const det = A11 * A22 - A12 * A12;
        if (!det) return null;
        const cx = cx0 + (B1 * A22 - B2 * A12) / (2 * det);
        const cy = cy0 + (A11 * B2 - A12 * B1) / (2 * det);
        let r = 0;
        for (const b of body) r += Math.hypot(b.x - cx, b.y - cy);
        r /= n;
        let odchylka = 0;
        for (const b of body) odchylka = Math.max(odchylka, Math.abs(Math.hypot(b.x - cx, b.y - cy) - r));
        return { cx, cy, r, odchylka };
    }

    /**
     * Najde varianty rozpoznání — pro každý styl kreslení jedna.
     * Vrací seřazené (nejslibnější první), aby šly nabídnout jako náhledy.
     */
    function navrhniVarianty(svgText, nast = {}) {
        let usecky = extrahujUsecky(svgText);

        /**
         * Křivky se vezou jako vlastnost pole úseček, takže je každé `filter()`
         * utrhne. Tahle pomůcka je přenese (a stejně ořízne) do nového pole —
         * bez ní se oblouky dveří ztratily hned na výřezu a obrysu.
         */
        const sKrivkami = (nove, puvodni, uvnitr) => {
            const k = puvodni.krivky || [];
            nove.krivky = uvnitr ? k.filter(c => uvnitr((c.x1 + c.x2) / 2, (c.y1 + c.y2) / 2)) : k;
            return nove;
        };

        // Výřez (v bodech PDF) — vyhodí legendy, tabulky a razítko, takže
        // rozpoznávání pracuje jen nad samotným půdorysem.
        if (nast.vyrez) {
            const v = nast.vyrez;
            const uvnitr = (x, y) => x >= v.x && y >= v.y && x <= v.x + v.sirka && y <= v.y + v.vyska;
            usecky = sKrivkami(usecky.filter(u => uvnitr(u.x1, u.y1) && uvnitr(u.x2, u.y2)), usecky, uvnitr);
        }

        const mnb = nast.metryNaBod || 0.03528;

        // Obrys domu obkreslený uživatelem — tvrdá hranice. Všechno venku
        // (kóty, terasa, legendy, sousední objekty) padá pryč. Z obrysu navíc
        // rovnou vzniknou obvodové stěny, takže se hledají jen vnitřní příčky.
        let obvod = [];
        if (nast.obrys && nast.obrys.length >= 3) {
            obvod = obvodoveSteny(nast.obrys, usecky, nast);
            const tolObrysu = (nast.tolerancObrysuM ?? 0.1) / mnb;
            usecky = sKrivkami(
                orezObrysem(usecky, nast.obrys, tolObrysu), usecky,
                (x, y) => vPolygonu(x, y, nast.obrys));
        }

        const skupiny = seskupPodleStylu(usecky);
        const varianty = [];
        nast = { ...nast, usecky };     // čištění potřebuje původní čáry kvůli přichytávání líců

        const zkus = (popis, skupina) => {
            if (skupina.length < 8) return;
            let syrove = osySten(skupina, nast);
            if (syrove.length < 4) return;

            // Volitelně zahodit „stěny“, které nemají uvnitř nic nakresleno.
            // POZOR: vypnuto jako výchozí — stěny bývají vyplněné i BÍLE
            // (ArchiCAD tak zakrývá kresbu pod nimi), pak je uvnitř čisto.
            if (nast.pouzitInkoust && typeof nast.vzorekInkoustu === 'function') {
                syrove = zmerInkoust(syrove, nast.vzorekInkoustu, nast)
                    .filter(o => o.inkoust >= (nast.minInkoust ?? 0.5));
                if (syrove.length < 4) return;
            }

            // otvory se sbírají i tady — dřív je uměla jen varianta z výplní,
            // takže u výkresů bez vyplněného zdiva (AutoCAD) nebyl žádný
            const sbernaOtvoru = [];
            let osy = nast.bezCisteni ? syrove : vycistiOsy(syrove, { ...nast, sbernaOtvoru }, obvod);
            if (!osy.length && !obvod.length) return;

            // Obvod z obkresleného tvaru je jistota — přidá se ke každé variantě.
            if (obvod.length) {
                osy = obvod.map(o => ({ ...o })).concat(
                    osy.filter(o => !o.obvodova && !prekryvaSadu(o, obvod, mnb, nast)));
            } else if (osy.length < 4) {
                return;
            }

            const hodnoceni = ohodnotOsy(osy, mnb);
            if (!hodnoceni.skore) return;
            varianty.push({
                styl: popis, osy, syrovych: syrove.length, usecek: skupina.length,
                // materiálem zdi je tu syrová sada kandidátů, ne vyplněné plochy
                otvory: urciTypyOtvoru(
                    sloucOtvory(sbernaOtvoru.concat(otvoryZeSten(osy, syrove, usecky, mnb, nast)), mnb, nast),
                    usecky, mnb, nast),
                ...hodnoceni,
            });
        };

        // NEJSPOLEHLIVĚJŠÍ ZDROJ: stěna nakreslená jako vyplněná plocha.
        // Osa i tloušťka se odečtou přímo z tvaru, nic se nehádá.
        const zVyplni = stenyZVyplni(usecky, nast);
        if (zVyplni.length >= 3) {
            // otvory se sbírají cestou — každá mezera, kterou zeď překlene, je otvor
            const sbernaOtvoru = [];
            let osy = nast.bezCisteni ? zVyplni : vycistiOsy(zVyplni, { ...nast, sbernaOtvoru }, obvod);
            if (obvod.length) osy = obvod.map(o => ({ ...o })).concat(
                osy.filter(o => !o.obvodova && !prekryvaSadu(o, obvod, mnb, nast)));
            const hodnoceni = ohodnotOsy(osy, mnb);
            if (hodnoceni.skore) {
                varianty.push({
                    styl: 'stěny jako vyplněné plochy',
                    osy, syrovych: zVyplni.length, usecek: usecky.length,
                    // dva zdroje: mezery překlenuté při čištění + průchody podél hotových stěn
                    otvory: urciTypyOtvoru(
                        sloucOtvory(sbernaOtvoru.concat(otvoryZeSten(osy, zVyplni, usecky, mnb, nast)), mnb, nast),
                        usecky, mnb, nast),
                    ...hodnoceni,
                    // tenhle zdroj je průkazný, ne odhad — ať se nabídne první
                    skore: hodnoceni.skore * 1.6,
                });
            }
        }

        // Stěna může mít každou stranu jiným perem — proto i varianta přes všechny styly.
        zkus('všechny čáry dohromady', usecky);
        for (const [styl, skupina] of skupiny) zkus(styl, skupina);

        // Nejčastější případ v CAD: stěna je vyplněná plocha (bílá, šedá, šrafa).
        // Líce jedné stěny pak leží na stejném obrysu → páruje se jen uvnitř něj.
        const vyplnene = usecky.filter(u => u.vyplnene);
        if (vyplnene.length >= 8) {
            const podleObrysu = new Map();
            for (const u of vyplnene) {
                if (!podleObrysu.has(u.obrys)) podleObrysu.set(u.obrys, []);
                podleObrysu.get(u.obrys).push(u);
            }
            let osyZVyplni = [];
            for (const obrys of podleObrysu.values()) {
                if (obrys.length < 4) continue;
                osyZVyplni = osyZVyplni.concat(osySten(obrys, nast));
            }
            if (osyZVyplni.length >= 4) {
                let osy = nast.bezCisteni ? osyZVyplni : vycistiOsy(osyZVyplni, nast, obvod);
                if (obvod.length) osy = obvod.map(o => ({ ...o })).concat(
                    osy.filter(o => !o.obvodova && !prekryvaSadu(o, obvod, mnb, nast)));
                const hodnoceni = ohodnotOsy(osy, mnb);
                if (hodnoceni.skore) {
                    varianty.push({
                        styl: 'vyplněné plochy (stěny jako plocha)',
                        osy, syrovych: osyZVyplni.length, usecek: vyplnene.length, ...hodnoceni,
                    });
                }
            }
        }

        varianty.sort((a, b) => b.skore - a.skore);

        // Nenabízet čtyři skoro stejné věci: podobné varianty se sloučí
        // (zůstane lepší) a slabé se vůbec neukážou.
        const ruzne = [];
        for (const v of varianty) {
            if (ruzne.some(p => podobneVarianty(p.osy, v.osy, mnb))) continue;
            if (ruzne.length && v.skore < ruzne[0].skore * (nast.minPodilSkore ?? 0.35)) continue;
            ruzne.push(v);
        }

        return { varianty: ruzne.slice(0, nast.maxVariant || 4), usecekCelkem: usecky.length };
    }

    /**
     * Jsou dvě varianty prakticky totéž? (většina stěn na stejném místě)
     * Uživateli nemá smysl nabízet čtyři na pohled shodné výsledky.
     */
    function podobneVarianty(a, b, mnb, nast = {}) {
        if (!a.length || !b.length) return false;
        const prah = nast.prahPodobnosti ?? 0.75;
        const rezerva = (nast.tolPodobnostiM ?? 0.15) / mnb;

        // Kolik délky jedné sady leží v pásech té druhé. Porovnávat koncové
        // body nestačí — varianty kreslí tytéž stěny jen trochu jinak dlouhé.
        const pokryti = (prvni, druha) => {
            let celkem = 0, kryto = 0;
            for (const s of prvni) {
                const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
                const L = Math.hypot(dx, dy);
                if (!L) continue;
                celkem += L;

                const kroku = 10;
                let trefy = 0;
                for (let i = 0; i < kroku; i++) {
                    const t = (i + 0.5) / kroku;
                    const px = s.x1 + dx * t, py = s.y1 + dy * t;
                    const uvnitr = druha.some(p => {
                        let rozdil = Math.abs(Math.atan2(dy, dx) - Math.atan2(p.y2 - p.y1, p.x2 - p.x1)) % Math.PI;
                        if (rozdil > Math.PI / 2) rozdil = Math.PI - rozdil;
                        if (rozdil > 8 * Math.PI / 180) return false;

                        const pdx = p.x2 - p.x1, pdy = p.y2 - p.y1;
                        const pL2 = pdx * pdx + pdy * pdy || 1;
                        let u = ((px - p.x1) * pdx + (py - p.y1) * pdy) / pL2;
                        if (u < -0.05 || u > 1.05) return false;
                        u = Math.max(0, Math.min(1, u));
                        const vzd = Math.hypot(p.x1 + pdx * u - px, p.y1 + pdy * u - py);
                        return vzd < (p.tloustka / mnb) / 2 + rezerva;
                    });
                    if (uvnitr) trefy++;
                }
                kryto += L * (trefy / kroku);
            }
            return celkem ? kryto / celkem : 0;
        };

        return Math.min(pokryti(a, b), pokryti(b, a)) >= prah;
    }

    /** Osy (body PDF) → data pro engine: stěny v metrech, osa y nahoru. */
    function osyNaSteny(osy, mnb, stred = null) {
        if (!osy.length) return [];
        let sx = 0, sy = 0;
        if (!stred) {
            const xs = osy.flatMap(o => [o.x1, o.x2]);
            const ys = osy.flatMap(o => [o.y1, o.y2]);
            sx = (Math.min(...xs) + Math.max(...xs)) / 2;
            sy = (Math.min(...ys) + Math.max(...ys)) / 2;
        } else {
            sx = stred[0]; sy = stred[1];
        }

        return osy.map((o, i) => ({
            // id musí být stálé, aby se na stěnu daly navázat otvory (viz otvoryNaSteny)
            id: 'W' + (i + 1),
            od: [(o.x1 - sx) * mnb, -(o.y1 - sy) * mnb],
            do: [(o.x2 - sx) * mnb, -(o.y2 - sy) * mnb],
            tloustka: o.tloustka,
            // obvod z obkresleného tvaru → rovnou správný typ stěny
            ...(o.obvodova ? { typ: 'obvodova' } : {}),
        }));
    }

    /**
     * Přiřadí rozpoznané otvory ke stěnám a spočítá polohu podél nich.
     *
     * Analýza vrací jen střed otvoru v bodech PDF; editor potřebuje id stěny
     * a vzdálenost LEVÉHO okraje otvoru od začátku té stěny (tak to má engine).
     * Číslování stěn musí odpovídat `osyNaSteny` nad toutéž sadou os.
     *
     * Otvor, který nesedí na žádnou stěnu nebo se do ní nevejde, se zahodí —
     * vymyšlený objekt v editoru vadí víc než chybějící.
     */
    function otvoryNaSteny(osy, otvory, mnb, nast = {}) {
        if (!osy.length || !otvory || !otvory.length) return [];
        const maxOdsazeni = (nast.tolOtvoruKeStene ?? 0.35) / mnb;
        const minSirkaOtvoru = nast.minSirkaOtvoruM ?? 0.5;   // užší otvor se nestaví
        const minSirkaDveri = nast.minSirkaDveriM ?? 0.6;     // ČSN 74 6401
        const vysledek = [];

        // Uzly, kde se potkávají stěny. Otvor přes takové místo je nesmysl —
        // v T-spoji dvou zdí díra být nemůže.
        const uzly = [];
        for (const s of osy) {
            for (const [x, y] of [[s.x1, s.y1], [s.x2, s.y2]]) {
                const stejny = uzly.find(u => Math.hypot(u.x - x, u.y - y) * mnb < 0.05);
                if (stejny) stejny.pocet++;
                else uzly.push({ x, y, pocet: 1 });
            }
        }
        const spoje = uzly.filter(u => u.pocet >= 2);

        for (const o of otvory) {
            if (o.sirka < minSirkaOtvoru) continue;
            let nej = null, nejD = maxOdsazeni;
            for (let i = 0; i < osy.length; i++) {
                const s = osy[i];
                const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
                const L2 = dx * dx + dy * dy;
                if (!L2) continue;
                const t = ((o.x - s.x1) * dx + (o.y - s.y1) * dy) / L2;
                if (t < 0 || t > 1) continue;                  // mimo úsek stěny
                const d = Math.hypot(s.x1 + dx * t - o.x, s.y1 + dy * t - o.y);
                if (d < nejD) { nejD = d; nej = { i, s, t, L: Math.sqrt(L2) }; }
            }
            if (!nej) continue;

            const delkaM = nej.L * mnb;
            if (delkaM < o.sirka) continue;                     // otvor by přečníval
            const stredM = nej.t * delkaM;
            const pozice = Math.max(0, Math.min(delkaM - o.sirka, stredM - o.sirka / 2));

            // dveře pod normovou šířku neexistují — ber to jako okno
            let typ = o.typ || 'dvere';
            if (typ !== 'okno' && o.sirka < minSirkaDveri) typ = 'okno';

            // vede otvorem spoj se sousední stěnou?
            const s = nej.s;
            const ux = (s.x2 - s.x1) / nej.L, uy = (s.y2 - s.y1) / nej.L;
            const vSpoji = spoje.some(u => {
                const podel = ((u.x - s.x1) * ux + (u.y - s.y1) * uy) * mnb;
                const bok = Math.abs((u.x - s.x1) * -uy + (u.y - s.y1) * ux) * mnb;
                return bok < s.tloustka && podel > pozice + 0.02 && podel < pozice + o.sirka - 0.02;
            });
            if (vSpoji) continue;

            vysledek.push({ stena: 'W' + (nej.i + 1), pozice, sirka: o.sirka, typ });
        }

        // Na jednom místě zdi může být jen jeden otvor. Když se dva překrývají,
        // zůstane širší — užší bývá kus téhož otvoru nalezený podruhé.
        vysledek.sort((a, b) => b.sirka - a.sirka);
        const bezPrekryvu = [];
        for (const o of vysledek) {
            const koliduje = bezPrekryvu.some(v => v.stena === o.stena
                && Math.min(v.pozice + v.sirka, o.pozice + o.sirka) - Math.max(v.pozice, o.pozice) > 0.02);
            if (!koliduje) bezPrekryvu.push(o);
        }
        return bezPrekryvu;
    }

    const api = {
        extrahujUsecky, klicStylu, seskupPodleStylu,
        osySten, ohodnotOsy, navrhniVarianty, osyNaSteny, otvoryNaSteny,
        vycistiOsy, narovnej, odstranHrebeny,
        vPolygonu, orezObrysem, obvodoveSteny,
        shlukyTlousteks, vyberPodleRozdeleni, postavRastr, plochyVRastru,
        stenyZVyplni, urciTypyOtvoru, otvoryZeSten, sloucOtvory, najdiObloukyDveri, odstranPrekryvy, spojPresOtvory, sloucVrstvy, srovnejTloustky, prekryvaSadu, odstranPohlcene, prichytLice, podobneVarianty, sloucKolinearni, spojRohy, nejvetsiSit,
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    globalni.ImportAnalyza = api;
})(typeof self !== 'undefined' ? self : globalThis);
