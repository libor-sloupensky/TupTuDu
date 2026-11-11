/**
 * Dům přes podlaží (Koncept V3): přepínání podlaží, podepření nosných stěn, podklad
 * po podlažích a jeho usazení, posun domu, schodiště, výškové plochy, střecha, 3D domu.
 *
 * Mixin editoru (viz konceptV3Komponenta). Data žijí v engine.dum, takže Zpět, historie
 * i ukládání je nesou samy. Kresbu drží engine vždy jen pro aktivní podlaží; ostatní
 * podlaží nemají na plátně nic kromě jednoho obrázku spodního podlaží (renderSpodek).
 *
 * Geometrická pravidla domu (rozhodnuto s Liborem 1.–2. 11. 2026):
 *  - Podlaží nejde posunout samo o sobě. Hýbe se celý dům, zvlášť jen podklad.
 *  - Nosná stěna bez podpory dole se jen označí, nic se samo nepřesouvá.
 *  - Zvýšená podlaha se přenáší do vyšších podlaží (zvedá se i strop), jde vypnout.
 */
(function () {
    // Typ krytiny určuje reliéf, barva je zvlášť (na hraně může být vlastní)
    const TYPY_KRYTIN = [
        { id: 'taska', nazev: preloz('ed_dum.krytina.taska'), kov: false },
        { id: 'betonova', nazev: preloz('ed_dum.krytina.betonova'), kov: false },
        { id: 'bobrovka', nazev: preloz('ed_dum.krytina.bobrovka'), kov: false },
        { id: 'sindel', nazev: preloz('ed_dum.krytina.sindel'), kov: false },
        { id: 'bridlice', nazev: preloz('ed_dum.krytina.bridlice'), kov: false },
        { id: 'falc', nazev: preloz('ed_dum.krytina.falc'), kov: true },
        { id: 'trapez', nazev: preloz('ed_dum.krytina.trapez'), kov: true },
    ];
    const BARVY_KRYTIN = [
        { id: 'cervena', nazev: preloz('ed_dum.barva_krytiny.cervena'), barva: '#a8502f' },
        { id: 'antracit', nazev: preloz('ed_dum.barva_krytiny.antracit'), barva: '#3f4347' },
        { id: 'hneda', nazev: preloz('ed_dum.barva_krytiny.hneda'), barva: '#6d4c3b' },
        { id: 'seda', nazev: preloz('ed_dum.barva_krytiny.seda'), barva: '#8a8d90' },
        { id: 'modroseda', nazev: preloz('ed_dum.barva_krytiny.modroseda'), barva: '#5d6d75' },
    ];
    // Starší střechy měly v `krytina` barvu i typ dohromady
    const STARE_KRYTINY = { antracit: '#3f4347', hneda: '#6d4c3b', seda: '#8a8d90', plech: '#5d6d75' };
    const typKrytiny = (st) => (TYPY_KRYTIN.find(k => k.id === st.krytina) ? st.krytina : (st.krytina === 'plech' ? 'falc' : 'taska'));
    const barvaKrytiny = (st) => st.barva || STARE_KRYTINY[st.krytina] || BARVY_KRYTIN[0].barva;

    /**
     * Reliéf krytiny jako dlaždice 1,2 × 1,2 m. Kreslí se jednou odstíny šedi, stejný obrázek
     * slouží jako tmavnutí barvy i jako výškový podklad. Nahoře v obrázku je hřeben.
     */
    const METRU_NA_TEXTURU = 1.2;
    function kresliRelief(typ) {
        const N = 512;
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        g.fillStyle = '#e8e8e8';
        g.fillRect(0, 0, N, N);
        let seme = 7;
        const nahoda = () => { seme = (seme * 16807) % 2147483647; return (seme % 1000) / 1000; };
        const sed = (v) => { const c = Math.round(Math.min(255, Math.max(0, v))); return `rgb(${c},${c},${c})`; };
        if (typ === 'taska' || typ === 'betonova') {
            const sloupcu = typ === 'taska' ? 4 : 5, rad = 4, s = N / sloupcu, v = N / rad;
            for (let x = 0; x < N; x++) {
                const f = (x % s) / s;
                const h = typ === 'taska' ? Math.cos(f * Math.PI * 2) : (Math.cos(f * Math.PI * 4) * 0.5);
                g.fillStyle = sed(205 + h * 42);
                g.fillRect(x, 0, 1, N);
            }
            for (let r = 0; r < rad; r++) {
                const l = g.createLinearGradient(0, (r + 1) * v - 14, 0, (r + 1) * v);
                l.addColorStop(0, 'rgba(0,0,0,0)');
                l.addColorStop(1, 'rgba(0,0,0,.55)');
                g.fillStyle = l;
                g.fillRect(0, (r + 1) * v - 14, N, 14);
            }
        } else if (typ === 'bobrovka') {
            const rad = 8, sloupcu = 6, v = N / rad, s = N / sloupcu;
            // Vyšší řady překrývají nižší: kreslí se od okapu nahoru
            for (let r = rad; r >= -1; r--) {
                for (let c = -1; c <= sloupcu; c++) {
                    const x = (c + (r % 2 ? 0.5 : 0)) * s, y = r * v;
                    g.beginPath();
                    g.moveTo(x + 2, y - v);
                    g.lineTo(x + 2, y + v * 0.45);
                    g.quadraticCurveTo(x + s / 2, y + v * 1.25, x + s - 2, y + v * 0.45);
                    g.lineTo(x + s - 2, y - v);
                    g.closePath();
                    g.fillStyle = sed(205 + nahoda() * 36);
                    g.fill();
                    g.lineWidth = 3;
                    g.strokeStyle = 'rgba(0,0,0,.5)';
                    g.stroke();
                }
            }
        } else if (typ === 'sindel' || typ === 'bridlice') {
            const rad = typ === 'sindel' ? 8 : 6, sloupcu = typ === 'sindel' ? 4 : 5, v = N / rad, s = N / sloupcu;
            for (let r = 0; r < rad; r++) {
                for (let c = -1; c <= sloupcu; c++) {
                    const x = (c + (r % 2 ? 0.5 : 0)) * s;
                    g.fillStyle = sed((typ === 'sindel' ? 190 : 180) + nahoda() * 60);
                    g.fillRect(x + 1, r * v + 1, s - 2, v - 2);
                }
                g.fillStyle = 'rgba(0,0,0,.55)';
                g.fillRect(0, (r + 1) * v - 3, N, 3);
            }
        } else if (typ === 'falc') {
            const s = N / 2;
            for (let i = 0; i < 2; i++) {
                const x = (i + 0.5) * s;
                g.fillStyle = 'rgba(0,0,0,.4)';
                g.fillRect(x + 4, 0, 10, N);
                g.fillStyle = '#ffffff';
                g.fillRect(x - 4, 0, 8, N);
            }
        } else if (typ === 'trapez') {
            const s = N / 6;
            for (let x = 0; x < N; x++) {
                const f = (x % s) / s;
                const h = f < 0.2 ? f / 0.2 : (f < 0.45 ? 1 : (f < 0.65 ? 1 - (f - 0.45) / 0.2 : 0));
                g.fillStyle = sed(165 + h * 80);
                g.fillRect(x, 0, 1, N);
            }
        }
        return cv;
    }
    // Dekor podlahy místnosti. Barva je zvlášť, `barva` zde platí, dokud si ji uživatel nezmění.
    // `metru` = kolik metrů pokryje jedna dlaždice textury.
    const DEKORY_PODLAH = [
        { id: 'hladka', nazev: preloz('ed_dum.dekor.hladka'), barva: '#d6d3d1', metru: 2, drsnost: 0.8 },
        { id: 'prkna', nazev: preloz('ed_dum.dekor.prkna'), barva: '#b08a5e', metru: 2, drsnost: 0.6 },
        { id: 'parkety', nazev: preloz('ed_dum.dekor.parkety'), barva: '#a97c50', metru: 0.8, drsnost: 0.55 },
        { id: 'dlazba30', nazev: preloz('ed_dum.dekor.dlazba30'), barva: '#bdb8ae', metru: 1.2, drsnost: 0.4 },
        { id: 'dlazba60', nazev: preloz('ed_dum.dekor.dlazba60'), barva: '#c9c6bf', metru: 1.2, drsnost: 0.35 },
        { id: 'beton', nazev: preloz('ed_dum.dekor.beton'), barva: '#9a9a96', metru: 2, drsnost: 0.7 },
        { id: 'koberec', nazev: preloz('ed_dum.dekor.koberec'), barva: '#8c8f94', metru: 1, drsnost: 1 },
    ];
    const dekorPodlahy = (id) => DEKORY_PODLAH.find(k => k.id === id) || DEKORY_PODLAH[0];
    const barvaPodlahy = (p) => p?.barva || dekorPodlahy(p?.dekor).barva;

    /** Dekor jako opakovaná dlaždice, odstíny šedi: tmavnutí barvy i výškový podklad jako u krytiny. */
    function kresliDekor(typ) {
        const N = 512;
        const cv = document.createElement('canvas');
        cv.width = cv.height = N;
        const g = cv.getContext('2d');
        g.fillStyle = '#f2f2f2';
        g.fillRect(0, 0, N, N);
        let seme = 11;
        const nahoda = () => { seme = (seme * 16807) % 2147483647; return (seme % 1000) / 1000; };
        const sed = (v) => { const c = Math.round(Math.min(255, Math.max(0, v))); return `rgb(${c},${c},${c})`; };
        const skvrny = (pocet, r, sila) => {
            for (let i = 0; i < pocet; i++) {
                g.fillStyle = `rgba(${nahoda() < 0.5 ? '0,0,0' : '255,255,255'},${nahoda() * sila})`;
                const x = nahoda() * N, y = nahoda() * N, q = r * (0.3 + nahoda());
                // Přes okraj se skvrna kreslí znovu z druhé strany, ať na sebe dlaždice navazují
                for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { g.beginPath(); g.arc(x + dx, y + dy, q, 0, Math.PI * 2); g.fill(); }
            }
        };
        if (typ === 'prkna') {
            // Dlaždice 2 × 2 m, prkna 20 cm široká, spoj v každé řadě jinde
            const rad = 10, v = N / rad;
            for (let r = 0; r < rad; r++) {
                const spoj = nahoda() * N;
                g.fillStyle = sed(222 + nahoda() * 30);
                g.fillRect(0, r * v, N, v);
                for (let l = 0; l < 7; l++) {
                    g.fillStyle = `rgba(0,0,0,${0.03 + nahoda() * 0.05})`;
                    g.fillRect(0, r * v + nahoda() * v, N, 1 + nahoda() * 2);
                }
                g.fillStyle = 'rgba(0,0,0,.55)';
                g.fillRect(0, r * v, N, 2);
                g.fillRect(spoj, r * v, 2, v);
            }
        } else if (typ === 'parkety') {
            // Rybí kost: vlys 40 × 10 cm, mřížka (1, 1) a (4, -4) vlysů; dlaždice má 8 šířek, tedy 80 cm
            const s = N / 8;
            g.lineWidth = 2;
            for (let a = -24; a <= 24; a++) {
                for (let b = -8; b <= 8; b++) {
                    const x = (a + 4 * b) * s, y = (a - 4 * b) * s;
                    const ton = 216 + (((a % 4) + 4) % 4) * 10;
                    for (const [px, py, pw, ph, posun] of [[x, y, 4 * s, s, 0], [x, y + s, s, 4 * s, 12]]) {
                        g.fillStyle = sed(ton + posun);
                        g.fillRect(px, py, pw, ph);
                        g.strokeStyle = 'rgba(0,0,0,.45)';
                        g.strokeRect(px, py, pw, ph);
                    }
                }
            }
        } else if (typ === 'dlazba30' || typ === 'dlazba60') {
            // Dlaždice textury 1,2 × 1,2 m: čtyři, nebo dva kusy na stranu
            const pocet = typ === 'dlazba30' ? 4 : 2, s = N / pocet;
            for (let i = 0; i < pocet; i++) {
                for (let j = 0; j < pocet; j++) {
                    g.fillStyle = sed(234 + nahoda() * 16);
                    g.fillRect(i * s, j * s, s, s);
                }
            }
            g.fillStyle = 'rgba(0,0,0,.5)';
            for (let i = 0; i < pocet; i++) { g.fillRect(i * s, 0, 3, N); g.fillRect(0, i * s, N, 3); }
        } else if (typ === 'beton') {
            skvrny(160, 60, 0.05);
            skvrny(300, 6, 0.08);
        } else if (typ === 'koberec') {
            for (let i = 0; i < 26000; i++) {
                g.fillStyle = `rgba(0,0,0,${nahoda() * 0.28})`;
                g.fillRect(nahoda() * N, nahoda() * N, 2, 2);
            }
        }
        return cv;
    }

    const TYPY_STRECH = [
        { id: 'sedlova', nazev: preloz('ed_dum.typ_strechy.sedlova'), sklon: 38 },
        { id: 'valbova', nazev: preloz('ed_dum.typ_strechy.valbova'), sklon: 30 },
        { id: 'pultova', nazev: preloz('ed_dum.typ_strechy.pultova'), sklon: 15 },
        { id: 'plocha', nazev: preloz('ed_dum.typ_strechy.plocha'), sklon: 2 },
    ];
    // Úroveň podlahy místnosti. „bezna" nemá záznam v dum.plochy, ostatní ano (obrys = místnost).
    // Dřívější „prostup" byl totéž co bez podlahy (otvor ve stropu pod místností), sjednoceno 3. 11. 2026.
    const TYPY_PLOCH = [
        { id: 'bezna', nazev: preloz('ed_dum.uroven_podlahy.bezna') },
        { id: 'zvysena', nazev: preloz('ed_dum.uroven_podlahy.zvysena') },
        { id: 'snizena', nazev: preloz('ed_dum.uroven_podlahy.snizena') },
        { id: 'bez_podlahy', nazev: preloz('ed_dum.uroven_podlahy.bez_podlahy') },
    ];

    const omez = (x, a, b) => Math.max(a, Math.min(b, x));

    /** Bod v mnohoúhelníku (px). */
    function bodVPolygonu(p, poly) {
        let v = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            if ((poly[i].y > p.y) !== (poly[j].y > p.y)
                && p.x < (poly[j].x - poly[i].x) * (p.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) v = !v;
        }
        return v;
    }

    const BARVA_SCHODU = '#8b7355';
    const MAX_ODCHYLKA_SCHODU = Math.sin(2 * Math.PI / 180);

    /**
     * Stupně v částech schodiště. Mezi stupně se počítá i odpočívadlo a poslední krok na podlahu,
     * proto L: část 1 + část 2 = n − 2, U: 1 + 2 + 3 = n − 3. U s prostřední částí 0 má jedno široké
     * odpočívadlo, tedy n − 2. Nulu uživatel zadává a drží se; změna výšky se promítne do zbytku.
     */
    function castiSchodu(s, n) {
        const c = s.casti || [];
        if (s.tvar === 'L') {
            const F = Math.max(1, n - 2);
            const a = c[1] === 0 ? F : omez(c[0] ?? Math.max(1, Math.floor(F / 2)), 1, F);
            return [a, F - a];
        }
        if (s.tvar === 'U') {
            const m = omez(Math.round(c[1] ?? 0), 0, Math.max(0, n - 4));
            const F = Math.max(1, m > 0 ? n - 3 : n - 2) - m;
            const a = c[2] === 0 ? F : omez(c[0] ?? Math.max(1, Math.floor(F / 2)), 1, F);
            return [a, m, F - a];
        }
        return [Math.max(1, n - 1)];
    }

    /**
     * Geometrie schodiště v px. Počet stupňů z výšky podlaží (výška stupně kolem 175 mm),
     * šířka stupně ze vztahu 2h + b = 630 mm. Přímé a do L.
     * @param {object} s  {x, y (m, y nahoru), uhel (rad na plátně), sirka, tvar, strana}
     * @param {number} H  výška mezi podlažími v m
     */
    function schodyGeo(s, H, PX) {
        const n = Math.max(2, Math.round(H / (s.vyskaStupne || 0.175)));
        const v = H / n;
        const b = s.naslap || omez(0.63 - 2 * v, 0.22, 0.32);
        const sir = s.sirka || 1;
        const ox = s.x * PX, oy = -s.y * PX;
        const ux = Math.cos(s.uhel || 0), uy = Math.sin(s.uhel || 0);
        const kx = -uy, ky = ux;
        const P = (a, c) => ({ x: ox + (ux * a + kx * c) * PX, y: oy + (uy * a + ky * c) * PX });
        const pul = sir / 2;
        const TL_PODSTUPNICE = 0.02;
        const stupne = [];
        let z = 0;
        // Rameno: stupně za sebou od bodu (oa, oc) ve směru (da, dc)
        const rameno = (oa, oc, da, dc, pocet) => {
            const R = (d, t) => P(oa + da * d - dc * t, oc + dc * d + da * t);
            for (let i = 0; i < pocet; i++) {
                z += v;
                const d = i * b;
                stupne.push({
                    poly: [R(d, -pul), R(d + b, -pul), R(d + b, pul), R(d, pul)], z,
                    celo: [R(d, -pul), R(d + TL_PODSTUPNICE, -pul), R(d + TL_PODSTUPNICE, pul), R(d, pul)],
                });
            }
        };
        // Odpočívadlo: obdélník v souřadnicích schodů, `celo` je úzký pás na hraně nástupu
        const podesta = (a0, a1, c0, c1, celo) => {
            z += v;
            stupne.push({ poly: [P(a0, c0), P(a1, c0), P(a1, c1), P(a0, c1)], z, podesta: true, celo });
        };
        const casti = castiSchodu(s, n);
        const st = (s.strana || 1) >= 0 ? 1 : -1;
        const h = st * pul;
        let obrys, sipka, delka;
        if (s.tvar === 'L') {
            const [t1, t2] = casti;
            const L1 = t1 * b, L2 = t2 * b;
            rameno(0, 0, 1, 0, t1);
            podesta(L1, L1 + sir, -pul, pul, [P(L1, -pul), P(L1 + TL_PODSTUPNICE, -pul), P(L1 + TL_PODSTUPNICE, pul), P(L1, pul)]);
            rameno(L1 + pul, h, 0, st, t2);
            obrys = [P(0, -h), P(L1 + sir, -h), P(L1 + sir, h + st * L2), P(L1, h + st * L2), P(L1, h), P(0, h)];
            sipka = [P(0.1, 0), P(L1 + pul, 0), P(L1 + pul, L2 ? h + st * L2 - st * 0.1 : h)];
            delka = L1 + sir + L2;
        } else if (s.tvar === 'U') {
            const [t1, t2, t3] = casti;
            const L1 = t1 * b, L2 = t2 * b, L3 = t3 * b;
            const nastup = [P(L1, -pul), P(L1 + TL_PODSTUPNICE, -pul), P(L1 + TL_PODSTUPNICE, pul), P(L1, pul)];
            const c3 = st * (L2 + sir);        // osa třetího ramene
            const cVen = c3 + h, cDovnitr = c3 - h;
            rameno(0, 0, 1, 0, t1);
            if (t2) {
                podesta(L1, L1 + sir, -pul, pul, nastup);
                rameno(L1 + pul, h, 0, st, t2);
                const c0 = h + st * L2;
                podesta(L1, L1 + sir, c0, c0 + st * sir, [P(L1, c0), P(L1 + sir, c0), P(L1 + sir, c0 + st * TL_PODSTUPNICE), P(L1, c0 + st * TL_PODSTUPNICE)]);
                obrys = [P(0, -h), P(L1 + sir, -h), P(L1 + sir, cVen), P(L1 - L3, cVen), P(L1 - L3, cDovnitr), P(L1, cDovnitr), P(L1, h), P(0, h)];
            } else {
                // Prostřední část bez stupňů: jedno široké odpočívadlo přes obě ramena
                podesta(L1, L1 + sir, -h, cVen, nastup);
                obrys = [P(0, -h), P(L1 + sir, -h), P(L1 + sir, cVen), P(L1 - L3, cVen), P(L1 - L3, h), P(0, h)];
            }
            rameno(L1, c3, -1, 0, t3);
            sipka = [P(0.1, 0), P(L1 + pul, 0), P(L1 + pul, c3), P(L1 - L3 + 0.1, c3)];
            delka = L1 + sir + L2 + L3;
        } else {
            const t = n - 1;
            rameno(0, 0, 1, 0, t);
            obrys = [P(0, -pul), P(t * b, -pul), P(t * b, pul), P(0, pul)];
            sipka = [P(0.1, 0), P(t * b - 0.1, 0)];
            delka = t * b;
        }
        obrys = obrys.filter((p, i) => { const q = obrys[(i + 1) % obrys.length]; return Math.hypot(p.x - q.x, p.y - q.y) > 0.01; });
        return {
            n, v, b, stupne, obrys, sipka, delka, casti, uchop: P(-0.45, 0),
            nastup: [P(0, -pul), P(0, pul)], zpet: { x: -ux, y: -uy },
            pohodlne: v >= 0.15 && v <= 0.2 && sir >= 0.8 && 2 * v + b >= 0.58 && 2 * v + b <= 0.68,
        };
    }

    /** Šrafa polygonu: rovnoběžné čáry přes obálku, oříznuté polygonem (kreslí do canvasu). */
    function srafa(c, poly, rozestup, barva, tl) {
        c.save();
        c.beginPath();
        poly.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
        c.closePath();
        c.clip();
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of poly) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
        c.strokeStyle = barva;
        c.lineWidth = tl;
        c.beginPath();
        for (let d = minX + minY - (maxY - minY); d <= maxX + maxY; d += rozestup) {
            c.moveTo(d - minY + 0, minY);
            c.lineTo(d - maxY, maxY);
        }
        c.stroke();
        c.restore();
    }

    /** Nejbližší bod úsečky a–b k bodu p. */
    function bodNaUsecce(p, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const L2 = dx * dx + dy * dy;
        const t = L2 > 0 ? omez(((p.x - a.x) * dx + (p.y - a.y) * dy) / L2, 0, 1) : 0;
        return { x: a.x + dx * t, y: a.y + dy * t };
    }

    function useckySeProtinaji(a, b, c, d) {
        const strana = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
        return (strana(a, b, c) > 0) !== (strana(a, b, d) > 0) && (strana(c, d, a) > 0) !== (strana(c, d, b) > 0);
    }

    const plochaSeZnamenkem = (poly) => poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;
    const ZAKLAD_POD_TEREN = 0.3;  // o tolik jde základ ve 3D pod terén, aby mezi ním a terénem nebyla škvíra
    const PODKROVI_PLOCHA_OD = 1.2; // v podkroví se pod touto výškou plocha nepočítá (Česko, modules/stavebni-parametry.md)
    const kladnaOrientace = (poly) => (plochaSeZnamenkem(poly) < 0 ? [...poly].reverse() : poly);

    /**
     * Vztah schodů k hranici místnosti (mnohoúhelníky v px). Schody k výškové ploše mají ležet přes
     * hranici, aspoň jeden bod vně a jeden uvnitř, jinak to nejsou schody k té místnosti (Libor 3. 11. 2026).
     * Dotyk hranice stačí jen v přirozené poloze: ke zvýšené podlaze (k > 0) smí stát celé venku s výstupem
     * na hraně, celé uvnitř ne. Ze snížené (k < 0) naopak: celé uvnitř ano, celé venku ne.
     * Schody celé na špatné straně se vrací po své ose (nastup = { body: [a, b], smer }), dokud nástup
     * nepřejde přes hranici: nepřeskočí k jiné hraně a prostor před nimi zůstane otevřený.
     * Vrací { dotek: true }, nebo nejmenší posun { x, y }, kterým se pravidlo splní.
     */
    function hraniceSchodu(obrys, hranice, k = 0, nastup = null, tol = 0.5, rezerva = 0.8) {
        const hrany = (poly) => poly.map((a, i) => [a, poly[(i + 1) % poly.length]]);
        const hH = hrany(kladnaOrientace(hranice));
        const hO = hrany(obrys);
        if (k) {
            const body = hO.flatMap(([a, b]) => [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ x: a.x + (b.x - a.x) * i / 8, y: a.y + (b.y - a.y) * i / 8 })));
            const kHrane = (p) => {
                let nej = null;
                for (const [c, d] of hH) {
                    const q = bodNaUsecce(p, c, d), v = Math.hypot(q.x - p.x, q.y - p.y);
                    if (!nej || v < nej.v) nej = { v, q, c, d };
                }
                return nej;
            };
            if (!body.some(p => bodVPolygonu(p, hranice) === (k < 0) && kHrane(p).v > rezerva)) {
                const pres = rezerva + 0.2;
                if (nastup) {
                    const [a, b] = nastup.body, r = nastup.smer;
                    let t = Infinity;
                    for (let i = 0; i <= 8; i++) {
                        const sx = a.x + (b.x - a.x) * i / 8, sy = a.y + (b.y - a.y) * i / 8;
                        for (const [c, d] of hH) {
                            const ex = d.x - c.x, ey = d.y - c.y;
                            const det = r.x * ey - r.y * ex;
                            if (Math.abs(det) < 1e-9) continue;
                            const vzdalenost = ((c.x - sx) * ey - (c.y - sy) * ex) / det;
                            const naHrane = ((c.x - sx) * r.y - (c.y - sy) * r.x) / det;
                            if (naHrane >= 0 && naHrane <= 1 && vzdalenost >= -pres && vzdalenost < t) t = vzdalenost;
                        }
                    }
                    if (t < Infinity) return { dotek: false, x: r.x * (t + pres), y: r.y * (t + pres) };
                }
                // Bez osy nejbližší bod o rezervu přes nejbližší hranu; při kladné orientaci je vně vpravo od hrany
                let nej = null;
                for (const p of body) { const n = kHrane(p); if (!nej || n.v < nej.n.v) nej = { p, n }; }
                const dx = nej.n.d.x - nej.n.c.x, dy = nej.n.d.y - nej.n.c.y, L = Math.hypot(dx, dy) || 1;
                return { dotek: false, x: nej.n.q.x - nej.p.x + dy / L * k * pres, y: nej.n.q.y - nej.p.y - dx / L * k * pres };
            }
        }
        // Hranice schodů a místnosti se musí protnout nebo dotknout
        if (hO.some(([a, b]) => hH.some(([c, d]) => useckySeProtinaji(a, b, c, d)))) return { dotek: true, x: 0, y: 0 };
        let nej = null;
        const zkus = (dx, dy) => { const d = Math.hypot(dx, dy); if (!nej || d < nej.d) nej = { d, x: dx, y: dy }; };
        for (const p of obrys) for (const [c, d] of hH) { const q = bodNaUsecce(p, c, d); zkus(q.x - p.x, q.y - p.y); }
        for (const p of hranice) for (const [a, b] of hO) { const q = bodNaUsecce(p, a, b); zkus(p.x - q.x, p.y - q.y); }
        return nej && nej.d > tol ? { dotek: false, x: nej.x, y: nej.y } : { dotek: true, x: 0, y: 0 };
    }

    /** Část konvexního mnohoúhelníku vlevo od přímky a→b. */
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

    /**
     * Konvexní P bez konvexního C (oba s kladnou plochou) jako konvexní díly; null = podstatně se
     * nepřekrývají. Hrany C řežou postupně: co je vně hrany, je hotové, zbytek jde k další hraně.
     */
    function odectiKonvexni(P, C, minPlocha = 1e-4) {
        let prunik = P;
        for (let i = 0; i < C.length && prunik.length >= 3; i++) prunik = polorovina(prunik, C[i], C[(i + 1) % C.length]);
        if (prunik.length < 3 || plochaSeZnamenkem(prunik) < minPlocha) return null;
        const dily = [];
        let zbytek = P;
        for (let i = 0; i < C.length && zbytek.length >= 3; i++) {
            const a = C[i], b = C[(i + 1) % C.length];
            const ven = polorovina(zbytek, b, a);
            if (ven.length >= 3 && plochaSeZnamenkem(ven) >= minPlocha) dily.push(ven);
            zbytek = polorovina(zbytek, a, b);
        }
        return dily;
    }

    /** Nejmenší šířka konvexního mnohoúhelníku (přes všechny směry hran). */
    function sirkaKonvexni(poly) {
        let nej = Infinity;
        poly.forEach((a, i) => {
            const b = poly[(i + 1) % poly.length];
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            if (L < 1e-9) return;
            const nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
            const c = poly.map(p => p.x * nx + p.y * ny);
            nej = Math.min(nej, Math.max(...c) - Math.min(...c));
        });
        return nej;
    }

    window.DumGeo = { schodyGeo, castiSchodu, bodVPolygonu, hraniceSchodu, odectiKonvexni };

    window.KonceptDum = {
        // ─── Stav ──────────────────────────────────────────────
        _aktivniUi: null,
        podlaziUprava: null,       // id podlaží, jehož řádek je rozbalený na úpravy
        podlaziPridat: false,      // rozbalená volba „Přidat podlaží"
        podlaziKopie: true,
        zobrazSpodek: true,
        rezimStrecha: false,
        strechaHrana: null,        // klíč vybrané hrany střechy
        skryte3d: [],              // 3D: podlaží vypnutá v seznamu
        zobrazStrechu3d: true,
        dumZprava: '',
        schodyStart: null,         // první bod nového schodiště (px)
        schodyTvar: 'prime',
        licoBody: [],              // usazení plánku: [plán1, spodek1, plán2, spodek2]
        licoSeStenami: true,
        posunPodkladu: false,
        _domTah: null,
        _domPosun: null,

        get krytinyVolby() { return TYPY_KRYTIN; },
        get dekoryPodlahVolby() { return DEKORY_PODLAH; },
        /** Druhy místností po skupinách pro <optgroup>; „Jiná“ (bez druhu) je zvlášť nahoře. */
        get skupinyDruhuVolby() {
            const druhy = window.DRUHY_MISTNOSTI || {};
            return Object.entries(window.SKUPINY_MISTNOSTI || {}).map(([id, seznam]) => ({
                id, nazev: preloz('ed_kresba.skupina_' + id),
                druhy: seznam.filter(d => druhy[d]).map(d => ({ id: d, nazev: preloz('ed_kresba.' + druhy[d]) })),
            }));
        },
        get typyStrechVolby() { return TYPY_STRECH; },
        get typyPlochVolby() { return TYPY_PLOCH; },

        dumInit() {
            this._aktivniUi = this.projektData?.dum?.aktivni || 'P1';
            try {
                const u = JSON.parse(localStorage.getItem('kv3_dum') || '{}');
                if (typeof u.zobrazSpodek === 'boolean') this.zobrazSpodek = u.zobrazSpodek;
                if (typeof u.podlaziKopie === 'boolean') this.podlaziKopie = u.podlaziKopie;
            } catch (e) { /* poškozené nastavení = výchozí */ }
            const r = this.renderer;
            r.showSpodek = this.zobrazSpodek;
            r.renderDum = () => this._renderDum();
            r.zoomDum = () => this._renderDum();
            r.maskyRastru = () => this._maskyPodlazi(this.engine.dum.aktivni);
            r.podpisMasek = () => this._podpisMasek(this.engine.dum.aktivni);
            r.urovenMistnosti = (id) => this._urovenMistnosti(id);
            r.poRastru = (v, mapa) => this._sladPlochyMistnosti(this.engine.dum.aktivni, v, mapa, this.engine);
            r.jeStisk = () => !!this._pendingDrag;
            r.jeTah = () => this.isDraggingNode || this.isDraggingWall || this.isRotating || this.isDraggingOddelovac || !!this._domTah;
            this.engine.poNacteni = () => this._poNacteniKresby();
            // Kreslicí nástroj ukončí režim střechy a posun plánku
            this.$watch('nastroj', (v) => {
                if (v === 'vyber' || v === 'posun') return;
                this.posunPodkladu = false;
                if (this.rezimStrecha) this._strechaVypni();
            });
            // Vybraná místnost přepne nabídku nábytku na svou skupinu (katalog.js)
            this.$watch('_selectionTick', () => this._katalogSkupinaZVyberu?.());
            // Nastavení střechy otevřené ve 3D: po návratu do 2D patří k němu půdorys střechy
            this.$watch('rezim3d', (v) => {
                if (!v && this.podlaziUprava === 'strecha' && !this.rezimStrecha) this._strechaZapni();
            });
        },

        _ulozNastaveniDumu() {
            try {
                localStorage.setItem('kv3_dum', JSON.stringify({ zobrazSpodek: this.zobrazSpodek, podlaziKopie: this.podlaziKopie }));
            } catch (e) { /* soukromý režim: nastavení platí jen do obnovení stránky */ }
        },

        /** Po každém načtení kresby (Zpět, historie, přepnutí): srovnat podklad a panely s podlažím. */
        _poNacteniKresby() {
            if (!this.renderer) return;
            if (this.engine.dum.aktivni !== this._aktivniUi) {
                this._aktivniUi = this.engine.dum.aktivni;
                this._podkladProPodlazi();
            }
            this._selectionTick++;
        },

        _dumHlaska(text) {
            this.dumZprava = text;
            clearTimeout(this._dumZpravaCasovac);
            this._dumZpravaCasovac = setTimeout(() => { this.dumZprava = ''; }, 5000);
        },

        /** Úprava domu: překreslit, krok historie, uložit. */
        /** Ve 3D se scéna po změně přestaví (sloučeno do jednoho snímku); co se nezměnilo, zůstává. */
        _obnov3dPozdeji() {
            if (!this.rezim3d || this._obnova3d) return;
            this._obnova3d = setTimeout(() => {
                this._obnova3d = null;
                if (this.rezim3d) this._build3d();
            }, 30);
        },

        _poZmeneDomu(popis) {
            this.renderer.render();
            this.autoSave(popis);
            this._selectionTick++;
        },

        // ─── Podlaží ───────────────────────────────────────────
        /** Seznam pro přepínač, shora dolů. */
        get seznamPodlazi() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            if (!this.engine) return [];
            const d = this.engine.dum;
            const kory = this.engine.kotyPodlazi();
            return d.podlazi.map(p => ({
                id: p.id, nazev: p.nazev, typ: p.typ, aktivni: p.id === d.aktivni,
                kota: kory.get(p.id) ?? 0, vyska: p.vyska, strop: p.strop,
                svetla: this.engine.svetlaVyska(p),
                nepodeprene: this.nepodeprenePodlazi(p.id).size,
                viditelne3d: this._viditelne3d(p.id),
            })).reverse();
        },

        /** Co se právě edituje: název podlaží, nebo střecha. Pro lištu a hlavičku panelu. */
        get nazevAktivniho() {
            if (this.rezimStrecha) return preloz('ed_dum.strecha');
            return this.seznamPodlazi.find(p => p.aktivni)?.nazev || '';
        },

        /** Řádky panelu „Podlaží a plochy": podlaží shora dolů s plochou. */
        get radkyPodlazi() {
            const plochy = this.prehledPloch;
            return this.seznamPodlazi.map(p => {
                const r = plochy?.radky.find(x => x.id === p.id);
                return { ...p, plocha: r ? r.plocha : 0, zap: r ? r.zap : 0, pocet: r ? r.pocet : 0 };
            });
        },

        /** Řádek střechy: typ, nebo kód 'nastavit' (Blade s ním porovnává, text ukazuje strechaPopisText). */
        get strechaPopis() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            const st = this.engine?.dum.strecha;
            if (!st) return 'nastavit';
            return (TYPY_STRECH.find(t => t.id === st.typ) || TYPY_STRECH[0]).nazev;
        },

        /** Text řádku střechy: typ, nebo výzva k nastavení. */
        get strechaPopisText() {
            const p = this.strechaPopis;
            return p === 'nastavit' ? preloz('ed_dum.strecha_nastavit') : p;
        },

        prepniUpravuPodlazi(id) {
            this.podlaziUprava = this.podlaziUprava === id ? null : id;
            this.podlaziPridat = false;
        },

        get maSpodek() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return !!this.engine?.spodekAktivniho();
        },

        get maPodkrovi() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return !!this.engine && this.engine.dum.podlazi.some(p => p.typ === 'podkrovi');
        },

        formatKota(k) {
            const t = prelozCislo(Math.abs(k), 3);
            return (k > 0 ? '+' : k < 0 ? '−' : '±') + t;
        },

        _zrusRozkreslene() {
            this.schodyStart = null;
            this.licoBody = [];
            this.posunPodkladu = false;
            this._schodyNahled = null;
            this._oddelovacZrus?.();
            if (this.kreslimStenu || this.stenaUseky?.length) {
                this.zrusRozkreslenyUsek?.();
                this.kreslimStenu = false;
                this.stenaStart = null;
                this.stenaUseky = [];
                this.renderer.clearTemp?.();
            }
        },

        /** Klik na podlaží v přepínači: ve 2D přepne, ve 3D ho ukáže nebo skryje. */
        naPodlazi(id) {
            if (this.rezim3d) {
                this.skryte3d = this.skryte3d.includes(id) ? this.skryte3d.filter(x => x !== id) : [...this.skryte3d, id];
                this._nastavViditelnost3d();
                this._selectionTick++;
                return;
            }
            if (this.isDraggingWall || this.isDraggingNode || this.isDraggingOpening || this.isRotating || this._domTah) return;
            if (this.rezimStrecha && this.podlaziUprava === 'strecha') this.podlaziUprava = null;
            this.rezimStrecha = false;
            this.strechaHrana = null;
            if (id === this.engine.dum.aktivni) { this.renderer.render(); return; }
            this._zrusRozkreslene();
            this.engine.prepniPodlazi(id);
            this.renderer.clearSelection();
            this.renderer._mistnostiCache = null;
            this.renderer.render();
            this.obnovSeznamObjektu?.();
            // Přepnutí není úprava: bez kroku historie, jen se uloží, kde uživatel stojí
            this._stavKroku = JSON.stringify(this.engine.toJSON());
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = setTimeout(() => this.ulozit(), 2000);
            this._selectionTick++;
        },

        pridatPodlazi(kam) {
            this._zrusRozkreslene();
            this.rezimStrecha = false;
            this.engine.pushUndo();
            const p = this.engine.pridejPodlazi(kam, { kopie: this.podlaziKopie });
            if (!p) { this.engine.undoStack.pop(); return; }
            this.zmerFunkci?.('podlazi');
            if (kam === 'podkrovi' && !this.engine.dum.strecha) this.engine.dum.strecha = this._novaStrecha();
            this.renderer.clearSelection();
            this.renderer._mistnostiCache = null;
            this.podlaziPridat = false;
            this.podlaziUprava = null;
            this._poZmeneDomu(preloz('ed_dum.krok.nove_podlazi', { nazev: p.nazev }));
        },

        smazatPodlazi(id) {
            const p = this.engine.podlaziPodleId(id);
            if (!p || this.engine.dum.podlazi.length < 2) return;
            if (!confirm(preloz('ed_dum.smazat_podlazi_potvrzeni', { nazev: p.nazev }))) return;
            this._zrusRozkreslene();
            this.engine.pushUndo();
            this.engine.smazPodlazi(id);
            if (this.metadata?.podklady?.[id]) {
                const { [id]: _pryc, ...zbytek } = this.metadata.podklady;
                this.metadata = { ...this.metadata, podklady: zbytek };
            }
            this.renderer.clearSelection();
            this.renderer._mistnostiCache = null;
            this.podlaziUprava = null;
            this._poZmeneDomu(preloz('ed_dum.krok.smazani_podlazi', { nazev: p.nazev }));
        },

        /** Vlastnost podlaží: vyska a strop v m, nazev; kota v m posune celý dům. */
        setPodlazi(id, klic, hodnota) {
            const p = this.engine.podlaziPodleId(id);
            if (!p) return;
            this.engine.pushUndo();
            if (klic === 'nazev') {
                const n = String(hodnota || '').trim().slice(0, 30);
                p.vlastniNazev = n !== '';
                if (n) p.nazev = n; else this.engine.prejmenujPodlazi();
            } else if (klic === 'kota') {
                // Podlaží zůstávají na sobě: nová kóta jednoho posune všechna stejně
                if (hodnota === null || hodnota === '' || isNaN(hodnota)) { this.engine.undoStack.pop(); return; }
                const rozdil = hodnota - this.engine.kotaPodlazi(id);
                if (Math.abs(rozdil) < 0.0005) { this.engine.undoStack.pop(); return; }
                this.engine.dum.posunVysky = Math.round(((this.engine.dum.posunVysky || 0) + rozdil) * 1000) / 1000;
            } else if (klic === 'vyska') {
                if (!(hodnota > 0)) return;
                p.vyska = Math.round(omez(hodnota, 1.5, 12) * 100) / 100;
            } else if (klic === 'strop') {
                if (!(hodnota >= 0)) return;
                p.strop = Math.round(omez(hodnota, 0, 1.5) * 100) / 100;
            }
            this._poZmeneDomu(preloz('ed_dum.krok.podlazi', { nazev: p.nazev }));
        },

        /** Vrátí dům na výchozí výšku: podlaha 1.NP na kótě 0. */
        kotaNaNulu() {
            if (!this.engine.dum.posunVysky) return;
            this.engine.pushUndo();
            this.engine.dum.posunVysky = 0;
            this._poZmeneDomu(preloz('ed_dum.krok.vyska_domu'));
        },

        get posunDomu() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return this.engine?.dum.posunVysky || 0;
        },

        prepniSpodek() {
            this.zobrazSpodek = !this.zobrazSpodek;
            this.renderer.showSpodek = this.zobrazSpodek;
            this.renderer._spodekData = undefined;
            this.renderer.render();
            this._ulozNastaveniDumu();
        },

        /** Označí všechny stěny aktivního podlaží: tažení pak posune celý dům. */
        posunoutDum() {
            this.nastroj = 'vyber';
            this.rezimStrecha = false;
            this.renderer.setSelection([...this.engine.walls.keys()]);
            this._dumHlaska(preloz('ed_dum.hlaska.cely_dum_vybrany'));
        },

        // ─── Posun a otočení celého domu ───────────────────────
        // Volá se z tažení všech stěn aktivního podlaží. Objekty domu jedou živě,
        // ostatní podlaží a jejich podklady se přepočítají až po puštění.
        domPosunZaTahu(dx, dy) {
            if (!dx && !dy) return;
            const f = (p) => ({ x: p.x + dx, y: p.y + dy });
            this.engine.transformujObjektyDomu(f);
            this.engine.transformujDoplnkyAktivniho(f);
            this.renderer.posunSpodek(dx, dy);
            if (!this._domPosun) this._domPosun = { dx: 0, dy: 0 };
            this._domPosun.dx += dx;
            this._domPosun.dy += dy;
        },

        domPosunKonec() {
            if (!this._domPosun) return;
            const { dx, dy } = this._domPosun;
            this._domPosun = null;
            const f = (p) => ({ x: p.x + dx, y: p.y + dy });
            this.engine.transformujOstatniPodlazi(f);
            this._podkladyOstatnich((p) => { p.stredX = (p.stredX || 0) + dx; p.stredY = (p.stredY || 0) + dy; });
            this.renderer._mistnostiCache = null;
        },

        domOtocKonec(cx, cy, delta) {
            if (!delta) return;
            const cos = Math.cos(delta), sin = Math.sin(delta);
            const f = (p) => {
                const rx = p.x - cx, ry = p.y - cy;
                return { x: cx + rx * cos - ry * sin, y: cy + rx * sin + ry * cos };
            };
            const deg = delta * 180 / Math.PI;
            this.engine.transformujOstatniPodlazi(f, deg);
            this.engine.transformujObjektyDomu(f, delta);
            this.engine.transformujDoplnkyAktivniho(f);
            this._podkladyOstatnich((p) => {
                const q = f({ x: p.stredX || 0, y: p.stredY || 0 });
                p.stredX = q.x; p.stredY = q.y; p.uhel = (p.uhel || 0) + deg;
            });
            this.renderer._mistnostiCache = null;
        },

        // ─── Podklad po podlažích ──────────────────────────────
        _idPodkladu(id) {
            return id ?? this.engine?.dum.aktivni ?? this.projektData?.dum?.aktivni ?? 'P1';
        },

        /** Uložený podklad podlaží: první podlaží má dál metadata.podklad, ostatní metadata.podklady[id]. */
        _podkladUlozeny(id) {
            const i = this._idPodkladu(id);
            return i === 'P1' ? this.metadata?.podklad : this.metadata?.podklady?.[i];
        },

        _podkladZapis(podklad, id) {
            const i = this._idPodkladu(id);
            if (i === 'P1') this.metadata = { ...(this.metadata || {}), podklad };
            else this.metadata = { ...(this.metadata || {}), podklady: { ...(this.metadata?.podklady || {}), [i]: podklad } };
        },

        /** Po přepnutí podlaží: jeho podklad místo předchozího. */
        _podkladProPodlazi() {
            const u = this._podkladUlozeny();
            this.podklad = u && u.url ? this.podkladAdresy(u) : null;
            this.renderer.smazPodklad();
            if (this.podklad) this.renderer.nactiPodklad(this.podklad);
        },

        /** Upraví uložené podklady ostatních podlaží (posun domu) a uloží je. */
        _podkladyOstatnich(uprav) {
            let zmena = false;
            const aktivni = this.engine.dum.aktivni;
            for (const p of this.engine.dum.podlazi) {
                if (p.id === aktivni) continue;
                const u = this._podkladUlozeny(p.id);
                if (!u || !u.url) continue;
                const kopie = { ...u };
                uprav(kopie);
                this._podkladZapis(kopie, p.id);
                zmena = true;
            }
            if (zmena) this.podkladUloz?.();
        },

        /**
         * Srovná právě naimportované stěny (a podklad) na spodní podlaží. Hledá natočení
         * o násobek 90° a posun, při kterém nejvíc rohů obvodu sedne na rohy dole.
         */
        domSrovnejImport() {
            const dole = this.engine.spodekAktivniho();
            if (!dole || this.engine.walls.size === 0) return;
            const nosne = (e) => [...e.walls.values()].filter(w => w.typ === 'obvodova' || w.typ === 'nosna');
            const body = (e, st) => {
                const s = new Map();
                for (const w of st) for (const id of [w.nodeA, w.nodeB]) { const n = e.nodes.get(id); if (n) s.set(id, n); }
                return [...s.values()];
            };
            const stA = nosne(this.engine), stB = nosne(dole.engine);
            const A = body(this.engine, stA), B = body(dole.engine, stB);
            if (A.length < 3 || B.length < 3) {
                this._dumHlaska(preloz('ed_dum.hlaska.planek_rucne'));
                return;
            }
            const smerDomu = (e, st) => {
                // Převažující směr stěn modulo 90° (dvojitý úhel by nestačil, proto čtyřnásobný)
                let sx = 0, sy = 0;
                for (const w of st) {
                    const a = e.nodes.get(w.nodeA), b = e.nodes.get(w.nodeB);
                    if (!a || !b) continue;
                    const L = Math.hypot(b.x - a.x, b.y - a.y), u = Math.atan2(b.y - a.y, b.x - a.x);
                    sx += L * Math.cos(4 * u); sy += L * Math.sin(4 * u);
                }
                return Math.atan2(sy, sx) / 4;
            };
            const delta0 = smerDomu(dole.engine, stB) - smerDomu(this.engine, stA);
            const tol = 0.08 * this.engine.PX_PER_M;
            let nej = null;
            for (let k = 0; k < 4; k++) {
                const u = delta0 + k * Math.PI / 2;
                const cos = Math.cos(u), sin = Math.sin(u);
                const R = A.map(a => ({ x: a.x * cos - a.y * sin, y: a.x * sin + a.y * cos }));
                // Hlasování o posunu: dvojice bod nahoře × bod dole
                const hlasy = new Map();
                const krok = tol;
                for (const a of R) for (const b of B) {
                    const dx = b.x - a.x, dy = b.y - a.y;
                    const klic = Math.round(dx / krok) + ':' + Math.round(dy / krok);
                    const h = hlasy.get(klic) || { n: 0, dx: 0, dy: 0 };
                    h.n++; h.dx += dx; h.dy += dy;
                    hlasy.set(klic, h);
                }
                let top = null;
                for (const h of hlasy.values()) if (!top || h.n > top.n) top = h;
                if (!top) continue;
                let dx = top.dx / top.n, dy = top.dy / top.n, shod = 0;
                // Upřesnit: průměrná odchylka shodných rohů (hlasování zná posun jen na krok mřížky)
                for (let kolo = 0; kolo < 3; kolo++) {
                    let sx = 0, sy = 0;
                    shod = 0;
                    for (const a of R) {
                        let nejB = null, nejD = tol;
                        for (const b of B) {
                            const d = Math.hypot(b.x - a.x - dx, b.y - a.y - dy);
                            if (d <= nejD) { nejD = d; nejB = b; }
                        }
                        if (nejB) { sx += nejB.x - a.x; sy += nejB.y - a.y; shod++; }
                    }
                    if (!shod) break;
                    dx = sx / shod; dy = sy / shod;
                }
                if (!nej || shod > nej.shod) nej = { shod, u, dx, dy, k };
            }
            if (!nej || nej.shod < 3 || nej.shod < A.length * 0.4) {
                this._dumHlaska(preloz('ed_dum.hlaska.planek_nesrovnan'));
                return;
            }
            const cos = Math.cos(nej.u), sin = Math.sin(nej.u);
            const f = (p) => ({ x: p.x * cos - p.y * sin + nej.dx, y: p.x * sin + p.y * cos + nej.dy });
            this._transformujAktivni(f, nej.u);
            this._dumHlaska(preloz('ed_dum.hlaska.planek_srovnan', { rohu: prelozPocet('ed_dum.hlaska.shodnych_rohu', nej.shod) }));
        },

        /** Přepočítá kresbu aktivního podlaží a jeho podklad — jen při usazování importu. */
        _transformujAktivni(f, uhelRad, jenPodklad = false) {
            if (!jenPodklad) {
                for (const n of this.engine.nodes.values()) {
                    const q = f(n);
                    n.x = q.x; n.y = q.y;
                }
                this.engine.transformujDoplnkyAktivniho(f);
            }
            if (this.podklad) {
                const q = f({ x: this.podklad.stredX || 0, y: this.podklad.stredY || 0 });
                this.podkladZmena({ stredX: q.x, stredY: q.y, uhel: (this.podklad.uhel || 0) + uhelRad * 180 / Math.PI });
            }
        },

        /** Spustí ruční usazení plánku: dva body na plánku, dva odpovídající dole. */
        licoZacni() {
            if (!this.podklad) return;
            this._zrusRozkreslene();
            this.licoBody = [];
            this.nastroj = 'lico';
        },

        get licoKrok() {
            return [preloz('ed_dum.lico.prvni_bod'),
                preloz('ed_dum.lico.tentyz_bod'),
                preloz('ed_dum.lico.druhy_bod'),
                preloz('ed_dum.lico.tentyz_bod')][this.licoBody.length] || '';
        },

        _licoKlik(pos, e) {
            const lichy = this.licoBody.length % 2 === 1;
            let bod = { x: pos.x, y: pos.y };
            if (!this._bezMagnetu(e)) {
                const m = lichy ? this.engine.magnetSpodku(pos.x, pos.y, this._dosahMagnetu(18)) : null;
                if (m) bod = m;
            }
            this.licoBody = [...this.licoBody, bod];
            if (this.licoBody.length < 4) { this._renderDum(); return; }
            const [p1, q1, p2, q2] = this.licoBody;
            const dP = Math.hypot(p2.x - p1.x, p2.y - p1.y), dQ = Math.hypot(q2.x - q1.x, q2.y - q1.y);
            this.licoBody = [];
            this.nastroj = 'vyber';
            if (dP < 1 || dQ < 1) { this._dumHlaska(preloz('ed_dum.hlaska.body_blizko')); this._renderDum(); return; }
            const u = Math.atan2(q2.y - q1.y, q2.x - q1.x) - Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const cos = Math.cos(u), sin = Math.sin(u);
            const f = (p) => {
                const rx = p.x - p1.x, ry = p.y - p1.y;
                return { x: q1.x + rx * cos - ry * sin, y: q1.y + rx * sin + ry * cos };
            };
            this.engine.pushUndo();
            this._transformujAktivni(f, u, !(this.licoSeStenami && this.engine.walls.size > 0));
            const pomer = dQ / dP;
            this._dumHlaska(Math.abs(pomer - 1) > 0.01
                ? preloz('ed_dum.hlaska.planek_meritko', { procent: (Math.abs(pomer - 1) * 100).toFixed(1) })
                : preloz('ed_dum.hlaska.planek_usazen'));
            this._poZmeneDomu(preloz('ed_dum.krok.usazeni_planku'));
        },

        prepniPosunPodkladu() {
            this.posunPodkladu = !this.posunPodkladu;
            if (this.posunPodkladu) this.nastroj = 'vyber';
            this._selectionTick++;
        },

        // ─── Podepření nosných stěn ────────────────────────────
        /** Nosné a obvodové stěny podlaží bez podpory dole: mapa id stěny → nepodepřené úseky. */
        podepreniPodlazi(id) {
            const e = this.engine;
            const dole = e.podlaziPod(id);
            const eng = e.enginePodlazi(id);
            const zem = this._dosahNaZem(id);
            if ((!dole && !zem) || !eng) return new Map();
            const engDole = dole ? e.enginePodlazi(dole.id) : null;
            if (dole && !engDole) return new Map();
            if (!this._podepreniCache) this._podepreniCache = new Map();
            const c = this._podepreniCache.get(id);
            // Za tahu celého domu jede aktivní podlaží napřed a ostatní dojedou až po puštění.
            // Výpočet by mezitím hlásil nepodepřené všechny stěny.
            if (this._domPosun || (this.isRotating && this.renderer?.selectedWalls.size === this.engine.walls.size)) return c ? c.vysledek : new Map();
            const klic = eng.geoPodpis() + '#' + (engDole?.geoPodpis() ?? '') + '#' + (zem?.klic ?? '');
            if (c && c.klic === klic) return c.vysledek;
            const PX = e.PX_PER_M;
            const nosne = (en) => [...en.walls.values()].filter(w => w.typ === 'obvodova' || w.typ === 'nosna');
            const podpory = nosne(engDole || { walls: new Map() }).map(w => ({ a: engDole.nodes.get(w.nodeA), b: engDole.nodes.get(w.nodeB), pul: w.tloustka * PX / 2 })).filter(s => s.a && s.b);
            // Vedle sklepu stojí stěna na vlastních základech v zemině, podporu potřebuje jen nad sklepem.
            // Výš to neplatí: přesah patra nad nižším podlažím ve vzduchu opravdu visí.
            const obrysSklepu = dole?.typ === 'sklep' ? this._obrysPodlazi(dole.id)?.map(h => ({ x: h.a.x * PX, y: h.a.y * PX })) : null;
            const vysledek = new Map();
            const krok = 0.1 * PX;
            const tol = 0.06 * PX;
            for (const w of nosne(eng)) {
                const a = eng.nodes.get(w.nodeA), b = eng.nodes.get(w.nodeB);
                if (!a || !b) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L < krok) continue;
                const useky = [];
                let zacatek = null, chybiZaklad = false;
                const n = Math.ceil(L / krok);
                for (let i = 0; i <= n; i++) {
                    const t = i / n;
                    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
                    const naStene = podpory.some(s => {
                        const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y, L2 = dx * dx + dy * dy;
                        if (!L2) return false;
                        const u = omez(((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / L2, 0, 1);
                        return Math.hypot(p.x - s.a.x - dx * u, p.y - s.a.y - dy * u) <= s.pul + tol;
                    });
                    // Bez podlaží pod sebou nebo vedle sklepu rozhoduje zem. Bez znalosti terénu se bere, že stěna na zemi stojí.
                    const naZem = !dole || (obrysSklepu && !window.Zemina.bodVObrysu(p.x, p.y, obrysSklepu));
                    const naZemi = naZem && (!zem || zem.dosahne(p.x / PX, p.y / PX));
                    const ok = naStene || naZemi;
                    if (!ok && naZem) chybiZaklad = true;
                    if (!ok && zacatek === null) zacatek = t;
                    if ((ok || i === n) && zacatek !== null) {
                        const konec = ok ? (i - 1) / n : 1;
                        if ((konec - zacatek) * L >= 0.3 * PX) useky.push([zacatek, konec]);
                        zacatek = null;
                    }
                }
                if (useky.length) {
                    // Podpis úseků (konce v metrech po 10 cm): označení „staticky zajištěno“ platí jen pro tenhle problém,
                    // po posunu, prodloužení nebo jiné podpoře dole se upozornění vrátí
                    const bodM = (t) => ((a.x + (b.x - a.x) * t) / PX).toFixed(1) + ' ' + ((a.y + (b.y - a.y) * t) / PX).toFixed(1);
                    const podpis = useky.map(u => bodM(u[0]) + '-' + bodM(u[1])).join(',') + (chybiZaklad ? 'z' : '');
                    vysledek.set(w.id, { useky, delka: useky.reduce((s, u) => s + (u[1] - u[0]) * L, 0) / PX, chybiZaklad, podpis });
                }
            }
            this._podepreniCache.set(id, { klic, vysledek });
            return vysledek;
        },

        /**
         * Dosáhne podlaží v bodě na zem? Jen pro sklepy a 1.NP s parcelou, jinak terén neznáme.
         * @returns {{klic: string, dosahne: Function}|null} dosahne(x, y) v metrech
         */
        _dosahNaZem(id) {
            if (!this.maZaklady) return null;
            const d = this.engine.dum;
            const iNp = d.podlazi.indexOf(this._podlazi1NP());
            const i = d.podlazi.findIndex(p => p.id === id);
            if (i < 0 || i > iNp) return null;
            const typ = d.zaklady?.casti?.[id] || 'pasy';
            const dno = (this.engine.kotyPodlazi().get(id) ?? 0) - window.Zemina.tloustkaZakladu(typ, d.zaklady);
            const prodlouzit = this.zakladyHodnota('prodlouzit');
            const teren = this._terenDomu();
            const tn = teren.fn || (() => 0);
            return {
                klic: [typ, dno, prodlouzit, teren.nula].join('|'),
                dosahne: (x, y) => prodlouzit || typ === 'stavajici' || dno <= tn(x, y),
            };
        },

        /**
         * Nepodepřené stěny, které uživatel neoznačil jako staticky zajištěné. Označení drží podpis úseků,
         * po změně úseku (posun stěny, jiná podpora dole) se upozornění vrátí samo.
         */
        nepodeprenePodlazi(id) {
            const eng = this.engine.enginePodlazi(id);
            const vysledek = new Map();
            for (const [wid, v] of this.podepreniPodlazi(id)) {
                if (eng?.walls.get(wid)?.zajisteno !== v.podpis) vysledek.set(wid, v);
            }
            return vysledek;
        },

        podepreniSteny(wallId) {
            const dole = this.engine.podlaziPod(this.engine.dum.aktivni);
            const v = this.podepreniPodlazi(this.engine.dum.aktivni).get(wallId);
            if (!v) return null;
            const zajisteno = this.engine.walls.get(wallId)?.zajisteno === v.podpis;
            return { delka: v.delka, dole: dole?.nazev || '', chybiZaklad: v.chybiZaklad, zajisteno };
        },

        /** Uživatel označí nepodepřený úsek vybrané stěny jako staticky vyřešený (překlad, průvlak), nebo to zruší. */
        stenaZajistena(ano) {
            const w = this.engine.walls.get([...this.renderer.selectedWalls][0]);
            const v = w && this.podepreniPodlazi(this.engine.dum.aktivni).get(w.id);
            if (!v) return;
            this.engine.pushUndo();
            if (ano) w.zajisteno = v.podpis;
            else delete w.zajisteno;
            this.renderer.render();
            this.autoSave(preloz(ano ? 'ed_ui.krok_zajisteno' : 'ed_ui.krok_zajisteno_zrusit'));
            this._selectionTick++;
        },

        /** Rychlá akce: nepodepřenou stěnu změnit na příčku. */
        stenaNaPricku() {
            const w = this.engine.walls.get([...this.renderer.selectedWalls][0]);
            if (!w) return;
            this.setWallTyp('pricka');
        },

        /** Rychlá akce: přidat stejnou nosnou stěnu do podlaží pod tímto. */
        pridatPodperu() {
            const w = this.engine.walls.get([...this.renderer.selectedWalls][0]);
            const dole = this.engine.podlaziPod(this.engine.dum.aktivni);
            if (!w || !dole) return;
            const a = this.engine.nodes.get(w.nodeA), b = this.engine.nodes.get(w.nodeB);
            if (!a || !b) return;
            const PX = this.engine.PX_PER_M;
            const data = dole.data || { steny: [], otvory: [] };
            // Další volné číslo stěny v tom podlaží
            const n = (data.steny || []).reduce((m, s) => Math.max(m, parseInt(String(s.id).replace(/\D/g, ''), 10) || 0), 0) + 1;
            this.engine.pushUndo();
            dole.data = {
                ...data,
                steny: [...(data.steny || []), {
                    id: 'W' + n,
                    od: [a.x / PX, -a.y / PX], do: [b.x / PX, -b.y / PX],
                    tloustka: w.tloustka, typ: 'nosna',
                }],
            };
            this._dumHlaska(preloz('ed_dum.hlaska.pribyla_nosna', { nazev: dole.nazev }));
            this._poZmeneDomu(preloz('ed_dum.krok.podpera', { nazev: dole.nazev }));
        },

        // ─── Výškové plochy = úroveň podlahy místnosti ─────────
        // Záznam v dum.plochy patří místnosti (mistnost = id záznamu místnosti). Obrys `body` se bere
        // z rastru místností po každém jeho přepočtu (_sladPlochyMistnosti), uživatel nic nekreslí:
        // nastavuje úroveň v panelu místnosti (Libor 3. 11. 2026). Zvýšená se přenáší do vyšších
        // podlaží: tam ji vypíše panel místnosti (schody, vypnutí přenosu), klik přes ni patří místnosti.
        /** Plochy, které platí na podlaží: vlastní a zvýšené přenesené zespodu. */
        plochyNaPodlazi(id) {
            // Bez obrysu místnost právě není uzavřená
            return this.engine.dum.plochy.filter(a => Array.isArray(a.body) && a.body.length >= 3 && this._plochaPlati(a, id));
        },

        /** Vlastní plocha platí vždy, zvýšená i na vyšších podlažích, kde přenos není vypnutý. */
        _plochaPlati(a, id) {
            if (a.podlazi === id) return true;
            if (a.typ !== 'zvysena' || !a.prenos || (a.vypnuto || []).includes(id)) return false;
            const pp = this.engine.dum.podlazi;
            return pp.findIndex(p => p.id === a.podlazi) < pp.findIndex(p => p.id === id);
        },

        /** Plocha vlastní místnosti podlaží (null = podlaha v úrovni podlaží). */
        _plochaMistnosti(idMistnosti, podlazi = this.engine.dum.aktivni) {
            return this.engine.dum.plochy.find(a => a.podlazi === podlazi && a.mistnost === idMistnosti) || null;
        },

        /** Název místnosti, které plocha patří (i na jiném podlaží). */
        _nazevMistnostiPlochy(a) {
            const eng = this.engine.enginePodlazi(a.podlazi);
            return eng?.najdiMistnost?.(a.mistnost)?.nazev || '';
        },

        /**
         * Zvýšení přenesená z podlaží níž, která zasahují do místnosti: aspoň desetina plochy leží v ní
         * (mřížka vzorků). Plocha přes dvě místnosti se tak nabídne v obou, střed by stačil jen pro jednu.
         */
        prenesenePlochyMistnosti(idMistnosti) {
            const r = this.renderer;
            if (!r || !r.mistnostVBode) return [];
            const aktivni = this.engine.dum.aktivni;
            const VZORKU = 9;
            const out = [];
            for (const a of this.plochyNaPodlazi(aktivni)) {
                if (a.podlazi === aktivni) continue;
                const poly = this._plochaPoly(a);
                const xs = poly.map(p => p.x), ys = poly.map(p => p.y);
                const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
                let vPlose = 0, vMistnosti = 0;
                for (let i = 0; i < VZORKU; i++) {
                    for (let j = 0; j < VZORKU; j++) {
                        const b = { x: x0 + (x1 - x0) * (i + 0.5) / VZORKU, y: y0 + (y1 - y0) * (j + 0.5) / VZORKU };
                        if (!bodVPolygonu(b, poly)) continue;
                        vPlose++;
                        if (r.mistnostVBode(b.x, b.y) === idMistnosti) vMistnosti++;
                    }
                }
                if (!vPlose || vMistnosti / vPlose < 0.1) continue;
                out.push({ id: a.id, dh: a.dh || 0, domov: this.engine.podlaziPodleId(a.podlazi)?.nazev || '', mistnost: this._nazevMistnostiPlochy(a) });
            }
            return out;
        },

        /** Vlastní úroveň podlahy místnosti pro popisek. Přenesené zvýšení má štítek na své ploše. */
        _urovenMistnosti(idMistnosti) {
            if (!this.engine?.dum.plochy.length) return null;
            const a = this._plochaMistnosti(idMistnosti);
            return a ? { typ: a.typ, dh: a.dh || 0 } : null;
        },

        /**
         * Po přepočtu rastru podlaží: plochy jeho místností dostanou aktuální obrys (m, y nahoru).
         * Místnost bez uzavřené plochy má body = [] a plocha spí, dokud se místnost nevrátí.
         * @returns {boolean} změnil se některý obrys
         */
        _sladPlochyMistnosti(podlaziId, v, mapa, eng) {
            const R = window.MistnostiRastr;
            const plochy = this.engine.dum.plochy.filter(a => a.podlazi === podlaziId && a.mistnost);
            if (!plochy.length || !R || !v || !mapa) return false;
            const PX = eng.PX_PER_M;
            const stitekZaznamu = new Map();
            for (const [st, m] of mapa) stitekZaznamu.set(m.id, st);
            // Obrysy se trasují jednou na výsledek rastru (stejný objekt, dokud se kresba nezmění),
            // renderMistnosti běží při každém překreslení
            if (!this._obrysyZRastru) this._obrysyZRastru = new WeakMap();
            let hotove = this._obrysyZRastru.get(v);
            if (!hotove) { hotove = new Map(); this._obrysyZRastru.set(v, hotove); }
            let zmena = false;
            for (const a of plochy) {
                const st = stitekZaznamu.get(a.mistnost);
                let body = hotove.get(a.mistnost);
                if (body === undefined) {
                    body = st ? R.obrysMistnosti(v, st).map(p => [Math.round(p.x / PX * 1000) / 1000, Math.round(-p.y / PX * 1000) / 1000]) : [];
                    hotove.set(a.mistnost, body);
                }
                if (JSON.stringify(body) !== JSON.stringify(a.body || [])) {
                    a.body = body.map(b => [b[0], b[1]]);
                    zmena = true;
                    for (const s of this.engine.dum.schodiste) if (s.plocha === a.id) this._drzSchodyUPlochy(s);
                }
            }
            return zmena;
        },

        _plochaPoly(a) {
            const PX = this.engine.PX_PER_M;
            return a.body.map(b => ({ x: b[0] * PX, y: -b[1] * PX }));
        },

        /**
         * Nula otvoru: úroveň podlahy (m proti podlaží), od které se měří jeho parapet a výška.
         * Rozhoduje místnost po obou stranách stěny, exteriér se nepočítá. Mezi dvěma místnostmi platí
         * vyšší podlaha, níž by otvor narazil do zvýšené desky. Přenesené zvýšení z podlaží níž platí taky.
         */
        /** Výška podlahy místnosti nad úrovní podlaží v bodě půdorysu (px). */
        _nulaBodu(podlaziId, p) {
            let dh = 0;
            for (const q of this.plochyNaPodlazi(podlaziId)) {
                if (q.dh && (q.typ === 'zvysena' || q.typ === 'snizena') && bodVPolygonu(p, this._plochaPoly(q))) dh = q.dh;
            }
            return dh;
        },

        _nulaOtvoru(eng, podlaziId, wall, op, rastr) {
            const plochy = this.plochyNaPodlazi(podlaziId).filter(a => a.dh && (a.typ === 'zvysena' || a.typ === 'snizena'));
            if (!plochy.length) return 0;
            const a = eng.nodes.get(wall.nodeA), b = eng.nodes.get(wall.nodeB);
            if (!a || !b) return 0;
            const L = Math.hypot(b.x - a.x, b.y - a.y);
            if (L < 1) return 0;
            const PX = eng.PX_PER_M;
            const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
            const t = (op.pozice + op.sirka / 2) * PX, odstup = ((wall.tloustka || 0) / 2 + 0.06) * PX;
            const urovne = [];
            for (const zn of [1, -1]) {
                const p = { x: a.x + ux * t - uy * odstup * zn, y: a.y + uy * t + ux * odstup * zn };
                if (rastr && window.MistnostiRastr.stitekVBode(rastr, p.x, p.y) === 1) continue;   // venku
                let dh = 0;
                for (const q of plochy) if (bodVPolygonu(p, this._plochaPoly(q))) dh = q.dh;
                urovne.push(dh);
            }
            return urovne.length ? Math.max(...urovne) : 0;
        },

        /** Nula vybraného otvoru pro panel. */
        nulaVybranehoOtvoru(op) {
            const wall = this.engine.walls.get(op.wallId);
            if (!wall) return 0;
            const id = this.engine.dum.aktivni;
            return this._nulaOtvoru(this.engine, id, wall, op, this.renderer._mistnostiCache || this._rastrPodlazi(this.engine, id));
        },

        /** Posun úrovně podlahy v bodě aktivního podlaží (pro popisek místnosti). */
        _dhVBode(p) {
            if (!this.engine?.dum.plochy.length) return 0;
            let dh = 0;
            for (const a of this.plochyNaPodlazi(this.engine.dum.aktivni)) {
                if ((a.typ === 'zvysena' || a.typ === 'snizena') && bodVPolygonu(p, this._plochaPoly(a))) dh = a.dh || 0;
            }
            return dh;
        },

        /** Co se z plochy podlaží odečítá (rastr místností): bez podlahy, prostupy, schody zdola; v podkroví pod limitem výšky. */
        _maskyPodlazi(id) {
            const e = this.engine;
            const PX = e.PX_PER_M;
            const vyrezy = [];
            for (const a of e.dum.plochy) {
                if (a.podlazi === id && a.typ === 'bez_podlahy' && Array.isArray(a.body) && a.body.length >= 3) vyrezy.push(this._plochaPoly(a));
            }
            const kory = e.kotyPodlazi();
            for (const s of e.dum.schodiste) {
                if (s.doPodlazi !== id || s.odPodlazi === id) continue;   // schody v rámci podlaží nic neprorážejí
                const H = (kory.get(s.doPodlazi) ?? 0) - (kory.get(s.odPodlazi) ?? 0);
                vyrezy.push(schodyGeo(s, H, PX).obrys);
            }
            let podLimitem = [];
            const p = e.podlaziPodleId(id);
            if (p?.typ === 'podkrovi') {
                const st = this._strechaVypocet();
                if (st && !st.plocha) {
                    podLimitem = window.Strecha.podUrovni(st.plochy, PODKROVI_PLOCHA_OD).map(poly => poly.map(b => ({ x: b.x * PX, y: b.y * PX })));
                }
            }
            return { vyrezy, podLimitem };
        },

        _podpisMasek(id) {
            const e = this.engine;
            const d = e.dum;
            if (!d.plochy.length && !d.schodiste.length && !d.strecha) return '';
            const p = e.podlaziPodleId(id);
            return JSON.stringify([
                d.plochy.filter(a => a.podlazi === id && a.typ === 'bez_podlahy').map(a => a.body),
                d.schodiste.filter(s => s.doPodlazi === id && s.odPodlazi !== id),
                p?.typ === 'podkrovi' ? [d.strecha, p.vyska] : null,
            ]);
        },

        /** Bod z kurzoru přichycený na rohy a líce stěn (nástroj schodů). */
        _plochaBodZKurzoru(pos, e) {
            if (this._bezMagnetu(e)) return { x: pos.x, y: pos.y };
            const dosah = this._dosahMagnetu(14);
            const uzel = this.engine.snapPoint(pos.x, pos.y, dosah);
            if (uzel.magnetNodeId || uzel.magnetSpodek) return { x: uzel.x, y: uzel.y };
            const lic = this.engine.najdiUchytOddelovace(pos.x, pos.y, dosah);
            return lic ? { x: lic.bod.x, y: lic.bod.y } : { x: pos.x, y: pos.y };
        },

        /** Vybraná PŘENESENÁ plocha (vlastní plocha se vybírá jako místnost). */
        _vybranaPlocha() {
            const id = this.renderer ? [...this.renderer.selectedPlochy][0] : null;
            return id ? this.engine.dum.plochy.find(a => a.id === id) : null;
        },

        /** Panel místnosti: úroveň podlahy (typ, posun, přenos do vyšších podlaží). */
        urovenPanelMistnosti(m) {
            const a = this._plochaMistnosti(m.id);
            if (!a) return { typ: 'bezna', dh: 0, prenos: false, vyssi: [] };
            const pp = this.engine.dum.podlazi;
            const i = pp.findIndex(p => p.id === a.podlazi);
            return {
                typ: a.typ, dh: a.dh || 0, prenos: !!a.prenos,
                vyssi: pp.slice(i + 1).map(p => ({ id: p.id, nazev: p.nazev, zapnuto: !(a.vypnuto || []).includes(p.id) })),
            };
        },

        /**
         * Úroveň podlahy vybrané místnosti: typ (bezna = záznam pryč), dh v metrech, prenos.
         * Nová plocha dostane obrys místnosti hned z hotového rastru, další přepočty ho udržují.
         */
        setMistnostUroven(klic, hodnota) {
            const m = this._vybranaMistnost?.();
            if (!m) return;
            const d = this.engine.dum;
            let a = this._plochaMistnosti(m.id);
            // Schody k této ploše: délka před změnou, aby horní konec zůstal na místě
            const navazane = a ? d.schodiste.filter(s => this._plochaSchodu(s) === a) : [];
            const delkaPred = new Map(navazane.map(s => [s, schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M).delka]));
            const dhPred = a ? a.dh : 0;
            this.engine.pushUndo();
            if (klic === 'typ') {
                if (hodnota === 'bezna') {
                    if (a) d.plochy = d.plochy.filter(x => x !== a);
                } else {
                    if (!a) {
                        let n = 1;
                        while (d.plochy.some(x => x.id === 'A' + n)) n++;
                        a = { id: 'A' + n, podlazi: d.aktivni, mistnost: m.id, typ: hodnota, dh: 0, prenos: true, vypnuto: [], body: this._obrysMistnostiTed(m.id) };
                        d.plochy.push(a);
                    }
                    a.typ = hodnota;
                    if (hodnota === 'bez_podlahy') a.dh = 0;
                    else if (!a.dh) a.dh = hodnota === 'snizena' ? -0.3 : 0.3;
                    else a.dh = hodnota === 'snizena' ? -Math.abs(a.dh) : Math.abs(a.dh);
                }
            } else if (a && klic === 'dh') {
                const v = Math.abs(Number(hodnota) || 0);
                a.dh = Math.round((a.typ === 'snizena' ? -v : v) * 100) / 100;
            } else if (a && klic === 'prenos') {
                a.prenos = !!hodnota;
            }
            this._uklidSchodyPloch();
            for (const s of navazane) {
                if (!d.schodiste.includes(s)) continue;
                // Horní konec stojí. Mezi zvýšenou a sníženou se schody otočí kolem něj: ke zvýšené stoupají
                // zvenku, ze snížené ven zevnitř místnosti.
                const otocit = (dhPred > 0) !== (a.dh > 0);
                const d0 = delkaPred.get(s), d1 = schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M).delka;
                const k = s.tvar && s.tvar !== 'prime' ? 0 : (otocit ? d0 + d1 : d0 - d1);
                s.x += Math.cos(s.uhel || 0) * k;
                s.y -= Math.sin(s.uhel || 0) * k;
                if (otocit) s.uhel = (s.uhel || 0) + Math.PI;
                s.vyskaRucne = Math.abs(a.dh);
                this._drzSchodyUPlochy(s);
            }
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.uroven_podlahy'));
        },

        /** Obrys místnosti z posledního rastru (m, y nahoru); [] když rastr zrovna není. */
        _obrysMistnostiTed(idMistnosti) {
            const r = this.renderer, R = window.MistnostiRastr;
            const v = r?._mistnostiCache, mapa = r?._mistnostiStitky;
            if (!v || !mapa || !R) return [];
            const PX = this.engine.PX_PER_M;
            for (const [st, m] of mapa) {
                if (m.id === idMistnosti) return R.obrysMistnosti(v, st).map(p => [Math.round(p.x / PX * 1000) / 1000, Math.round(-p.y / PX * 1000) / 1000]);
            }
            return [];
        },

        /** Plocha podle id, jinak vybraná přenesená, jinak plocha vybrané místnosti. */
        _plochaPodleVolby(idPlochy) {
            if (idPlochy) return this.engine.dum.plochy.find(a => a.id === idPlochy) || null;
            const m = this._vybranaMistnost?.();
            return this._vybranaPlocha() || (m ? this._plochaMistnosti(m.id) : null);
        },

        /** Přenos zvýšení na konkrétní vyšší podlaží zapnout / vypnout. */
        prepniPrenos(idPodlazi, idPlochy = null) {
            const a = this._plochaPodleVolby(idPlochy);
            if (!a) return;
            this.engine.pushUndo();
            const v = new Set(a.vypnuto || []);
            if (v.has(idPodlazi)) v.delete(idPodlazi); else v.add(idPodlazi);
            a.vypnuto = [...v];
            this._uklidSchodyPloch();
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.prenos_vysky'));
        },

        // ─── Schodiště ─────────────────────────────────────────
        zacniSchody() {
            this._zrusRozkreslene();
            if (!this.engine.podlaziNad(this.engine.dum.aktivni)) {
                this._dumHlaska(preloz('ed_dum.hlaska.schody_bez_podlazi'));
                return;
            }
            this.nastroj = 'schody';
        },

        _vyskaMeziPodlazimi(s) {
            // Schody k výškové ploše mají její výšku, i když se později změní
            const a = s.plocha ? this.engine.dum.plochy.find(x => x.id === s.plocha) : null;
            if (a && a.dh) return Math.max(0.1, Math.abs(a.dh));
            if (typeof s.vyskaRucne === 'number') return Math.max(0.1, s.vyskaRucne);
            const k = this.engine.kotyPodlazi();
            return Math.max(0.5, (k.get(s.doPodlazi) ?? 0) - (k.get(s.odPodlazi) ?? 0));
        },

        /**
         * Směry, ke kterým se schody otáčejí: stěny aktivního a spodního podlaží, i vzdálené,
         * osy domu a vodorovná a svislá obrazovky. Vrací úhly v radiánech.
         */
        _smeryMagnetu() {
            const e = this.engine;
            const PX = e.PX_PER_M;
            const smery = [-((this.stage?.rotation() || 0) * Math.PI / 180), (e.smerRastru?.() ?? 0) * Math.PI / 180];
            const spodek = e.spodekAktivniho?.();
            for (const eng of [e, spodek?.engine]) {
                for (const w of eng ? eng.walls.values() : []) {
                    const a = eng.nodes.get(w.nodeA), b = eng.nodes.get(w.nodeB);
                    if (a && b && Math.hypot(b.x - a.x, b.y - a.y) >= 0.5 * PX) smery.push(Math.atan2(b.y - a.y, b.x - a.x));
                }
            }
            return smery;
        },

        /** Úhel přitažený k nejbližšímu ze směrů (po 90°), je-li do `tol` radiánů. */
        _magnetSmeru(u, tol, smery = this._smeryMagnetu()) {
            let nej = u, nejD = tol;
            for (const a of smery) {
                const z = Math.round((u - a) / (Math.PI / 2)) * (Math.PI / 2) + a;
                const d = Math.abs(u - z);
                if (d < nejD) { nejD = d; nej = z; }
            }
            return nej;
        },

        /** Směr schodů z tahu. */
        _schodySmer(od, kam) {
            const u = Math.atan2(kam.y - od.y, kam.x - od.x);
            return this._bezMagnetu() ? u : this._magnetSmeru(u, this._silaUhlu(10));
        },

        /** Dosah magnetu úhlu podle síly magnetu v nastavení (radiány). */
        _silaUhlu(stupnu) {
            return stupnu * Math.PI / 180 * Math.max(0, Math.min(100, Number(this.magnetSila ?? 100))) / 100;
        },

        /**
         * Hrana schodů na líc stěny při tažení: po jedné ose schodů nejbližší rovnoběžná hrana.
         * Vrací dorovnání posunu {x, y} v px.
         */
        _magnetSchodu(s, posunX, posunY) {
            const e = this.engine;
            const PX = e.PX_PER_M;
            const g = schodyGeo({ ...s, x: s.x + posunX / PX, y: s.y - posunY / PX }, this._vyskaMeziPodlazimi(s), PX);
            const tol = this._dosahMagnetu(12);
            const ux = Math.cos(s.uhel || 0), uy = Math.sin(s.uhel || 0);
            const os = [null, null];
            const obrysy = [...e.walls.keys()].map(id => e.getWallPolygon(id)).filter(p => p && p.length >= 3);
            g.obrys.forEach((p, i) => {
                const q = g.obrys[(i + 1) % g.obrys.length];
                const L = Math.hypot(q.x - p.x, q.y - p.y);
                if (L < 1) return;
                const ex = (q.x - p.x) / L, ey = (q.y - p.y) / L, nx = -ey, ny = ex;
                const osa = Math.abs(nx * ux + ny * uy) > 0.7 ? 0 : 1;
                for (const poly of obrysy) {
                    poly.forEach((a, j) => {
                        const c = poly[(j + 1) % poly.length];
                        const M = Math.hypot(c.x - a.x, c.y - a.y);
                        if (M < 1 || Math.abs(ex * (c.y - a.y) - ey * (c.x - a.x)) / M > MAX_ODCHYLKA_SCHODU) return;
                        const d = (a.x - p.x) * nx + (a.y - p.y) * ny;
                        if (Math.abs(d) >= tol) return;
                        const s0 = (a.x - p.x) * ex + (a.y - p.y) * ey, s1 = (c.x - p.x) * ex + (c.y - p.y) * ey;
                        if (Math.min(L, Math.max(s0, s1)) - Math.max(0, Math.min(s0, s1)) <= 0) return;
                        if (!os[osa] || Math.abs(d) < Math.abs(os[osa].d)) os[osa] = { d, x: nx * d, y: ny * d };
                    });
                }
            });
            return { x: (os[0]?.x || 0) + (os[1]?.x || 0), y: (os[0]?.y || 0) + (os[1]?.y || 0) };
        },

        /** Významné směry vybraných stěn při rotaci: aspoň pětina jejich celkové délky (po 90°). */
        _smeryRotace() {
            const skupiny = [];
            let celkem = 0;
            for (const w of this.engine.walls.values()) {
                const a = this._rotateNodeSnap?.get(w.nodeA), b = this._rotateNodeSnap?.get(w.nodeB);
                if (!a || !b) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y);
                if (L < 1) continue;
                celkem += L;
                const u = ((Math.atan2(b.y - a.y, b.x - a.x) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
                const blizko = (x) => { const d = Math.abs(x.u - u); return Math.min(d, Math.PI / 2 - d) < 1.5 * Math.PI / 180; };
                const sk = skupiny.find(blizko);
                if (sk) sk.delka += L; else skupiny.push({ u, delka: L });
            }
            return skupiny.filter(x => x.delka >= celkem * 0.2).map(x => x.u);
        },

        /** Rotace výběru: přitáhne významný směr stěn na vodorovnou a svislou obrazovky (ne na kompas). */
        _magnetRotace(delta) {
            const smery = this._rotateSmery || [];
            const rho = (this.stage?.rotation() || 0) * Math.PI / 180;
            let nej = null, nejD = this._silaUhlu(3);
            for (const a of smery) {
                const r = a + delta + rho;
                const d = Math.round(r / (Math.PI / 2)) * (Math.PI / 2) - r;
                if (Math.abs(d) < nejD) { nejD = Math.abs(d); nej = delta + d; }
            }
            return nej;
        },

        _schodyKlik(pos, e) {
            const bod = this._plochaBodZKurzoru(pos, e);
            if (!this.schodyStart) { this.schodyStart = bod; this._renderDum(); return; }
            const PX = this.engine.PX_PER_M;
            if (Math.hypot(bod.x - this.schodyStart.x, bod.y - this.schodyStart.y) < 0.1 * PX) return;
            const d = this.engine.dum;
            const nad = this.engine.podlaziNad(d.aktivni);
            if (!nad) return;
            let n = 1;
            while (d.schodiste.some(s => s.id === 'S' + n)) n++;
            this.engine.pushUndo();
            d.schodiste.push({
                id: 'S' + n, odPodlazi: d.aktivni, doPodlazi: nad.id, tvar: this.schodyTvar,
                x: this.schodyStart.x / PX, y: -this.schodyStart.y / PX,
                uhel: this._schodySmer(this.schodyStart, bod), sirka: 1.0, strana: 1,
            });
            this.schodyStart = null;
            this._schodyNahled = null;
            this.nastroj = 'vyber';
            this.renderer.setSelection([]);
            this.renderer.selectedSchody.add('S' + n);
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.schodiste'));
        },

/** Výšková plocha, ke které schody patří. Starší krátké schody bez vazby si ji najdou podle výšky. */
        _plochaSchodu(s) {
            const d = this.engine.dum;
            if (s.plocha) return d.plochy.find(a => a.id === s.plocha) || null;
            if (typeof s.vyskaRucne !== 'number' || s.odPodlazi !== s.doPodlazi) return null;
            const a = this.plochyNaPodlazi(s.odPodlazi).find(x => x.dh && Math.abs(Math.abs(x.dh) - s.vyskaRucne) < 0.001);
            if (a) s.plocha = a.id;
            return a || null;
        },

        /** Nejmenší posun schodů zpět na hranici jejich místnosti (px). Volné schody a spící plocha: nula. */
        _mezSchodu(s) {
            const a = this._plochaSchodu(s);
            if (!a || !Array.isArray(a.body) || a.body.length < 3) return { x: 0, y: 0 };
            const g = schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M);
            return hraniceSchodu(g.obrys, this._plochaPoly(a), Math.sign(a.dh || 0), { body: g.nastup, smer: g.zpet });
        },

        _drzSchodyUPlochy(s) {
            const m = this._mezSchodu(s);
            if (!m.x && !m.y) return;
            s.x += m.x / this.engine.PX_PER_M;
            s.y -= m.y / this.engine.PX_PER_M;
        },

        /** Schody k ploše, která na jejich podlaží už neplatí (vrácená úroveň, vypnutý přenos), nemají smysl. */
        _uklidSchodyPloch() {
            const d = this.engine.dum;
            const pred = d.schodiste.length;
            d.schodiste = d.schodiste.filter(s => {
                if (!s.plocha) return true;
                const a = d.plochy.find(x => x.id === s.plocha);
                return a && (a.typ === 'zvysena' || a.typ === 'snizena') && this._plochaPlati(a, s.odPodlazi);
            });
            if (d.schodiste.length < pred) this._dumHlaska(preloz('ed_dum.hlaska.schody_odstraneny'));
        },

        /**
         * Krátké schody na okraj plochy (podle id, vybrané přenesené, nebo plochy vybrané místnosti):
         * překonají její výškový rozdíl v rámci aktivního podlaží. Hrana se vybírá tak, aby za ní
         * byla jiná místnost (oddělovač, průchod), ne stěna; jinak nejdelší hrana.
         */
        schodkyNaPlochu(idPlochy = null) {
            const a = this._plochaPodleVolby(idPlochy);
            if (!a || !a.dh || !Array.isArray(a.body) || a.body.length < 3) return;
            const d = this.engine.dum;
            const PX = this.engine.PX_PER_M;
            let n = 1;
            while (d.schodiste.some(s => s.id === 'S' + n)) n++;
            const sx = a.body.reduce((v, b) => v + b[0], 0) / a.body.length, sy = a.body.reduce((v, b) => v + b[1], 0) / a.body.length;
            // Hrany od nejdelší; kolmice ven z plochy (stranu odliší těžiště)
            const hrany = a.body.map((b0, i) => {
                const b1 = a.body[(i + 1) % a.body.length];
                const mx = (b0[0] + b1[0]) / 2, my = (b0[1] + b1[1]) / 2;
                let nx = -(b1[1] - b0[1]), ny = b1[0] - b0[0];
                const L = Math.hypot(nx, ny) || 1;
                nx /= L; ny /= L;
                if (nx * (mx - sx) + ny * (my - sy) < 0) { nx = -nx; ny = -ny; }
                return { mx, my, nx, ny, L };
            }).sort((p, q) => q.L - p.L);
            const r = this.renderer;
            // Přednost má hrana bez stěny (oddělovač), pak hrana se sousední místností za stěnou
            const zaHranou = (dal) => hrany.find(h => {
                if (!r?.mistnostVBode) return false;
                const id = r.mistnostVBode((h.mx + h.nx * dal) * PX, -(h.my + h.ny * dal) * PX);
                return id && (a.podlazi !== d.aktivni || id !== a.mistnost);
            });
            const { mx, my, nx, ny } = zaHranou(0.06) || zaHranou(0.35) || hrany[0];
            const geo = schodyGeo({ x: 0, y: 0, uhel: 0, sirka: 1, tvar: 'prime' }, Math.abs(a.dh), PX);
            this.engine.pushUndo();
            // Výstup na hraně plochy: ke zvýšené stoupají zvenku, ze snížené ven zevnitř místnosti
            const smer = a.dh > 0 ? 1 : -1;
            const nove = {
                id: 'S' + n, odPodlazi: d.aktivni, doPodlazi: d.aktivni, plocha: a.id, tvar: 'prime', vyskaRucne: Math.abs(a.dh), sirka: 1.0, strana: 1,
                x: mx + nx * geo.delka * smer, y: my + ny * geo.delka * smer,
                uhel: Math.atan2(smer * ny, -smer * nx),
            };
            d.schodiste.push(nove);
            this._drzSchodyUPlochy(nove);
            this.renderer.setSelection([]);
            this.renderer.selectedSchody.add('S' + n);
            this._poZmeneDomu(preloz('ed_dum.krok.schody_mezi_urovnemi'));
        },

        _vybraneSchody() {
            const id = this.renderer ? [...this.renderer.selectedSchody][0] : null;
            return id ? this.engine.dum.schodiste.find(s => s.id === id) : null;
        },

        setSchody(klic, hodnota) {
            const s = this._vybraneSchody();
            if (!s) return;
            this.engine.pushUndo();
            if (klic === 'sirka') s.sirka = Math.round(omez(Number(hodnota) || 1, 0.6, 2.5) * 100) / 100;
            if (klic === 'tvar') { s.tvar = hodnota; delete s.casti; }
            if (klic === 'barva') s.barva = hodnota;
            // Prázdné pole vrátí výpočet z výšky mezi podlažími
            if (klic === 'vyska') { if (hodnota > 0) s.vyskaStupne = omez(hodnota / 1000, 0.1, 0.25); else delete s.vyskaStupne; }
            if (klic === 'naslap') { if (hodnota > 0) s.naslap = omez(hodnota / 1000, 0.15, 0.5); else delete s.naslap; }
            if (klic === 'strana') s.strana = (s.strana || 1) > 0 ? -1 : 1;
            if (klic === 'otoc') s.uhel = (s.uhel || 0) + Math.PI / 2;
            this._drzSchodyUPlochy(s);
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.schodiste'));
        },

        /** Počet stupňů v jedné části; zbytek se dopočítá do ostatních, 0 u další části = odpočívadlo. */
        setSchodyCast(i, hodnota) {
            const s = this._vybraneSchody();
            if (!s || !(hodnota >= 0)) return;
            const n = schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M).n;
            const c = castiSchodu(s, n);
            const v = Math.round(hodnota);
            this.engine.pushUndo();
            if (s.tvar === 'L') {
                const F = c[0] + c[1];
                s.casti = i === 0 ? [v, F - v] : [F - v, v];
            } else if (i === 1) {
                // Prostřední část: první a třetí zůstane v poměru. Odpočívadlo navíc je jeden stupeň.
                const F = Math.max(2, (v > 0 ? n - 3 : n - 2) - v);
                const a = Math.round(F * c[0] / Math.max(1, c[0] + c[2]));
                s.casti = [omez(a, 1, F), v];
            } else {
                const F = c[0] + c[2];
                s.casti = i === 0 ? [v, c[1]] : [F - v, c[1], v];
            }
            this._drzSchodyUPlochy(s);
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.schodiste'));
        },

        smazatSchody() {
            const s = this._vybraneSchody();
            if (!s) return;
            this.engine.pushUndo();
            this.engine.dum.schodiste = this.engine.dum.schodiste.filter(x => x !== s);
            this.renderer.clearSelection();
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz('ed_dum.krok.smazani_schodiste'));
        },

        // ─── Střecha ───────────────────────────────────────────
        /** Klik na řádek Střecha: ve 2D ukáže střechu v půdorysu, ve 3D ji ukáže nebo skryje. Bez střechy nabídne vytvoření. */
        prepniStrechu() {
            if (this.rezim3d) {
                if (this.engine.dum.strecha) {
                    this.zobrazStrechu3d = !this.zobrazStrechu3d;
                    this._nastavViditelnost3d();
                } else {
                    this.podlaziUprava = 'strecha';
                    this.podlaziPridat = false;
                }
                this._selectionTick++;
                return;
            }
            if (this.rezimStrecha) { this._strechaVypni(); return; }
            this._strechaZapni();
            if (!this.engine.dum.strecha) {
                this.podlaziUprava = 'strecha';
                this.podlaziPridat = false;
            }
        },

        /** Tužka u řádku Střecha: nastavení přímo v seznamu, ve 2D i ve 3D. */
        prepniUpravuStrechy() {
            this.podlaziPridat = false;
            if (this.podlaziUprava === 'strecha') { this.podlaziUprava = null; return; }
            this.podlaziUprava = 'strecha';
            if (!this.rezim3d && !this.rezimStrecha) this._strechaZapni();
        },

        _strechaZapni() {
            this._zrusRozkreslene();
            const horni = this.engine.horniPodlazi();
            if (horni.id !== this.engine.dum.aktivni) this.naPodlazi(horni.id);
            this.nastroj = 'vyber';
            this.renderer.clearSelection();
            this.rezimStrecha = true;
            this.renderer.render();
        },

        _strechaVypni() {
            this.rezimStrecha = false;
            this.strechaHrana = null;
            if (this.podlaziUprava === 'strecha') this.podlaziUprava = null;
            this.renderer.render();
        },

        /** Data pro nastavení střechy v seznamu podlaží. */
        get strechaPanel() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            if (!this.engine) return null;
            const st = this.engine.dum.strecha;
            if (!st) return { st: null };
            const v = this._strechaVypocet();
            const hrana = v && this.strechaHrana && !this.rezim3d ? (v.hrany || []).find(h => h.klic === this.strechaHrana) : null;
            let hranaData = null;
            if (hrana) {
                const q = window.Strecha.parametryHran([hrana], { zOkap: this._vyskaOkapu(), presah: st.presah, presahStit: st.presahStit, sklon: st.sklon })[0];
                hranaData = { klic: hrana.klic, typ: hrana.typ, sklon: hrana.sklon, presah: q.presah, z: q.z, barva: hrana.barva || null, rucne: !!(st.hrany || {})[hrana.klic] };
            }
            return {
                st,
                krytina: typKrytiny(st),
                barva: barvaKrytiny(st),
                zOkap: this._vyskaOkapu(),
                zMax: v && !v.plocha ? v.zMax : null,
                bezObrysu: !v,
                hrana: hranaData,
            };
        },

        _novaStrecha() {
            const t = TYPY_STRECH[0];
            return { typ: t.id, sklon: t.sklon, presah: 0.5, presahStit: 0.15, vyskaOkapu: null, krytina: 'taska', barva: BARVY_KRYTIN[0].barva, otocHreben: false, hrany: {} };
        },

        strechaVytvor() {
            this.engine.pushUndo();
            this.engine.dum.strecha = this._novaStrecha();
            this.zobrazStrechu3d = true;
            this._poZmeneDomu(preloz('ed_dum.strecha'));
            this.zmerFunkci?.('strecha');
        },

        setStrecha(klic, hodnota) {
            const st = this.engine.dum.strecha;
            if (!st) return;
            this.engine.pushUndo();
            this._barvaNahled = null;
            if (klic === 'typ') {
                st.typ = hodnota;
                st.hrany = {};          // předvolba nastaví hrany znovu
                const t = TYPY_STRECH.find(x => x.id === hodnota);
                if (t) st.sklon = t.sklon;
            } else if (klic === 'otocHreben') {
                st.otocHreben = !st.otocHreben;
                st.hrany = {};
            } else if (klic === 'sklon') {
                st.sklon = omez(Number(hodnota) || 1, 1, 75);
            } else if (klic === 'presah' || klic === 'presahStit') {
                st[klic] = omez(Number(hodnota) || 0, 0, 3);
            } else if (klic === 'vyskaOkapu') {
                st.vyskaOkapu = hodnota === null || hodnota === '' || isNaN(hodnota) ? null : omez(Number(hodnota), 0, 12);
            } else if (klic === 'presahStit') {
                st.presahStit = omez(Number(hodnota) || 0, 0, 3);
            } else if (klic === 'krytina') {
                st.barva = barvaKrytiny(st);
                st.krytina = hodnota;
            } else if (klic === 'barva') {
                st.barva = hodnota;
            }
            this._poZmeneDomu(preloz('ed_dum.strecha'));
        },

        setHranaStrechy(klic, nastav) {
            const st = this.engine.dum.strecha;
            if (!st) return;
            this.engine.pushUndo();
            this._barvaNahled = null;
            const hrana = { ...((st.hrany || {})[klic] || {}), ...nastav };
            for (const k of Object.keys(hrana)) if (hrana[k] === null || hrana[k] === undefined || hrana[k] === '' || Number.isNaN(hrana[k])) delete hrana[k];
            if (hrana.sklon !== undefined) hrana.sklon = omez(hrana.sklon, 1, 75);
            if (hrana.presah !== undefined) hrana.presah = omez(hrana.presah, 0, 3);
            if (hrana.vyskaOkapu !== undefined) hrana.vyskaOkapu = omez(hrana.vyskaOkapu, 0, 12);
            st.hrany = { ...(st.hrany || {}), [klic]: hrana };
            if (!Object.keys(hrana).length) { const { [klic]: _pryc, ...zbytek } = st.hrany; st.hrany = zbytek; }
            this._poZmeneDomu(preloz('ed_dum.hrana_strechy'));
        },

        // ─── Barvy ─────────────────────────────────────────────
        /** Barvy, které dům opravdu má, kromě prvku `mimo` (ten se právě upravuje). Nejde o historii. */
        barvyJinde(mimo) {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            const e = this.engine;
            if (!e) return [];
            const d = e.dum;
            const mapa = new Map();
            const pridej = (klic, hex, kde) => {
                if (klic === mimo || !hex) return;
                const k = hex.toLowerCase();
                if (!mapa.has(k)) mapa.set(k, new Set());
                mapa.get(k).add(kde);
            };
            for (const s of d.schodiste) pridej('schody:' + s.id, s.barva || BARVA_SCHODU, preloz('ed_dum.barvy.schody'));
            if (d.strecha) {
                pridej('strecha', barvaKrytiny(d.strecha), preloz('ed_dum.strecha'));
                for (const [k, h] of Object.entries(d.strecha.hrany || {})) pridej('hrana:' + k, h.barva, preloz('ed_dum.hrana_strechy'));
            }
            // Fasáda a otvory se počítají, jen když na domě opravdu jsou
            let steny = false;
            const skupiny = new Set();
            for (const p of d.podlazi) {
                const eng = e.enginePodlazi(p.id);
                if (!eng) continue;
                if (eng.walls.size) steny = true;
                for (const o of eng.openings.values()) {
                    const s = this.barvyOtvoru(o.typ);
                    const wall = eng.walls.get(o.wallId);
                    if (!s || !wall) continue;
                    skupiny.add(this._stranaVen(eng, wall, o, this._rastrPodlazi(eng, p.id)) ? s : this.barvaVnitrniho(o.typ));
                }
                for (const m of eng.mistnosti || []) if (m.podlaha) pridej('podlaha:' + m.id, barvaPodlahy(m.podlaha), preloz('ed_dum.barvy.podlaha', { nazev: m.nazev || preloz('ed_dum.barvy.mistnost') }));
            }
            if (steny) pridej('fasada', d.barvy.fasada, preloz('ed_dum.barvy.fasada'));
            const NAZVY = {
                okno: ['ed_dum.barvy.okna_venku', 'ed_dum.barvy.okna_uvnitr'],
                dvere: ['ed_dum.barvy.dvere_venku', 'ed_dum.barvy.dvere_uvnitr'],
                vrata: ['ed_dum.barvy.vrata_venku', 'ed_dum.barvy.vrata_uvnitr'],
            };
            for (const s of skupiny) {
                if (NAZVY[s]) {
                    pridej(s + 'Ven', d.barvy[s + 'Ven'], preloz(NAZVY[s][0]));
                    pridej(s + 'Dovnitr', d.barvy[s + 'Dovnitr'], preloz(NAZVY[s][1]));
                } else {
                    pridej(s, d.barvy[s], preloz(s === 'dvereVnitrni' ? 'ed_dum.barvy.dvere_vnitrni' : (s === 'oknoDovnitr' ? 'ed_dum.barvy.okna_uvnitr' : 'ed_dum.barvy.vrata_uvnitr')));
                }
            }
            return [...mapa].map(([hex, kde]) => ({ hex, kde: [...kde].join(', ') }));
        },

        /** Skupina barev podle typu otvoru; průchod žádnou výplň nemá. */
        barvyOtvoru(typ) {
            return { okno: 'okno', francouzske_okno: 'okno', dvere: 'dvere', garazova_vrata: 'vrata' }[typ] || null;
        },

        /** Otvor mezi místnostmi má jednu barvu. Vnitřní dveře mají vlastní, ostatní sdílí vnitřní stranu. */
        barvaVnitrniho(typ) {
            const s = this.barvyOtvoru(typ);
            return s === 'dvere' ? 'dvereVnitrni' : (s ? s + 'Dovnitr' : null);
        },

        /** Rastr místností podlaží pro určení exteriéru, přepočítá se až po změně kresby. */
        _rastrPodlazi(eng, id) {
            if (!this._rastrStrany) this._rastrStrany = new Map();
            const klic = eng.geoPodpis();
            let c = this._rastrStrany.get(id);
            if (!c || c.klic !== klic) {
                c = { klic, rastr: window.MistnostiRastr?.spocitej(eng, this._maskyPodlazi(id)) || null };
                this._rastrStrany.set(id, c);
            }
            return c.rastr;
        },

        /** Je otvor v líci domu? Stejná hodnota pro všechny vybrané, jinak null. */
        otvoryObvodove(openings) {
            const rastr = this.renderer._mistnostiCache || this._rastrPodlazi(this.engine, this.engine.dum.aktivni);
            const v = openings.map(o => {
                const wall = this.engine.walls.get(o.wallId);
                return !!wall && this._stranaVen(this.engine, wall, o, rastr) !== 0;
            });
            return v.every(x => x === v[0]) ? v[0] : null;
        },

        barvaDomu(klic) {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return this.engine?.dum.barvy[klic] || null;
        },

        /** Barva platná pro celý dům: fasáda všech podlaží, všechna okna, všechny dveře. */
        setBarvaDomu(klic, hex) {
            const d = this.engine.dum;
            if (!/^#[0-9a-fA-F]{6}$/.test(hex) || d.barvy[klic] === hex) return;
            this.engine.pushUndo();
            d.barvy[klic] = hex;
            this._poZmeneDomu(preloz('ed_dum.krok.barva_domu'));
        },

        /** Podlaha místnosti pro panel: bez nastavení vypadá jako hladká deska. */
        podlahaMistnosti(m) {
            return { dekor: dekorPodlahy(m.podlaha?.dekor).id, barva: barvaPodlahy(m.podlaha), vlastni: !!m.podlaha?.barva };
        },

        /** Za tahu posuvníkem se ve 3D mění jen materiály, krok historie vznikne po puštění. */
        nahledBarvy3d(klic, hex) {
            this._nastavBarvy3d({ [klic]: hex });
        },

        /** Barvy materiálů scény podle klíče v userData: fasáda a otvory z domu, podlaha jen při náhledu. */
        _nastavBarvy3d(prepis = {}) {
            const skupina = window._kk3d?.wallGroup;
            if (!skupina) return;
            const barvy = { ...this.engine.dum.barvy, ...prepis };
            skupina.traverse((o) => {
                if (!o.material) return;
                for (const m of [].concat(o.material)) {
                    const hex = barvy[m.userData?.barva];
                    if (hex) m.color.set(hex).multiplyScalar(m.userData.jas ?? 1);
                }
            });
        },

        /** Za tahu posuvníkem jen překreslí střechu, krok historie vznikne až po puštění. */
        nahledBarvyStrechy(hex, klic = null) {
            this._barvaNahled = { hex, klic };
            if (!this.rezim3d) { this._renderDum(); return; }
            const dum = window._kk3d?.dumSkupina;
            if (!dum) return;
            for (const o of dum.children) {
                const u = o.userData;
                if (u.krytina && (klic ? u.klic === klic : !u.vlastniBarva)) o.material.color.set(hex);
            }
        },

        /** Hrana znovu bere vše z nastavení celé střechy. */
        hranaJakoCelek(klic) {
            const st = this.engine.dum.strecha;
            if (!st || !(st.hrany || {})[klic]) return;
            this.engine.pushUndo();
            const { [klic]: _pryc, ...zbytek } = st.hrany;
            st.hrany = zbytek;
            this._poZmeneDomu(preloz('ed_dum.hrana_strechy'));
        },

        smazatStrechu() {
            this.engine.pushUndo();
            this.engine.dum.strecha = null;
            this.strechaHrana = null;
            this._poZmeneDomu(preloz('ed_dum.krok.smazani_strechy'));
        },

        /** Výška průsečíku střešní roviny s lícem stěny, nad podlahou horního podlaží (m). */
        _vyskaOkapu() {
            const d = this.engine.dum;
            const h = this.engine.horniPodlazi();
            if (d.strecha && typeof d.strecha.vyskaOkapu === 'number') return d.strecha.vyskaOkapu;
            return h.typ === 'podkrovi' ? 1.0 : h.vyska;
        },

        /**
         * Střecha spočítaná nad obrysem horního podlaží, v metrech nad jeho podlahou.
         * Výsledek se drží, dokud se nezmění obrys nebo nastavení.
         */
        _strechaVypocet() {
            const d = this.engine?.dum;
            if (!d || !d.strecha || !window.Strecha || !window.MistnostiRastr) return null;
            // Za tahu stěny stačí poslední výsledek, přepočet doběhne po puštění
            if ((this.isDraggingNode || this.isDraggingWall) && this._strechaCache) return this._strechaCache.vysledek;
            const horni = this.engine.horniPodlazi();
            const eng = this.engine.enginePodlazi(horni.id);
            if (!eng) return null;
            const klic = eng.geoPodpis() + '#' + JSON.stringify(d.strecha) + '#' + horni.typ + horni.vyska;
            if (this._strechaCache && this._strechaCache.klic === klic) return this._strechaCache.vysledek;
            let vysledek = null;
            const hrany = this._obrysPodlazi(horni.id);
            if (hrany && hrany.length >= 3) {
                const typy = window.Strecha.typyHran(d.strecha, hrany);
                const zOkap = this._vyskaOkapu();
                if (d.strecha.typ === 'plocha') {
                    vysledek = { plocha: true, hrany: typy, zOkap, plochy: [], stity: [], hrebeny: [] };
                } else {
                    try {
                        vysledek = window.Strecha.vypocet(typy, {
                            zOkap, presah: d.strecha.presah, presahStit: d.strecha.presahStit, sklon: d.strecha.sklon,
                        });
                        vysledek.hrany = typy;
                        vysledek.zOkap = zOkap;
                    } catch (e) {
                        window.zalogujChybu?.(e, 'Výpočet střechy', { typ: d.strecha.typ, hran: hrany.length });
                    }
                }
            }
            this._strechaCache = { klic, vysledek };
            return vysledek;
        },

        /** Hrany obrysu podlaží v metrech (orientace plátna), null když není uzavřené. */
        _obrysPodlazi(id) {
            const eng = this.engine.enginePodlazi(id);
            if (!eng || eng.walls.size === 0) return null;
            if (!this._obrysCache) this._obrysCache = new Map();
            const klic = eng.geoPodpis();
            const c = this._obrysCache.get(id);
            if (c && c.klic === klic) return c.hrany;
            const v = window.MistnostiRastr.spocitej(eng);
            let hrany = null;
            if (v && v.komponenty.length) {
                const PX = this.engine.PX_PER_M;
                const body = window.Strecha.obrysZRastru(v);
                hrany = window.Strecha.hranyObrysu(body, eng).map(h => ({
                    a: { x: h.a.x / PX, y: h.a.y / PX }, b: { x: h.b.x / PX, y: h.b.y / PX }, klic: h.klic,
                }));
            }
            this._obrysCache.set(id, { klic, hrany });
            return hrany;
        },

        /** Výška stropu podkroví nad bodem (m nad podlahou), pro ořez stěn ve 3D. */
        /** Výška střechy nad bodem pro stěny horního podlaží: žádná stěna neprojde střechou. */
        _stropPodlazi(podl) {
            if (podl.id !== this.engine.horniPodlazi().id) return null;
            const st = this._strechaVypocet();
            if (!st) return null;
            if (st.plocha) return () => st.zOkap;
            if (!st.plochy.length) return null;
            return (x, y) => window.Strecha.vyskaVBode(st.plochy, x, y);
        },

        /** Otisk střechy pro přestavbu stěn: krytina a barvy na ně nemají vliv. */
        _strechaProSteny() {
            const st = this.engine.dum.strecha;
            if (!st) return 'null';
            const { krytina: _k, barva: _b, hrany, ...zbytek } = st;
            const bezBarev = Object.fromEntries(Object.entries(hrany || {}).map(([k, { barva: _x, ...h }]) => [k, h]));
            return JSON.stringify({ ...zbytek, hrany: bezBarev });
        },

        /** Stěny na obrysu horního podlaží dosáhnou až pod střechu, jinak by pod vyšším okapem zůstala mezera. */
        _vnejsiStenyPodStrechou(podl) {
            if (podl.id !== this.engine.horniPodlazi().id) return null;
            const st = this._strechaVypocet();
            if (!st || st.plocha || !st.plochy.length) return null;
            return { steny: new Set((st.hrany || []).map(h => String(h.klic).split(':')[0])), zMax: st.zMax };
        },

        // ─── Inspektor ─────────────────────────────────────────
        inspektorDum() {
            if (!this.engine || !this.renderer) return null;
            const r = this.renderer;
            const s = this._vybraneSchody();
            if (s) {
                const g = schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M);
                const od = this.engine.podlaziPodleId(s.odPodlazi), kam = this.engine.podlaziPodleId(s.doPodlazi);
                return {
                    kind: 'schodiste', count: 1, id: s.id, tvar: s.tvar || 'prime', sirka: s.sirka, casti: g.casti,
                    barva: s.barva || BARVA_SCHODU, vyskaRucne: !!s.vyskaStupne, naslapRucne: !!s.naslap,
                    n: g.n, v: g.v, b: g.b, delka: g.delka, pohodlne: g.pohodlne,
                    trasa: s.odPodlazi === s.doPodlazi ? preloz('ed_dum.schody_mezi_urovnemi', { nazev: od?.nazev || '' }) : (od?.nazev || '?') + ' → ' + (kam?.nazev || '?'),
                };
            }
            // Přenesená zvýšená plocha bez uzavřené místnosti pod ní (jinak ji vypíše panel místnosti)
            const a = this._vybranaPlocha();
            if (a) {
                const aktivni = this.engine.dum.aktivni;
                return {
                    kind: 'plocha', count: 1, id: a.id, typ: a.typ, dh: a.dh || 0,
                    naPodlazi: a.podlazi === aktivni,
                    domov: this.engine.podlaziPodleId(a.podlazi)?.nazev || '',
                    mistnost: this._nazevMistnostiPlochy(a),
                    zapnuto: !(a.vypnuto || []).includes(aktivni),
                };
            }
            return null;
        },

        // ─── Vstup z plátna ────────────────────────────────────
        /** @returns {boolean} true = vstup vyřízen, editor ho dál nezpracovává */
        domStisk(pos, e, hit) {
            if (this.rezimStrecha) {
                if (hit && hit.type === 'hranaStrechy') {
                    this.strechaHrana = hit.klic;
                    this.podlaziUprava = 'strecha';
                    this.panelOpen.plochy = true;
                } else {
                    this.strechaHrana = null;
                }
                this.renderer.render();
                return true;
            }
            if (this.posunPodkladu) {
                if (this.podklad) this._domTah = { typ: 'podklad', last: { ...pos }, start: { ...pos }, posun: false };
                return true;
            }
            if (this.nastroj === 'schody' || this.nastroj === 'lico' || this.nastroj === 'katalog') return true;
            if (this.nastroj !== 'vyber') return false;
            if (hit.type === 'schodyOtoc') {
                const s = this.engine.dum.schodiste.find(x => x.id === hit.id);
                if (!s) return true;
                const g = schodyGeo(s, this._vyskaMeziPodlazimi(s), this.engine.PX_PER_M);
                const xs = g.obrys.map(p => p.x), ys = g.obrys.map(p => p.y);
                const stred = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
                this._domTah = { typ: 'schodyOtoc', id: hit.id, stred, u0: s.uhel || 0, x0: s.x, y0: s.y, a0: Math.atan2(pos.y - stred.y, pos.x - stred.x), last: { ...pos }, start: { ...pos }, posun: false };
                return true;
            }
            if (hit.type === 'schodiste') {
                this.renderer.setSelection([]);
                this.renderer.selectedSchody.add(hit.id);
                this.renderer.render();
                this._domTah = { typ: 'schody', id: hit.id, last: { ...pos }, start: { ...pos }, posun: false };
                return true;
            }
            if (hit.type === 'plocha') {
                // Sem dojde jen přenesená plocha bez uzavřené místnosti pod ní (viz hit test v rendereru)
                this.renderer.setSelection([]);
                this.renderer.selectedPlochy.add(hit.id);
                this.renderer.render();
                return true;
            }
            return false;
        },

        domPohyb(pos, e) {
            const t = this._domTah;
            if (t) {
                if (!t.posun) {
                    if (Math.hypot(pos.x - t.start.x, pos.y - t.start.y) < 5 / (this.stage.scaleX() || 1)) return true;
                    t.posun = true;
                    if (t.typ !== 'podklad') this.engine.pushUndo();
                }
                const PX = this.engine.PX_PER_M;
                const dx = pos.x - t.last.x, dy = pos.y - t.last.y;
                t.last = { ...pos };
                if (t.typ === 'podklad') {
                    this.podkladPosun(dx, dy);
                    return true;
                }
                if (t.typ === 'schody') {
                    const s = this.engine.dum.schodiste.find(x => x.id === t.id);
                    if (s) {
                        // Rozdíl proti myši se nese dál, jinak by se od zachycené stěny nedalo odtrhnout
                        const chciX = dx + (t.odchylka?.x || 0), chciY = dy + (t.odchylka?.y || 0);
                        const m = this._bezMagnetu(e) ? { x: 0, y: 0 } : this._magnetSchodu(s, chciX, chciY);
                        let posunX = chciX + m.x, posunY = chciY + m.y;
                        // Schody k výškové ploše kloužou po její hranici (platí i s Altem, není to magnet)
                        const mez = this._mezSchodu({ ...s, x: s.x + posunX / PX, y: s.y - posunY / PX });
                        posunX += mez.x;
                        posunY += mez.y;
                        s.x += posunX / PX;
                        s.y -= posunY / PX;
                        t.odchylka = { x: chciX - posunX, y: chciY - posunY };
                    }
                } else if (t.typ === 'schodyOtoc') {
                    const s = this.engine.dum.schodiste.find(x => x.id === t.id);
                    if (s) {
                        const otoceni = Math.atan2(pos.y - t.stred.y, pos.x - t.stred.x) - t.a0;
                        let u = t.u0 + Math.atan2(Math.sin(otoceni), Math.cos(otoceni));   // bez skoku přes ±180°
                        if (!this._bezMagnetu(e)) u = this._magnetSmeru(u, this._silaUhlu(5));
                        const d = u - t.u0;
                        const rx = t.x0 * PX - t.stred.x, ry = -t.y0 * PX - t.stred.y;
                        s.uhel = u;
                        s.x = (t.stred.x + rx * Math.cos(d) - ry * Math.sin(d)) / PX;
                        s.y = -(t.stred.y + rx * Math.sin(d) + ry * Math.cos(d)) / PX;
                        this._drzSchodyUPlochy(s);
                    }
                }
                this._renderDum();
                return true;
            }
            if (this.nastroj === 'katalog') {
                this.katalogPohyb?.(pos, e);
                return false;
            }
            if (this.nastroj === 'schody') {
                this._kurzorDum = this._plochaBodZKurzoru(pos, e);
                this._renderDum();
                return false;
            }
            return false;
        },

        domPusteni() {
            const t = this._domTah;
            if (!t) return false;
            this._domTah = null;
            if (!t.posun) return true;
            if (t.typ === 'podklad') { this.podkladUloz?.(); return true; }
            this.renderer._mistnostiCache = null;
            this._poZmeneDomu(preloz(t.typ === 'schody' ? 'ed_dum.krok.posun_schodiste' : 'ed_dum.krok.otoceni_schodiste'));
            return true;
        },

        domKlik(pos, e) {
            if (this.rezimStrecha || this.posunPodkladu) return true;
            if (this.nastroj === 'katalog') { this.katalogKlik?.(pos, e); return true; }
            if (this.nastroj === 'schody') { this._schodyKlik(pos, e); return true; }
            if (this.nastroj === 'lico') { this._licoKlik(pos, e); return true; }
            return false;
        },

        domEsc() {
            if (this.katalogEsc?.()) return true;
            if (this.schodyStart || this.licoBody.length || this.posunPodkladu
                    || this.nastroj === 'schody' || this.nastroj === 'lico') {
                this._zrusRozkreslene();
                this.nastroj = 'vyber';
                this._renderDum();
                return true;
            }
            if (this.rezimStrecha) { this.prepniStrechu(); return true; }
            return false;
        },

        domEnter() {
            return false;
        },

        domSmazVybrane() {
            if (this._vybraneSchody()) { this.smazatSchody(); return true; }
            return false;
        },

        // ─── 2D kresba domu ────────────────────────────────────
        _renderDum() {
            const r = this.renderer;
            if (!r || !r.plochyLayer) return;
            r.plochyLayer.destroyChildren();
            r.schodyLayer.destroyChildren();
            r.strechaLayer.destroyChildren();
            const s = this.stage.scaleX() || 1;
            const css = getComputedStyle(document.documentElement);
            const primary = css.getPropertyValue('--c-primary').trim() || '#e8590c';
            const textBarva = css.getPropertyValue('--c-primary-text').trim() || primary;
            const PX = this.engine.PX_PER_M;
            const aktivni = this.engine.dum.aktivni;
            const popisek = (vrstva, x, y, text, barva = '#374151', vel = 11) => {
                const t = new Konva.Text({ x, y, text, fontSize: r.velikostPopisku(vel), fill: barva, fontFamily: 'Nunito, system-ui, sans-serif', fontStyle: '600', listening: false, align: 'center', rotation: -(this.stage.rotation() || 0) });
                t.offsetX(t.width() / 2);
                t.offsetY(t.height() / 2);
                vrstva.add(t);
            };
            const body = (poly) => poly.flatMap(p => [p.x, p.y]);

            // ── Podkroví: šrafa pod 1,2 m, čáry 1,2 · 1,8 · 2,3 m ──
            const horni = this.engine.horniPodlazi();
            if (horni.id === aktivni && horni.typ === 'podkrovi') {
                const st = this._strechaVypocet();
                if (st && !st.plocha && st.plochy.length) {
                    const pod = window.Strecha.podUrovni(st.plochy, PODKROVI_PLOCHA_OD).map(poly => poly.map(b => ({ x: b.x * PX, y: b.y * PX })));
                    // Jen uvnitř obrysu domu: přesah střechy v půdorysu podkroví nemá co dělat
                    const obrysPx = st.hrany.map(h => ({ x: h.a.x * PX, y: h.a.y * PX }));
                    const vPodkrovi = new Konva.Group({
                        listening: false,
                        clipFunc: (k) => {
                            obrysPx.forEach((q, i) => (i ? k.lineTo(q.x, q.y) : k.moveTo(q.x, q.y)));
                            k.closePath();
                        },
                    });
                    r.plochyLayer.add(vPodkrovi);
                    vPodkrovi.add(new Konva.Shape({
                        listening: false,
                        sceneFunc: (k) => {
                            const c = k._context;
                            for (const poly of pod) srafa(c, poly, 10 / s, 'rgba(107,114,128,.45)', 1 / s);
                        },
                    }));
                    const rady = [{ z: PODKROVI_PLOCHA_OD, t: prelozCislo(PODKROVI_PLOCHA_OD, 2) + ' m', dash: [] }, { z: 1.8, t: prelozCislo(1.8, 2) + ' m', dash: [6, 4] }, { z: 2.3, t: prelozCislo(2.3, 2) + ' m', dash: [2, 4] }];
                    for (const ra of rady) {
                        const usecky = window.Strecha.izocara(st.plochy, ra.z);
                        let nej = null;
                        for (const u of usecky) {
                            const L = Math.hypot(u[1].x - u[0].x, u[1].y - u[0].y);
                            if (!nej || L > nej.L) nej = { L, u };
                            vPodkrovi.add(new Konva.Line({
                                points: [u[0].x * PX, u[0].y * PX, u[1].x * PX, u[1].y * PX],
                                stroke: '#6b7280', strokeWidth: 1, strokeScaleEnabled: false, dash: ra.dash, listening: false,
                            }));
                        }
                        if (nej) popisek(vPodkrovi, (nej.u[0].x + nej.u[1].x) / 2 * PX, (nej.u[0].y + nej.u[1].y) / 2 * PX - r.velikostPopisku(8), ra.t, '#4b5563', 10);
                    }
                }
            }

            // ── Výškové plochy: vlastní místnosti podlaží jen tónem nebo šrafou (klik patří místnosti,
            //    popisek má místnost), přenesené zespodu čárkovaně se štítkem, klik přes ně patří místnosti ──
            for (const a of this.plochyNaPodlazi(aktivni)) {
                const poly = this._plochaPoly(a);
                const vlastni = a.podlazi === aktivni;
                const vybrana = r.selectedPlochy.has(a.id);
                const barva = a.typ === 'snizena' ? '#2563eb' : a.typ === 'zvysena' ? primary : '#4b5563';
                if (a.typ === 'bez_podlahy') {
                    r.plochyLayer.add(new Konva.Shape({
                        listening: false,
                        sceneFunc: (k) => { srafa(k._context, poly, 14 / s, 'rgba(75,85,99,.55)', 1 / s); },
                    }));
                } else {
                    const tvar = new Konva.Line({ points: body(poly), closed: true, fill: barva, opacity: vlastni ? 0.16 : 0.1, listening: !vlastni });
                    tvar.setAttr('_plochaId', a.id);
                    r.plochyLayer.add(tvar);
                }
                if (!vlastni) {
                    r.plochyLayer.add(new Konva.Line({
                        points: body(poly), closed: true, stroke: vybrana ? primary : barva, strokeWidth: vybrana ? 2.5 : 1.5,
                        strokeScaleEnabled: false, dash: [6, 4], listening: false,
                    }));
                    const sx = poly.reduce((v, p) => v + p.x, 0) / poly.length, sy = poly.reduce((v, p) => v + p.y, 0) / poly.length;
                    const stitek = preloz('ed_dum.plocha_stitek', { vyska: (a.dh > 0 ? '+' : '') + Math.round((a.dh || 0) * 100), podlazi: this.engine.podlaziPodleId(a.podlazi)?.nazev || preloz('ed_dum.podlazi_niz') });
                    popisek(r.plochyLayer, sx, sy + r.velikostPopisku(24), stitek, vybrana ? primary : textBarva, 10);
                }
            }

            // ── Schodiště: odkud se na ně díváme, říká šipka se štítkem a hloubka ──
            // Ze spodního podlaží stupně nahoru (bez výplně). Z horního pohled dolů do otvoru:
            // obrys přerušovaně a stupně tím tmavší, čím jsou hlouběji.
            const kresliSchody = (st, vybrane, nahled = false) => {
                const H = this._vyskaMeziPodlazimi(st);
                const g = schodyGeo(st, H, PX);
                const dole = st.odPodlazi === aktivni;
                const barva = vybrane ? primary : '#374151';
                // Bez bílé výplně: půdorys pod schody zůstává vidět (Libor 3. 11. 2026); průhledná výplň je jen pro klik
                const hit = new Konva.Line({
                    points: body(g.obrys), closed: true, fill: 'rgba(0,0,0,0.001)',
                    stroke: barva, strokeWidth: vybrane ? 2.5 : 1.5, strokeScaleEnabled: false,
                    dash: dole ? [] : [6, 4], listening: !nahled,
                });
                hit.setAttr('_schodisteId', st.id);
                r.schodyLayer.add(hit);
                for (const u of g.stupne) {
                    r.schodyLayer.add(new Konva.Line({
                        points: body(u.poly), closed: true, stroke: '#6b7280', strokeWidth: 0.75, strokeScaleEnabled: false, listening: false,
                        ...(dole ? {} : { fill: `rgba(55,65,81,${(0.06 + 0.42 * (1 - u.z / H)).toFixed(3)})` }),
                    }));
                }
                const sipka = dole ? g.sipka : [...g.sipka].reverse();
                r.schodyLayer.add(new Konva.Arrow({
                    points: body(sipka), stroke: barva, fill: barva, strokeWidth: 1.5, strokeScaleEnabled: false,
                    pointerLength: 8 / s, pointerWidth: 7 / s, listening: false,
                }));
                const hlava = dole ? `↑ ${g.n} × ${Math.round(g.v * 1000)}/${Math.round(g.b * 1000)}` : preloz('ed_dum.schody_dolu');
                // Štítek vedle obrysu (na obrazovce): na stupních by se pral se šipkou, u krátkých schodů je širší
                // než ony. Pod schody, a když tam leží název místnosti, nad nimi nebo po stranách.
                const tr = r.stage.getAbsoluteTransform();
                const naObrazovce = g.obrys.map(p => tr.point(p));
                const minX = Math.min(...naObrazovce.map(q => q.x)), maxX = Math.max(...naObrazovce.map(q => q.x));
                const minY = Math.min(...naObrazovce.map(q => q.y)), maxY = Math.max(...naObrazovce.map(q => q.y));
                const pulS = hlava.length * 3.2 + 2, pulV = 8, stredX = (minX + maxX) / 2, stredY = (minY + maxY) / 2;
                const obsazene = r.mistnostiLayer.find('Text').map(n => n.getClientRect());
                const volne = (q) => !obsazene.some(o => q.x + pulS > o.x && q.x - pulS < o.x + o.width && q.y + pulV > o.y && q.y - pulV < o.y + o.height);
                const kandidati = [{ x: stredX, y: maxY + 11 }, { x: stredX, y: minY - 11 }, { x: maxX + pulS + 4, y: stredY }, { x: minX - pulS - 4, y: stredY }];
                const { x: sx, y: sy } = tr.copy().invert().point(kandidati.find(volne) || kandidati[0]);
                popisek(r.schodyLayer, sx, sy, hlava, barva, 10);
                if (vybrane && !nahled) {
                    const k = new Konva.Circle({ x: g.uchop.x, y: g.uchop.y, radius: 9 / s, fill: '#ffffff', stroke: primary, strokeWidth: 1.5, strokeScaleEnabled: false });
                    k.setAttr('_schodyOtocId', st.id);
                    r.schodyLayer.add(k);
                    popisek(r.schodyLayer, g.uchop.x, g.uchop.y, '↻', primary, 12);
                }
            };
            for (const st of this.engine.dum.schodiste) {
                if ((st.odPodlazi === aktivni || st.doPodlazi === aktivni) && !this.jeObjektSkryty({ type: 'schody', id: st.id })) kresliSchody(st, r.selectedSchody.has(st.id));
            }
            if (this.nastroj === 'schody') {
                const c = this._kurzorDum;
                if (this.schodyStart && c && this.engine.podlaziNad(aktivni)) {
                    kresliSchody({
                        id: '_nahled', odPodlazi: aktivni, doPodlazi: this.engine.podlaziNad(aktivni).id, tvar: this.schodyTvar,
                        x: this.schodyStart.x / PX, y: -this.schodyStart.y / PX,
                        uhel: this._schodySmer(this.schodyStart, c), sirka: 1.0, strana: 1,
                    }, false, true);
                } else if (c) {
                    r.schodyLayer.add(new Konva.Circle({ x: c.x, y: c.y, radius: 4 / s, fill: primary, listening: false }));
                }
            }
            // Body při usazování plánku
            this.licoBody.forEach((p, i) => {
                r.schodyLayer.add(new Konva.Circle({ x: p.x, y: p.y, radius: 5 / s, fill: i % 2 ? '#2563eb' : primary, stroke: '#ffffff', strokeWidth: 1 / s, listening: false }));
            });

            // ── Nepodepřené nosné stěny: červená šrafa přes úsek, oříznutá tvarem stěny ──
            const chyba = css.getPropertyValue('--c-error').trim() || primary;
            // Upozornění editoru: do exportu a sdíleného půdorysu nepatří
            const nepodeprene = this._kresbaProExport ? new Map() : this.nepodeprenePodlazi(aktivni);
            for (const [id, info] of nepodeprene) {
                const w = this.engine.walls.get(id);
                const a = w && this.engine.nodes.get(w.nodeA), b = w && this.engine.nodes.get(w.nodeB);
                const tvar = w && this.engine.getWallPolygon(id);
                if (!a || !b || !tvar || tvar.length < 3) continue;
                const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
                const pul = w.tloustka * PX;    // pás je širší než stěna, přesný tvar dá ořez
                for (const [t0, t1] of info.useky) {
                    // Konec u rohu sahá až do pokosu stěny
                    const z0 = t0 <= 0 ? -pul : t0 * L, z1 = t1 >= 1 ? L + pul : t1 * L;
                    const bod = (z, n) => ({ x: a.x + ux * z - uy * n, y: a.y + uy * z + ux * n });
                    const pas = [bod(z0, pul), bod(z1, pul), bod(z1, -pul), bod(z0, -pul)];
                    const skupina = new Konva.Group({
                        listening: false,
                        clipFunc: (k) => {
                            tvar.forEach((q, i) => (i ? k.lineTo(q.x, q.y) : k.moveTo(q.x, q.y)));
                            k.closePath();
                        },
                    });
                    skupina.add(new Konva.Shape({
                        listening: false,
                        sceneFunc: (k) => {
                            const c = k._context;
                            c.beginPath();
                            pas.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
                            c.closePath();
                            c.fillStyle = '#ffffff';
                            c.fill();
                            srafa(c, pas, 7 / s, chyba, 2.5 / s);
                        },
                    }));
                    r.schodyLayer.add(skupina);
                }
            }

            // ── Střecha v půdorysu ──
            if (this.rezimStrecha) this._renderStrecha2d(r, s, primary, popisek);

            r.plochyLayer.batchDraw();
            r.schodyLayer.batchDraw();
            r.strechaLayer.batchDraw();
        },

        _renderStrecha2d(r, s, primary, popisek) {
            const PX = this.engine.PX_PER_M;
            const st = this.engine.dum.strecha;
            if (!st) return;
            const v = this._strechaVypocet();
            if (!v) return;
            const nahled = this._barvaNahled;
            const krytina = nahled && !nahled.klic ? nahled.hex : barvaKrytiny(st);
            for (const pl of v.plochy) {
                const hranaPlochy = v.hrany.find(h => h.index === pl.hrana) || {};
                const barva = nahled && nahled.klic === hranaPlochy.klic ? nahled.hex : (hranaPlochy.barva || krytina);
                for (const t of pl.troj) {
                    r.strechaLayer.add(new Konva.Line({
                        points: t.flatMap(b => [b.x * PX, b.y * PX]), closed: true,
                        fill: barva, opacity: 0.22, listening: false,
                    }));
                }
            }
            if (v.plocha) {
                r.strechaLayer.add(new Konva.Line({
                    points: v.hrany.flatMap(h => [h.a.x * PX, h.a.y * PX]), closed: true, fill: krytina, opacity: 0.22, listening: false,
                }));
            }
            for (const h of v.hrebeny) {
                r.strechaLayer.add(new Konva.Line({
                    points: [h[0].x * PX, h[0].y * PX, h[1].x * PX, h[1].y * PX],
                    stroke: '#1f2937', strokeWidth: 1.5, strokeScaleEnabled: false, listening: false,
                }));
            }
            if (v.okraj) {
                r.strechaLayer.add(new Konva.Line({
                    points: v.okraj.flatMap(b => [b.x * PX, b.y * PX]), closed: true,
                    stroke: '#6b7280', strokeWidth: 1, strokeScaleEnabled: false, dash: [4, 4], listening: false,
                }));
            }
            // Hrany obrysu: klikací místo je všude modře čárkované, okap a štít odliší popisek
            for (const h of v.hrany) {
                const vybrana = this.strechaHrana === h.klic;
                const cara = new Konva.Line({
                    points: [h.a.x * PX, h.a.y * PX, h.b.x * PX, h.b.y * PX],
                    stroke: '#2563eb', strokeWidth: vybrana ? 6 : 3.5,
                    strokeScaleEnabled: false, dash: [8, 5], hitStrokeWidth: 16 / s,
                });
                cara.setAttr('_hranaStrechy', h.klic);
                r.strechaLayer.add(cara);
                popisek(r.strechaLayer, (h.a.x + h.b.x) / 2 * PX, (h.a.y + h.b.y) / 2 * PX,
                    h.typ === 'okap' ? h.sklon + '°' : preloz('ed_dum.stit'), '#1d4ed8', 11);
            }
        },

        // ─── Přehled ploch ─────────────────────────────────────
        get prehledPloch() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            if (!this.engine || !window.MistnostiRastr) return null;
            if (this.renderer?.jeTah?.() && this._prehledPosledni) return this._prehledPosledni;
            if (!this._plochyCache) this._plochyCache = new Map();
            let celkem = 0, celkemZap = 0;
            const radky = [];
            for (const p of [...this.engine.dum.podlazi].reverse()) {
                const eng = this.engine.enginePodlazi(p.id);
                let plocha = 0, zap = 0, pocet = 0;
                if (eng && eng.walls.size) {
                    const klic = eng.geoPodpis() + '#' + this._podpisMasek(p.id);
                    let c = this._plochyCache.get(p.id);
                    if (p.id === this.engine.dum.aktivni && this.renderer?._mistnostiCache && this.renderer._mistnostiPodpis === klic) {
                        // Aktivní podlaží má rastr hotový z kresby, druhý výpočet by jen brzdil
                        c = { klic, komponenty: this.renderer._mistnostiCache.komponenty };
                        this._plochyCache.set(p.id, c);
                    } else if (!c || c.klic !== klic) {
                        const R = window.MistnostiRastr;
                        const v = R.spocitej(eng, this._maskyPodlazi(p.id));
                        // I neaktivní podlaží udrží obrysy svých výškových ploch (přenos nahoru, 3D)
                        if (v && p.id !== this.engine.dum.aktivni) {
                            this._sladPlochyMistnosti(p.id, v, eng.sladMistnosti(v.komponenty, (x, y) => R.stitekVBode(v, x, y)), eng);
                        }
                        c = { klic, komponenty: v ? v.komponenty : [] };
                        this._plochyCache.set(p.id, c);
                    }
                    for (const k of c.komponenty) {
                        plocha += k.plocha_m2;
                        zap += k.zapocitatelna_m2 ?? k.plocha_m2;
                        pocet++;
                    }
                }
                celkem += plocha; celkemZap += zap;
                radky.push({ id: p.id, nazev: p.nazev, plocha, zap, pocet, podkrovi: p.typ === 'podkrovi' });
            }
            this._prehledPosledni = { radky, celkem, celkemZap, ruzne: Math.abs(celkem - celkemZap) >= 0.05 };
            return this._prehledPosledni;
        },

        // ─── Základy a zemina ──────────────────────────────────
        /** Základy jsou jen s parcelou. Podmínka je na jednom místě, země bez katastru ji později rozšíří. */
        get maZaklady() {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return !!this.engine && this.katastrParcely.length > 0 && !!this._obrysPodlazi(this._podlazi1NP().id);
        },

        /** Podlaží, od kterého se počítá ±0 terénu domu. */
        _podlazi1NP() {
            const pp = this.engine.dum.podlazi;
            return pp.find(p => p.typ !== 'sklep') || pp[0];
        },

        /**
         * Terén pro výpočet: výšková data, jinak rovina na stávající ±0.
         * @returns {{fn: Function|null, nula: number|null}} fn = výška vůči ±0, nula = ±0 v m n.m.
         */
        _terenDomu() {
            const id = this._podlazi1NP().id;
            const prof = this.vyskovyProfil;
            const stred = this.renderer?._fixedWgsCenter;
            // Rozkreslený dům bez obrysu stojí ve 3D podle svých uzlů
            const eng = [this.engine.enginePodlazi(id), this.engine].find(e => e?.nodes.size);
            if (!eng || !prof?.body?.length || !stred) return { fn: null, nula: null };
            const klic = eng.geoPodpis();
            if (this._terenCache?.prof !== prof || this._terenCache.klic !== klic) {
                const abs = this._terenCache?.prof === prof ? this._terenCache.abs : window.Zemina.terenZProfilu(prof.body, stred);
                const PX = this.engine.PX_PER_M;
                const nula = window.Zemina.nulaTerenu([...eng.nodes.values()].map(n => ({ x: n.x / PX, y: n.y / PX })), abs);
                const fn = (x, y) => abs(x, y) - nula;
                fn.odhad = abs.odhad;
                this._terenCache = { prof, klic, abs, fn, nula };
            }
            return this._terenCache;
        },

        /** Části domu zdola nahoru: sklepy a 1.NP. Přesah vyššího patra se nepodkopává. */
        _castiZakladu() {
            const d = this.engine.dum, PX = this.engine.PX_PER_M;
            const kory = this.engine.kotyPodlazi();
            const casti = [];
            for (const p of d.podlazi) {
                const hrany = this._obrysPodlazi(p.id);
                if (hrany) {
                    const eng = this.engine.enginePodlazi(p.id);
                    const steny = [];
                    for (const w of eng.walls.values()) {
                        if (w.typ !== 'obvodova' && w.typ !== 'nosna') continue;
                        const a = eng.nodes.get(w.nodeA), b = eng.nodes.get(w.nodeB);
                        if (a && b) steny.push({ a: { x: a.x / PX, y: a.y / PX }, b: { x: b.x / PX, y: b.y / PX } });
                    }
                    casti.push({
                        // Obrys z keše je za proxy Alpine, výpočet se ho ptá statisíckrát
                        id: p.id, nazev: p.nazev, kota: kory.get(p.id) ?? 0, steny, obrys: hrany.map(h => ({ x: h.a.x, y: h.a.y })),
                        typ: d.zaklady?.casti?.[p.id] || 'pasy',
                    });
                }
                if (p.typ !== 'sklep') break;
            }
            return casti;
        },

        /** Bilance zeminy. Přepočítá se jen po změně vstupů, za tahu zůstává poslední. */
        get zemina() {
            if (!this.maZaklady) return null;
            if (this.renderer?.jeTah?.() && this._zeminaCache) return this._zeminaCache.vysledek;
            const casti = this._castiZakladu();
            const teren = this._terenDomu();
            const klic = JSON.stringify([
                casti.map(c => [c.id, c.typ, c.kota, this.engine.enginePodlazi(c.id).geoPodpis()]),
                this.engine.dum.zaklady, teren.nula,
            ]);
            if (this._zeminaCache?.klic !== klic) {
                this._zeminaCache = { klic, vysledek: window.Zemina.spocitej(casti, teren.fn, this.engine.dum.zaklady) };
            }
            return this._zeminaCache.vysledek;
        },

        get zakladyPopis() {
            const z = this.zemina;
            if (!z) return '';
            const vykop = z.vykopek.vykopano + z.ornice.vykopano;
            if (z.bezZakladu <= 0.5) return preloz('ed_dum.zaklady.vykop', { objem: this.m3(vykop) });
            return vykop >= 0.5 ? preloz('ed_dum.zaklady.chybi_vykop', { objem: this.m3(vykop) }) : preloz('ed_dum.zaklady.chybi');
        },

        /** Upozornění v panelu Základů: které části domu na zem nedosáhnou. */
        get zakladyChybi() {
            const casti = (this.zemina?.casti || []).filter(c => c.bezZakladu > 0.5);
            if (!casti.length) return '';
            return preloz('ed_dum.zaklady.chybi_upozorneni', { seznam: casti.map(c => c.nazev + ' ' + prelozCislo(c.bezZakladu, 1) + ' m²').join(', ') });
        },

        /** Kolik prodloužený základ vystupuje nad terén, typicky na dolní straně svahu. */
        get zakladNadTerenemPopis() {
            const v = this.zemina?.zakladNadTerenem || 0;
            return v >= 0.05 ? preloz('ed_dum.zaklady.nad_terenem', { vyska: prelozCislo(v, 2) }) : '';
        },

        get terenPopis() {
            const t = this.maZaklady ? this._terenDomu() : null;
            if (typeof t?.nula !== 'number') return preloz('ed_dum.zaklady.teren_rovina');
            return preloz('ed_dum.zaklady.teren_vyska', { vyska: prelozCislo(t.nula, 2) });
        },

        /** Řádky bloku Materiály. Záporný přebytek znamená, že zemina chybí. */
        get materialyRadky() {
            const z = this.zemina;
            if (!z) return [];
            const radek = (id, klicChybi, klicNavic, v) => v.prebytek < -0.5
                ? { id, nazev: preloz(klicChybi), rostly: this.m3(-v.prebytek), nakypreny: '—' }
                : { id, nazev: preloz(klicNavic), rostly: this.m3(v.prebytek), nakypreny: this.m3(v.prebytekNakypreny) };
            return [
                radek('vykopek', 'ed_dum.zaklady.vykopek_chybi', 'ed_dum.zaklady.vykopek_navic', z.vykopek),
                radek('ornice', 'ed_dum.zaklady.ornice_chybi', 'ed_dum.zaklady.ornice_navic', z.ornice),
            ];
        },

        m3(v) {
            return preloz('ed_dum.zaklady.objem', { objem: Math.round(Math.max(0, v)) });
        },

        zakladyHodnota(klic) {
            // eslint-disable-next-line no-unused-vars
            const _tick = this._selectionTick;
            return this.engine?.dum.zaklady?.[klic] ?? window.Zemina.VYCHOZI[klic];
        },

        /** Záznam vznikne s první parcelou, tehdy dostane dům i výchozí výšku nad terénem. Neukládá se sám. */
        _zalozZaklady() {
            const d = this.engine?.dum;
            if (!d || d.zaklady || !this.katastrParcely.length) return;
            d.zaklady = {};
            if (!d.posunVysky) d.posunVysky = window.Zemina.NAD_TERENEM;
            this._selectionTick++;
        },

        setZaklady(klic, hodnota) {
            if (typeof hodnota !== 'number' || isNaN(hodnota) || hodnota < 0) return;
            this.engine.pushUndo();
            this.engine.dum.zaklady = { ...(this.engine.dum.zaklady || {}), [klic]: Math.round(hodnota * 1000) / 1000 };
            this._poZmeneDomu(preloz('ed_dum.krok.zaklady'));
        },

        /** Volba základů, která není číslo: čím sypat pod dům, prodloužení základu. */
        setVolbuZakladu(klic, hodnota) {
            this.engine.pushUndo();
            this.engine.dum.zaklady = { ...(this.engine.dum.zaklady || {}), [klic]: hodnota };
            this._poZmeneDomu(preloz('ed_dum.krok.zaklady'));
        },

        setTypZakladu(id, typ) {
            this.engine.pushUndo();
            const z = this.engine.dum.zaklady || {};
            this.engine.dum.zaklady = { ...z, casti: { ...(z.casti || {}), [id]: typ } };
            this._poZmeneDomu(preloz('ed_dum.krok.zaklady'));
        },

        /** Výška nad terénem je kóta 1.NP, proto jde stejnou cestou jako její přepsání. */
        setNadTerenem(hodnota) {
            this.setPodlazi(this._podlazi1NP().id, 'kota', hodnota);
        },

        // ─── 3D domu ───────────────────────────────────────────
        _viditelne3d(id) {
            return !this.skryte3d.includes(id);
        },

        /** Hodnoty děr v terénu (výkop a vnitřek domu), sdílené materiály terénu a jeho mřížky. Terén se staví znovu, díry zůstávají. */
        _uniformyJamy() {
            const _3d = window._kk3d;
            if (!_3d.jamaUniformy) _3d.jamaUniformy = window.Teren3d.uniformyJamy();
            if (!_3d.vnitrekUniformy) _3d.vnitrekUniformy = window.Teren3d.uniformyVnitrku();
            return _3d.jamaUniformy;
        },

        /** Parcely jako polygony ve scéně: x na východ, z na jih. */
        _parcelyVeScene() {
            const stred = this.renderer._fixedWgsCenter, M = 111320, cosLat = Math.cos(stred.lat * Math.PI / 180);
            return (this.katastrParcely || []).filter(p => p.polygon_wgs84?.length >= 3)
                .map(p => p.polygon_wgs84.map(([lat, lon]) => [(lon - stred.lon) * M * cosLat, -(lat - stred.lat) * M]));
        },

        /** Do shaderu terénu přidá díry: nekreslí se nad výkopem ani uvnitř domu nad jeho podlahou. */
        _materialSJamou(shader) {
            const u = this._uniformyJamy();
            window.Teren3d.shaderVnitrku(shader, window._kk3d.vnitrekUniformy);
            window.Teren3d.shaderJamy(shader, u);
        },

        /**
         * Vypočítaný výkop ve 3D pod skrytými podlažími, která jsou v terénu (sklepy a 1.NP). Pod viditelnými
         * leží terén až na domě, vyšší patra nehrají roli. Síť se přestaví jen po změně výpočtu, výběru nebo terénu.
         */
        _jama3d() {
            const _3d = window._kk3d;
            if (!_3d?.scene) return;
            const u = this._uniformyJamy();
            const vsechny = this.maZaklady ? this._castiZakladu() : [];
            const casti = vsechny.filter(c => !this._viditelne3d(c.id));
            const viditelne = vsechny.filter(c => this._viditelne3d(c.id));
            const nula = this._terenDomu().nula;
            const yNula = _3d.terrainHeights && typeof nula === 'number' ? nula - _3d.terrainMinH : 0;
            window.Teren3d.nastavVnitrek(_3d.vnitrekUniformy, viditelne.map(c => ({ obrys: c.obrys, uroven: yNula + c.kota - 0.01 })));
            const ukazat = casti.length > 0;
            if (ukazat && this.zemina) {
                const klic = this._zeminaCache.klic + '|' + casti.map(c => c.id).join() + '|' + viditelne.map(c => c.id).join() + '|' + (_3d.terrain?.uuid || 'rovina');
                if (_3d.jama?.userData.klic !== klic) {
                    if (_3d.jama) {
                        _3d.scene.remove(_3d.jama);
                        _3d.jama.geometry.dispose();
                        _3d.jama = null;
                    }
                    const j = window.Zemina.jama(casti, this._terenDomu().fn, this.engine.dum.zaklady, this._uhelSten(vsechny));
                    if (j) {
                        u.uJama.value.dispose();
                        _3d.jama = window.Teren3d.sitJamy(this._bunkyJamy(j, viditelne, yNula));
                        _3d.jama.userData.klic = klic;
                        _3d.scene.add(_3d.jama);
                        window.Svetlo3d.prekresliStiny(_3d.renderer);
                    }
                }
            }
            const teren = this.zobrazTeren3d, mrizka = teren && this.zobrazMrizkuTerenu;
            const jamaVidet = !!(teren && ukazat && _3d.jama);
            if (_3d.jama) _3d.jama.visible = jamaVidet;
            window.Teren3d.nastavJamu(u, jamaVidet ? _3d.jama : null);
            // Přepínače Terén a Mřížka terénu, tudy jde každá stavba scény i změna viditelnosti
            for (const o of [_3d.terrain, _3d.ground, _3d.maskaZeme]) if (o) o.visible = teren;
            if (_3d.gridLines) _3d.gridLines.visible = mrizka;
            if (_3d.grid) _3d.grid.visible = mrizka && !jamaVidet;
        },

        /** Převažující směr stěn (radiány, 0–90°): podle něj se natočí mřížka jámy, aby hrany nebyly zubaté. */
        _uhelSten(casti) {
            const vahy = new Map();
            let nej = 0, uhel = 0;
            for (const c of casti) {
                for (const w of c.steny) {
                    const dx = w.b.x - w.a.x, dy = w.b.y - w.a.y;
                    const k = ((Math.atan2(dy, dx) % (Math.PI / 2)) + Math.PI / 2) % (Math.PI / 2);
                    const klic = Math.round(k * 180 / Math.PI) % 90;
                    const v = (vahy.get(klic) || 0) + Math.hypot(dx, dy);
                    vahy.set(klic, v);
                    if (v > nej) { nej = v; uhel = k; }
                }
            }
            return uhel;
        },

        /** Buňky a výšky výkopu pro síť: kde je co kopat a kde nezasahuje nad podlahu viditelného podlaží. */
        _bunkyJamy(j, viditelne, yNula) {
            const { u0, v0, krok, cos, sin, sloupcu, radku, hloubky, teren } = j;
            const sCel = sloupcu - 1, rCel = radku - 1;
            const bunky = new Uint8Array(sCel * rCel);
            const y = new Float32Array(sloupcu * radku);
            for (let i = 0; i < y.length; i++) y[i] = yNula + teren[i] - hloubky[i];
            for (let r = 0; r < rCel; r++) {
                for (let s = 0; s < sCel; s++) {
                    const a = r * sloupcu + s, b = a + 1, c = a + sloupcu, d = c + 1;
                    if (!(hloubky[a] > 0 || hloubky[b] > 0 || hloubky[c] > 0 || hloubky[d] > 0)) continue;
                    if (viditelne.length) {
                        const u = u0 + (s + 0.5) * krok, v = v0 + (r + 0.5) * krok;
                        const nad = viditelne.find(q => window.Zemina.bodVObrysu(u * cos - v * sin, u * sin + v * cos, q.obrys));
                        if (nad && y[a] > yNula + nad.kota) continue;
                    }
                    bunky[r * sCel + s] = 1;
                }
            }
            return { u0, v0, krok, cos, sin, sloupcu, radku, bunky, y };
        },

        _nastavViditelnost3d() {
            const _3d = window._kk3d;
            if (!_3d || !_3d.podlaziSkupiny) return;
            window.Svetlo3d.prekresliStiny(_3d.renderer);
            for (const [id, g] of _3d.podlaziSkupiny) g.visible = this._viditelne3d(id);
            for (const m of _3d.maskaZeme?.children || []) m.visible = this._viditelne3d(m.userData.podlazi);
            this._jama3d();
            const dum = _3d.dumSkupina;
            if (!dum) return;
            const strechaVidet = this.zobrazStrechu3d;
            for (const o of dum.children) {
                const u = o.userData;
                if (u.strecha) o.visible = strechaVidet;
                else if (u.podlazi) o.visible = this._viditelne3d(u.podlazi);
                else if (u.stropPod) {
                    // Deska patří podlaží nad ní jako podlaha. Bez něj je pryč, aby šlo vidět dovnitř;
                    // pod střechou je jen stropem zobrazeného horního podlaží.
                    const nad = this.engine.podlaziNad(u.stropPod);
                    o.visible = nad ? this._viditelne3d(nad.id) : (strechaVidet && this._viditelne3d(u.stropPod));
                }
            }
        },

        /**
         * Základ nad terénem: svislý pás po obvodu domu od podlahy až pod terén. Leží 1 cm za lícem,
         * aby se nepral s bokem desky, a jde všude tam, kde pod domem není nižší část (sklep).
         * Trojúhelníky mají oba směry, sdílený odkaz materiálu oboustrannost nepřenese.
         */
        _zaklad3d() {
            if (!this.maZaklady) return [];
            const THREE = window.THREE;
            const prodlouzit = this.zakladyHodnota('prodlouzit');
            const tn = this._terenDomu().fn || (() => 0);
            const casti = this._castiZakladu();
            const meshe = [];
            casti.forEach((c, i) => {
                if (!prodlouzit && c.typ !== 'stavajici') return;
                const nizsi = casti.slice(0, i);
                const obrys = this._odsadPolygon(c.obrys, -0.01);
                const pozice = [];
                obrys.forEach((a, j) => {
                    const b = obrys[(j + 1) % obrys.length];
                    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 0.5));
                    for (let k = 0; k < n; k++) {
                        const p = { x: a.x + (b.x - a.x) * k / n, y: a.y + (b.y - a.y) * k / n };
                        const q = { x: a.x + (b.x - a.x) * (k + 1) / n, y: a.y + (b.y - a.y) * (k + 1) / n };
                        const yP = tn(p.x, p.y) - ZAKLAD_POD_TEREN, yQ = tn(q.x, q.y) - ZAKLAD_POD_TEREN;
                        if (Math.min(yP, yQ) >= c.kota) continue;
                        const sx = (p.x + q.x) / 2, sy = (p.y + q.y) / 2;
                        if (nizsi.some(s => window.Zemina.vzdalenostOdObrysu(sx, sy, s.obrys) <= 0.05)) continue;
                        pozice.push(
                            p.x, c.kota, p.y, q.x, c.kota, q.y, q.x, yQ, q.y, p.x, c.kota, p.y, q.x, yQ, q.y, p.x, yP, p.y,
                            p.x, c.kota, p.y, q.x, yQ, q.y, q.x, c.kota, q.y, p.x, c.kota, p.y, p.x, yP, p.y, q.x, yQ, q.y,
                        );
                    }
                });
                if (!pozice.length) return;
                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.Float32BufferAttribute(pozice, 3));
                geom.computeVertexNormals();
                // Základ nad terénem má barvu fasády domu nad ním (Libor 10. 11. 2026), přebarví ho _nastavBarvy3d
                const mat = new THREE.MeshStandardMaterial({ color: this.engine.dum.barvy?.fasada || 0xffffff, roughness: 0.85 });
                mat.userData.barva = 'fasada';
                const m = new THREE.Mesh(geom, mat);
                m.castShadow = true;
                m.receiveShadow = true;
                m.userData.podlazi = c.id;
                m.userData.zaklad = true;
                meshe.push(m);
            });
            return meshe;
        },

        /** Hranol s otvory z půdorysu (m) mezi výškami; souřadnice scény jako u stěn. */
        _deska3d(obrys, otvory, yOd, yDo, mat, userData) {
            const THREE = window.THREE;
            const shape = new THREE.Shape();
            // ExtrudeGeometry srovná směr děr jen u obrysu proti směru hodinek. Jinak by boky děr
            // hleděly dovnitř desky, nekreslily by se a deska by u díry vypadala tenká jako podlaha.
            const vKruhu = THREE.ShapeUtils.isClockWise(obrys.map(p => new THREE.Vector2(p.x, -p.y))) ? [...obrys].reverse() : obrys;
            vKruhu.forEach((p, i) => (i ? shape.lineTo(p.x, -p.y) : shape.moveTo(p.x, -p.y)));
            shape.closePath();
            for (const h of (otvory || [])) {
                const d = new THREE.Path();
                h.forEach((p, i) => (i ? d.lineTo(p.x, -p.y) : d.moveTo(p.x, -p.y)));
                d.closePath();
                shape.holes.push(d);
            }
            const geom = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.005, yDo - yOd), bevelEnabled: false });
            // Třetí materiál = vlastní vrch. Plochy jsou v geometrii za sebou: nejdřív spodní, pak horní.
            // Čtvrtý = boky děr. Boky jsou po čtyřúhelnících (6 vrcholů): nejdřív obrys, za ním díry.
            if (Array.isArray(mat) && mat[2]) {
                const [plochy, boky] = geom.groups;
                geom.clearGroups();
                geom.addGroup(plochy.start, plochy.count / 2, 0);
                geom.addGroup(plochy.start + plochy.count / 2, plochy.count / 2, 2);
                const hran = obrys.filter((p, i) => { const q = obrys[(i + 1) % obrys.length]; return p.x !== q.x || p.y !== q.y; }).length;
                if (mat[3] && otvory?.length && hran * 6 < boky.count) {
                    geom.addGroup(boky.start, hran * 6, 1);
                    geom.addGroup(boky.start + hran * 6, boky.count - hran * 6, 3);
                } else geom.addGroup(boky.start, boky.count, 1);
            }
            const m = new THREE.Mesh(geom, mat);
            m.rotation.x = -Math.PI / 2;
            m.position.y = yOd;
            m.castShadow = true;
            m.receiveShadow = true;
            Object.assign(m.userData, userData || {});
            return m;
        },

        /** Dlaždice dekoru podlahy, sdílené jako u krytiny. */
        _texturaDekoru(typ) {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            if (!_3d.texturyDekoru) _3d.texturyDekoru = new Map();
            let t = _3d.texturyDekoru.get(typ);
            if (!t) {
                t = new THREE.CanvasTexture(kresliDekor(typ));
                t.encoding = THREE.sRGBEncoding;
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.anisotropy = 8;
                _3d.texturyDekoru.set(typ, t);
            }
            return t;
        },

        /**
         * Podlahy všech místností: buňky rastru místností se slijí do obdélníků. Místnost s vlastním
         * dekorem má svou plochu, zbytek společnou hladkou (i podlaží, které ještě nemá záznamy místností).
         * Štítky se nejdřív rozšíří o dvě buňky pod stěny a oddělovače, aby u nich nezbyla spára;
         * výřezy (prostupy, schody zdola) zůstanou prázdné.
         */
        _podlahyMistnosti(eng, podl, group, rastr) {
            const R = window.MistnostiRastr;
            const THREE = window.THREE;
            if (!rastr) return;
            const { w, h, krok, x0, y0 } = rastr;
            let st = Int32Array.from(rastr.stitky);
            for (let pruchod = 0; pruchod < 2; pruchod++) {
                const dalsi = Int32Array.from(st);
                for (let i = 0; i < w * h; i++) {
                    if (st[i] !== 0) continue;
                    const x = i % w;
                    const s = (x > 0 && st[i - 1] >= 2 && st[i - 1]) || (x < w - 1 && st[i + 1] >= 2 && st[i + 1]) || (i >= w && st[i - w] >= 2 && st[i - w]) || (i < w * (h - 1) && st[i + w] >= 2 && st[i + w]);
                    if (s) dalsi[i] = s;
                }
                st = dalsi;
            }
            const vyrezy = this._maskyPodlazi(podl.id).vyrezy;
            if (vyrezy.length) {
                const cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                const g = cv.getContext('2d', { willReadFrequently: true });
                for (const poly of vyrezy) {
                    g.beginPath();
                    poly.forEach((p, i) => { const x = (p.x - x0) / krok, y = (p.y - y0) / krok; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
                    g.closePath();
                    g.fill();
                }
                const a = g.getImageData(0, 0, w, h).data;
                for (let i = 0; i < w * h; i++) if (a[i * 4 + 3] > 127) st[i] = 0;
            }
            const VYSKA = 0.025;   // nad deskou podlahy, ta končí 2 cm nad kótou
            const pxM = eng.PX_PER_M;
            // Štítky s vlastním dekorem; ostatní buňky místností se sloučí pod štítek -1
            const vlastni = new Map();
            for (const m of eng.mistnosti || []) {
                if (!m.podlaha) continue;
                const s = R.stitekVBode(rastr, m.kotva.x, m.kotva.y);
                if (s >= 2 && !vlastni.has(s)) vlastni.set(s, m);
            }
            // Výška podlahy po buňkách. Zvýšená a snížená místnost až po své okraje (štítek i pod stěnami, ať
            // u nich nezbude spára), přenesené zvýšení podle obrysu z podlaží níž. Kudy vedou schody, tam
            // zvýšená deska není (_dilyDesky), podlaha tam zůstává dole.
            const urovne = new Float32Array(w * h);
            const vykresli = (polygony) => {
                const cv = document.createElement('canvas');
                cv.width = w; cv.height = h;
                const g = cv.getContext('2d', { willReadFrequently: true });
                for (const poly of polygony) {
                    g.beginPath();
                    poly.forEach((p, i) => { const x = (p.x - x0) / krok, y = (p.y - y0) / krok; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
                    g.closePath();
                    g.fill();
                }
                return g.getImageData(0, 0, w, h).data;
            };
            const zvysene = this.plochyNaPodlazi(podl.id).filter(a => a.typ === 'zvysena' && a.dh > 0);
            for (const a of [...zvysene, ...this._snizenePlochy(podl.id)]) {
                const m = a.podlazi === podl.id && a.mistnost ? eng.najdiMistnost(a.mistnost) : null;
                const stitekPlochy = m ? R.stitekVBode(rastr, m.kotva.x, m.kotva.y) : 0;
                const maska = stitekPlochy >= 2 ? null : vykresli([this._plochaPoly(a)]);
                for (let i = 0; i < w * h; i++) {
                    if (st[i] !== 0 && (maska ? maska[i * 4 + 3] > 127 : st[i] === stitekPlochy)) urovne[i] = a.dh;
                }
            }
            if (zvysene.length) {
                const schody = this.engine.dum.schodiste.filter(s => s.odPodlazi === podl.id || s.doPodlazi === podl.id);
                if (schody.length) {
                    const maska = vykresli(schody.map(s => schodyGeo(s, this._vyskaMeziPodlazimi(s), pxM).obrys));
                    for (let i = 0; i < w * h; i++) if (urovne[i] > 0 && maska[i * 4 + 3] > 127) urovne[i] = 0;
                }
            }
            const vysky = [...new Set(urovne)];
            for (let i = 0; i < w * h; i++) if (st[i] >= 2 && !vlastni.has(st[i])) st[i] = -1;
            for (const [stitek, m] of [...vlastni, [-1, null]]) for (const uroven of vysky) {
                // Stejně široké úseky sousedních řádků tvoří jeden obdélník
                const obdelniky = [];
                let otevrene = new Map();
                for (let y = 0; y <= h; y++) {
                    const nove = new Map();
                    if (y < h) {
                        for (let x = 0; x < w; x++) {
                            if (st[y * w + x] !== stitek || urovne[y * w + x] !== uroven) continue;
                            let x1 = x;
                            while (x1 + 1 < w && st[y * w + x1 + 1] === stitek && urovne[y * w + x1 + 1] === uroven) x1++;
                            const klic = x + ':' + x1;
                            const r = otevrene.get(klic) || { x0: x, x1: x1 + 1, y0: y };
                            otevrene.delete(klic);
                            nove.set(klic, r);
                            x = x1;
                        }
                    }
                    for (const r of otevrene.values()) { r.y1 = y; obdelniky.push(r); }
                    otevrene = nove;
                }
                if (!obdelniky.length) continue;
                const dekor = dekorPodlahy(m?.podlaha.dekor);
                const pozice = new Float32Array(obdelniky.length * 18);
                const uv = new Float32Array(obdelniky.length * 12);
                obdelniky.forEach((r, i) => {
                    const ax = (x0 + r.x0 * krok) / pxM, bx = (x0 + r.x1 * krok) / pxM;
                    const az = (y0 + r.y0 * krok) / pxM, bz = (y0 + r.y1 * krok) / pxM;
                    [[ax, az], [ax, bz], [bx, bz], [ax, az], [bx, bz], [bx, az]].forEach(([x, z], j) => {
                        pozice.set([x, VYSKA + uroven, z], i * 18 + j * 3);
                        uv.set([x / dekor.metru, z / dekor.metru], i * 12 + j * 2);
                    });
                });
                const geom = new THREE.BufferGeometry();
                geom.setAttribute('position', new THREE.BufferAttribute(pozice, 3));
                geom.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
                geom.computeVertexNormals();
                const textura = dekor.id === 'hladka' ? null : this._texturaDekoru(dekor.id);
                const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(barvaPodlahy(m?.podlaha)), roughness: dekor.drsnost, map: textura, bumpMap: textura, bumpScale: textura ? 0.012 : 0 });
                const mesh = new THREE.Mesh(geom, mat);
                if (m) {
                    mat.userData.barva = 'podlaha:' + m.id;
                    mesh.userData.podlaha = m.id;
                }
                group.add(mesh);
            }
        },

        /**
         * Která strana otvoru míří ven: +1 / -1 v lokální ose z otvoru, 0 u otvoru mezi místnostmi.
         * Zkouší se rastr místností těsně za lícem stěny; když je tam jiná stěna, vedlejší bod.
         */
        _stranaVen(eng, wall, op, rastr) {
            const R = window.MistnostiRastr;
            const nA = eng.nodes.get(wall.nodeA), nB = eng.nodes.get(wall.nodeB);
            if (!rastr || !nA || !nB) return 0;
            const pxM = eng.PX_PER_M;
            const L = Math.hypot(nB.x - nA.x, nB.y - nA.y);
            if (L < 1) return 0;
            const ux = (nB.x - nA.x) / L, uy = (nB.y - nA.y) / L;
            const odstup = ((wall.tloustka || 0.3) / 2 + 0.06) * pxM;
            const jeVen = (znamenko) => {
                for (const f of [0.5, 0.2, 0.8]) {
                    const t = (op.pozice + op.sirka * f) * pxM;
                    const s = R.stitekVBode(rastr, nA.x + ux * t - uy * odstup * znamenko, nA.y + uy * t + ux * odstup * znamenko);
                    if (s !== 0) return s === 1;
                }
                return false;
            };
            if (jeVen(1)) return 1;
            return jeVen(-1) ? -1 : 0;
        },

        /** Dlaždice reliéfu krytiny, sdílené: při přestavbě scény se nemažou. */
        _texturaKrytiny(typ) {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            if (!_3d.texturyKrytin) _3d.texturyKrytin = new Map();
            let t = _3d.texturyKrytin.get(typ);
            if (!t) {
                t = new THREE.CanvasTexture(kresliRelief(typ));
                t.encoding = THREE.sRGBEncoding;
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.anisotropy = 8;
                _3d.texturyKrytin.set(typ, t);
            }
            return t;
        },

        /**
         * Trojúhelníky (m, z nahoru) jako mesh scény. S `rovina` (n, d, tg plochy) dostanou
         * souřadnice textury: u podél okapu, v po spádnici, obojí ve skutečných metrech.
         */
        _troj3d(trojVypoctu, zPosun, mat, userData, rovina) {
            const THREE = window.THREE;
            // Výška je ve výpočtu v z, ve scéně v y. Prohození os obrací směr ploch, proto vrcholy odzadu (proč, viz _obrysVen).
            const troj = trojVypoctu.map(t => [...t].reverse());
            const v = new Float32Array(troj.length * 9);
            troj.forEach((t, i) => t.forEach((b, j) => {
                v[i * 9 + j * 3] = b.x; v[i * 9 + j * 3 + 1] = b.z + zPosun; v[i * 9 + j * 3 + 2] = b.y;
            }));
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(v, 3));
            if (rovina) {
                const uv = new Float32Array(troj.length * 6);
                const naSpadu = Math.sqrt(1 + rovina.tg * rovina.tg);
                troj.forEach((t, i) => t.forEach((b, j) => {
                    uv[i * 6 + j * 2] = (b.x * rovina.d.x + b.y * rovina.d.y) / METRU_NA_TEXTURU;
                    uv[i * 6 + j * 2 + 1] = (b.x * rovina.n.x + b.y * rovina.n.y) * naSpadu / METRU_NA_TEXTURU;
                }));
                g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            }
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, mat);
            m.castShadow = true;
            Object.assign(m.userData, userData || {});
            return m;
        },

        /** Stropy mezi podlažími, zvýšené plochy, schody a střecha. Přestaví se při každém vstupu do 3D. */
        _build3dDum(group) {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            if (_3d.dumSkupina) { group.remove(_3d.dumSkupina); this._zrus3d(_3d.dumSkupina); }
            const dum = new THREE.Group();
            _3d.dumSkupina = dum;
            group.add(dum);
            const e = this.engine;
            const d = e.dum;
            const kory = e.kotyPodlazi();
            const PX = e.PX_PER_M;
            const naM = (poly) => poly.map(p => ({ x: p.x / PX, y: p.y / PX }));
            this._maskaZeme3d(group);
            const obrysBody = (hrany) => hrany.map(h => h.a);
            // Boky desek leží v líci domu, proto mají barvu fasády (ExtrudeGeometry: 0 = plochy, 1 = boky)
            const matFasady = () => {
                const m = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 });
                m.userData.barva = 'fasada';
                return m;
            };
            // Vrch desky fasádou: uvnitř ho kryje podlaha místností (_podlahyMistnosti), vidět je jen vně
            // zdí, kde je patro odsazené nebo kde obrys z rastru o kousek přesáhne líc. Spodek je strop.
            // Vrch je shora osvětlený víc než stěna, bez ztlumení by i milimetrový rozdíl líců dělal světlou linku.
            const matVrchu = () => {
                const m = matFasady();
                m.userData.jas = 0.75;
                return m;
            };
            // Bok díry v podlaze je bílý jako vnitřní stěny: navazuje na něj zeď nad i pod deskou (nízká zídka místo zábradlí)
            const matDesky = () => [new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.9 }), matFasady(), matVrchu(), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 })];
            const st = this._strechaVypocet();
            // Otvor snížené místnosti může sahat přes desku: tam deska ustoupí
            const podUrovni = this._otvoryPodUrovni();
            const pridejDesku = (obrys, otvory, yOd, yDo, userData) => {
                const vyrezy = podUrovni.filter(v => v.od < yDo && v.do > yOd).map(v => v.poly);
                for (const m of this._deskaSVyrezy(obrys, otvory, vyrezy, yOd, yDo, matDesky(), userData)) dum.add(m);
            };

            d.podlazi.forEach((p, i) => {
                const hrany = this._obrysPodlazi(p.id);
                const kota = kory.get(p.id) ?? 0;
                const nad = d.podlazi[i + 1];
                const otvory = nad ? this._otvoryDesky(nad.id, naM) : [];
                if (hrany && hrany.length >= 3) {
                    const obrys = obrysBody(hrany);
                    // Podlaha nejnižšího podlaží
                    if (i === 0) pridejDesku(obrys, this._otvoryDesky(p.id, naM), kota - 0.15, kota + 0.02, { podlazi: p.id });
                    // Strop: pod dalším podlažím vždy. Pod šikmou střechou žádný: není vidět a v líci
                    // by se pral se stěnami dotaženými pod střechu. Plochá střecha na něm leží.
                    if (nad || (st && st.plocha && p.typ !== 'podkrovi' && st.zOkap >= p.vyska - 0.001)) {
                        pridejDesku(obrys, otvory, kota + e.svetlaVyska(p), kota + p.vyska, { stropPod: p.id });
                    }
                }
                // Podlaha patra podle jeho vlastního obrysu: patro může přesahovat přes podlaží pod
                // ním (krytý vstup, garáž) a strop spodního podlaží by tam nechal díru.
                // Dole 2 mm navíc, aby se plochy obou desek nepraly. Nahoře až pod podlahu místností
                // jako u nejnižší desky, jinak je u díry mezi deskou a podlahou vidět škvíra.
                const hranyNad = nad ? this._obrysPodlazi(nad.id) : null;
                if (hranyNad && hranyNad.length >= 3) {
                    const kotaNad = kory.get(nad.id) ?? (kota + p.vyska);
                    pridejDesku(obrysBody(hranyNad), otvory, kotaNad - p.strop - 0.002, kotaNad + 0.02, { stropPod: p.id });
                }
            });

            for (const m of this._zaklad3d()) dum.add(m);

            // Zvýšené a snížené plochy (zvýšení se přenáší nahoru)
            const matPlocha = new THREE.MeshStandardMaterial({ color: 0xc8c2bb, roughness: 0.9 });
            for (const p of d.podlazi) {
                const kota = kory.get(p.id) ?? 0;
                for (const a of this.plochyNaPodlazi(p.id)) {
                    if (!a.dh || (a.typ !== 'zvysena' && a.typ !== 'snizena')) continue;
                    const [yOd, yDo] = a.dh > 0 ? [kota, kota + a.dh] : [kota + a.dh - 0.05, kota + a.dh];
                    for (const poly of this._dilyDesky(a, p.id)) {
                        dum.add(this._deska3d(poly, [], yOd, yDo, matPlocha.clone(), { podlazi: p.id, vyskovaDeska: a.id }));
                    }
                }
            }

            // Schody: nášlapy a podstupnice. Svislé části mají tmavší odstín téže barvy.
            const JAS_SVISLE = 0.7;
            const TL_NASLAPU = 0.04;
            for (const s of d.schodiste) {
                const g = schodyGeo(s, this._vyskaMeziPodlazimi(s), PX);
                // Schody ze snížené místnosti stoupají z její podlahy na úroveň podlaží
                const plochaSchodu = this._plochaSchodu(s);
                const kota = (kory.get(s.odPodlazi) ?? 0) + (plochaSchodu?.typ === 'snizena' ? plochaSchodu.dh : 0);
                const klic = 'schody:' + s.id;
                const barva = new THREE.Color(s.barva || BARVA_SCHODU);
                const matNaslap = new THREE.MeshStandardMaterial({ color: barva, roughness: 0.8 });
                matNaslap.userData.barva = klic;
                const matSvisle = new THREE.MeshStandardMaterial({ color: barva.clone().multiplyScalar(JAS_SVISLE), roughness: 0.8 });
                matSvisle.userData.barva = klic;
                matSvisle.userData.jas = JAS_SVISLE;
                for (const u of g.stupne) {
                    dum.add(this._deska3d(naM(u.poly), [], kota + u.z - TL_NASLAPU, kota + u.z, [matSvisle, matSvisle, matNaslap], { podlazi: s.odPodlazi, schody: s.id }));
                    // Podstupnice až po spodek předchozího stupně: na té se oba stupně i zespodu dotýkají
                    // celou tloušťkou, jinak by se potkaly jen v hraně. První končí na podlaze.
                    dum.add(this._deska3d(naM(u.celo), [], kota + Math.max(0, u.z - g.v - TL_NASLAPU), kota + u.z - TL_NASLAPU, matSvisle, { podlazi: s.odPodlazi, schody: s.id, podstupnice: true }));
                }
            }

            // Střecha
            if (st) {
                const horni = e.horniPodlazi();
                const kota = kory.get(horni.id) ?? 0;
                const typ = typKrytiny(d.strecha);
                const zaklad = barvaKrytiny(d.strecha);
                const kov = (TYPY_KRYTIN.find(k => k.id === typ) || {}).kov;
                const relief = this._texturaKrytiny(typ);
                const matKrytina = (barva) => new THREE.MeshStandardMaterial({
                    color: new THREE.Color(barva), roughness: kov ? 0.45 : 0.85, metalness: kov ? 0.25 : 0,
                    side: THREE.DoubleSide, flatShading: true, map: relief, bumpMap: relief, bumpScale: 0.035,
                });
                if (st.plocha) {
                    const zOd = kota + st.zOkap;
                    // Plochá: deska přes obrys (přesah se u ploché v první verzi neřeší)
                    const obrys = st.hrany.map(h => h.a);
                    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(zaklad), roughness: 0.85 });
                    dum.add(this._deska3d(obrys, [], zOd, zOd + 0.2, mat, { strecha: true, krytina: true }));
                } else {
                    for (const pl of st.plochy) {
                        const h = st.hrany.find(x => x.index === pl.hrana) || {};
                        dum.add(this._troj3d(pl.troj, kota, matKrytina(h.barva || zaklad), { strecha: true, krytina: true, klic: h.klic, vlastniBarva: !!h.barva }, pl));
                    }
                    // Štít nad stěnou vytvoří sama stěna, dotažená až pod střechu. Tenká plocha v líci
                    // by se s ní prala; zůstává jen tam, kde pod hranou žádná stěna není.
                    const bezSteny = (pl) => !String((st.hrany.find(h => h.index === pl.hrana) || {}).klic || '').includes(':');
                    const stity = st.stity.filter(bezSteny).flatMap(pl => pl.troj);
                    if (stity.length) {
                        const matStit = new THREE.MeshStandardMaterial({ color: TYPY_STEN?.obvodova?.barva3d || 0x6b6b6b, roughness: 0.85, side: THREE.DoubleSide });
                        matStit.userData.barva = 'fasada';
                        dum.add(this._troj3d(stity, kota, matStit, { strecha: true }));
                    }
                }
            }
        },

        /**
         * Půdorys výškové desky na podlaží bez schodů, které do ní zasahují (m, y dolů jako _deska3d):
         * podlaha nesmí protékat schody. Bez překryvu celý obrys, jinak konvexní díly.
         */
        _dilyDesky(a, idPodlazi) {
            const PX = this.engine.PX_PER_M;
            const obrys = a.body.map(b => ({ x: b[0], y: -b[1] }));
            // Zvýšená deska nesmí protékat schody, snížená leží pod nimi a uhne jen těm, co přicházejí zdola
            const schody = this.engine.dum.schodiste.filter(s => (a.dh > 0 ? s.odPodlazi === idPodlazi || s.doPodlazi === idPodlazi : s.doPodlazi === idPodlazi && s.odPodlazi !== idPodlazi));
            if (!schody.length) return [obrys];
            let dily = window.Strecha.konvexniDily(kladnaOrientace(obrys));
            let zasah = false;
            for (const s of schody) {
                const g = schodyGeo(s, this._vyskaMeziPodlazimi(s), PX);
                // Přímé schody jsou konvexní celé, do L a do U po stupních
                const casti = !s.tvar || s.tvar === 'prime' ? [g.obrys] : g.stupne.map(u => u.poly);
                for (const c of casti) {
                    const C = kladnaOrientace(c.map(p => ({ x: p.x / PX, y: p.y / PX })));
                    dily = dily.flatMap(P => {
                        const zbytek = odectiKonvexni(P, C);
                        if (!zbytek) return [P];
                        zasah = true;
                        // Proužek desky užší než 3 cm by jen zavřel prostor u schodů
                        return zbytek.filter(q => sirkaKonvexni(q) >= 0.03);
                    });
                }
            }
            return zasah ? dily : [obrys];
        },

        /**
         * Díry v deskách podlaží (m): plochy bez podlahy, schody vedoucí sem zdola a snížené místnosti.
         * Plocha místnosti se nemění, snížená podlaha se do ní počítá. Otvor celý uvnitř snížené místnosti
         * by se s její dírou překrýval, řeší ho deska snížené podlahy (_dilyDesky).
         */
        _otvoryDesky(id, naM) {
            const snizene = this._snizenePlochy(id);
            const vyrezy = this._maskyPodlazi(id).vyrezy.filter(v => !snizene.some(a => {
                const poly = this._plochaPoly(a);
                return v.every(b => bodVPolygonu(b, poly));
            }));
            // O 3 cm přes obrys, pod stěnu: obrys z rastru může ležet kousek před lícem a zbyl by okraj desky
            return [...vyrezy.map(naM), ...snizene.map(a => this._odsadPolygon(a.body.map(b => ({ x: b[0], y: -b[1] })), 0.03))];
        },

        _snizenePlochy(id) {
            return this.plochyNaPodlazi(id).filter(a => a.typ === 'snizena' && a.dh < 0);
        },

        /**
         * Otvory ve snížené místnosti, které klesly pod vrch desky podlaží. V m: a, b = konce otvoru na ose
         * stěny (y dolů), poly = půdorys přes celou tloušťku stěny, od a do = výšky v souřadnicích domu.
         * Desky i stěny podlaží pod nimi tam musí ustoupit.
         */
        _otvoryPodUrovni() {
            const e = this.engine;
            const PX = e.PX_PER_M;
            const vysledek = [];
            for (const p of e.dum.podlazi) {
                if (!this._snizenePlochy(p.id).length) continue;
                const eng = e.enginePodlazi(p.id);
                if (!eng) continue;
                const rastr = this._rastrPodlazi(eng, p.id);
                const kota = e.kotaPodlazi(p.id);
                for (const op of eng.openings.values()) {
                    const wall = eng.walls.get(op.wallId);
                    const A = wall && eng.nodes.get(wall.nodeA), B = wall && eng.nodes.get(wall.nodeB);
                    if (!A || !B) continue;
                    const nula = this._nulaOtvoru(eng, p.id, wall, op, rastr);
                    const od = window.minParapetOtvoru(op) + nula;
                    if (nula >= 0 || od >= 0.03) continue;
                    const L = Math.hypot(B.x - A.x, B.y - A.y) / PX;
                    if (L < 0.01) continue;
                    const ux = (B.x - A.x) / PX / L, uy = (B.y - A.y) / PX / L;
                    const bod = (t) => ({ x: A.x / PX + ux * t, y: A.y / PX + uy * t });
                    const a = bod(op.pozice), b = bod(op.pozice + op.sirka);
                    const nx = -uy, ny = ux, pol = (wall.tloustka || 0) / 2 + 0.02;
                    const k = (q, d) => ({ x: q.x + nx * d, y: q.y + ny * d });
                    vysledek.push({
                        podlazi: p.id, a, b, od: kota + od, do: kota + window.vrsekOtvoru(op) + nula,
                        poly: [k(a, -pol), k(b, -pol), k(b, pol), k(a, pol)],
                    });
                }
            }
            return vysledek;
        },

        /** Deska s výřezy: bez nich jedna deska s dírami, s nimi konvexní díly, protože výřez může přetnout obrys. */
        _deskaSVyrezy(obrys, otvory, vyrezy, yOd, yDo, mat, userData) {
            if (!vyrezy.length) return [this._deska3d(obrys, otvory, yOd, yDo, mat, userData)];
            let dily = window.Strecha.konvexniDily(kladnaOrientace(obrys));
            for (const h of [...otvory, ...vyrezy]) {
                for (const C of window.Strecha.konvexniDily(kladnaOrientace(h))) {
                    dily = dily.flatMap(P => {
                        const zbytek = odectiKonvexni(P, C);
                        return zbytek ? zbytek.filter(q => sirkaKonvexni(q) >= 0.01) : [P];
                    });
                }
            }
            return dily.map(q => this._deska3d(q, [], yOd, yDo, mat, userData));
        },

        /** Snížené místnosti nad terénem (sklep leží pod zemí celý): obrysy v m, y dolů, s rezervou pod stěny. */
        _dirySnizeni() {
            const vysledek = [];
            for (const p of this.engine.dum.podlazi) {
                if (p.typ === 'sklep') continue;
                for (const a of this._snizenePlochy(p.id)) {
                    vysledek.push({ podlazi: p.id, poly: this._odsadPolygon(a.body.map(b => ({ x: b[0], y: -b[1] })), 0.03) });
                }
            }
            return vysledek;
        },

        /**
         * Země a mřížka leží v úrovni 0, tedy nad sníženou podlahou. Maska do stencil bufferu je nad
         * těmito místnostmi nevykreslí. Bez snížené místnosti se scéna kreslí jako dřív.
         */
        _maskaZeme3d(group) {
            const THREE = window.THREE;
            const _3d = window._kk3d;
            if (_3d.maskaZeme) { _3d.scene.remove(_3d.maskaZeme); this._zrus3d(_3d.maskaZeme); _3d.maskaZeme = null; }
            const diry = this._dirySnizeni();
            for (const o of [_3d.ground, _3d.grid, _3d.terrain, _3d.gridLines]) {
                if (!o) continue;
                for (const m of [].concat(o.material)) {
                    m.stencilWrite = diry.length > 0;
                    m.stencilRef = 1;
                    m.stencilFunc = THREE.NotEqualStencilFunc;
                }
            }
            if (!diry.length) return;
            const kory = this.engine.kotyPodlazi();
            const maska = new THREE.Group();
            for (const { podlazi, poly } of diry) {
                const tvar = new THREE.Shape();
                poly.forEach((q, i) => (i ? tvar.lineTo(q.x, -q.y) : tvar.moveTo(q.x, -q.y)));
                tvar.closePath();
                const mesh = new THREE.Mesh(new THREE.ShapeGeometry(tvar), new THREE.MeshBasicMaterial({
                    colorWrite: false, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
                    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp,
                }));
                mesh.rotation.x = -Math.PI / 2;
                // Ve výšce země, ať se promítne přesně na ni. U terénu v úrovni podlahy domu.
                mesh.position.y = _3d.ground ? 0.01 : group.position.y + (kory.get(podlazi) ?? 0);
                mesh.renderOrder = -1;
                mesh.userData.podlazi = podlazi;
                maska.add(mesh);
            }
            _3d.maskaZeme = maska;
            _3d.scene.add(maska);
        },

        /** Polygon odsazený o d ven, po vrcholech ve směru os obou sousedních hran. */
        _odsadPolygon(poly, d) {
            let plocha = 0;
            poly.forEach((p, i) => { const q = poly[(i + 1) % poly.length]; plocha += p.x * q.y - q.x * p.y; });
            const zn = plocha > 0 ? 1 : -1;
            const normala = (a, b) => {
                const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
                return { x: (b.y - a.y) / L * zn, y: -(b.x - a.x) / L * zn };
            };
            return poly.map((p, i) => {
                const n1 = normala(poly[(i - 1 + poly.length) % poly.length], p), n2 = normala(p, poly[(i + 1) % poly.length]);
                let x = n1.x + n2.x, y = n1.y + n2.y;
                const L = Math.hypot(x, y) || 1;
                x /= L; y /= L;
                const k = d / Math.max(0.3, x * n1.x + y * n1.y);
                return { x: p.x + x * k, y: p.y + y * k };
            });
        },

        /**
         * Úseky stěny podél snížené místnosti: [{t0, t1, dh}] v metrech od uzlu A. Stěna tam musí sahat
         * až na sníženou podlahu. Krajní úsek je bez meze, aby dosáhl i do pokosu rohu.
         */
        _behySnizeni(podlaziId, eng, wall) {
            const plochy = this._snizenePlochy(podlaziId);
            const a = eng.nodes.get(wall.nodeA), b = eng.nodes.get(wall.nodeB);
            if (!plochy.length || !a || !b) return [];
            const PX = eng.PX_PER_M;
            const L = Math.hypot(b.x - a.x, b.y - a.y) / PX;
            if (L < 0.01) return [];
            const ux = (b.x - a.x) / L / PX, uy = (b.y - a.y) / L / PX;
            const odstup = ((wall.tloustka || 0) / 2 + 0.06) * PX;
            const polygony = plochy.map(q => ({ poly: this._plochaPoly(q), dh: q.dh }));
            const KROK = 0.25, kroku = Math.max(1, Math.ceil(L / KROK));
            const behy = [];
            for (let i = 0; i < kroku; i++) {
                const t = (i + 0.5) * L / kroku;
                let dh = 0;
                for (const zn of [1, -1]) {
                    const p = { x: a.x + ux * t * PX - uy * odstup * zn, y: a.y + uy * t * PX + ux * odstup * zn };
                    for (const q of polygony) if (q.dh < dh && bodVPolygonu(p, q.poly)) dh = q.dh;
                }
                const posledni = behy[behy.length - 1];
                if (!dh) continue;
                if (posledni && posledni.dh === dh && posledni.i === i - 1) { posledni.t1 = (i + 1) * L / kroku; posledni.i = i; }
                else behy.push({ t0: i * L / kroku, t1: (i + 1) * L / kroku, dh, i });
            }
            return behy.map(u => ({ t0: u.t0 <= 0 ? -Infinity : u.t0, t1: u.t1 >= L - 1e-6 ? Infinity : u.t1, dh: u.dh }));
        },

        /** Pozice trojúhelníků do jedné geometrie: boky do exteriéru mají matVen, zbytek matUvnitr. */
        _meshStran(group, uvnitr, ven, matUvnitr, matVen) {
            const THREE = window.THREE;
            if (!uvnitr.length && !ven.length) return;
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...uvnitr, ...ven]), 3));
            g.addGroup(0, uvnitr.length / 3, 0);
            g.addGroup(uvnitr.length / 3, ven.length / 3, 1);
            g.computeVertexNormals();
            const m = new THREE.Mesh(g, [matUvnitr, matVen]);
            m.castShadow = true;
            m.receiveShadow = true;
            group.add(m);
        },

        /**
         * Obrys hranolu vždy ve stejném směru, aby normály mířily ven. Oboustranný materiál by obrácenou
         * normálu ve světle schoval, stín se ale podle ní odsazuje: zajel by do zdi a stěna by si stínila sama.
         */
        _obrysVen(poly) {
            let plocha = 0;
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i], b = poly[(i + 1) % poly.length];
                plocha += a.x * b.z - b.x * a.z;
            }
            return plocha > 0 ? poly : [...poly].reverse();
        },

        /**
         * Svislý hranol stěny. Boky se dělí po ~25 cm a každý kousek se ptá `jeVen`, jestli hledí
         * do exteriéru: jedna stěna tak může být venku fasáda a uvnitř bílá, i jen po části délky.
         */
        _hranolStrany(group, obrys, yOd, yDo, matUvnitr, matVen, jeVen, plochyVen = false) {
            const THREE = window.THREE;
            const poly = this._obrysVen(obrys);
            const uvnitr = [], ven = [];
            const bod = (cil, p, y) => cil.push(p.x, y, p.z);
            // Vnější půlka o milimetr výš: konec příčky do ní zasahuje a stejně vysoké plochy se přetahují
            const vrch = plochyVen ? yDo + 0.001 : yDo;
            for (const t of THREE.ShapeUtils.triangulateShape(poly.map(p => new THREE.Vector2(p.x, p.z)), [])) {
                const plochy = plochyVen ? ven : uvnitr;
                for (const i of [...t].reverse()) bod(plochy, poly[i], vrch);
                for (const i of t) bod(plochy, poly[i], yOd);
            }
            for (let i = 0; i < poly.length; i++) {
                const a = poly[i], b = poly[(i + 1) % poly.length];
                const L = Math.hypot(b.x - a.x, b.z - a.z);
                if (L < 1e-4) continue;
                const nx = (b.z - a.z) / L, nz = -(b.x - a.x) / L;
                const dilu = Math.max(1, Math.ceil(L / 0.25));
                for (let d = 0; d < dilu; d++) {
                    const p = { x: a.x + (b.x - a.x) * d / dilu, z: a.z + (b.z - a.z) * d / dilu };
                    const q = { x: a.x + (b.x - a.x) * (d + 1) / dilu, z: a.z + (b.z - a.z) * (d + 1) / dilu };
                    const cil = jeVen((p.x + q.x) / 2, (p.z + q.z) / 2, nx, nz) ? ven : uvnitr;
                    bod(cil, p, yOd); bod(cil, p, vrch); bod(cil, q, vrch);
                    bod(cil, p, yOd); bod(cil, q, vrch); bod(cil, q, yOd);
                }
            }
            this._meshStran(group, uvnitr, ven, matUvnitr, matVen);
        },

        /** Hranol pod šikmou střechou: krájí se po ~25 cm, každý plátek má horní hranu podle střechy. */
        _hranolPodStrechou(group, poly, yOd, yDo, matUvnitr, matVen, jeVen, strop, plochyVen = false) {
            let ax = 0, ay = 0, nejL = -1;
            for (let i = 0; i < poly.length; i++) {
                const q = poly[(i + 1) % poly.length];
                const L = Math.hypot(q.x - poly[i].x, q.z - poly[i].z);
                if (L > nejL) { nejL = L; ax = (q.x - poly[i].x) / (L || 1); ay = (q.z - poly[i].z) / (L || 1); }
            }
            const t = (p) => p.x * ax + p.z * ay;
            const ts = poly.map(t);
            const min = Math.min(...ts), max = Math.max(...ts);
            const orizni = (pp, f) => {
                const out = [];
                for (let i = 0; i < pp.length; i++) {
                    const a = pp[i], b = pp[(i + 1) % pp.length];
                    const fa = f(a), fb = f(b);
                    if (fa >= 0) out.push(a);
                    if ((fa >= 0) !== (fb >= 0)) {
                        const k = fa / (fa - fb);
                        out.push({ x: a.x + (b.x - a.x) * k, z: a.z + (b.z - a.z) * k });
                    }
                }
                return out;
            };
            const krok = 0.25;
            const uvnitr = [], ven = [];
            const poloz = (cil, a, b, c) => cil.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
            for (let s0 = min; s0 < max - 1e-4; s0 += krok) {
                const s1 = Math.min(max, s0 + krok);
                const platek = this._obrysVen(orizni(orizni(poly, p => t(p) - s0), p => s1 - t(p)));
                if (platek.length < 3) continue;
                const hore = platek.map(p => {
                    const h = strop(p.x, p.z);
                    return Math.max(yOd, h === null ? yDo : Math.min(yDo, h - 0.03));   // o kousek níž, ať se plochy neprobíjejí
                });
                if (hore.every(h => h - yOd < 0.005)) continue;
                const D = platek.map(p => ({ x: p.x, y: yOd, z: p.z }));
                const H = platek.map((p, i) => ({ x: p.x, y: hore[i], z: p.z }));
                for (let i = 1; i < platek.length - 1; i++) {
                    poloz(plochyVen ? ven : uvnitr, H[0], H[i + 1], H[i]);
                    poloz(plochyVen ? ven : uvnitr, D[0], D[i], D[i + 1]);
                }
                for (let i = 0; i < platek.length; i++) {
                    const j = (i + 1) % platek.length;
                    const L = Math.hypot(platek[j].x - platek[i].x, platek[j].z - platek[i].z) || 1;
                    const cil = jeVen((platek[i].x + platek[j].x) / 2, (platek[i].z + platek[j].z) / 2, (platek[j].z - platek[i].z) / L, -(platek[j].x - platek[i].x) / L) ? ven : uvnitr;
                    poloz(cil, D[i], H[i], H[j]);
                    poloz(cil, D[i], H[j], D[j]);
                }
            }
            this._meshStran(group, uvnitr, ven, matUvnitr, matVen);
        },
    };
})();
