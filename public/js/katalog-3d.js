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

    window.Katalog3d = {
        adresa: (id) => '/katalog/modely/' + id + '.glb',

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
            }).catch((e) => {
                window.zalogujChybu?.(e, 'Katalog: načtení modelu', { id: popis.id });
            });
            return obal;
        },
    };
})();
