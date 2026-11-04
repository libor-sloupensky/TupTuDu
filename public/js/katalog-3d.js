/**
 * Modely z katalogu ve 3D scéně, společné pro editor, sdílený odkaz a výrobu náhledů (modules/katalog.md).
 * Soubor se načte jednou, do scény jdou kopie se společnou geometrií a materiály, proto je _zrus3d neruší.
 */
(function () {
    const THREE = window.THREE;
    if (!THREE) return;

    const modely = new Map();

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
