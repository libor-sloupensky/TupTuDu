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

    const naFloat32 = (b64) => {
        const s = atob(b64);
        const b = new Uint8Array(s.length);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        return new Float32Array(b.buffer);
    };

    function postav(data) {
        const THREE = window.THREE;
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        plocha.prepend(renderer.domElement);
        zprava.remove();

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe8ecf0);
        // Stejná světla jako editor, ať barvy odpovídají tomu, co autor viděl
        scene.add(new THREE.AmbientLight(0xffffff, 0.72));
        const sun = new THREE.DirectionalLight(0xffffff, 0.4);
        sun.position.set(10, 14, 10);
        scene.add(sun);
        const fill = new THREE.DirectionalLight(0xffffff, 0.1);
        fill.position.set(-8, 12, -8);
        scene.add(fill);

        const textury = new Map();
        const texturaZ = (id) => {
            const src = data.textury && data.textury[id];
            if (!src || !String(src).startsWith('data:image/')) return null;
            if (!textury.has(id)) {
                const t = new THREE.TextureLoader().load(src, () => vykresli());
                t.wrapS = t.wrapT = THREE.RepeatWrapping;
                t.anisotropy = 8;
                textury.set(id, t);
            }
            return textury.get(id);
        };
        const materialy = (data.materialy || []).map((m) => {
            const mapa = m.mapa ? texturaZ(m.mapa) : null;
            return new THREE.MeshStandardMaterial({
                color: new THREE.Color(m.barva), roughness: m.drsnost ?? 0.8, metalness: m.kov ?? 0,
                transparent: (m.pruhlednost ?? 1) < 1, opacity: m.pruhlednost ?? 1, depthWrite: (m.pruhlednost ?? 1) >= 1,
                side: THREE.DoubleSide, map: mapa, bumpMap: m.reliefMapa ? mapa : null, bumpScale: m.relief ?? 0,
            });
        });

        const skupiny = new Map();
        for (const k of data.meshe || []) {
            const material = materialy[k.material];
            if (!material) continue;
            if (!skupiny.has(k.skupina)) { const g = new THREE.Group(); skupiny.set(k.skupina, g); scene.add(g); }
            const geom = new THREE.BufferGeometry();
            geom.setAttribute('position', new THREE.BufferAttribute(naFloat32(k.pozice), 3));
            if (k.uv) geom.setAttribute('uv', new THREE.BufferAttribute(naFloat32(k.uv), 2));
            geom.computeVertexNormals();
            skupiny.get(k.skupina).add(new THREE.Mesh(geom, material));
        }

        const obal = new THREE.Box3();
        scene.children.forEach((c) => { if (c.isGroup) obal.expandByObject(c); });
        const stred = obal.isEmpty() ? new THREE.Vector3() : obal.getCenter(new THREE.Vector3());
        const rozmer = obal.isEmpty() ? 20 : Math.max(...obal.getSize(new THREE.Vector3()).toArray(), 4);

        const zeme = new THREE.Mesh(new THREE.PlaneGeometry(rozmer * 6, rozmer * 6), new THREE.MeshStandardMaterial({ color: 0xc8d6c0, roughness: 0.95, transparent: true, opacity: 0.85 }));
        zeme.rotation.x = -Math.PI / 2;
        zeme.position.set(stred.x, (data.zeme ?? 0) - 0.16, stred.z);
        scene.add(zeme);

        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 1000);
        camera.position.set(stred.x + rozmer, stred.y + rozmer * 0.9, stred.z + rozmer);
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.target.copy(stred);
        controls.enableDamping = false;

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
                b.setAttribute('aria-pressed', String(g.visible));
                vykresli();
            });
            ovladani.appendChild(b);
        }
        window.__sdileniScena = { scene, skupiny, renderer, camera, vykresli };
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
