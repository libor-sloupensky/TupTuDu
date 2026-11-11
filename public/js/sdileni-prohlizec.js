/**
 * Prohlížeč sdíleného projektu. Umí jen zobrazit hotovou geometrii z /share/{token}/model:
 * pole trojúhelníků po materiálech. Z editoru tu nic není (modules/sdileni.md).
 */
(function () {
    const plocha = document.querySelector('[data-sdileni-plocha]');
    const zprava = document.querySelector('[data-sdileni-zprava]');
    const ovladani = document.querySelector('[data-sdileni-ovladani]');

    // Přepínač 3D a půdorysů
    const tlacitka = [...document.querySelectorAll('[data-sdileni-vyber] button')];
    tlacitka.forEach((b) => b.addEventListener('click', () => {
        tlacitka.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== b.dataset.pohled; });
        if (b.dataset.pohled === '3d') window.dispatchEvent(new Event('resize'));
    }));

    const ukazNahled = () => {
        zprava.remove();
        const img = new Image();
        img.src = plocha.dataset.nahled;
        img.alt = plocha.dataset.textAlt;
        plocha.prepend(img);
    };

    const naBajty = (b64) => {
        const s = atob(b64);
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return b;
    };
    const naFloat32 = (b64) => new Float32Array(naBajty(b64).buffer);

    function postav(data) {
        const THREE = window.THREE;
        const renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        plocha.prepend(renderer.domElement);
        zprava.remove();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe8ecf0);
        // Stejné světlo jako editor, ať barvy odpovídají tomu, co autor viděl
        const slunce = window.Svetlo3d.nastav(renderer, scene);

        const textury = new Map();
        const texturaZ = (id) => {
            const src = data.textury && data.textury[id];
            if (!src || !String(src).startsWith('data:image/')) return null;
            if (!textury.has(id)) {
                const t = new THREE.TextureLoader().load(src, () => vykresli());
                t.encoding = THREE.sRGBEncoding;
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.anisotropy = 8;
                textury.set(id, t);
            }
            return textury.get(id);
        };
        const materialy = (data.materialy || []).map((m) => {
            // Střešní krytina: stejný materiál jako v editoru, textury se dotáhnou a scéna se překreslí
            const krytina = m.krytina && window.Krytiny3d ? window.Krytiny3d.material(m.krytina, m.barva, () => { window.Svetlo3d.prekresliStiny(renderer); vykresli(); }) : null;
            if (krytina) return krytina;
            const mapa = m.mapa ? texturaZ(m.mapa) : null;
            const material = new THREE.MeshStandardMaterial({
                color: new THREE.Color(m.barva), roughness: m.drsnost ?? 0.8, metalness: m.kov ?? 0,
                transparent: (m.pruhlednost ?? 1) < 1, opacity: m.pruhlednost ?? 1, depthWrite: (m.pruhlednost ?? 1) >= 1,
                side: THREE.DoubleSide, map: mapa, bumpMap: m.reliefMapa ? mapa : null, bumpScale: m.relief ?? 0,
            });
            if (m.povrch === 'omitka' && window.Povrchy3d) window.Povrchy3d.omitka(material, () => { window.Svetlo3d.prekresliStiny(renderer); vykresli(); });
            return material;
        });

        const skupiny = new Map();
        for (const k of data.meshe || []) {
            const material = materialy[k.material];
            if (!material) continue;
            if (!skupiny.has(k.skupina)) { const g = new THREE.Group(); skupiny.set(k.skupina, g); scene.add(g); }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(naFloat32(k.pozice), 3));
            if (k.uv) geom.setAttribute('uv', new THREE.BufferAttribute(naFloat32(k.uv), 2));
            if (k.uv && material.aoMap) geom.setAttribute('uv2', geom.getAttribute('uv'));
            geom.computeVertexNormals();
            skupiny.get(k.skupina).add(new THREE.Mesh(geom, material));
        }

        const obal = new THREE.Box3();
        scene.children.forEach((c) => { if (c.isGroup) obal.expandByObject(c); });
        const stred = obal.isEmpty() ? new THREE.Vector3() : obal.getCenter(new THREE.Vector3());
        const rozmer = obal.isEmpty() ? 20 : Math.max(...obal.getSize(new THREE.Vector3()).toArray(), 4);

        // Terén kolem domu, zemina uvnitř viditelných podlaží se nekreslí
        const teren = data.teren ? window.Teren3d.postav(data.teren, naFloat32(data.teren.vysky)) : null;
        const jamy = new Map();
        // Výkop pod skrytými podlažími v terénu, spočítaný předem pro každou kombinaci
        const sitVykopu = (klic) => {
            const j = data.teren?.jamy?.[klic];
            if (!j) return null;
            if (!jamy.has(klic)) {
                const y = new Int16Array(naBajty(j.y).buffer);
                const sit = window.Teren3d.sitJamy({ ...j, bunky: naBajty(j.bunky), y: Float32Array.from(y, v => v / 100) });
                sit.visible = false;
                scene.add(sit);
                jamy.set(klic, sit);
            }
            return jamy.get(klic);
        };
        const obnovVnitrek = () => {
            if (!teren) return;
            const skryte = (data.teren.vnitrek || []).filter(c => skupiny.get(c.skupina)?.visible === false).map(c => c.skupina);
            const vykop = skryte.length ? sitVykopu(skryte.join()) : null;
            jamy.forEach((sit) => { sit.visible = sit === vykop; });
            window.Teren3d.nastavJamu(teren.uniformyJamy, vykop);
            window.Teren3d.nastavVnitrek(teren.uniformy, (data.teren.vnitrek || [])
                .filter(c => skupiny.get(c.skupina)?.visible !== false)
                .map(c => ({ uroven: c.uroven, obrys: c.obrys.map(([x, y]) => ({ x, y })) })));
        };
        if (teren) {
            scene.add(teren.plocha);
            if (data.mrizkaTerenu !== false) scene.add(teren.mrizka);   // starší odkazy mřížku mají
            obnovVnitrek();
            if (Object.keys(data.teren.jamy || {}).length) plocha.parentElement.querySelector('.tt-sdileni-pata')?.append(' ', plocha.dataset.textJama);
        }

        // Bez výškových dat rovná země s dírami pro snížené místnosti, jinak by ležela nad jejich podlahou
        const r = rozmer * 3;
        const tvarZeme = new THREE.Shape();
        tvarZeme.moveTo(stred.x - r, -stred.z - r);
        tvarZeme.lineTo(stred.x + r, -stred.z - r);
        tvarZeme.lineTo(stred.x + r, -stred.z + r);
        tvarZeme.lineTo(stred.x - r, -stred.z + r);
        tvarZeme.closePath();
        for (const dira of data.diry || []) {
            const cesta = new THREE.Path();
            dira.forEach(([x, z], i) => (i ? cesta.lineTo(x, -z) : cesta.moveTo(x, -z)));
            cesta.closePath();
            tvarZeme.holes.push(cesta);
        }
        const zeme = new THREE.Mesh(new THREE.ShapeGeometry(tvarZeme), new THREE.MeshStandardMaterial({ color: 0xc8d6c0, roughness: 0.95, transparent: true, opacity: 0.85 }));
        zeme.rotation.x = -Math.PI / 2;
        zeme.position.y = (data.zeme ?? 0) - 0.16;
        zeme.receiveShadow = true;
        if (!teren && !data.bezZeme) scene.add(zeme);

        // Kusy z katalogu se dotáhnou samy, stín a obraz se překreslí po každém
        for (const o of data.objekty || []) {
            const g = skupiny.get(o.skupina);
            if (!g) continue;
            window.Katalog3d.vloz(g, o, () => { window.Svetlo3d.prekresliStiny(renderer); vykresli(); });
        }
        if ((data.objekty || []).length) {
            const odkaz = document.createElement('a');
            odkaz.href = plocha.dataset.autori;
            odkaz.target = '_blank';
            odkaz.rel = 'noopener';
            odkaz.textContent = plocha.dataset.textAutori;
            plocha.parentElement.querySelector('.tt-sdileni-pata')?.append(' ', odkaz);
        }
        skupiny.forEach((g) => window.Svetlo3d.stinyObjektu(g));
        window.Svetlo3d.usadSlunce(slunce, obal);
        window.Svetlo3d.prekresliStiny(renderer);
        // Kamera nejde pohledem pod terén, stejně jako v editoru (povrchy-3d.js)
        const zemObjekt = teren ? teren.plocha : (!data.bezZeme ? zeme : null);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
        camera.position.set(stred.x + rozmer, stred.y + rozmer * 0.9, stred.z + rozmer);
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.copy(stred);
        controls.enableDamping = false;
        controls.maxPolarAngle = window.Povrchy3d && zemObjekt ? window.Povrchy3d.nejnizsiPohled(obal, new THREE.Box3().setFromObject(zemObjekt), data.zeme ?? 0) : Math.PI / 2.1;

        let kresliSe = false;
        function vykresli() {
            if (kresliSe) return;
            kresliSe = true;
            requestAnimationFrame(() => { kresliSe = false; renderer.render(scene, camera); });
        }
        controls.addEventListener('change', vykresli);

        const velikost = () => {
            const w = plocha.clientWidth, h = plocha.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            const pul = rozmer * 0.78, pomer = w / h;
            camera.left = -pul * pomer; camera.right = pul * pomer; camera.top = pul; camera.bottom = -pul;
            camera.updateProjectionMatrix();
            controls.update();
            vykresli();
        };
        window.addEventListener('resize', velikost);
        velikost();

        // Podlaží a střecha jdou skrýt, aby šlo vidět dovnitř
        const nazvy = [...(data.skupiny || [])];
        if (skupiny.has('strecha')) nazvy.unshift({ id: 'strecha', nazev: plocha.dataset.textStrecha });
        for (const s of nazvy) {
            const g = skupiny.get(s.id);
            if (!g) continue;
            const b = document.createElement('button');
            b.type = 'button';
            b.textContent = s.nazev;
            b.setAttribute('aria-pressed', 'true');
            b.dataset.skupina = s.id;
            b.addEventListener('click', () => {
                g.visible = !g.visible;
                obnovVnitrek();
                window.Svetlo3d.prekresliStiny(renderer);
                b.setAttribute('aria-pressed', String(g.visible));
                vykresli();
            });
            ovladani.appendChild(b);
        }
        window.__sdileniScena = { scene, skupiny, renderer, camera, vykresli, teren, jamy };
    }

    fetch(plocha.dataset.model)
        .then((r) => {
            if (!r.ok) throw new Error('Model: HTTP ' + r.status);
            return r.json();
        })
        .then((data) => {
            try {
                postav(data);
            } catch (e) {
                window.zalogujChybu?.(e, 'Sdílení: stavba 3D');
                ukazNahled();
            }
        })
        .catch((e) => {
            window.zalogujChybu?.(e, 'Sdílení: načtení modelu');
            zprava.textContent = plocha.dataset.textChyba;
        });
})();
