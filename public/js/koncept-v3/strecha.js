/**
 * Střecha po hranách obrysu (Koncept V3) — čistá geometrie, bez kresby.
 *
 * Každá hrana obrysu je buď OKAP (střešní rovina z ní stoupá se sklonem), nebo ŠTÍT
 * (svislá stěna). Sedlová = dva okapy a dva štíty, valbová = samé okapy, pultová =
 * jeden okap. Typ střechy v nabídce je jen předvolba tohoto nastavení, stejný model
 * pokryje i domy do L a T.
 *
 * Výpočet je vážená „střešní kostra": obrys se po výškových vrstvách stahuje dovnitř,
 * každá hrana rychlostí 1/tg(sklon), štít rychlostí 0. Mezi dvěma událostmi (hrana
 * se stáhne na nulu, vnitřní roh narazí do protější hrany) je každá plocha lichoběžník;
 * ty se rovnou zapisují jako trojúhelníky, takže není potřeba skládat plochy dohromady.
 *
 * Souřadnice: metry v orientaci plátna (x, y dolů), z nahoru.
 */
(function (koren) {
    const EPS = 1e-7;
    /** Nejdelší schod na straně okapu, který sedlová předvolba ještě bere jako okap (m). */
    const SCHOD_MAX_M = 2.5;

    const plochaPolygonu = (p) => {
        let a = 0;
        for (let i = 0; i < p.length; i++) {
            const q = p[(i + 1) % p.length];
            a += p[i].x * q.y - q.x * p[i].y;
        }
        return a / 2;
    };

    /** Přímka hrany: n·p = c + w·t (t = výška nad startem). n je vnitřní normála. */
    function hranaZBodu(a, b, w, data) {
        const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
        const n = { x: -dy / L, y: dx / L };
        return { n, c: n.x * a.x + n.y * a.y, w, d: { x: dx / L, y: dy / L }, data };
    }

    /** Průsečík dvou pohyblivých přímek jako bod A + V·t, null když jsou rovnoběžné. */
    function vrcholPohyb(e1, e2) {
        const det = e1.n.x * e2.n.y - e1.n.y * e2.n.x;
        if (Math.abs(det) < 1e-6) return null;
        return {
            ax: (e1.c * e2.n.y - e2.c * e1.n.y) / det,
            ay: (e1.n.x * e2.c - e2.n.x * e1.c) / det,
            vx: (e1.w * e2.n.y - e2.w * e1.n.y) / det,
            vy: (e1.n.x * e2.w - e2.n.x * e1.w) / det,
        };
    }
    const bodV = (v, t) => ({ x: v.ax + v.vx * t, y: v.ay + v.vy * t });

    /**
     * Stáhne smyčku hran od výšky t; výstup jde do `vystup`.
     * Rekurze jen při rozdělení smyčky (vnitřní roh narazil do protější hrany).
     */
    function stahuj(hrany, t, nast, vystup, hloubka = 0) {
        let iter = 0;
        // Koncový bod hrany v čase t (po poslední události); u protilehlých splývajících sousedů
        // je to jejich společný bod, ze kterého vede hřeben
        const konce = new Map();
        while (hrany.length >= 3 && iter++ < 400 && hloubka < 40) {
            // Sousední rovnoběžné hrany: souosé se sloučí, protilehlé a splývající se překrývají (hřeben)
            let upraveno = false;
            for (let i = 0; i < hrany.length; i++) {
                const m = hrany.length;
                const j = (i + 1) % m;
                const a = hrany[i], b = hrany[j];
                const det = a.n.x * b.n.y - a.n.y * b.n.x;
                if (Math.abs(det) >= 1e-6) continue;
                const souhlas = a.n.x * b.n.x + a.n.y * b.n.y > 0;
                if (souhlas && Math.abs(a.c + a.w * t - (b.c + b.w * t)) < 1e-4) {
                    if (konce.has(b)) konce.set(a, konce.get(b));
                    hrany = hrany.filter((_, k) => k !== j);
                    upraveno = true;
                    break;
                }
                if (!souhlas && Math.abs(a.c + a.w * t + (b.c + b.w * t)) < 1e-4) {
                    // Obě leží na jedné přímce a jdou proti sobě. Zmizí jen kratší z nich, delší
                    // pokračuje dál (dům se schodem na dlouhé straně: v užší části se okapy
                    // potkají dřív, v širší části střecha pokračuje). Dřív mizely obě a v širší
                    // části zůstala díra.
                    const vA = vrcholPohyb(hrany[(i + m - 1) % m], a), vB = vrcholPohyb(b, hrany[(j + 1) % m]);
                    if (!vA || !vB || m < 4) {
                        hrany = hrany.filter((_, k) => k !== i && k !== j);
                        upraveno = true;
                        break;
                    }
                    const pA = bodV(vA, t), pB = bodV(vB, t);
                    const sA = a.d.x * pA.x + a.d.y * pA.y, sB = a.d.x * pB.x + a.d.y * pB.y;
                    const spolecny = konce.get(a);
                    const zbytek = Math.abs(sA - sB) < 1e-4 ? null : (sA < sB ? pB : pA);
                    if (spolecny) {
                        const od = zbytek || (sA < sB ? pB : pA);
                        if (Math.hypot(od.x - spolecny.x, od.y - spolecny.y) > 1e-3) vystup.hrebeny.push([{ ...od, z: t }, { ...spolecny, z: t }]);
                    }
                    if (!zbytek) {
                        hrany = hrany.filter((_, k) => k !== i && k !== j);
                    } else if (sA < sB) {
                        // a je delší: b zmizí, a končí tam, kde začínala hrana za b
                        konce.set(a, pB);
                        hrany = hrany.filter((_, k) => k !== j);
                    } else {
                        // b je delší: a zmizí, b navazuje na hranu před a
                        hrany = hrany.filter((_, k) => k !== i);
                    }
                    upraveno = true;
                    break;
                }
                // Rovnoběžné, ale nesplývají: tvar se tímhle modelem neřeší, smyčka končí
                return;
            }
            if (upraveno) continue;

            const n = hrany.length;
            const vrcholy = hrany.map((e, i) => vrcholPohyb(hrany[(i + n - 1) % n], e));
            if (vrcholy.some(v => !v)) return;
            const body = vrcholy.map(v => bodV(v, t));
            if (Math.abs(plochaPolygonu(body)) < 1e-4) {
                // Plocha se stáhla na úsečku: to je hřeben
                for (let i = 0; i < n; i++) {
                    const q = body[(i + 1) % n];
                    if (Math.hypot(q.x - body[i].x, q.y - body[i].y) > 1e-3) vystup.hrebeny.push([{ ...body[i], z: t }, { ...q, z: t }]);
                }
                return;
            }

            // Nejbližší událost: hrana se stáhne na nulu
            let tUdalost = Infinity, rozdeleni = null;
            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                const d = hrany[i].d;
                const L0 = d.x * (vrcholy[j].ax - vrcholy[i].ax) + d.y * (vrcholy[j].ay - vrcholy[i].ay);
                const L1 = d.x * (vrcholy[j].vx - vrcholy[i].vx) + d.y * (vrcholy[j].vy - vrcholy[i].vy);
                if (L1 >= -EPS) continue;
                const te = -L0 / L1;
                if (te >= t - 1e-6 && te < tUdalost) tUdalost = Math.max(te, t);
            }
            // …nebo vnitřní roh narazí do protější hrany
            for (let i = 0; i < n; i++) {
                const pred = hrany[(i + n - 1) % n], po = hrany[i];
                const vnitrni = pred.d.x * po.d.y - pred.d.y * po.d.x < -1e-6;
                if (!vnitrni) continue;
                const v = vrcholy[i];
                for (let j = 0; j < n; j++) {
                    if (j === i || j === (i + n - 1) % n) continue;
                    const e = hrany[j];
                    const zaklad = e.n.x * v.ax + e.n.y * v.ay - e.c;
                    const rychlost = e.n.x * v.vx + e.n.y * v.vy - e.w;
                    if (Math.abs(rychlost) < 1e-9) continue;
                    const ts = -zaklad / rychlost;
                    if (ts < t - 1e-6 || ts >= tUdalost - 1e-6) continue;
                    const p = bodV(v, ts);
                    const a = bodV(vrcholy[j], ts), b = bodV(vrcholy[(j + 1) % n], ts);
                    const s = (p.x - a.x) * e.d.x + (p.y - a.y) * e.d.y;
                    const L = (b.x - a.x) * e.d.x + (b.y - a.y) * e.d.y;
                    if (s < -1e-4 || s > L + 1e-4) continue;
                    tUdalost = Math.max(ts, t);
                    rozdeleni = { i, j };
                }
            }
            if (!isFinite(tUdalost) || tUdalost > nast.maxT) {
                // Nic se už nestane (samé štíty) nebo by střecha rostla do nesmyslné výšky
                return;
            }

            // Vrstva mezi t a tUdalost: lichoběžník na každou hranu, hřebenáče a úžlabí mezi nimi
            const horni = vrcholy.map(v => bodV(v, tUdalost));
            for (let i = 0; i < n; i++) {
                const j = (i + 1) % n;
                const a = { ...body[i], z: t }, b = { ...body[j], z: t };
                const c = { ...horni[j], z: tUdalost }, d = { ...horni[i], z: tUdalost };
                const e = hrany[i];
                if (Math.hypot(b.x - a.x, b.y - a.y) > 1e-5) e.data.troj.push([a, b, c]);
                if (Math.hypot(c.x - d.x, c.y - d.y) > 1e-5) e.data.troj.push([a, c, d]);
                if (tUdalost - t > 1e-5 && (hrany[(i + n - 1) % n].w > 0 || e.w > 0) && Math.hypot(a.x - d.x, a.y - d.y) + (tUdalost - t) > 1e-4) {
                    vystup.hrebeny.push([a, d]);
                }
            }
            t = tUdalost;

            if (rozdeleni) {
                const { i, j } = rozdeleni;
                const smycka1 = [], smycka2 = [];
                for (let k = i; ; k = (k + 1) % n) { smycka1.push(hrany[k]); if (k === j) break; }
                for (let k = j; ; k = (k + 1) % n) { smycka2.push(hrany[k]); if (k === (i + n - 1) % n) break; }
                stahuj(smycka1, t, nast, vystup, hloubka + 1);
                stahuj(smycka2, t, nast, vystup, hloubka + 1);
                return;
            }
            // Hrany s nulovou délkou zmizí
            const zbyva = hrany.filter((e, i) => {
                const j = (i + 1) % n;
                return Math.hypot(horni[j].x - horni[i].x, horni[j].y - horni[i].y) > 1e-4;
            });
            if (zbyva.length === n) return;   // pojistka proti zacyklení
            if (zbyva.length < 3) {
                for (let i = 0; i < n; i++) {
                    const j = (i + 1) % n;
                    if (Math.hypot(horni[j].x - horni[i].x, horni[j].y - horni[i].y) > 1e-3) vystup.hrebeny.push([{ ...horni[i], z: t }, { ...horni[j], z: t }]);
                }
                return;
            }
            konce.clear();
            hrany.forEach((e, i) => { konce.set(e, horni[(i + 1) % n]); });
            hrany = zbyva;
        }
    }

    /** Obrys posunutý ven: každá hrana o `presah[i]`, nové vrcholy = průsečíky sousedů. */
    function odsadObrys(body, presah) {
        const n = body.length;
        const hrany = body.map((a, i) => {
            const b = body[(i + 1) % n];
            const e = hranaZBodu(a, b, 0);
            e.c -= presah[i];
            return e;
        });
        return hrany.map((e, i) => {
            const pred = hrany[(i + n - 1) % n];
            const v = vrcholPohyb(pred, e);
            return v ? { x: v.ax, y: v.ay } : { ...body[i] };
        });
    }

    // ─── Ořez výsledku půdorysem střechy ─────────────────────
    /** Rozklad jednoduchého mnohoúhelníku (kladná plocha) na trojúhelníky; konvexní zůstane celý. */
    function konvexniDily(poly) {
        const n = poly.length;
        const vektor = (a, b, c) => (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
        let konvexni = true;
        for (let i = 0; i < n; i++) {
            if (vektor(poly[i], poly[(i + 1) % n], poly[(i + 2) % n]) < -1e-9) { konvexni = false; break; }
        }
        if (konvexni) return [poly];
        const zbyva = poly.map(p => p);
        const dily = [];
        let pojistka = n * n + 4;
        while (zbyva.length > 3 && pojistka-- > 0) {
            for (let i = 0; i < zbyva.length; i++) {
                const m = zbyva.length;
                const a = zbyva[(i + m - 1) % m], b = zbyva[i], c = zbyva[(i + 1) % m];
                if (vektor(a, b, c) <= 1e-9) continue;
                const uvnitr = zbyva.some(q => q !== a && q !== b && q !== c
                    && vektor(a, b, q) >= -1e-9 && vektor(b, c, q) >= -1e-9 && vektor(c, a, q) >= -1e-9);
                if (uvnitr) continue;
                dily.push([a, b, c]);
                zbyva.splice(i, 1);
                break;
            }
        }
        if (zbyva.length === 3) dily.push(zbyva);
        return dily;
    }

    /** Sutherland–Hodgman: body {x,y,z} oříznuté konvexním dílem s kladnou plochou. */
    function orizniKonvexnim(body, dil, uzavrene = true) {
        let out = body;
        for (let i = 0; i < dil.length && out.length; i++) {
            const a = dil[i], b = dil[(i + 1) % dil.length];
            const f = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
            const dalsi = [];
            const m = out.length;
            const pocet = uzavrene ? m : m - 1;
            for (let k = 0; k < pocet; k++) {
                const p = out[k], q = out[(k + 1) % m];
                const fp = f(p), fq = f(q);
                if (fp >= -1e-9) dalsi.push(p);
                if ((fp >= -1e-9) !== (fq >= -1e-9)) {
                    const t = fp / (fp - fq);
                    dalsi.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, z: p.z + (q.z - p.z) * t });
                }
            }
            if (!uzavrene && m && f(out[m - 1]) >= -1e-9) dalsi.push(out[m - 1]);
            out = dalsi;
        }
        return out;
    }

    function orizniTroj(troj, dily) {
        const vysledek = [];
        for (const t of troj) {
            for (const dil of dily) {
                const c = orizniKonvexnim(t, dil);
                for (let i = 1; i < c.length - 1; i++) {
                    const u = [c[0], c[i], c[i + 1]];
                    const pl = Math.abs((u[1].x - u[0].x) * (u[2].y - u[0].y) - (u[1].y - u[0].y) * (u[2].x - u[0].x))
                        + Math.abs(u[1].z - u[0].z) + Math.abs(u[2].z - u[0].z);
                    if (pl > 1e-7) vysledek.push(u);
                }
            }
        }
        return vysledek;
    }

    function orizniUsecky(usecky, dily) {
        const vysledek = [];
        for (const u of usecky) {
            for (const dil of dily) {
                const c = orizniKonvexnim(u, dil, false);
                if (c.length >= 2 && Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y) + Math.abs(c[1].z - c[0].z) > 1e-4) vysledek.push([c[0], c[1]]);
            }
        }
        return vysledek;
    }

    /**
     * Skutečné hodnoty hran: co hrana nemá nastavené sama, bere z celku. Spodní hrany okapů
     * leží ve stejné výšce, proto je u strmější plochy přesah menší. Vlastní přesah je přímo
     * vodorovná vzdálenost od líce: rovina se posune tak, aby okap zůstal ve stejné výšce,
     * nároží pak vychází z rohu půdorysu a v rohu nevznikne zub. Jiná spodní výška okapu
     * je jen tam, kde má hrana vlastní výšku okapu.
     */
    function parametryHran(hrany, nast) {
        const zaklad = Math.tan((nast.sklon || 35) * Math.PI / 180);
        const klesnuti = Math.max(0, nast.presah || 0) * zaklad;
        const zCelek = nast.zOkap || 0;
        return hrany.map((h) => {
            const sklon = h.sklon || nast.sklon || 35;
            const tg = Math.tan(sklon * Math.PI / 180);
            const presah = typeof h.presah === 'number' ? Math.max(0, h.presah)
                : (h.typ === 'okap' ? klesnuti / tg : Math.max(0, nast.presahStit || 0));
            const z = typeof h.zOkap === 'number' ? h.zOkap
                : (h.typ === 'okap' && typeof h.presah === 'number' ? zCelek - klesnuti + presah * tg : zCelek);
            return { sklon, tg, z, presah, spodek: h.typ === 'okap' ? z - presah * tg : null };
        });
    }

    /**
     * @param {Array<{a:{x,y}, b:{x,y}, typ:'okap'|'stit', sklon:number, presah?:number, zOkap?:number}>} hrany
     *        obrys v pořadí (m); presah a zOkap jsou vlastní hodnoty hrany, jinak platí celek
     * @param {{zOkap:number, presah:number, presahStit:number, sklon:number}} nast
     *        zOkap = výška, ve které střešní rovina protíná líc stěny; presah = vodorovný
     *        přesah okapu (podle základního sklonu), presahStit = přesah přes štít
     * @returns {{plochy:Array, stity:Array, hrebeny:Array, okraj:Array, zStart:number, zMax:number, zOkapMin:number}}
     */
    function vypocet(hrany, nast) {
        let body = hrany.map(h => ({ x: h.a.x, y: h.a.y }));
        let serazene = hrany;
        if (plochaPolygonu(body) < 0) {
            // Vnitřek musí být vlevo od směru hrany
            serazene = [...hrany].reverse().map(h => ({ ...h, a: h.b, b: h.a }));
            body = serazene.map(h => ({ x: h.a.x, y: h.a.y }));
        }
        const par = parametryHran(serazene, nast);
        const okapy = par.filter((_, i) => serazene[i].typ === 'okap');
        const zOkapMin = okapy.length ? Math.min(...okapy.map(q => q.z)) : (nast.zOkap || 0);
        const maxT = nast.maxVyska || 40;

        /** Jedna stavba kostry: `presahy` určují půdorys střechy, roviny vždy procházejí lícem ve své výšce. */
        const beh = (presahy) => {
            const okraj = odsadObrys(body, presahy);
            const data = serazene.map((h) => ({ hrana: h.index, typ: h.typ, troj: [] }));
            const hranyOkraje = serazene.map((h, i) => hranaZBodu(body[i], body[(i + 1) % body.length], 0, data[i]));
            const spodky = serazene.map((h, i) => (h.typ === 'okap' ? par[i].z - presahy[i] * par[i].tg : null)).filter(z => z !== null);
            const start = spodky.length ? Math.min(...spodky) : (nast.zOkap || 0);
            const smycka = hranyOkraje.map((e, i) => {
                if (serazene[i].typ === 'okap') {
                    const w = 1 / par[i].tg;
                    return { ...e, w, c: e.c - w * par[i].z };   // v t = z leží přímka v líci
                }
                return { ...e, w: 0, c: e.c - presahy[i] };
            });
            const vystup = { hrebeny: [] };
            stahuj(smycka, start, { maxT: start + maxT }, vystup);
            // Roviny s různým spodkem začínají venku za svým okapem: půdorys je ořízne
            let hrebeny = vystup.hrebeny;
            const rovne = !spodky.length || spodky.every(z => Math.abs(z - start) < 1e-6);
            if (!rovne) {
                const dily = konvexniDily(okraj);
                for (const d of data) d.troj = orizniTroj(d.troj, dily);
                hrebeny = orizniUsecky(hrebeny, dily);
            }
            return { okraj, data, hrebeny, start };
        };

        // Plochy střechy s přesahy, štítové stěny přesně v líci a mezi nárožími domu
        const strecha = beh(par.map(q => q.presah));
        const stity = beh(serazene.map(() => 0));

        const plochy = strecha.data.map((d, i) => ({
            hrana: d.hrana, typ: d.typ, troj: d.troj,
            n: hranaZBodu(body[i], body[(i + 1) % body.length], 0).n,
            d: hranaZBodu(body[i], body[(i + 1) % body.length], 0).d,
            tg: par[i].tg,
        })).filter(d => d.typ === 'okap' && d.troj.length);
        const stityVystup = stity.data.filter(d => d.typ === 'stit' && d.troj.length).map(d => ({ hrana: d.hrana, troj: d.troj }));
        let zMax = strecha.start;
        for (const pl of plochy) for (const t of pl.troj) for (const b of t) if (b.z > zMax) zMax = b.z;
        return { plochy, stity: stityVystup, hrebeny: strecha.hrebeny, okraj: strecha.okraj, zStart: strecha.start, zMax, zOkapMin };
    }

    /** Výška střechy nad bodem (m), null mimo plochy. Bere nejnižší z ploch nad bodem. */
    function vyskaVBode(plochy, x, y) {
        let nej = null;
        for (const pl of plochy) {
            for (const t of pl.troj) {
                const [a, b, c] = t;
                const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
                if (Math.abs(det) < 1e-9) continue;
                const u = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / det;
                const v = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / det;
                const w = 1 - u - v;
                if (u < -1e-4 || v < -1e-4 || w < -1e-4) continue;
                const z = u * a.z + v * b.z + w * c.z;
                if (nej === null || z < nej) nej = z;
            }
        }
        return nej;
    }

    /** Vrstevnice ve výšce z: úsečky průniku trojúhelníků s vodorovnou rovinou. */
    function izocara(plochy, z) {
        const usecky = [];
        for (const pl of plochy) {
            for (const t of pl.troj) {
                const body = [];
                for (let i = 0; i < 3; i++) {
                    const a = t[i], b = t[(i + 1) % 3];
                    if ((a.z - z) * (b.z - z) > 0 || a.z === b.z) continue;
                    const k = (z - a.z) / (b.z - a.z);
                    body.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
                }
                if (body.length >= 2 && Math.hypot(body[1].x - body[0].x, body[1].y - body[0].y) > 1e-4) usecky.push([body[0], body[1]]);
            }
        }
        return usecky;
    }

    /** Části střešních ploch pod výškou z jako mnohoúhelníky (půdorys). */
    function podUrovni(plochy, z) {
        const vysledek = [];
        for (const pl of plochy) {
            for (const t of pl.troj) {
                const out = [];
                for (let i = 0; i < 3; i++) {
                    const a = t[i], b = t[(i + 1) % 3];
                    if (a.z <= z) out.push({ x: a.x, y: a.y });
                    if ((a.z <= z) !== (b.z <= z)) {
                        const k = (z - a.z) / (b.z - a.z);
                        out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k });
                    }
                }
                if (out.length >= 3) vysledek.push(out);
            }
        }
        return vysledek;
    }

    /**
     * Vnější obrys z rastru místností (mistnosti.js): vše mimo exteriér. Prochází hranice
     * buněk (vnitřek vpravo), zjednoduší Douglas-Peuckerem. Vrací body v px plátna.
     */
    function obrysZRastru(v) {
        const { w, h, stitky, x0, y0, krok } = v;
        const uvnitr = (x, y) => x >= 0 && y >= 0 && x < w && y < h && stitky[y * w + x] !== 1;
        let sx = -1, sy = -1;
        hledej: for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (uvnitr(x, y)) { sx = x; sy = y; break hledej; }
            }
        }
        if (sx < 0) return [];
        // Pohyb po rozích buněk; směr 0 = východ, 1 = jih, 2 = západ, 3 = sever (y dolů)
        const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
        const cesta = [];
        let x = sx, y = sy, s = 0, kroku = 0;
        const limit = 4 * (w + h) * 20;
        do {
            cesta.push({ x, y });
            // Buňky před námi: vlevo a vpravo od směru jízdy
            let lx, ly, px, py;
            if (s === 0) { lx = x; ly = y - 1; px = x; py = y; }
            else if (s === 1) { lx = x; ly = y; px = x - 1; py = y; }
            else if (s === 2) { lx = x - 1; ly = y; px = x - 1; py = y - 1; }
            else { lx = x - 1; ly = y - 1; px = x; py = y - 1; }
            if (uvnitr(lx, ly)) s = (s + 3) % 4;
            else if (!uvnitr(px, py)) s = (s + 1) % 4;
            x += DX[s]; y += DY[s];
        } while ((x !== sx || y !== sy) && ++kroku < limit);

        const body = cesta.map(c => ({ x: x0 + c.x * krok, y: y0 + c.y * krok }));
        return zjednodus(body, krok * 1.6);
    }

    /** Douglas-Peucker na uzavřené křivce. */
    function zjednodus(body, tol) {
        if (body.length < 4) return body;
        let dal = 0, ib = 0;
        for (let i = 1; i < body.length; i++) {
            const d = Math.hypot(body[i].x - body[0].x, body[i].y - body[0].y);
            if (d > dal) { dal = d; ib = i; }
        }
        const dp = (p) => {
            if (p.length < 3) return p;
            const a = p[0], b = p[p.length - 1];
            const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
            let m = -1, im = 0;
            for (let i = 1; i < p.length - 1; i++) {
                const d = Math.abs((p[i].x - a.x) * dy - (p[i].y - a.y) * dx) / L;
                if (d > m) { m = d; im = i; }
            }
            if (m <= tol) return [a, b];
            return dp(p.slice(0, im + 1)).slice(0, -1).concat(dp(p.slice(im)));
        };
        const c1 = dp(body.slice(0, ib + 1));
        const c2 = dp(body.slice(ib).concat([body[0]]));
        return c1.slice(0, -1).concat(c2.slice(0, -1));
    }

    /**
     * Dorovná hrany obrysu z rastru na skutečné líce stěn (rastr je po 2 cm, výsledek by
     * byl o setiny mimo a hřeben mírně křivý). Hrana dostane klíč stěna:strana, podle
     * kterého se pamatuje její nastavení. Vrací [{a, b, klic}] v px.
     */
    function hranyObrysu(body, engine) {
        const n = body.length;
        const tol = 0.08 * engine.PX_PER_M;
        const linie = body.map((a, i) => {
            const b = body[(i + 1) % n];
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            const ux = (b.x - a.x) / (L || 1), uy = (b.y - a.y) / (L || 1);
            let nej = null;
            if (L > 0.2 * engine.PX_PER_M) {
                for (const w of engine.walls.values()) {
                    for (const strana of [1, -1]) {
                        const lic = engine.rozsahLice(w.id, strana);
                        const p0 = engine.bodNaLici(w.id, lic.od, strana), p1 = engine.bodNaLici(w.id, lic.do, strana);
                        if (!p0 || !p1) continue;
                        const wx = p1.x - p0.x, wy = p1.y - p0.y, WL = Math.hypot(wx, wy);
                        if (WL < 1) continue;
                        if (Math.abs(ux * wy / WL - uy * wx / WL) > 0.06) continue;
                        const dist = (q) => Math.abs((q.x - p0.x) * wy - (q.y - p0.y) * wx) / WL;
                        const d = Math.max(dist(a), dist(b));
                        if (d > tol) continue;
                        // Musí se s hranou překrývat
                        const s0 = (a.x - p0.x) * wx / WL + (a.y - p0.y) * wy / WL;
                        const s1 = (b.x - p0.x) * wx / WL + (b.y - p0.y) * wy / WL;
                        const prekryv = Math.min(Math.max(s0, s1), WL) - Math.max(Math.min(s0, s1), 0);
                        if (prekryv < Math.min(WL, L) * 0.3) continue;
                        if (!nej || prekryv > nej.prekryv) nej = { prekryv, p: p0, dx: wx / WL, dy: wy / WL, klic: w.id + ':' + strana };
                    }
                }
            }
            return nej ? { p: nej.p, dx: nej.dx, dy: nej.dy, klic: nej.klic } : { p: a, q: b, dx: ux, dy: uy, klic: null };
        });
        // Zbytek rastru v rohu natočeného domu není hrana: celý leží na líci sousední stěny,
        // jen kvůli schodům rastru pod jiným úhlem. Sousedi se protnou přímo. Krátký schod
        // mezi rovnoběžnými stěnami je skutečný a zůstává.
        const naLinii = (s, l) => Math.abs((s.x - l.p.x) * l.dy - (s.y - l.p.y) * l.dx) <= tol;
        const bezZbytku = linie.filter((l, i) => {
            if (l.klic) return true;
            const pred = linie[(i + n - 1) % n], po = linie[(i + 1) % n];
            if (Math.abs(pred.dx * po.dy - pred.dy * po.dx) < 0.2) return true;
            return ![pred, po].some(s => s.klic && naLinii(l.p, s) && naLinii(l.q, s));
        });
        // Souosé sousedy spojit (stěna rozdělená T-napojením)
        const spojene = [];
        for (const l of bezZbytku) {
            const u = spojene[spojene.length - 1];
            if (u && Math.abs(u.dx * l.dy - u.dy * l.dx) < 0.03
                && Math.abs((l.p.x - u.p.x) * u.dy - (l.p.y - u.p.y) * u.dx) < 0.03 * engine.PX_PER_M) {
                if (!u.klic) u.klic = l.klic;
                continue;
            }
            spojene.push({ ...l });
        }
        if (spojene.length > 2) {
            const a = spojene[0], z = spojene[spojene.length - 1];
            if (Math.abs(a.dx * z.dy - a.dy * z.dx) < 0.03 && Math.abs((a.p.x - z.p.x) * z.dy - (a.p.y - z.p.y) * z.dx) < 0.03 * engine.PX_PER_M) {
                if (!a.klic) a.klic = z.klic;
                spojene.pop();
            }
        }
        const m = spojene.length;
        if (m < 3) return [];
        const vrcholy = spojene.map((l, i) => {
            const pred = spojene[(i + m - 1) % m];
            const det = pred.dx * l.dy - pred.dy * l.dx;
            if (Math.abs(det) < 1e-6) return { x: l.p.x, y: l.p.y };
            const s = ((l.p.x - pred.p.x) * l.dy - (l.p.y - pred.p.y) * l.dx) / det;
            return { x: pred.p.x + pred.dx * s, y: pred.p.y + pred.dy * s };
        });
        return spojene.map((l, i) => ({
            a: vrcholy[i], b: vrcholy[(i + 1) % m],
            klic: l.klic || ('i' + i),
        })).filter(h => Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y) > 1);
    }

    /**
     * Rozřeší nastavení střechy na typy hran. Předvolba určí výchozí typ, ruční
     * přepnutí konkrétní hrany (strecha.hrany[klíč]) má přednost.
     */
    function typyHran(strecha, hrany) {
        if (!hrany.length) return [];
        let nejdelsi = hrany[0], delka = 0;
        for (const h of hrany) {
            const L = Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
            if (L > delka) { delka = L; nejdelsi = h; }
        }
        const osa = Math.atan2(nejdelsi.b.y - nejdelsi.a.y, nejdelsi.b.x - nejdelsi.a.x);
        const cos = (h, u) => Math.abs(Math.cos(Math.atan2(h.b.y - h.a.y, h.b.x - h.a.x) - u));
        const osaHrebene = osa + (strecha.otocHreben ? Math.PI / 2 : 0);
        const delkaH = (h) => Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
        /**
         * Krátký schod na straně okapu: oba sousedé jsou okapy a jdou stejným směrem. Štít by
         * tu stál jen nad krátkou stěnou a nad nižší střechou trčel jako zub, proto je okapem
         * (malá valbička). Konec domu má sousedy opačných směrů a zůstává štítem.
         */
        const schodNaOkapu = (i) => {
            const m = hrany.length, h = hrany[i];
            if (m < 6 || delkaH(h) > SCHOD_MAX_M) return false;
            const p = hrany[(i + m - 1) % m], n = hrany[(i + 1) % m];
            if (cos(p, osaHrebene) <= 0.7 || cos(n, osaHrebene) <= 0.7) return false;
            const smer = (e) => ({ x: (e.b.x - e.a.x) / (delkaH(e) || 1), y: (e.b.y - e.a.y) / (delkaH(e) || 1) });
            const sp = smer(p), sn = smer(n);
            return sp.x * sn.x + sp.y * sn.y > 0.7;
        };
        return hrany.map((h, i) => {
            const rucne = strecha.hrany && strecha.hrany[h.klic];
            let typ;
            if (strecha.typ === 'valbova' || strecha.typ === 'stanova') typ = 'okap';
            else if (strecha.typ === 'pultova') typ = h === nejdelsi ? 'okap' : 'stit';
            else if (strecha.typ === 'plocha') typ = 'stit';
            else typ = cos(h, osaHrebene) > 0.7 || schodNaOkapu(i) ? 'okap' : 'stit';   // sedlová
            if (rucne && rucne.typ) typ = rucne.typ;
            return {
                ...h, index: i, typ,
                sklon: (rucne && rucne.sklon) || strecha.sklon || 35,
                presah: rucne && typeof rucne.presah === 'number' ? rucne.presah : undefined,
                zOkap: rucne && typeof rucne.vyskaOkapu === 'number' ? rucne.vyskaOkapu : undefined,
                barva: (rucne && rucne.barva) || undefined,
            };
        });
    }

    // ─── Nižší střecha (Libor 12. 11. 2026) ─────────────────
    // Střecha nad částí podlaží, nad kterou už patro není: garáž, krytý vstup, terasa. Obrys části
    // má hrany dvou druhů: na líci podlaží (okap nebo štít jako u hlavní střechy) a u zdi patra
    // (`zed`). U zdi patra střecha jen končí: štít bez přesahu, který se nekreslí, zeď tam stojí.

    /** Průsečík paprsku p + r·t (t > 0) s úsečkou a–b, vrací t nebo null. */
    function paprsekUsecka(p, r, a, b) {
        const ex = b.x - a.x, ey = b.y - a.y;
        const det = r.x * ey - r.y * ex;
        if (Math.abs(det) < 1e-12) return null;
        const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / det;
        const s = ((a.x - p.x) * r.y - (a.y - p.y) * r.x) / det;
        return t > 1e-6 && s >= -1e-6 && s <= 1 + 1e-6 ? t : null;
    }

    /**
     * Typy hran nižší střechy. Pultová (výchozí) stoupá ke zdi patra: okapem je hrana, od které
     * paprsek dovnitř části narazí na zeď patra, ostatní jsou štíty. Sedlová má hřeben kolmo ke zdi
     * patra (otočením souběžně), valbová okap všude kromě zdi. Část bez zdi patra (prstenec kolem
     * patra bere zeď z `patro`) a samostatná část bez patra mají běžné předvolby. Ruční nastavení
     * hrany má přednost, hrana u zdi zůstává vždy štítem bez přesahu.
     * @param {object} strecha  nastavení (typ, sklon, otocHreben, hrany)
     * @param {Array<{a,b,klic,zed?}>} hrany  obrys části (m)
     * @param {Array<{x,y}>|null} patro  obrys patra uvnitř části (prstenec), jinak null
     */
    function typyHranNizsi(strecha, hrany, patro = null) {
        if (!hrany.length) return [];
        const zdi = hrany.filter(h => h.zed);
        const delka = (h) => Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y);
        const plocha = plochaPolygonu(hrany.map(h => h.a));
        const dovnitr = (h) => { const L = delka(h) || 1, dx = (h.b.x - h.a.x) / L, dy = (h.b.y - h.a.y) / L; return plocha > 0 ? { x: -dy, y: dx } : { x: dy, y: -dx }; };
        const cil = [...hrany.map(h => ({ a: h.a, b: h.b, zed: !!h.zed }))];
        if (patro && patro.length >= 3) patro.forEach((a, i) => cil.push({ a, b: patro[(i + 1) % patro.length], zed: true }));
        const kZdi = (h) => {
            const r = dovnitr(h);
            for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
                const p = { x: h.a.x + (h.b.x - h.a.x) * t, y: h.a.y + (h.b.y - h.a.y) * t };
                let nej = null;
                for (const c of cil) {
                    if (c.a === h.a && c.b === h.b) continue;
                    const s = paprsekUsecka(p, r, c.a, c.b);
                    if (s !== null && (!nej || s < nej.s - 1e-6 || (Math.abs(s - nej.s) <= 1e-6 && c.zed))) nej = { s, zed: c.zed };
                }
                if (nej && nej.zed) return true;
            }
            return false;
        };
        const typ = strecha.typ || 'pultova';
        let zaklad = null;
        if (typ === 'plocha' || typ === 'terasa' || typ === 'zadna') {
            zaklad = hrany.map(() => 'stit');
        } else if (typ === 'pultova') {
            zaklad = hrany.map(h => (!h.zed && kZdi(h) ? 'okap' : 'stit'));
            if (!zaklad.includes('okap')) zaklad = null;
        } else if (zdi.length && (typ === 'valbova' || typ === 'stanova')) {
            zaklad = hrany.map(h => (h.zed ? 'stit' : 'okap'));
        } else if (zdi.length && typ === 'sedlova') {
            const z = zdi.reduce((a, h) => (delka(h) > delka(a) ? h : a), zdi[0]);
            const osa = Math.atan2(z.b.y - z.a.y, z.b.x - z.a.x) + (strecha.otocHreben ? 0 : Math.PI / 2);
            zaklad = hrany.map(h => (h.zed ? 'stit' : (Math.abs(Math.cos(Math.atan2(h.b.y - h.a.y, h.b.x - h.a.x) - osa)) > 0.7 ? 'okap' : 'stit')));
        }
        if (!zaklad) {
            // Bez zdi patra (samostatná část, prstenec kolem patra): běžná předvolba nad samotnou částí
            const bezZdi = hrany.filter(h => !h.zed);
            const bezne = typyHran({ ...strecha, typ, hrany: {} }, bezZdi);
            zaklad = hrany.map(h => (h.zed ? 'stit' : (bezne[bezZdi.indexOf(h)]?.typ || 'stit')));
        }
        return hrany.map((h, i) => {
            const rucne = !h.zed && strecha.hrany && strecha.hrany[h.klic];
            return {
                ...h, index: i, typ: rucne && rucne.typ ? rucne.typ : zaklad[i],
                sklon: (rucne && rucne.sklon) || strecha.sklon || 10,
                presah: h.zed ? 0 : (rucne && typeof rucne.presah === 'number' ? rucne.presah : undefined),
                zOkap: rucne && typeof rucne.vyskaOkapu === 'number' ? rucne.vyskaOkapu : undefined,
                barva: (rucne && rucne.barva) || undefined,
            };
        });
    }

    /** Část konvexního mnohoúhelníku (kladná plocha) vlevo od přímky a→b. */
    function polorovina(poly, a, b) {
        const f = (p) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
        const out = [];
        poly.forEach((p, i) => {
            const q = poly[(i + 1) % poly.length];
            const fp = f(p), fq = f(q);
            if (fp >= 0) out.push(p);
            if ((fp >= 0) !== (fq >= 0)) {
                const t = fp / (fp - fq);
                out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
            }
        });
        return out;
    }

    /** Konvexní P bez konvexního C (oba s kladnou plochou) jako konvexní díly; null = nepřekrývají se. */
    function odectiKonvexni(P, C, minPlocha = 1e-6) {
        let prunik = P;
        for (let i = 0; i < C.length && prunik.length >= 3; i++) prunik = polorovina(prunik, C[i], C[(i + 1) % C.length]);
        if (prunik.length < 3 || plochaPolygonu(prunik) < minPlocha) return null;
        const dily = [];
        let zbytek = P;
        for (let i = 0; i < C.length && zbytek.length >= 3; i++) {
            const a = C[i], b = C[(i + 1) % C.length];
            const ven = polorovina(zbytek, b, a);
            if (ven.length >= 3 && plochaPolygonu(ven) >= minPlocha) dily.push(ven);
            zbytek = polorovina(zbytek, a, b);
        }
        return dily;
    }

    /** Mnohoúhelník s kladnou plochou (vnitřek vlevo od hran). */
    const kladne = (poly) => (plochaPolygonu(poly) < 0 ? [...poly].reverse() : poly);

    /**
     * Mnohoúhelník `poly` bez mnohoúhelníků `diry` jako konvexní díly s kladnou plochou (m).
     * Slouží ploché nižší střeše a terase kolem patra.
     */
    function oblastBez(poly, diry = []) {
        let dily = konvexniDily(kladne(poly));
        for (const d of diry) {
            if (!d || d.length < 3) continue;
            for (const C of konvexniDily(kladne(d))) {
                dily = dily.flatMap(P => { const r = odectiKonvexni(P, C); return r === null ? [P] : r; });
            }
        }
        return dily.filter(d => d.length >= 3 && plochaPolygonu(d) > 1e-4);
    }

    /**
     * Části trojúhelníků {x,y,z} mimo mnohoúhelník (m). Výška se dopočítá z roviny trojúhelníku,
     * orientace zůstává. Nižší střecha kolem patra se tak ořízne obrysem patra.
     */
    function orizniMimo(troj, poly) {
        if (!poly || poly.length < 3) return troj;
        const dily = konvexniDily(kladne(poly));
        const vysledek = [];
        for (const t of troj) {
            const [a, b, c] = t;
            const det = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
            if (Math.abs(det) < 1e-12) { vysledek.push(t); continue; }
            // Rovina z = a.z + gx·(x − a.x) + gy·(y − a.y)
            const gx = ((b.z - a.z) * (c.y - a.y) - (c.z - a.z) * (b.y - a.y)) / det;
            const gy = ((c.z - a.z) * (b.x - a.x) - (b.z - a.z) * (c.x - a.x)) / det;
            const zBodu = (p) => ({ x: p.x, y: p.y, z: a.z + gx * (p.x - a.x) + gy * (p.y - a.y) });
            let kusy = [det > 0 ? [a, b, c] : [a, c, b]];
            let zasah = false;
            for (const C of dily) {
                kusy = kusy.flatMap(P => { const r = odectiKonvexni(P, C); if (r === null) return [P]; zasah = true; return r; });
            }
            if (!zasah) { vysledek.push(t); continue; }
            for (const K of kusy) {
                for (let i = 1; i < K.length - 1; i++) {
                    const u = [zBodu(K[0]), zBodu(K[i]), zBodu(K[i + 1])];
                    if (Math.abs(plochaPolygonu(u)) < 1e-7) continue;
                    vysledek.push(det > 0 ? u : [u[0], u[2], u[1]]);
                }
            }
        }
        return vysledek;
    }

    /** Bod uvnitř mnohoúhelníku (m). */
    function bodUvnitr(p, poly) {
        let v = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            if ((poly[i].y > p.y) !== (poly[j].y > p.y)
                && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) v = !v;
        }
        return v;
    }

    /** Úsečky {x,y,z} jen mimo mnohoúhelník: rozdělí se v průsečících s jeho hranami. */
    function useckyMimo(usecky, poly) {
        if (!poly || poly.length < 3) return usecky;
        const vysledek = [];
        for (const [p, q] of usecky) {
            const r = { x: q.x - p.x, y: q.y - p.y };
            const ts = [0, 1];
            poly.forEach((a, i) => {
                const b = poly[(i + 1) % poly.length];
                const ex = b.x - a.x, ey = b.y - a.y;
                const det = r.x * ey - r.y * ex;
                if (Math.abs(det) < 1e-12) return;
                const t = ((a.x - p.x) * ey - (a.y - p.y) * ex) / det;
                const s = ((a.x - p.x) * r.y - (a.y - p.y) * r.x) / det;
                if (t > 0 && t < 1 && s >= 0 && s <= 1) ts.push(t);
            });
            ts.sort((x, y) => x - y);
            const bod = (t) => ({ x: p.x + r.x * t, y: p.y + r.y * t, z: p.z + (q.z - p.z) * t });
            for (let i = 0; i < ts.length - 1; i++) {
                if (ts[i + 1] - ts[i] < 1e-6) continue;
                if (bodUvnitr(bod((ts[i] + ts[i + 1]) / 2), poly)) continue;
                vysledek.push([bod(ts[i]), bod(ts[i + 1])]);
            }
        }
        return vysledek;
    }

    /**
     * Obrys části z rastru dorovná na skutečné přímky: líce podlaží (klíč stěna:strana) a obrys
     * patra (`zed`). Rastr je po pár cm a otevřením (ubrání tenkých proužků) se konvexní rohy
     * zakulatí, proto krátká nedorovnaná hrana mezi dvěma dorovnanými zmizí a roh vznikne
     * průsečíkem sousedů. Body i přímky v metrech. Vrací [{a, b, klic, zed}].
     * @param {Array<{x,y}>} body  zjednodušený obrys z rastru
     * @param {Array<{a,b,klic,zed?}>} primky  kandidáti: hrany obrysu podlaží a patra
     */
    function dorovnejObrys(body, primky, tol = 0.09, kratka = 0.6) {
        const n = body.length;
        if (n < 3) return [];
        let linie = body.map((a, i) => {
            const b = body[(i + 1) % n];
            const L = Math.hypot(b.x - a.x, b.y - a.y) || 1e-9;
            const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
            let nej = null;
            if (L > 0.15) {
                for (const c of primky) {
                    const wx = c.b.x - c.a.x, wy = c.b.y - c.a.y, WL = Math.hypot(wx, wy);
                    if (WL < 0.05) continue;
                    if (Math.abs(ux * wy / WL - uy * wx / WL) > 0.06) continue;
                    const dist = (q) => Math.abs((q.x - c.a.x) * wy - (q.y - c.a.y) * wx) / WL;
                    const d = Math.max(dist(a), dist(b));
                    if (d > tol) continue;
                    const s0 = ((a.x - c.a.x) * wx + (a.y - c.a.y) * wy) / WL, s1 = ((b.x - c.a.x) * wx + (b.y - c.a.y) * wy) / WL;
                    const prekryv = Math.min(Math.max(s0, s1), WL) - Math.max(Math.min(s0, s1), 0);
                    if (prekryv < Math.min(WL, L) * 0.3) continue;
                    // Přednost má bližší přímka, při shodě zeď patra (střecha na ní končí)
                    if (!nej || d < nej.d - 0.005 || (Math.abs(d - nej.d) <= 0.005 && c.zed && !nej.zed)) {
                        nej = { d, p: c.a, dx: wx / WL, dy: wy / WL, klic: c.klic || null, zed: !!c.zed };
                    }
                }
            }
            return nej ? { p: nej.p, dx: nej.dx, dy: nej.dy, klic: nej.klic, zed: nej.zed, L, dorovnana: true }
                : { p: a, dx: ux, dy: uy, klic: null, zed: false, L, dorovnana: false };
        });
        const rovnobezne = (u, v) => Math.abs(u.dx * v.dy - u.dy * v.dx) < 0.03;
        const naPrimce = (u, v) => rovnobezne(u, v) && Math.abs((v.p.x - u.p.x) * u.dy - (v.p.y - u.p.y) * u.dx) < 0.02;
        // Zakulacené rohy: úsek nedorovnaných hran (dohromady krátký) mezi dorovnanými sousedy, kteří se protnou
        const m0 = linie.length;
        const pryc = new Set();
        for (let i = 0; i < m0; i++) {
            if (linie[i].dorovnana || !linie[(i + m0 - 1) % m0].dorovnana) continue;
            let j = i, delkaUseku = 0;
            while (!linie[j % m0].dorovnana && j - i < m0) { delkaUseku += linie[j % m0].L; j++; }
            const po = linie[j % m0], pred = linie[(i + m0 - 1) % m0];
            if (po.dorovnana && delkaUseku <= kratka && !rovnobezne(pred, po) && m0 - (j - i) >= 3) {
                for (let k = i; k < j; k++) pryc.add(k % m0);
            }
        }
        if (pryc.size) linie = linie.filter((_, i) => !pryc.has(i));
        // Souosé sousedy spojit
        const spojene = [];
        for (const l of linie) {
            const u = spojene[spojene.length - 1];
            if (u && naPrimce(u, l) && u.zed === l.zed) { u.L += l.L; if (!u.klic) u.klic = l.klic; continue; }
            spojene.push({ ...l });
        }
        if (spojene.length > 2 && naPrimce(spojene[0], spojene[spojene.length - 1]) && spojene[0].zed === spojene[spojene.length - 1].zed) {
            const z = spojene.pop();
            if (!spojene[0].klic) spojene[0].klic = z.klic;
        }
        const m = spojene.length;
        if (m < 3) return [];
        const vrcholy = spojene.map((l, i) => {
            const pred = spojene[(i + m - 1) % m];
            const det = pred.dx * l.dy - pred.dy * l.dx;
            if (Math.abs(det) < 1e-6) return { x: l.p.x, y: l.p.y };
            const s = ((l.p.x - pred.p.x) * l.dy - (l.p.y - pred.p.y) * l.dx) / det;
            return { x: pred.p.x + pred.dx * s, y: pred.p.y + pred.dy * s };
        });
        return spojene.map((l, i) => ({
            a: vrcholy[i], b: vrcholy[(i + 1) % m],
            klic: l.zed ? 'zed' + i : (l.klic || ('i' + i)), zed: l.zed,
        })).filter(h => Math.hypot(h.b.x - h.a.x, h.b.y - h.a.y) > 0.01);
    }

    const Strecha = {
        vypocet, parametryHran, vyskaVBode, izocara, podUrovni, obrysZRastru, hranyObrysu, typyHran, plochaPolygonu, konvexniDily,
        typyHranNizsi, orizniMimo, useckyMimo, oblastBez, dorovnejObrys, bodUvnitr, zjednodus,
    };
    if (typeof window !== 'undefined') window.Strecha = Strecha;
    if (typeof module !== 'undefined' && module.exports) module.exports = Strecha;
})();
