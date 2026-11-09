/**
 * Modely z katalogu ve 3D scéně, společné pro editor, sdílený odkaz a výrobu náhledů (modules/katalog.md).
 * Soubor se načte jednou, do scény jdou kopie se společnou geometrií a materiály, proto je _zrus3d neruší.
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    const modely = new Map();

    // Mapy lesku z ABO jsou často nesmyslné: stínidla a bílý lak v nich bývají kov a zrcadlo, kus pak vypadá jako z chromu.
    // Poly Haven má mapy v pořádku a u tenkých kusů (zrcadla, obrazy za sklem) lesk patří k věci.
    const MAX_KOV = '0.35';
    const MIN_DRSNOST = '0.5';
    const TENKY_KUS = 0.16;     // metry
    const omezLesk = (shader) => {
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\nroughnessFactor = max( roughnessFactor, ${MIN_DRSNOST} );`)
            .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>\nmetalnessFactor = min( metalnessFactor, ${MAX_KOV} );`);
    };

    // Přebarvení potahu (modules/katalog.md, Přebarvování). Maska z výroby určí texely, cíl je v Lab,
    // jas a struktura látky zůstanou. Klíč barvy se ukládá u kusu, názvy jsou v ed_sablona.katalog.barvy.
    const BARVY = {
        bila: [90, 0, 2], kremova: [84, 1, 10], bezova: [70, 4, 15], seda: [62, 0, 0], antracit: [30, 0, -1], cerna: [16, 0, 0],
        hneda: [38, 10, 18], terakota: [47, 30, 30], horcicova: [63, 6, 50], zelena: [42, -20, 12], modra: [33, 2, -28], ruzova: [66, 16, 6],
    };
    // Tmavý potah do světlé barvy vypadá flekatě jako mramor (zkouška 4. 11. 2026), takový kus světlé barvy nenabízí
    const TMAVY_POTAH = 35, SVETLA_BARVA = 70;

    const lab = (r, g, b) => {
        const f = c => { c /= 255; return c <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
        const R = f(r), G = f(g), B = f(b);
        let X = (.4124 * R + .3576 * G + .1805 * B) / .95047, Y = .2126 * R + .7152 * G + .0722 * B, Z = (.0193 * R + .1192 * G + .9505 * B) / 1.08883;
        const t = v => v > .008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
        X = t(X); Y = t(Y); Z = t(Z);
        return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)];
    };
    const zLab = (L, a, b) => {
        const y = (L + 16) / 116, x = a / 500 + y, z = y - b / 200;
        const t = v => v * v * v > .008856 ? v * v * v : (v - 16 / 116) / 7.787;
        const X = t(x) * .95047, Y = t(y), Z = t(z) * 1.08883;
        return [3.2406 * X - 1.5372 * Y - .4986 * Z, -.9689 * X + 1.8758 * Y + .0415 * Z, .0557 * X - .204 * Y + 1.057 * Z]
            .map(c => { c = Math.max(0, Math.min(1, c)); return 255 * (c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055); });
    };
    const cssZLab = (l) => 'rgb(' + zLab(...l).map(Math.round).join(',') + ')';

    const obrazky = new Map();
    const nactiObrazek = (url) => {
        if (!obrazky.has(url)) {
            obrazky.set(url, new Promise((ok, chyba) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => ok(i);
                i.onerror = () => chyba(new Error('Obrázek se nenačetl: ' + url));
                i.src = url;
            }));
        }
        return obrazky.get(url);
    };
    const platno = (zdroj, w, h) => {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const g = c.getContext('2d', { willReadFrequently: true });
        g.drawImage(zdroj, 0, 0, w, h);
        return { c, g, d: g.getImageData(0, 0, w, h) };
    };

    /** Přebarví obrázek podle masky stejného rozměru: cílový jas × (jas / medián)^0,8, odchylka barvy od mediánu s váhou 0,4. */
    function prebarviPlatno(obr, maska, cil) {
        const p = obr.d.data, m = maska.d.data, n = p.length / 4;
        const hL = new Uint32Array(101), hA = new Uint32Array(256), hB = new Uint32Array(256);
        const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
        let pocet = 0;
        for (let i = 0; i < n; i++) {
            if (!m[i * 4] || !p[i * 4 + 3]) continue;
            const l = lab(p[i * 4], p[i * 4 + 1], p[i * 4 + 2]);
            L[i] = l[0]; A[i] = l[1]; B[i] = l[2];
            if (m[i * 4] > 127) {
                hL[Math.max(0, Math.min(100, Math.round(l[0])))]++;
                hA[Math.max(0, Math.min(255, Math.round(l[1]) + 128))]++;
                hB[Math.max(0, Math.min(255, Math.round(l[2]) + 128))]++;
                pocet++;
            }
        }
        if (!pocet) return null;
        const median = (h, posun) => { let s = 0; for (let i = 0; i < h.length; i++) { s += h[i]; if (s * 2 >= pocet) return i - posun; } return 0; };
        const mL = median(hL, 0), mA = median(hA, 128), mB = median(hB, 128);
        for (let i = 0; i < n; i++) {
            const k = m[i * 4] / 255, j = i * 4;
            if (!k || !p[j + 3]) continue;
            const pomer = Math.pow(Math.max(0.05, L[i] / Math.max(4, mL)), 0.8);
            const c = zLab(Math.min(100, cil[0] * pomer), cil[1] + (A[i] - mA) * 0.4, cil[2] + (B[i] - mB) * 0.4);
            for (let x = 0; x < 3; x++) p[j + x] += (c[x] - p[j + x]) * k;
        }
        obr.g.putImageData(obr.d, 0, 0);
        return obr.c;
    }

    const prebarvene = new Map();

    window.Katalog3d = {
        /** Barvy pro kus s maskou: původní (medián potahu) a paleta. Bez masky prázdné pole. */
        barvy(maska) {
            if (!Array.isArray(maska)) return [];
            const tmavy = maska[0] < TMAVY_POTAH;
            return [{ klic: '', css: cssZLab(maska) }, ...Object.entries(BARVY)
                .filter(([, l]) => !(tmavy && l[0] > SVETLA_BARVA)).map(([klic, l]) => ({ klic, css: cssZLab(l) }))];
        },

        /** Přebarvené materiály kusu: mapa původní → nový. Přebarví se první materiál s texturou, k němu patří maska. */
        prebarvi(id, barva) {
            const klic = id + '|' + barva;
            if (!prebarvene.has(klic)) {
                prebarvene.set(klic, Promise.all([this.nacti(id), nactiObrazek(this.soubor('masky/' + id + '.webp'))]).then(([model, maska]) => {
                    const mapa = new Map();
                    let m = null;
                    model.traverse((o) => { if (o.isMesh && !m) m = [].concat(o.material).find(x => x.map && x.map.image) || null; });
                    if (!m || !BARVY[barva]) return mapa;
                    const w = m.map.image.width, h = m.map.image.height;
                    const c = prebarviPlatno(platno(m.map.image, w, h), platno(maska, w, h), BARVY[barva]);
                    if (!c) return mapa;
                    const t = m.map.clone();
                    t.image = c;
                    t.needsUpdate = true;
                    const novy = m.clone();
                    novy.map = t;
                    novy.onBeforeCompile = m.onBeforeCompile;
                    mapa.set(m, novy);
                    return mapa;
                }));
            }
            return prebarvene.get(klic);
        },

        /** Přebarvená značka do půdorysu: plátno, nebo null, když to nejde. */
        prebarviZnacku(id, barva) {
            const klic = 'znacka|' + id + '|' + barva;
            if (!prebarvene.has(klic)) {
                prebarvene.set(klic, Promise.all([nactiObrazek(this.soubor('pudorys/' + id + '.webp')), nactiObrazek(this.soubor('masky-pudorys/' + id + '.webp'))])
                    .then(([znacka, maska]) => (BARVY[barva] ? prebarviPlatno(platno(znacka, znacka.naturalWidth, znacka.naturalHeight), platno(maska, znacka.naturalWidth, znacka.naturalHeight), BARVY[barva]) : null)));
            }
            return prebarvene.get(klic);
        },

        /** Adresa souboru katalogu: z úložiště, které určí stránka (config/katalog.php), jinak lokální, to platí pro výrobu náhledů. */
        soubor: (cesta) => (window.KATALOG_ZAKLAD || '/katalog') + '/' + cesta,
        adresa: (id) => window.Katalog3d.soubor('modely/' + id + '.glb'),

        /** Načtený model s obalem. Barvy z glTF jsou lineární, ve scéně se drží v hodnotách ze vzorku (svetlo-3d.js). */
        nacti(id) {
            if (!modely.has(id)) {
                modely.set(id, new Promise((hotovo, chyba) => {
                    const nacitac = new THREE.GLTFLoader();
                    nacitac.setMeshoptDecoder(window.MeshoptDecoder);
                    nacitac.load(this.adresa(id), (gltf) => {
                        const model = gltf.scene;
                        const videno = new Set();
                        model.traverse((o) => {
                            if (!o.isMesh) return;
                            for (const m of [].concat(o.material)) {
                                if (videno.has(m)) continue;
                                videno.add(m);
                                m.color.convertLinearToSRGB();
                                if (m.map) m.map.anisotropy = 4;
                            }
                        });
                        model.updateMatrixWorld(true);
                        model.userData.obal = new THREE.Box3().setFromObject(model);
                        const hloubka = model.userData.obal.max.z - model.userData.obal.min.z;
                        if (id.startsWith('abo-') && hloubka >= TENKY_KUS) for (const m of videno) m.onBeforeCompile = omezLesk;
                        hotovo(model);
                    }, undefined, chyba);
                }));
            }
            return modely.get(id);
        },

        /** Až doběhne načítání všech rozdělaných modelů, kopie se do scény vloží hned po nich. */
        async hotovo() {
            await Promise.allSettled([...modely.values()]);
            await new Promise(r => setTimeout(r, 0));
        },

        /**
         * Vloží do rodiče obal s modelem, který se dotáhne na pozadí. Popis: id, x, y, z ve scéně (y je spodek
         * objektu), uhel ve stupních jako v půdorysu, sirka, hloubka, vyska v metrech. Předek modelu míří k +z.
         */
        vloz(rodic, popis, poNacteni) {
            const obal = new THREE.Group();
            obal.userData.katalog = popis;
            obal.position.set(popis.x, popis.y, popis.z);
            obal.rotation.y = -(popis.uhel || 0) * Math.PI / 180;
            rodic.add(obal);
            this.nacti(popis.id).then((model) => {
                const b = model.userData.obal;
                const s = b.getSize(new THREE.Vector3());
                const kopie = model.clone(true);
                const m = new THREE.Vector3(popis.sirka / (s.x || 1), popis.vyska / (s.y || 1), popis.hloubka / (s.z || 1));
                kopie.scale.multiply(m);
                const stred = b.getCenter(new THREE.Vector3());
                kopie.position.set(-stred.x * m.x, -b.min.y * m.y, -stred.z * m.z);
                obal.add(kopie);
                window.Svetlo3d.stinyObjektu(obal);
                poNacteni?.(obal);
                if (popis.barva) {
                    this.prebarvi(popis.id, popis.barva).then((mapa) => {
                        kopie.traverse((o) => {
                            if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(x => mapa.get(x) || x) : (mapa.get(o.material) || o.material);
                        });
                        poNacteni?.(obal);
                    }).catch((e) => {
                        window.zalogujChybu?.(e, 'Katalog: přebarvení', { id: popis.id, barva: popis.barva });
                    });
                }
            }).catch((e) => {
                window.zalogujChybu?.(e, 'Katalog: načtení modelu', { id: popis.id });
            });
            return obal;
        },
    };
})();
