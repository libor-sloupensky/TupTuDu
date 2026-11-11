/**
 * Nábytková sestava (Koncept V3): kuchyňská linka a vestavěná skříň podél stěny, modules/sestavy.md.
 *
 * Sestava patří domu (engine.dum.sestavy) jako schody a sloupy, Zpět, historie i ukládání ji nesou samy.
 * Stojí na podlaží, `body` jsou lomená čára po líci stěny v metrech s y nahoru (jako schody). Skříňky leží
 * vpravo od směru čáry (strana +1): čára vede zleva doprava, jak se na linku člověk dívá z místnosti.
 * Tvar L má tři body, roh je vždy vnitřní (druhé rameno se stáčí k místnosti).
 *
 * Kuchyň se dělí na sloupce se šířkou a skladbou: jen spodní, spodní a horní, vysoká, volné místo, krycí
 * lišta. Horní skříňka má šířku sloupce (Libor 11. 11. 2026). Co jde spočítat, se neukládá: okna nad linkou,
 * výška stropu, krycí lišty u rohu. Rozvržení počítá `rozvrh` při každém vykreslení.
 *
 * 3D se staví z kvádrů a desek přímo v editoru (žádné modely), geometrie je sloučená podle materiálu.
 * Do sdíleného odkazu jde jako ostatní konstrukce (export-sdileni.js, _zapecModel).
 */
(function () {
    // ─── Konstanty ─────────────────────────────────────────
    const omez = (x, a, b) => Math.max(a, Math.min(b, x));
    const zaokr = (x, k = 1000) => Math.round(x * k) / k;
    const klon = (o) => JSON.parse(JSON.stringify(o));
    const cislo = (v) => { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : NaN; };

    const TL_DESKY = 0.038;      // pracovní deska
    const PRESAH = 0.02;         // přesah desky před čely
    const TL_CELA = 0.019;
    const SPARA = 0.003;         // spára mezi čely
    const ODSKOK_SOKLU = 0.06;   // sokl ustupuje za čela
    const MIN_SL = 0.15, MAX_SL = 1.2, KROK_SL = 0.6;
    const LISTA_DO = 0.15;       // zbytek užší než tohle vyplní krycí lišta
    const NAKRES_SIRKA = 360;

    const BILA = '#f2f1ed';
    const VYSKY = { deska: 0.9, sokl: 0.1, horni: 0.72, mezera: 0.55, keStropu: false };
    const HLOUBKY = { spodni: 0.6, horni: 0.35 };
    const ROH = { spodni: 'L', horni: 'skrinka' };
    const POVRCHY_KUCHYN = {
        cela: { dekor: 'hladky', barva: BILA, lesk: false },
        celaHorni: null,
        korpus: { dekor: 'hladky', barva: BILA },
        deska: { dekor: 'drevo', barva: '#b98d5f' },
        sokl: 'cela',
        uchytky: { typ: 'madlo', barva: 'nerez' },
        zastena: null,
        drez: 'nerez',
        spotrebice: 'nerez',
    };
    const POVRCHY_SKRIN = {
        dvere: { dekor: 'hladky', barva: BILA, lesk: false },
        korpus: { dekor: 'hladky', barva: BILA },
        uchytky: { typ: 'madlo', barva: 'nerez' },
    };

    // Dekory povrchů: drsnost, kov, kolik metrů pokryje dlaždice textury a výchozí barva po přepnutí
    const DEKORY = {
        hladky: { drsnost: 0.55, barva: BILA },
        drevo: { drsnost: 0.6, metru: 1.2, barva: '#b98d5f' },
        mramor: { drsnost: 0.22, metru: 1.6, barva: '#ebe8e3' },
        kamen: { drsnost: 0.3, metru: 0.9, barva: '#3d3d3d' },
        beton: { drsnost: 0.75, metru: 2, barva: '#a19e99' },
        terrazzo: { drsnost: 0.35, metru: 1, barva: '#ddd7cd' },
        nerez: { drsnost: 0.32, kov: 1, metru: 0.6, barva: '#c9cdd0' },
        sklo: { drsnost: 0.08, barva: '#e3e8e8' },
        obklad: { drsnost: 0.3, metru: 0.6, barva: '#f4f3ef' },
        zrcadlo: { drsnost: 0.03, kov: 1, barva: '#dfe5e8' },
    };
    const DEKORY_POVRCHU = {
        cela: ['hladky', 'drevo'],
        celaHorni: ['hladky', 'drevo'],
        korpus: ['hladky', 'drevo'],
        deska: ['drevo', 'hladky', 'mramor', 'kamen', 'beton', 'terrazzo', 'nerez'],
        zastena: ['obklad', 'sklo', 'hladky', 'mramor', 'kamen', 'beton', 'drevo'],
        dvere: ['hladky', 'drevo'],
    };
    const KOVY = { nerez: '#c9cdd0', cerna: '#2a2a2a', zlata: '#c9a45c', bila: '#f2f2f0', stribrna: '#c4c8cb' };
    const DREZY = {
        nerez: { barva: '#c9cdd0', kov: 1, drsnost: 0.3 }, granit_cerny: { barva: '#2b2b2b', drsnost: 0.45 },
        granit_sedy: { barva: '#8c8c88', drsnost: 0.45 }, granit_bily: { barva: '#e6e3dc', drsnost: 0.45 },
    };
    const SPOTREBICE = { nerez: { barva: '#c9cdd0', kov: 1, drsnost: 0.3 }, bila: { barva: '#f4f4f2', drsnost: 0.3 }, cerna: { barva: '#26282a', drsnost: 0.3 } };
    const ZRCADLA = { stribrne: '#dfe5e8', bronzove: '#b89b7a', grafitove: '#6d7378' };
    const CERNE_SKLO = '#1d1f21';

    // Volby panelu (klíče slovníku ed_sablona.sestava.*)
    const VOLBY = {
        skladba: ['spodni', 'spodni_horni', 'vysoka', 'volne'],
        celoSpodni: ['dvirka', 'zasuvky', 'zasuvka_dvirka', 'otevrena', 'trouba', 'mycka'],
        celoHorni: ['dvirka', 'vyklop', 'sklo', 'otevrena', 'digestor', 'komin'],
        celoVysoke: ['dvirka', 'lednice', 'trouba', 'trouba_mikro', 'otevrena'],
        vDesce: ['nic', 'drez', 'varna'],
        drez: ['jednodrez', 'odkap', 'dvojdrez'],
        varna: ['indukce', 'plyn'],
        mycka: ['vestavna', 'panel'],
        volne: ['lednice', 'americka', 'mezera'],
        sokl: ['cela', 'korpus', 'nerez', 'cerna'],
        uchytkyTyp: ['madlo', 'knopka', 'profil', 'zadne'],
        uchytkyBarva: ['nerez', 'cerna', 'zlata', 'bila'],
        drezMaterial: ['nerez', 'granit_cerny', 'granit_sedy', 'granit_bily'],
        spotrebice: ['nerez', 'cerna', 'bila'],
        rohSpodni: ['L', 'slepy'],
        rohHorni: ['skrinka', 'police', 'nic'],
        dvere: ['posuvne', 'otocne', 'zadne'],
        ram: ['stribrna', 'cerna', 'bila', 'zlata'],
        zrcadlo: ['stribrne', 'bronzove', 'grafitove'],
    };
    const POCTY = { dvirka: [1, 2], zasuvky: [2, 3, 4], zasuvka_dvirka: [1, 2], vyklop: [1, 2], sklo: [1, 2], vysoka: [2, 3] };

    // ─── Vektory v rovině plátna (metry, y dolů) ──────────
    const V = {
        sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
        add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
        mul: (a, k) => ({ x: a.x * k, y: a.y * k }),
        dot: (a, b) => a.x * b.x + a.y * b.y,
        cross: (a, b) => a.x * b.y - a.y * b.x,
        len: (a) => Math.hypot(a.x, a.y),
        norm: (a) => { const l = Math.hypot(a.x, a.y) || 1; return { x: a.x / l, y: a.y / l }; },
        perp: (a) => ({ x: -a.y, y: a.x }),
    };

    /** Ramena sestavy v metrech plátna (y dolů): začátek, konec, délka, směr a normála k místnosti. */
    function ramenaSestavy(s) {
        const P = (s.body || []).map(b => ({ x: b[0], y: -b[1] }));
        const st = (s.strana ?? 1) >= 0 ? 1 : -1;
        const out = [];
        for (let i = 0; i + 1 < P.length; i++) {
            const a = P[i], b = P[i + 1], L = V.len(V.sub(b, a));
            const d = V.norm(V.sub(b, a));
            out.push({ i, a, b, L, d, n: V.mul(V.perp(d), st) });
        }
        return out;
    }
    const bodRamene = (r, t, h) => ({ x: r.a.x + r.d.x * t + r.n.x * h, y: r.a.y + r.d.y * t + r.n.y * h });

    function hodnotyKuchyne(s) {
        return { v: { ...VYSKY, ...(s.vysky || {}) }, h: { ...HLOUBKY, ...(s.hloubky || {}) } };
    }

    /** Délka rohu po každém z obou ramen (od líce stěny): rohová skříňka 90 cm, slepý roh hloubka + lišta. */
    function delkaRohu(s, i) {
        const D = omez(hodnotyKuchyne(s).h.spodni, 0.3, 0.9);
        const roh = (s.rohy || [])[i] || ROH;
        return roh.spodni === 'slepy' ? D + 0.05 : Math.max(0.9, D + 0.3);
    }

    /** Úsek ramene pro sloupce: bez rohů na začátku a na konci. */
    function useky(s, ramena) {
        if (s.druh !== 'kuchyn') return ramena.map(r => ({ od: 0, do: r.L, U: r.L }));
        return ramena.map((r, i) => {
            const od = i > 0 ? delkaRohu(s, i - 1) : 0;
            const konec = r.L - (i < ramena.length - 1 ? delkaRohu(s, i) : 0);
            return { od, do: konec, U: Math.max(0, konec - od) };
        });
    }

    // ─── Sloupce: výchozí podoba, automatické vybavení, dorovnání ──
    function novySloupec(sirka, skladba = 'spodni_horni') {
        const dvoje = sirka >= 0.7 ? 2 : 1;
        return { sirka: zaokr(sirka), skladba, spodni: { celo: 'dvirka', pocet: dvoje }, horni: { celo: 'dvirka', pocet: dvoje } };
    }

    function sloupecPodleTypu(typ, sirka) {
        const c = novySloupec(sirka);
        const dvoje = sirka >= 0.7 ? 2 : 1;
        switch (typ) {
            case 'lednice': c.skladba = 'vysoka'; c.vysoka = { celo: 'lednice', pocet: 2 }; break;
            case 'drez': c.spodni = { celo: 'dvirka', pocet: dvoje, vDesce: 'drez', drez: sirka >= 0.8 ? 'odkap' : 'jednodrez' }; break;
            case 'varna': c.spodni = { celo: 'trouba', pocet: 1, vDesce: 'varna', varna: 'indukce' }; c.horni = { celo: 'digestor', pocet: 1 }; break;
            case 'mycka': c.spodni = { celo: 'mycka', pocet: 1, mycka: 'vestavna' }; break;
            case 'zasuvky': c.spodni = { celo: 'zasuvky', pocet: 3 }; break;
            case 'otevrena': c.spodni = { celo: 'otevrena', pocet: 1 }; c.horni = { celo: 'otevrena', pocet: 1 }; break;
            default: c.spodni = { celo: 'zasuvka_dvirka', pocet: dvoje };
        }
        return c;
    }

    /**
     * Nová linka se vybaví podle zvyklostí (Libor 11. 11. 2026: „zkus to vybavit, uživatel si to přeskupí“):
     * lednice na kraji dál od okna (od 2,4 m), dřez pod oknem, jinak o skříňku od lednice, varná deska
     * s troubou a digestoří aspoň o skříňku od dřezu, myčka vedle dřezu, u varné desky šuplíky na hrnce.
     * Délka se dělí po 60 cm, zbytek ramene je úzká skříňka nebo krycí lišta.
     */
    function vybavKuchyn(s, ctx) {
        const ramena = ramenaSestavy(s), us = useky(s, ramena);
        let posun = 0;
        const rozvinuti = us.map(u => { const o = posun; posun += u.U; return o; });
        const celkem = posun;
        const okna = [];
        ramena.forEach((r, ri) => (ctx?.otvory?.[ri] || []).filter(o => o.typ === 'okno').forEach(o => {
            const stred = (o.t0 + o.t1) / 2;
            if (stred > us[ri].od && stred < us[ri].do) okna.push(rozvinuti[ri] + stred - us[ri].od);
        }));
        const lednice = celkem >= 2.4 ? (okna.length && okna[0] < celkem / 2 ? 'konec' : 'zacatek') : null;
        const sloty = [];
        const zbytky = us.map((u, ri) => {
            const n = Math.floor(u.U / KROK_SL + 1e-6);
            const zb = zaokr(u.U - n * KROK_SL);
            const naZacatku = lednice === 'konec' && ri === us.length - 1 && zb > 0.0005;
            const t0 = u.od + (naZacatku ? zb : 0);
            for (let i = 0; i < n; i++) sloty.push({ ri, t0: t0 + i * KROK_SL, t1: t0 + (i + 1) * KROK_SL });
            return { zb, naZacatku };
        });
        const N = sloty.length;
        const typ = new Array(N).fill(null);
        const rozv = (k) => rozvinuti[sloty[k].ri] + (sloty[k].t0 + sloty[k].t1) / 2 - us[sloty[k].ri].od;
        let led = null;
        if (lednice && N >= 4) { led = lednice === 'zacatek' ? 0 : N - 1; typ[led] = 'lednice'; }
        let drez = null;
        if (okna.length) {
            let nej = Infinity;
            for (let k = 0; k < N; k++) {
                if (typ[k]) continue;
                const d = Math.abs(rozv(k) - okna[0]);
                if (d < nej && d < KROK_SL) { nej = d; drez = k; }
            }
        }
        if (drez === null && N) {
            if (led === 0) drez = Math.min(N - 1, 2);
            else if (led === N - 1) drez = Math.max(0, N - 3);
            else drez = omez(Math.round((N - 1) * 0.35), 0, N - 1);
            if (typ[drez]) drez = typ.findIndex(x => !x);
            if (drez < 0) drez = null;
        }
        if (drez !== null) typ[drez] = 'drez';
        let varna = null;
        if (N >= 2 && drez !== null) {
            const smer = led === N - 1 ? -1 : 1;
            let nej = null;
            for (let k = 0; k < N; k++) {
                if (typ[k]) continue;
                const vzd = Math.abs(k - drez);
                let skore = vzd >= 2 ? vzd : 10 + (2 - vzd);
                if (led !== null && Math.abs(k - led) < 2) skore += 20;
                if (k === 0 || k === N - 1) skore += 4;
                if (Math.sign(k - drez) !== smer) skore += 1;
                if (!nej || skore < nej.skore) nej = { k, skore };
            }
            if (nej) { varna = nej.k; typ[varna] = 'varna'; }
        }
        if (drez !== null && N >= 3) {
            const strany = varna !== null && varna > drez ? [-1, 1] : [1, -1];
            for (const st of strany) {
                const k = drez + st;
                if (k >= 0 && k < N && !typ[k] && sloty[k].ri === sloty[drez].ri) { typ[k] = 'mycka'; break; }
            }
        }
        if (varna !== null) for (const k of [varna - 1, varna + 1]) if (k >= 0 && k < N && !typ[k]) typ[k] = 'zasuvky';
        const out = us.map(() => ({ sloupce: [] }));
        sloty.forEach((sl, k) => out[sl.ri].sloupce.push(sloupecPodleTypu(typ[k], KROK_SL)));
        zbytky.forEach((z, ri) => {
            if (z.zb <= 0.0005) return;
            const c = z.zb < LISTA_DO ? { sirka: z.zb, skladba: 'lista' } : sloupecPodleTypu(z.zb < 0.3 ? 'otevrena' : null, z.zb);
            if (z.naZacatku) out[ri].sloupce.unshift(c); else out[ri].sloupce.push(c);
        });
        return out;
    }

    /**
     * Sloupce ramene vyplní přesně délku U. Upravený sloupec (ručně zadaná šířka) zůstává, přizpůsobí se
     * poslední neupravený, při tahu za začátek první. Zbytek do 15 cm je krycí lišta, větší nová skříňka.
     */
    function dorovnejRameno(sloupce, U, odZacatku = false) {
        const list = (sloupce || []).filter(c => !(c.skladba === 'lista' && !c.upraveno));
        const kraj = () => {
            let idx = -1;
            if (odZacatku) idx = list.findIndex(c => !c.upraveno);
            else for (let i = list.length - 1; i >= 0; i--) if (!list[i].upraveno) { idx = i; break; }
            return idx >= 0 ? idx : (odZacatku ? 0 : list.length - 1);
        };
        let r = zaokr(U - list.reduce((a, c) => a + c.sirka, 0));
        let pojistka = 200;
        while (r < -0.0005 && list.length && pojistka--) {
            const idx = kraj(), c = list[idx], nova = zaokr(c.sirka + r);
            if (nova >= MIN_SL) { c.sirka = nova; r = 0; } else { r = zaokr(r + c.sirka); list.splice(idx, 1); }
        }
        while (r > 0.0005 && pojistka--) {
            let c;
            if (r < LISTA_DO) c = { sirka: zaokr(r), skladba: 'lista' };
            else if (r <= MAX_SL) c = sloupecPodleTypu(r < 0.3 ? 'otevrena' : null, zaokr(r));
            else c = sloupecPodleTypu(null, KROK_SL);
            if (odZacatku) list.unshift(c); else list.push(c);
            r = zaokr(r - c.sirka);
        }
        return list;
    }

    /** Dorovná všechna ramena kuchyně na jejich délku; `odZacatku` platí pro první rameno (tah za začátek). */
    function dorovnej(s, odZacatku = false) {
        if (s.druh !== 'kuchyn') return;
        const us = useky(s, ramenaSestavy(s));
        s.ramena = us.map((u, ri) => ({ sloupce: dorovnejRameno(s.ramena?.[ri]?.sloupce, u.U, odZacatku && ri === 0) }));
    }

    // ─── Rozvržení (počítá se při každém vykreslení) ─────────
    const maSpodni = (typ) => typ === 'spodni' || typ === 'spodni_horni' || typ === 'lista';
    const maHorniSkladba = (sl) => sl.skladba === 'spodni_horni' || (sl.skladba === 'volne' && !!sl.volne?.horni);

    function rozvrh(s, ctx) {
        return s.druh === 'skrin' ? rozvrhSkrine(s, ctx) : rozvrhKuchyne(s, ctx);
    }

    function rozvrhKuchyne(s, ctx) {
        const ramena = ramenaSestavy(s), us = useky(s, ramena);
        const { v, h } = hodnotyKuchyne(s);
        const strop = Math.max(1.6, ctx?.strop || 2.6);
        const sokl = omez(v.sokl, 0.04, 0.25), deska = omez(v.deska, 0.7, 1.1);
        const korpusDo = deska - TL_DESKY;
        const horniOd = Math.min(deska + omez(v.mezera, 0.3, 1), strop - 0.2);
        const horniDo = v.keStropu ? strop : Math.min(horniOd + omez(v.horni, 0.2, 1.4), strop);
        const vysokaDo = v.keStropu ? strop : Math.min(Math.max(horniDo, deska + 0.9), strop);
        const D = omez(h.spodni, 0.3, 0.9), Dh = omez(h.horni, 0.15, 0.7);
        const sloupce = [];
        ramena.forEach((r, ri) => {
            let t = us[ri].od;
            const otvory = ctx?.otvory?.[ri] || [];
            (s.ramena?.[ri]?.sloupce || []).forEach((sl, i) => {
                const t0 = t, t1 = t + sl.sirka;
                t = t1;
                const prekryv = (o) => Math.min(t1, o.t1) - Math.max(t0, o.t0);
                const okno = otvory.find(o => o.typ === 'okno' && prekryv(o) > 0.05);
                const dvere = otvory.find(o => o.typ === 'dvere' && prekryv(o) > 0.02);
                const horni = maHorniSkladba(sl);
                const c = {
                    ri, i, klic: ri + ':' + i, t0, t1, sl, typ: sl.skladba, varovani: [],
                    podOknem: !!okno && horni, horniEf: horni && (!okno || !!sl.horni?.presOkno),
                    horniDo: sl.horni?.vyska ? Math.min(horniOd + omez(sl.horni.vyska, 0.2, 1.4), strop) : horniDo,
                };
                if (okno && sl.skladba === 'vysoka') c.varovani.push('okno_vysoka');
                if (okno && c.horniEf && sl.horni?.celo !== 'komin') c.varovani.push('okno_horni');
                if (okno && maSpodni(sl.skladba) && okno.parapet < deska + 0.02) c.varovani.push('parapet');
                if (dvere) c.varovani.push('dvere');
                if (sl.spodni?.celo === 'mycka' && maSpodni(sl.skladba) && sl.sirka < 0.445) c.varovani.push('mycka');
                const lednice = (sl.skladba === 'vysoka' && sl.vysoka?.celo === 'lednice') || (sl.skladba === 'volne' && ['lednice', 'americka'].includes(sl.volne?.spotrebic));
                if (lednice && sl.sirka < 0.545) c.varovani.push('lednice');
                sloupce.push(c);
            });
        });
        // Lišta nahoře, když mají sousedé horní skříňky
        for (const c of sloupce) {
            if (c.typ !== 'lista') continue;
            const vedle = sloupce.filter(x => x.ri === c.ri && Math.abs(x.i - c.i) === 1);
            c.horniEf = vedle.some(x => x.horniEf);
        }
        // Varná deska: odkládací plocha, dřez hned vedle, digestoř
        const deskaVedle = (c, smer) => {
            let delka = 0;
            for (let k = c.i + smer; ; k += smer) {
                const x = sloupce.find(q => q.ri === c.ri && q.i === k);
                if (!x) {
                    // Konec ramene: přes roh deska pokračuje, u stěny nebo volného konce končí
                    const roh = smer < 0 ? c.ri > 0 : c.ri < ramena.length - 1;
                    if (roh) delka += 0.6;
                    break;
                }
                if (!maSpodni(x.typ)) break;
                delka += x.t1 - x.t0;
                if (delka >= 0.3) break;
            }
            return delka;
        };
        for (const c of sloupce) {
            if (!maSpodni(c.typ) || c.sl.spodni?.vDesce !== 'varna') continue;
            if (deskaVedle(c, -1) < 0.3 - 1e-6 || deskaVedle(c, 1) < 0.3 - 1e-6) c.varovani.push('varna_kraj');
            const sousede = sloupce.filter(x => x.ri === c.ri && Math.abs(x.i - c.i) === 1);
            if (sousede.some(x => maSpodni(x.typ) && x.sl.spodni?.vDesce === 'drez')) c.varovani.push('varna_drez');
            const digestor = c.horniEf && ['digestor', 'komin'].includes(c.sl.horni?.celo);
            const kominPodOknem = c.podOknem && c.sl.horni?.celo === 'komin';
            if (!digestor && !kominPodOknem) c.varovani.push('digestor');
        }
        // Úseky pracovní desky: souvislé spodní skříňky, rohy k nim patří
        const desky = [];
        ramena.forEach((r, ri) => {
            const kusy = [];
            if (ri > 0) kusy.push({ t0: D + PRESAH, t1: us[ri].od, spodni: true });
            for (const c of sloupce.filter(x => x.ri === ri)) kusy.push({ t0: c.t0, t1: c.t1, spodni: maSpodni(c.typ), sloupec: c });
            if (ri < ramena.length - 1) kusy.push({ t0: us[ri].do, t1: r.L, spodni: true });
            let akt = null;
            for (const k of kusy) {
                if (k.spodni && k.t1 - k.t0 > 0.001) {
                    if (akt && Math.abs(akt.t1 - k.t0) < 0.002) { akt.t1 = k.t1; akt.sloupce.push(k.sloupec); } else { akt = { ri, t0: k.t0, t1: k.t1, sloupce: [k.sloupec] }; desky.push(akt); }
                } else akt = null;
            }
        });
        const rohy = ramena.slice(0, -1).map((r, i) => ({ i, A: delkaRohu(s, i), ...ROH, ...((s.rohy || [])[i] || {}) }));
        const varovani = [...new Set(sloupce.flatMap(c => c.varovani))];
        return {
            druh: 'kuchyn', ramena, useky: us, sloupce, desky, rohy, D, Dh, varovani,
            vys: { sokl, deska, korpusDo, horniOd, horniDo, vysokaDo, strop },
        };
    }

    /**
     * Šířky dílů (dveří) skříně. Vlastní šířky (`s.dily`, Libor 11. 11. 2026: „člověk se musí přizpůsobit tomu, co
     * je v nabídce“) platí přesně a délka skříně je jejich součet; bez nich rovným dílem podle počtu.
     */
    function dilySkrine(s, L) {
        const druh = s.dvere || 'posuvne';
        const auto = druh === 'posuvne' ? omez(Math.ceil(L / 1.2 - 1e-6), 2, 6) : omez(Math.round(L / 0.5), 1, 12);
        if (druh === 'zadne') return { druh, auto, sirky: [] };
        if (Array.isArray(s.dily) && s.dily.length) {
            const sirky = s.dily.map(x => Math.max(0.1, Number(x) || 0.5));
            // Součet má sedět na délku; rozjetý záznam dorovná poslední díl
            const rozdil = L - sirky.reduce((a, x) => a + x, 0);
            if (Math.abs(rozdil) > 0.0005) sirky[sirky.length - 1] = Math.max(0.1, sirky[sirky.length - 1] + rozdil);
            return { druh, auto, sirky };
        }
        const n = omez(Math.round(s.pocet || auto), druh === 'posuvne' ? 2 : 1, druh === 'posuvne' ? 6 : 12);
        return { druh, auto, sirky: Array(n).fill(L / n) };
    }

    /** Který konec ramene je volný (jde ho posunout): u rovné konec, u L a U krajní konce, prostřední rameno U žádný. */
    function volnyKonecRamene(s, ri) {
        const n = Math.max(1, (s.body || []).length - 1);
        if (n === 1) return 'konec';
        if (ri === 0) return 'zacatek';
        if (ri === n - 1) return 'konec';
        return null;
    }

    function rozvrhSkrine(s, ctx) {
        const ramena = ramenaSestavy(s);
        const strop = Math.max(1.6, ctx?.strop || 2.6);
        const H = s.vyska ? Math.min(omez(s.vyska, 0.6, 3.5), strop) : strop;
        const hl = omez(s.hloubka || 0.62, 0.3, 0.9);
        const r = ramena[0];
        const L = r ? r.L : 0;
        const { druh, auto, sirky } = dilySkrine(s, L);
        const dvere = [];
        // Posuvné díly se v kolejnicích překrývají o 3 cm, otočné dveře stojí vedle sebe
        const pr = druh === 'posuvne' ? 0.03 : 0;
        let t = 0;
        sirky.forEach((w, i) => {
            const t0 = Math.max(0, t - pr / 2), t1 = Math.min(L, t + w + pr / 2);
            dvere.push({ i, t0, t1, dil: [t, t + w], vrstva: druh === 'posuvne' ? i % 2 : 0, zrcadlo: (s.zrcadla || [])[i] || null });
            t += w;
        });
        const varovani = [];
        for (const o of ctx?.otvory?.[0] || []) {
            if (Math.min(L, o.t1) - Math.max(0, o.t0) > 0.02) varovani.push(o.typ === 'okno' ? 'okno_vysoka' : 'dvere');
        }
        return { druh: 'skrin', ramena, H, hl, dvere, pocetAuto: auto, druhDveri: druh, varovani: [...new Set(varovani)], vys: { strop } };
    }

    /** Hloubka sestavy v půdorysu (m): skříň, nebo spodní skříňky s přesahem desky. */
    const hloubkaSestavy = (s) => (s.druh === 'skrin' ? omez(s.hloubka || 0.62, 0.3, 0.9) : omez(hodnotyKuchyne(s).h.spodni, 0.3, 0.9) + PRESAH);

    /** Půdorys sestavy (m plátna) pro hlídání překryvu: spodní skříňky po ramenech. */
    function obrysySestavy(s) {
        const D = hloubkaSestavy(s);
        return ramenaSestavy(s).map(r => [bodRamene(r, 0, 0), bodRamene(r, r.L, 0), bodRamene(r, r.L, D), bodRamene(r, 0, D)]);
    }

    // ─── Barvy ────────────────────────────────────────────
    const hexNaRgb = (h) => [1, 3, 5].map(i => parseInt(String(h || '#888888').slice(i, i + 2), 16) || 0);
    const rgbNaHex = (r) => '#' + r.map(x => Math.round(omez(x, 0, 255)).toString(16).padStart(2, '0')).join('');
    const smichej = (a, b, k) => { const A = hexNaRgb(a), B = hexNaRgb(b); return rgbNaHex(A.map((x, i) => x + (B[i] - x) * k)); };
    const jeHex = (h) => /^#[0-9a-fA-F]{6}$/.test(h || '');

    function povrchSestavy(s, klic) {
        const p = s.povrchy || {};
        if (s.druh === 'skrin') return p[klic] || POVRCHY_SKRIN[klic];
        if (klic === 'celaHorni') return p.celaHorni || p.cela || POVRCHY_KUCHYN.cela;
        return p[klic] ?? POVRCHY_KUCHYN[klic];
    }

    // ─── Textury povrchů (plátno, odstíny šedi, barvu dává materiál) ──
    function kresliPovrch(typ) {
        const N = 512;
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        let seme = 7;
        const nah = () => { seme = (seme * 16807) % 2147483647; return (seme % 10000) / 10000; };
        const opak = (fn) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) fn(dx, dy); };
        g.fillStyle = '#f0f0f0';
        g.fillRect(0, 0, N, N);
        if (typ === 'drevo') {
            // Léta svisle: jemné tmavé čáry s mírným vlněním, dlaždice navazuje nahoře i dole
            for (let i = 0; i < 16; i++) {
                const x = nah() * N, w = 12 + nah() * 50;
                g.fillStyle = `rgba(${nah() < 0.5 ? '0,0,0' : '255,255,255'},${0.03 + nah() * 0.06})`;
                for (const dx of [-N, 0, N]) g.fillRect(x + dx, 0, w, N);
            }
            for (let i = 0; i < 240; i++) {
                const x0 = nah() * N, sila = 0.025 + nah() * 0.11, k = 1 + Math.floor(nah() * 3), faze = nah() * Math.PI * 2, vlna = 2 + nah() * 8;
                g.strokeStyle = `rgba(0,0,0,${sila})`;
                g.lineWidth = 0.6 + nah() * 2.2;
                for (const dx of [-N, 0, N]) {
                    g.beginPath();
                    for (let y = 0; y <= N; y += 8) {
                        const x = x0 + dx + Math.sin(y / N * Math.PI * 2 * k + faze) * vlna;
                        if (y) g.lineTo(x, y); else g.moveTo(x, y);
                    }
                    g.stroke();
                }
            }
        } else if (typ === 'mramor') {
            for (let v = 0; v < 8; v++) {
                let x = nah() * N, y = nah() * N, uh = nah() * Math.PI * 2;
                const sila = 0.08 + nah() * 0.2, body = [];
                for (let k = 0; k < 110; k++) { uh += (nah() - 0.5) * 0.55; x += Math.cos(uh) * 6; y += Math.sin(uh) * 6; body.push([x, y]); }
                for (const [w, a] of [[6, sila * 0.2], [2.4, sila * 0.55], [0.8, sila]]) {
                    g.strokeStyle = `rgba(0,0,0,${a})`;
                    g.lineWidth = w;
                    opak((dx, dy) => { g.beginPath(); body.forEach(([px, py], i) => (i ? g.lineTo(px + dx, py + dy) : g.moveTo(px + dx, py + dy))); g.stroke(); });
                }
            }
        } else if (typ === 'kamen') {
            for (let i = 0; i < 11000; i++) {
                const x = nah() * N, y = nah() * N, r = 0.6 + nah() * 2.2;
                g.fillStyle = nah() < 0.55 ? `rgba(0,0,0,${0.12 + nah() * 0.35})` : `rgba(255,255,255,${0.15 + nah() * 0.45})`;
                g.fillRect(x, y, r, r);
            }
        } else if (typ === 'beton') {
            for (let i = 0; i < 180; i++) {
                g.fillStyle = `rgba(${nah() < 0.5 ? '0,0,0' : '255,255,255'},${nah() * 0.05})`;
                const x = nah() * N, y = nah() * N, q = 60 * (0.3 + nah());
                opak((dx, dy) => { g.beginPath(); g.arc(x + dx, y + dy, q, 0, Math.PI * 2); g.fill(); });
            }
            for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(0,0,0,${nah() * 0.12})`; g.fillRect(nah() * N, nah() * N, 1.5, 1.5); }
        } else if (typ === 'terrazzo') {
            for (let i = 0; i < 900; i++) {
                const x = nah() * N, y = nah() * N, r = 2 + nah() * 7, ton = Math.round(90 + nah() * 150);
                g.fillStyle = `rgb(${ton},${ton},${ton})`;
                g.beginPath();
                for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI * 2 + nah(), q = r * (0.6 + nah() * 0.6); if (k) g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); else g.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
                g.closePath();
                g.fill();
            }
        } else if (typ === 'obklad') {
            // Obklad 15 × 7,5 cm na vazbu, dlaždice textury 60 cm = 4 × 8 kusů
            const sx = N / 4, sy = N / 8;
            for (let r = 0; r < 8; r++) {
                const pos = r % 2 ? sx / 2 : 0;
                for (let k = -1; k < 5; k++) {
                    g.fillStyle = `rgb(${236 + Math.round(nah() * 14)},${236 + Math.round(nah() * 14)},${236 + Math.round(nah() * 14)})`;
                    g.fillRect(k * sx + pos + 2, r * sy + 2, sx - 4, sy - 4);
                }
            }
            g.fillStyle = 'rgba(0,0,0,.32)';
            for (let r = 0; r < 8; r++) {
                g.fillRect(0, r * sy, N, 3);
                const pos = r % 2 ? sx / 2 : 0;
                for (let k = 0; k <= 4; k++) g.fillRect((k * sx + pos) % N, r * sy, 3, sy);
            }
        } else if (typ === 'nerez') {
            for (let i = 0; i < 1400; i++) {
                g.fillStyle = `rgba(${nah() < 0.5 ? '0,0,0' : '255,255,255'},${nah() * 0.12})`;
                g.fillRect(0, nah() * N, N, 0.6 + nah());
            }
        }
        return cv;
    }

    /** Textura varné desky (černé sklo se zónami nebo hořáky), přes celou desku. */
    function kresliVarnou(druh) {
        const W = 512, H = 448;
        const cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const g = cv.getContext('2d');
        g.fillStyle = '#222';
        g.fillRect(0, 0, W, H);
        const zony = [[0.28, 0.3, 0.17], [0.72, 0.3, 0.13], [0.28, 0.72, 0.13], [0.72, 0.72, 0.17]];
        for (const [x, y, r] of zony) {
            if (druh === 'plyn') {
                g.fillStyle = '#111';
                g.beginPath(); g.arc(x * W, y * H, r * W * 0.75, 0, Math.PI * 2); g.fill();
                g.fillStyle = '#555';
                g.beginPath(); g.arc(x * W, y * H, r * W * 0.42, 0, Math.PI * 2); g.fill();
            } else {
                g.strokeStyle = 'rgba(210,210,210,.55)';
                g.lineWidth = 3;
                g.beginPath(); g.arc(x * W, y * H, r * W, 0, Math.PI * 2); g.stroke();
            }
        }
        // Ovládání u přední hrany: plátno se do textury otočí (flipY), horní okraj je vpředu
        if (druh !== 'plyn') {
            g.fillStyle = 'rgba(210,210,210,.5)';
            for (let i = 0; i < 6; i++) g.fillRect(W * 0.3 + i * W * 0.07, H * 0.05, W * 0.04, 3);
        }
        return cv;
    }

    // ─── Stavba 3D z kvádrů ───────────────────────────────
    /** Kvádry v souřadnicích ramene (t podél, h od stěny, y výška) do košů podle materiálu. */
    function stavitel(THREE) {
        const kose = new Map();
        const kos = (mat) => { let b = kose.get(mat); if (!b) { b = { mat, p: [], n: [], uv: [], sl: [] }; kose.set(mat, b); } return b; };
        const ctverec = (b, body, N, uvs, sl) => {
            const [p0, p1, p2] = body;
            const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], w = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
            const c = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
            const poradi = c[0] * N[0] + c[1] * N[1] + c[2] * N[2] >= 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2];
            for (const k of poradi) { b.p.push(...body[k]); b.n.push(...N); b.uv.push(...uvs[k]); }
            b.sl.push(sl, sl);
        };
        return {
            kvadr(mat, r, t0, t1, h0, h1, y0, y1, o = {}) {
                if (!mat || t1 - t0 < 1e-4 || h1 - h0 < 1e-4 || y1 - y0 < 1e-4) return;
                const b = kos(mat);
                const P = (t, h, y) => { const q = bodRamene(r, t, h); return [q.x, y, q.y]; };
                const d = [r.d.x, 0, r.d.y], n = [r.n.x, 0, r.n.y];
                const neg = (a) => [-a[0], -a[1], -a[2]];
                // Souřadnice textury v metrech; varná deska má vlastní (přes celou desku 0–1)
                const f = o.uvFn || (o.uvOtoc ? (a, c) => [c, a] : (a, c) => [a, c]);
                const sl = o.sloupec ?? null;
                ctverec(b, [P(t0, h1, y0), P(t1, h1, y0), P(t1, h1, y1), P(t0, h1, y1)], n, [f(t0, y0), f(t1, y0), f(t1, y1), f(t0, y1)], sl);
                if (!o.bezZadni) ctverec(b, [P(t0, h0, y0), P(t1, h0, y0), P(t1, h0, y1), P(t0, h0, y1)], neg(n), [f(t0, y0), f(t1, y0), f(t1, y1), f(t0, y1)], sl);
                ctverec(b, [P(t1, h0, y0), P(t1, h1, y0), P(t1, h1, y1), P(t1, h0, y1)], d, [f(h0, y0), f(h1, y0), f(h1, y1), f(h0, y1)], sl);
                ctverec(b, [P(t0, h0, y0), P(t0, h1, y0), P(t0, h1, y1), P(t0, h0, y1)], neg(d), [f(h0, y0), f(h1, y0), f(h1, y1), f(h0, y1)], sl);
                ctverec(b, [P(t0, h0, y1), P(t1, h0, y1), P(t1, h1, y1), P(t0, h1, y1)], [0, 1, 0], [f(t0, h0), f(t1, h0), f(t1, h1), f(t0, h1)], sl);
                if (!o.bezSpodku) ctverec(b, [P(t0, h0, y0), P(t1, h0, y0), P(t1, h1, y0), P(t0, h1, y0)], [0, -1, 0], [f(t0, h0), f(t1, h0), f(t1, h1), f(t0, h1)], sl);
            },
            hotovo(skupina, userData) {
                for (const b of kose.values()) {
                    const g = new THREE.BufferGeometry();
                    g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
                    g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
                    const m = b.mat.userData.metru || 1;
                    const uv = b.mat.userData.uvPevne ? b.uv : b.uv.map(x => x / m);
                    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
                    g.setAttribute('uv2', new THREE.Float32BufferAttribute(uv, 2));
                    const mesh = new THREE.Mesh(g, b.mat);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    Object.assign(mesh.userData, userData, { sloupce: b.sl });
                    skupina.add(mesh);
                }
            },
        };
    }

    // ─── Nákres zepředu (SVG) ─────────────────────────────
    const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    /**
     * Rozvinutý pohled na sestavu zepředu. Vrací SVG a mapu sloupců (x v jednotkách SVG) pro klik a tah.
     * U L jsou ramena vedle sebe s mezerou, část ramene skrytá za druhým ramenem je šrafovaná.
     */
    function nakres(s, rv, ctx, stav) {
        const W = NAKRES_SIRKA, MEZERA = 0.3;
        // Volné místo u konců (po stěnu nebo překážku) je v nákresu taky, čárkovaně s rozměrem
        const pred = (stav.volno || []).find(v => v.kde === 'zacatek')?.m || 0;
        const za = (stav.volno || []).find(v => v.kde === 'konec')?.m || 0;
        const delka = rv.ramena.reduce((a, r) => a + r.L, 0) + MEZERA * Math.max(0, rv.ramena.length - 1) + pred + za;
        const vyska = s.druh === 'skrin' ? Math.max(rv.H, 2) + 0.12 : Math.max(rv.vys.vysokaDo, rv.vys.horniDo, 2.2) + 0.15;
        const k = Math.min((W - 12) / Math.max(delka, 0.5), 150 / vyska);
        const H = Math.round(vyska * k + 18);
        const zem = H - 14;
        const ox = [];
        let x = 6 + pred * k;
        for (const r of rv.ramena) { ox.push(x); x += r.L * k + MEZERA * k; }
        const X = (ri, t) => ox[ri] + t * k, Y = (y) => zem - y * k;
        const el = [];
        const obd = (x0, y0, x1, y1, styl) => el.push(`<rect x="${Math.min(x0, x1).toFixed(1)}" y="${Math.min(y0, y1).toFixed(1)}" width="${Math.abs(x1 - x0).toFixed(1)}" height="${Math.abs(y1 - y0).toFixed(1)}" ${styl}/>`);
        const cara = (x0, y0, x1, y1, styl) => el.push(`<line x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}" ${styl}/>`);
        const obrys = 'stroke="#4b5563" stroke-width="0.8"';
        const primary = stav.primary || '#e8590c';
        const mapa = [];
        // Okna a dveře ve stěně za sestavou, strop
        rv.ramena.forEach((r, ri) => {
            for (const o of ctx?.otvory?.[ri] || []) {
                if (o.typ === 'okno') obd(X(ri, o.t0), Y(o.parapet), X(ri, o.t1), Y(o.parapet + o.vyska), 'fill="rgba(147,197,253,.35)" stroke="rgba(59,130,246,.6)" stroke-width="0.8"');
                else obd(X(ri, o.t0), Y(0), X(ri, o.t1), Y(o.vyska || 2), 'fill="none" stroke="#9ca3af" stroke-width="0.8" stroke-dasharray="3 2"');
            }
            cara(X(ri, 0), Y(rv.vys.strop), X(ri, r.L), Y(rv.vys.strop), 'stroke="#9ca3af" stroke-width="0.6" stroke-dasharray="4 3"');
            cara(X(ri, 0), zem, X(ri, r.L), zem, 'stroke="#6b7280" stroke-width="0.8"');
        });
        const posledni = rv.ramena.length - 1;
        for (const [ri, t0, t1] of [[0, -pred, 0], [posledni, rv.ramena[posledni]?.L || 0, (rv.ramena[posledni]?.L || 0) + za]]) {
            if (t1 - t0 < 0.005) continue;
            const x0 = X(ri, t0), x1 = X(ri, t1), vy = Y(s.druh === 'skrin' ? Math.min(rv.H, 1) : rv.vys.deska);
            obd(x0 + 0.5, vy, x1 - 0.5, zem, 'fill="none" stroke="#9ca3af" stroke-width="0.8" stroke-dasharray="3 2"');
            if (x1 - x0 > 12) el.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="${(zem + 10).toFixed(1)}" font-size="8.5" text-anchor="middle" fill="#9ca3af">${Math.round((t1 - t0) * 100)}</text>`);
        }
        if (s.druh === 'skrin') nakresSkrine(s, rv, stav, { obd, cara, X, Y, k, obrys, primary, mapa, el, zem });
        else nakresKuchyne(s, rv, stav, { obd, cara, X, Y, k, obrys, primary, mapa, el, zem });
        if (stav.tah && typeof stav.tah.x === 'number') cara(stav.tah.x, 4, stav.tah.x, zem, `stroke="${primary}" stroke-width="2.5"`);
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" style="display:block;touch-action:none;user-select:none" data-sestava-nakres>${el.join('')}</svg>`;
        return { svg, mapa, W, H };
    }

    function nakresKuchyne(s, rv, stav, n) {
        const { obd, cara, X, Y, k, obrys, primary, mapa, el, zem } = n;
        const v = rv.vys;
        const cela = povrchSestavy(s, 'cela').barva, celaH = povrchSestavy(s, 'celaHorni').barva;
        const deska = povrchSestavy(s, 'deska').barva;
        const spot = (SPOTREBICE[povrchSestavy(s, 'spotrebice')] || SPOTREBICE.nerez).barva;
        const soklBarva = ({ cela, korpus: povrchSestavy(s, 'korpus').barva, nerez: KOVY.nerez, cerna: '#2a2a2a' })[povrchSestavy(s, 'sokl')] || cela;
        const F = (b) => `fill="${b}" ${obrys}`;
        const celo = (x0, y0, x1, y1, b, uchyt) => {
            obd(x0 + 0.6, Y(y1) + 0.6, x1 - 0.6, Y(y0) - 0.6, F(b));
            if (uchyt === 'h') cara((x0 + x1) / 2 - 4, Y(y1) + 3, (x0 + x1) / 2 + 4, Y(y1) + 3, 'stroke="#374151" stroke-width="1"');
            else if (uchyt === 'vd') cara(x1 - 3, Y(y1) + 3, x1 - 3, Y(y1) + 8, 'stroke="#374151" stroke-width="1"');
            else if (uchyt === 'vh') cara(x1 - 3, Y(y0) - 3, x1 - 3, Y(y0) - 8, 'stroke="#374151" stroke-width="1"');
        };
        const dvirka = (x0, x1, y0, y1, pocet, b, uchyt) => {
            const p = Math.max(1, pocet || 1), w = (x1 - x0) / p;
            for (let i = 0; i < p; i++) celo(x0 + i * w, y0, x0 + (i + 1) * w, y1, b, uchyt);
        };
        const zasuvky = (x0, x1, y0, y1, pocet, b) => {
            const dily = pocet === 2 ? [0.5, 0.5] : pocet === 4 ? [0.19, 0.27, 0.27, 0.27] : [0.22, 0.39, 0.39];
            let y = y1;
            for (const d of dily) { const yy = y - (y1 - y0) * d; celo(x0, yy, x1, y, b, 'h'); y = yy; }
        };
        const trouba = (x0, x1, y0, y1) => {
            obd(x0 + 0.6, Y(y1) + 0.6, x1 - 0.6, Y(y0) - 0.6, F(spot));
            obd(x0 + 3, Y(y1) + 6, x1 - 3, Y(y0) - 3, `fill="${CERNE_SKLO}" stroke="none"`);
            cara(x0 + 4, Y(y1) + 3, x1 - 4, Y(y1) + 3, 'stroke="#111" stroke-width="1.2"');
        };
        for (const c of rv.sloupce) {
            const x0 = X(c.ri, c.t0), x1 = X(c.ri, c.t1), sl = c.sl;
            const vybrany = stav.vybrany === c.klic;
            mapa.push({ klic: c.klic, x0, x1, ri: c.ri, i: c.i });
            const g0 = el.length;
            if (c.typ === 'lista') {
                obd(x0, Y(v.korpusDo), x1, Y(v.sokl), F(cela));
                if (c.horniEf) obd(x0, Y(c.horniDo), x1, Y(v.horniOd), F(celaH));
            } else if (c.typ === 'volne') {
                const sp = sl.volne?.spotrebic || 'mezera';
                if (sp === 'lednice' || sp === 'americka') {
                    const vy = sp === 'americka' ? 1.78 : 1.85;
                    obd(x0 + 1, Y(vy), x1 - 1, zem, `fill="${spot}" ${obrys} rx="2"`);
                    if (sp === 'americka') cara((x0 + x1) / 2, Y(vy), (x0 + x1) / 2, zem, obrys);
                    else cara(x0 + 1, Y(0.75), x1 - 1, Y(0.75), obrys);
                } else obd(x0 + 1, Y(0.9), x1 - 1, zem, 'fill="none" stroke="#9ca3af" stroke-width="0.8" stroke-dasharray="3 2"');
            } else if (c.typ === 'vysoka') {
                const vs = sl.vysoka || {};
                obd(x0, Y(v.sokl), x1, zem, F(soklBarva));
                const top = v.vysokaDo;
                if (vs.celo === 'lednice') {
                    celo(x0, v.sokl, x1, v.sokl + 0.72, cela, 'vd');
                    const hd = Math.min(top, v.sokl + 1.8);
                    celo(x0, v.sokl + 0.72, x1, hd, cela, 'vh');
                    if (top - hd > 0.12) celo(x0, hd, x1, top, cela, 'vh');
                } else if (vs.celo === 'trouba' || vs.celo === 'trouba_mikro') {
                    const t0 = vs.celo === 'trouba' ? 0.85 : 0.75;
                    celo(x0, v.sokl, x1, t0, cela, 'h');
                    trouba(x0, x1, t0, t0 + 0.6);
                    let y = t0 + 0.6;
                    if (vs.celo === 'trouba_mikro') { obd(x0 + 0.6, Y(y + 0.38), x1 - 0.6, Y(y), F(spot)); obd(x0 + 4, Y(y + 0.32), x1 - 10, Y(y + 0.05), `fill="${CERNE_SKLO}" stroke="none"`); y += 0.38; }
                    if (top - y > 0.1) celo(x0, y, x1, top, cela, 'vh');
                } else if (vs.celo === 'otevrena') {
                    obd(x0 + 0.6, Y(top), x1 - 0.6, Y(v.sokl), `fill="${smichej(povrchSestavy(s, 'korpus').barva, '#000000', 0.12)}" ${obrys}`);
                    for (let i = 1; i < 5; i++) { const y = v.sokl + (top - v.sokl) * i / 5; cara(x0 + 1, Y(y), x1 - 1, Y(y), obrys); }
                } else {
                    const p = omez(vs.pocet || 2, 2, 3);
                    const hrany = p === 3 ? [v.sokl, v.korpusDo, v.horniOd, top] : [v.sokl, v.korpusDo + 0.05, top];
                    const vedle = vs.dvoje ? 2 : 1;
                    for (let i = 0; i + 1 < hrany.length; i++) dvirka(x0, x1, hrany[i], hrany[i + 1], vedle, cela, i ? 'vh' : 'vd');
                }
            } else {
                // Spodní skříňka
                const sp = sl.spodni || {};
                obd(x0, Y(v.sokl), x1, zem, F(soklBarva));
                const y0 = v.sokl, y1 = v.korpusDo;
                if (sp.celo === 'zasuvky') zasuvky(x0, x1, y0, y1, sp.pocet || 3, cela);
                else if (sp.celo === 'zasuvka_dvirka') { celo(x0, y1 - 0.17, x1, y1, cela, 'h'); dvirka(x0, x1, y0, y1 - 0.17, sp.pocet, cela, 'vd'); }
                else if (sp.celo === 'otevrena') { obd(x0 + 0.6, Y(y1), x1 - 0.6, Y(y0), `fill="${smichej(povrchSestavy(s, 'korpus').barva, '#000000', 0.12)}" ${obrys}`); cara(x0 + 1, Y((y0 + y1) / 2), x1 - 1, Y((y0 + y1) / 2), obrys); }
                else if (sp.celo === 'trouba') { trouba(x0, x1, y1 - 0.6, y1); celo(x0, y0, x1, y1 - 0.6, cela, 'h'); }
                else if (sp.celo === 'mycka') {
                    if (sp.mycka === 'panel') { obd(x0 + 0.6, Y(y1), x1 - 0.6, Y(y0), F(spot)); obd(x0 + 0.6, Y(y1), x1 - 0.6, Y(y1 - 0.08), `fill="${CERNE_SKLO}" stroke="none"`); }
                    else celo(x0, y0, x1, y1, cela, 'h');
                } else dvirka(x0, x1, y0, y1, sp.pocet, cela, 'vd');
                // Deska se dřezem nebo varnou deskou
                if (sp.vDesce === 'drez') {
                    const xm = (x0 + x1) / 2;
                    el.push(`<path d="M${(xm + 3).toFixed(1)} ${Y(v.deska).toFixed(1)} v-${(0.28 * k).toFixed(1)} h-${(0.12 * k).toFixed(1)} v${(0.04 * k).toFixed(1)}" fill="none" stroke="#6b7280" stroke-width="1.4"/>`);
                } else if (sp.vDesce === 'varna') obd(x0 + 3, Y(v.deska) - 1.6, x1 - 3, Y(v.deska), `fill="${CERNE_SKLO}" stroke="none"`);
                // Horní skříňka
                if (c.horniEf) {
                    const hp = sl.horni || {}, ho = v.horniOd, hd = c.horniDo;
                    if (hp.celo === 'komin') {
                        const xm = (x0 + x1) / 2, sx = Math.min((x1 - x0) / 2, 0.45 * k);
                        el.push(`<path d="M${(xm - sx).toFixed(1)} ${Y(ho + 0.1).toFixed(1)} L${(xm + sx).toFixed(1)} ${Y(ho + 0.1).toFixed(1)} L${(xm + 0.15 * k).toFixed(1)} ${Y(ho + 0.3).toFixed(1)} L${(xm - 0.15 * k).toFixed(1)} ${Y(ho + 0.3).toFixed(1)} Z" fill="${spot}" ${obrys}/>`);
                        obd(xm - 0.13 * k, Y(v.strop), xm + 0.13 * k, Y(ho + 0.3), F(spot));
                    } else if (hp.celo === 'otevrena') {
                        obd(x0 + 0.6, Y(hd), x1 - 0.6, Y(ho), `fill="${smichej(povrchSestavy(s, 'korpus').barva, '#000000', 0.12)}" ${obrys}`);
                        cara(x0 + 1, Y((ho + hd) / 2), x1 - 1, Y((ho + hd) / 2), obrys);
                    } else if (hp.celo === 'vyklop') {
                        const p = omez(hp.pocet || 1, 1, 2);
                        for (let i = 0; i < p; i++) { const a = ho + (hd - ho) * i / p, b = ho + (hd - ho) * (i + 1) / p; celo(x0, a, x1, b, celaH, null); cara((x0 + x1) / 2 - 4, Y(a) - 3, (x0 + x1) / 2 + 4, Y(a) - 3, 'stroke="#374151" stroke-width="1"'); }
                    } else {
                        const b = hp.celo === 'sklo' ? '#cfe3ee' : celaH;
                        const od = hp.celo === 'digestor' ? ho + 0.06 : ho;
                        dvirka(x0, x1, od, hd, hp.pocet, b, 'vh');
                        if (hp.celo === 'digestor') obd(x0 + 0.6, Y(ho + 0.06), x1 - 0.6, Y(ho), F(spot));
                    }
                }
            }
            // Deska nad spodními skříňkami
            if (maSpodni(c.typ)) obd(x0, Y(v.deska), x1, Y(v.korpusDo), `fill="${deska}" stroke="#4b5563" stroke-width="0.6"`);
            if (c.varovani.length) obd(x0 + 1, Y(Math.max(v.vysokaDo, c.horniDo)) + 1, x1 - 1, zem - 1, 'fill="none" stroke="#f59e0b" stroke-width="1.4" stroke-dasharray="3 2"');
            if (vybrany) obd(x0 + 0.5, 2, x1 - 0.5, zem + 0.5, `fill="none" stroke="${primary}" stroke-width="2"`);
            if (x1 - x0 > 14) el.push(`<text x="${((x0 + x1) / 2).toFixed(1)}" y="${(zem + 10).toFixed(1)}" font-size="8.5" text-anchor="middle" fill="${vybrany ? primary : '#6b7280'}">${Math.round(sl.sirka * 100)}</text>`);
            el.splice(g0, 0, `<g data-sloupec="${c.klic}">`);
            el.push('</g>');
        }
        // Rohy: viditelná čela rohové skříňky, skrytá část šrafovaně
        for (const roh of rv.rohy) {
            const ra = rv.ramena[roh.i], D = rv.D, Dh = rv.Dh;
            for (const [ri, a, b, skryte] of [[roh.i, ra.L - roh.A, ra.L - D, [ra.L - D, ra.L]], [roh.i + 1, D, roh.A, [0, D]]]) {
                const x0 = X(ri, a), x1 = X(ri, b);
                obd(X(ri, skryte[0]), Y(v.deska), X(ri, skryte[1]), zem, 'fill="url(#kk-sraf)" stroke="#9ca3af" stroke-width="0.6"');
                obd(x0, Y(v.sokl), x1, zem, F(soklBarva));
                if (roh.spodni === 'slepy') obd(x0, Y(v.korpusDo), x1, Y(v.sokl), F(cela));
                else celo(x0, v.sokl, x1, v.korpusDo, cela, 'vd');
                obd(X(ri, Math.min(a, skryte[0])), Y(v.deska), X(ri, Math.max(b, skryte[1])), Y(v.korpusDo), `fill="${deska}" stroke="#4b5563" stroke-width="0.6"`);
                if (roh.horni !== 'nic') {
                    const xa = X(ri, a), xb = X(ri, b);
                    if (roh.horni === 'police') { obd(xa, Y(v.horniDo), xb, Y(v.horniOd), `fill="none" ${obrys}`); cara(xa, Y((v.horniOd + v.horniDo) / 2), xb, Y((v.horniOd + v.horniDo) / 2), obrys); }
                    else celo(xa, v.horniOd, xb, v.horniDo, celaH, 'vh');
                    obd(X(ri, skryte[0]), Y(v.horniDo), X(ri, skryte[1]), Y(v.horniOd), 'fill="url(#kk-sraf)" stroke="#9ca3af" stroke-width="0.6"');
                }
                void Dh;
            }
        }
        el.unshift('<defs><pattern id="kk-sraf" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="5" stroke="#cbd5e1" stroke-width="1.5"/></pattern></defs>');
    }

    function nakresSkrine(s, rv, stav, n) {
        const { obd, cara, X, Y, obrys, primary, mapa, el } = n;
        const r = rv.ramena[0];
        if (!r) return;
        const dvereBarva = povrchSestavy(s, 'dvere').barva, korpus = povrchSestavy(s, 'korpus').barva;
        const ram = KOVY[s.ram || 'stribrna'] || KOVY.stribrna;
        obd(X(0, 0), Y(rv.H), X(0, r.L), Y(0), `fill="${smichej(korpus, '#000000', 0.15)}" ${obrys}`);
        if (rv.druhDveri === 'zadne') {
            for (let i = 1; i < 6; i++) cara(X(0, 0) + 1, Y(rv.H * i / 6), X(0, r.L) - 1, Y(rv.H * i / 6), obrys);
            cara(X(0, 0) + 2, Y(1.65), X(0, r.L) - 2, Y(1.65), 'stroke="#6b7280" stroke-width="1.6"');
        }
        const serazene = [...rv.dvere].sort((a, b) => b.vrstva - a.vrstva);
        for (const d of serazene) {
            const x0 = X(0, d.t0), x1 = X(0, d.t1);
            const vybrane = stav.dvere === d.i;
            const b = d.zrcadlo ? (ZRCADLA[d.zrcadlo] || ZRCADLA.stribrne) : dvereBarva;
            el.push(`<g data-dvere="${d.i}">`);
            obd(x0 + 0.5, Y(rv.H) + 2, x1 - 0.5, Y(0) - 2, `fill="${b}" stroke="${rv.druhDveri === 'posuvne' ? ram : '#4b5563'}" stroke-width="${rv.druhDveri === 'posuvne' ? 1.6 : 0.8}"`);
            if (d.zrcadlo) cara(x0 + (x1 - x0) * 0.25, Y(rv.H * 0.75), x0 + (x1 - x0) * 0.6, Y(rv.H * 0.95), 'stroke="rgba(255,255,255,.7)" stroke-width="2"');
            if (rv.druhDveri === 'otocne') { const xu = d.i % 2 ? x0 + 3 : x1 - 3; cara(xu, Y(1.1), xu, Y(0.9), 'stroke="#374151" stroke-width="1.2"'); }
            if (vybrane) obd(x0 + 1, Y(rv.H) + 3, x1 - 1, Y(0) - 3, `fill="none" stroke="${primary}" stroke-width="2"`);
            el.push('</g>');
            // Klik a šířka podle dílu (posuvné díly se o 3 cm překrývají, rozměr platí bez překrytí)
            const a = X(0, d.dil[0]), b2 = X(0, d.dil[1]);
            mapa.push({ dvere: d.i, x0: a, x1: b2, ri: 0 });
            if (b2 - a > 14) el.push(`<text x="${((a + b2) / 2).toFixed(1)}" y="${(n.zem + 10).toFixed(1)}" font-size="8.5" text-anchor="middle" fill="${vybrane ? primary : '#6b7280'}">${Math.round((d.dil[1] - d.dil[0]) * 100)}</text>`);
        }
        mapa.sort((a, b) => a.x0 - b.x0);
    }

    window.SestavyGeo = { ramenaSestavy, rozvrh, vybavKuchyn, dorovnejRameno, dorovnej, useky, delkaRohu, obrysySestavy, dilySkrine, volnyKonecRamene, VOLBY };

    // ─── Mixin editoru ────────────────────────────────────
    window.KonceptSestavy = {
        katalogRezim: 'nabytek',     // panel Nábytek a vybavení: 'nabytek' | 'sestava' (pamatuje se)
        sestavaDruh: 'kuchyn',
        sestavaSloupecKlic: null,    // vybraný sloupec 'rameno:index'
        sestavaDvere: null,          // vybrané dveře skříně (index)
        sestavaZalozka: 'skrinky',
        sestavaTvar: 'rovna',        // tvar nové kuchyně: 'rovna' | 'L' | 'U' (pamatuje se)
        _sestavaNahled: null,
        _sestavaNakresTah: null,
        _sestavaKlikDo: 0,

        sestavyInit() {
            try {
                const r = localStorage.getItem('kv3_katalog_rezim');
                if (r === 'sestava' || r === 'nabytek') this.katalogRezim = r;
                const t = localStorage.getItem('kv3_sestava_tvar');
                if (['rovna', 'L', 'U'].includes(t)) this.sestavaTvar = t;
            } catch (e) { /* soukromý režim: výchozí nábytek a rovná linka */ }
        },

        prepniKatalogRezim(rezim) {
            this.katalogRezim = rezim === 'sestava' ? 'sestava' : 'nabytek';
            try { localStorage.setItem('kv3_katalog_rezim', this.katalogRezim); } catch (e) { /* jen do obnovení stránky */ }
            if (this.katalogRezim === 'sestava') this._katalogZrusVyber?.();
            else if (this.nastroj === 'sestava') this.nastroj = 'vyber';
        },

        /** Nástroj sestavy z dlaždice v panelu Nábytek a vybavení. */
        zacniSestavu(druh) {
            if (this.rezim3d) this.prepni2d();
            this._zrusRozkreslene?.();
            this._katalogZrusVyber?.();
            this.sestavaDruh = druh === 'skrin' ? 'skrin' : 'kuchyn';
            this.showVybaveni = true;
            if (this.renderer) this.renderer.showVybaveni = true;
            this.renderer?.clearSelection();
            this.nastroj = 'sestava';
        },

        get sestavaVolby() {
            const t = (skupina, id) => ({ id, nazev: preloz('ed_sablona.sestava.' + skupina + '.' + id) });
            const o = {};
            for (const [klic, seznam] of Object.entries(VOLBY)) o[klic] = seznam.map(id => t(klic, id));
            o.dekory = Object.fromEntries(Object.entries(DEKORY_POVRCHU).map(([k, seznam]) => [k, seznam.map(id => ({ id, nazev: preloz('ed_sablona.sestava.dekor.' + id) }))]));
            o.sirky = [30, 40, 45, 50, 60, 80, 90, 100];
            return o;
        },

        /** Kolik čel jde u volby nastavit (dvířka, šuplíky…), bez volby null. */
        sestavaPocty(celo, vysoka = false) {
            if (vysoka) return celo === 'dvirka' ? POCTY.vysoka : null;
            return POCTY[celo] || null;
        },

        _vybranaSestava() {
            const id = this.renderer ? [...(this.renderer.selectedSestavy || [])][0] : null;
            return id ? (this.engine.dum.sestavy || []).find(s => s.id === id) || null : null;
        },

        _sestavaPodleId(id) {
            return (this.engine?.dum.sestavy || []).find(s => s.id === id) || null;
        },

        // ─── Okolí sestavy: strop, okna a dveře ve stěně za ní ──
        _sestavaKontext(s) {
            const e = this.engine;
            const p = e.podlaziPodleId(s.podlazi);
            const eng = e.enginePodlazi(s.podlazi);
            const PX = e.PX_PER_M;
            const P0 = { x: s.body[0][0] * PX, y: -s.body[0][1] * PX };
            const dh = this._nulaBodu ? this._nulaBodu(s.podlazi, P0) : 0;
            const strop = (p ? e.svetlaVyska(p) : 2.6) - dh;
            const ramena = ramenaSestavy(s);
            return { strop, dh, otvory: ramena.map(r => this._otvoryURamene(eng, r)), kota: e.kotyPodlazi().get(s.podlazi) ?? 0 };
        },

        /** Otvory ve stěně, o kterou se rameno opírá: interval podél ramene (m), parapet a výška. */
        _otvoryURamene(eng, r) {
            if (!eng) return [];
            const PX = eng.PX_PER_M, out = [];
            for (const o of eng.openings.values()) {
                const w = eng.walls.get(o.wallId);
                const A = w && eng.nodes.get(w.nodeA), B = w && eng.nodes.get(w.nodeB);
                if (!A || !B) continue;
                const a = { x: A.x / PX, y: A.y / PX }, b = { x: B.x / PX, y: B.y / PX };
                const L = V.len(V.sub(b, a));
                if (L < 0.1) continue;
                const u = V.mul(V.sub(b, a), 1 / L);
                if (Math.abs(V.cross(u, r.d)) > 0.08) continue;
                const stred = V.add(a, V.mul(u, o.pozice + o.sirka / 2));
                // Osa stěny leží za lícem, o kterou se rameno opírá (polovina tloušťky)
                const zaLicem = -V.dot(V.sub(stred, r.a), r.n);
                if (Math.abs(zaLicem - (w.tloustka || 0.3) / 2) > 0.12) continue;
                const t1 = V.dot(V.sub(V.add(a, V.mul(u, o.pozice)), r.a), r.d);
                const t2 = V.dot(V.sub(V.add(a, V.mul(u, o.pozice + o.sirka)), r.a), r.d);
                const t0 = Math.min(t1, t2), tk = Math.max(t1, t2);
                if (tk < 0 || t0 > r.L) continue;
                const okno = o.typ === 'okno';
                out.push({ typ: okno ? 'okno' : 'dvere', t0, t1: tk, parapet: window.parapetOtvoru?.(o) ?? (okno ? 0.9 : 0), vyska: window.vyskaOtvoru?.(o) ?? (okno ? 1.5 : 2.1) });
            }
            return out;
        },

        _sestavaRozvrh(s, ctx = null) {
            return rozvrh(s, ctx || this._sestavaKontext(s));
        },

        // ─── Líce stěn a volné úseky (nástroj) ──────────────
        /** Líce stěn aktivního podlaží v px: úsečka p→q, směr d a normála m ven ze stěny. */
        _sestavaLica() {
            const e = this.engine;
            const otisk = e.geoPodpis() + '|' + [...e.openings.values()].map(o => o.id + ':' + o.pozice + ':' + o.sirka + ':' + o.typ).join();
            if (this._licaCache?.otisk === otisk) return this._licaCache;
            const PX = e.PX_PER_M, lica = [], polygony = [];
            for (const w of e.walls.values()) {
                if (w.typ === 'plot') continue;
                const poly = e.getWallPolygon(w.id);
                const A = e.nodes.get(w.nodeA), B = e.nodes.get(w.nodeB);
                if (!poly || poly.length < 3 || !A || !B) continue;
                const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
                polygony.push({ id: w.id, poly, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) });
                const osa = V.norm(V.sub(B, A)), stred = V.mul(V.add(A, B), 0.5);
                for (let i = 0; i < poly.length; i++) {
                    const p = poly[i], q = poly[(i + 1) % poly.length];
                    const L = V.len(V.sub(q, p));
                    if (L < 0.25 * PX) continue;
                    const d = V.mul(V.sub(q, p), 1 / L);
                    if (Math.abs(V.cross(d, osa)) > 0.02) continue;
                    let m = V.perp(d);
                    if (V.dot(m, V.sub(p, stred)) < 0) m = V.mul(m, -1);
                    lica.push({ wallId: w.id, p, q, d, m, L });
                }
            }
            this._licaCache = { otisk, lica, polygony };
            return this._licaCache;
        },

        /**
         * Je místo na líci (parametr tt v px) obsazené? Dveře ve stěně líce, jiná stěna těsně před lícem,
         * nebo jiná sestava kdekoli v hloubce nové sestavy (`hloubky` v px od líce).
         */
        _sestavaBlokovano(tt, lice, cache, sestavyPoly, dvere, hloubky) {
            if (dvere.some(([a, b]) => tt >= a && tt <= b)) return true;
            const zaklad = V.add(lice.p, V.mul(lice.d, tt));
            const bod = V.add(zaklad, V.mul(lice.m, hloubky[0]));
            for (const g of cache.polygony) {
                if (g.id === lice.wallId) continue;
                if (bod.x < g.minX || bod.x > g.maxX || bod.y < g.minY || bod.y > g.maxY) continue;
                if (window.DumGeo.bodVPolygonu(bod, g.poly)) return true;
            }
            for (const h of hloubky) {
                const q = V.add(zaklad, V.mul(lice.m, h));
                for (const poly of sestavyPoly) if (window.DumGeo.bodVPolygonu(q, poly)) return true;
            }
            return false;
        },

        /**
         * Volný úsek líce kolem parametru t (px od začátku líce): mezi rohy (jiné stěny), dveřmi a jinými
         * sestavami v celé hloubce `hloubka` (m). Vrací {t0, t1} v px, nebo null, když je místo obsazené.
         */
        _sestavaVolnyUsek(lice, t, mimoId = null, hloubka = this._sestavaHloubkaNove()) {
            const e = this.engine, PX = e.PX_PER_M, cache = this._sestavaLica();
            const krok = 0.02 * PX, odstup = 0.04 * PX;
            const hloubky = [odstup, hloubka / 2 * PX, Math.max(odstup, (hloubka - 0.03) * PX)];
            const sestavyPoly = (e.dum.sestavy || []).filter(s => s.podlazi === e.dum.aktivni && s.id !== mimoId)
                .flatMap(s => obrysySestavy(s).map(poly => poly.map(q => ({ x: q.x * PX, y: q.y * PX }))));
            // Dveře ve stěně líce (i francouzské okno a průchod): interval podél líce s rezervou na zárubeň
            const w = e.walls.get(lice.wallId), A = w && e.nodes.get(w.nodeA), B = w && e.nodes.get(w.nodeB);
            const dvere = [];
            if (A && B) {
                const osa = V.norm(V.sub(B, A));
                for (const o of e.openings.values()) {
                    if (o.wallId !== lice.wallId || o.typ === 'okno') continue;
                    const a = V.dot(V.sub(V.add(A, V.mul(osa, o.pozice * PX)), lice.p), lice.d);
                    const b = V.dot(V.sub(V.add(A, V.mul(osa, (o.pozice + o.sirka) * PX)), lice.p), lice.d);
                    dvere.push([Math.min(a, b) - 0.05 * PX, Math.max(a, b) + 0.05 * PX]);
                }
            }
            // Dveře v ostatních stěnách: před nimi musí zůstat místo na průchod a otevření (šířka dveří na obě strany).
            // Jinak by rameno do L nebo U v rohu vjelo do dveří v sousední stěně.
            for (const o of e.openings.values()) {
                if (o.wallId === lice.wallId || o.typ === 'okno') continue;
                const w2 = e.walls.get(o.wallId), A2 = w2 && e.nodes.get(w2.nodeA), B2 = w2 && e.nodes.get(w2.nodeB);
                if (!A2 || !B2) continue;
                const osa2 = V.norm(V.sub(B2, A2)), kolmo = V.perp(osa2);
                const p0 = V.add(A2, V.mul(osa2, o.pozice * PX)), p1 = V.add(A2, V.mul(osa2, (o.pozice + o.sirka) * PX));
                const h = (o.typ === 'garazova_vrata' ? 0.5 : o.sirka + 0.05) * PX;
                sestavyPoly.push([V.add(p0, V.mul(kolmo, h)), V.add(p1, V.mul(kolmo, h)), V.add(p1, V.mul(kolmo, -h)), V.add(p0, V.mul(kolmo, -h))]);
            }
            const blok = (tt) => this._sestavaBlokovano(tt, lice, cache, sestavyPoly, dvere, hloubky);
            const t0 = omez(t, 0, lice.L);
            if (blok(t0)) return null;
            let a = t0, b = t0;
            while (a - krok >= 0 && !blok(a - krok)) a -= krok;
            while (b + krok <= lice.L && !blok(b + krok)) b += krok;
            // Hranu překážky dohledat půlením na desetinu milimetru, jinak by linka končila až 2 cm před rohem
            const dohledej = (volno, plno) => {
                for (let i = 0; i < 9; i++) { const s = (volno + plno) / 2; if (blok(s)) plno = s; else volno = s; }
                return volno;
            };
            a = a - krok < 0 ? (blok(0) ? dohledej(a, 0) : 0) : dohledej(a, a - krok);
            b = b + krok > lice.L ? (blok(lice.L) ? dohledej(b, lice.L) : lice.L) : dohledej(b, b + krok);
            return { t0: a, t1: b };
        },

        /** Nejbližší líce ke kurzoru (px) z místnosti, do 1,5 m. */
        _sestavaLiceUKurzoru(pos) {
            const PX = this.engine.PX_PER_M, { lica } = this._sestavaLica();
            let nej = null;
            for (const l of lica) {
                const rel = V.sub(pos, l.p), t = V.dot(rel, l.d), s = V.dot(rel, l.m);
                if (t < -0.1 * PX || t > l.L + 0.1 * PX || s < -0.05 * PX || s > 1.5 * PX) continue;
                if (!nej || s < nej.s) nej = { lice: l, t: omez(t, 0, l.L), s };
            }
            return nej;
        },

        /** Líce, které v rohu `E` (px) navazuje kolmo na líce `l1`; `smer` = směr podél l1 do rohu. */
        _sestavaLiceZaRohem(l1, E, smer) {
            const PX = this.engine.PX_PER_M, { lica } = this._sestavaLica();
            let nej = null;
            for (const l of lica) {
                if (l === l1 || Math.abs(V.dot(l.d, l1.d)) > 0.05) continue;
                if (V.dot(l.m, smer) > -0.95) continue;    // místnost na straně, odkud se přichází
                // Průsečík přímek líců
                const det = V.cross(l1.d, l.d);
                if (Math.abs(det) < 1e-6) continue;
                const tt = V.cross(V.sub(l.p, l1.p), l.d) / det;
                const roh = V.add(l1.p, V.mul(l1.d, tt));
                const vzd = V.len(V.sub(roh, E));
                if (vzd > 0.08 * PX) continue;
                const t = V.dot(V.sub(roh, l.p), l.d);
                if (t < -0.08 * PX || t > l.L + 0.08 * PX) continue;
                if (!nej || vzd < nej.vzd) nej = { lice: l, roh, t: omez(t, 0, l.L), vzd };
            }
            return nej;
        },

        /** Úsek na líci za rohem: od rohu ve směru `smer` po první překážku (px). */
        _sestavaUsekZaRohem(zaRohem, smer, mimoId, hloubka = HLOUBKY.spodni + PRESAH) {
            const l = zaRohem.lice, PX = this.engine.PX_PER_M;
            const sgn = V.dot(l.d, smer) >= 0 ? 1 : -1;
            const start = zaRohem.t + sgn * 0.1 * PX;
            const u = this._sestavaVolnyUsek(l, start, mimoId, hloubka);
            if (!u) return null;
            const delka = sgn > 0 ? u.t1 - zaRohem.t : zaRohem.t - u.t0;
            return delka > 0.3 * PX ? delka : null;
        },

        // ─── Kreslení nové sestavy ──────────────────────────
        _sestavaHloubkaNove() {
            return this.sestavaDruh === 'skrin' ? 0.62 : HLOUBKY.spodni + PRESAH;
        },

        /** Náhled pod kurzorem: celý volný úsek líce, u kuchyně do L nebo U i ramena po stěnách v rozích. */
        _sestavaPohyb(pos) {
            const u = this._sestavaLiceUKurzoru(pos);
            let nahled = null;
            if (u) {
                const usek = this._sestavaVolnyUsek(u.lice, u.t);
                if (usek && usek.t1 - usek.t0 >= 0.3 * this.engine.PX_PER_M) nahled = { body: this._sestavaTvarBody(u.lice, usek, u.t) };
            }
            this._sestavaNahled = nahled;
            this._renderDum();
        },

        /** Tvar nové kuchyně v panelu nástroje: rovná, do L, do U (jako u schodů). Pamatuje se. */
        nastavTvarSestavy(tvar) {
            this.sestavaTvar = ['rovna', 'L', 'U'].includes(tvar) ? tvar : 'rovna';
            try { localStorage.setItem('kv3_sestava_tvar', this.sestavaTvar); } catch (e) { /* jen do obnovení stránky */ }
            this._sestavaNahled = null;
            this._renderDum();
        },

        /**
         * Body nové sestavy pro klik na úsek líce (m, y nahoru) podle zvoleného tvaru. Do L pokračuje v rohu blíž
         * kurzoru (když tam roh není, v druhém), do U v obou. Rameno po boční stěně vede do první překážky (dveře,
         * jiná sestava), nejvýš 2,4 m; delší jde vytáhnout za úchyt. Kde roh chybí, zůstane tvar menší.
         */
        _sestavaTvarBody(lice, usek, tKurzor) {
            const PX = this.engine.PX_PER_M;
            const tvar = this.sestavaDruh === 'kuchyn' ? this.sestavaTvar : 'rovna';
            if (tvar === 'rovna') return this._sestavaBodyUseku(lice, usek.t0, usek.t1);
            const vpravo = V.mul(V.perp(lice.m), -1);   // směr čtení při pohledu ke stěně
            const body = [V.add(lice.p, V.mul(lice.d, usek.t0)), V.add(lice.p, V.mul(lice.d, usek.t1))];
            const tt = [usek.t0, usek.t1];
            if (V.dot(V.sub(body[1], body[0]), vpravo) < 0) { body.reverse(); tt.reverse(); }
            const [levy, pravy] = body;
            const rameno = (E, smer) => {
                const zaRohem = this._sestavaLiceZaRohem(lice, E, smer);
                if (!zaRohem) return null;
                const volno = this._sestavaUsekZaRohem(zaRohem, lice.m, null);
                if (!volno || volno < 1.2 * PX) return null;
                return { roh: zaRohem.roh, delka: Math.min(volno, 2.4 * PX) };
            };
            const kandidati = { levy: rameno(levy, V.mul(vpravo, -1)), pravy: rameno(pravy, vpravo) };
            let pouzit = [];
            if (tvar === 'U') pouzit = ['levy', 'pravy'].filter(k => kandidati[k]);
            else {
                const bliz = Math.abs(tKurzor - tt[0]) <= Math.abs(tKurzor - tt[1]) ? 'levy' : 'pravy';
                pouzit = [bliz, bliz === 'levy' ? 'pravy' : 'levy'].filter(k => kandidati[k]).slice(0, 1);
            }
            // Prostřední rameno musí unést oba rohy a kus skříňky
            const L = kandidati.levy && pouzit.includes('levy') ? kandidati.levy : null;
            const R = kandidati.pravy && pouzit.includes('pravy') ? kandidati.pravy : null;
            const a = L ? L.roh : levy, b = R ? R.roh : pravy;
            const potreba = (L ? 0.9 : 0) + (R ? 0.9 : 0) + 0.3;
            if (V.len(V.sub(b, a)) < potreba * PX) return this._sestavaBodyUseku(lice, usek.t0, usek.t1);
            const pts = [];
            if (L) pts.push(V.add(L.roh, V.mul(lice.m, L.delka)), L.roh); else pts.push(levy);
            if (R) pts.push(R.roh, V.add(R.roh, V.mul(lice.m, R.delka))); else pts.push(pravy);
            return pts.map(q => [q.x / PX, -q.y / PX]);
        },

        /** Body rovné sestavy na líci (px → m, y nahoru), vždy zleva doprava při pohledu z místnosti. */
        _sestavaBodyUseku(lice, t0, t1) {
            const PX = this.engine.PX_PER_M;
            const a = V.add(lice.p, V.mul(lice.d, t0)), b = V.add(lice.p, V.mul(lice.d, t1));
            // Zleva doprava při pohledu ke stěně: směr −perp(m)
            const smer = V.mul(V.perp(lice.m), -1);
            const [z, k] = V.dot(V.sub(b, a), smer) >= 0 ? [a, b] : [b, a];
            return [[z.x / PX, -z.y / PX], [k.x / PX, -k.y / PX]];
        },

        _sestavaStisk(pos) {
            const u = this._sestavaLiceUKurzoru(pos);
            if (!u) { this._dumHlaska?.(preloz('ed_sablona.sestava.zadna_stena')); return; }
            const usek = this._sestavaVolnyUsek(u.lice, u.t);
            if (!usek) { this._dumHlaska?.(preloz('ed_sablona.sestava.obsazeno')); return; }
            const PX = this.engine.PX_PER_M, chyt = 0.15 * PX;
            let t = u.t;
            if (t - usek.t0 < chyt) t = usek.t0;
            if (usek.t1 - t < chyt) t = usek.t1;
            this._domTah = { typ: 'sestavaNova', lice: u.lice, usek, tStart: t, start: { ...pos }, posun: false, body: null };
        },

        /** Tah nové sestavy: od bodu stisku po kurzor, přes roh vznikne L. */
        _sestavaNovaPohyb(t, pos, e) {
            const PX = this.engine.PX_PER_M;
            if (!t.posun) {
                if (Math.hypot(pos.x - t.start.x, pos.y - t.start.y) < 6 / (this.stage.scaleX() || 1)) return;
                t.posun = true;
            }
            const l = t.lice, rel = V.sub(pos, l.p);
            const chyt = this._bezMagnetu?.(e) ? 0 : 0.15 * PX;
            let tk = omez(V.dot(rel, l.d), t.usek.t0, t.usek.t1);
            if (tk - t.usek.t0 < chyt) tk = t.usek.t0;
            if (t.usek.t1 - tk < chyt) tk = t.usek.t1;
            t.body = null;
            t.tKonec = tk;
            // Za rohem: kurzor je dál od líce než hloubka sestavy a úsek končí rohem
            const hloubka = this._sestavaHloubkaNove() * PX;
            if (this.sestavaDruh === 'kuchyn' && V.dot(rel, l.m) > hloubka + 0.1 * PX) {
                for (const [konec, smer] of [[t.usek.t1, l.d], [t.usek.t0, V.mul(l.d, -1)]]) {
                    const E = V.add(l.p, V.mul(l.d, konec));
                    if (V.dot(V.sub(pos, E), smer) < -hloubka) continue;
                    const zaRohem = this._sestavaLiceZaRohem(l, E, smer);
                    if (!zaRohem) continue;
                    const volno = this._sestavaUsekZaRohem(zaRohem, l.m, null);
                    if (!volno) continue;
                    const delka2 = omez(V.dot(V.sub(pos, zaRohem.roh), l.m), 0.9 * PX + 0.3 * PX, volno);
                    const start = V.add(l.p, V.mul(l.d, t.tStart));
                    const konec2 = V.add(zaRohem.roh, V.mul(l.m, delka2));
                    // Zleva doprava: roh na konci prvního ramene, nebo na začátku (pak čára začíná za rohem)
                    const vpravo = V.dot(smer, V.mul(V.perp(l.m), -1)) > 0;
                    const pts = vpravo ? [start, zaRohem.roh, konec2] : [konec2, zaRohem.roh, start];
                    if (V.len(V.sub(start, zaRohem.roh)) < 1.2 * PX) break;
                    t.body = pts.map(q => [q.x / PX, -q.y / PX]);
                    break;
                }
            }
            if (!t.body) {
                const a = Math.min(t.tStart, tk), b = Math.max(t.tStart, tk);
                t.body = b - a >= 0.3 * PX ? this._sestavaBodyUseku(l, a, b) : null;
            }
            this._sestavaNahled = t.body ? { body: t.body } : null;
            this._renderDum();
        },

        _sestavaVytvor(t) {
            const e = this.engine, d = e.dum, PX = e.PX_PER_M;
            const body = t.posun ? t.body : this._sestavaTvarBody(t.lice, t.usek, t.tStart);
            const delka = body ? ramenaSestavy({ body, strana: 1 }).reduce((a, r) => a + r.L, 0) : 0;
            if (!body || delka < 0.3) { this._sestavaNahled = null; this._dumHlaska?.(preloz('ed_sablona.sestava.kratka')); this._renderDum(); return; }
            const druh = this.sestavaDruh;
            const pref = druh === 'skrin' ? 'B' : 'K';
            if (!d.sestavy) d.sestavy = [];
            let n = 1;
            while (d.sestavy.some(s => s.id === pref + n)) n++;
            const s = { id: pref + n, podlazi: d.aktivni, druh, body: body.map(b => [zaokr(b[0], 10000), zaokr(b[1], 10000)]), strana: 1 };
            if (druh === 'kuchyn') {
                Object.assign(s, { vysky: { ...VYSKY }, hloubky: { ...HLOUBKY }, povrchy: klon(POVRCHY_KUCHYN), rohy: Array.from({ length: Math.max(0, body.length - 2) }, () => ({ ...ROH })) });
                s.ramena = vybavKuchyn(s, this._sestavaKontext(s));
            } else {
                Object.assign(s, { hloubka: 0.62, vyska: null, dvere: 'posuvne', pocet: null, ram: 'stribrna', zrcadla: [], povrchy: klon(POVRCHY_SKRIN) });
                // Výklenek: skříň převezme jeho hloubku (do 70 cm)
                if (!t.posun) {
                    const hl = this._sestavaHloubkaVyklenku(t.lice, t.usek);
                    if (hl) s.hloubka = hl;
                }
            }
            e.pushUndo();
            d.sestavy.push(s);
            this._sestavaNahled = null;
            this.nastroj = 'vyber';
            this.renderer.setSelection([]);
            this.renderer.selectedSestavy.add(s.id);
            this.sestavaSloupecKlic = null;
            this.sestavaDvere = null;
            this.sestavaZalozka = 'skrinky';
            this._sestavaKlikDo = performance.now() + 450;
            this._poZmeneDomu(preloz('ed_dum.krok.nova_sestava'));
            void PX;
        },

        /** Hloubka výklenku, do kterého jde skříň: obě boční stěny kratší než 80 cm, jinak null. */
        _sestavaHloubkaVyklenku(lice, usek) {
            const PX = this.engine.PX_PER_M, hloubky = [];
            for (const [konec, smer] of [[usek.t1, lice.d], [usek.t0, V.mul(lice.d, -1)]]) {
                const E = V.add(lice.p, V.mul(lice.d, konec));
                const zaRohem = this._sestavaLiceZaRohem(lice, E, smer);
                if (!zaRohem) return null;
                const l = zaRohem.lice, sgn = V.dot(l.d, lice.m) >= 0 ? 1 : -1;
                hloubky.push(sgn > 0 ? l.L - zaRohem.t : zaRohem.t);
            }
            const hl = Math.min(...hloubky) / PX;
            return hl >= 0.35 && hl <= 0.8 ? zaokr(Math.min(hl, 0.7), 100) : null;
        },

        // ─── Výběr a tah na plánu ───────────────────────────
        _sestavaStiskVyber(pos, e, hit) {
            if (hit.type === 'sestavaKonec') {
                const [id, kde] = String(hit.klic).split(':');
                const s = this._sestavaPodleId(id);
                if (!s) return true;
                this._domTah = { typ: 'sestavaKonec', id, konec: kde === '0' ? 0 : 1, start: { ...pos }, last: { ...pos }, posun: false, puvodni: klon(s.body), puvodniDily: Array.isArray(s.dily) ? [...s.dily] : null };
                return true;
            }
            const s = this._sestavaPodleId(hit.id);
            if (!s) return true;
            const jina = !this.renderer.selectedSestavy.has(s.id);
            this.renderer.setSelection([]);
            this.renderer.selectedSestavy.add(s.id);
            if (jina) { this.sestavaDvere = null; }
            if (hit.sloupec && s.druh === 'kuchyn') {
                this.sestavaSloupecKlic = hit.sloupec;
                this.sestavaZalozka = 'skrinky';
                this._domTah = { typ: 'sestavaSloupec', id: s.id, klic: hit.sloupec, start: { ...pos }, last: { ...pos }, posun: false, cil: null };
            } else if (jina) this.sestavaSloupecKlic = null;
            this.renderer.render();
            this._selectionTick++;
            return true;
        },

        /** Tah na plánu: konec sestavy po jejím rameni, sloupec na jiné místo v řadě. */
        _sestavaTahni(t, pos, e) {
            const s = this._sestavaPodleId(t.id);
            if (!s) return;
            const PX = this.engine.PX_PER_M;
            if (t.typ === 'sestavaKonec') {
                const body = klon(t.puvodni);
                const ramena = ramenaSestavy({ ...s, body });
                const posledni = body.length - 1;
                const r = t.konec === 0 ? ramena[0] : ramena[ramena.length - 1];
                const bodM = { x: pos.x / PX, y: pos.y / PX };
                // Nejkratší délka ramene: s rohem roh a kus skříňky, jinak 30 cm
                // Nejkratší délka ramene: s rohem roh a kus skříňky, jinak 30 cm (u U má každé krajní rameno svůj roh)
                const minL = (ramena.length > 1 ? delkaRohu(s, t.konec === 0 ? 0 : ramena.length - 2) : 0) + 0.3;
                if (!t.mez) t.mez = this._sestavaMezKonce(s, t.konec, ramena);
                let L;
                if (t.konec === 0) L = V.dot(V.sub(r.b, bodM), r.d);
                else L = V.dot(V.sub(bodM, r.a), r.d);
                L = omez(L, minL, t.mez ?? Infinity);
                if (!this._bezMagnetu?.(e) && t.mez && t.mez - L < 0.15) L = t.mez;
                if (t.konec === 0) { const q = V.sub(r.b, V.mul(r.d, L)); body[0] = [q.x, -q.y]; } else { const q = V.add(r.a, V.mul(r.d, L)); body[posledni] = [q.x, -q.y]; }
                s.body = body.map(b => [zaokr(b[0], 10000), zaokr(b[1], 10000)]);
                dorovnej(s, t.konec === 0);
                // Skříň s vlastními šířkami dveří: rozdíl délky vezme krajní díl u taženého konce, mimo rozumné meze
                // se skříň zase rozdělí rovným dílem
                if (s.druh === 'skrin' && t.puvodniDily) {
                    const delta = L - (t.konec === 0 ? ramenaSestavy({ ...s, body: t.puvodni })[0].L : ramenaSestavy({ ...s, body: t.puvodni }).slice(-1)[0].L);
                    const dily = [...t.puvodniDily], k = t.konec === 0 ? 0 : dily.length - 1;
                    dily[k] = zaokr(dily[k] + delta);
                    if (dily[k] >= 0.2 && dily[k] <= 1.5) s.dily = dily; else delete s.dily;
                }
                this._renderDum();
                return;
            }
            if (t.typ === 'sestavaSloupec') {
                t.cil = this._sestavaCilSloupce(s, pos);
                this._renderDum();
            }
        },

        /** Nejdelší možná délka ramene při tahu za konec (m): po volném úseku líce, nebo bez omezení. */
        _sestavaMezKonce(s, konec, ramena) {
            const PX = this.engine.PX_PER_M;
            const r = konec === 0 ? ramena[0] : ramena[ramena.length - 1];
            const stred = bodRamene(r, r.L / 2, 0.05);
            const u = this._sestavaLiceUKurzoru({ x: stred.x * PX, y: stred.y * PX });
            if (!u) return null;
            const usek = this._sestavaVolnyUsek(u.lice, u.t, s.id, hloubkaSestavy(s));
            if (!usek) return null;
            const a = V.add(u.lice.p, V.mul(u.lice.d, usek.t0)), b = V.add(u.lice.p, V.mul(u.lice.d, usek.t1));
            const kotva = konec === 0 ? r.b : r.a;   // pevný konec ramene
            const kraj = konec === 0 ? (V.dot(V.sub(a, b), r.d) < 0 ? a : b) : (V.dot(V.sub(b, a), r.d) > 0 ? b : a);
            const L = Math.abs(V.dot(V.sub({ x: kraj.x / PX, y: kraj.y / PX }, kotva), r.d));
            return L > 0.3 ? L : null;
        },

        /** Kam sloupec padne: rameno a index před sloupcem, kterému je kurzor nejblíž. */
        _sestavaCilSloupce(s, pos) {
            const PX = this.engine.PX_PER_M;
            const rv = this._sestavaRozvrh(s);
            const bod = { x: pos.x / PX, y: pos.y / PX };
            let nej = null;
            rv.ramena.forEach((r, ri) => {
                const t = V.dot(V.sub(bod, r.a), r.d), h = V.dot(V.sub(bod, r.a), r.n);
                if (h < -0.6 || h > rv.D + 1) return;
                const sl = rv.sloupce.filter(c => c.ri === ri);
                const hrany = sl.length ? [sl[0].t0, ...sl.map(c => c.t1)] : [rv.useky[ri].od];
                hrany.forEach((x, i) => {
                    const vzd = Math.abs(t - x) + Math.max(0, -h) + Math.max(0, h - rv.D);
                    if (!nej || vzd < nej.vzd) nej = { ri, i, t: x, vzd };
                });
            });
            return nej;
        },

        _sestavaPusteni(t) {
            if (t.typ === 'sestavaNova') { this._sestavaVytvor(t); return true; }
            const s = this._sestavaPodleId(t.id);
            if (!t.posun || !s) { this.renderer.render(); this._selectionTick++; return true; }
            this._sestavaKlikDo = performance.now() + 400;
            if (t.typ === 'sestavaKonec') {
                this._poZmeneDomu(preloz('ed_dum.krok.delka_sestavy'));
                return true;
            }
            if (t.typ === 'sestavaSloupec' && t.cil) {
                const [ri, i] = t.klic.split(':').map(Number);
                const novy = this._sestavaPresun(s, { ri, i }, { ri: t.cil.ri, i: t.cil.i });
                if (novy) this.sestavaSloupecKlic = novy;
                this._poZmeneDomu(preloz('ed_dum.krok.presun_skrinky'));
                return true;
            }
            this.renderer.render();
            return true;
        },

        /** Přesune sloupec (rameno, index) před index `kam.i` v rameni `kam.ri`. Vrací klíč nového místa. */
        _sestavaPresun(s, od, kam) {
            const zdroj = s.ramena?.[od.ri]?.sloupce;
            const cil = s.ramena?.[kam.ri]?.sloupce;
            if (!zdroj || !cil || !zdroj[od.i]) return null;
            let i = kam.i;
            if (od.ri === kam.ri && (i === od.i || i === od.i + 1)) return od.ri + ':' + od.i;
            const [c] = zdroj.splice(od.i, 1);
            if (od.ri === kam.ri && i > od.i) i--;
            cil.splice(i, 0, c);
            if (od.ri !== kam.ri) dorovnej(s);
            const idx = s.ramena[kam.ri].sloupce.indexOf(c);
            return idx >= 0 ? kam.ri + ':' + idx : null;
        },

        _sestavaKlik(pos, e, hit) {
            if (performance.now() < this._sestavaKlikDo) return true;
            if (this.nastroj === 'sestava') return true;
            if (this.nastroj === 'vyber' && (hit?.type === 'sestava' || hit?.type === 'sestavaKonec')) return true;
            return false;
        },

        sestavaEsc() {
            if (this._domTah?.typ === 'sestavaNova') { this._domTah = null; this._sestavaNahled = null; this._renderDum(); return true; }
            if (this.nastroj === 'sestava') { this._sestavaNahled = null; this.nastroj = 'vyber'; this._renderDum(); return true; }
            if (this._vybranaSestava() && (this.sestavaSloupecKlic || this.sestavaDvere !== null)) {
                this.sestavaSloupecKlic = null;
                this.sestavaDvere = null;
                this._renderDum();
                this._selectionTick++;
                return true;
            }
            return false;
        },

        sestavaSmazVybrane() {
            const s = this._vybranaSestava();
            if (!s) return false;
            if (s.druh === 'kuchyn' && this.sestavaSloupecKlic) this.sestavaOdeberSloupec();
            else this.smazatSestavu();
            return true;
        },

        smazatSestavu(id = null) {
            const s = id ? this._sestavaPodleId(id) : this._vybranaSestava();
            if (!s) return;
            // Mazání se vždy potvrzuje (Libor 11. 11. 2026: linka zmizela na jedno klepnutí)
            if (!this.potvrditSmazani?.(s.id + ' ' + preloz('ed_dum.sestava.' + s.druh))) return;
            this.engine.pushUndo();
            this.engine.dum.sestavy = this.engine.dum.sestavy.filter(x => x.id !== s.id);
            this.sestavaSloupecKlic = null;
            this.sestavaDvere = null;
            this.renderer.clearSelection();
            this._poZmeneDomu(preloz('ed_dum.krok.smazani_sestavy'));
        },

        // ─── Úpravy z panelu ────────────────────────────────
        _sestavaUprav(fn, popis = 'ed_dum.krok.sestava') {
            const s = this._vybranaSestava();
            if (!s) return;
            this.engine.pushUndo();
            if (fn(s) === false) { this.engine.undoStack.pop(); return; }
            this._poZmeneDomu(preloz(popis));
        },

        /** Hodnota sestavy podle cesty ('vysky.deska', 'povrchy.cela.barva'…). Délky z panelu jsou v cm. */
        setSestava(cesta, hodnota) {
            this._sestavaUprav((s) => {
                const cm = (min, max) => { const x = cislo(hodnota); return Number.isFinite(x) ? zaokr(omez(x, min, max) / 100) : null; };
                const [a, b, c] = cesta.split('.');
                if (a === 'vysky') {
                    s.vysky = { ...VYSKY, ...(s.vysky || {}) };
                    if (b === 'keStropu') { s.vysky.keStropu = !!hodnota; return; }
                    const meze = { deska: [75, 105], sokl: [4, 25], horni: [30, 120], mezera: [35, 90] }[b];
                    const x = meze && cm(...meze);
                    if (x === null || !meze) return false;
                    s.vysky[b] = x;
                    return;
                }
                if (a === 'hloubky') {
                    s.hloubky = { ...HLOUBKY, ...(s.hloubky || {}) };
                    const meze = { spodni: [30, 80], horni: [20, 60] }[b];
                    const x = meze && cm(...meze);
                    if (x === null || !meze) return false;
                    s.hloubky[b] = x;
                    dorovnej(s);
                    return;
                }
                // Roh podle pořadí: 'roh.0.spodni' (u U jsou rohy dva)
                if (a === 'roh') {
                    const i = Number(b), pocetRohu = Math.max(0, (s.body || []).length - 2);
                    if (!Number.isInteger(i) || i < 0 || i >= pocetRohu || !['spodni', 'horni'].includes(c)) return false;
                    s.rohy = Array.from({ length: pocetRohu }, (_, k) => ({ ...ROH, ...((s.rohy || [])[k] || {}) }));
                    s.rohy[i][c] = hodnota;
                    dorovnej(s);
                    return;
                }
                if (a === 'povrchy') {
                    s.povrchy = s.povrchy || klon(s.druh === 'skrin' ? POVRCHY_SKRIN : POVRCHY_KUCHYN);
                    const p = s.povrchy;
                    if (b === 'celaHorni' && c === 'jinak') { p.celaHorni = hodnota ? klon(p.cela) : null; return; }
                    if (b === 'zastena' && !c) { p.zastena = hodnota && hodnota !== 'zadna' ? { dekor: hodnota, barva: DEKORY[hodnota]?.barva || BILA } : null; return; }
                    if (['sokl', 'drez', 'spotrebice'].includes(b)) { p[b] = hodnota; return; }
                    if (b === 'uchytky') { p.uchytky = { ...(p.uchytky || POVRCHY_KUCHYN.uchytky), [c]: hodnota }; return; }
                    const povrch = p[b] || (b === 'celaHorni' ? klon(p.cela) : klon(POVRCHY_KUCHYN[b] || POVRCHY_SKRIN[b] || { dekor: 'hladky', barva: BILA }));
                    if (c === 'dekor') { if (!DEKORY[hodnota]) return false; povrch.dekor = hodnota; povrch.barva = DEKORY[hodnota].barva; }
                    else if (c === 'barva') { if (!jeHex(hodnota)) return false; povrch.barva = hodnota.toLowerCase(); }
                    else if (c === 'lesk') povrch.lesk = !!hodnota;
                    p[b] = povrch;
                    return;
                }
                // Skříň
                // Druh dveří nebo počet dílů rozdělí skříň znovu rovným dílem (vlastní šířky dílů se zahodí)
                if (a === 'dvere') { s.dvere = VOLBY.dvere.includes(hodnota) ? hodnota : 'posuvne'; s.pocet = null; delete s.dily; this.sestavaDvere = null; return; }
                if (a === 'pocet') { const x = cislo(hodnota); s.pocet = Number.isFinite(x) && x > 0 ? Math.round(x) : null; delete s.dily; return; }
                if (a === 'ram') { s.ram = hodnota; return; }
                if (a === 'vyska') { if (hodnota === null || hodnota === '' || hodnota === true) { s.vyska = null; return; } const x = cm(60, 350); if (x === null) return false; s.vyska = x; return; }
                if (a === 'hloubka') { const x = cm(30, 90); if (x === null) return false; s.hloubka = x; return; }
                return false;
            });
        },

        /**
         * Posune volný konec ramene o `delta` (m). Prodloužit jde jen po volném úseku líce, když se nevejde, vrací
         * { ok: false, volno } se zbývajícím místem. Prostřední rameno U volný konec nemá.
         */
        _sestavaZmenDelkuRamene(s, ri, delta) {
            const ramena = ramenaSestavy(s), r = ramena[ri];
            const kde = volnyKonecRamene(s, ri);
            if (!r || !kde) return { ok: false, volno: 0 };
            if (Math.abs(delta) < 0.0005) return { ok: true };
            const novaL = r.L + delta;
            if (delta > 0) {
                const mez = this._sestavaMezKonce(s, kde === 'zacatek' ? 0 : 1, ramena);
                if (mez !== null && novaL > mez + 0.0005) return { ok: false, volno: Math.max(0, zaokr(mez - r.L)) };
            }
            const q = kde === 'zacatek' ? V.sub(r.b, V.mul(r.d, novaL)) : V.add(r.a, V.mul(r.d, novaL));
            s.body[kde === 'zacatek' ? 0 : s.body.length - 1] = [zaokr(q.x, 10000), zaokr(-q.y, 10000)];
            return { ok: true };
        },

        /** Nová šířka dílu na rameni s volným koncem: rameno se posune; když se díl nevejde, bude co nejširší a hláška
         *  řekne, kolik místa zbylo. Vrací platnou šířku, nebo null (nic se nemění). */
        _sestavaZmenaSirky(s, ri, stara, nova) {
            if (!volnyKonecRamene(s, ri)) return nova;
            let vysledek = this._sestavaZmenDelkuRamene(s, ri, nova - stara);
            if (vysledek.ok) return nova;
            this._dumHlaska?.(preloz('ed_sablona.sestava.nevejde', { cm: Math.round(vysledek.volno * 100) }));
            const lze = zaokr(stara + vysledek.volno);
            if (lze - stara < 0.005) return null;
            vysledek = this._sestavaZmenDelkuRamene(s, ri, lze - stara);
            return vysledek.ok ? lze : null;
        },

        _sestavaVybranySloupec(s) {
            if (!s || s.druh !== 'kuchyn' || !this.sestavaSloupecKlic) return null;
            const [ri, i] = this.sestavaSloupecKlic.split(':').map(Number);
            return s.ramena?.[ri]?.sloupce?.[i] ? { ri, i, sl: s.ramena[ri].sloupce[i] } : null;
        },

        /** Hodnota vybraného sloupce ('sirka' v cm, 'skladba', 'spodni.celo'…). */
        setSloupec(cesta, hodnota) {
            this._sestavaUprav((s) => {
                const v = this._sestavaVybranySloupec(s);
                if (!v) return false;
                const sl = v.sl;
                const [a, b] = cesta.split('.');
                if (a === 'sirka') {
                    const x = cislo(hodnota);
                    if (!Number.isFinite(x)) return false;
                    const nova = zaokr(omez(x, MIN_SL * 100, MAX_SL * 100) / 100);
                    // Šířka platí přesně a ostatní skříňky zůstávají (Libor 11. 11. 2026: „mělo by být možné měnit každou
                    // šířku dílu samostatně“). Rameno s volným koncem se o rozdíl zkrátí nebo prodlouží; prostřední rameno U
                    // mezi dvěma rohy délku změnit nemůže, tam se dál dorovnává.
                    const sirka = this._sestavaZmenaSirky(s, v.ri, sl.sirka, nova);
                    if (sirka === null) return false;
                    sl.sirka = sirka;
                    sl.upraveno = true;
                    if (sl.skladba === 'lista' && sl.sirka >= LISTA_DO) { Object.assign(sl, novySloupec(sl.sirka)); sl.upraveno = true; }
                    if (!volnyKonecRamene(s, v.ri)) dorovnej(s);
                    return;
                }
                if (a === 'skladba') {
                    if (!VOLBY.skladba.includes(hodnota)) return false;
                    if (sl.skladba === 'lista') Object.assign(sl, novySloupec(sl.sirka), { upraveno: true });
                    sl.skladba = hodnota;
                    if (!sl.spodni) sl.spodni = { celo: 'dvirka', pocet: 1 };
                    if (!sl.horni) sl.horni = { celo: 'dvirka', pocet: 1 };
                    if (hodnota === 'vysoka' && !sl.vysoka) sl.vysoka = { celo: 'dvirka', pocet: 2 };
                    if (hodnota === 'volne' && !sl.volne) sl.volne = { spotrebic: 'lednice', horni: false };
                    return;
                }
                const cast = sl[a] || (sl[a] = {});
                if (b === 'pocet') { const x = Math.round(cislo(hodnota)); if (!Number.isFinite(x)) return false; cast.pocet = x; return; }
                if (b === 'vyska') { const x = cislo(hodnota); cast.vyska = Number.isFinite(x) && x > 0 ? zaokr(omez(x, 20, 140) / 100) : null; return; }
                if (['presOkno', 'dvoje', 'horni'].includes(b)) { cast[b] = !!hodnota; return; }
                cast[b] = hodnota;
                // Počet čel podle nové volby: šuplíky aspoň 2, ostatní 1 nebo 2
                if (b === 'celo') {
                    const pocty = POCTY[hodnota];
                    if (pocty && !pocty.includes(cast.pocet)) cast.pocet = hodnota === 'zasuvky' ? 3 : (sl.sirka >= 0.7 ? 2 : 1);
                    if (a === 'vysoka' && hodnota === 'dvirka' && !POCTY.vysoka.includes(cast.pocet)) cast.pocet = 2;
                }
                if (b === 'vDesce') {
                    if (hodnota === 'drez' && !cast.drez) cast.drez = 'jednodrez';
                    if (hodnota === 'varna' && !cast.varna) cast.varna = 'indukce';
                }
            });
        },

        sestavaVyberSloupec(klic) {
            this.sestavaSloupecKlic = klic || null;
            this._renderDum();
            this._selectionTick++;
        },

        sestavaPosunSloupec(smer) {
            const s = this._vybranaSestava(), v = this._sestavaVybranySloupec(s);
            if (!v) return;
            const n = s.ramena[v.ri].sloupce.length;
            let kam;
            if (smer < 0) kam = v.i > 0 ? { ri: v.ri, i: v.i - 1 } : (v.ri > 0 ? { ri: v.ri - 1, i: s.ramena[v.ri - 1].sloupce.length } : null);
            else kam = v.i < n - 1 ? { ri: v.ri, i: v.i + 2 } : (v.ri < s.ramena.length - 1 ? { ri: v.ri + 1, i: 0 } : null);
            if (!kam) return;
            this._sestavaUprav((x) => {
                const novy = this._sestavaPresun(x, { ri: v.ri, i: v.i }, kam);
                if (!novy) return false;
                this.sestavaSloupecKlic = novy;
            }, 'ed_dum.krok.presun_skrinky');
        },

        sestavaRozdelSloupec() {
            this._sestavaUprav((s) => {
                const v = this._sestavaVybranySloupec(s);
                if (!v || v.sl.sirka < 2 * MIN_SL) return false;
                const pul = zaokr(v.sl.sirka / 2);
                const druhy = novySloupec(zaokr(v.sl.sirka - pul), v.sl.skladba === 'lista' ? 'spodni_horni' : v.sl.skladba);
                v.sl.sirka = pul;
                if (v.sl.spodni?.pocet > 1) v.sl.spodni.pocet = pul >= 0.7 ? 2 : 1;
                if (v.sl.horni?.pocet > 1) v.sl.horni.pocet = pul >= 0.7 ? 2 : 1;
                s.ramena[v.ri].sloupce.splice(v.i + 1, 0, druhy);
            });
        },

        /** Odebraná skříňka: ostatní zůstanou a rameno s volným koncem se o její šířku zkrátí (místo zbude volné). */
        sestavaOdeberSloupec() {
            // Potvrzení jako u každého mazání; poslední skříňku ramene odebrat nejde (zmizelo by rameno)
            const s0 = this._vybranaSestava(), v0 = this._sestavaVybranySloupec(s0);
            if (!v0 || (volnyKonecRamene(s0, v0.ri) && s0.ramena[v0.ri].sloupce.length < 2)) return;
            const rv = this._sestavaRozvrh(s0), c0 = rv.sloupce.find(x => x.klic === this.sestavaSloupecKlic);
            const nazev = v0.sl.skladba === 'lista' ? preloz('ed_sablona.sestava.lista') : preloz('ed_sablona.sestava.skrinka', { cislo: rv.sloupce.indexOf(c0) + 1 });
            if (!this.potvrditSmazani?.(s0.id + ' · ' + nazev)) return;
            this._sestavaUprav((s) => {
                const v = this._sestavaVybranySloupec(s);
                if (!v) return false;
                const sloupce = s.ramena[v.ri].sloupce;
                if (volnyKonecRamene(s, v.ri)) {
                    if (sloupce.length < 2) return false;   // poslední skříňka ramene: odebrat jde rameno nebo celá sestava
                    sloupce.splice(v.i, 1);
                    this._sestavaZmenDelkuRamene(s, v.ri, -v.sl.sirka);
                } else {
                    sloupce.splice(v.i, 1);
                    dorovnej(s);
                }
                this.sestavaSloupecKlic = null;
            });
        },

        /** Nová skříňka za vybranou (bez výběru na konec): 60 cm, když se vejde, jinak co zbývá; ostatní zůstanou. */
        sestavaPridejSloupec() {
            this._sestavaUprav((s) => {
                const v = this._sestavaVybranySloupec(s);
                const posledni = Math.max(0, (s.ramena?.length || 1) - 1);
                const ri = v ? v.ri : posledni, i = v ? v.i + 1 : (s.ramena?.[ri]?.sloupce?.length || 0);
                if (!s.ramena?.[ri]) return false;
                let sirka = KROK_SL;
                if (volnyKonecRamene(s, ri)) {
                    let vysledek = this._sestavaZmenDelkuRamene(s, ri, sirka);
                    if (!vysledek.ok) {
                        if (vysledek.volno < MIN_SL) { this._dumHlaska?.(preloz('ed_sablona.sestava.neni_misto')); return false; }
                        sirka = vysledek.volno;
                        vysledek = this._sestavaZmenDelkuRamene(s, ri, sirka);
                        if (!vysledek.ok) return false;
                    }
                }
                const novy = novySloupec(sirka);
                novy.upraveno = true;
                s.ramena[ri].sloupce.splice(i, 0, novy);
                if (!volnyKonecRamene(s, ri)) dorovnej(s);
                const idx = s.ramena[ri].sloupce.indexOf(novy);
                this.sestavaSloupecKlic = idx >= 0 ? ri + ':' + idx : null;
            });
        },

        sestavaVybavZnovu() {
            this._sestavaUprav((s) => {
                if (s.druh !== 'kuchyn') return false;
                s.ramena = vybavKuchyn(s, this._sestavaKontext(s));
                this.sestavaSloupecKlic = null;
            });
        },

        /**
         * Rameno za rohem na volném konci kuchyně, vlevo nebo vpravo: z rovné vznikne L, z L tvar U (Libor 11. 11. 2026:
         * „mám kuchyň do U“). Nejvýš tři ramena. Rameno vede do první překážky na boční stěně, nejvýš 3,6 m.
         */
        _sestavaMoznaRamena(s) {
            if (!s || s.druh !== 'kuchyn' || (s.body || []).length < 2 || s.body.length >= 4) return {};
            const PX = this.engine.PX_PER_M;
            const ramena = ramenaSestavy(s), prvni = ramena[0], posledni = ramena[ramena.length - 1];
            const naPx = (q) => ({ x: q.x * PX, y: q.y * PX });
            const out = {};
            for (const [kde, r, smer] of [['vpravo', posledni, posledni.d], ['vlevo', prvni, V.mul(prvni.d, -1)]]) {
                const u = this._sestavaLiceUKurzoru(naPx(bodRamene(r, kde === 'vpravo' ? r.L - 0.1 : 0.1, 0.05)));
                if (!u) continue;
                // Roh hledat na konci volného úseku: linka zkrácená skříňkami z nabídky do rohu nedosahuje, rameno ji tam dotáhne
                const usek = this._sestavaVolnyUsek(u.lice, u.t, s.id, hloubkaSestavy(s));
                if (!usek) continue;
                const a = V.add(u.lice.p, V.mul(u.lice.d, usek.t0)), b = V.add(u.lice.p, V.mul(u.lice.d, usek.t1));
                const kraj = V.dot(V.sub(b, a), smer) > 0 ? b : a;
                const zaRohem = this._sestavaLiceZaRohem(u.lice, kraj, smer);
                if (!zaRohem) continue;
                const volno = this._sestavaUsekZaRohem(zaRohem, u.lice.m, s.id);
                if (!volno || volno / PX < 0.9 + 0.3) continue;
                // Rameno, na které se přidává, musí unést i nový roh (délka až do rohu)
                const rohuNaRameni = (ramena.length > 1 ? 1 : 0) + 1;
                const pevny = kde === 'vpravo' ? r.a : r.b;
                const delkaDoRohu = V.len(V.sub({ x: zaRohem.roh.x / PX, y: zaRohem.roh.y / PX }, pevny));
                if (delkaDoRohu < rohuNaRameni * 0.9 + 0.3) continue;
                out[kde] = { roh: zaRohem.roh, delka: Math.min(volno / PX, 3.6), m: u.lice.m };
            }
            return out;
        },

        sestavaPridejRameno(kde) {
            this._sestavaUprav((s) => {
                const moznost = this._sestavaMoznaRamena(s)[kde];
                if (!moznost) return false;
                const PX = this.engine.PX_PER_M;
                const roh = { x: moznost.roh.x / PX, y: moznost.roh.y / PX };
                const konec = V.add(roh, V.mul(moznost.m, moznost.delka));
                const naBod = (q) => [zaokr(q.x, 10000), zaokr(-q.y, 10000)];
                const ramena = (s.ramena || []).map(r => r || { sloupce: [] });
                const rohy = Array.from({ length: Math.max(0, s.body.length - 2) }, (_, k) => ({ ...ROH, ...((s.rohy || [])[k] || {}) }));
                if (kde === 'vpravo') {
                    s.body = [...s.body.slice(0, -1), naBod(roh), naBod(konec)];
                    s.ramena = [...ramena, { sloupce: [] }];
                    s.rohy = [...rohy, { ...ROH }];
                } else {
                    s.body = [naBod(konec), naBod(roh), ...s.body.slice(1)];
                    s.ramena = [{ sloupce: [] }, ...ramena];
                    s.rohy = [{ ...ROH }, ...rohy];
                }
                dorovnej(s);
                this.sestavaSloupecKlic = null;
            });
        },

        /** Odebere krajní rameno vlevo nebo vpravo (z U zbude L, z L rovná linka). */
        sestavaOdeberRameno(kde) {
            const s0 = this._vybranaSestava();
            if (!s0 || (s0.body || []).length < 3) return;
            if (!this.potvrditSmazani?.(s0.id + ' · ' + preloz('ed_sablona.sestava.rameno_' + (kde === 'vlevo' ? 'vlevo' : 'vpravo') + '_nazev'))) return;
            this._sestavaUprav((s) => {
                if ((s.body || []).length < 3) return false;
                const rohy = Array.from({ length: s.body.length - 2 }, (_, k) => ({ ...ROH, ...((s.rohy || [])[k] || {}) }));
                if (kde === 'vlevo') {
                    s.body = s.body.slice(1);
                    s.ramena = (s.ramena || []).slice(1);
                    s.rohy = rohy.slice(1);
                } else {
                    s.body = s.body.slice(0, -1);
                    s.ramena = (s.ramena || []).slice(0, -1);
                    s.rohy = rohy.slice(0, -1);
                }
                dorovnej(s);
                this.sestavaSloupecKlic = null;
            });
        },

        /** Přitáhne rovnou sestavu zpět k nejbližšímu souběžnému líci (po posunu stěny). */
        sestavaPritahni() {
            this._sestavaUprav((s) => {
                if ((s.body || []).length !== 2) return false;
                const PX = this.engine.PX_PER_M, r = ramenaSestavy(s)[0];
                const { lica } = this._sestavaLica();
                const stred = bodRamene(r, r.L / 2, 0);
                let nej = null;
                for (const l of lica) {
                    if (Math.abs(V.cross(l.d, r.d)) > 0.02 || V.dot(l.m, r.n) < 0.98) continue;
                    const posun = V.dot(V.sub({ x: l.p.x / PX, y: l.p.y / PX }, stred), l.m);
                    if (Math.abs(posun) > 0.6) continue;
                    if (!nej || Math.abs(posun) < Math.abs(nej)) nej = posun;
                }
                if (nej === null) return false;
                s.body = s.body.map(b => { const q = V.add({ x: b[0], y: -b[1] }, V.mul(r.n, nej)); return [zaokr(q.x, 10000), zaokr(-q.y, 10000)]; });
            });
        },

        sestavaVyberDvere(i) {
            this.sestavaDvere = this.sestavaDvere === i ? null : i;
            this._renderDum();
            this._selectionTick++;
        },

        /** Povrch vybraných dveří skříně: null = jako ostatní, jinak zrcadlo daného odstínu. */
        setDvereSkrine(zrcadlo) {
            this._sestavaUprav((s) => {
                if (s.druh !== 'skrin' || this.sestavaDvere === null) return false;
                s.zrcadla = [...(s.zrcadla || [])];
                while (s.zrcadla.length <= this.sestavaDvere) s.zrcadla.push(null);
                s.zrcadla[this.sestavaDvere] = zrcadlo && ZRCADLA[zrcadlo] ? zrcadlo : null;
                while (s.zrcadla.length && !s.zrcadla[s.zrcadla.length - 1]) s.zrcadla.pop();
            });
        },

        /** Šířka vybraných dveří skříně (cm): ostatní dveře zůstanou a skříň se o rozdíl zkrátí nebo prodlouží. */
        setDilSkrine(hodnota) {
            this._sestavaUprav((s) => {
                const i = this.sestavaDvere;
                if (s.druh !== 'skrin' || i === null) return false;
                const x = cislo(hodnota);
                if (!Number.isFinite(x)) return false;
                const r = ramenaSestavy(s)[0];
                if (!r) return false;
                const sirky = dilySkrine(s, r.L).sirky.map(w => zaokr(w));
                if (sirky[i] === undefined) return false;
                const sirka = this._sestavaZmenaSirky(s, 0, sirky[i], zaokr(omez(x, 20, 150) / 100));
                if (sirka === null) return false;
                sirky[i] = sirka;
                s.dily = sirky;
                s.pocet = null;
            });
        },

        // ─── Nákres v panelu: klik a tah ────────────────────
        _sestavaNakresBod(ev) {
            const svg = ev.currentTarget.querySelector('svg');
            if (!svg) return null;
            const r = svg.getBoundingClientRect();
            return { x: (ev.clientX - r.left) / (r.width || 1) * NAKRES_SIRKA };
        },

        sestavaNakresStisk(ev) {
            const s = this._vybranaSestava();
            const b = this._sestavaNakresBod(ev);
            if (!s || !b) return;
            const mapa = this._sestavaNakresMapa || [];
            const zasah = mapa.find(m => b.x >= m.x0 && b.x <= m.x1);
            if (s.druh === 'skrin') { if (zasah && zasah.dvere !== undefined) this.sestavaVyberDvere(zasah.dvere); return; }
            if (!zasah) { this.sestavaVyberSloupec(null); return; }
            this.sestavaVyberSloupec(zasah.klic);
            try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) { /* bez zachycení tah skončí na okraji */ }
            this._sestavaNakresTah = { klic: zasah.klic, x0: b.x, cil: null };
        },

        sestavaNakresPohyb(ev) {
            const t = this._sestavaNakresTah;
            if (!t) return;
            const b = this._sestavaNakresBod(ev);
            if (!b || Math.abs(b.x - t.x0) < 4) { t.cil = null; return; }
            const mapa = (this._sestavaNakresMapa || []).filter(m => m.klic);
            let nej = null;
            for (const m of mapa) {
                for (const [x, i] of [[m.x0, m.i], [m.x1, m.i + 1]]) {
                    const vzd = Math.abs(b.x - x);
                    if (!nej || vzd < nej.vzd) nej = { vzd, x, ri: m.ri, i };
                }
            }
            t.cil = nej;
            this._selectionTick++;
        },

        sestavaNakresPusteni() {
            const t = this._sestavaNakresTah;
            this._sestavaNakresTah = null;
            if (!t || !t.cil) { this._selectionTick++; return; }
            const [ri, i] = t.klic.split(':').map(Number);
            this._sestavaUprav((s) => {
                const novy = this._sestavaPresun(s, { ri, i }, { ri: t.cil.ri, i: t.cil.i });
                if (!novy) return false;
                this.sestavaSloupecKlic = novy;
            }, 'ed_dum.krok.presun_skrinky');
        },

        // ─── Panel (inspektor) ──────────────────────────────
        inspektorSestavy() {
            const s = this._vybranaSestava();
            if (!s) return null;
            const ctx = this._sestavaKontext(s);
            const rv = rozvrh(s, ctx);
            const css = getComputedStyle(document.documentElement);
            const volno = this._sestavaVolno(s, rv);
            const n = nakres(s, rv, ctx, {
                vybrany: this.sestavaSloupecKlic, dvere: this.sestavaDvere,
                tah: this._sestavaNakresTah?.cil ? { x: this._sestavaNakresTah.cil.x } : null,
                primary: css.getPropertyValue('--c-primary').trim() || '#e8590c',
                volno,
            });
            this._sestavaNakresMapa = n.mapa;
            const delka = rv.ramena.reduce((a, r) => a + r.L, 0);
            const varovani = rv.varovani.map(k => preloz('ed_sablona.sestava.varovani.' + k));
            if (s.druh === 'kuchyn' && !this._sestavaUSteny(s)) varovani.push(preloz('ed_sablona.sestava.varovani.stena'));
            const zaklad = {
                kind: 'sestava', count: 1, id: s.id, druh: s.druh, nazev: preloz('ed_dum.sestava.' + s.druh),
                delka: prelozCislo(delka, 2) + ' m', tvar: rv.ramena.length > 2 ? 'U' : rv.ramena.length > 1 ? 'L' : 'rovna',
                nakres: n.svg, varovani, odSteny: varovani.includes(preloz('ed_sablona.sestava.varovani.stena')),
                volno: volno.map(v => ({ kde: v.kde, cm: Math.round(v.m * 100) })),
            };
            const p = (k) => { const x = povrchSestavy(s, k); return x && typeof x === 'object' ? { dekor: x.dekor, barva: x.barva, lesk: !!x.lesk } : x; };
            if (s.druh === 'skrin') {
                const d = rv.dvere.find(x => x.i === this.sestavaDvere);
                return {
                    ...zaklad, dvereDruh: rv.druhDveri, pocet: Array.isArray(s.dily) && s.dily.length ? s.dily.length : (s.pocet || null), pocetAuto: rv.pocetAuto, pocetDveri: rv.dvere.length, ram: s.ram || 'stribrna',
                    keStropu: !s.vyska, vyskaCm: Math.round(rv.H * 100), hloubkaCm: Math.round(rv.hl * 100),
                    dvereVybrane: d ? { i: d.i, cislo: d.i + 1, zrcadlo: d.zrcadlo || '', sirkaCm: Math.round((d.dil[1] - d.dil[0]) * 100) } : null,
                    pocetVolby: rv.druhDveri === 'posuvne' ? [2, 3, 4, 5, 6] : Array.from({ length: 12 }, (_, i) => i + 1),
                    povrchy: { dvere: p('dvere'), korpus: p('korpus'), uchytky: { ...POVRCHY_SKRIN.uchytky, ...(s.povrchy?.uchytky || {}) } },
                };
            }
            const v = rv.vys, h = hodnotyKuchyne(s).h;
            const c = rv.sloupce.find(x => x.klic === this.sestavaSloupecKlic);
            let sloupec = null;
            if (c) {
                const sl = c.sl;
                const poradi = rv.sloupce.indexOf(c);
                sloupec = {
                    klic: c.klic, cislo: poradi + 1, sirkaCm: Math.round(sl.sirka * 100), skladba: sl.skladba, lista: sl.skladba === 'lista',
                    spodni: { celo: 'dvirka', pocet: 1, vDesce: 'nic', drez: 'jednodrez', varna: 'indukce', mycka: 'vestavna', ...(sl.spodni || {}) },
                    horni: { celo: 'dvirka', pocet: 1, presOkno: false, ...(sl.horni || {}), vyskaCm: sl.horni?.vyska ? Math.round(sl.horni.vyska * 100) : '' },
                    vysoka: { celo: 'dvirka', pocet: 2, dvoje: false, ...(sl.vysoka || {}) },
                    volne: { spotrebic: 'lednice', horni: false, ...(sl.volne || {}) },
                    podOknem: c.podOknem, muzeVlevo: poradi > 0, muzeVpravo: poradi < rv.sloupce.length - 1,
                    varovani: c.varovani.map(k => preloz('ed_sablona.sestava.varovani.' + k)),
                };
                if (sloupec.spodni.vDesce == null) sloupec.spodni.vDesce = 'nic';
            }
            const ramena = this._sestavaMoznaRamena(s);
            return {
                ...zaklad, sloupec, pocetSloupcu: rv.sloupce.length,
                vysky: { deskaCm: Math.round(v.deska * 100), soklCm: Math.round(v.sokl * 100), horniCm: Math.round((hodnotyKuchyne(s).v.horni) * 100), mezeraCm: Math.round((v.horniOd - v.deska) * 100), keStropu: !!hodnotyKuchyne(s).v.keStropu },
                hloubky: { spodniCm: Math.round(h.spodni * 100), horniCm: Math.round(h.horni * 100) },
                rohy: rv.rohy.map(r => ({ i: r.i, cislo: r.i + 1, spodni: r.spodni, horni: r.horni })),
                ramenoVlevo: !!ramena.vlevo, ramenoVpravo: !!ramena.vpravo, odebratRameno: rv.ramena.length > 1,
                povrchy: {
                    cela: p('cela'), celaHorniJinak: !!s.povrchy?.celaHorni, celaHorni: p('celaHorni'), korpus: p('korpus'), deska: p('deska'),
                    sokl: povrchSestavy(s, 'sokl'), uchytky: { ...POVRCHY_KUCHYN.uchytky, ...(s.povrchy?.uchytky || {}) },
                    zastena: s.povrchy?.zastena ? { dekor: s.povrchy.zastena.dekor, barva: s.povrchy.zastena.barva } : null,
                    drez: povrchSestavy(s, 'drez'), spotrebice: povrchSestavy(s, 'spotrebice'),
                },
            };
        },

        /** Volné místo u volných konců sestavy (m): kolik ještě zbývá po stěně do první překážky (roh, dveře, jiná sestava). */
        _sestavaVolno(s, rv) {
            if (s.podlazi !== this.engine.dum.aktivni) return [];
            const ramena = rv.ramena, out = [];
            for (const [kde, konec, ri] of [['zacatek', 0, 0], ['konec', 1, ramena.length - 1]]) {
                const r = ramena[ri];
                if (!r) continue;
                const mez = this._sestavaMezKonce(s, konec, ramena);
                if (mez !== null && mez - r.L > 0.005) out.push({ kde, ri, m: zaokr(mez - r.L) });
            }
            return out;
        },

        /** Stojí rovná kuchyně u stěny? Záda ramene do 4 cm od souběžného líce. */
        _sestavaUSteny(s) {
            if (s.podlazi !== this.engine.dum.aktivni) return true;
            const PX = this.engine.PX_PER_M, { lica } = this._sestavaLica();
            return ramenaSestavy(s).every(r => {
                const stred = bodRamene(r, r.L / 2, 0);
                return lica.some(l => {
                    if (Math.abs(V.cross(l.d, r.d)) > 0.02 || V.dot(l.m, r.n) < 0.98) return false;
                    const p = { x: l.p.x / PX, y: l.p.y / PX };
                    const t = V.dot(V.sub(stred, p), l.d);
                    return t >= -0.05 && t <= l.L / PX + 0.05 && Math.abs(V.dot(V.sub(stred, p), l.m)) < 0.04;
                });
            });
        },

        /** Barvy sestav do „Jinde použité“. */
        _barvySestav(pridej) {
            for (const s of this.engine?.dum.sestavy || []) {
                const nazev = preloz('ed_dum.sestava.' + s.druh) + ' ' + s.id;
                const klice = s.druh === 'skrin' ? ['dvere', 'korpus'] : ['cela', 'celaHorni', 'korpus', 'deska'];
                for (const k of klice) {
                    const p = s.povrchy?.[k];
                    if (p?.barva) pridej('sestava:' + s.id + ':' + k, p.barva, preloz('ed_dum.barvy.sestava', { nazev, povrch: preloz('ed_sablona.sestava.povrch.' + k).toLowerCase() }));
                }
            }
        },

        // ─── 2D ─────────────────────────────────────────────
        _renderSestavy(r, popisek, primary) {
            const e = this.engine, aktivni = e.dum.aktivni;
            if (r.showVybaveni !== false) {
                for (const s of e.dum.sestavy || []) {
                    if (s.podlazi !== aktivni || this.jeObjektSkryty({ type: 'sestava', id: s.id })) continue;
                    try {
                        this._kresliSestavu2d(r, s, r.selectedSestavy?.has(s.id), primary, popisek);
                    } catch (chyba) {
                        window.zalogujChybu?.(chyba, 'Sestava: kresba v půdorysu', { id: s.id });
                    }
                }
            }
            if ((this.nastroj === 'sestava' || this._domTah?.typ === 'sestavaNova') && this._sestavaNahled?.body) {
                const s = { druh: this.sestavaDruh, body: this._sestavaNahled.body, strana: 1, hloubky: HLOUBKY, hloubka: 0.62 };
                const PX = e.PX_PER_M;
                for (const poly of obrysySestavy(s)) {
                    r.schodyLayer.add(new Konva.Line({
                        points: poly.flatMap(q => [q.x * PX, q.y * PX]), closed: true, fill: 'rgba(232,89,12,0.08)',
                        stroke: primary, strokeWidth: 1.5, strokeScaleEnabled: false, dash: [6, 4], listening: false,
                    }));
                }
            }
        },

        _kresliSestavu2d(r, s, vybrana, primary, popisek) {
            const PX = this.engine.PX_PER_M, sc = this.stage.scaleX() || 1;
            const rv = this._sestavaRozvrh(s);
            const P = (ri, t, h) => { const q = bodRamene(rv.ramena[ri], t, h); return { x: q.x * PX, y: q.y * PX }; };
            const obd = (ri, t0, t1, h0, h1) => [P(ri, t0, h0), P(ri, t1, h0), P(ri, t1, h1), P(ri, t0, h1)];
            const body = (poly) => poly.flatMap(p => [p.x, p.y]);
            const css = getComputedStyle(document.documentElement);
            const chyba = css.getPropertyValue('--c-warning').trim() || '#f59e0b';
            const tmava = vybrana ? primary : '#374151';
            const L = r.schodyLayer;
            const pridej = (tvar, sloupec) => {
                tvar.setAttr('_sestavaId', s.id);
                if (sloupec) tvar.setAttr('_sestavaSloupec', sloupec);
                L.add(tvar);
            };
            const cara = (pts, styl = {}) => L.add(new Konva.Line({ points: body(pts), stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false, ...styl }));
            const kruh = (p, rad, styl = {}) => L.add(new Konva.Circle({ x: p.x, y: p.y, radius: rad, stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false, ...styl }));
            const mixne = (hex, a) => { const [x, y, z] = hexNaRgb(hex); return `rgba(${x},${y},${z},${a})`; };
            if (s.druh === 'skrin') {
                const ra = rv.ramena[0];
                if (!ra) return;
                const poly = obd(0, 0, ra.L, 0, rv.hl);
                pridej(new Konva.Line({ points: body(poly), closed: true, fill: mixne(povrchSestavy(s, 'dvere').barva, 0.45), stroke: tmava, strokeWidth: vybrana ? 2.5 : 1.5, strokeScaleEnabled: false }));
                cara([poly[0], poly[2]]);
                if (rv.druhDveri === 'posuvne') {
                    for (const d of rv.dvere) cara([P(0, d.t0, rv.hl - 0.02 - d.vrstva * 0.025), P(0, d.t1, rv.hl - 0.02 - d.vrstva * 0.025)], { strokeWidth: 1.6, stroke: d.zrcadlo ? '#60a5fa' : '#374151' });
                } else if (rv.druhDveri === 'otocne') {
                    for (const d of rv.dvere) {
                        cara([P(0, d.t0, rv.hl), P(0, d.t1, rv.hl)], { strokeWidth: 1.4, stroke: d.zrcadlo ? '#60a5fa' : '#374151' });
                        const zav = d.i % 2 ? d.t0 : d.t1, w = d.t1 - d.t0;
                        const a = P(0, zav, rv.hl), b = P(0, d.i % 2 ? d.t1 : d.t0, rv.hl), c = P(0, zav, rv.hl + w);
                        L.add(new Konva.Shape({
                            listening: false, stroke: '#9ca3af', strokeWidth: 0.7, strokeScaleEnabled: false, dash: [3, 3],
                            sceneFunc: (k, tvar) => { k.beginPath(); k.moveTo(b.x, b.y); k.quadraticCurveTo(b.x + (c.x - a.x), b.y + (c.y - a.y), c.x, c.y); k.strokeShape(tvar); },
                        }));
                    }
                }
                if (rv.varovani.length && !this._kresbaProExport) L.add(new Konva.Line({ points: body(poly), closed: true, stroke: chyba, strokeWidth: 1.5, strokeScaleEnabled: false, dash: [5, 4], listening: false }));
                if (vybrana && !this._kresbaProExport) this._sestavaUchyty2d(L, s, rv, P, primary, sc);
                this._sestavaZnacka2d(r, s, rv, P, popisek);
                return;
            }
            const D = rv.D, Dh = rv.Dh;
            const celaBarva = povrchSestavy(s, 'cela').barva;
            for (const c of rv.sloupce) {
                const sl = c.sl, w = c.t1 - c.t0, tm = (c.t0 + c.t1) / 2;
                const hloubka = c.typ === 'volne' ? (sl.volne?.spotrebic === 'americka' ? 0.72 : (sl.volne?.spotrebic === 'lednice' ? 0.66 : D)) : D;
                const poly = obd(c.ri, c.t0, c.t1, 0, hloubka);
                const vyber = vybrana && this.sestavaSloupecKlic === c.klic;
                const fill = c.typ === 'volne' && sl.volne?.spotrebic === 'mezera' ? 'rgba(0,0,0,0.001)' : mixne(c.typ === 'volne' ? (SPOTREBICE[povrchSestavy(s, 'spotrebice')] || SPOTREBICE.nerez).barva : celaBarva, 0.5);
                pridej(new Konva.Line({
                    points: body(poly), closed: true, fill, stroke: vyber ? primary : '#4b5563', strokeWidth: vyber ? 2.5 : 0.9, strokeScaleEnabled: false,
                    ...(c.typ === 'volne' && sl.volne?.spotrebic === 'mezera' ? { dash: [4, 3] } : {}),
                }), c.klic);
                if (c.varovani.length && !this._kresbaProExport) L.add(new Konva.Line({ points: body(obd(c.ri, c.t0 + 0.02, c.t1 - 0.02, 0.02, hloubka - 0.02)), closed: true, stroke: chyba, strokeWidth: 1.2, strokeScaleEnabled: false, dash: [4, 3], listening: false }));
                // Horní skříňky čárkovaně (nad rovinou řezu), vysoká s úhlopříčkou
                if (c.horniEf && sl.horni?.celo !== 'komin') cara([...obd(c.ri, c.t0 + 0.01, c.t1 - 0.01, 0, Dh), P(c.ri, c.t0 + 0.01, 0)], { dash: [5, 4], stroke: '#6b7280' });
                if (c.typ === 'vysoka') cara([P(c.ri, c.t0, 0), P(c.ri, c.t1, hloubka)]);
                // Spotřebiče
                const sp = sl.spodni || {};
                if (maSpodni(c.typ) && sp.vDesce === 'drez') {
                    const druh = sp.drez || 'jednodrez';
                    const misky = druh === 'dvojdrez' ? [[0.08, 0.48], [0.52, 0.92]] : druh === 'odkap' ? [[0.08, 0.55]] : [[0.12, 0.88]];
                    for (const [a, b] of misky) {
                        const m = obd(c.ri, c.t0 + w * a, c.t0 + w * b, 0.12, D - 0.1);
                        L.add(new Konva.Line({ points: body(m), closed: true, stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false, tension: 0 }));
                        kruh(P(c.ri, c.t0 + w * (a + b) / 2, D * 0.6), 0.025 * PX);
                    }
                    if (druh === 'odkap') for (let i = 0; i < 4; i++) { const t = c.t0 + w * (0.62 + i * 0.08); cara([P(c.ri, t, 0.15), P(c.ri, t, D - 0.13)], { stroke: '#9ca3af' }); }
                    cara([P(c.ri, tm, 0.03), P(c.ri, tm, 0.11)], { strokeWidth: 1.6 });
                } else if (maSpodni(c.typ) && sp.vDesce === 'varna') {
                    const plyn = sp.varna === 'plyn';
                    for (const [a, b, rr] of [[0.3, 0.32, 0.16], [0.7, 0.32, 0.12], [0.3, 0.7, 0.12], [0.7, 0.7, 0.16]]) {
                        const q = P(c.ri, c.t0 + w * a, D * b), rad = Math.min(w, D) * rr * PX;
                        kruh(q, rad);
                        if (plyn) { cara([{ x: q.x - rad, y: q.y }, { x: q.x + rad, y: q.y }]); cara([{ x: q.x, y: q.y - rad }, { x: q.x, y: q.y + rad }]); }
                    }
                }
                if (maSpodni(c.typ) && sp.celo === 'mycka') {
                    // Myčka: kapka vody u čela
                    const q = P(c.ri, tm, D - 0.12), a = 0.05 * PX;
                    L.add(new Konva.Shape({ listening: false, stroke: '#2563eb', strokeWidth: 1, strokeScaleEnabled: false,
                        sceneFunc: (k, tvar) => { k.beginPath(); k.moveTo(q.x, q.y - a); k.bezierCurveTo(q.x + a * 0.9, q.y + a * 0.1, q.x + a * 0.6, q.y + a, q.x, q.y + a); k.bezierCurveTo(q.x - a * 0.6, q.y + a, q.x - a * 0.9, q.y + a * 0.1, q.x, q.y - a); k.strokeShape(tvar); } }));
                }
                if (maSpodni(c.typ) && sp.celo === 'trouba' && sp.vDesce !== 'varna') {
                    const m = obd(c.ri, c.t0 + w * 0.2, c.t1 - w * 0.2, D - 0.2, D - 0.06);
                    L.add(new Konva.Line({ points: body(m), closed: true, stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false, dash: [3, 2] }));
                }
                const lednice = (c.typ === 'vysoka' && sl.vysoka?.celo === 'lednice') || (c.typ === 'volne' && ['lednice', 'americka'].includes(sl.volne?.spotrebic));
                if (lednice) {
                    // Lednice: vločka
                    const q = P(c.ri, tm, hloubka / 2), a = Math.min(w, hloubka) * 0.22 * PX;
                    for (let i = 0; i < 3; i++) { const u = i * Math.PI / 3; cara([{ x: q.x + Math.cos(u) * a, y: q.y + Math.sin(u) * a }, { x: q.x - Math.cos(u) * a, y: q.y - Math.sin(u) * a }], { stroke: '#2563eb' }); }
                }
                if (c.typ === 'vysoka' && ['trouba', 'trouba_mikro'].includes(sl.vysoka?.celo)) {
                    const m = obd(c.ri, c.t0 + w * 0.2, c.t1 - w * 0.2, D - 0.22, D - 0.06);
                    L.add(new Konva.Line({ points: body(m), closed: true, stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false }));
                }
                if (c.horniEf && ['digestor', 'komin'].includes(sl.horni?.celo)) {
                    // Digestoř: čárkovaný obrys a ventilátor
                    const hl = sl.horni.celo === 'komin' ? 0.5 : Dh;
                    cara([...obd(c.ri, c.t0 + 0.03, c.t1 - 0.03, 0, hl), P(c.ri, c.t0 + 0.03, 0)], { dash: [2, 3], stroke: '#6b7280' });
                    const q = P(c.ri, tm, hl / 2), a = Math.min(w, hl) * 0.25 * PX;
                    kruh(q, a, { stroke: '#6b7280', dash: [2, 2] });
                    if (sl.horni.celo === 'komin') L.add(new Konva.Line({ points: body(obd(c.ri, tm - 0.13, tm + 0.13, 0, 0.26)), closed: true, stroke: '#6b7280', strokeWidth: 0.9, strokeScaleEnabled: false, listening: false, fill: 'rgba(107,114,128,.15)' }));
                }
            }
            // Pracovní deska: obrys přes souvislé spodní skříňky
            for (const ds of rv.desky) cara([...obd(ds.ri, ds.t0, ds.t1, 0, D + PRESAH), P(ds.ri, ds.t0, 0)], { stroke: tmava, strokeWidth: vybrana ? 1.8 : 1.2 });
            // Rohy
            for (const roh of rv.rohy) {
                const ra = rv.ramena[roh.i];
                const a = obd(roh.i, ra.L - roh.A, ra.L, 0, D), b = obd(roh.i + 1, 0, roh.A, 0, D);
                pridej(new Konva.Line({ points: body(a), closed: true, fill: mixne(celaBarva, 0.5), stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false }));
                pridej(new Konva.Line({ points: body(b), closed: true, fill: mixne(celaBarva, 0.5), stroke: '#4b5563', strokeWidth: 0.9, strokeScaleEnabled: false }));
                if (roh.spodni === 'slepy') cara([P(roh.i, ra.L - D, 0), P(roh.i, ra.L, D)], { stroke: '#9ca3af' });
                else cara([P(roh.i, ra.L - roh.A, D), P(roh.i, ra.L - D, D), P(roh.i + 1, roh.A, D)], { stroke: '#374151', strokeWidth: 1.4 });
                if (roh.horni !== 'nic') cara([P(roh.i, ra.L - roh.A, Dh), P(roh.i, ra.L - Dh, Dh), P(roh.i + 1, roh.A, Dh)], { dash: [5, 4], stroke: '#6b7280' });
            }
            // Zástěna podél stěny
            if (s.povrchy?.zastena) for (const ds of rv.desky) cara([P(ds.ri, ds.t0, 0.012), P(ds.ri, ds.t1, 0.012)], { stroke: s.povrchy.zastena.barva, strokeWidth: 3 });
            if (vybrana && !this._kresbaProExport) this._sestavaUchyty2d(L, s, rv, P, primary, sc);
            this._sestavaZnacka2d(r, s, rv, P, popisek);
        },

        _sestavaUchyty2d(L, s, rv, P, primary, sc) {
            const posledni = rv.ramena.length - 1;
            const hl = s.druh === 'skrin' ? rv.hl / 2 : rv.D / 2;
            for (const [kde, q] of [['0', P(0, 0, hl)], ['1', P(posledni, rv.ramena[posledni].L, hl)]]) {
                const k = new Konva.Circle({ x: q.x, y: q.y, radius: 7 / sc, fill: '#ffffff', stroke: primary, strokeWidth: 1.5, strokeScaleEnabled: false });
                k.setAttr('_sestavaKonec', s.id + ':' + kde);
                L.add(k);
            }
        },

        _sestavaZnacka2d(r, s, rv, P, popisek) {
            if (!r.showIds || !r.citelnePismo?.(9)) return;
            // Uprostřed prostředního ramene (u U zadní stěna)
            const ri = Math.floor(rv.ramena.length / 2), ra = rv.ramena[ri];
            const q = P(ri, ra.L / 2, (s.druh === 'skrin' ? rv.hl : rv.D) / 2);
            popisek(r.schodyLayer, q.x, q.y, s.id, '#0f766e', 11);
        },

        // ─── 3D ─────────────────────────────────────────────
        _sestavaTextura(typ) {
            const THREE = window.THREE, _3d = window._kk3d;
            if (!_3d.texturySestav) _3d.texturySestav = new Map();
            let t = _3d.texturySestav.get(typ);
            if (!t) {
                t = new THREE.CanvasTexture(typ.startsWith('varna:') ? kresliVarnou(typ.slice(6)) : kresliPovrch(typ));
                t.encoding = THREE.sRGBEncoding;
                t.wrapS = t.wrapT = typ.startsWith('varna:') ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
                t.anisotropy = 8;
                _3d.texturySestav.set(typ, t);
            }
            return t;
        },

        /** Materiál povrchu: dekor dá texturu a drsnost, barva tón; klíč pro náhled barvy za tahu posuvníkem. */
        _sestavaMaterial(povrch, klic) {
            const THREE = window.THREE;
            const dek = DEKORY[povrch?.dekor] || DEKORY.hladky;
            const m = new THREE.MeshStandardMaterial({
                color: new THREE.Color(povrch?.barva || dek.barva),
                roughness: povrch?.lesk ? Math.min(dek.drsnost, 0.16) : dek.drsnost,
                metalness: dek.kov || 0,
            });
            if (dek.metru && !['sklo', 'zrcadlo'].includes(povrch?.dekor)) {
                m.map = this._sestavaTextura(povrch.dekor);
                m.userData.metru = dek.metru;
            }
            if (povrch?.dekor === 'sklo') { m.transparent = false; m.roughness = 0.06; }
            if (klic) m.userData.barva = klic;
            return m;
        },

        _sestavaKov(hex, drsnost = 0.3) {
            return new window.THREE.MeshStandardMaterial({ color: new window.THREE.Color(hex), roughness: drsnost, metalness: 1 });
        },

        /** Sestavy do 3D: každá ve vlastní skupině, přestaví se jen ta, jejíž otisk se změnil. */
        _sestavy3d(group) {
            const THREE = window.THREE, _3d = window._kk3d;
            if (!THREE || !_3d) return;
            if (!_3d.sestavySkupina || _3d.sestavySkupina.parent !== group) {
                if (_3d.sestavySkupina) { _3d.sestavySkupina.parent?.remove(_3d.sestavySkupina); this._zrus3d(_3d.sestavySkupina); }
                _3d.sestavySkupina = new THREE.Group();
                _3d.sestavySkupina.userData.sestavy = true;
                group.add(_3d.sestavySkupina);
            }
            const sk = _3d.sestavySkupina;
            const sestavy = this.engine.dum.sestavy || [];
            const ids = new Set(sestavy.map(s => s.id));
            for (const g of [...sk.children]) if (!ids.has(g.userData.sestava)) { sk.remove(g); this._zrus3d(g); }
            for (const s of sestavy) {
                try {
                    const ctx = this._sestavaKontext(s);
                    const otisk = JSON.stringify([s, ctx]);
                    let g = sk.children.find(x => x.userData.sestava === s.id);
                    if (g && g.userData.otisk === otisk) continue;
                    if (g) { sk.remove(g); this._zrus3d(g); }
                    g = new THREE.Group();
                    g.userData = { sestava: s.id, podlazi: s.podlazi, otisk };
                    this._postavSestavu3d(g, s, ctx);
                    sk.add(g);
                } catch (chyba) {
                    window.zalogujChybu?.(chyba, 'Sestava: stavba 3D', { id: s.id });
                }
            }
            this._sestavyViditelnost3d();
        },

        _sestavyViditelnost3d() {
            const sk = window._kk3d?.sestavySkupina;
            if (!sk) return;
            for (const g of sk.children) g.visible = this._viditelne3d ? this._viditelne3d(g.userData.podlazi) : true;
        },

        _postavSestavu3d(g, s, ctx) {
            const THREE = window.THREE;
            const rv = rozvrh(s, ctx);
            const y0 = ctx.kota + ctx.dh;
            const st = stavitel(THREE);
            const ud = { podlazi: s.podlazi, sestava: s.id };
            const klic = (k) => 'sestava:' + s.id + ':' + k;
            if (s.druh === 'skrin') { this._postavSkrin3d(g, s, rv, st, y0, klic, ud); return; }
            const v = rv.vys, D = rv.D, Dh = rv.Dh;
            const mCela = this._sestavaMaterial(povrchSestavy(s, 'cela'), klic('cela'));
            const mCelaH = s.povrchy?.celaHorni ? this._sestavaMaterial(povrchSestavy(s, 'celaHorni'), klic('celaHorni')) : mCela;
            const mKorpus = this._sestavaMaterial(povrchSestavy(s, 'korpus'), klic('korpus'));
            const mDeska = this._sestavaMaterial(povrchSestavy(s, 'deska'), klic('deska'));
            const soklVolba = povrchSestavy(s, 'sokl');
            const mSokl = soklVolba === 'korpus' ? mKorpus : soklVolba === 'nerez' ? this._sestavaKov(KOVY.nerez, 0.35) : soklVolba === 'cerna' ? new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 }) : mCela;
            const uch = { ...POVRCHY_KUCHYN.uchytky, ...(s.povrchy?.uchytky || {}) };
            const mUch = this._sestavaKov(KOVY[uch.barva] || KOVY.nerez, uch.barva === 'cerna' ? 0.5 : 0.28);
            const sp = SPOTREBICE[povrchSestavy(s, 'spotrebice')] || SPOTREBICE.nerez;
            const mSpot = new THREE.MeshStandardMaterial({ color: new THREE.Color(sp.barva), roughness: sp.drsnost, metalness: sp.kov || 0 });
            const mSklo = new THREE.MeshStandardMaterial({ color: new THREE.Color(CERNE_SKLO), roughness: 0.08, metalness: 0.2 });
            const mVitrina = new THREE.MeshStandardMaterial({ color: new THREE.Color('#cfe0e6'), roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.45 });
            const dz = DREZY[povrchSestavy(s, 'drez')] || DREZY.nerez;
            const mDrez = new THREE.MeshStandardMaterial({ color: new THREE.Color(dz.barva), roughness: dz.drsnost, metalness: dz.kov || 0 });
            const mBaterie = this._sestavaKov('#d4d7da', 0.18);
            const Y = (y) => y0 + y;
            const hF = D - TL_CELA;                  // líc korpusu, čela před ním
            const kv = (m, ri, t0, t1, h0, h1, a, b, o) => st.kvadr(m, rv.ramena[ri], t0, t1, h0, h1, Y(a), Y(b), o);
            // Úchytka čela: madlo, knopka; profil kreslí pás pod deskou, bez úchytek nic
            const uchytka = (ri, t0, t1, a, b, kde, hCela = D, sl = null) => {
                if (uch.typ === 'zadne' || uch.typ === 'profil') return;
                const w = t1 - t0, vy = b - a;
                const h0 = hCela + 0.006, h1 = hCela + (uch.typ === 'knopka' ? 0.028 : 0.026);
                if (uch.typ === 'knopka') {
                    const [tt, yy] = kde === 'h' ? [(t0 + t1) / 2, b - Math.min(0.05, vy / 2)] : kde === 'vd' ? [t1 - 0.045, b - 0.06] : kde === 'vl' ? [t0 + 0.045, b - 0.06] : kde === 'hh' ? [t1 - 0.045, a + 0.06] : kde === 'hl' ? [t0 + 0.045, a + 0.06] : [(t0 + t1) / 2, a + 0.05];
                    kv(mUch, ri, tt - 0.012, tt + 0.012, h0, h1, yy - 0.012, yy + 0.012, { sloupec: sl });
                    return;
                }
                if (kde === 'h' || kde === 'hd') {
                    const dl = Math.min(0.5, Math.max(0.128, w * 0.45)), yy = kde === 'h' ? b - Math.min(0.05, vy / 2) : a + 0.04;
                    kv(mUch, ri, (t0 + t1) / 2 - dl / 2, (t0 + t1) / 2 + dl / 2, h0, h1, yy - 0.006, yy + 0.006, { sloupec: sl });
                } else {
                    const dl = Math.min(0.2, vy * 0.4), tt = kde === 'vl' || kde === 'hl' ? t0 + 0.04 : t1 - 0.04;
                    const [ya, yb] = kde === 'vd' || kde === 'vl' ? [b - 0.05 - dl, b - 0.05] : [a + 0.05, a + 0.05 + dl];
                    kv(mUch, ri, tt - 0.006, tt + 0.006, h0, h1, ya, yb, { sloupec: sl });
                }
            };
            const celo = (m, ri, t0, t1, a, b, kde, sl, hCela = D) => {
                kv(m, ri, t0 + SPARA / 2, t1 - SPARA / 2, hCela - TL_CELA, hCela, a + SPARA / 2, b - SPARA / 2, { sloupec: sl });
                if (kde) uchytka(ri, t0, t1, a, b, kde, hCela, sl);
            };
            const dvirka = (m, ri, t0, t1, a, b, pocet, dole, sl, hCela = D) => {
                const p = Math.max(1, pocet || 1), w = (t1 - t0) / p;
                for (let i = 0; i < p; i++) {
                    const kde = dole ? (p === 2 ? (i ? 'hl' : 'hh') : 'hh') : (p === 2 ? (i ? 'vl' : 'vd') : 'vd');
                    celo(m, ri, t0 + i * w, t0 + (i + 1) * w, a, b, kde, sl, hCela);
                }
            };
            const trouba = (ri, t0, t1, a, b, sl) => {
                kv(mSpot, ri, t0 + SPARA, t1 - SPARA, hF, D, a + SPARA, b - SPARA, { sloupec: sl });
                kv(mSklo, ri, t0 + 0.05, t1 - 0.05, D, D + 0.003, a + 0.06, b - 0.1, { sloupec: sl });
                kv(mUch, ri, t0 + 0.08, t1 - 0.08, D + 0.01, D + 0.03, b - 0.06, b - 0.045, { sloupec: sl });
            };
            const otevrena = (ri, t0, t1, a, b, hl, police, sl) => {
                const tl = 0.018;
                kv(mKorpus, ri, t0, t1, 0, 0.012, a, b, { sloupec: sl });
                kv(mKorpus, ri, t0, t0 + tl, 0, hl, a, b, { sloupec: sl });
                kv(mKorpus, ri, t1 - tl, t1, 0, hl, a, b, { sloupec: sl });
                kv(mKorpus, ri, t0, t1, 0, hl, a, a + tl, { sloupec: sl });
                kv(mKorpus, ri, t0, t1, 0, hl, b - tl, b, { sloupec: sl });
                for (let i = 1; i <= police; i++) { const y = a + (b - a) * i / (police + 1); kv(mKorpus, ri, t0 + tl, t1 - tl, 0.012, hl - 0.01, y - tl / 2, y + tl / 2, { sloupec: sl }); }
            };
            const sokl = (ri, t0, t1, sl) => kv(mSokl, ri, t0, t1, 0, D - ODSKOK_SOKLU, 0, v.sokl, { sloupec: sl });
            const korpus = (ri, t0, t1, a, b, hl, sl) => kv(mKorpus, ri, t0, t1, 0, hl, a, b, { sloupec: sl });
            const profil = uch.typ === 'profil';
            const spodniDo = profil ? v.korpusDo - 0.03 : v.korpusDo;

            for (const c of rv.sloupce) {
                const sl = c.sl, ri = c.ri, t0 = c.t0, t1 = c.t1, klicSl = c.klic, w = t1 - t0, tm = (t0 + t1) / 2;
                if (c.typ === 'lista') {
                    sokl(ri, t0, t1, klicSl);
                    kv(mCela, ri, t0, t1, 0, D, v.sokl, v.korpusDo, { sloupec: klicSl });
                    if (c.horniEf) kv(mCelaH, ri, t0, t1, 0, Dh, v.horniOd, c.horniDo, { sloupec: klicSl });
                    continue;
                }
                if (c.typ === 'volne') {
                    const sp2 = sl.volne?.spotrebic || 'mezera';
                    if (sp2 === 'lednice' || sp2 === 'americka') {
                        const vy = sp2 === 'americka' ? 1.78 : 1.85, hl = sp2 === 'americka' ? 0.72 : 0.66;
                        kv(mSpot, ri, t0 + 0.01, t1 - 0.01, 0, hl - 0.004, 0.02, vy, { sloupec: klicSl });
                        if (sp2 === 'americka') kv(mSklo, ri, tm - 0.002, tm + 0.002, hl - 0.004, hl + 0.001, 0.05, vy - 0.03, { sloupec: klicSl });
                        else kv(mSklo, ri, t0 + 0.02, t1 - 0.02, hl - 0.004, hl + 0.001, 0.748, 0.752, { sloupec: klicSl });
                        const madla = sp2 === 'americka' ? [tm - 0.04, tm + 0.04] : [t1 - 0.05];
                        for (const tt of madla) {
                            kv(mUch, ri, tt - 0.008, tt + 0.008, hl + 0.01, hl + 0.035, 0.85, 1.25, { sloupec: klicSl });
                            if (sp2 === 'lednice') kv(mUch, ri, tt - 0.008, tt + 0.008, hl + 0.01, hl + 0.035, 0.45, 0.68, { sloupec: klicSl });
                        }
                    }
                    if (sl.volne?.horni) { korpus(ri, t0, t1, c.horniDo - 0.4, c.horniDo, Dh - TL_CELA, klicSl); dvirka(mCelaH, ri, t0, t1, c.horniDo - 0.4, c.horniDo, 1, true, klicSl, Dh); }
                    continue;
                }
                if (c.typ === 'vysoka') {
                    const vs = sl.vysoka || {}, top = v.vysokaDo;
                    sokl(ri, t0, t1, klicSl);
                    korpus(ri, t0, t1, v.sokl, top, hF, klicSl);
                    if (vs.celo === 'lednice') {
                        celo(mCela, ri, t0, t1, v.sokl, v.sokl + 0.72, 'vd', klicSl);
                        const hd = Math.min(top, v.sokl + 1.8);
                        celo(mCela, ri, t0, t1, v.sokl + 0.72, hd, 'hh', klicSl);
                        if (top - hd > 0.12) celo(mCela, ri, t0, t1, hd, top, 'hh', klicSl);
                    } else if (vs.celo === 'trouba' || vs.celo === 'trouba_mikro') {
                        const a0 = vs.celo === 'trouba' ? 0.85 : 0.75;
                        dvirka(mCela, ri, t0, t1, v.sokl, a0, 1, false, klicSl);
                        trouba(ri, t0, t1, a0, a0 + 0.6, klicSl);
                        let y = a0 + 0.6;
                        if (vs.celo === 'trouba_mikro') {
                            kv(mSpot, ri, t0 + SPARA, t1 - SPARA, hF, D, y + SPARA, y + 0.38 - SPARA, { sloupec: klicSl });
                            kv(mSklo, ri, t0 + 0.04, t1 - 0.14, D, D + 0.003, y + 0.05, y + 0.32, { sloupec: klicSl });
                            y += 0.38;
                        }
                        if (top - y > 0.1) dvirka(mCela, ri, t0, t1, y, top, 1, true, klicSl);
                    } else if (vs.celo === 'otevrena') {
                        otevrena(ri, t0, t1, v.sokl, top, D, 4, klicSl);
                    } else {
                        const p = omez(vs.pocet || 2, 2, 3);
                        const hrany = p === 3 ? [v.sokl, v.korpusDo, v.horniOd, top] : [v.sokl, v.korpusDo + 0.05, top];
                        for (let i = 0; i + 1 < hrany.length; i++) dvirka(mCela, ri, t0, t1, hrany[i], hrany[i + 1], vs.dvoje ? 2 : 1, i > 0, klicSl);
                    }
                    continue;
                }
                // Spodní skříňka
                const sp2 = sl.spodni || {};
                sokl(ri, t0, t1, klicSl);
                const a = v.sokl, b = spodniDo;
                if (sp2.celo === 'otevrena') otevrena(ri, t0, t1, a, v.korpusDo, D - 0.02, 1, klicSl);
                else korpus(ri, t0, t1, a, v.korpusDo, hF, klicSl);
                if (sp2.celo === 'zasuvky') {
                    const dily = sp2.pocet === 2 ? [0.5, 0.5] : sp2.pocet === 4 ? [0.19, 0.27, 0.27, 0.27] : [0.22, 0.39, 0.39];
                    let y = b;
                    for (const d of dily) { const yy = y - (b - a) * d; celo(mCela, ri, t0, t1, yy, y, 'h', klicSl); y = yy; }
                } else if (sp2.celo === 'zasuvka_dvirka') {
                    celo(mCela, ri, t0, t1, b - 0.17, b, 'h', klicSl);
                    dvirka(mCela, ri, t0, t1, a, b - 0.17, sp2.pocet, false, klicSl);
                } else if (sp2.celo === 'trouba') {
                    trouba(ri, t0, t1, b - 0.6, b, klicSl);
                    celo(mCela, ri, t0, t1, a, b - 0.6, 'h', klicSl);
                } else if (sp2.celo === 'mycka') {
                    if (sp2.mycka === 'panel') {
                        kv(mSpot, ri, t0 + SPARA, t1 - SPARA, hF, D, a + SPARA, b - 0.08, { sloupec: klicSl });
                        kv(mSklo, ri, t0 + SPARA, t1 - SPARA, hF, D, b - 0.08, b - SPARA, { sloupec: klicSl });
                        kv(mUch, ri, t0 + 0.12, t1 - 0.12, D + 0.006, D + 0.026, b - 0.13, b - 0.118, { sloupec: klicSl });
                    } else celo(mCela, ri, t0, t1, a, b, 'h', klicSl);
                } else if (sp2.celo !== 'otevrena') dvirka(mCela, ri, t0, t1, a, b, sp2.pocet, false, klicSl);
                if (profil && sp2.celo !== 'otevrena') kv(new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.5 }), ri, t0, t1, hF - 0.03, hF, b, v.korpusDo, { sloupec: klicSl });
                // V desce: dřez s baterií, varná deska
                if (sp2.vDesce === 'drez') this._drez3d(st, rv, ri, c, sp2.drez || 'jednodrez', mDrez, mBaterie, Y);
                else if (sp2.vDesce === 'varna') this._varna3d(st, rv, ri, c, sp2.varna || 'indukce', Y);
                // Horní skříňka
                if (c.horniEf) {
                    const hp = sl.horni || {}, ho = v.horniOd, hd = c.horniDo;
                    if (hp.celo === 'komin') {
                        const sir = Math.min(w, 0.9);
                        kv(mSpot, ri, tm - sir / 2, tm + sir / 2, 0, 0.5, ho + 0.1, ho + 0.16, { sloupec: klicSl });
                        kv(mSpot, ri, tm - 0.14, tm + 0.14, 0, 0.27, ho + 0.16, v.strop, { sloupec: klicSl });
                    } else if (hp.celo === 'otevrena') {
                        otevrena(ri, t0, t1, ho, hd, Dh, 1, klicSl);
                    } else {
                        const od = hp.celo === 'digestor' ? ho + 0.06 : ho;
                        korpus(ri, t0, t1, od, hd, Dh - TL_CELA, klicSl);
                        if (hp.celo === 'vyklop') {
                            const p = omez(hp.pocet || 1, 1, 2);
                            for (let i = 0; i < p; i++) celo(mCelaH, ri, t0, t1, od + (hd - od) * i / p, od + (hd - od) * (i + 1) / p, 'hd', klicSl, Dh);
                        } else if (hp.celo === 'sklo') {
                            const p = Math.max(1, hp.pocet || 1), ww = w / p;
                            for (let i = 0; i < p; i++) {
                                const a2 = t0 + i * ww, b2 = a2 + ww, r2 = 0.05;
                                kv(mCelaH, ri, a2 + SPARA, a2 + r2, Dh - TL_CELA, Dh, od + SPARA, hd - SPARA, { sloupec: klicSl });
                                kv(mCelaH, ri, b2 - r2, b2 - SPARA, Dh - TL_CELA, Dh, od + SPARA, hd - SPARA, { sloupec: klicSl });
                                kv(mCelaH, ri, a2 + r2, b2 - r2, Dh - TL_CELA, Dh, od + SPARA, od + r2, { sloupec: klicSl });
                                kv(mCelaH, ri, a2 + r2, b2 - r2, Dh - TL_CELA, Dh, hd - r2, hd - SPARA, { sloupec: klicSl });
                                kv(mVitrina, ri, a2 + r2, b2 - r2, Dh - 0.012, Dh - 0.008, od + r2, hd - r2, { sloupec: klicSl });
                                uchytka(ri, a2, b2, od, hd, p === 2 ? (i ? 'hl' : 'hh') : 'hh', Dh, klicSl);
                            }
                        } else dvirka(mCelaH, ri, t0, t1, od, hd, hp.pocet, true, klicSl, Dh);
                        if (hp.celo === 'digestor') {
                            kv(mSpot, ri, t0 + 0.005, t1 - 0.005, 0, Dh + 0.02, ho, ho + 0.06, { sloupec: klicSl });
                        }
                    }
                }
            }
            // Rohy
            for (const roh of rv.rohy) this._roh3d(st, rv, roh, { kv, celo, dvirka, otevrena, sokl, korpus, mCela, mCelaH, mKorpus, hF, D, Dh, v });
            // Pracovní deska s výřezy pro dřez
            for (const ds of rv.desky) {
                const ra = rv.ramena[ds.ri];
                const obrys = [bodRamene(ra, ds.t0, 0), bodRamene(ra, ds.t1, 0), bodRamene(ra, ds.t1, D + PRESAH), bodRamene(ra, ds.t0, D + PRESAH)];
                const otvory = [];
                for (const c of ds.sloupce) {
                    if (!c || c.sl.spodni?.vDesce !== 'drez') continue;
                    for (const [a, b] of this._miskyDrezu(c, c.sl.spodni.drez || 'jednodrez')) otvory.push([bodRamene(ra, a, 0.1), bodRamene(ra, b, 0.1), bodRamene(ra, b, D - 0.08), bodRamene(ra, a, D - 0.08)]);
                }
                const m = this._deska3d(obrys, otvory, Y(v.korpusDo), Y(v.deska), mDeska, ud);
                this._uvPodelRamene(m.geometry, ra, mDeska.userData.metru || 1);
                g.add(m);
            }
            // Zástěna mezi deskou a horními skříňkami
            if (s.povrchy?.zastena) {
                const mZ = this._sestavaMaterial(s.povrchy.zastena, klic('zastena'));
                for (const ds of rv.desky) {
                    // Za rohem až ke stěně: deska prvního ramene tam leží napříč
                    const t0 = ds.ri > 0 && Math.abs(ds.t0 - (D + PRESAH)) < 0.002 ? 0.008 : ds.t0;
                    kv(mZ, ds.ri, t0, ds.t1, 0, 0.008, v.deska, Math.min(v.horniOd, v.deska + 0.6), {});
                }
            }
            st.hotovo(g, ud);
        },

        _miskyDrezu(c, druh) {
            const w = c.t1 - c.t0;
            if (druh === 'dvojdrez') return [[c.t0 + w * 0.07, c.t0 + w * 0.48], [c.t0 + w * 0.52, c.t1 - w * 0.07]];
            if (druh === 'odkap') return [[c.t0 + w * 0.07, c.t0 + w * 0.56]];
            return [[c.t0 + Math.max(0.05, w * 0.1), c.t1 - Math.max(0.05, w * 0.1)]];
        },

        _drez3d(st, rv, ri, c, druh, mDrez, mBaterie, Y) {
            const r = rv.ramena[ri], v = rv.vys, D = rv.D;
            const dno = v.deska - 0.2, tl = 0.006, h0 = 0.1, h1 = D - 0.08;
            for (const [a, b] of this._miskyDrezu(c, druh)) {
                st.kvadr(mDrez, r, a, b, h0, h1, Y(dno - tl), Y(dno), { sloupec: c.klic });
                st.kvadr(mDrez, r, a, a + tl, h0, h1, Y(dno), Y(v.deska), { sloupec: c.klic });
                st.kvadr(mDrez, r, b - tl, b, h0, h1, Y(dno), Y(v.deska), { sloupec: c.klic });
                st.kvadr(mDrez, r, a, b, h0, h0 + tl, Y(dno), Y(v.deska), { sloupec: c.klic });
                st.kvadr(mDrez, r, a, b, h1 - tl, h1, Y(dno), Y(v.deska), { sloupec: c.klic });
                // Lem kolem misky na desce
                st.kvadr(mDrez, r, a - 0.015, b + 0.015, h0 - 0.015, h0, Y(v.deska), Y(v.deska + 0.003), { sloupec: c.klic });
                st.kvadr(mDrez, r, a - 0.015, b + 0.015, h1, h1 + 0.015, Y(v.deska), Y(v.deska + 0.003), { sloupec: c.klic });
                st.kvadr(mDrez, r, a - 0.015, a, h0, h1, Y(v.deska), Y(v.deska + 0.003), { sloupec: c.klic });
                st.kvadr(mDrez, r, b, b + 0.015, h0, h1, Y(v.deska), Y(v.deska + 0.003), { sloupec: c.klic });
            }
            if (druh === 'odkap') st.kvadr(mDrez, r, c.t0 + (c.t1 - c.t0) * 0.58, c.t1 - 0.03, 0.1, D - 0.08, Y(v.deska), Y(v.deska + 0.004), { sloupec: c.klic });
            // Baterie u zadní hrany
            const misky = this._miskyDrezu(c, druh), tm = (misky[0][0] + misky[0][1]) / 2;
            st.kvadr(mBaterie, r, tm - 0.015, tm + 0.015, 0.045, 0.075, Y(v.deska), Y(v.deska + 0.3), { sloupec: c.klic });
            st.kvadr(mBaterie, r, tm - 0.012, tm + 0.012, 0.045, 0.24, Y(v.deska + 0.28), Y(v.deska + 0.305), { sloupec: c.klic });
        },

        _varna3d(st, rv, ri, c, druh, Y) {
            const THREE = window.THREE, r = rv.ramena[ri], v = rv.vys, D = rv.D;
            const w = c.t1 - c.t0, sir = Math.min(w - 0.04, w >= 0.85 ? 0.88 : w >= 0.75 ? 0.78 : 0.58);
            const t0 = (c.t0 + c.t1) / 2 - sir / 2, t1 = t0 + sir, h0 = 0.05, h1 = Math.min(D - 0.03, 0.56);
            // Textura přes celou desku: souřadnice 0–1 rovnou v geometrii, ať je sdílený odkaz převezme beze změny
            const m = new THREE.MeshStandardMaterial({ color: 0xffffff, map: this._sestavaTextura('varna:' + druh), roughness: 0.1, metalness: 0.1 });
            m.userData.uvPevne = true;
            st.kvadr(m, r, t0, t1, h0, h1, Y(v.deska), Y(v.deska + 0.006), { sloupec: c.klic, uvFn: (a, b) => [(a - t0) / (t1 - t0), (b - h0) / (h1 - h0)] });
            if (druh === 'plyn') {
                const mMriz = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.6 });
                for (const f of [0.08, 0.5, 0.92]) st.kvadr(mMriz, r, t0 + sir * f - 0.006, t0 + sir * f + 0.006, h0 + 0.02, h1 - 0.02, Y(v.deska + 0.006), Y(v.deska + 0.03), { sloupec: c.klic });
                for (const f of [0.15, 0.5, 0.85]) st.kvadr(mMriz, r, t0 + 0.02, t1 - 0.02, h0 + (h1 - h0) * f - 0.006, h0 + (h1 - h0) * f + 0.006, Y(v.deska + 0.006), Y(v.deska + 0.03), { sloupec: c.klic });
            }
        },

        _roh3d(st, rv, roh, n) {
            const { kv, celo, otevrena, sokl, mCela, mCelaH, mKorpus, hF, D, Dh, v } = n;
            const ra = rv.ramena[roh.i], A = roh.A;
            const sl = 'roh:' + roh.i;
            // Korpus do L: rameno před rohem až ke stěně, druhé rameno od líce korpusu prvního
            kv(mKorpus, roh.i, ra.L - A, ra.L, 0, hF, v.sokl, v.korpusDo, { sloupec: sl });
            kv(mKorpus, roh.i + 1, hF, A, 0, hF, v.sokl, v.korpusDo, { sloupec: sl });
            sokl(roh.i, ra.L - A, ra.L - D + ODSKOK_SOKLU, sl);
            sokl(roh.i + 1, D - ODSKOK_SOKLU, A, sl);
            if (roh.spodni === 'slepy') {
                kv(mCela, roh.i, ra.L - A, ra.L - D, hF, D, v.sokl, v.korpusDo, { sloupec: sl });
                kv(mCela, roh.i + 1, D, A, hF, D, v.sokl, v.korpusDo, { sloupec: sl });
            } else {
                celo(mCela, roh.i, ra.L - A, ra.L - D, v.sokl, v.korpusDo, 'vl', sl);
                celo(mCela, roh.i + 1, D, A, v.sokl, v.korpusDo, null, sl);
            }
            if (roh.horni === 'nic') return;
            const ho = v.horniOd, hd = v.horniDo;
            if (roh.horni === 'police') {
                otevrena(roh.i, ra.L - A, ra.L, ho, hd, Dh, 1, sl);
                otevrena(roh.i + 1, Dh, A, ho, hd, Dh, 1, sl);
                return;
            }
            kv(mKorpus, roh.i, ra.L - A, ra.L, 0, Dh - TL_CELA, ho, hd, { sloupec: sl });
            kv(mKorpus, roh.i + 1, Dh - TL_CELA, A, 0, Dh - TL_CELA, ho, hd, { sloupec: sl });
            celo(mCelaH, roh.i, ra.L - A, ra.L - Dh, ho, hd, 'hl', sl, Dh);
            celo(mCelaH, roh.i + 1, Dh, A, ho, hd, null, sl, Dh);
        },

        _postavSkrin3d(g, s, rv, st, y0, klic, ud) {
            const THREE = window.THREE;
            const r = rv.ramena[0];
            if (!r) return;
            const L = r.L, H = rv.H, hl = rv.hl;
            const mKorpus = this._sestavaMaterial(povrchSestavy(s, 'korpus'), klic('korpus'));
            const mDvere = this._sestavaMaterial(povrchSestavy(s, 'dvere'), klic('dvere'));
            const mRam = this._sestavaKov(KOVY[s.ram || 'stribrna'] || KOVY.stribrna, 0.35);
            const uch = { ...POVRCHY_SKRIN.uchytky, ...(s.povrchy?.uchytky || {}) };
            const mUch = this._sestavaKov(KOVY[uch.barva] || KOVY.nerez, 0.3);
            const zrcadla = {};
            const mZrcadlo = (odstin) => zrcadla[odstin] || (zrcadla[odstin] = new THREE.MeshStandardMaterial({ color: new THREE.Color(ZRCADLA[odstin] || ZRCADLA.stribrne), roughness: 0.03, metalness: 1 }));
            const Y = (y) => y0 + y;
            const kv = (m, t0, t1, h0, h1, a, b, o = {}) => st.kvadr(m, r, t0, t1, h0, h1, Y(a), Y(b), o);
            const druh = rv.druhDveri;
            const zaDvermi = druh === 'posuvne' ? hl - 0.08 : druh === 'otocne' ? hl - TL_CELA : hl;
            if (druh === 'zadne') {
                const tl = 0.018;
                kv(mKorpus, 0, L, 0, 0.012, 0, H);
                kv(mKorpus, 0, tl, 0, hl, 0, H);
                kv(mKorpus, L - tl, L, 0, hl, 0, H);
                kv(mKorpus, 0, L, 0, hl, 0, 0.08);
                kv(mKorpus, 0, L, 0, hl, H - tl, H);
                const dily = Math.max(1, Math.round(L / 0.9));
                for (let i = 1; i < dily; i++) { const t = L * i / dily; kv(mKorpus, t - tl / 2, t + tl / 2, 0.012, hl, 0.08, H - tl); }
                kv(mKorpus, tl, L - tl, 0.012, hl, 1.75, 1.75 + tl);
                kv(mUch, tl, L - tl, hl / 2 - 0.01, hl / 2 + 0.01, 1.62, 1.64);
                st.hotovo(g, ud);
                return;
            }
            kv(mKorpus, 0, L, 0, zaDvermi, 0, H);
            if (druh === 'posuvne') {
                kv(mRam, 0, L, hl - 0.07, hl, H - 0.045, H);
                kv(mRam, 0, L, hl - 0.07, hl, 0, 0.03);
                for (const d of rv.dvere) {
                    const h1 = hl - 0.012 - d.vrstva * 0.03, h0 = h1 - TL_CELA;
                    const m = d.zrcadlo ? mZrcadlo(d.zrcadlo) : mDvere;
                    kv(m, d.t0 + 0.02, d.t1 - 0.02, h0, h1, 0.035, H - 0.05, { sloupec: 'd:' + d.i });
                    kv(mRam, d.t0, d.t0 + 0.02, h0 - 0.004, h1 + 0.002, 0.03, H - 0.045, { sloupec: 'd:' + d.i });
                    kv(mRam, d.t1 - 0.02, d.t1, h0 - 0.004, h1 + 0.002, 0.03, H - 0.045, { sloupec: 'd:' + d.i });
                }
            } else {
                kv(mKorpus, 0, L, 0, hl - 0.06, 0, 0.06);
                for (const d of rv.dvere) {
                    const m = d.zrcadlo ? mZrcadlo(d.zrcadlo) : mDvere;
                    kv(m, d.t0 + SPARA / 2, d.t1 - SPARA / 2, hl - TL_CELA, hl, 0.06 + SPARA, H - SPARA, { sloupec: 'd:' + d.i });
                    if (uch.typ !== 'zadne' && uch.typ !== 'profil') {
                        const tt = d.i % 2 ? d.t0 + 0.05 : d.t1 - 0.05;
                        if (uch.typ === 'knopka') kv(mUch, tt - 0.012, tt + 0.012, hl + 0.006, hl + 0.03, 1.0, 1.024);
                        else kv(mUch, tt - 0.007, tt + 0.007, hl + 0.006, hl + 0.028, 0.85, 1.15);
                    }
                }
            }
            st.hotovo(g, ud);
        },

        /** Souřadnice textury desky podél ramene: léta dřeva vedou po délce linky. */
        _uvPodelRamene(geom, r, metru) {
            const poz = geom.getAttribute('position');
            const uv = new Float32Array(poz.count * 2);
            for (let i = 0; i < poz.count; i++) {
                const p = { x: poz.getX(i), y: -poz.getY(i) };
                const rel = V.sub(p, r.a);
                uv[i * 2] = (V.dot(rel, r.n) + poz.getZ(i)) / metru;
                uv[i * 2 + 1] = V.dot(rel, r.d) / metru;
            }
            geom.setAttribute('uv', new window.THREE.BufferAttribute(uv, 2));
            geom.setAttribute('uv2', new window.THREE.BufferAttribute(uv, 2));
        },

        /** Klik do 3D na sestavu: vybere ji, u kuchyně i sloupec (podle trojúhelníku v geometrii). */
        _sestava3dZasah(zasah) {
            for (let o = zasah?.object; o; o = o.parent) {
                if (o.userData?.sestava && o.userData.sloupce !== undefined) {
                    const sl = o.userData.sloupce?.[zasah.faceIndex] || null;
                    return { id: o.userData.sestava, sloupec: sl && /^\d+:\d+$/.test(sl) ? sl : null, dvere: sl && sl.startsWith('d:') ? Number(sl.slice(2)) : null };
                }
                if (o.userData?.sestava) return { id: o.userData.sestava, sloupec: null, dvere: null };
            }
            return null;
        },
    };
})();
